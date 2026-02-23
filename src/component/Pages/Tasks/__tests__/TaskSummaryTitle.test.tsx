import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TaskType } from "../../../../api/workflow.ts";
import TaskSummaryTitle from "../TaskSummaryTitle.tsx";

vi.mock("react-i18next", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string) => key,
    }),
  };
});

vi.mock("../../../../redux/hooks.ts", () => ({
  useAppDispatch: () => vi.fn(),
  useAppSelector: () => undefined,
}));

describe("TaskSummaryTitle video tasks", () => {
  it("renders subtitle burn title", () => {
    render(<TaskSummaryTitle type={TaskType.video_subtitle_burn} />);
    expect(screen.getByText("dashboard:task.subtitleBurn")).toBeInTheDocument();
  });

  it("renders hls slice title", () => {
    render(<TaskSummaryTitle type={TaskType.video_hls_slice} />);
    expect(screen.getByText("dashboard:task.hlsSlice")).toBeInTheDocument();
  });
});
