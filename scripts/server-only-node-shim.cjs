/* eslint-disable @typescript-eslint/no-require-imports */
const { createRequire } = require("node:module");
const requireFromHere = createRequire(__filename);
const Module = requireFromHere("node:module");

const originalLoad = Module._load;

Module._load = function patchedLoad(request, parent, isMain) {
  if (request === "server-only") {
    return {};
  }

  return originalLoad.call(this, request, parent, isMain);
};
