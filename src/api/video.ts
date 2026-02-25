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
