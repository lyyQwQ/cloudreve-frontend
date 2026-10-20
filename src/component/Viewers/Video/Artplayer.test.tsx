import React from "react";
import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import Player from "./Artplayer";

interface PlayerOptions {
  id: string;
  type: string;
  customType: { m3u8: (video: HTMLVideoElement, url: string, player: TestPlayer) => void };
}
interface TestPlayer {
  option: PlayerOptions;
  currentTime: number;
  destroy: Mock;
}
type ErrorHandler = (event: string, data: { fatal: boolean; type: string }) => void;
interface TestHls {
  on: Mock<(event: string, handler: ErrorHandler) => void>;
}
const state = vi.hoisted(() => ({ players: [] as TestPlayer[], hls: [] as TestHls[] }));
vi.mock("../../../util", () => ({ fileExtension: (name: string) => name.split(".").pop() }));
vi.mock("./VideoViewer", () => ({ CrMaskedPrefix: "cr://" }));
vi.mock("artplayer-plugin-chapter", () => ({ default: () => () => {} }));
vi.mock("artplayer-plugin-hls-control", () => ({ default: () => () => {} }));
vi.mock("mpegts.js", () => ({ default: { isSupported: () => false } }));
vi.mock("hls.js", () => {
  class Hls {
    static isSupported = () => true;
    static DefaultConfig = { loader: class {} };
    static Events = { ERROR: "error" };
    on = vi.fn<(event: string, handler: ErrorHandler) => void>();
    loadSource = vi.fn();
    attachMedia = vi.fn();
    destroy = vi.fn();
    constructor() {
      state.hls.push(this);
    }
  }
  return { default: Hls };
});
vi.mock("artplayer", () => ({
  default: class {
    currentTime = 0;
    notice = { show: "" };
    on = vi.fn();
    destroy = vi.fn();
    constructor(public option: PlayerOptions) {
      state.players.push(this);
    }
  },
}));

const option = (id = "movie", type?: string) => ({ id, title: `${id}.mp4`, type, plugins: [] });
beforeEach(() => {
  state.players.length = 0;
  state.hls.length = 0;
});

describe("播放器生命周期", () => {
  it("父组件重新创建配置和回调时保留播放进度，不重新通知实例", () => {
    const receive = vi.fn();
    const view = render(<Player option={option()} getInstance={(art) => receive(art)} />);
    const first = state.players[0];
    first.currentTime = 123;
    view.rerender(<Player option={option()} getInstance={(art) => receive(art)} />);
    expect(state.players).toHaveLength(1);
    expect(first.currentTime).toBe(123);
    expect(first.destroy).not.toHaveBeenCalled();
    expect(receive).toHaveBeenCalledTimes(1);
    view.unmount();
    expect(first.destroy).toHaveBeenCalledTimes(1);
  });

  it("HLS 回退到原格式及切换文件时释放旧实例并创建正确类型", () => {
    const view = render(<Player option={option("movie", "m3u8")} />);
    expect(state.players[0].option.type).toBe("m3u8");
    view.rerender(<Player option={option("movie")} />);
    expect(state.players[0].destroy).toHaveBeenCalledTimes(1);
    expect(state.players[1].option.type).toBe("mp4");
    view.rerender(<Player option={option("next")} />);
    expect(state.players[1].destroy).toHaveBeenCalledTimes(1);
    expect(state.players[2].option.id).toBe("next");
    expect(state.players).toHaveLength(3);
  });

  it("不重建播放器也能调用最新 HLS 故障处理器，单个故障只处理一次", () => {
    const stale = vi.fn();
    const latest = vi.fn();
    const view = render(<Player option={option("movie", "m3u8")} onHlsFatalError={stale} />);
    const player = state.players[0];
    player.option.customType.m3u8(document.createElement("video"), "/index.m3u8", player);
    view.rerender(<Player option={option("movie", "m3u8")} onHlsFatalError={latest} />);
    const handler = state.hls[0].on.mock.calls[0][1];
    handler("error", { fatal: true, type: "networkError" });
    handler("error", { fatal: true, type: "networkError" });
    expect(stale).not.toHaveBeenCalled();
    expect(latest).toHaveBeenCalledExactlyOnceWith("networkError");
    expect(player.destroy).not.toHaveBeenCalled();
    expect(state.players).toHaveLength(1);
  });
});
