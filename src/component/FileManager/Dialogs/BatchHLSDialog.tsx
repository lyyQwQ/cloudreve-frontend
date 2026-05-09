import { Alert, DialogContent, Stack, Typography } from "@mui/material";
import { useSnackbar } from "notistack";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { batchHLSPreflight, createBatchHLSTasks } from "../../../api/api.ts";
import type { BatchHLSPreflightResponse } from "../../../api/video.ts";
import { closeBatchHLSDialog } from "../../../redux/globalStateSlice.ts";
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

const BatchHLSDialog = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const open = useAppSelector((state) => state.globalState.batchHLSDialogOpen);
  const files = useAppSelector((state) => state.globalState.batchHLSDialogFiles);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [preflight, setPreflight] = useState<BatchHLSPreflightResponse | undefined>(undefined);

  const fileIds = useMemo(() => (files ?? []).map((file) => resolveFileId((file as any).id)), [files]);
  const validFileIds = useMemo(() => fileIds.filter((id): id is string | number => id !== undefined), [fileIds]);
  const hasInvalidFileId = open && fileIds.some((id) => id === undefined);

  useEffect(() => {
    if (!open) {
      return;
    }
    if (validFileIds.length === 0 || hasInvalidFileId) {
      setPreflight(undefined);
      return;
    }

    setLoading(true);
    setPreflight(undefined);
    dispatch(batchHLSPreflight({ file_ids: validFileIds }))
      .then((data) => {
        setPreflight(data);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [dispatch, hasInvalidFileId, open, validFileIds]);

  const onClose = useCallback(() => {
    dispatch(closeBatchHLSDialog());
  }, [dispatch]);

  const onConfirm = useCallback(() => {
    if (validFileIds.length === 0) {
      return;
    }

    setSubmitting(true);
    dispatch(createBatchHLSTasks({ file_ids: validFileIds }))
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
  }, [dispatch, enqueueSnackbar, onClose, t, validFileIds]);

  const disabled = (preflight?.summary.ready ?? 0) === 0 || hasInvalidFileId;

  return (
    <DraggableDialog
      title={t("application:fileManager.batchHLS")}
      showActions
      showCancel
      loading={loading || submitting}
      disabled={disabled}
      onAccept={onConfirm}
      closeIconTestId="batch-hls-close-icon"
      cancelButtonTestId="batch-hls-cancel"
      okButtonTestId="batch-hls-confirm-button"
      dialogProps={{
        open: open ?? false,
        onClose,
        fullWidth: true,
        maxWidth: "md",
        disableRestoreFocus: true,
      }}
    >
      <DialogContent data-testid="batch-hls-dialog-root" sx={{ pt: 1 }}>
        <Stack spacing={1.5}>
          <Typography variant="body2" color="text.secondary">
            {t("application:fileManager.batchSelectedFiles", { count: validFileIds.length })}
          </Typography>

          {hasInvalidFileId && <Alert severity="warning">{t("application:fileManager.hlsManageInvalidFileId")}</Alert>}

          {!!preflight && (
            <Alert severity={(preflight.summary.ready ?? 0) > 0 ? "info" : "warning"} data-testid="batch-hls-summary">
              {t("application:fileManager.batchHLSSummary", {
                ready: preflight.summary.ready ?? 0,
                existing: preflight.summary.existing ?? 0,
                processing: preflight.summary.processing ?? 0,
                incompatible: preflight.summary.incompatible ?? 0,
                failed: preflight.summary.failed ?? 0,
              })}
            </Alert>
          )}

          {!!preflight && (
            <Stack spacing={0.75} data-testid="batch-hls-rows">
              {preflight.rows.map((row) => (
                <Typography
                  key={row.file_id}
                  variant="body2"
                  color={row.status === "ready" ? "text.primary" : "text.secondary"}
                >
                  {row.file_name || row.file_id}: {row.status}
                  {row.codec ? ` | ${row.codec}` : ""}
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

export default BatchHLSDialog;
