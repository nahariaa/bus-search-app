"""HTTP and browser acceptance for the built site, Vercel preview, or production.
Optional --access-url bootstraps a temporary Vercel share cookie. Never stored in reports.
"""
import argparse
import json
import runpy
import re
from pathlib import Path
from urllib.parse import parse_qs, urlsplit
import xml.etree.ElementTree as ET
from playwright.sync_api import expect, sync_playwright

Page = runpy.run_path('scripts/verify-static-output.py')['Page']
ORIGIN = 'https://www.haryanabus.in'


def verify(base, output, access_url=None):
    report = json.loads(Path('dist/generated-pages.json').read_text(encoding='utf-8'))
    pages = [item for item in report['pages'] if item['path'] not in ('/search', '/404')]
    journeys = {item['path']: item for item in report['journeys']}
    sample = {
        '/', '/about', '/privacy', '/routes', '/cities/jind', '/cities/chandigarh', '/cities/ambala',
        '/routes/jind-to-chandigarh', '/routes/delhi-to-ludhiana', '/routes/sarai-kale-khan-delhi-to-jaipur',
        '/routes/ambala-to-delhi', '/routes/faridabad-to-delhi', '/routes/nuh-to-panchkula',
        max(journeys.values(), key=lambda item: len(item['serviceIds']))['path'],
    }
    browser_pages = [item for item in pages if item['path'] in sample]
    errors, http_checks = [], []
    Path(output).parent.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='chrome', headless=True)
        bootstrap = browser.new_context()
        if access_url:
            bootstrap.new_page().goto(access_url, wait_until='networkidle')
        storage = bootstrap.storage_state()
        request = bootstrap.request
        for item in pages:
            response = request.get(base + item['path'])
            assert response.status == 200, (item['path'], response.status)
            html = response.text()
            page = Page(html)
            assert len(page.attrs('h1')) == 1, item['path']
            assert len(page.attrs('title')) == 1
            assert len(page.attrs('meta', 'name', 'description')) == 1
            assert [tag['href'] for tag in page.attrs('link', 'rel', 'canonical')] == [ORIGIN + item['path']]
            assert page.attrs('meta', 'name', 'robots')[0]['content'] == ('index, follow' if item['indexable'] else 'noindex')
            if item['path'] in journeys:
                assert [tag['data-service-id'] for _, tag in page.tags if 'data-service-id' in tag] == journeys[item['path']]['serviceIds']
            http_checks.append({'path': item['path'], 'status': response.status})
        xml = request.get(base + '/sitemap.xml')
        assert xml.status == 200
        urls = [node.text for node in ET.fromstring(xml.body()).findall('{*}url/{*}loc')]
        assert set(urls) == {ORIGIN + item['path'] for item in pages if item['indexable']}
        assert len(urls) == len(set(urls))
        robots = request.get(base + '/robots.txt')
        assert robots.status == 200 and ORIGIN + '/sitemap.xml' in robots.text()
        for path in ['/search?from=delhi&to=ludhiana', '/search?from=DELHI&to=LUDHIYANA']:
            response = request.get(base + path)
            assert response.status == 200
            assert 'noindex' in response.headers.get('x-robots-tag', '')
            assert Page(response.text()).attrs('meta', 'name', 'robots')[0]['content'] == 'noindex'
        for path in ['/routes/unsupported-route', '/does-not-exist', '/missing.js']:
            response = request.get(base + path)
            assert response.status == 404, (path, response.status)
            assert 'Page not found' in response.text()
            http_checks.append({'path': path, 'status': response.status})
        for path in ['/about/', '/routes/delhi-to-ludhiana/', '/about.html', '/cities/jind/', '/routes/jind-to-chandigarh.html']:
            response = request.get(base + path, max_redirects=0)
            assert response.status == 308, (path, response.status)
            http_checks.append({'path': path, 'status': response.status})
        for path in ['/favicon.ico', '/robots.txt', '/sitemap.xml']:
            assert request.get(base + path).status == 200
        home = request.get(base + '/').text()
        for asset in re.findall(r'(?:src|href)="(/assets/[^"]+)"', home):
            assert request.get(base + asset).status == 200
        # Exercise representative pages with and without hydration. HTTP checks cover every generated URL.
        nojs = browser.new_context(java_script_enabled=False, storage_state=storage)
        page = nojs.new_page()
        for width in [360, 390, 1280]:
            page.set_viewport_size({'width': width, 'height': 900})
            for item in browser_pages:
                page.goto(base + item['path'], wait_until='load')
                assert page.locator('h1').is_visible()
                assert page.locator('a[href="/routes"]').count() > 0
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), (item['path'], width, 'no JS overflow')
                if item['path'] in journeys:
                    assert page.locator('[data-service-id]').count() == len(journeys[item['path']]['serviceIds'])
            if width == 390:
                page.goto(base + '/routes')
                page.locator('summary').filter(has_text=re.compile(r'^Nuh$')).click()
                page.get_by_role('link', name='Nuh to Panchkula', exact=True).click()
                assert page.get_by_role('heading', name='No published through departure').is_visible()
                page.get_by_role('link', name='Panchkula to Nuh', exact=True).click()
                assert page.get_by_role('heading', name='Panchkula to Nuh bus connection').is_visible()
                page.goto(base + '/routes/delhi-to-ludhiana')
                card = page.locator('[data-service-id="delhi_isbt_delhi_depot_bus_schedule:59"]')
                assert '00:40' in card.inner_text() and 'Katra' in card.inner_text()
                card.locator('summary').click()
                assert 'Source references' in card.inner_text()
                page.screenshot(path=str(Path(output).with_name('route-no-js-390.png')))
                page.goto(base + '/routes/jind-to-chandigarh')
                source = page.locator('[data-service-id="jind_bus_schedule:209"]')
                source.locator('summary').focus()
                page.keyboard.press('Enter')
                assert source.get_by_role('link', name='Official PDF, page 8').is_visible()
                assert 'Kaithal' in source.inner_text()
                correction = urlsplit(page.get_by_role('link', name='Report a timetable issue').get_attribute('href'))
                assert correction.scheme == 'mailto' and correction.path == 'haryanabusinfo@gmail.com'
                body = parse_qs(correction.query)['body'][0]
                assert ORIGIN + '/routes/jind-to-chandigarh' in body and 'Jind.pdf' in body
                page.screenshot(path=str(Path(output).with_name('jind-no-js-390.png')))
        nojs.close()
        context = browser.new_context(storage_state=storage)
        context.add_init_script("""window.__firstHeading = null;
          new MutationObserver(() => { if (!window.__firstHeading) window.__firstHeading = document.querySelector('main h1'); })
          .observe(document, {childList:true, subtree:true});""")
        page = context.new_page()
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('console', lambda message: errors.append(message.text) if message.type in ['error', 'warning'] and
                not any(text in message.text for text in ['React Router Future Flag', 'Failed to load resource']) else None)
        for width in [360, 390, 1280]:
            page.set_viewport_size({'width': width, 'height': 900})
            for item in browser_pages:
                page.goto(base + item['path'], wait_until='networkidle')
                assert page.evaluate('window.__firstHeading === document.querySelector("main h1")'), (item['path'], 'heading replaced during hydration')
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), (item['path'], width, 'JS overflow')
                assert page.locator('link[rel="canonical"]').get_attribute('href') == ORIGIN + item['path']
                if item['path'] in journeys:
                    assert page.locator('[data-service-id]').evaluate_all('(nodes) => nodes.map(node => node.dataset.serviceId)') == journeys[item['path']]['serviceIds']
            page.goto(base + '/routes/sarai-kale-khan-delhi-to-jaipur', wait_until='networkidle')
            page.screenshot(path=str(Path(output).with_name(f'terminal-{width}.png')))
        page.set_viewport_size({'width': 390, 'height': 844})
        page.goto(base + '/routes/delhi-to-ludhiana', wait_until='networkidle')
        notes = page.get_by_text('Schedule and source notes', exact=True)
        notes.focus()
        page.keyboard.press('Enter')
        assert notes.locator('..').get_attribute('open') is not None
        page.get_by_role('link', name='Search Delhi to Ludhiana', exact=True).click()
        page.wait_for_url('**/search?from=delhi&to=ludhiana')
        assert page.get_by_role('combobox', name='Boarding From').input_value() == 'Delhi'
        assert page.get_by_role('combobox', name='Where are you going?').input_value() == 'Ludhiana'
        assert page.locator('[data-service-id]').evaluate_all('(nodes) => nodes.map(node => node.dataset.serviceId)') == journeys['/routes/delhi-to-ludhiana']['serviceIds']
        assert page.get_by_role('link', name='Published Delhi to Ludhiana timetable and sources').is_visible()
        page.wait_for_function("document.querySelector('meta[name=robots]').content === 'noindex'")
        page.get_by_role('navigation', name='Main navigation').get_by_role('link', name='About', exact=True).click()
        page.wait_for_function("document.querySelector('meta[name=robots]').content === 'index, follow'")
        assert page.locator('link[rel="canonical"]').get_attribute('href') == ORIGIN + '/about'
        assert page.locator('meta[name="description"]').count() == 1
        page.go_back(wait_until='networkidle')
        assert '/search?' in page.url
        page.wait_for_function("document.querySelector('meta[name=robots]').content === 'noindex'")
        page.go_forward(wait_until='networkidle')
        page.wait_for_function("document.querySelector('meta[name=robots]').content === 'index, follow'")
        assert page.locator('#main-content').evaluate('(node) => node === document.activeElement')
        page.goto(base, wait_until='networkidle')
        page.keyboard.press('Tab')
        assert page.get_by_role('link', name='Skip to main content').evaluate('(node) => node === document.activeElement')
        page.keyboard.press('Enter')
        assert page.locator('#main-content').evaluate('(node) => node === document.activeElement')
        for path in ['/', '/routes', '/cities/jind', '/cities/chandigarh', '/routes/jind-to-chandigarh',
                     '/routes/chandigarh-to-jind', '/routes/sarai-kale-khan-delhi-to-jaipur', '/routes/delhi-to-ludhiana']:
            page.goto(base + path, wait_until='networkidle')
            page.evaluate('document.documentElement.style.fontSize = "200%"')
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), (path, '200% text zoom')
        page.goto(base + '/cities/jind', wait_until='networkidle')
        page.get_by_role('link', name='Jind to Chandigarh bus timetable', exact=True).click()
        page.get_by_role('link', name='Chandigarh to Jind', exact=True).click()
        expect(page.locator('link[rel="canonical"]')).to_have_attribute('href', ORIGIN + '/routes/chandigarh-to-jind')
        page.go_back(wait_until='networkidle')
        expect(page.locator('link[rel="canonical"]')).to_have_attribute('href', ORIGIN + '/routes/jind-to-chandigarh')
        page.go_forward(wait_until='networkidle')
        expect(page.locator('link[rel="canonical"]')).to_have_attribute('href', ORIGIN + '/routes/chandigarh-to-jind')
        page.goto(base + '/routes/unsupported-route', wait_until='networkidle')
        assert page.get_by_role('heading', name='Page not found').is_visible()
        assert not errors, errors
        browser.close()
    result = {'baseUrl': base, 'passed': True, 'publicPages': len(pages),
              'indexablePages': sum(item['indexable'] for item in pages),
              'browserPages': len(browser_pages), 'journeys': len(journeys),
              'httpChecks': http_checks, 'widths': [360, 390, 1280], 'pageErrors': errors,
              'checks': ['raw HTML metadata and all service IDs', 'sitemap XML', 'robots', 'search noindex header and HTML',
                         'real unknown URL 404', 'slash and HTML redirects', 'static assets', 'depot links without JavaScript',
                         'heading preserved during hydration', 'representative pages hydrated', 'mobile overflow', '200% text zoom',
                         'search prefill and identical results', 'noindex removed on navigation', 'back/forward', 'keyboard skip link and navigation focus']}
    Path(output).write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--base-url', default='http://127.0.0.1:8080')
    parser.add_argument('--output', default='.tools/static-browser.json')
    parser.add_argument('--access-url')
    args = parser.parse_args()
    verify(args.base_url.rstrip('/'), args.output, args.access_url)
