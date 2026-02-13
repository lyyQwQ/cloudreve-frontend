import { defineConfig } from "vitest/config";

const virtualPwaRegisterReactStub = () => {
  const id = "virtual:pwa-register/react";
  return {
    name: "vitest:virtual-pwa-register-react-stub",
    enforce: "pre" as const,
    resolveId(source: string) {
      if (source === id) return id;
    },
    load(source: string) {
      if (source !== id) return;
      return [
        "export function useRegisterSW() {",
        "  return {",
        "    offlineReady: [false, () => {}],",
        "    needRefresh: [false, () => {}],",
        "    updateServiceWorker: () => {},",
        "  };",
        "}",
      ].join("\n");
    },
  };
};

const vitestSiteThunkStub = () => {
  const marker = "/src/redux/thunks/site.ts";
  return {
    name: "vitest:site-thunk-stub",
    enforce: "pre" as const,
    load(id: string) {
      if (!id.includes(marker)) return;
      return [
        "export function loadSiteConfig(_section) {",
        "  return async () => undefined;",
        "}",
        "export function updateSiteConfig() {",
        "  return async () => undefined;",
        "}",
      ].join("\n");
    },
  };
};

export default defineConfig({
  plugins: [virtualPwaRegisterReactStub(), vitestSiteThunkStub()],
  test: {
    environment: "jsdom",
    setupFiles: ["src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
    },
  },
});
