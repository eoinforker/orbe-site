/*
  The record module for the browser engine: the verified record, the Orbe
  Verified report and its HTML renderer, and the labelled fixtures (three
  made-up creators), so the site can show the real artefact. Nothing in the
  record imports node: modules.
*/
export * from "./index.js";
export { cleanCreator, messyCreator, suspiciousCreator, FIXTURE_NOW, FIXTURE_BUYER } from "./fixtures.js";
