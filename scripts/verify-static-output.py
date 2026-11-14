"""Validate real production HTML and XML without a DOM or extra dependencies."""
import json
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit
import xml.etree.ElementTree as ET

ORIGIN = 'https://www.haryanabus.in'


class Page(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.tags = []
        self.text = []
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        self.tags.append((tag, dict(attrs)))

    def handle_data(self, data):
        self.text.append(data)

    def attrs(self, tag, key=None, value=None):
        return [attrs for name, attrs in self.tags if name == tag and (key is None or attrs.get(key) == value)]


def verify():
    report = json.loads(Path('dist/generated-pages.json').read_text(encoding='utf-8'))
    indexable = [item for item in report['pages'] if item['indexable']]
    titles = set()
    for item in report['pages']:
        html = Path('dist', item['file']).read_text(encoding='utf-8')
        page = Page(html)
        assert '<!--app-head-->' not in html
        assert len(page.attrs('title')) == 1, item
        assert len(page.attrs('meta', 'name', 'description')) == 1, item
        robots = page.attrs('meta', 'name', 'robots')
        assert len(robots) == 1
        assert ('noindex' in robots[0]['content']) == (not item['indexable'])
        canonical = page.attrs('link', 'rel', 'canonical')
        if item['path'] != '/404':
            assert [tag['href'] for tag in canonical] == [ORIGIN + item['path']], item
            assert [tag['content'] for tag in page.attrs('meta', 'property', 'og:url')] == [ORIGIN + item['path']]
        assert page.attrs('meta', 'name', 'author')[0]['content'] == 'Tushar Naharia'
        assert 'haryanabus.com' not in html
        if item['indexable']:
            assert len(page.attrs('h1')) == 1
            assert len(' '.join(page.text)) > 500
            assert page.attrs('meta', 'property', 'og:title')
            assert page.attrs('meta', 'property', 'og:description')
            title = html.split('<title')[1].split('>', 1)[1].split('</title>')[0]
            assert title not in titles
            titles.add(title)
            for link in page.attrs('a'):
                href = link.get('href', '')
                if href.startswith('/') and not href.startswith('//'):
                    path = urlsplit(href).path
                    file = 'index.html' if path == '/' else path.lstrip('/') + '.html'
                    assert Path('dist', file).is_file(), (item['path'], href)
    root = ET.fromstring(Path('dist/sitemap.xml').read_bytes())
    urls = [node.text for node in root.findall('{*}url/{*}loc')]
    assert root.tag == '{http://www.sitemaps.org/schemas/sitemap/0.9}urlset'
    assert len(urls) == len(set(urls)) == len(indexable)
    assert set(urls) == {ORIGIN + item['path'] for item in indexable}
    assert not root.findall('{*}url/{*}lastmod')
    assert f'Sitemap: {ORIGIN}/sitemap.xml' in Path('dist/robots.txt').read_text()
    config = json.loads(Path('vercel.json').read_text())
    assert config['cleanUrls'] and config['trailingSlash'] is False
    assert not config.get('rewrites'), 'An SPA fallback could mask 404s'
    assert any(h['source'] == '/search' and {'key': 'X-Robots-Tag', 'value': 'noindex'} in h['headers'] for h in config['headers'])
    print(f"PASS: {len(indexable)} indexable HTML pages, exact metadata, working internal links, XML sitemap and search policy")


if __name__ == '__main__':
    verify()
