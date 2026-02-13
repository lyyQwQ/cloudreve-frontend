import { Box, DialogContent, FormControlLabel, Radio, RadioGroup, Stack, Typography } from "@mui/material";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createSubtitleBurnTask, getVideoInfo } from "../../../api/api.ts";
import type { CreateSubtitleBurnTaskRequest, GetVideoInfoResponse } from "../../../api/video.ts";
import { closeSubtitleSelectDialog } from "../../../redux/globalStateSlice.ts";
import { useAppDispatch, useAppSelector } from "../../../redux/hooks.ts";
import DraggableDialog from "../../Dialogs/DraggableDialog.tsx";

type SubtitleOption = {
  key: string;
  label: string;
  testId: string;
  payload: NonNullable<CreateSubtitleBurnTaskRequest["subtitle"]>;
};

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

const SubtitleSelectDialog = () => {
  const dispatch = useAppDispatch();
  const open = useAppSelector((state) => state.globalState.subtitleSelectDialogOpen);
  const file = useAppSelector((state) => state.globalState.subtitleSelectDialogFile);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [info, setInfo] = useState<GetVideoInfoResponse | undefined>(undefined);
  const [selectedKey, setSelectedKey] = useState("");

  const fileId = useMemo(() => {
    if (!file) return undefined;
    return resolveFileId((file as any).id);
  }, [file]);

  const hasInvalidFileId = useMemo(() => open && file !== undefined && fileId === undefined, [open, file, fileId]);

  const subtitleOptions = useMemo<SubtitleOption[]>(() => {
    if (!info) return [];

    const external = (info.subtitles?.external ?? []).map((item, index) => ({
      key: `external:${item.name}`,
      label: `external: ${item.name}`,
      testId: `subtitle-select-option-external-${index}`,
      payload: {
        mode: "external" as const,
        external_name: item.name,
      },
    }));

    const embedded = (info.subtitles?.embedded ?? []).map((item) => {
      const details = [item.language, item.title].filter((v) => !!v).join(" | ");
      return {
        key: `embedded:${item.index}`,
        label: details ? `embedded #${item.index}: ${details}` : `embedded #${item.index}`,
        testId: `subtitle-select-option-embedded-${item.index}`,
        payload: {
          mode: "embedded" as const,
          embedded_index: item.index,
        },
      };
    });

    return [...external, ...embedded];
  }, [info]);

  const selectedOption = useMemo(
    () => subtitleOptions.find((item) => item.key === selectedKey),
    [subtitleOptions, selectedKey],
  );

  useEffect(() => {
    if (!open || fileId === undefined) {
      return;
    }

    setLoading(true);
    setInfo(undefined);
    setSelectedKey("");
    dispatch(getVideoInfo({ file_id: fileId }))
      .then((data) => {
        setInfo(data);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [dispatch, open, fileId]);

  const onClose = useCallback(() => {
    dispatch(closeSubtitleSelectDialog());
  }, [dispatch]);

  const onConfirm = useCallback(() => {
    if (!selectedOption || fileId === undefined) {
      return;
    }

    setSubmitting(true);
    dispatch(
      createSubtitleBurnTask({
        file_id: fileId,
        subtitle: selectedOption.payload,
      }),
    )
      .then(() => {
        onClose();
      })
      .finally(() => {
        setSubmitting(false);
      });
  }, [dispatch, fileId, onClose, selectedOption]);

  return (
    <DraggableDialog
      title={"Subtitle Burn"}
      showActions
      showCancel
      loading={loading || submitting}
      disabled={!selectedOption}
      onAccept={onConfirm}
      closeIconTestId="subtitle-select-close-icon"
      cancelButtonTestId="subtitle-select-cancel"
      okButtonTestId="subtitle-select-confirm-button"
      dialogProps={{
        open: open ?? false,
        onClose,
        fullWidth: true,
        maxWidth: "sm",
        disableRestoreFocus: true,
      }}
    >
      <DialogContent data-testid="subtitle-select-dialog-root" sx={{ pt: 1 }}>
        <Stack spacing={1.5}>
          <Typography variant={"body2"} color={"text.secondary"}>
            Select one subtitle track for burn task.
          </Typography>

          {subtitleOptions.length > 0 && (
            <RadioGroup value={selectedKey} onChange={(event) => setSelectedKey(event.target.value)}>
              {subtitleOptions.map((option) => (
                <Box key={option.key} data-testid={option.testId}>
                  <FormControlLabel value={option.key} control={<Radio size="small" />} label={option.label} />
                </Box>
              ))}
            </RadioGroup>
          )}

          {hasInvalidFileId && (
            <Typography variant={"body2"} color={"text.secondary"} data-testid={"subtitle-select-invalid-file-id"}>
              Invalid file_id.
            </Typography>
          )}

          {!loading && !hasInvalidFileId && !!info && subtitleOptions.length === 0 && (
            <Typography variant={"body2"} color={"text.secondary"}>
              No subtitle available.
            </Typography>
          )}
        </Stack>
      </DialogContent>
    </DraggableDialog>
  );
};

export default SubtitleSelectDialog;
