"""Compare cold local builds with identical mobile Chrome emulation (lab data)."""
import argparse
import gzip
import json
from pathlib import Path
from statistics import median
from playwright.sync_api import sync_playwright


PATHS = ('/', '/routes', '/routes/delhi-to-ludhiana')
OBSERVERS = """window.labVitals = { lcp: 0, cls: 0 };
new PerformanceObserver(list => {
  for (const entry of list.getEntries()) window.labVitals.lcp = entry.startTime;
}).observe({ type: 'largest-contentful-paint', buffered: true });
new PerformanceObserver(list => {
  for (const entry of list.getEntries()) {
    if (entry.hadRecentInput) continue;
    const v = window.labVitals;
    if (!v.sessionStart || entry.startTime - v.previous > 1000 || entry.startTime - v.sessionStart > 5000) {
      v.sessionStart = entry.startTime;
      v.sessionValue = 0;
    }
    v.previous = entry.startTime;
    v.sessionValue += entry.value;
    v.cls = Math.max(v.cls, v.sessionValue);
  }
}).observe({ type: 'layout-shift', buffered: true });"""


def sample(browser, url):
    with browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=1,
                             is_mobile=True, has_touch=True) as context:
        page = context.new_page()
        cdp = context.new_cdp_session(page)
        bodies = []
        cdp.on('Network.loadingFinished', lambda event: bodies.append(event['encodedDataLength']))
        cdp.send('Network.enable')
        cdp.send('Network.setCacheDisabled', {'cacheDisabled': True})
        cdp.send('Network.emulateNetworkConditions', {
            'offline': False, 'latency': 150, 'downloadThroughput': 200000, 'uploadThroughput': 93750,
        })
        cdp.send('Emulation.setCPUThrottlingRate', {'rate': 4})
        cdp.send('Performance.enable')
        page.add_init_script(OBSERVERS)
        page.goto(url, wait_until='networkidle')
        vitals = page.evaluate('window.labVitals')
        metrics = {entry['name']: entry['value'] for entry in cdp.send('Performance.getMetrics')['metrics']}
        return {'transferredBytes': sum(bodies), 'jsMs': metrics['ScriptDuration'] * 1000,
                'lcpMs': vitals['lcp'], 'cls': vitals['cls'],
                'documentBytes': page.evaluate("performance.getEntriesByType('navigation')[0].decodedBodySize")}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-url', default='http://127.0.0.1:8080')
    parser.add_argument('--directory', default='dist')
    parser.add_argument('--output', default='.tools/mobile-lab.json')
    args = parser.parse_args()
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(channel='chrome', headless=True)
        results = {}
        for path in PATHS:
            runs = [sample(browser, args.base_url.rstrip('/') + path) for _ in range(3)]
            results[path] = {'runs': runs, 'median': {key: round(median(run[key] for run in runs), 3) for key in runs[0]}}
        report = {'chrome': browser.version, 'profile': '390x844, DPR 1, touch, 4x CPU, 150 ms, 1.6/0.75 Mbit/s, cold cache',
                  'pages': results}
        browser.close()
    assets = Path(args.directory, 'assets')
    for label, pattern in [('startup', 'index-*.js'), ('deferredSearch', 'search-engine-*.js')]:
        (asset,) = assets.glob(pattern)
        content = asset.read_bytes()
        report[label] = {'name': asset.name, 'bytes': len(content), 'gzipBytes': len(gzip.compress(content))}
    Path(args.output).parent.mkdir(parents=True, exist_ok=True)
    Path(args.output).write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({**report, 'pages': {path: data['median'] for path, data in results.items()}}, indent=2))


if __name__ == '__main__':
    main()
