"""Exercise dormant ads and the loopback build with all third-party requests intercepted."""
import argparse
import json
from urllib.parse import urlsplit

from playwright.sync_api import expect, sync_playwright


PLACEMENT = '[data-ad-placement]'
AD = 'ins.adsbygoogle'
ADS_HOST = 'pagead2.googlesyndication.com'
LONG_ROUTE = '/routes/chandigarh-to-jind'
CHOICE_KEY = 'haryanabus-advertising-choice-v1'
EXCLUSIONS = ['/cities/jind', '/cities/chandigarh', '/routes', '/about', '/privacy',
              '/routes/nuh-to-sonipat', '/missing', '/online-booking', '/search?from=jind&to=delhi']

GOOGLE_CMP_MOCK = """(() => {
  const state = { success: true, tc: {} };
  let tcfListener;
  window.mockPrivacyOpens = 0;
  window.__tcfapi = (command, version, callback) => {
    if (command !== 'addEventListener' || version !== 2.2) throw new Error('Unexpected TCF registration');
    tcfListener = callback;
    callback(state.tc, state.success);
  };
  window.updateMockConsent = (updates) => {
    Object.assign(state, updates);
    tcfListener?.(state.tc, state.success);
  };
  window.googlefc.showRevocationMessage = () => { window.mockPrivacyOpens += 1; };
  const queue = window.googlefc.callbackQueue;
  queue.push = (...entries) => entries.forEach(entry => entry.CONSENT_API_READY());
  queue.forEach(entry => entry.CONSENT_API_READY());
})();"""

ADS_MOCK = """window.mockAdSlots = [];
window.finishMockAds = (outcome) => {
  for (const ad of document.querySelectorAll('ins.adsbygoogle[data-mock-requested]:not([data-ad-status])')) {
    ad.dataset.adStatus = outcome;
    if (outcome === 'filled') {
      const creative = document.createElement('div');
      creative.setAttribute('data-mock-creative', '');
      creative.style.height = '250px';
      ad.append(creative);
    }
  }
};
window.adsbygoogle.push = () => {
  if (window.adsbygoogle.pauseAdRequests !== 0) throw new Error('Ad requests are paused');
  const ad = document.querySelector('ins.adsbygoogle:not([data-mock-requested])');
  if (!ad) throw new Error('No slot to initialize');
  ad.dataset.mockRequested = 'true';
  window.mockAdSlots.push(ad.dataset.adSlot);
  if (window.mockAdOutcome === 'filled') setTimeout(() => window.finishMockAds('filled'), 50);
};"""

TCF_GRANT = {'gdprApplies': True, 'cmpStatus': 'loaded',
             'eventStatus': 'tcloaded', 'tcString': 'test-consent',
             'vendor': {'consents': {'755': True}}, 'purpose': {'consents': {'1': True, '3': True, '4': True}}}


def intercept_context(browser, base, width=390, height=720, region='india', outcome='filled',
                      block_cmp=False, gpc=False, opted_out=False):
    context = browser.new_context(viewport={'width': width, 'height': height}, service_workers='block')
    requested = []
    context.add_init_script(f'window.mockAdOutcome = {json.dumps(outcome)};')
    context.add_init_script("""window.adScenarioLayoutShift = 0;
        new PerformanceObserver(list => {
            for (const entry of list.getEntries()) {
                if (!entry.hadRecentInput) window.adScenarioLayoutShift += entry.value;
            }
        }).observe({type: 'layout-shift', buffered: true});""")
    if gpc:
        context.add_init_script("Object.defineProperty(navigator, 'globalPrivacyControl', {value: true});")
    if opted_out:
        context.add_init_script(f"localStorage.setItem('{CHOICE_KEY}', 'denied');")

    def intercept(route):
        target = urlsplit(route.request.url)
        if target.scheme == urlsplit(base).scheme and target.netloc == urlsplit(base).netloc:
            if target.path == '/api/ad-region':
                requested.append(target.path)
                if region == 'error':
                    route.fulfill(status=503)
                else:
                    route.fulfill(json={'region': region})
            else:
                route.continue_()
            return
        requested.append(target.hostname)
        headers = {'access-control-allow-origin': '*', 'content-type': 'application/javascript'}
        if target.hostname == ADS_HOST and target.path.endswith('/adsbygoogle.js') and outcome != 'blocked':
            assert target.query == 'client=ca-pub-3647722960213142'
            assert route.request.resource_type == 'script'
            cmp = GOOGLE_CMP_MOCK if region == 'europe' and not block_cmp else ''
            route.fulfill(body=ADS_MOCK + cmp, headers=headers)
        else:
            route.abort()

    context.route('**/*', intercept)
    return context, requested


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


def verify_home(browser, base, width, region):
    context, requested = intercept_context(browser, base, width=width, height=800, region=region, outcome='manual')
    page = context.new_page()
    page.goto(base, wait_until='networkidle')
    ad = page.locator(PLACEMENT)
    expect(ad).to_have_count(1)
    assert ad.evaluate("""ad => ad.previousElementSibling.getAttribute('aria-labelledby') === 'browse-cities'
        && ad.nextElementSibling.getAttribute('aria-labelledby') === 'explore-routes-heading'""")
    assert ad.bounding_box()['height'] == 288
    controls = 'form [role=combobox], form button[type=submit], #browse-cities, #explore-routes-heading'
    baseline = positions(page, controls)
    assert len(baseline) == 5, baseline
    expect(page.get_by_role('button', name='Allow ads')).to_have_count(0)
    ad.scroll_into_view_if_needed()
    page.wait_for_function("window.mockAdSlots?.join() === '0000000001'")
    page.evaluate("finishMockAds('filled')")
    expect(ad.locator('[data-mock-creative]')).to_be_visible()
    expect(ad.get_by_text('Advertisement', exact=True)).to_be_visible()
    box = ad.locator(AD).bounding_box()
    assert box['height'] == 250 and 120 <= box['width'] <= 300
    assert requested == ['/api/ad-region', ADS_HOST], requested
    assert_layout(page, controls, baseline)
    verify_search(page)
    context.close()


def verify_search(page):
    origin = page.get_by_role('combobox', name='Boarding From')
    origin.fill('Delhi')
    page.get_by_role('option', name='Delhi', exact=True).click()
    destination = page.get_by_role('combobox', name='Where are you going?')
    destination.fill('Ludhiana')
    page.get_by_role('option', name='Ludhiana', exact=True).click()
    page.get_by_role('button', name='Find Buses').click()
    expect(page.locator('[data-service-id="delhi_isbt_delhi_depot_bus_schedule:59"]')).to_be_visible()
    expect(page.locator(PLACEMENT)).to_have_count(0)


def verify_route(browser, base, width, journeys):
    context, requested = intercept_context(browser, base, width=width, height=520, outcome='manual')
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(base + LONG_ROUTE, wait_until='networkidle')
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
    baseline = positions(page, rows)

    for slot in (inline, bottom):
        slot.scroll_into_view_if_needed()
        expect(slot.locator(AD)).to_have_attribute('data-mock-requested', 'true')
        page.evaluate("finishMockAds('filled')")
        expect(slot.locator('[data-mock-creative]')).to_be_visible()
    assert page.evaluate('mockAdSlots') == ['0000000002', '0000000003']
    assert_layout(page, rows, baseline)
    page.get_by_role('navigation', name='Main navigation').get_by_role('link', name='About').click()
    page.go_back()
    expect(page.locator(rows)).to_have_count(len(journeys[LONG_ROUTE]))
    expect(page.locator(PLACEMENT)).to_have_count(0)
    expect(page.locator('#departures-heading + ul > li[role=presentation]')).to_have_count(0)
    assert requested == ['/api/ad-region', ADS_HOST] and not errors, (requested, errors)
    context.close()


def verify_local_preferences(browser, base, region):
    context, requested = intercept_context(browser, base, region=region)
    page = context.new_page()
    page.goto(base, wait_until='networkidle')
    page.locator(PLACEMENT).scroll_into_view_if_needed()
    expect(page.locator('[data-mock-creative]')).to_be_visible()
    preferences = context.new_page()
    preferences.goto(base + '/privacy', wait_until='networkidle')
    expect(preferences.get_by_role('button', name='Allow ads')).to_have_attribute('aria-pressed', 'true')
    expect(preferences.get_by_role('status').filter(has_text='allowed by default')).to_be_visible()
    preferences.get_by_role('button', name='Keep ads off').click()
    expect(preferences.get_by_role('status').filter(has_text='Ads are off in this browser.')).to_be_visible()
    expect(page.locator(PLACEMENT)).to_have_count(0)
    assert page.evaluate('adsbygoogle.pauseAdRequests') == 1
    prior = requested.count(ADS_HOST)
    page.reload(wait_until='networkidle')
    expect(page.locator(PLACEMENT)).to_have_count(0)
    expect(page.get_by_role('button', name='Allow ads')).to_have_count(0)
    assert requested.count(ADS_HOST) == prior, requested
    preferences.get_by_role('button', name='Allow ads').click()
    page.locator(PLACEMENT).scroll_into_view_if_needed()
    expect(page.locator('[data-mock-creative]')).to_be_visible()
    assert requested.count(ADS_HOST) == prior + 1
    context.close()


def verify_europe(browser, base):
    context, requested = intercept_context(browser, base, region='europe')
    page = context.new_page()
    page.goto(base, wait_until='networkidle')
    page.locator(PLACEMENT).scroll_into_view_if_needed()
    tcf_denials = [{'tcString': ''}, {'gdprApplies': False}, {'cmpStatus': 'error'},
                   {'vendor': {'consents': {'755': False}}},
                   {'purpose': {'consents': {'1': True, '3': True, '4': False}}}]
    ineligible = [{'tc': {}}, {'tc': TCF_GRANT, 'success': False},
                  *[{'tc': {**TCF_GRANT, **denial}} for denial in tcf_denials]]
    for state in ineligible:
        page.evaluate('state => updateMockConsent({success: true, ...state})', state)
        page.evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))')
        assert requested == ['/api/ad-region', ADS_HOST], (state, requested)
        assert page.locator(AD).count() == 0
    expect(page.locator(PLACEMENT)).to_have_count(0)
    page.evaluate('tc => updateMockConsent({tc})', TCF_GRANT)
    page.locator(PLACEMENT).scroll_into_view_if_needed()
    expect(page.locator('[data-mock-creative]')).to_be_visible()
    page.evaluate('tc => updateMockConsent({tc})', {**TCF_GRANT, 'eventStatus': 'cmpuishown'})
    expect(page.locator('[data-mock-creative]')).to_be_visible()
    page.evaluate('tc => updateMockConsent({tc})', {**TCF_GRANT, 'eventStatus': 'useractioncomplete',
                                                   'vendor': {'consents': {'755': False}}})
    expect(page.locator(PLACEMENT)).to_have_count(0)
    assert page.evaluate('adsbygoogle.pauseAdRequests') == 1
    assert requested == ['/api/ad-region', ADS_HOST]
    page.goto(base + '/privacy', wait_until='networkidle')
    page.evaluate('tc => updateMockConsent({tc})', TCF_GRANT)
    page.get_by_role('button', name='Change privacy choices').click()
    assert page.evaluate('window.mockPrivacyOpens') == 1
    context.close()

    context, requested = intercept_context(browser, base, region='europe', block_cmp=True)
    page = context.new_page()
    page.goto(base, wait_until='networkidle')
    page.locator(PLACEMENT).scroll_into_view_if_needed()
    expect(page.locator(AD)).to_have_count(0)
    assert page.evaluate('adsbygoogle.pauseAdRequests') == 1
    assert requested == ['/api/ad-region', ADS_HOST]
    context.close()


def verify_unavailable(browser, base):
    for region, gpc in [(None, False), ('error', False), ('india', True)]:
        context, requested = intercept_context(browser, base, region=region, gpc=gpc)
        page = context.new_page()
        page.goto(base, wait_until='networkidle')
        expect(page.locator(PLACEMENT)).to_have_count(0)
        expect(page.get_by_role('button', name='Allow ads')).to_have_count(0)
        expect(page.locator(AD)).to_have_count(0)
        assert requested == ([] if gpc else ['/api/ad-region'])
        context.close()


def verify_early_opt_out(browser, base):
    for gpc in (False, True):
        context, requested = intercept_context(browser, base, gpc=gpc, opted_out=not gpc)
        page = context.new_page()
        bundle = []
        page.route('**/assets/index-*.js', lambda route: bundle.append(route))
        page.goto(base + LONG_ROUTE, wait_until='commit')
        expect(page.locator(PLACEMENT)).to_have_count(2)
        for placement in page.locator(PLACEMENT).all():
            expect(placement).to_be_hidden()
        assert page.locator('#departures-heading + ul > li[role=presentation]').first.bounding_box() is None
        assert not requested, requested
        region_lookup = []
        page.route('**/api/ad-region', lambda route: region_lookup.append(route))
        assert bundle
        if gpc:
            bundle.pop().continue_()
        else:
            with page.expect_request('**/api/ad-region'):
                bundle.pop().continue_()
        expect(page.locator(PLACEMENT)).to_have_count(0)
        if not gpc:
            region_lookup.pop().fulfill(json={'region': 'india'})
        else:
            assert not region_lookup
        assert ADS_HOST not in requested
        context.close()


def verify_failure(browser, base, outcome, visible):
    context, requested = intercept_context(browser, base, height=400,
                                           outcome='blocked' if outcome == 'blocked' else 'manual')
    page = context.new_page()
    page.goto(base + LONG_ROUTE, wait_until='networkidle')
    inline = page.locator(PLACEMENT).first
    rows = 'li[data-service-id]'
    baseline = positions(page, rows)
    with page.expect_request(lambda request: urlsplit(request.url).hostname == ADS_HOST):
        inline.evaluate("""(slot, visible) => window.scrollBy(0,
            slot.getBoundingClientRect().top - innerHeight + (visible ? 180 : -70))""", visible)
    if outcome != 'blocked':
        expect(inline.locator(AD)).to_have_attribute('data-mock-requested', 'true')
        if outcome == 'unfilled':
            page.evaluate("finishMockAds('unfilled')")
    if visible:
        expect(inline.locator(AD)).to_have_count(0, timeout=10000)
        expect(inline.get_by_text('Advertisement', exact=True)).to_be_hidden()
        assert inline.bounding_box()['height'] == 288
        assert_layout(page, rows, baseline)
    else:
        expect(page.locator(f'{PLACEMENT}[data-ad-placement$=":routeInline"]')).to_have_count(0, timeout=10000)
        assert positions(page, rows)[:5] == baseline[:5]
        assert page.evaluate('window.adScenarioLayoutShift') == 0
    if outcome == 'blocked':
        expect(page.locator(f'{PLACEMENT}[data-ad-placement$=":routeBottom"]')).to_have_count(0)
    assert requested == ['/api/ad-region', ADS_HOST], requested
    context.close()


def verify(base, enabled):
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(channel='chrome', headless=True)
        context, requested = intercept_context(browser, base)
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
            print('PASS: default build produced no consent or ad requests and no reserved placements.')
            return
        context.close()

        verify_unavailable(browser, base)
        verify_early_opt_out(browser, base)
        verify_europe(browser, base)
        for region in ('india', 'other'):
            verify_local_preferences(browser, base, region)
            for width in (320, 1280):
                verify_home(browser, base, width, region)
        for width in (320, 1280):
            verify_route(browser, base, width, journeys)
        for outcome in ('unfilled', 'blocked', 'timeout'):
            for visible in (False, True):
                verify_failure(browser, base, outcome, visible)
        print('PASS: default-on India and rest of world, cross-tab opt-out and re-enable, GPC and region failure,')
        print('strict European TCF and revocation, placement thresholds, exclusions, SPA revisits, and search.')
        print('320px and 1280px: zero layout shift on fills. No fill, blocked scripts and timeouts collapse below the viewport.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-url', default='http://127.0.0.1:8080')
    parser.add_argument('--enabled', action='store_true', help='Require a build with the documented mock configuration')
    args = parser.parse_args()
    if args.enabled and urlsplit(args.base_url).hostname not in ('localhost', '127.0.0.1', '::1'):
        parser.error('--enabled requires a loopback server')
    verify(args.base_url.rstrip('/'), args.enabled)
