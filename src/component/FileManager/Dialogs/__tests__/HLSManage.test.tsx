import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";

const { getHLSStatusMock, deleteHLSArtifactMock } = vi.hoisted(() => {
  return {
    getHLSStatusMock: vi.fn(),
    deleteHLSArtifactMock: vi.fn(),
  };
});

vi.mock("../../../../api/api.ts", () => {
  return {
    getHLSStatus: getHLSStatusMock,
    deleteHLSArtifact: deleteHLSArtifactMock,
  };
});

import { AppError, Code } from "../../../../api/request.ts";
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

describe("HLSManageDialog", () => {
  beforeEach(() => {
    getHLSStatusMock.mockReset();
    deleteHLSArtifactMock.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("dispatches getHLSStatus and supports manual delete", async () => {
    getHLSStatusMock.mockImplementation((req: any) => async () => {
      return {
        state: "ready",
        req,
      };
    });
    deleteHLSArtifactMock.mockImplementation((req: any) => async () => req);

    const { store } = createStoreHarness(defaultState());

    render(
      <Provider store={store as any}>
        <HLSManageDialog />
      </Provider>,
    );

    expect(screen.getByTestId("hls-manage-dialog")).toBeInTheDocument();
    expect(screen.getByTestId("hls-manage-delete-button")).toBeInTheDocument();

    await waitFor(() => {
      expect(getHLSStatusMock).toHaveBeenCalledTimes(1);
    });
    expect(getHLSStatusMock).toHaveBeenCalledWith({ file_id: "video_hash_123" });

    await waitFor(() => {
      expect(screen.getByTestId("hls-manage-status")).toHaveTextContent("ready");
    });

    fireEvent.click(screen.getByTestId("hls-manage-delete-button"));

    await waitFor(() => {
      expect(deleteHLSArtifactMock).toHaveBeenCalledTimes(1);
    });
    expect(deleteHLSArtifactMock).toHaveBeenCalledWith({ file_id: "video_hash_123" });

    await waitFor(() => {
      expect(getHLSStatusMock).toHaveBeenCalledTimes(2);
    });
  });

  it("shows No HLS on not found", async () => {
    getHLSStatusMock.mockImplementation((_req: any) => async () => {
      throw new AppError({
        data: null,
        code: Code.NodeFound,
        msg: "not found",
      } as any);
    });

    const { store } = createStoreHarness(defaultState());

    render(
      <Provider store={store as any}>
        <HLSManageDialog />
      </Provider>,
    );

    await waitFor(() => {
      expect(getHLSStatusMock).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.getByTestId("hls-manage-status")).toHaveTextContent("No HLS");
    });
    expect(screen.getByTestId("hls-manage-delete-button")).toBeDisabled();
  });
});
