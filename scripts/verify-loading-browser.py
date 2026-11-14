"""Deferred search/route data: transfer isolation, typing, retry, hydration and navigation."""
import argparse
import json
from pathlib import Path
from playwright.sync_api import sync_playwright


def verify(base, output, access_url=None):
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='chrome', headless=True)
        bootstrap = browser.new_context()
        if access_url:
            bootstrap.new_page().goto(access_url, wait_until='networkidle')
        storage = bootstrap.storage_state()
        bootstrap.close()
        context = browser.new_context(viewport={'width': 390, 'height': 844}, storage_state=storage)
        page = context.new_page()
        requests, errors = [], []
        page.on('request', lambda request: requests.append(request.url))
        page.on('pageerror', lambda error: errors.append(str(error)))
        for path in ['/', '/routes', '/about', '/privacy', '/routes/delhi-to-ludhiana']:
            requests.clear()
            page.goto(base + path, wait_until='networkidle')
            assert not any('search-engine-' in url for url in requests), (path, requests)
            assert not any('delhi-to-ludhiana-' in url for url in requests), (path, requests)
        # Delay the actual chunk, while leaving the inputs usable.
        page.goto(base, wait_until='networkidle')
        held = []
        page.route('**/search-engine-*.js', lambda route: held.append(route))
        origin = page.get_by_role('combobox', name='Boarding From')
        origin.fill('isbt')
        page.get_by_role('status').filter(has_text='Loading search timetables').wait_for()
        page.wait_for_function('document.querySelector("#from-city").value === "isbt"')
        origin.fill('delhi')
        destination = page.get_by_role('combobox', name='Where are you going?')
        destination.fill('ludhiyana')
        assert origin.input_value() == 'delhi' and destination.input_value() == 'ludhiyana'
        page.wait_for_timeout(100)
        assert len(held) == 1, 'parallel focus must share one request'
        held.pop().continue_()
        page.get_by_role('option', name='Ludhiana', exact=True).wait_for()
        destination.press('ArrowDown')
        destination.press('Enter')
        assert destination.input_value() == 'Ludhiana'
        page.get_by_role('button', name='Find Buses').click()
        page.wait_for_url('**/search?from=delhi&to=ludhiana')
        card = page.locator('[data-service-id="delhi_isbt_delhi_depot_bus_schedule:59"]')
        card.wait_for()
        assert '00:40' in card.inner_text() and 'Towards Katra' in card.inner_text()
        # Public-to-public client navigation loads only that journey, then reuses it.
        page.goto(base + '/routes', wait_until='networkidle')
        requests.clear()
        page.get_by_role('link', name='Delhi to Ludhiana', exact=True).click()
        card.wait_for()
        assert sum('delhi-to-ludhiana-' in url for url in requests) == 1
        assert not any('search-engine-' in url for url in requests)
        assert not errors, errors
        context.close()
        # Fresh document/module cache: a failed chunk shows an accessible recovery path.
        context = browser.new_context(storage_state=storage)
        page = context.new_page()
        page.route('**/search-engine-*.js', lambda route: route.abort())
        page.goto(base, wait_until='networkidle')
        page.get_by_role('combobox', name='Boarding From').fill('delhi')
        page.get_by_role('alert').filter(has_text='Could not load search timetables').wait_for()
        assert page.get_by_role('link', name='browse published routes').is_visible()
        page.unroute('**/search-engine-*.js')
        page.get_by_role('button', name='Try again').click()
        page.get_by_role('combobox', name='Boarding From').focus()
        page.get_by_role('option', name='Delhi', exact=True).wait_for()
        assert page.get_by_role('combobox', name='Boarding From').input_value() == 'delhi'
        context.close()
        # Direct search needs the engine immediately, with no false empty-result state.
        context = browser.new_context(storage_state=storage)
        page = context.new_page()
        held = []
        page.route('**/search-engine-*.js', lambda route: held.append(route))
        page.goto(base + '/search?from=DELHI&to=LUDHIYANA', wait_until='domcontentloaded')
        page.get_by_role('status').filter(has_text='Loading search timetables').wait_for()
        assert page.get_by_text('No matching timetable found', exact=True).count() == 0
        page.wait_for_timeout(100)
        held.pop().continue_()
        page.locator('[data-service-id="delhi_isbt_delhi_depot_bus_schedule:59"]').wait_for()
        assert page.locator('meta[name="robots"]').get_attribute('content') == 'noindex'
        context.close()
        browser.close()
    result = {'baseUrl': base, 'passed': True, 'checks': ['no search data on public pages', 'no extra initial route fetch', 'typing during slow load', 'deduplicated engine import', 'alias keyboard autocomplete', '00:40 Katra result', 'client route chunk isolation', 'failed import and retry preserves input', 'direct search loading and noindex']}
    Path(output).parent.mkdir(parents=True, exist_ok=True)
    Path(output).write_text(json.dumps(result, indent=2), encoding='utf-8')
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--base-url', default='http://127.0.0.1:8080')
    parser.add_argument('--output', default='.tools/loading-browser.json')
    args = parser.parse_args()
    verify(args.base_url.rstrip('/'), args.output)
