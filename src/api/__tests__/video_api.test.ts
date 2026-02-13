import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../i18n.ts", () => {
  return {
    default: {
      t: (key: string) => key,
      exists: () => false,
    },
  };
});

vi.mock("../request.ts", () => {
  return {
    send: vi.fn(),
    defaultOpts: {},
    isRequestAbortedError: () => false,
    CrHeaders: { context_hint: "X-Cr-Context-Hint" },
    Code: {},
    AppError: class AppError extends Error {},
    ThunkResponse: undefined,
  };
});

import { createSubtitleBurnTask, getVideoInfo } from "../api.ts";
import { send } from "../request.ts";

function createThunkHarness() {
  const getState = () => ({}) as any;
  const dispatch: any = vi.fn(async (action: any) => {
    if (typeof action === "function") {
      return await action(dispatch, getState, undefined);
    }
    return action;
  });
  return { dispatch, getState };
}

describe("video api thunks", () => {
  const sendMock = vi.mocked(send);

  beforeEach(() => {
    sendMock.mockReset();
  });

  it("getVideoInfo calls /video/info with POST + data", async () => {
    sendMock.mockImplementation((_url: string, _config?: any, _opts?: any) => async () => "ok");

    const req = {
      file_id: 123,
      include_subtitles: true,
      extra: { a: 1 },
    };

    const { dispatch, getState } = createThunkHarness();
    await getVideoInfo(req)(dispatch as any, getState as any, undefined);

    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock.mock.calls[0][0]).toBe("/video/info");
    const config = sendMock.mock.calls[0][1] as any;
    expect(config.method).toBe("POST");
    expect(config.data).toBe(req);
    expect(config.data).toMatchObject({ file_id: 123, include_subtitles: true, extra: { a: 1 } });
  });

  it("createSubtitleBurnTask calls /video/subtitle/burn with POST + data", async () => {
    sendMock.mockImplementation((_url: string, _config?: any, _opts?: any) => async () => "ok");

    const req = {
      file_id: 456,
      subtitle: {
        mode: "external",
        external_name: "foo.srt",
      },
    };

    const { dispatch, getState } = createThunkHarness();
    await createSubtitleBurnTask(req)(dispatch as any, getState as any, undefined);

    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock.mock.calls[0][0]).toBe("/video/subtitle/burn");
    const config = sendMock.mock.calls[0][1] as any;
    expect(config.method).toBe("POST");
    expect(config.data).toBe(req);
    expect(config.data).toMatchObject({
      file_id: 456,
      subtitle: { mode: "external", external_name: "foo.srt" },
    });
  });
});
