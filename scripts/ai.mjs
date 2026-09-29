#!/usr/bin/env node
// Cross-platform helper for the Python AI service.
//   node scripts/ai.mjs setup  -> create apps/ai/.venv and install requirements
//   node scripts/ai.mjs dev    -> run the Flask service from the virtualenv
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const aiDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../apps/ai");
const isWindows = process.platform === "win32";
const venvPython = path.join(aiDir, ".venv", isWindows ? "Scripts/python.exe" : "bin/python");
const systemPython = isWindows ? "python" : "python3";

function run(cmd, args) {
  const result = spawnSync(cmd, args, { cwd: aiDir, stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const command = process.argv[2];

if (command === "setup") {
  if (!existsSync(venvPython)) run(systemPython, ["-m", "venv", ".venv"]);
  run(venvPython, ["-m", "pip", "install", "-r", "requirements.txt"]);
} else if (command === "dev") {
  if (!existsSync(venvPython)) {
    console.error("AI virtualenv not found. Run `npm run setup` first.");
    process.exit(1);
  }
  const child = spawn(venvPython, ["app.py"], { cwd: aiDir, stdio: "inherit" });
  for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
  child.on("exit", (code) => process.exit(code ?? 0));
} else {
  console.error("Usage: node scripts/ai.mjs <setup|dev>");
  process.exit(1);
}
