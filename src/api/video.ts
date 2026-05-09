export interface GetVideoInfoRequest {
  file_id: string | number;
  [key: string]: unknown;
}

export interface VideoInfoSubtitleEmbedded {
  index: number;
  language: string;
  title: string;
}

export interface VideoInfoSubtitleExternal {
  name: string;
  path: string;
}

export interface VideoInfoSubtitles {
  external: VideoInfoSubtitleExternal[];
  embedded: VideoInfoSubtitleEmbedded[];
}

export interface GetVideoInfoResponse {
  codec: string;
  audio_codec: string;
  resolution: string;
  duration: number;
  bitrate: number;
  hls_compatible: boolean;
  subtitles: VideoInfoSubtitles;
}

export type SubtitleSelectionPayload =
  | {
      mode: "auto";
    }
  | {
      mode: "external";
      external_name: string;
    }
  | {
      mode: "embedded";
      embedded_index: number;
    };

export interface CreateSubtitleBurnTaskRequest {
  file_id: string | number;
  subtitle?: SubtitleSelectionPayload;
  [key: string]: unknown;
}

export interface CreateHLSTaskResponse {
  task_id: number;
}

export interface BatchFileIDsRequest {
  file_ids: Array<string | number>;
  [key: string]: unknown;
}

export interface BatchSubtitleBurnRequest extends BatchFileIDsRequest {
  candidate_key: string;
}

export interface BatchResultSummary {
  ready?: number;
  created?: number;
  skipped?: number;
  conflict?: number;
  failed?: number;
  existing?: number;
  processing?: number;
  incompatible?: number;
}

export interface BatchSubtitleCandidate {
  key: string;
  label: string;
  type: "external" | "embedded" | string;
  count: number;
}

export interface BatchSubtitleCandidateBind {
  candidate_key: string;
  type: "external" | "embedded" | string;
  external_name?: string;
  embedded_index?: number;
  label: string;
}

export interface BatchSubtitleRow {
  file_id: string;
  file_name: string;
  status: string;
  reason?: string;
  candidates?: BatchSubtitleCandidateBind[];
}

export interface BatchSubtitlePreflightResponse {
  candidates: BatchSubtitleCandidate[];
  rows: BatchSubtitleRow[];
  summary: BatchResultSummary;
}

export interface BatchCreateRow {
  file_id: string;
  file_name: string;
  status: string;
  reason?: string;
  task_id?: string;
}

export interface BatchCreateResponse {
  rows: BatchCreateRow[];
  summary: BatchResultSummary;
}

export interface BatchHLSRow {
  file_id: string;
  file_name: string;
  status: string;
  reason?: string;
  codec?: string;
  audio_codec?: string;
}

export interface BatchHLSPreflightResponse {
  rows: BatchHLSRow[];
  summary: BatchResultSummary;
}

export interface GetHLSStatusResponse {
  file_id: number;
  has_hls: boolean;
  disk_available?: boolean;
  artifact?: {
    storage_path: string;
    segment_count: number;
    total_size: number;
    codec: string;
  };
}
