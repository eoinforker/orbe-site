/*
  Orbe Fix for the browser engine. Nothing in this module imports node:, so
  this is the same surface as index.ts; it exists so the engine build has
  one entry per module, like the others.
*/
export * from "./index.js";
