import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { TaskStatus, TaskType } from "../../../../api/workflow.ts";
import TaskList from "../TaskList.tsx";
import TaskCard from "../TaskCard.tsx";
import TaskProgress from "../TaskProgress.tsx";
import TaskSummaryTitle from "../TaskSummaryTitle.tsx";
import WorkerProgress from "../WorkerProgress.tsx";

const renderWithRouter = (ui: JSX.Element) => render(<MemoryRouter>{ui}</MemoryRouter>);

vi.mock("react-i18next", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string, options?: { duration?: string }) =>
        key === "setting.workerEstimatedRemaining" ? `${key} ${options?.duration}` : key,
    }),
  };
});

vi.mock("react-intersection-observer", () => ({
  useInView: () => ({
    ref: vi.fn(),
    inView: false,
  }),
}));

vi.mock("../../../../redux/hooks.ts", () => ({
  useAppDispatch: () => vi.fn(),
  useAppSelector: () => undefined,
}));

describe("Video task list", () => {
  it("adds stable task list and task card testids", () => {
    const { unmount } = renderWithRouter(<TaskList />);
    expect(screen.getByTestId("tasks-page-root")).toBeInTheDocument();
    unmount();

    renderWithRouter(
      <TaskCard
        task={{
          id: "42",
          type: TaskType.video_subtitle_burn,
          status: TaskStatus.completed,
          created_at: "",
          updated_at: "",
        }}
      />,
    );
    expect(screen.getByTestId("task-card-42")).toBeInTheDocument();

    renderWithRouter(<TaskCard loading={true} />);
    expect(screen.getByTestId("task-card-loading")).toBeInTheDocument();
  });

  it("renders subtitle burn title and progress steps", () => {
    renderWithRouter(<TaskSummaryTitle type={TaskType.video_subtitle_burn} />);
    expect(screen.getByText("dashboard:task.subtitleBurn")).toBeInTheDocument();

    const subtitleProgress = renderWithRouter(
      <TaskProgress
        taskId="video-subtitle"
        taskStatus={TaskStatus.completed}
        taskType={TaskType.video_subtitle_burn}
      />,
    );
    expect(within(subtitleProgress.container).getByText("setting.queueToStart")).toBeInTheDocument();
    expect(within(subtitleProgress.container).getByText("setting.processing")).toBeInTheDocument();
    expect(within(subtitleProgress.container).getByText("setting.finished")).toBeInTheDocument();
  });

  it("renders hls slice title and progress steps", () => {
    renderWithRouter(<TaskSummaryTitle type={TaskType.video_hls_slice} />);
    expect(screen.getByText("dashboard:task.hlsSlice")).toBeInTheDocument();

    const hlsProgress = renderWithRouter(
      <TaskProgress taskId="video-hls" taskStatus={TaskStatus.completed} taskType={TaskType.video_hls_slice} />,
    );
    expect(within(hlsProgress.container).getByText("setting.queueToStart")).toBeInTheDocument();
    expect(within(hlsProgress.container).getByText("setting.processing")).toBeInTheDocument();
    expect(within(hlsProgress.container).getByText("setting.finished")).toBeInTheDocument();
  });

  it("renders remote worker transfer and transcode progress", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-28T12:10:00Z"));

    renderWithRouter(
      <WorkerProgress
        status={TaskStatus.processing}
        summary={{
          props: {
            worker_transfer_phase: "source_download",
            worker_transfer_progress: 72,
            worker_transcode_progress: 35,
            worker_output_size: 2048,
            worker_started_at: Date.parse("2026-04-28T12:00:00Z") / 1000,
          },
        }}
      />,
    );

    expect(screen.getByText("setting.workerTransferSourceDownload")).toBeInTheDocument();
    expect(screen.getByText("setting.workerTranscode")).toBeInTheDocument();
    expect(screen.getByText("72%")).toBeInTheDocument();
    expect(screen.getByText("35% · 2.0 KB")).toBeInTheDocument();
    expect(screen.getByText(/^setting.workerEstimatedRemaining/)).toHaveTextContent("setting.workerEstimatedRemaining");

    vi.useRealTimers();
  });

  it("hides remote worker ETA when progress is too low", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-28T12:10:00Z"));

    renderWithRouter(
      <WorkerProgress
        status={TaskStatus.processing}
        summary={{
          props: {
            worker_transfer_phase: "source_download",
            worker_transfer_progress: 2,
            worker_transcode_progress: 2,
            worker_started_at: Date.parse("2026-04-28T12:00:00Z") / 1000,
          },
        }}
      />,
    );

    expect(screen.queryByText(/^setting.workerEstimatedRemaining/)).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  it("hides remote worker ETA for transfer-only, invalid, and terminal states", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-28T12:10:00Z"));

    const baseSummary = {
      props: {
        worker_transfer_phase: "source_download",
        worker_transfer_progress: 72,
        worker_started_at: Date.parse("2026-04-28T12:00:00Z") / 1000,
      },
    };

    const cases = [
      baseSummary,
      { props: { ...baseSummary.props, worker_transcode_progress: Number.NaN } },
      { props: { ...baseSummary.props, worker_transcode_progress: 35 } },
      { props: { ...baseSummary.props, worker_transcode_progress: 35 } },
      { props: { ...baseSummary.props, worker_transcode_progress: 35 } },
    ];
    const statuses = [
      TaskStatus.processing,
      TaskStatus.processing,
      TaskStatus.completed,
      TaskStatus.error,
      TaskStatus.canceled,
    ];

    for (const [index, summary] of cases.entries()) {
      const { unmount } = renderWithRouter(<WorkerProgress status={statuses[index]} summary={summary} />);
      expect(screen.queryByText(/^setting.workerEstimatedRemaining/)).not.toBeInTheDocument();
      unmount();
    }

    vi.useRealTimers();
  });
});
