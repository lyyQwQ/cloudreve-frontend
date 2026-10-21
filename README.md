# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
export default {
  // other rules...
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    project: ["./tsconfig.json", "./tsconfig.node.json"],
    tsconfigRootDir: __dirname,
  },
};
```

- Replace `plugin:@typescript-eslint/recommended` to `plugin:@typescript-eslint/recommended-type-checked` or `plugin:@typescript-eslint/strict-type-checked`
- Optionally add `plugin:@typescript-eslint/stylistic-type-checked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and add `plugin:react/recommended` & `plugin:react/jsx-runtime` to the `extends` list

## 视频播放器维护边界

播放器实例只在文件标识 `option.id` 或实际播放类型变化时重建；HLS 回退到原格式仍需重建。父组件传入的配置对象和回调可能每次渲染都会产生新引用，不能将这些引用直接作为创建实例 effect 的依赖，否则 `getInstance → setArt → render` 会形成重建和取址循环。

异步 HLS 回调通过最新属性引用执行，避免为了更新回调而销毁实例。普通配置作为实例创建时的快照；播放地址和字幕样式仍由现有播放器 API 更新。

回归测试：`npm test -- src/component/Viewers/Video/Artplayer.test.tsx`。覆盖普通重渲染保留播放状态、文件/类型切换释放旧实例，以及 HLS 故障使用最新回调且只处理一次。

## 严格类型检查与生产构建

发布前使用 `npm run build-prod`（`tsc && vite build`），CI 同样运行此命令；`npm run build` 只打包，不能代替类型检查。回归验证使用 `npm test`。

开发依赖固定 TypeScript 5.7.3，以匹配上传加密代码使用的 `Uint8Array<ArrayBuffer>` 与 `Blob.bytes()` 声明。reCAPTCHA、文本高亮使用对应的 `@types` 包；File System Access 声明需在 `tsconfig.json` 的 `types` 中显式启用。声明存在不代表浏览器支持该能力，仍须保留运行时检测和权限处理。

共享 MUI 样式组件应保留原组件的泛型调用签名，不在调用方增加 `any` 或虚构后端字段。组写入使用 `GroupUpsertInput` 表示仅需要存储策略 ID 的请求，完整响应仍使用 `GroupEnt`。

本轮没有实现积分付费分享：后台保留原有空白积分列，不补造价格数据或价格排序能力。
