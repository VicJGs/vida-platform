// Minimal ambient type for the bundler-replaced dev guard `process.env.NODE_ENV` (React-library pattern).
// Avoids pulling all of @types/node into a browser package. The reference is replaced at build time
// (Vite/Storybook define) so `process` is never evaluated at runtime in prod — the guarded block is DCE'd.
declare const process: { env: { NODE_ENV?: 'development' | 'production' | 'test' } }
