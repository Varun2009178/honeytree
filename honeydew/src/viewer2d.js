import fs from "node:fs";
import React from "react";
import { render } from "ink";

import ForestApp from "./components/ForestApp.js";

export function createForestWatcher(filePath, onChange) {
  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) return null;

    const watcher = fs.watch(filePath, onChange);
    watcher.on("error", () => {
      try { watcher.close(); } catch {}
    });
    return watcher;
  } catch {
    return null;
  }
}

export async function viewer() {
  render(React.createElement(ForestApp));
}
