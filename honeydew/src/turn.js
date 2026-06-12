import fs from "node:fs";
import { readForest, createEmptyForest } from "./state.js";
import { getUnlockedVarietyKeys } from "./rewards.js";
import { eraSpecies, pickSpecies } from "./varieties.js";
import { getPlantWidth, findOpenX } from "./plant.js";
import { writeActiveSession, readActiveSession, clearActiveSession } from "./session.js";
import { readTurnTokens } from "./transcript.js";
import { tokensToTree } from "./growth.js";

function fileSize(p) {
  try {
    return fs.statSync(p).size;
  } catch {
    return 0;
  }
}

// UserPromptSubmit: mark the start of a turn and pre-choose the tree (type + x)
// so the live overlay and the committed tree are the same tree.
export function startTurn(payload) {
  const transcript_path = payload?.transcript_path;
  if (!transcript_path) return;

  const forest = readForest() ?? createEmptyForest();
  const species = pickSpecies(eraSpecies(getUnlockedVarietyKeys()));
  const type = species.type;
  const variant = species.variant ?? null;
  const width = getPlantWidth(forest);
  const x = findOpenX(forest.trees, type, 1, width);

  writeActiveSession({
    transcript_path,
    session_id: payload.session_id ?? null,
    turnStartedAt: Date.now(),
    baselineOffset: fileSize(transcript_path),
    type,
    variant,
    x,
  });
}

// Stop: total this turn's output tokens and produce the tree shape, then clear
// the session. Returns null if there's no matching active session.
export function computeTickShape(payload) {
  const session = readActiveSession();
  const transcript_path = payload?.transcript_path ?? session?.transcript_path;
  if (!session || !transcript_path || session.transcript_path !== transcript_path) {
    return null;
  }
  const tokens = readTurnTokens(transcript_path, session.baselineOffset || 0);
  const shape = tokensToTree(tokens);
  clearActiveSession();
  return { ...shape, type: session.type, variant: session.variant ?? null, x: session.x, tokens };
}
