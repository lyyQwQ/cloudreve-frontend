import { Button, DialogContent, Stack, Typography } from "@mui/material";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { deleteHLSArtifact, getHLSStatus } from "../../../api/api.ts";
import { AppError, Code } from "../../../api/request.ts";
import { closeHLSManageDialog } from "../../../redux/globalStateSlice.ts";
import { useAppDispatch, useAppSelector } from "../../../redux/hooks.ts";
import DraggableDialog from "../../Dialogs/DraggableDialog.tsx";

type HLSStatus = any | undefined;

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

function isNotFoundError(e: unknown): boolean {
  return e instanceof AppError && e.code === Code.NodeFound;
}

const HLSManageDialog = () => {
  const dispatch = useAppDispatch();
  const open = useAppSelector((state) => state.globalState.hlsManageDialogOpen);
  const file = useAppSelector((state) => state.globalState.hlsManageDialogFile);

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [noHls, setNoHls] = useState(false);
  const [status, setStatus] = useState<HLSStatus>(undefined);

  const fileId = useMemo(() => {
    if (!file) return undefined;
    return resolveFileId((file as any).id);
  }, [file]);

  const hasInvalidFileId = useMemo(() => open && file !== undefined && fileId === undefined, [open, file, fileId]);

  const refreshStatus = useCallback(() => {
    if (fileId === undefined) {
      return;
    }

    setLoading(true);
    setStatus(undefined);
    setNoHls(false);

    dispatch(getHLSStatus({ file_id: fileId }))
      .then((data) => {
        setStatus(data);
      })
      .catch((e) => {
        if (isNotFoundError(e)) {
          setNoHls(true);
          return;
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [dispatch, fileId]);

  useEffect(() => {
    if (!open || fileId === undefined) {
      return;
    }
    refreshStatus();
  }, [open, fileId, refreshStatus]);

  const onClose = useCallback(() => {
    dispatch(closeHLSManageDialog());
  }, [dispatch]);

  const onDelete = useCallback(() => {
    if (fileId === undefined) {
      return;
    }

    setDeleting(true);
    dispatch(deleteHLSArtifact({ file_id: fileId }))
      .catch((e) => {
        if (isNotFoundError(e)) {
          setNoHls(true);
        }
      })
      .finally(() => {
        setDeleting(false);
        refreshStatus();
      });
  }, [dispatch, fileId, refreshStatus]);

  const renderedStatus = useMemo(() => {
    if (hasInvalidFileId) return "Invalid file_id.";
    if (!open) return "";
    if (loading) return "Loading...";
    if (noHls) return "No HLS";
    if (status !== undefined) return JSON.stringify(status);
    return "No data";
  }, [hasInvalidFileId, loading, noHls, open, status]);

  return (
    <DraggableDialog
      title={"HLS Management"}
      showActions
      showCancel
      loading={loading || deleting}
      onAccept={onClose}
      closeIconTestId="hls-manage-close-icon"
      dialogProps={{
        open: open ?? false,
        onClose,
        fullWidth: true,
        maxWidth: "sm",
        disableRestoreFocus: true,
      }}
    >
      <DialogContent data-testid="hls-manage-dialog" sx={{ pt: 1 }}>
        <Stack spacing={1.5}>
          <Typography variant={"body2"} color={"text.secondary"} sx={{ wordBreak: "break-word" }}>
            file_id: {fileId ?? ""}
          </Typography>

          <Typography
            variant={"body2"}
            color={"text.secondary"}
            data-testid="hls-manage-status"
            sx={{ wordBreak: "break-word" }}
          >
            {renderedStatus}
          </Typography>

          <Stack direction={"row"} spacing={1} justifyContent={"flex-end"}>
            <Button
              color="error"
              variant="contained"
              disabled={deleting || loading || fileId === undefined || hasInvalidFileId || noHls}
              onClick={onDelete}
              data-testid="hls-manage-delete-button"
            >
              Delete HLS
            </Button>
          </Stack>
        </Stack>
      </DialogContent>
    </DraggableDialog>
  );
};

export default HLSManageDialog;
