"""Browser checks for dormant ads and a deliberately mocked enabled build."""
import argparse
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright


OUTBOUND = '/routes/jind-to-chandigarh'
INBOUND = '/routes/chandigarh-to-jind'
CMP_MOCK = """(() => {
  const listeners = new Map();
  let id = 0;
  let consent = true;
  const publish = (callback, listenerId) => callback({ listenerId, cmpId: 42, cmpStatus: 'loaded',
    eventStatus: 'useractioncomplete', tcString: 'mock',
    vendor: { consents: { 755: consent } }, purpose: { consents: { 1: consent, 3: consent, 4: consent } } }, true);
  window.__tcfapi = (command, version, callback, listenerId) => {
    if (command === 'addEventListener') { listeners.set(++id, callback); publish(callback, id); }
    if (command === 'removeEventListener') listeners.delete(listenerId);
  };
  window.setMockConsent = (allowed) => {
    consent = allowed;
    for (const [listenerId, callback] of listeners) publish(callback, listenerId);
  };
})();"""
ADS_MOCK = """window.mockAdInitializations = 0;
window.adsbygoogle = { push() {
    const ad = document.querySelector('ins.adsbygoogle');
    if (!ad) throw new Error('No slot to initialize');
    window.mockAdInitializations += 1;
    ad.dataset.adStatus = location.pathname.endsWith('chandigarh-to-jind') ? 'unfilled' : 'filled';
} };"""


def context_with_intercept(browser, base, mode, consent):
    context = browser.new_context(viewport={'width': 390, 'height': 844})
    calls = []
    if consent:
        context.add_init_script(CMP_MOCK)

    def intercept(route):
        target = urlsplit(route.request.url)
        if target.netloc == urlsplit(base).netloc:
            route.continue_()
        else:
            calls.append(route.request.url)
            if mode == 'mock' and target.hostname == 'pagead2.googlesyndication.com' and target.path.endswith('/adsbygoogle.js'):
                route.fulfill(body=ADS_MOCK, headers={'access-control-allow-origin': '*', 'content-type': 'application/javascript'})
            else:
                route.abort()

    context.route('**/*', intercept)
    return context, calls


def verify(base, enabled):
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(channel='chrome', headless=True)
        context, calls = context_with_intercept(browser, base, 'abort', consent=not enabled)
        page = context.new_page()
        for path in ['/', '/cities/jind', '/routes', OUTBOUND, '/routes/jind-to-delhi', '/missing', '/search?from=jind&to=delhi']:
            page.goto(base + path, wait_until='networkidle')
            page.locator('footer').scroll_into_view_if_needed()
            assert page.locator('[data-ad-placement], ins.adsbygoogle').count() == 0
        assert not calls, calls
        context.close()
        if not enabled:
            print('PASS: default build produced no ad request or placeholder, even with a mock CMP.')
            return

        context, calls = context_with_intercept(browser, base, 'abort', consent=True)
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(base + OUTBOUND, wait_until='networkidle')
        ad = page.locator('[data-ad-placement]')
        assert ad.bounding_box()['height'] >= 280
        assert not calls
        ad.scroll_into_view_if_needed()
        page.wait_for_function("getComputedStyle(document.querySelector('[data-ad-placement]')).visibility === 'hidden'")
        assert len(calls) == 1
        assert page.get_by_role('heading', name='Published departures').is_visible()
        page.get_by_role('link', name='Chandigarh to Jind', exact=True).click()
        page.locator('[data-ad-placement]').scroll_into_view_if_needed()
        page.wait_for_function("getComputedStyle(document.querySelector('[data-ad-placement]')).visibility === 'hidden'")
        assert len(calls) == 1 and not errors, (calls, errors)
        context.close()

        context, calls = context_with_intercept(browser, base, 'mock', consent=True)
        page = context.new_page()
        page.goto(base + OUTBOUND, wait_until='networkidle')
        page.locator('[data-ad-placement]').scroll_into_view_if_needed()
        page.wait_for_function('window.mockAdInitializations === 1')
        assert page.get_by_text('Advertisement', exact=True).is_visible()
        page.evaluate('window.setMockConsent(false)')
        page.locator('[data-ad-placement]').wait_for(state='detached')
        page.evaluate('window.setMockConsent(true)')
        page.get_by_role('link', name='Chandigarh to Jind', exact=True).click()
        ad = page.locator('[data-ad-placement]')
        ad.scroll_into_view_if_needed()
        page.wait_for_function('window.mockAdInitializations === 2')
        page.wait_for_function("getComputedStyle(document.querySelector('[data-ad-placement]')).visibility === 'hidden'")
        assert ad.bounding_box()['height'] >= 280, 'No-fill should retain the reserved layout'
        page.go_back(wait_until='networkidle')
        assert page.locator('[data-ad-placement]').count() == 0
        assert page.evaluate('window.mockAdInitializations') == 2 and len(calls) == 1
        page.evaluate('window.setMockConsent(false)')
        page.get_by_role('link', name='Search Jind to Chandigarh', exact=True).click()
        page.locator('[data-service-id="jind_bus_schedule:209"]').wait_for()
        assert len(calls) == 1
        browser.close()
        print('PASS: consent gating, near-viewport load, blocked script, no-fill, reservation, once-per-page initialization and search, with every Google request intercepted.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-url', default='http://127.0.0.1:8080')
    parser.add_argument('--enabled', action='store_true', help='Require a build with the documented mock configuration')
    args = parser.parse_args()
    verify(args.base_url.rstrip('/'), args.enabled)
