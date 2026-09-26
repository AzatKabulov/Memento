export type RemoteMoment = {
  owner_id: string;
  diary_date: string;
  revision: number;
  mutation_id: string;
  kind: "photo" | "video" | null;
  caption: string;
  source: "camera" | "library" | null;
  frame_y: "top" | "center" | "bottom" | null;
  duration_ms: number | null;
  media_path: string | null;
  media_bytes: number | null;
  deleted_at: string | null;
  updated_at: string;
};

export type LocalChange = {
  operationId: string;
  entryId: string;
  date: string;
  revision: number;
  cloudRevision: number;
  deletedAt: string | null;
  kind: "photo" | "video";
  caption: string;
  source: "camera" | "library";
  frame: "top" | "center" | "bottom";
  durationMs: number | null;
  mediaId: string;
  mediaPath: string;
  mediaBytes: number;
  uploadPath: string | null;
  uploadUrl: string | null;
  retryAt: string | null;
  attempts: number;
};

export type BackupConflict = { date: string; remote: RemoteMoment };

export type BackupSummary = {
  pending: number;
  conflicts: BackupConflict[];
  lastSynced: string | null;
  wifiOnly: boolean;
  needsAttention: number;
};
