export interface DocumentSource {
  file: string;
  sha256: string;
  officialIndex: string;
  officialUrl: string;
  versionStatus: 'byte-match' | 'different-version' | 'unchecked';
  documentCheckedOn: string | null;
  publicationDate: string | null;
  effectiveDate: string | null;
}
