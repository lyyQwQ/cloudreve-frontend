import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";

const { getVideoInfoMock, createSubtitleBurnTaskMock, enqueueSnackbarMock, viewTaskActionMock } = vi.hoisted(() => {
  return {
    getVideoInfoMock: vi.fn(),
    createSubtitleBurnTaskMock: vi.fn(),
    enqueueSnackbarMock: vi.fn(),
    viewTaskActionMock: vi.fn(),
  };
});

vi.mock("../../../../api/api.ts", () => {
  return {
    getVideoInfo: getVideoInfoMock,
    createSubtitleBurnTask: createSubtitleBurnTaskMock,
  };
});

vi.mock("notistack", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    useSnackbar: () => ({
      enqueueSnackbar: enqueueSnackbarMock,
    }),
  };
});

vi.mock("../../../Common/Snackbar/snackbar.tsx", () => {
  return {
    ViewTaskAction: viewTaskActionMock,
  };
});

import SubtitleSelectDialog from "../SubtitleSelectDialog.tsx";
import { closeSubtitleSelectDialog } from "../../../../redux/globalStateSlice.ts";

function createStoreHarness(state: any) {
  const getState = () => state;
  const listeners = new Set<() => void>();

  const dispatch: any = vi.fn(async (action: any) => {
    if (typeof action === "function") {
      return await action(dispatch, getState, undefined);
    }
    return action;
  });

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  return {
    store: {
      getState,
      dispatch,
      subscribe,
    },
    dispatch,
  };
}

function defaultState() {
  return {
    globalState: {
      subtitleSelectDialogOpen: true,
      subtitleSelectDialogFile: { id: "video_hash_123", name: "demo.mp4" },
    },
  };
}

describe("SubtitleSelectDialog", () => {
  beforeEach(() => {
    getVideoInfoMock.mockReset();
    createSubtitleBurnTaskMock.mockReset();
    enqueueSnackbarMock.mockReset();
    viewTaskActionMock.mockReset();
    viewTaskActionMock.mockReturnValue("view-task-action");
  });

  afterEach(() => {
    cleanup();
  });

  it("loads subtitles and submits external payload", async () => {
    getVideoInfoMock.mockImplementation((_req: any) => async () => {
      return {
        codec: "h264",
        audio_codec: "aac",
        resolution: "1920x1080",
        duration: 12,
        bitrate: 100,
        hls_compatible: true,
        subtitles: {
          external: [{ name: "a.srt", path: "/subs/a.srt" }],
          embedded: [{ index: 0, language: "en", title: "main" }],
        },
      };
    });
    createSubtitleBurnTaskMock.mockImplementation((_req: any) => async () => ({ task_id: "task-sub-1" }));

    const { store, dispatch } = createStoreHarness(defaultState());
    render(
      <Provider store={store as any}>
        <SubtitleSelectDialog />
      </Provider>,
    );

    expect(screen.getByTestId("subtitle-select-dialog-root")).toBeInTheDocument();

    await waitFor(() => {
      expect(getVideoInfoMock).toHaveBeenCalledWith({ file_id: "video_hash_123" });
    });

    expect(screen.getByLabelText("external: a.srt")).toBeInTheDocument();
    expect(screen.getByLabelText("embedded #0: en | main")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("external: a.srt"));
    fireEvent.click(screen.getByTestId("subtitle-select-confirm-button"));

    await waitFor(() => {
      expect(createSubtitleBurnTaskMock).toHaveBeenCalledWith({
        file_id: "video_hash_123",
        subtitle: {
          mode: "external",
          external_name: "a.srt",
        },
      });
    });
    expect(viewTaskActionMock).toHaveBeenCalledWith("/tasks?task_id=task-sub-1");
    expect(enqueueSnackbarMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "modals.taskCreated",
        variant: "success",
        action: "view-task-action",
      }),
    );
    expect(dispatch).toHaveBeenCalledWith(closeSubtitleSelectDialog());
  });

  it("submits embedded payload", async () => {
    getVideoInfoMock.mockImplementation((_req: any) => async () => {
      return {
        codec: "h264",
        audio_codec: "aac",
        resolution: "1920x1080",
        duration: 12,
        bitrate: 100,
        hls_compatible: true,
        subtitles: {
          external: [],
          embedded: [{ index: 3, language: "zh", title: "" }],
        },
      };
    });
    createSubtitleBurnTaskMock.mockImplementation((req: any) => async () => req);

    const { store } = createStoreHarness(defaultState());
    render(
      <Provider store={store as any}>
        <SubtitleSelectDialog />
      </Provider>,
    );

    await waitFor(() => {
      expect(getVideoInfoMock).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByLabelText("embedded #3: zh"));
    fireEvent.click(screen.getByTestId("subtitle-select-confirm-button"));

    await waitFor(() => {
      expect(createSubtitleBurnTaskMock).toHaveBeenCalledWith({
        file_id: "video_hash_123",
        subtitle: {
          mode: "embedded",
          embedded_index: 3,
        },
      });
    });
  });

  it("does not request when file_id is invalid and shows invalid state", async () => {
    const state = {
      globalState: {
        subtitleSelectDialogOpen: true,
        subtitleSelectDialogFile: { id: "", name: "demo.mp4" },
      },
    };

    const { store } = createStoreHarness(state);
    render(
      <Provider store={store as any}>
        <SubtitleSelectDialog />
      </Provider>,
    );

    expect(screen.getByText("Invalid file_id.")).toBeInTheDocument();
    expect(screen.queryByText("No subtitle available.")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(getVideoInfoMock).not.toHaveBeenCalled();
    });
  });
});
