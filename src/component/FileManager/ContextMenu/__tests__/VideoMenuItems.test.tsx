import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";

afterEach(() => {
  cleanup();
});

vi.mock("react-i18next", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string) => key,
    }),
  };
});

vi.mock("../../../../redux/siteConfigSlice.ts", async (importOriginal) => {
  const original: any = await importOriginal();
  const videoViewer = {
    id: "video",
    type: "builtin",
    display_name: "video",
    exts: ["mp4"],
    icon: "",
  };
  return {
    ...original,
    Viewers: {
      mp4: [videoViewer],
    },
    ViewersByID: {
      video: videoViewer,
    },
  };
});

import Boolset from "../../../../util/boolset.ts";
import { FileResponse, FileType, NavigatorCapability } from "../../../../api/explorer.ts";
import { closeContextMenu, ContextMenuTypes } from "../../../../redux/fileManagerSlice.ts";
import { setSubtitleSelectDialog, setVideoInfoDialog } from "../../../../redux/globalStateSlice.ts";
import ContextMenu from "../ContextMenu.tsx";

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

function fileWithDownloadCapability(file: Partial<FileResponse>): FileResponse {
  const cap = new Boolset().set(NavigatorCapability.download_file, true).toString();
  return {
    type: FileType.file,
    id: file.id ?? "1",
    name: file.name ?? "demo.mp4",
    created_at: "",
    updated_at: "",
    size: 1,
    path: file.path ?? "cloudreve://my/demo.mp4",
    capability: cap,
    ...file,
  } as FileResponse;
}

describe("ContextMenu video actions", () => {
  it("shows Video Info only for single selected video file", () => {
    const videoFile = fileWithDownloadCapability({ id: "v1", name: "demo.mp4" });

    const state = {
      fileManager: [
        {
          contextMenuOpen: true,
          contextMenuType: ContextMenuTypes.file,
          contextMenuPos: { x: 0, y: 0 },
          selected: {
            [videoFile.id]: videoFile,
          },
        },
      ],
      globalState: {},
    };

    const { store } = createStoreHarness(state);
    render(
      <Provider store={store as any}>
        <ContextMenu fmIndex={0} />
      </Provider>,
    );

    expect(screen.getByTestId("context-menu-video-info")).toBeInTheDocument();
    expect(screen.getByTestId("subtitle-burn-menu-item")).toBeInTheDocument();
  });

  it("hides Video Info for non-video file", () => {
    const nonVideoFile = fileWithDownloadCapability({ id: "n1", name: "readme.txt" });

    const state = {
      fileManager: [
        {
          contextMenuOpen: true,
          contextMenuType: ContextMenuTypes.file,
          contextMenuPos: { x: 0, y: 0 },
          selected: {
            [nonVideoFile.id]: nonVideoFile,
          },
        },
      ],
      globalState: {},
    };

    const { store } = createStoreHarness(state);
    render(
      <Provider store={store as any}>
        <ContextMenu fmIndex={0} />
      </Provider>,
    );

    expect(screen.queryByTestId("context-menu-video-info")).toBeNull();
    expect(screen.queryByTestId("subtitle-burn-menu-item")).toBeNull();
  });

  it("hides Video Info for multi-select", () => {
    const videoFile = fileWithDownloadCapability({ id: "v1", name: "demo.mp4" });
    const another = fileWithDownloadCapability({ id: "v2", name: "demo2.mp4" });

    const state = {
      fileManager: [
        {
          contextMenuOpen: true,
          contextMenuType: ContextMenuTypes.file,
          contextMenuPos: { x: 0, y: 0 },
          selected: {
            [videoFile.id]: videoFile,
            [another.id]: another,
          },
        },
      ],
      globalState: {},
    };

    const { store } = createStoreHarness(state);
    render(
      <Provider store={store as any}>
        <ContextMenu fmIndex={0} />
      </Provider>,
    );

    expect(screen.queryByTestId("context-menu-video-info")).toBeNull();
    expect(screen.queryByTestId("subtitle-burn-menu-item")).toBeNull();
  });

  it("click dispatches close + setVideoInfoDialog", () => {
    const videoFile = fileWithDownloadCapability({ id: "v1", name: "demo.mp4" });

    const state = {
      fileManager: [
        {
          contextMenuOpen: true,
          contextMenuType: ContextMenuTypes.file,
          contextMenuPos: { x: 0, y: 0 },
          selected: {
            [videoFile.id]: videoFile,
          },
        },
      ],
      globalState: {},
    };

    const { store, dispatch } = createStoreHarness(state);
    render(
      <Provider store={store as any}>
        <ContextMenu fmIndex={0} />
      </Provider>,
    );

    fireEvent.click(screen.getByTestId("context-menu-video-info"));

    expect(dispatch).toHaveBeenCalledWith(closeContextMenu({ index: 0, value: undefined }));
    expect(dispatch).toHaveBeenCalledWith(setVideoInfoDialog({ open: true, file: videoFile }));
  });

  it("click dispatches close + setSubtitleSelectDialog", () => {
    const videoFile = fileWithDownloadCapability({ id: "v1", name: "demo.mp4" });

    const state = {
      fileManager: [
        {
          contextMenuOpen: true,
          contextMenuType: ContextMenuTypes.file,
          contextMenuPos: { x: 0, y: 0 },
          selected: {
            [videoFile.id]: videoFile,
          },
        },
      ],
      globalState: {},
    };

    const { store, dispatch } = createStoreHarness(state);
    render(
      <Provider store={store as any}>
        <ContextMenu fmIndex={0} />
      </Provider>,
    );

    fireEvent.click(screen.getByTestId("subtitle-burn-menu-item"));

    expect(dispatch).toHaveBeenCalledWith(closeContextMenu({ index: 0, value: undefined }));
    expect(dispatch).toHaveBeenCalledWith(setSubtitleSelectDialog({ open: true, file: videoFile }));
  });
});
