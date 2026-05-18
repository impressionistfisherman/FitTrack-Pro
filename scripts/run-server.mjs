import { spawn } from "node:child_process";
import path from "node:path";

const mode = process.argv[2] === "start" ? "production" : "development";
const command = mode === "production" ? process.execPath : path.resolve("node_modules", ".bin", process.platform === "win32" ? "tsx.cmd" : "tsx");
const args = mode === "production"
  ? [path.resolve("dist", "server", "index.js")]
  : ["watch", path.resolve("server", "_core", "index.ts")];

const child = spawn(command, args, {
  stdio: "inherit",
  shell: false,
  env: {
    ...process.env,
    NODE_ENV: mode,
  },
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});
