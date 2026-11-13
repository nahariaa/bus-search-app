import csv
import hashlib
import importlib.util
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('importer', ROOT / 'scripts/import-timetables.py')
importer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(importer)


class ImportTests(unittest.TestCase):
    def test_header_variants_and_reordered_fields_keep_their_meaning(self):
        for days in ['Service Day', 'Service Days', 'service_days']:
            for stand in ['Bus Stand', 'Bus Stand Name', 'bus_stand_name']:
                for serial in ['Sr.No.', 'sr_no', 'Sr. No.']:
                    fields = importer.fields({days: '', 'To': 'Destination', serial: '17',
                                              'Via': 'Stop', stand: 'Boarding', 'From': 'Origin', 'Unshown': 'retain me'})
                    self.assertEqual(fields, {'days': '', 'to': 'Destination', 'serial': '17',
                                              'via': 'Stop', 'stand': 'Boarding', 'from': 'Origin'})
                    self.assertNotIn('operator', fields)

    def test_every_raw_csv_field_and_record_is_lossless(self):
        audit = json.loads((ROOT / 'data/timetable/audit.json').read_text(encoding='utf8'))
        by_ref = {(a['csv'], a['record']): a for a in audit}
        count = 0
        for file in (ROOT / 'data/timetable/source').glob('*.csv'):
            with file.open(encoding='utf-8-sig', newline='') as stream:
                reader = csv.reader(stream)
                headers = next(reader)
                for number, values in enumerate(reader, 1):
                    row = by_ref[(file.name, number)]
                    self.assertEqual(row['rawValues'], values)
                    self.assertEqual(row['raw'], dict(zip(headers, values)))
                    self.assertEqual(row['sourcePdf'], row['raw'].get('file_name', 'ambala.pdf'))
                    if row['status'] == 'review':
                        self.assertTrue(row['issues'])
                    else:
                        self.assertGreater(row['pdfRef']['page'], 0)
                    count += 1
        self.assertEqual(count, 20195)
        self.assertEqual(count, len(by_ref))

    def test_extracts_match_every_original_pdf_hash(self):
        paths = list((ROOT / 'data/timetable/pdf-extracts').glob('*.json'))
        self.assertEqual(len(paths), 25)
        for path in paths:
            extract = json.loads(path.read_text(encoding='utf8'))
            original = ROOT / 'data/timetable/source-pdfs' / extract['file']
            self.assertEqual(hashlib.sha256(original.read_bytes()).hexdigest(), extract['sha256'])


if __name__ == '__main__':
    unittest.main()
