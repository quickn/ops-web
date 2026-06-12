/// <reference types="vite/client" />

declare module "*.vue" {
  import { DefineComponent } from "vue";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/ban-types
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

// 环境变量 TypeScript的智能提示
interface ImportMetaEnv {
  VITE_APP_TITLE: string;
  VITE_APP_PORT: string;
  VITE_APP_BASE_API: string;
  VITE_APP_BASE_API_PY: string;
  VITE_APP_TARGET_URL: string;
  VITE_APP_TARGET_URL_PY: string;
  VITE_APP_TARGET_BASE_API: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "lodash-es";
