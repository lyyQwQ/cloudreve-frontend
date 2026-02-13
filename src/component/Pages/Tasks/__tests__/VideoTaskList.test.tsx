import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { TaskStatus, TaskType } from "../../../../api/workflow.ts";
import TaskList from "../TaskList.tsx";
import TaskCard from "../TaskCard.tsx";
import TaskProgress from "../TaskProgress.tsx";
import TaskSummaryTitle from "../TaskSummaryTitle.tsx";

const renderWithRouter = (ui: JSX.Element) => render(<MemoryRouter>{ui}</MemoryRouter>);

vi.mock("react-i18next", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string) => key,
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
    expect(screen.getByText("Subtitle burn task")).toBeInTheDocument();

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
    expect(screen.getByText("HLS slice task")).toBeInTheDocument();

    const hlsProgress = renderWithRouter(
      <TaskProgress taskId="video-hls" taskStatus={TaskStatus.completed} taskType={TaskType.video_hls_slice} />,
    );
    expect(within(hlsProgress.container).getByText("setting.queueToStart")).toBeInTheDocument();
    expect(within(hlsProgress.container).getByText("setting.processing")).toBeInTheDocument();
    expect(within(hlsProgress.container).getByText("setting.finished")).toBeInTheDocument();
  });
});
