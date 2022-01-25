export interface ArchivalFileState {
  file: {
    filename: string;
    contentType: string;
  };
  metadata: {
    archivedAt: string;
    size: number;
    md5Hash: string;
    sha256Hash: string;
  };
}
