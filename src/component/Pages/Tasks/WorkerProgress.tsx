import { Stack } from "@mui/material";
import { useTranslation } from "react-i18next";
import { TaskSummary, WorkerTransferPhase } from "../../../api/workflow.ts";
import { sizeToString } from "../../../util";
import StepProgressBar from "./StepProgressBar.tsx";

export interface WorkerProgressProps {
  summary?: TaskSummary;
}

const clampPercent = (value?: number) => Math.max(0, Math.min(100, value ?? 0));

export const hasWorkerProgress = (summary?: TaskSummary) => {
  const props = summary?.props;
  return !!(
    props?.worker_transfer_phase ||
    props?.worker_transfer_progress ||
    props?.worker_transcode_progress ||
    props?.worker_output_size
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

const WorkerProgress = ({ summary }: WorkerProgressProps) => {
  const { t } = useTranslation();
  if (!hasWorkerProgress(summary)) {
    return null;
  }

  const props = summary?.props;
  const transferProgress = clampPercent(props?.worker_transfer_progress);
  const transcodeProgress = clampPercent(props?.worker_transcode_progress);
  const outputSize = props?.worker_output_size ? sizeToString(props.worker_output_size) : undefined;

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
    </Stack>
  );
};

export default WorkerProgress;
