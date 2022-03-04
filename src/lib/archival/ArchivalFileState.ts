export interface ArchivalFileState {
  file: {
    filename: string;
    contentType: string;
  };
  storage: {
    type: string;
    bucket: string;
    archivedAt: string;
  },
  metadata: {
    size: number;
    md5Hash: string;
    sha256Hash: string;
  };
}
