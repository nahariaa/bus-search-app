"""Browser acceptance checks against local or Vercel Preview URLs (requires Playwright)."""
import argparse
import json
from pathlib import Path
from playwright.sync_api import sync_playwright


def verify(base_url):
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='chrome', headless=True)
        page = browser.new_page(viewport={'width': 390, 'height': 844})
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(base_url, wait_until='networkidle')
        origin = page.get_by_role('combobox', name='Boarding From')
        origin.fill('isbt')
        options = page.get_by_role('option').all_text_contents()
        delhi = sorted(name for name in options if name.endswith(', Delhi'))
        assert delhi == ['ISBT Anand Vihar, Delhi', 'ISBT Kashmiri Gate, Delhi', 'ISBT Sarai Kale Khan, Delhi'], options
        assert len(options) == len(set(options))
        origin.fill('Singhu Border')
        assert page.get_by_role('option').count() == 0
        origin.fill('delhi')
        page.get_by_role('option', name='Delhi', exact=True).click()
        destination = page.get_by_role('combobox', name='Where are you going?')
        destination.fill('ludhiyana')
        destination.press('ArrowDown')
        destination.press('Enter')
        assert destination.input_value() == 'Ludhiana'
        page.get_by_role('button', name='Find Buses').click()
        page.wait_for_url('**/search?from=delhi&to=ludhiana')
        page.get_by_text('Towards Katra · via Ludhiana', exact=True).first.wait_for()
        katra = page.locator('[data-service-id="delhi_isbt_delhi_depot_bus_schedule:59"]')
        assert '00:40' in katra.inner_text()
        assert 'From ISBT Kashmiri Gate, Delhi' in katra.inner_text()
        assert page.get_by_text('To Ludhiana', exact=True).count() > 0
        baseline = page.locator('[data-service-id]').count()
        canonical = page.locator('link[rel="canonical"]').get_attribute('href')
        for query in ['from=DELHI&to=LUDHIYANA', 'from=%20Delhi%20&to=%20Ludhiana%20', 'from=delhi&to=ludhiana']:
            page.goto(base_url + '/search?' + query, wait_until='networkidle')
            assert page.locator('[data-service-id]').count() == baseline
            assert page.locator('link[rel="canonical"]').get_attribute('href') == canonical
            page.reload(wait_until='networkidle')
            assert page.locator('[data-service-id]').count() == baseline
        for legacy in ['ISBTDelhi', 'ISBT%20Delhi', 'ISBTKashmiriGate', 'ISBT%20DelhiAm']:
            page.goto(base_url + '/search?from=' + legacy + '&to=Ludhiana', wait_until='networkidle')
            page.get_by_text('Towards Katra · via Ludhiana', exact=True).first.wait_for()
        page.goto(base_url + '/search?from=bhiwani&to=delhi', wait_until='networkidle')
        assert page.locator('[data-service-id]').count() > 0
        assert page.get_by_text('05:00', exact=True).count() > 0
        page.goto(base_url + '/search?from=bhiwani&to=rohtak', wait_until='networkidle')
        assert page.get_by_text('Towards Delhi · via Rohtak', exact=True).count() > 0
        page.goto(base_url + '/search?from=Singhu%20Border&to=Samalkha', wait_until='networkidle')
        assert page.get_by_text('No matching timetable found', exact=True).count() == 1
        assert page.locator('[data-service-id]').count() == 0
        assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
        assert not errors, errors
        browser.close()
        return {'baseUrl': base_url, 'passed': True, 'delhiLudhianaResults': baseline,
                'isbtDelhiTerminals': delhi, 'pageErrors': errors,
                'checks': ['mobile autocomplete', 'alias autocomplete', 'keyboard selection', 'canonical URLs', 'legacy URLs',
                           'direct visits', 'refresh', 'Delhi to Ludhiana terminating and via Katra',
                           'Bhiwani to Delhi', 'Bhiwani to Rohtak via', 'via-only origin rejected', 'mobile overflow']}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--base-url', default='http://127.0.0.1:8080')
    parser.add_argument('--output', default='.tools/browser-verification.json')
    args = parser.parse_args()
    result = verify(args.base_url.rstrip('/'))
    Path(args.output).parent.mkdir(parents=True, exist_ok=True)
    Path(args.output).write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(result, indent=2))
