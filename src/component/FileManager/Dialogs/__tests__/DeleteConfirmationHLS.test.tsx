import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
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
    Trans: (props: any) => {
      return <span>{props.i18nKey}</span>;
    },
  };
});

vi.mock("../../../../session", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    default: Object.assign(actual.default, {
      currentUserGroupPermission: () => ({
        enabled: () => false,
      }),
      currentUserGroup: () => ({
        trash_retention: 0,
      }),
    }),
  };
});

import DeleteConfirmation from "../DeleteConfirmation.tsx";

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

describe("DeleteConfirmation HLS prompt", () => {
  it("shows prompt + checkbox when selected target has hls:available=1", () => {
    const target: any = {
      id: "v1",
      name: "demo.mp4",
      metadata: {
        "hls:available": "1",
      },
    };

    const state = {
      fileManager: [
        {
          deleteFileModalOpen: true,
          deleteFileModalSelected: [target],
          deleteFileModalPromiseId: "pid",
          deleteFileModalLoading: false,
        },
      ],
    };

    const { store } = createStoreHarness(state);
    render(
      <Provider store={store as any}>
        <DeleteConfirmation />
      </Provider>,
    );

    expect(screen.getByTestId("delete-hls-prompt")).toBeInTheDocument();
    expect(screen.getByTestId("delete-hls-checkbox")).toBeInTheDocument();
  });

  it("does not show prompt when no selected target has hls metadata", () => {
    const target: any = {
      id: "f1",
      name: "readme.txt",
      metadata: {},
    };

    const state = {
      fileManager: [
        {
          deleteFileModalOpen: true,
          deleteFileModalSelected: [target],
          deleteFileModalPromiseId: "pid",
          deleteFileModalLoading: false,
        },
      ],
    };

    const { store } = createStoreHarness(state);
    render(
      <Provider store={store as any}>
        <DeleteConfirmation />
      </Provider>,
    );

    expect(screen.queryByTestId("delete-hls-prompt")).toBeNull();
    expect(screen.queryByTestId("delete-hls-checkbox")).toBeNull();
  });
});
