import {
  Alert,
  Button,
  Divider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useSnackbar } from "notistack";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { TaskResponse, TaskStatus, TaskType } from "../../../api/workflow.ts";
import { sendCancelVideoTask } from "../../../api/api.ts";
import { useAppDispatch } from "../../../redux/hooks.ts";
import { confirmOperation } from "../../../redux/thunks/dialog.ts";
import { StyledTableContainerPaper } from "../../Common/StyledComponents.tsx";
import DownloadFileList from "./DownloadFileList.tsx";
import TaskProgress from "./TaskProgress.tsx";
import TaskProps from "./TaskProps.tsx";
import Dismiss from "../../Icons/Dismiss.tsx";

export interface TaskDetailProps {
  task: TaskResponse;
  downloading?: boolean;
  onRefresh?: () => void;
}

const TaskDetail = ({ task, downloading, onRefresh }: TaskDetailProps) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const [canceling, setCanceling] = useState(false);

  const cancelable =
    (task.status === TaskStatus.queued || task.status === TaskStatus.processing) &&
    (task.type === TaskType.video_subtitle_burn || task.type === TaskType.video_hls_slice);

  const cancelTask = () => {
    dispatch(confirmOperation(t("download.cancelTaskConfirm"))).then(() => {
      setCanceling(true);
      dispatch(sendCancelVideoTask(task.id))
        .then(() => {
          enqueueSnackbar({
            message: t("download.taskCanceled"),
            variant: "success",
          });
          onRefresh?.();
        })
        .finally(() => {
          setCanceling(false);
        });
    });
  };
  return (
    <Stack spacing={2}>
      <Stack spacing={1}>
        {cancelable && (
          <Stack direction="row" justifyContent="flex-end">
            <Button
              variant="outlined"
              color="inherit"
              size="small"
              startIcon={<Dismiss />}
              disabled={canceling}
              onClick={cancelTask}
            >
              {t("download.cancelTask")}
            </Button>
          </Stack>
        )}
        {task.summary?.props?.download && (
          <>
            <Typography variant={"subtitle1"} fontWeight={600}>
              {t("setting.fileList")}
            </Typography>
            <DownloadFileList downloading={downloading} taskId={task.id} summary={task.summary} />
            <Divider />
          </>
        )}
        <Typography variant={"subtitle1"} fontWeight={600}>
          {t("setting.taskProgress")}
        </Typography>
        {!!task.summary?.props?.failed && (
          <Alert severity={"warning"}>
            {t("setting.partialSuccessWarning", {
              num: task.summary?.props?.failed,
            })}
          </Alert>
        )}
        {task.status === TaskStatus.error && <Alert severity={"error"}>{task.error}</Alert>}
        <TaskProgress
          taskId={task.id}
          taskStatus={task.status}
          taskType={task.type}
          summary={task.summary}
          node={task.node}
        />
        <Divider />
      </Stack>
      <Stack spacing={1}>
        <Typography variant={"subtitle1"} fontWeight={600}>
          {t("setting.taskDetails")}
        </Typography>
        <TaskProps task={task} />
        {task.error_history && <Divider sx={{ pt: 2 }} />}
      </Stack>
      {task.error_history && (
        <Stack spacing={1}>
          <Typography variant={"subtitle1"} fontWeight={600}>
            {t("setting.retryErrorHistory")}
          </Typography>
          <TableContainer component={StyledTableContainerPaper} sx={{ maxHeight: 300 }}>
            <Table sx={{ width: "100%" }} size="small">
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>{t("common:error")}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {task.error_history.map((error, index) => (
                  <TableRow
                    hover
                    key={`${task.id}-${index}`}
                    sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
                  >
                    <TableCell component="th" scope="row">
                      {index + 1}
                    </TableCell>
                    <TableCell>{error}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Stack>
      )}
    </Stack>
  );
};

export default TaskDetail;
