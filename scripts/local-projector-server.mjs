import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// launchd does not inherit the project directory from the submitting shell.
const child = spawn(process.execPath, [
  path.join(root, "node_modules/next/dist/bin/next"),
  "dev", "--hostname", "0.0.0.0", "--port", "3000",
], { cwd: root, env: process.env, stdio: "inherit" });
for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, () => child.kill(signal));
child.on("error", () => { console.error("Local website could not start."); process.exitCode = 1; });
child.on("exit", code => { process.exitCode = code ?? 1; });
