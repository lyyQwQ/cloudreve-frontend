import { Alert, Button, DialogContent, Stack, Typography } from "@mui/material";
import { useSnackbar } from "notistack";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  createHLSTask,
  deleteHLSArtifact,
  getHLSStatus,
  getTasks,
  getTasksPhaseProgress,
  getVideoInfo,
} from "../../../api/api.ts";
import type { GetHLSStatusResponse, GetVideoInfoResponse } from "../../../api/video.ts";
import { ListTaskCategory, TaskListResponse, TaskResponse, TaskStatus, TaskType } from "../../../api/workflow.ts";
import { AppError, Code } from "../../../api/request.ts";
import { closeHLSManageDialog } from "../../../redux/globalStateSlice.ts";
import { useAppDispatch, useAppSelector } from "../../../redux/hooks.ts";
import { confirmOperation } from "../../../redux/thunks/dialog.ts";
import { refreshFileList } from "../../../redux/thunks/filemanager.ts";
import { ViewTaskAction } from "../../Common/Snackbar/snackbar.tsx";
import DraggableDialog from "../../Dialogs/DraggableDialog.tsx";
import { FileManagerIndex } from "../FileManager.tsx";

type HLSStatus = GetHLSStatusResponse | undefined;
type VideoInfo = GetVideoInfoResponse | undefined;
type HLSDialogState = "no_hls" | "processing" | "has_hls";

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

function isConflictError(e: unknown): boolean {
  const conflictCode = (Code as Record<string, number | undefined>).Conflict;
  return e instanceof AppError && (e.code === 409 || (typeof conflictCode === "number" && e.code === conflictCode));
}

const HLSManageDialog = () => {
  const dispatch = useAppDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const open = useAppSelector((state) => state.globalState.hlsManageDialogOpen);
  const file = useAppSelector((state) => state.globalState.hlsManageDialogFile);

  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [dialogState, setDialogState] = useState<HLSDialogState>("no_hls");
  const [status, setStatus] = useState<HLSStatus>(undefined);
  const [videoInfo, setVideoInfo] = useState<VideoInfo>(undefined);

  const fileId = useMemo(() => {
    if (!file) return undefined;
    return resolveFileId(file.id);
  }, [file]);

  const hasInvalidFileId = useMemo(() => open && file !== undefined && fileId === undefined, [open, file, fileId]);

  const detectProcessingFromWorkflow = useCallback(async () => {
    if (fileId === undefined) {
      return false;
    }

    let nextPageToken: string | undefined = "";
    for (let i = 0; i < 5; i++) {
      const taskList: TaskListResponse = await dispatch(
        getTasks({
          page_size: 50,
          category: ListTaskCategory.general,
          next_page_token: nextPageToken || undefined,
        }),
      );

      const candidates = taskList.tasks.filter(
        (task: TaskResponse) =>
          task.type === TaskType.video_hls_slice &&
          (task.status === TaskStatus.queued ||
            task.status === TaskStatus.processing ||
            task.status === TaskStatus.suspending),
      );

      for (const task of candidates) {
        try {
          const progress = await dispatch(getTasksPhaseProgress(task.id));
          const taskProgress = progress[TaskType.video_hls_slice];
          if (taskProgress && String(taskProgress.identifier) === String(fileId)) {
            return true;
          }
        } catch (e) {
          if (import.meta.env.DEV) {
            console.debug("Failed to load task progress", e);
          }
        }
      }

      nextPageToken = taskList.pagination?.next_token;
      if (!nextPageToken) {
        break;
      }
    }

    return false;
  }, [dispatch, fileId]);

  const refreshStatus = useCallback(() => {
    if (fileId === undefined) {
      return;
    }

    setLoading(true);
    setDialogState("no_hls");
    setStatus(undefined);
    setVideoInfo(undefined);

    const statusTask = dispatch(getHLSStatus({ file_id: fileId }));
    const videoInfoTask = dispatch(getVideoInfo({ file_id: fileId }));

    Promise.allSettled([statusTask, videoInfoTask])
      .then(async ([statusResult, videoInfoResult]) => {
        if (videoInfoResult.status === "fulfilled") {
          setVideoInfo(videoInfoResult.value);
        }

        if (statusResult.status === "fulfilled") {
          setStatus(statusResult.value);
          setDialogState("has_hls");
          return;
        }

        if (isNotFoundError(statusResult.reason)) {
          setDialogState("no_hls");
          try {
            const isProcessing = await detectProcessingFromWorkflow();
            if (isProcessing) {
              setDialogState("processing");
            }
          } catch (_e) {
            setDialogState("no_hls");
          }
          return;
        }

        setDialogState("no_hls");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [detectProcessingFromWorkflow, dispatch, fileId]);

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

    dispatch(confirmOperation(t("application:fileManager.hlsManageDeleteConfirm")))
      .then(() => {
        setDeleting(true);
        return dispatch(deleteHLSArtifact({ file_id: fileId }));
      })
      .then(() => {
        enqueueSnackbar({
          message: t("application:fileManager.hlsManageDeleted"),
          variant: "success",
        });
        dispatch(refreshFileList(FileManagerIndex.main));
        onClose();
      })
      .catch((e) => {
        if (isNotFoundError(e)) {
          setDialogState("no_hls");
        }
      })
      .finally(() => {
        setDeleting(false);
      });
  }, [dispatch, enqueueSnackbar, fileId, onClose, t]);

  const onCreate = useCallback(() => {
    if (fileId === undefined || !videoInfo?.hls_compatible) {
      return;
    }

    setCreating(true);
    dispatch(createHLSTask(fileId))
      .then((data) => {
        const taskPath = `/tasks?task_id=${encodeURIComponent(String(data.task_id))}`;
        enqueueSnackbar({
          message: t("modals.taskCreated"),
          variant: "success",
          action: ViewTaskAction(taskPath),
        });
        onClose();
      })
      .catch((e) => {
        if (isConflictError(e)) {
          setDialogState("processing");
          enqueueSnackbar({
            message: t("application:fileManager.hlsManageTaskConflict"),
            variant: "warning",
          });
        }
      })
      .finally(() => {
        setCreating(false);
      });
  }, [dispatch, enqueueSnackbar, fileId, onClose, t, videoInfo?.hls_compatible]);

  const goToTasks = useCallback(() => {
    navigate("/tasks");
    onClose();
  }, [navigate, onClose]);

  const renderedHeader = useMemo(() => {
    if (hasInvalidFileId) return t("application:fileManager.hlsManageInvalidFileId");
    if (!open) return "";
    if (loading) return t("application:fileManager.hlsManageLoading");
    if (dialogState === "processing") return t("application:fileManager.hlsManageProcessing");
    if (dialogState === "no_hls") return t("application:fileManager.hlsManageNoArtifact");
    if (dialogState === "has_hls") return t("application:fileManager.hlsManageAvailable");
    return t("application:fileManager.hlsManageNoArtifact");
  }, [dialogState, hasInvalidFileId, loading, open, t]);

  const disableCreate =
    loading ||
    creating ||
    deleting ||
    fileId === undefined ||
    hasInvalidFileId ||
    !videoInfo ||
    !videoInfo.hls_compatible;
  const disableDelete = loading || creating || deleting || fileId === undefined || hasInvalidFileId;

  return (
    <DraggableDialog
      title={t("application:fileManager.hlsManage")}
      showActions
      showCancel
      loading={loading || creating || deleting}
      hideOk
      onAccept={onClose}
      closeIconTestId="hls-manage-close-icon"
      cancelButtonTestId="hls-manage-cancel-button"
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
            {t("application:fileManager.hlsManageFileId")}: {fileId ?? ""}
          </Typography>

          <Typography
            variant={"body2"}
            color={"text.secondary"}
            data-testid="hls-manage-status"
            sx={{ wordBreak: "break-word" }}
          >
            {renderedHeader}
          </Typography>

          {dialogState === "no_hls" && (
            <Stack spacing={1.5}>
              {videoInfo && (
                <>
                  <Typography variant={"body2"} color={"text.secondary"}>
                    {t("application:fileManager.hlsManageVideoCodec")}: {videoInfo.codec}
                  </Typography>
                  <Typography variant={"body2"} color={"text.secondary"}>
                    {t("application:fileManager.hlsManageAudioCodec")}: {videoInfo.audio_codec}
                  </Typography>
                  <Typography variant={"body2"} color={"text.secondary"}>
                    {t("application:fileManager.hlsManageResolution")}: {videoInfo.resolution}
                  </Typography>
                  <Typography variant={"body2"} color={"text.secondary"}>
                    {t("application:fileManager.hlsManageDuration")}: {String(videoInfo.duration)}
                  </Typography>
                  <Typography variant={"body2"} color={"text.secondary"}>
                    {t("application:fileManager.hlsManageBitrate")}: {String(videoInfo.bitrate)}
                  </Typography>
                  <Typography variant={"body2"} color={"text.secondary"}>
                    {t("application:fileManager.hlsManageHlsCompatible")}: {String(videoInfo.hls_compatible)}
                  </Typography>
                </>
              )}

              {videoInfo?.hls_compatible === false && (
                <Alert severity="warning" data-testid="hls-manage-incompatible-alert">
                  {t("application:fileManager.hlsManageIncompatibleAlert")}
                </Alert>
              )}

              <Stack direction={"row"} spacing={1} justifyContent={"flex-end"}>
                <Button
                  variant="contained"
                  disabled={disableCreate}
                  onClick={onCreate}
                  data-testid="hls-manage-create-button"
                >
                  {t("application:fileManager.hlsManageStartTranscoding")}
                </Button>
              </Stack>
            </Stack>
          )}

          {dialogState === "processing" && (
            <Stack spacing={1.5}>
              <Alert severity="info" data-testid="hls-manage-processing-alert">
                {t("application:fileManager.hlsManageProcessingAlert")}
              </Alert>
              <Stack direction={"row"} spacing={1} justifyContent={"flex-end"}>
                <Button variant="outlined" onClick={goToTasks} data-testid="hls-manage-view-task-button">
                  {t("application:fileManager.hlsManageViewTasks")}
                </Button>
              </Stack>
            </Stack>
          )}

          {dialogState === "has_hls" && (
            <Stack spacing={1.5}>
              <Typography variant={"body2"} color={"text.secondary"}>
                {t("application:fileManager.hlsManageSegmentCount")}: {String(status?.artifact?.segment_count ?? "")}
              </Typography>
              <Typography variant={"body2"} color={"text.secondary"}>
                {t("application:fileManager.hlsManageTotalSize")}: {String(status?.artifact?.total_size ?? "")}
              </Typography>
              <Typography variant={"body2"} color={"text.secondary"}>
                {t("application:fileManager.hlsManageCodec")}: {String(status?.artifact?.codec ?? "")}
              </Typography>
              <Typography variant={"body2"} color={"text.secondary"} sx={{ wordBreak: "break-word" }}>
                {t("application:fileManager.hlsManageStoragePath")}: {String(status?.artifact?.storage_path ?? "")}
              </Typography>

              <Stack direction={"row"} spacing={1} justifyContent={"flex-end"}>
                <Button
                  color="error"
                  variant="contained"
                  disabled={disableDelete}
                  onClick={onDelete}
                  data-testid="hls-manage-delete-button"
                >
                  {t("application:fileManager.hlsManageDeleteArtifact")}
                </Button>
              </Stack>
            </Stack>
          )}
        </Stack>
      </DialogContent>
    </DraggableDialog>
  );
};

export default HLSManageDialog;
