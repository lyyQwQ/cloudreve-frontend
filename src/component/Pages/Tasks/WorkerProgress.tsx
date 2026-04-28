import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import { Stack, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { TaskStatus, TaskSummary, WorkerTransferPhase } from "../../../api/workflow.ts";
import { sizeToString } from "../../../util";
import { formatDuration } from "../../../util/datetime.ts";
import StepProgressBar from "./StepProgressBar.tsx";

dayjs.extend(duration);

export interface WorkerProgressProps {
  summary?: TaskSummary;
  status?: string;
}

const clampPercent = (value?: number) => Math.max(0, Math.min(100, value ?? 0));
const etaProgressThreshold = 3;

export const hasWorkerProgress = (summary?: TaskSummary) => {
  const props = summary?.props;
  return !!(
    props?.worker_transfer_phase ||
    props?.worker_transfer_progress ||
    props?.worker_transcode_progress ||
    props?.worker_output_size ||
    props?.worker_started_at
  );
};

export const workerTransferPhaseText = (phase: string | undefined, t: (key: string) => string) => {
  switch (phase) {
    case WorkerTransferPhase.source_download:
      return t("setting.workerTransferSourceDownload");
    case WorkerTransferPhase.output_download:
      return t("setting.workerTransferOutputDownload");
    default:
      return t("setting.workerTransfer");
  }
};

const isTerminalStatus = (status?: string) =>
  status === TaskStatus.completed || status === TaskStatus.error || status === TaskStatus.canceled;

const activeWorkerProgress = (summary?: TaskSummary) => {
  const props = summary?.props;
  const transcodeProgress = props?.worker_transcode_progress;
  if (transcodeProgress !== undefined && transcodeProgress > etaProgressThreshold && transcodeProgress < 100) {
    return transcodeProgress;
  }

  return undefined;
};

export const workerEtaSeconds = (summary?: TaskSummary, status?: string, nowMs = Date.now()) => {
  if (isTerminalStatus(status)) {
    return undefined;
  }

  const startedAt = summary?.props?.worker_started_at;
  const progress = activeWorkerProgress(summary);
  if (!startedAt || progress === undefined) {
    return undefined;
  }

  const elapsedSeconds = nowMs / 1000 - startedAt;
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds <= 0) {
    return undefined;
  }

  const remainingSeconds = (elapsedSeconds * (100 - progress)) / progress;
  if (!Number.isFinite(remainingSeconds) || remainingSeconds <= 0) {
    return undefined;
  }

  return Math.round(remainingSeconds);
};

const WorkerProgress = ({ summary, status }: WorkerProgressProps) => {
  const { t } = useTranslation();
  if (!hasWorkerProgress(summary)) {
    return null;
  }

  const props = summary?.props;
  const transferProgress = clampPercent(props?.worker_transfer_progress);
  const transcodeProgress = clampPercent(props?.worker_transcode_progress);
  const outputSize = props?.worker_output_size ? sizeToString(props.worker_output_size) : undefined;
  const etaSeconds = workerEtaSeconds(summary, status);

  return (
    <Stack spacing={1}>
      <StepProgressBar
        title={workerTransferPhaseText(props?.worker_transfer_phase, t)}
        secondary={`${transferProgress.toFixed(0)}%`}
        progress={transferProgress}
      />
      <StepProgressBar
        title={t("setting.workerTranscode")}
        secondary={outputSize ? `${transcodeProgress.toFixed(0)}% · ${outputSize}` : `${transcodeProgress.toFixed(0)}%`}
        progress={transcodeProgress}
      />
      {etaSeconds !== undefined && (
        <Typography variant="caption" color="text.secondary">
          {t("setting.workerEstimatedRemaining", { duration: formatDuration(dayjs.duration(etaSeconds * 1000)) })}
        </Typography>
      )}
    </Stack>
  );
};

export default WorkerProgress;
