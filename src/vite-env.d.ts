/// <reference types="vite/client" />

declare module '*.css';

interface ImportMetaEnv {
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
