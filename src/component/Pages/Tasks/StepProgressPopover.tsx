import { Box, Divider, PopoverProps, Typography } from "@mui/material";
import HoverPopover from "material-ui-popup-state/HoverPopover";
import { Fragment, useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getTasksPhaseProgress } from "../../../api/api.ts";
import { TaskProgress, TaskProgresses, TaskType } from "../../../api/workflow.ts";
import { useAppDispatch } from "../../../redux/hooks.ts";
import { sizeToString } from "../../../util";
import StepProgressBar from "./StepProgressBar.tsx";

export interface StepProgressPopoverProps extends PopoverProps {
  taskId: string;
  processing?: boolean;
}

export const ProgressKeys = {
  relocate: "relocate",
  upload: "upload",
  upload_single_: "upload_single_",
  archive_count: "archive_count",
  archive_size: "archive_size",
  upload_count: "upload_count",
  extract_count: "extract_count",
  extract_size: "extract_size",
  download: "download",
  imported: "imported",
  indexed: "indexed",
  ffmpeg: "ffmpeg",
};

const ProgressBar = ({ pkey, p }: { pkey: string; p: TaskProgress }) => {
  const { t } = useTranslation();
  if (pkey === ProgressKeys.ffmpeg) {
    const percent = Math.round((100 * p.current) / Math.max(p.total, 1));
    return <StepProgressBar title={"FFmpeg"} secondary={`${percent}%`} progress={percent} />;
  }

  if (pkey === TaskType.video_subtitle_burn) {
    return (
      <StepProgressBar
        title={t("dashboard:task.subtitleBurn")}
        secondary={`${p.current} / ${p.total}`}
        progress={(100 * p.current) / Math.max(p.total, 1)}
      />
    );
  }

  if (pkey === TaskType.video_hls_slice) {
    return (
      <StepProgressBar
        title={t("dashboard:task.hlsSlice")}
        secondary={`${p.current} / ${p.total}`}
        progress={(100 * p.current) / Math.max(p.total, 1)}
      />
    );
  }
  if (pkey === ProgressKeys.relocate) {
    return (
      <StepProgressBar
        title={t("setting.relocatedEntities")}
        secondary={`${p.current} / ${p.total}`}
        progress={(100 * p.current) / Math.max(p.total, 1)}
      />
    );
  }

  if (pkey === ProgressKeys.imported) {
    return (
      <StepProgressBar
        title={t("setting.importedFiles")}
        secondary={`${p.current} / ${p.total}`}
        progress={(100 * p.current) / Math.max(p.total, 1)}
      />
    );
  }

  if (pkey === ProgressKeys.indexed) {
    return (
      <StepProgressBar
        indeterminate={p.total === 0}
        title={t("setting.indexedFiles")}
        secondary={`${p.current}`}
        progress={(100 * p.current) / Math.max(p.total, 1)}
      />
    );
  }

  if (pkey.startsWith(ProgressKeys.upload_single_)) {
    return (
      <StepProgressBar
        title={t("setting.uploadWorker", {
          num: pkey.replace(ProgressKeys.upload_single_, ""),
        })}
        secondary={`${sizeToString(p.current)} / ${sizeToString(p.total)}`}
        progress={(100 * p.current) / Math.max(p.total, 1)}
      />
    );
  }

  if (pkey === ProgressKeys.archive_count) {
    let secondary = `${p.current}`;
    if (p.total !== 0) {
      secondary += ` / ${p.total}`;
    }
    return (
      <StepProgressBar
        indeterminate={p.total === 0}
        title={t("setting.archivedFiles")}
        secondary={secondary}
        progress={(100 * p.current) / Math.max(p.total, 1)}
      />
    );
  }

  if (pkey === ProgressKeys.archive_size) {
    let secondary = sizeToString(p.current);
    if (p.total !== 0) {
      secondary += ` / ${sizeToString(p.total)}`;
    }
    return (
      <StepProgressBar
        indeterminate={p.total === 0}
        title={t("setting.archivedFilesSize")}
        secondary={secondary}
        progress={(100 * p.current) / Math.max(p.total, 1)}
      />
    );
  }

  if (pkey === ProgressKeys.upload) {
    return (
      <StepProgressBar
        title={t("setting.uploadedSize")}
        secondary={`${sizeToString(p.current)} / ${sizeToString(p.total)}`}
        progress={(100 * p.current) / Math.max(p.total, 1)}
      />
    );
  }

  if (pkey === ProgressKeys.extract_size) {
    let secondary = sizeToString(p.current);
    if (p.total !== 0) {
      secondary += ` / ${sizeToString(p.total)}`;
    }
    return (
      <StepProgressBar
        indeterminate={p.total === 0}
        title={t("setting.extractedFilesSize")}
        secondary={secondary}
        progress={(100 * p.current) / Math.max(p.total, 1)}
      />
    );
  }

  if (pkey === ProgressKeys.extract_count) {
    let secondary = `${p.current}`;
    if (p.total !== 0) {
      secondary += ` / ${p.total}`;
    }
    return (
      <StepProgressBar
        indeterminate={p.total === 0}
        title={t("setting.extractedFiles")}
        secondary={secondary}
        progress={(100 * p.current) / Math.max(p.total, 1)}
      />
    );
  }

  if (pkey === ProgressKeys.upload_count) {
    let secondary = `${p.current}`;
    if (p.total !== 0) {
      secondary += ` / ${p.total}`;
    }
    return (
      <StepProgressBar
        indeterminate={p.total === 0}
        title={t("setting.transferredFiles")}
        secondary={secondary}
        progress={(100 * p.current) / Math.max(p.total, 1)}
      />
    );
  }

  if (pkey === ProgressKeys.download) {
    return (
      <StepProgressBar
        title={t("setting.downloaded")}
        secondary={`${sizeToString(p.current)} / ${sizeToString(p.total)}`}
        progress={(100 * p.current) / Math.max(p.total, 1)}
      />
    );
  }

  return (
    <StepProgressBar
      indeterminate={p.total === 0}
      title={pkey}
      secondary={p.total === 0 ? `${p.current}` : `${p.current} / ${p.total}`}
      progress={(100 * p.current) / Math.max(p.total, 1)}
    />
  );
};

const StepProgressPopover = ({ taskId, open, processing, ...rest }: StepProgressPopoverProps) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const stopPropagation = useCallback((e: any) => e.stopPropagation(), []);
  const [progress, setProgress] = useState<TaskProgresses | undefined>(undefined);

  useEffect(() => {
    let interval: number | undefined;
    const refresh = () => {
      dispatch(getTasksPhaseProgress(taskId)).then((res) => setProgress(res));
    };

    if (open) {
      refresh();
      if (processing) {
        interval = window.setInterval(refresh, 3000);
      }
    }

    return () => {
      if (interval !== undefined) {
        window.clearInterval(interval);
      }
    };
  }, [open, processing, taskId, dispatch]);

  return (
    <HoverPopover
      open={open}
      onMouseDown={stopPropagation}
      onMouseUp={stopPropagation}
      onClick={stopPropagation}
      {...rest}
      anchorOrigin={{
        vertical: "bottom",
        horizontal: "center",
      }}
      transformOrigin={{
        vertical: "top",
        horizontal: "center",
      }}
    >
      <Box sx={{ p: 1, minWidth: 200 }}>
        {!progress && <StepProgressBar loading />}
        {progress &&
          Object.keys(progress).map((key, index) => (
            <Fragment key={key}>
              <ProgressBar pkey={key} p={progress[key]} />
              {index < Object.keys(progress).length - 1 && <Divider sx={{ pt: 1, mb: 0.5 }} />}
            </Fragment>
          ))}
        {progress && Object.keys(progress).length === 0 && (
          <Typography variant={"caption"} color={"text.secondary"}>
            {t("setting.progressNotAvailable")}
          </Typography>
        )}
      </Box>
    </HoverPopover>
  );
};

export default StepProgressPopover;
