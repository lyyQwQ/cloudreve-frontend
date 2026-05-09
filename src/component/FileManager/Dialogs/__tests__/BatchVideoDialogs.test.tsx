import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";

const {
  batchSubtitlePreflightMock,
  createBatchSubtitleBurnTasksMock,
  batchHLSPreflightMock,
  createBatchHLSTasksMock,
  enqueueSnackbarMock,
  viewTaskActionMock,
} = vi.hoisted(() => {
  return {
    batchSubtitlePreflightMock: vi.fn(),
    createBatchSubtitleBurnTasksMock: vi.fn(),
    batchHLSPreflightMock: vi.fn(),
    createBatchHLSTasksMock: vi.fn(),
    enqueueSnackbarMock: vi.fn(),
    viewTaskActionMock: vi.fn(),
  };
});

vi.mock("../../../../api/api.ts", () => {
  return {
    batchSubtitlePreflight: batchSubtitlePreflightMock,
    createBatchSubtitleBurnTasks: createBatchSubtitleBurnTasksMock,
    batchHLSPreflight: batchHLSPreflightMock,
    createBatchHLSTasks: createBatchHLSTasksMock,
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

import BatchHLSDialog from "../BatchHLSDialog.tsx";
import BatchSubtitleBurnDialog from "../BatchSubtitleBurnDialog.tsx";
import { closeBatchHLSDialog, closeBatchSubtitleBurnDialog } from "../../../../redux/globalStateSlice.ts";

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

describe("Batch video dialogs", () => {
  beforeEach(() => {
    batchSubtitlePreflightMock.mockReset();
    createBatchSubtitleBurnTasksMock.mockReset();
    batchHLSPreflightMock.mockReset();
    createBatchHLSTasksMock.mockReset();
    enqueueSnackbarMock.mockReset();
    viewTaskActionMock.mockReset();
    viewTaskActionMock.mockReturnValue("view-task-action");
  });

  afterEach(() => {
    cleanup();
  });

  it("loads shared subtitle candidates and submits selected candidate", async () => {
    batchSubtitlePreflightMock.mockImplementation((_req: any) => async () => ({
      candidates: [{ key: "embedded:simplified_chinese", label: "Simplified Chinese", type: "embedded", count: 2 }],
      rows: [
        { file_id: "v1", file_name: "S01E01.mp4", status: "ready" },
        { file_id: "v2", file_name: "S01E02.mp4", status: "ready" },
      ],
      summary: { ready: 2 },
    }));
    createBatchSubtitleBurnTasksMock.mockImplementation((_req: any) => async () => ({
      rows: [],
      summary: { created: 2 },
    }));

    const state = {
      globalState: {
        batchSubtitleBurnDialogOpen: true,
        batchSubtitleBurnDialogFiles: [
          { id: "v1", name: "S01E01.mp4" },
          { id: "v2", name: "S01E02.mp4" },
        ],
      },
    };

    const { store, dispatch } = createStoreHarness(state);
    render(
      <Provider store={store as any}>
        <BatchSubtitleBurnDialog />
      </Provider>,
    );

    await waitFor(() => {
      expect(batchSubtitlePreflightMock).toHaveBeenCalledWith({ file_ids: ["v1", "v2"] });
    });
    expect(screen.getByLabelText("Simplified Chinese (embedded)")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("batch-subtitle-burn-confirm-button"));

    await waitFor(() => {
      expect(createBatchSubtitleBurnTasksMock).toHaveBeenCalledWith({
        file_ids: ["v1", "v2"],
        candidate_key: "embedded:simplified_chinese",
      });
    });
    expect(viewTaskActionMock).toHaveBeenCalledWith("/tasks");
    expect(enqueueSnackbarMock).toHaveBeenCalledWith(expect.objectContaining({ variant: "success" }));
    expect(dispatch).toHaveBeenCalledWith(closeBatchSubtitleBurnDialog());
  });

  it("loads HLS preflight and creates batch HLS tasks", async () => {
    batchHLSPreflightMock.mockImplementation((_req: any) => async () => ({
      rows: [
        { file_id: "v1", file_name: "S01E01.mp4", status: "ready", codec: "h264" },
        { file_id: "v2", file_name: "S01E02.mp4", status: "ready", codec: "h264" },
      ],
      summary: { ready: 2 },
    }));
    createBatchHLSTasksMock.mockImplementation((_req: any) => async () => ({ rows: [], summary: { created: 2 } }));

    const state = {
      globalState: {
        batchHLSDialogOpen: true,
        batchHLSDialogFiles: [
          { id: "v1", name: "S01E01.mp4" },
          { id: "v2", name: "S01E02.mp4" },
        ],
      },
    };

    const { store, dispatch } = createStoreHarness(state);
    render(
      <Provider store={store as any}>
        <BatchHLSDialog />
      </Provider>,
    );

    await waitFor(() => {
      expect(batchHLSPreflightMock).toHaveBeenCalledWith({ file_ids: ["v1", "v2"] });
    });
    expect(screen.getByTestId("batch-hls-summary")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("batch-hls-confirm-button"));

    await waitFor(() => {
      expect(createBatchHLSTasksMock).toHaveBeenCalledWith({ file_ids: ["v1", "v2"] });
    });
    expect(viewTaskActionMock).toHaveBeenCalledWith("/tasks");
    expect(enqueueSnackbarMock).toHaveBeenCalledWith(expect.objectContaining({ variant: "success" }));
    expect(dispatch).toHaveBeenCalledWith(closeBatchHLSDialog());
  });
});
