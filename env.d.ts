/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional read-only GitHub token, inlined at build time by Vite. */
  readonly VITE_GITHUB_TOKEN?: string;
}
