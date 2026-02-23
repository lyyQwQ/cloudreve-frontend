import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";

const {
  getHLSStatusMock,
  deleteHLSArtifactMock,
  createHLSTaskMock,
  getTasksMock,
  getTasksPhaseProgressMock,
  getVideoInfoMock,
  confirmOperationMock,
  enqueueSnackbarMock,
} = vi.hoisted(() => {
  return {
    getHLSStatusMock: vi.fn(),
    deleteHLSArtifactMock: vi.fn(),
    createHLSTaskMock: vi.fn(),
    getTasksMock: vi.fn(),
    getTasksPhaseProgressMock: vi.fn(),
    getVideoInfoMock: vi.fn(),
    confirmOperationMock: vi.fn(),
    enqueueSnackbarMock: vi.fn(),
  };
});

vi.mock("../../../../api/api.ts", () => {
  return {
    getHLSStatus: getHLSStatusMock,
    deleteHLSArtifact: deleteHLSArtifactMock,
    createHLSTask: createHLSTaskMock,
    getTasks: getTasksMock,
    getTasksPhaseProgress: getTasksPhaseProgressMock,
    getVideoInfo: getVideoInfoMock,
  };
});

vi.mock("../../../../redux/thunks/dialog.ts", () => {
  return {
    confirmOperation: confirmOperationMock,
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

import { AppError, Code } from "../../../../api/request.ts";
import { TaskStatus, TaskType } from "../../../../api/workflow.ts";
import { closeHLSManageDialog } from "../../../../redux/globalStateSlice.ts";
import HLSManageDialog from "../HLSManageDialog.tsx";

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
      hlsManageDialogOpen: true,
      hlsManageDialogFile: { id: "video_hash_123", name: "demo.mp4" },
    },
  };
}

function renderDialog(state = defaultState()) {
  const { store, dispatch } = createStoreHarness(state);

  render(
    <Provider store={store as any}>
      <MemoryRouter>
        <HLSManageDialog />
      </MemoryRouter>
    </Provider>,
  );

  return { dispatch };
}

describe("HLSManageDialog", () => {
  beforeEach(() => {
    getHLSStatusMock.mockReset();
    deleteHLSArtifactMock.mockReset();
    createHLSTaskMock.mockReset();
    getTasksMock.mockReset();
    getTasksPhaseProgressMock.mockReset();
    getVideoInfoMock.mockReset();
    confirmOperationMock.mockReset();
    enqueueSnackbarMock.mockReset();

    confirmOperationMock.mockImplementation(() => async () => undefined);
  });

  afterEach(() => {
    cleanup();
  });

  it("covers has_hls state and delete path", async () => {
    getHLSStatusMock.mockImplementation((_req: any) => async () => ({
      state: "ready",
      artifact: {
        segment_count: 2,
        total_size: 128,
        codec: "h264",
        storage_path: "/hls/demo",
      },
    }));
    getVideoInfoMock.mockImplementation((_req: any) => async () => ({
      codec: "h264",
      audio_codec: "aac",
      resolution: "1920x1080",
      duration: 12,
      bitrate: 100,
      hls_compatible: true,
      subtitles: { external: [], embedded: [] },
    }));
    deleteHLSArtifactMock.mockImplementation((_req: any) => async () => ({}));

    const { dispatch } = renderDialog();

    await waitFor(() => {
      expect(screen.getByTestId("hls-manage-status")).toHaveTextContent("HLS artifact is available.");
    });

    fireEvent.click(screen.getByTestId("hls-manage-delete-button"));

    await waitFor(() => {
      expect(deleteHLSArtifactMock).toHaveBeenCalledWith({ file_id: "video_hash_123" });
    });
    expect(confirmOperationMock).toHaveBeenCalledWith("Are you sure you want to delete this HLS artifact?");
    expect(enqueueSnackbarMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "HLS artifact deleted.",
        variant: "success",
      }),
    );
    expect(dispatch).toHaveBeenCalledWith(closeHLSManageDialog());
  });

  it("covers no_hls state and create path", async () => {
    getHLSStatusMock.mockImplementation((_req: any) => async () => {
      throw new AppError({
        data: null,
        code: Code.NodeFound,
        msg: "not found",
      } as any);
    });
    getVideoInfoMock.mockImplementation((_req: any) => async () => ({
      codec: "h264",
      audio_codec: "aac",
      resolution: "1920x1080",
      duration: 12,
      bitrate: 100,
      hls_compatible: true,
      subtitles: { external: [], embedded: [] },
    }));
    getTasksMock.mockImplementation((_req: any) => async () => ({
      tasks: [],
      pagination: {},
    }));
    createHLSTaskMock.mockImplementation((_fileId: any) => async () => ({ task_id: "task-1" }));

    const { dispatch } = renderDialog();

    await waitFor(() => {
      expect(screen.getByTestId("hls-manage-status")).toHaveTextContent("No HLS artifact found.");
    });

    const createButton = screen.getByTestId("hls-manage-create-button");
    await waitFor(() => {
      expect(createButton).toBeEnabled();
    });

    fireEvent.click(createButton);

    await waitFor(() => {
      expect(createHLSTaskMock).toHaveBeenCalledWith("video_hash_123");
    });
    expect(enqueueSnackbarMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Task created.",
        variant: "success",
        action: expect.anything(),
      }),
    );
    expect(dispatch).toHaveBeenCalledWith(closeHLSManageDialog());
  });

  it("covers processing state by workflow fallback", async () => {
    getHLSStatusMock.mockImplementation((_req: any) => async () => {
      throw new AppError({
        data: null,
        code: Code.NodeFound,
        msg: "not found",
      } as any);
    });
    getVideoInfoMock.mockImplementation((_req: any) => async () => ({
      codec: "h264",
      audio_codec: "aac",
      resolution: "1920x1080",
      duration: 12,
      bitrate: 100,
      hls_compatible: true,
      subtitles: { external: [], embedded: [] },
    }));
    getTasksMock.mockImplementation((_req: any) => async () => ({
      tasks: [
        {
          id: "task-1",
          type: TaskType.video_hls_slice,
          status: TaskStatus.processing,
        },
      ],
      pagination: {},
    }));
    getTasksPhaseProgressMock.mockImplementation((_taskId: any) => async () => ({
      [TaskType.video_hls_slice]: {
        identifier: "video_hash_123",
      },
    }));

    const { dispatch } = renderDialog();

    await waitFor(() => {
      expect(screen.getByTestId("hls-manage-status")).toHaveTextContent("HLS transcoding is in progress.");
    });
    expect(screen.getByTestId("hls-manage-processing-alert")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("hls-manage-view-task-button"));
    expect(dispatch).toHaveBeenCalledWith(closeHLSManageDialog());
  });
});
