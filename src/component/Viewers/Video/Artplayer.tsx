import { Box, BoxProps } from "@mui/material";
import { fileExtension } from "../../../util";
import Artplayer from "artplayer";
import artplayerPluginChapter from "artplayer-plugin-chapter";
import artplayerPluginHlsControl from "artplayer-plugin-hls-control";
import { CrMaskedPrefix } from "./VideoViewer";
import Hls, { HlsConfig } from "hls.js";
import mpegts from "mpegts.js";
import i18next from "i18next";
import { useEffect, useRef } from "react";
import "./artplayer.css";

export interface PlayerProps extends BoxProps {
  option: any;
  getInstance?: (instance: Artplayer) => void;
  chapters?: any;
  m3u8UrlTransform?: (url: string, isPlaylist?: boolean) => Promise<string>;
  getEntityUrl?: (url: string) => Promise<string>;
  onHlsFatalError?: (errorType: string) => void | Promise<void>;
}

const playM3u8 =
  (
    urlTransform?: (url: string, isPlaylist?: boolean) => Promise<string>,
    getEntityUrl?: (url: string) => Promise<string>,
    onHlsFatalError?: (errorType: string) => void | Promise<void>,
  ) =>
  (video: HTMLVideoElement, url: string, art: Artplayer) => {
    if (Hls.isSupported()) {
      if (art.hls) art.hls.destroy();
      const hlsConfig: any = {
        fLoader: class extends Hls.DefaultConfig.loader {
          constructor(config: HlsConfig) {
            super(config);
            const load: any = this.load.bind(this);
            this.load = function (context: any, config: any, callbacks: any) {
              if (urlTransform) {
                urlTransform(context.url).then((url) => {
                  const complete = callbacks.onSuccess;
                  callbacks.onSuccess = (loaderResponse: any, stats: any, successContext: any, networkDetails: any) => {
                    // Do something with loaderResponse.data
                    loaderResponse.url = url;
                    complete(loaderResponse, stats, successContext, networkDetails);
                  };
                  load({ ...context, frag: { ...context.frag, relurl: url, _url: url }, url }, config, callbacks);
                });
              } else {
                load(context, config, callbacks);
              }
            };
          }
        },
        pLoader: class extends Hls.DefaultConfig.loader {
          constructor(config: HlsConfig) {
            super(config);
            const load: any = this.load.bind(this);
            this.load = function (context: any, config: any, callbacks: any) {
              if (urlTransform) {
                urlTransform(context.url, true).then((url) => {
                  const complete = callbacks.onSuccess;
                  callbacks.onSuccess = (loaderResponse: any, stats: any, successContext: any, networkDetails: any) => {
                    // Do something with loaderResponse.data
                    loaderResponse.url = url;
                    complete(loaderResponse, stats, successContext, networkDetails);
                  };
                  load({ ...context, url }, config, callbacks);
                });
              } else {
                load(context, config, callbacks);
              }
            };
          }
        },
        xhrSetup: async (xhr: any, url: string) => {
          // Always send cookies, even for cross-origin calls.
          if (url.startsWith(CrMaskedPrefix)) {
            if (getEntityUrl) {
              xhr.open("GET", await getEntityUrl(url), true);
              return;
            }
          }
        },
      };
      const hls = new Hls(hlsConfig);
      let handledFatalError = false;
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal || handledFatalError) {
          return;
        }
        handledFatalError = true;

        if (onHlsFatalError) {
          Promise.resolve(onHlsFatalError(data.type));
          return;
        }

        art.notice.show = i18next.t("application:fileManager.hlsManageNoArtifact");
      });
      hls.loadSource(url);
      hls.attachMedia(video);
      art.hls = hls;
      art.on("destroy", () => hls.destroy());
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url;
    } else {
      art.notice.show = "Unsupported playback format: m3u8";
    }
  };

const playFlv = (video: HTMLVideoElement, url: string, art: Artplayer) => {
  if (mpegts.isSupported()) {
    if (art.flv) art.flv.destroy();
    const flv = mpegts.createPlayer(
      {
        type: "flv",
        url: url,
      },
      {
        lazyLoadMaxDuration: 5 * 60,
        accurateSeek: true,
      },
    );
    flv.attachMediaElement(video);
    flv.load();
    art.flv = flv;
    art.on("destroy", () => flv.destroy());
  } else {
    art.notice.show = "Unsupported playback format: flv";
  }
};

export default function Player({
  option,
  chapters,
  getInstance,
  m3u8UrlTransform,
  getEntityUrl,
  onHlsFatalError,
  ...rest
}: PlayerProps) {
  const artRef = useRef<HTMLDivElement>(null);
  const latest = useRef({ option, chapters, getInstance, m3u8UrlTransform, getEntityUrl, onHlsFatalError });

  // 回调随父组件状态更新，但不能因此销毁正在播放的实例。
  useEffect(() => {
    latest.current = { option, chapters, getInstance, m3u8UrlTransform, getEntityUrl, onHlsFatalError };
  });
  const ext = fileExtension(option.title);
  const type = option.type ?? ext;

  useEffect(() => {
    const { option, chapters, getInstance } = latest.current;
    const opts = {
      ...option,
      plugins: [...option.plugins],
      container: artRef.current,
      customType: {
        ...option.customType,
        m3u8: playM3u8(
          latest.current.m3u8UrlTransform
            ? (url, isPlaylist) => latest.current.m3u8UrlTransform?.(url, isPlaylist) ?? Promise.resolve(url)
            : undefined,
          latest.current.getEntityUrl ? (url) => latest.current.getEntityUrl?.(url) ?? Promise.resolve(url) : undefined,
          (errorType) => {
            if (latest.current.onHlsFatalError) {
              return latest.current.onHlsFatalError(errorType);
            }
            art.notice.show = i18next.t("application:fileManager.hlsManageNoArtifact");
          },
        ),
        flv: playFlv,
      },
      type,
    };

    if (chapters) {
      opts.plugins.push(artplayerPluginChapter({ chapters }));
    }

    if (type === "m3u8") {
      opts.plugins.push(
        artplayerPluginHlsControl({
          quality: {
            // Show qualitys in control
            control: true,
            // Show qualitys in setting
            setting: true,
            // Get the quality name from level
            getName: (level: any) =>
              level?.height ? `${level.height}P` : i18next.t("application:fileManager.default"),
            // I18n
            title: i18next.t("application:fileManager.quality"),
            auto: i18next.t("application:fileManager.auto"),
          },
          audio: {
            // Show audios in control
            control: true,
            // Show audios in setting
            setting: true,
            // Get the audio name from track
            getName: (track: any) => track?.name,
            // I18n
            title: i18next.t("application:fileManager.audioTrack"),
            auto: i18next.t("application:fileManager.auto"),
          },
        }),
      );
    }

    const art = new Artplayer(opts);

    if (getInstance && typeof getInstance === "function") {
      getInstance(art);
    }

    return () => {
      if (art && art.destroy) {
        art.destroy(false);
      }
    };
    // 内联 option/getInstance 每次渲染都会变化；仅文件切换、HLS 回退需要重建。
  }, [option.id, type]);

  return <Box ref={artRef} {...rest}></Box>;
}
