"""Import the pinned Android timetable into the shared timetable snapshot."""
from collections import Counter, defaultdict
import hashlib
import json
import re


SOURCE_NAME = 'Haryana Roadways & Metro Info'
APP_PLACE_ALIASES = {
    'Anand Vihar, Delhi': 'ISBT Anand Vihar, Delhi',
    'Chandigarh 43': 'ISBT Sector 43, Chandigarh',
    'Delhi Sarai Kale Khan': 'ISBT Sarai Kale Khan, Delhi',
    'IFFCO Chowk,Gurugram': 'IFFCO Chowk, Gurugram',
    'Pipli-Kurukshetra': 'Pipli',
    'Roorkee': 'Roorki',
}
ROAD_MARKERS = {'nh 152d expressway', 'kmp', 'kmp expressway'}


def clock_time(raw):
    match = re.fullmatch(r'(0?[1-9]|1[0-2]):([0-5]\d) ([AP]M)', raw.strip(), re.I)
    if not match:
        return ''
    hour, minute, period = match.groups()
    return f'{int(hour) % 12 + (12 if period.upper() == "PM" else 0):02}:{minute}'


def boarding_times(stops, has_service_days):
    """Keep the first departure and review inconsistent or ambiguous downstream clocks."""
    day = 0
    previous = ''
    blocked = set()
    for index, (_, _, time) in enumerate(stops):
        if not time:
            continue
        if previous and time < previous:
            if day or previous < '18:00' or time >= '08:00':
                return {i for i in range(1, len(stops)) if stops[i][2]}, 'inconsistent-stop-times'
            day = 1
        if day and has_service_days:
            blocked.add(index)
        previous = time
    return blocked, 'overnight-service-days' if blocked else ''


def operator_and_type(bus_type):
    for prefix, operator in [
        ('Haryana Roadways', 'HR'), ('HR', 'HR'), ('RSRTC', 'RSRTC'), ('UTC', 'UTC'),
        ('CTU', 'CTU'), ('PRTC', 'PRTC'), ('HRTC', 'HRTC'), ('Himsuta', 'HRTC'),
    ]:
        if bus_type.lower() == prefix.lower() or bus_type.lower().startswith(prefix.lower() + ' '):
            service_type = bus_type if prefix == 'Himsuta' else bus_type[len(prefix):].strip()
            return operator, service_type
    if bus_type == 'Private Operator':
        return 'PVT', ''
    return '', bus_type


def overlaps_itinerary(official, stop_ids, registry):
    # The official via list must occur in order. A city may match one of its known
    # terminals, but an unspecified city cannot stand in for a named terminal.
    remaining = iter(stop_ids)
    return all(any(stop == via or stop in registry[via]['members'] for stop in remaining)
               for via in official['viaIds'])


def integrate_android(data, registry, place, services):
    source = data / 'android'
    manifest = json.loads((source / 'version.json').read_text(encoding='utf-8'))
    raw = (source / 'busData.json').read_bytes()
    digest = hashlib.sha256(raw).hexdigest()
    assert manifest['version'] == '1.1.6', 'Review the Android timetable version before importing'
    assert digest == 'a8015ff4cd6738acbc0056391f177f3b623e4306a9c407c6a88b6eefcfad785d', 'Android timetable bytes changed'
    trips = json.loads(raw)
    assert len(trips) == 4022

    locked = {id for conflict in json.loads((data / 'review/route-conflicts.json').read_text(encoding='utf-8')).values()
              for id in conflict['serviceIds']}
    official_by_identity = defaultdict(list)
    for service in services:
        identity = (service['fromId'], service['toId'], service['departureTime'], service['operator'].strip().upper())
        official_by_identity[identity].append(service)

    source_info = {'name': SOURCE_NAME, 'version': manifest['version'], 'sha256': digest, 'url': manifest['url']}
    evidence = []
    prepared = []
    counts = Counter()
    reviews = []
    links = {}
    for number, trip in enumerate(trips, 1):
        stops = []
        unparsed_clocks = []
        for stop in trip['stations']:
            label = stop['stationName'].strip()
            alias = APP_PLACE_ALIASES.get(label, label)
            stop_id = place(alias) if label.lower() not in ROAD_MARKERS else ''
            if stop_id and alias != label:
                registry[stop_id]['aliases'].append(label)
            time = clock_time(stop['departureTime'])
            stops.append((stop_id, label, time))
            if not time and stop['departureTime'].strip():
                unparsed_clocks.append(len(stops))
        availability = trip.get('Availability', '').strip()
        if availability.lower() == 'not operational':
            reviews.append({'trip': number, 'reason': 'marked-not-operational'})
            continue
        if len(stops) < 2 or not all([stops[0][0], stops[-1][0], stops[0][2]]) or stops[0][0] == stops[-1][0]:
            reviews.append({'trip': number, 'reason': 'no-unambiguous-timed-start'})
            continue
        operator, service_type = operator_and_type(trip['Bus_Type'].strip())
        blocked, reason = boarding_times(stops, bool(availability))
        if unparsed_clocks:
            reviews.append({'trip': number, 'reason': 'unparsed-stop-times', 'stopNumbers': unparsed_clocks})
        if reason:
            reviews.append({'trip': number, 'reason': reason, 'stopNumbers': [i + 1 for i in sorted(blocked)]})
        identity = (stops[0][0], stops[-1][0], stops[0][2], operator)
        prepared.append((number, stops, blocked, availability, operator, service_type, identity))

    app_identities = Counter(item[-1] for item in prepared)
    for number, stops, blocked, availability, operator, service_type, identity in prepared:
        # An attachment requires unique endpoint/time/operator agreement and an
        # ordered match against a separately published itinerary with no road conflict.
        matching = [service for service in official_by_identity[identity]
                    if service['id'] not in locked and service['viaIds'] and not service['roadTags']
                    and (service['typeOfService'].casefold() == service_type.casefold()
                         or (operator == 'HR' and not service_type and service['typeOfService'].casefold() == 'ordinary'))
                    and (not availability or service['serviceDays'] == [availability])
                    and overlaps_itinerary(service, [stop[0] for stop in stops[1:-1]], registry)]
        official = matching[0] if len(matching) == 1 and app_identities[identity] == 1 else None
        if number == 410:
            assert official and official['id'] == 'bhiwani_bus_schedule:329', 'Review the Bhiwani–Mathura cross-reference'
        trip_index = len(evidence)
        evidence.append([number, [[pid, label if not pid else '', '' if i in blocked else time]
                                  for i, (pid, label, time) in enumerate(stops)]])

        to_id = stops[-1][0]
        for index, (from_id, _, time) in enumerate(stops[:-1]):
            if not from_id or from_id == to_id or not time or index in blocked:
                continue
            via_ids = list(dict.fromkeys(pid for pid, _, _ in stops[index + 1:-1]
                                         if pid and pid not in {from_id, to_id}))
            if index == 0 and official:
                official['viaIds'] = via_ids
                official['androidTripIndex'] = trip_index
                links[str(number)] = official['id']
                counts['linkedStarts'] += 1
                continue
            service_id = f'android:{number}:{index + 1}'
            services.append({
                'id': service_id, 'fromId': from_id, 'toId': to_id, 'viaIds': via_ids,
                'departureTime': time, 'typeOfService': service_type, 'operator': operator,
                'serviceDays': [availability] if availability else [], 'sourceTimetable': SOURCE_NAME,
                'operatingDepot': '', 'depotSource': '', 'pdfPage': 0, 'sourceRefs': [service_id],
                'viaSource': trip['Bus_Route'], 'roadTags': [], 'androidTripIndex': trip_index,
            })
            counts['intermediateDepartures' if index else 'standaloneStarts'] += 1

    counts['withheldTrips'] = len(trips) - len(evidence)
    counts['timingReviewTrips'] = len({item['trip'] for item in reviews if 'stopNumbers' in item})
    report = {'source': source_info, 'inputTrips': len(trips), 'inputStops': sum(len(trip['stations']) for trip in trips),
              **counts, 'officialLinksByTrip': links, 'review': reviews}
    return source_info, evidence, report
