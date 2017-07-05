const { dirname } = require("path");
const { sync } = require("resolve");

import { FileGraphNode } from "../graph/FileGraphNode";
import { ParentState } from "../parent/ParentState";

export function resolveDependencyPaths(path: string, moduleSources: string[]) {
  const moduleSourcesToPath: { [x: string]: string } = {};
  const importerDir = dirname(path);

  for (const moduleSource of moduleSources) {
    const resolvedFile = sync(moduleSource, { basedir: importerDir });

    moduleSourcesToPath[moduleSource] = resolvedFile;
  }

  return moduleSourcesToPath;
}
