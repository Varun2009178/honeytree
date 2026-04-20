"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const node_child_process_1 = require("node:child_process");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const node_os_1 = require("node:os");
const FOREST_FILE = (0, node_path_1.join)((0, node_os_1.homedir)(), ".honeydew", "forest.json");
const DEBOUNCE_MS = 2000;
let statusBarItem;
let debounceTimer;
function getConfig() {
    const cfg = vscode.workspace.getConfiguration("honeytree");
    return {
        enabled: cfg.get("enabled", true),
        autoDetect: cfg.get("autoDetect", true),
        minLines: cfg.get("minLines", 3),
    };
}
function readForest() {
    try {
        const forest = JSON.parse((0, node_fs_1.readFileSync)(FOREST_FILE, "utf8"));
        return {
            count: forest.trees?.length ?? 0,
            streak: forest.streak ?? 0,
        };
    }
    catch {
        return { count: 0, streak: 0 };
    }
}
function updateStatusBar() {
    const { count, streak } = readForest();
    statusBarItem.text = `$(tree) ${count}`;
    const streakText = streak > 0 ? ` · ${streak}d streak` : "";
    statusBarItem.tooltip = `Honeytree: ${count} tree${count === 1 ? "" : "s"}${streakText}`;
}
function plantTree() {
    return new Promise((resolve, reject) => {
        (0, node_child_process_1.execFile)("honeytree", ["plant"], (error) => {
            if (error) {
                reject(error);
            }
            else {
                updateStatusBar();
                resolve();
            }
        });
    });
}
function activate(context) {
    // Status bar
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = "honeytree.plant";
    updateStatusBar();
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);
    // Manual command
    context.subscriptions.push(vscode.commands.registerCommand("honeytree.plant", async () => {
        const { enabled } = getConfig();
        if (!enabled) {
            return;
        }
        try {
            await plantTree();
        }
        catch {
            vscode.window.showErrorMessage("Honeytree: failed to plant. Is honeytree installed? (npm i -g honeytree)");
        }
    }));
    // Auto-detection
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument((e) => {
        const { enabled, autoDetect, minLines } = getConfig();
        if (!enabled || !autoDetect) {
            return;
        }
        const isAiInsertion = e.contentChanges.some((change) => {
            const newlines = (change.text.match(/\n/g) || []).length;
            return newlines >= minLines;
        });
        if (!isAiInsertion) {
            return;
        }
        // Debounce — AI tools often fire multiple rapid changes for one completion
        if (debounceTimer) {
            clearTimeout(debounceTimer);
        }
        debounceTimer = setTimeout(() => {
            debounceTimer = undefined;
            plantTree().catch(() => {
                // Silently ignore — don't spam the user on every AI completion
            });
        }, DEBOUNCE_MS);
    }));
}
function deactivate() {
    if (debounceTimer) {
        clearTimeout(debounceTimer);
    }
}
//# sourceMappingURL=extension.js.map