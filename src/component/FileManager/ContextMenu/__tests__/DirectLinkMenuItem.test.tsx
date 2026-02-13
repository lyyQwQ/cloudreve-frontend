import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import Boolset from "../../../../util/boolset.ts";
import { FileResponse, FileType, NavigatorCapability } from "../../../../api/explorer.ts";
import { ContextMenuTypes, closeContextMenu } from "../../../../redux/fileManagerSlice.ts";
import { setShareLinkDialog } from "../../../../redux/globalStateSlice.ts";
import SessionManager from "../../../../session";
import ContextMenu from "../ContextMenu.tsx";

vi.mock("react-i18next", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string) => key,
    }),
  };
});

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

function folderWithDownloadCapability(folder: Partial<FileResponse>): FileResponse {
  const cap = new Boolset().set(NavigatorCapability.download_file, true).toString();
  return {
    type: FileType.folder,
    id: folder.id ?? "folder-1",
    name: folder.name ?? "demo-folder",
    created_at: "",
    updated_at: "",
    size: 0,
    path: folder.path ?? "cloudreve://my/demo-folder",
    capability: cap,
    owned: true,
    ...folder,
  } as FileResponse;
}

describe("ContextMenu direct-link action for folder", () => {
  beforeEach(() => {
    vi.spyOn(SessionManager, "currentLoginOrNull").mockReturnValue(null);
    vi.spyOn(SessionManager, "currentUser").mockReturnValue({
      group: {
        direct_link_batch_size: 100,
      },
    } as any);
    vi.spyOn(SessionManager, "currentUserGroupPermission").mockReturnValue(new Boolset());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  it("routes folder direct-link action to share dialog flow", () => {
    const folder = folderWithDownloadCapability({});

    const state = {
      fileManager: [
        {
          contextMenuOpen: true,
          contextMenuType: ContextMenuTypes.file,
          contextMenuPos: { x: 0, y: 0 },
          selected: {
            [folder.id]: folder,
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

    fireEvent.click(screen.getByTestId("context-menu-create-direct-link"));

    expect(dispatch).toHaveBeenCalledWith(closeContextMenu({ index: 0, value: undefined }));
    expect(dispatch).toHaveBeenCalledWith(setShareLinkDialog({ open: true, file: folder }));
  });
});
