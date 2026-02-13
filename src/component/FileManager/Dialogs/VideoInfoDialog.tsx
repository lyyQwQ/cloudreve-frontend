import { DialogContent, Stack, Typography } from "@mui/material";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { getVideoInfo } from "../../../api/api.ts";
import type { GetVideoInfoResponse } from "../../../api/video.ts";
import { closeVideoInfoDialog } from "../../../redux/globalStateSlice.ts";
import { useAppDispatch, useAppSelector } from "../../../redux/hooks.ts";
import DraggableDialog from "../../Dialogs/DraggableDialog.tsx";

type VideoInfo = GetVideoInfoResponse | undefined;

function resolveFileId(rawId: unknown): string | number | undefined {
  if (typeof rawId === "number") {
    return Number.isFinite(rawId) ? rawId : undefined;
  }

  if (typeof rawId === "string") {
    const trimmed = rawId.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  return undefined;
}

const VideoInfoDialog = () => {
  const dispatch = useAppDispatch();
  const open = useAppSelector((state) => state.globalState.videoInfoDialogOpen);
  const file = useAppSelector((state) => state.globalState.videoInfoDialogFile);

  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<VideoInfo>(undefined);

  const fileId = useMemo(() => {
    if (!file) return undefined;
    return resolveFileId((file as any).id);
  }, [file]);

  const hasInvalidFileId = useMemo(() => open && file !== undefined && fileId === undefined, [open, file, fileId]);

  useEffect(() => {
    if (!open || fileId === undefined) {
      return;
    }

    setLoading(true);
    setInfo(undefined);
    dispatch(getVideoInfo({ file_id: fileId }))
      .then((data) => {
        setInfo(data);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [dispatch, open, fileId]);

  const onClose = useCallback(() => {
    dispatch(closeVideoInfoDialog());
  }, [dispatch]);

  const resolution = useMemo(() => {
    if (!info) return "";
    return info.resolution;
  }, [info]);

  const externalSubtitles = useMemo(() => {
    if (!info) return "";
    const external = info.subtitles?.external ?? [];
    return external.length > 0 ? external.map((s) => s.name).join(", ") : "";
  }, [info]);

  const embeddedSubtitles = useMemo(() => {
    if (!info) return "";
    const embedded = info.subtitles?.embedded ?? [];
    return embedded.length > 0
      ? embedded
          .map((s) => {
            const details = [s.language, s.title].filter((v) => !!v).join("|");
            return details ? `${s.index}:${details}` : `${s.index}`;
          })
          .join(", ")
      : "";
  }, [info]);

  return (
    <DraggableDialog
      title={"Video Info"}
      showActions
      showCancel
      loading={loading}
      onAccept={onClose}
      closeIconTestId="video-info-close-icon"
      cancelButtonTestId="video-info-cancel"
      okButtonTestId="video-info-ok"
      dialogProps={{
        open: open ?? false,
        onClose,
        fullWidth: true,
        maxWidth: "sm",
        disableRestoreFocus: true,
      }}
    >
      <DialogContent data-testid="video-info-dialog" sx={{ pt: 1 }}>
        <Stack spacing={1.5}>
          <Typography variant={"body2"} color={"text.secondary"} data-testid={"video-info-file-id"}>
            file_id: {fileId ?? ""}
          </Typography>

          {info && (
            <>
              <Stack direction={"row"} spacing={2} alignItems={"baseline"} sx={{ wordBreak: "break-word" }}>
                <Typography variant={"subtitle2"} sx={{ minWidth: 160 }}>
                  video_codec
                </Typography>
                <Typography variant={"body2"} data-testid={"video-info-video-codec"}>
                  {info.codec}
                </Typography>
              </Stack>

              <Stack direction={"row"} spacing={2} alignItems={"baseline"} sx={{ wordBreak: "break-word" }}>
                <Typography variant={"subtitle2"} sx={{ minWidth: 160 }}>
                  audio_codec
                </Typography>
                <Typography variant={"body2"} data-testid={"video-info-audio-codec"}>
                  {info.audio_codec}
                </Typography>
              </Stack>

              <Stack direction={"row"} spacing={2} alignItems={"baseline"} sx={{ wordBreak: "break-word" }}>
                <Typography variant={"subtitle2"} sx={{ minWidth: 160 }}>
                  resolution
                </Typography>
                <Typography variant={"body2"} data-testid={"video-info-resolution"}>
                  {resolution}
                </Typography>
              </Stack>

              <Stack direction={"row"} spacing={2} alignItems={"baseline"} sx={{ wordBreak: "break-word" }}>
                <Typography variant={"subtitle2"} sx={{ minWidth: 160 }}>
                  duration
                </Typography>
                <Typography variant={"body2"} data-testid={"video-info-duration"}>
                  {String(info.duration)}
                </Typography>
              </Stack>

              <Stack direction={"row"} spacing={2} alignItems={"baseline"} sx={{ wordBreak: "break-word" }}>
                <Typography variant={"subtitle2"} sx={{ minWidth: 160 }}>
                  bitrate
                </Typography>
                <Typography variant={"body2"} data-testid={"video-info-bitrate"}>
                  {String(info.bitrate)}
                </Typography>
              </Stack>

              <Stack direction={"row"} spacing={2} alignItems={"baseline"} sx={{ wordBreak: "break-word" }}>
                <Typography variant={"subtitle2"} sx={{ minWidth: 160 }}>
                  hls_compatible
                </Typography>
                <Typography variant={"body2"} data-testid={"video-info-hls-compatible"}>
                  {String(info.hls_compatible)}
                </Typography>
              </Stack>

              <Stack direction={"row"} spacing={2} alignItems={"baseline"} sx={{ wordBreak: "break-word" }}>
                <Typography variant={"subtitle2"} sx={{ minWidth: 160 }}>
                  subtitles.external
                </Typography>
                <Typography variant={"body2"} data-testid={"video-info-subtitles-external"}>
                  {externalSubtitles}
                </Typography>
              </Stack>

              <Stack direction={"row"} spacing={2} alignItems={"baseline"} sx={{ wordBreak: "break-word" }}>
                <Typography variant={"subtitle2"} sx={{ minWidth: 160 }}>
                  subtitles.embedded
                </Typography>
                <Typography variant={"body2"} data-testid={"video-info-subtitles-embedded"}>
                  {embeddedSubtitles}
                </Typography>
              </Stack>
            </>
          )}

          {hasInvalidFileId && (
            <Typography variant={"body2"} color={"text.secondary"} data-testid={"video-info-invalid-file-id"}>
              Invalid file_id.
            </Typography>
          )}

          {!loading && open && !info && !hasInvalidFileId && (
            <Typography variant={"body2"} color={"text.secondary"} data-testid={"video-info-empty"}>
              No data
            </Typography>
          )}
        </Stack>
      </DialogContent>
    </DraggableDialog>
  );
};

export default VideoInfoDialog;
