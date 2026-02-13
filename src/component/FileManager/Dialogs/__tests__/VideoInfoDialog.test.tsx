import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";

const { getVideoInfoMock } = vi.hoisted(() => {
  return {
    getVideoInfoMock: vi.fn(),
  };
});

vi.mock("../../../../api/api.ts", () => {
  return {
    getVideoInfo: getVideoInfoMock,
  };
});

import VideoInfoDialog from "../VideoInfoDialog.tsx";

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

describe("VideoInfoDialog", () => {
  beforeEach(() => {
    getVideoInfoMock.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("dispatches getVideoInfo with string file_id and renders fields", async () => {
    getVideoInfoMock.mockImplementation((req: any) => async () => {
      return {
        codec: "h264",
        audio_codec: "aac",
        resolution: "1920x1080",
        duration: 10,
        bitrate: 3000000,
        hls_compatible: true,
        subtitles: {
          external: [
            { name: "1.srt", path: "/subs/1.srt" },
            { name: "2.ass", path: "/subs/2.ass" },
          ],
          embedded: [
            { index: 0, language: "en", title: "main" },
            { index: 1, language: "zh", title: "" },
          ],
        },
        req,
      };
    });

    const file = { id: "video_hash_123", name: "demo.mp4" };
    const state = {
      globalState: {
        videoInfoDialogOpen: true,
        videoInfoDialogFile: file,
      },
    };

    const { store } = createStoreHarness(state);

    render(
      <Provider store={store as any}>
        <VideoInfoDialog />
      </Provider>,
    );

    expect(screen.getByTestId("video-info-dialog")).toBeInTheDocument();
    expect(screen.getByTestId("video-info-file-id")).toHaveTextContent("file_id: video_hash_123");

    await waitFor(() => {
      expect(getVideoInfoMock).toHaveBeenCalledTimes(1);
    });
    expect(getVideoInfoMock).toHaveBeenCalledWith({ file_id: "video_hash_123" });

    await waitFor(() => {
      expect(screen.getByTestId("video-info-video-codec")).toHaveTextContent("h264");
      expect(screen.getByTestId("video-info-audio-codec")).toHaveTextContent("aac");
      expect(screen.getByTestId("video-info-resolution")).toHaveTextContent("1920x1080");
      expect(screen.getByTestId("video-info-duration")).toHaveTextContent("10");
      expect(screen.getByTestId("video-info-bitrate")).toHaveTextContent("3000000");
      expect(screen.getByTestId("video-info-hls-compatible")).toHaveTextContent("true");
      expect(screen.getByTestId("video-info-subtitles-external")).toHaveTextContent("1.srt, 2.ass");
      expect(screen.getByTestId("video-info-subtitles-embedded")).toHaveTextContent("0:en|main, 1:zh");
    });
  });

  it("does not request when file_id is invalid and does not render NaN", async () => {
    const state = {
      globalState: {
        videoInfoDialogOpen: true,
        videoInfoDialogFile: { id: "   ", name: "demo.mp4" },
      },
    };

    const { store } = createStoreHarness(state);

    render(
      <Provider store={store as any}>
        <VideoInfoDialog />
      </Provider>,
    );

    expect(screen.getByTestId("video-info-file-id")).toHaveTextContent("file_id:");
    expect(screen.getByTestId("video-info-file-id")).not.toHaveTextContent("NaN");
    expect(screen.getByText("Invalid file_id.")).toBeInTheDocument();

    await waitFor(() => {
      expect(getVideoInfoMock).not.toHaveBeenCalled();
    });
  });
});
