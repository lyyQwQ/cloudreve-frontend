import { Alert, Box, DialogContent, FormControlLabel, Radio, RadioGroup, Stack, Typography } from "@mui/material";
import { useSnackbar } from "notistack";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { batchSubtitlePreflight, createBatchSubtitleBurnTasks } from "../../../api/api.ts";
import type { BatchSubtitlePreflightResponse } from "../../../api/video.ts";
import { closeBatchSubtitleBurnDialog } from "../../../redux/globalStateSlice.ts";
import { useAppDispatch, useAppSelector } from "../../../redux/hooks.ts";
import { ViewTaskAction } from "../../Common/Snackbar/snackbar.tsx";
import DraggableDialog from "../../Dialogs/DraggableDialog.tsx";

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

const BatchSubtitleBurnDialog = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const open = useAppSelector((state) => state.globalState.batchSubtitleBurnDialogOpen);
  const files = useAppSelector((state) => state.globalState.batchSubtitleBurnDialogFiles);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [preflight, setPreflight] = useState<BatchSubtitlePreflightResponse | undefined>(undefined);
  const [selectedKey, setSelectedKey] = useState("");

  const fileIds = useMemo(() => (files ?? []).map((file) => resolveFileId((file as any).id)), [files]);
  const validFileIds = useMemo(() => fileIds.filter((id): id is string | number => id !== undefined), [fileIds]);
  const hasInvalidFileId = open && fileIds.some((id) => id === undefined);

  useEffect(() => {
    if (!open) {
      return;
    }
    if (validFileIds.length === 0 || hasInvalidFileId) {
      setPreflight(undefined);
      setSelectedKey("");
      return;
    }

    setLoading(true);
    setPreflight(undefined);
    setSelectedKey("");
    dispatch(batchSubtitlePreflight({ file_ids: validFileIds }))
      .then((data) => {
        setPreflight(data);
        setSelectedKey(data.candidates?.[0]?.key ?? "");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [dispatch, hasInvalidFileId, open, validFileIds]);

  const onClose = useCallback(() => {
    dispatch(closeBatchSubtitleBurnDialog());
  }, [dispatch]);

  const onConfirm = useCallback(() => {
    if (!selectedKey || validFileIds.length === 0) {
      return;
    }

    setSubmitting(true);
    dispatch(createBatchSubtitleBurnTasks({ file_ids: validFileIds, candidate_key: selectedKey }))
      .then((res) => {
        onClose();
        enqueueSnackbar({
          message: t("application:fileManager.batchTaskCreated", { count: res.summary.created ?? 0 }),
          variant: "success",
          action: ViewTaskAction("/tasks"),
        });
      })
      .finally(() => {
        setSubmitting(false);
      });
  }, [dispatch, enqueueSnackbar, onClose, selectedKey, t, validFileIds]);

  const disabled = !selectedKey || (preflight?.summary.ready ?? 0) === 0 || hasInvalidFileId;

  return (
    <DraggableDialog
      title={t("application:fileManager.batchSubtitleBurn")}
      showActions
      showCancel
      loading={loading || submitting}
      disabled={disabled}
      onAccept={onConfirm}
      closeIconTestId="batch-subtitle-burn-close-icon"
      cancelButtonTestId="batch-subtitle-burn-cancel"
      okButtonTestId="batch-subtitle-burn-confirm-button"
      dialogProps={{
        open: open ?? false,
        onClose,
        fullWidth: true,
        maxWidth: "md",
        disableRestoreFocus: true,
      }}
    >
      <DialogContent data-testid="batch-subtitle-burn-dialog-root" sx={{ pt: 1 }}>
        <Stack spacing={1.5}>
          <Typography variant="body2" color="text.secondary">
            {t("application:fileManager.batchSelectedFiles", { count: validFileIds.length })}
          </Typography>

          {hasInvalidFileId && <Alert severity="warning">{t("application:fileManager.hlsManageInvalidFileId")}</Alert>}

          {!!preflight && (
            <Alert
              severity={(preflight.summary.ready ?? 0) > 0 ? "info" : "warning"}
              data-testid="batch-subtitle-summary"
            >
              {t("application:fileManager.batchSubtitleSummary", {
                ready: preflight.summary.ready ?? 0,
                skipped: preflight.summary.skipped ?? 0,
                conflict: preflight.summary.conflict ?? 0,
                failed: preflight.summary.failed ?? 0,
              })}
            </Alert>
          )}

          {!!preflight && preflight.candidates.length > 0 && (
            <RadioGroup value={selectedKey} onChange={(event) => setSelectedKey(event.target.value)}>
              {preflight.candidates.map((candidate) => (
                <Box key={candidate.key} data-testid={`batch-subtitle-candidate-${candidate.key}`}>
                  <FormControlLabel
                    value={candidate.key}
                    control={<Radio size="small" />}
                    label={`${candidate.label} (${candidate.type})`}
                  />
                </Box>
              ))}
            </RadioGroup>
          )}

          {!!preflight && preflight.candidates.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              {t("application:fileManager.batchNoSharedSubtitle")}
            </Typography>
          )}

          {!!preflight && (
            <Stack spacing={0.75} data-testid="batch-subtitle-rows">
              {preflight.rows.map((row) => (
                <Typography
                  key={row.file_id}
                  variant="body2"
                  color={row.status === "ready" ? "text.primary" : "text.secondary"}
                >
                  {row.file_name || row.file_id}: {row.status}
                  {row.reason ? ` - ${row.reason}` : ""}
                </Typography>
              ))}
            </Stack>
          )}
        </Stack>
      </DialogContent>
    </DraggableDialog>
  );
};

export default BatchSubtitleBurnDialog;
