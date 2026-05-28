import React, { useState, useEffect, useCallback, useRef } from "react";
import { Box, Text, useApp, useInput, useStdout } from "ink";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execSync } from "node:child_process";
import { getAuth, isLoggedIn } from "../auth.js";
import { getRewards, syncRewards } from "../rewards.js";

import ForestScene from "./ForestScene.js";
import StatsBar from "./StatsBar.js";
import TreeInfoPopup from "./TreeInfoPopup.js";

import { getForestFile, readForest, writeForest } from "../state.js";
import { migrateLayout } from "../migrate.js";
import { getVirtualWidth } from "../plant.js";
import { getAnimationFrames } from "../animation.js";
import { createForestWatcher } from "../viewer2d.js";

const h = React.createElement;
const PAN_STEP = 4;

export default function ForestApp() {
  const { exit } = useApp();
  const { stdout } = useStdout();

  const forestFile = getForestFile();

  const [forest, setForest] = useState(() => {
    const f = readForest();
    if (!f || !fs.existsSync(forestFile)) {
      console.error('No forest found. Run "honeytree init" first.');
      process.exit(1);
    }
    if (f && (!f.layoutVersion || f.layoutVersion < 2)) {
      const termWidth = stdout?.columns || 80;
      migrateLayout(f, termWidth);
    }
    return f;
  });

  const [viewportX, setViewportX] = useState(forest.viewportX || 0);
  const [windTick, setWindTick] = useState(0);
  const [termWidth, setTermWidth] = useState(stdout?.columns || 80);
  const [selectedTreeIdx, setSelectedTreeIdx] = useState(-1);
  const [showPopup, setShowPopup] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [spriteOverride, setSpriteOverride] = useState(null);
  const [groundOverlay, setGroundOverlay] = useState(null);
  const [groundPulse, setGroundPulse] = useState(false);
  const [milestonePrompt, setMilestonePrompt] = useState(null);
  const [rewards, setRewards] = useState(() => getRewards());

  const ignoreNextChange = useRef(false);
  const lastMaxId = useRef(forest.trees.reduce((max, t) => Math.max(max, t.id), 0));
  const lastTotalPrompts = useRef(forest.totalPrompts);
  const forestRef = useRef(forest);
  forestRef.current = forest;
  const viewportXRef = useRef(viewportX);
  viewportXRef.current = viewportX;

  // Fetch rewards from server (async, non-blocking)
  useEffect(() => {
    if (isLoggedIn()) {
      syncRewards().then((r) => { if (r) setRewards(r); }).catch(() => {});
    }
  }, []);

  // Sync width to disk
  const syncWidth = useCallback(() => {
    const cols = stdout?.columns || 80;
    const f = forestRef.current;
    if (f.viewerWidth !== cols) {
      f.viewerWidth = cols;
      ignoreNextChange.current = true;
      writeForest(f);
    }
  }, [stdout]);

  useEffect(() => {
    syncWidth();
  }, [syncWidth]);

  // Clamp viewport helper
  const clampViewport = useCallback((x) => {
    const vw = getVirtualWidth(forestRef.current.trees.length, termWidth);
    return Math.max(0, Math.min(x, Math.max(0, vw - termWidth)));
  }, [termWidth]);

  // Get visible trees in viewport for selection
  const getVisibleTrees = useCallback(() => {
    const vpEnd = viewportX + termWidth;
    return forest.trees
      .filter((t) => t.x >= viewportX && t.x < vpEnd)
      .sort((a, b) => a.x - b.x);
  }, [forest, viewportX, termWidth]);

  // Wind interval
  useEffect(() => {
    const id = setInterval(() => {
      if (!animating) {
        setWindTick((t) => t + 1);
      }
    }, 2500);
    return () => clearInterval(id);
  }, [animating]);

  // Resize handler
  useEffect(() => {
    const onResize = () => {
      const cols = stdout?.columns || 80;
      setTermWidth(cols);
      syncWidth();
    };
    stdout?.on("resize", onResize);
    return () => stdout?.off("resize", onResize);
  }, [stdout, syncWidth]);

  // Animate new tree
  const animateNewTree = useCallback(async (updatedForest, newTreeId) => {
    const tree = updatedForest.trees.find((t) => t.id === newTreeId);
    if (!tree) return;

    const FRAME_COUNT = 40;
    const FRAME_DELAY = 125;

    const frames = getAnimationFrames(tree.type, tree.growth, FRAME_COUNT);

    for (let i = 0; i < frames.length; i++) {
      const frameData = frames[i];
      setSpriteOverride({ treeId: tree.id, sprite: frameData.sprite });
      setGroundPulse(frameData.groundPulse ?? false);
      if (frameData.groundOverlay) {
        setGroundOverlay({ treeX: tree.x, overlays: frameData.groundOverlay });
      } else {
        setGroundOverlay(null);
      }
      setWindTick(i);
      await new Promise((r) => setTimeout(r, FRAME_DELAY));
    }

    setSpriteOverride(null);
    setGroundOverlay(null);
    setGroundPulse(false);
  }, []);

  // File watcher + polling for forest changes
  useEffect(() => {
    const checkForUpdates = async () => {
      if (animating) return;
      if (ignoreNextChange.current) {
        ignoreNextChange.current = false;
        return;
      }
      const updated = readForest();
      if (!updated) return;
      if (updated.totalPrompts === lastTotalPrompts.current) return;

      const nextMaxId = updated.trees.reduce((max, t) => Math.max(max, t.id), 0);
      lastTotalPrompts.current = updated.totalPrompts;
      setForest(updated);
      forestRef.current = updated;

      // Check for milestone flag
      try {
        const milestoneFile = path.join(os.homedir(), ".honeydew", "milestone.json");
        if (fs.existsSync(milestoneFile)) {
          const milestone = JSON.parse(fs.readFileSync(milestoneFile, "utf8"));
          setMilestonePrompt(milestone);
        }
      } catch {}

      if (nextMaxId > lastMaxId.current) {
        lastMaxId.current = nextMaxId;
        const newTree = updated.trees.find((t) => t.id === nextMaxId);
        if (newTree) {
          const tw = stdout?.columns || 80;
          const vw = getVirtualWidth(updated.trees.length, tw);
          const newVpx = Math.max(0, Math.min(newTree.x - Math.floor(tw / 2), Math.max(0, vw - tw)));
          setViewportX(newVpx);
        }
        setAnimating(true);
        await animateNewTree(updated, nextMaxId);
        setAnimating(false);
      }
    };

    const watcher = createForestWatcher(forestFile, () => checkForUpdates());

    let lastMtime = 0;
    try { lastMtime = fs.statSync(forestFile).mtimeMs; } catch {}

    const pollId = setInterval(() => {
      try {
        const mtime = fs.statSync(forestFile).mtimeMs;
        if (mtime !== lastMtime) {
          lastMtime = mtime;
          checkForUpdates();
        }
      } catch {}
    }, 800);

    return () => {
      if (watcher) try { watcher.close(); } catch {}
      clearInterval(pollId);
    };
  }, [forestFile, animating, animateNewTree, stdout]);

  // Save viewport on unmount
  useEffect(() => {
    return () => {
      const f = forestRef.current;
      f.viewportX = viewportXRef.current;
      ignoreNextChange.current = true;
      writeForest(f);
    };
  }, []);

  // Keyboard input
  useInput((input, key) => {
    if (milestonePrompt) {
      const milestoneFile = path.join(os.homedir(), ".honeydew", "milestone.json");
      if (input === "y") {
        // Open checkout in browser
        const auth = getAuth();
        if (auth && auth.access_token) {
          fetch("https://tryhoney.xyz/api/checkout", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${auth.access_token}`,
            },
          })
            .then((r) => r.json())
            .then(({ url }) => {
              if (url) {
                try { execSync(`open "${url}"`); } catch {
                  try { execSync(`xdg-open "${url}"`); } catch {}
                }
              }
            })
            .catch(() => {});
        }
        try { fs.unlinkSync(milestoneFile); } catch {}
        setMilestonePrompt(null);
      } else if (input === "n") {
        try { fs.unlinkSync(milestoneFile); } catch {}
        setMilestonePrompt(null);
      }
      return;
    }

    if (showPopup) {
      if (key.escape) {
        setShowPopup(false);
      }
      return;
    }

    if (input === "q") {
      const f = forestRef.current;
      f.viewportX = viewportXRef.current;
      ignoreNextChange.current = true;
      writeForest(f);
      exit();
      return;
    }

    if (key.leftArrow) {
      setViewportX((x) => clampViewport(x - PAN_STEP));
      return;
    }
    if (key.rightArrow) {
      setViewportX((x) => clampViewport(x + PAN_STEP));
      return;
    }

    if (key.upArrow) {
      const visible = getVisibleTrees();
      if (visible.length === 0) return;
      setSelectedTreeIdx((prev) => {
        if (prev <= 0) return visible.length - 1;
        return prev - 1;
      });
      return;
    }
    if (key.downArrow || key.tab) {
      const visible = getVisibleTrees();
      if (visible.length === 0) return;
      setSelectedTreeIdx((prev) => {
        if (prev < 0 || prev >= visible.length - 1) return 0;
        return prev + 1;
      });
      return;
    }

    if (key.return) {
      const visible = getVisibleTrees();
      if (selectedTreeIdx >= 0 && selectedTreeIdx < visible.length) {
        setShowPopup(true);
      }
      return;
    }
  });

  const visibleTrees = getVisibleTrees();
  const selectedTree = selectedTreeIdx >= 0 && selectedTreeIdx < visibleTrees.length
    ? visibleTrees[selectedTreeIdx]
    : null;

  return h(Box, { flexDirection: "column" },
    h(ForestScene, {
      forest,
      viewportX,
      windTick,
      termWidth,
      spriteOverride,
      groundOverlay,
      groundPulse,
      rewards,
    }),
    h(StatsBar, { forest, viewportX, termWidth, rewards }),
    showPopup && selectedTree ? h(TreeInfoPopup, { tree: selectedTree }) : null,
    milestonePrompt ? h(Box, { flexDirection: "column", paddingX: 1 },
      h(Text, { color: "green", bold: true },
        `${milestonePrompt.totalPrompts} virtual trees! You've unlocked a real tree planting ($1). Plant one? (y/n)`
      ),
    ) : null,
  );
}
