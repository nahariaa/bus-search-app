"""Exercise dormant ads and the loopback build with all third-party requests intercepted."""
import argparse
import json
from urllib.parse import urlsplit

from playwright.sync_api import expect, sync_playwright


PLACEMENT = '[data-ad-placement]'
AD = 'ins.adsbygoogle'
CMP_HOST = 'cdn.cookielaw.org'
ADS_HOST = 'pagead2.googlesyndication.com'
LONG_ROUTE = '/routes/chandigarh-to-jind'
EXCLUSIONS = ['/cities/jind', '/cities/chandigarh', '/routes', '/about', '/privacy',
              '/routes/nuh-to-sonipat', '/missing', '/online-booking', '/search?from=jind&to=delhi']

CMP_MOCK = """(() => {
  const state = { country: 'IN', closed: false, advertising: false, success: true, tc: {},
    ...window.mockCmpSettings };
  let tcfListener;
  window.mockPrivacyOpens = 0;
  window.OneTrust = {
    getGeolocationData: () => ({ country: state.country }),
    IsAlertBoxClosedAndValid: () => state.closed,
    ToggleInfoDisplay: () => window.mockPrivacyOpens += 1,
  };
  window.__tcfapi = (command, version, callback) => {
    if (command !== 'addEventListener' || version !== 2) throw new Error('Unexpected TCF registration');
    tcfListener = callback;
    callback(state.tc, state.success);
  };
  window.updateMockConsent = (updates) => {
    Object.assign(state, updates);
    window.OnetrustActiveGroups = state.advertising ? ',C0001,C0004,' : ',C0001,';
    if ('tc' in updates || 'success' in updates) tcfListener?.(state.tc, state.success);
    window.dispatchEvent(new CustomEvent('OneTrustGroupsUpdated'));
  };
  window.updateMockConsent({});
  window.OptanonWrapper();
  window.mockCmpReady = true;
})();"""

ADS_MOCK = """window.mockAdSlots = [];
window.adsbygoogle.push = () => {
  if (window.adsbygoogle.pauseAdRequests !== 0) throw new Error('Ad requests are paused');
  const ad = document.querySelector('ins.adsbygoogle:not([data-mock-requested])');
  if (!ad) throw new Error('No slot to initialize');
  ad.dataset.mockRequested = 'true';
  window.mockAdSlots.push(ad.dataset.adSlot);
  setTimeout(() => {
    ad.dataset.adStatus = window.mockAdOutcome;
    if (window.mockAdOutcome === 'filled') {
      const creative = document.createElement('div');
      creative.setAttribute('data-mock-creative', '');
      creative.style.height = '250px';
      ad.append(creative);
    }
  }, 50);
};"""

TCF_GRANT = {'gdprApplies': True, 'cmpId': 28, 'cmpStatus': 'loaded',
             'eventStatus': 'tcloaded', 'tcString': 'test-consent',
             'vendor': {'consents': {'755': True}}, 'purpose': {'consents': {'1': True, '3': True, '4': True}}}
INDIA = {'tc': {'gdprApplies': False}, 'country': 'IN', 'closed': True, 'advertising': True}


def intercept_context(browser, base, width=390, height=720, consent=None, outcome='filled', block_cmp=False):
    context = browser.new_context(viewport={'width': width, 'height': height}, service_workers='block')
    requested = []
    context.add_init_script(f'window.mockCmpSettings = {json.dumps(consent or {})};'
                            f'window.mockAdOutcome = {json.dumps(outcome)};')

    def intercept(route):
        target = urlsplit(route.request.url)
        if target.scheme == urlsplit(base).scheme and target.netloc == urlsplit(base).netloc:
            route.continue_()
            return
        requested.append(target.hostname)
        headers = {'access-control-allow-origin': '*', 'content-type': 'application/javascript'}
        if target.hostname == CMP_HOST and target.path.endswith('/otSDKStub.js') and not block_cmp:
            assert route.request.resource_type == 'script'
            route.fulfill(body=CMP_MOCK, headers=headers)
        elif target.hostname == ADS_HOST and target.path.endswith('/adsbygoogle.js') and outcome != 'blocked':
            assert target.query == 'client=ca-pub-3647722960213142'
            route.fulfill(body=ADS_MOCK, headers=headers)
        else:
            route.abort()

    context.route('**/*', intercept)
    return context, requested


def watch_layout(page):
    page.evaluate("""() => {
        window.adScenarioLayoutShift = 0;
        new PerformanceObserver(list => {
            for (const entry of list.getEntries()) {
                if (!entry.hadRecentInput) window.adScenarioLayoutShift += entry.value;
            }
        }).observe({type: 'layout-shift'});
    }""")


def positions(page, selector):
    return page.locator(selector).evaluate_all("""elements => elements.map(element => {
        const {x, y, width, height} = element.getBoundingClientRect();
        return [x + scrollX, y + scrollY, width, height];
    })""")


def assert_layout(page, selector, baseline):
    assert positions(page, selector) == baseline, 'Passenger content moved'
    assert page.evaluate('document.documentElement.scrollWidth === innerWidth'), 'Page overflowed horizontally'
    shift = page.evaluate('window.adScenarioLayoutShift')
    assert shift == 0, f'Unexpected layout shift {shift}'


def verify_home(browser, base, width, outcome):
    context, requested = intercept_context(browser, base, width=width, height=800,
                                           consent={**INDIA, 'closed': False}, outcome=outcome)
    page = context.new_page()
    page.goto(base, wait_until='networkidle')
    page.wait_for_function('window.mockCmpReady')
    ad = page.locator(PLACEMENT)
    expect(ad).to_have_count(1)
    assert ad.evaluate("""ad => ad.previousElementSibling.getAttribute('aria-labelledby') === 'browse-cities'
        && ad.nextElementSibling.getAttribute('aria-labelledby') === 'explore-routes-heading'""")
    assert ad.bounding_box()['height'] == 288
    controls = 'form [role=combobox], form button[type=submit], #browse-cities, #explore-routes-heading'
    baseline = positions(page, controls)
    assert len(baseline) == 5, baseline
    watch_layout(page)
    assert requested == [CMP_HOST]
    with page.expect_request(lambda request: urlsplit(request.url).hostname == ADS_HOST):
        page.evaluate("updateMockConsent({closed: true})")
        ad.scroll_into_view_if_needed()
    if outcome != 'blocked':
        page.wait_for_function("window.mockAdSlots?.join() === '0000000001'")
    if outcome == 'filled':
        expect(ad.locator('[data-mock-creative]')).to_be_visible()
        expect(ad.get_by_text('Advertisement', exact=True)).to_be_visible()
        box = ad.locator(AD).bounding_box()
        assert box['height'] == 250 and 120 <= box['width'] <= 300
    else:
        expect(ad.locator(AD)).to_have_count(0)
        expect(ad.get_by_text('Advertisement', exact=True)).to_be_hidden()
    assert_layout(page, controls, baseline)
    if outcome == 'filled':
        verify_search_and_privacy(page, base)
    context.close()


def verify_search_and_privacy(page, base):
    origin = page.get_by_role('combobox', name='Boarding From')
    origin.fill('Delhi')
    page.get_by_role('option', name='Delhi', exact=True).click()
    destination = page.get_by_role('combobox', name='Where are you going?')
    destination.fill('Ludhiana')
    page.get_by_role('option', name='Ludhiana', exact=True).click()
    page.get_by_role('button', name='Find Buses').click()
    expect(page.locator('[data-service-id="delhi_isbt_delhi_depot_bus_schedule:59"]')).to_be_visible()
    expect(page.locator(PLACEMENT)).to_have_count(0)
    page.goto(base + '/privacy', wait_until='networkidle')
    page.get_by_role('button', name='Change privacy choices').click()
    assert page.evaluate('window.mockPrivacyOpens') == 1


def verify_route(browser, base, width, outcome, journeys):
    context, requested = intercept_context(browser, base, width=width, height=520, outcome=outcome)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(base + LONG_ROUTE, wait_until='networkidle')
    page.wait_for_function('window.mockCmpReady')
    inline, bottom = page.locator(PLACEMENT).all()
    rows = 'li[data-service-id]'
    assert page.locator(rows).evaluate_all('(rows) => rows.map(row => row.dataset.serviceId)') == journeys[LONG_ROUTE]
    assert inline.evaluate("""ad => {
        const item = ad.parentElement;
        return item.matches('li') && item.parentElement.matches('ul')
          && item.previousElementSibling.matches('li[data-service-id]')
          && item.nextElementSibling.matches('li[data-service-id]')
          && Array.from(item.parentElement.children).indexOf(item) === 5;
    }""")
    assert bottom.evaluate("ad => ad.previousElementSibling.getAttribute('aria-labelledby') === 'related-routes'")
    assert inline.bounding_box()['height'] == bottom.bounding_box()['height'] == 288
    watch_layout(page)
    baseline = positions(page, rows)

    with page.expect_request(lambda request: urlsplit(request.url).hostname == ADS_HOST):
        page.evaluate('state => updateMockConsent(state)', INDIA)
        inline.scroll_into_view_if_needed()
    if outcome == 'blocked':
        expect(page.locator(AD)).to_have_count(0)
    else:
        page.wait_for_function("window.mockAdSlots?.join() === '0000000002'")
        if outcome == 'filled':
            expect(inline.locator('[data-mock-creative]')).to_be_visible()
            assert_layout(page, rows, baseline)
            page.evaluate('updateMockConsent({advertising: false})')
            expect(inline.locator(AD)).to_have_count(0)
            assert page.evaluate('adsbygoogle.pauseAdRequests') == 1
            bottom.scroll_into_view_if_needed()
            assert page.evaluate('mockAdSlots') == ['0000000002']
            assert_layout(page, rows, baseline)
            page.evaluate('updateMockConsent({advertising: true})')
            expect(bottom.locator('[data-mock-creative]')).to_be_visible()
        else:
            expect(inline.locator(AD)).to_have_count(0)
    bottom.scroll_into_view_if_needed()
    if outcome != 'blocked':
        page.wait_for_function("window.mockAdSlots?.join() === '0000000002,0000000003'")
    if outcome != 'filled':
        expect(page.locator(AD)).to_have_count(0)
        expect(page.get_by_text('Advertisement', exact=True).first).to_be_hidden()
    else:
        page.evaluate('updateMockConsent({advertising: false})')
        expect(bottom.locator(AD)).to_have_count(0)
    assert_layout(page, rows, baseline)
    assert requested == [CMP_HOST, ADS_HOST] and not errors, (requested, errors)
    context.close()


def verify_consent(browser, base):
    context, requested = intercept_context(browser, base, consent=INDIA)
    page = context.new_page()
    page.goto(base, wait_until='networkidle')
    expect(page.locator(AD)).to_have_count(1)
    assert requested == [CMP_HOST, ADS_HOST], requested
    context.close()

    context, requested = intercept_context(browser, base)
    page = context.new_page()
    page.goto(base, wait_until='networkidle')
    page.locator(PLACEMENT).scroll_into_view_if_needed()
    tcf_denials = [{'tcString': ''}, {'cmpId': 999}, {'cmpStatus': 'error'},
                   {'vendor': {'consents': {'755': False}}},
                   {'purpose': {'consents': {'1': True, '3': True, '4': False}}}]
    ineligible = [
        {'tc': {}, 'advertising': True}, {**INDIA, 'country': ''}, {**INDIA, 'closed': False},
        {**INDIA, 'advertising': False}, {**INDIA, 'success': False},
        {**INDIA, 'tc': {'gdprApplies': False, 'cmpStatus': 'stub'}},
        *[{'tc': {**TCF_GRANT, **denial}, 'country': 'DE'} for denial in tcf_denials],
    ]
    for state in ineligible:
        page.evaluate('state => updateMockConsent({success: true, ...state})', state)
        page.evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))')
        assert requested == [CMP_HOST], (state, requested)
        assert page.locator(AD).count() == 0
    page.evaluate('tc => updateMockConsent({tc})', TCF_GRANT)
    expect(page.locator('[data-mock-creative]')).to_be_visible()
    page.evaluate('tc => updateMockConsent({tc})', {**TCF_GRANT, 'eventStatus': 'cmpuishown'})
    expect(page.locator('[data-mock-creative]')).to_be_visible()
    page.evaluate('tc => updateMockConsent({tc})', {**TCF_GRANT, 'eventStatus': 'useractioncomplete',
                                                   'vendor': {'consents': {'755': False}}})
    expect(page.locator(AD)).to_have_count(0)
    assert page.evaluate('adsbygoogle.pauseAdRequests') == 1
    assert requested == [CMP_HOST, ADS_HOST]
    context.close()

    context, requested = intercept_context(browser, base, consent=INDIA, block_cmp=True)
    page = context.new_page()
    page.goto(base, wait_until='networkidle')
    page.locator(PLACEMENT).scroll_into_view_if_needed()
    expect(page.locator(AD)).to_have_count(0)
    assert requested == [CMP_HOST]
    context.close()


def verify(base, enabled):
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(channel='chrome', headless=True)
        context, requested = intercept_context(browser, base, consent=INDIA)
        page = context.new_page()
        response = page.request.get(base + '/generated-pages.json')
        assert response.ok
        journeys = {journey['path']: journey['serviceIds'] for journey in response.json()['journeys']}
        threshold_routes = [next(path for path, ids in journeys.items() if len(ids) == count)
                            for count in (5, 6, 24, 25)]
        exclusions = EXCLUSIONS if enabled else ['/', *EXCLUSIONS]
        for path in [*exclusions, *threshold_routes, LONG_ROUTE]:
            page.goto(base + path, wait_until='networkidle')
            count = len(journeys.get(path, []))
            expected = int(enabled and count >= 6) + int(enabled and count >= 25)
            expect(page.locator(PLACEMENT)).to_have_count(expected)
            if expected == 0:
                assert page.locator(AD).count() == 0
        if not enabled:
            assert not requested, requested
            print('PASS: default build produced no CMP, ad requests or reserved placements.')
            return
        context.close()

        verify_consent(browser, base)
        for width in (320, 1280):
            for outcome in ('filled', 'unfilled', 'blocked'):
                verify_home(browser, base, width, outcome)
                verify_route(browser, base, width, outcome, journeys)
        print('PASS: consent grant, denial, unknown CMP, failure and withdrawal, placement thresholds and exclusions,')
        print('near-viewport loading, one shared script, privacy choices and homepage autocomplete/search.')
        print('320px and 1280px: layout shift 0 and unchanged content bounds for consent, fill, no fill and blocked ads.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-url', default='http://127.0.0.1:8080')
    parser.add_argument('--enabled', action='store_true', help='Require a build with the documented mock configuration')
    args = parser.parse_args()
    if args.enabled and urlsplit(args.base_url).hostname not in ('localhost', '127.0.0.1', '::1'):
        parser.error('--enabled requires a loopback server')
    verify(args.base_url.rstrip('/'), args.enabled)
