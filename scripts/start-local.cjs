const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");

const rootDir = path.resolve(__dirname, "..");
const backendDir = path.join(rootDir, "backend");
const frontendDir = path.join(rootDir, "frontend");
const logDir = path.join(rootDir, "logs");

fs.mkdirSync(logDir, { recursive: true });

const services = [
  {
    name: "backend",
    cwd: backendDir,
    command: process.execPath,
    args: ["src/server.js"],
    env: {
      PORT: "4100",
      CLIENT_ORIGIN: "http://127.0.0.1:5173"
    },
    url: "http://127.0.0.1:4100/health",
    logFile: path.join(logDir, "backend.combined.log")
  },
  {
    name: "frontend",
    cwd: frontendDir,
    command: process.execPath,
    args: [path.join(frontendDir, "node_modules", "vite", "bin", "vite.js"), "--host", "127.0.0.1", "--port", "5173", "--force"],
    env: {
      VITE_API_URL: "http://127.0.0.1:4100"
    },
    url: "http://127.0.0.1:5173",
    logFile: path.join(logDir, "frontend.combined.log")
  }
];

let shuttingDown = false;
const children = new Map();

function now() {
  return new Date().toISOString();
}

function writePrefixed(stream, prefix, chunk) {
  const text = chunk.toString();
  stream.write(text);
  for (const line of text.split(/\r?\n/)) {
    if (line.length) {
      console.log(`[${prefix}] ${line}`);
    }
  }
}

function assertPathExists(label, targetPath) {
  if (!fs.existsSync(targetPath)) {
    throw new Error(`${label} not found: ${targetPath}`);
  }
}

function startService(service) {
  assertPathExists(`${service.name} cwd`, service.cwd);
  if (service.name === "frontend") {
    assertPathExists("Vite binary", service.args[0]);
  }

  const logStream = fs.createWriteStream(service.logFile, { flags: "a" });
  logStream.write(`\n[${now()}] starting ${service.name}\n`);
  logStream.write(`cwd: ${service.cwd}\n`);
  logStream.write(`command: ${service.command} ${service.args.join(" ")}\n`);
  logStream.write(`url: ${service.url}\n\n`);

  console.log(`[${service.name}] starting`);
  console.log(`[${service.name}] cwd: ${service.cwd}`);
  console.log(`[${service.name}] url: ${service.url}`);
  console.log(`[${service.name}] log: ${service.logFile}`);

  const child = spawn(service.command, service.args, {
    cwd: service.cwd,
    env: {
      ...process.env,
      ...service.env
    },
    windowsHide: false,
    stdio: ["inherit", "pipe", "pipe"]
  });

  children.set(service.name, { child, logStream });

  child.stdout.on("data", (chunk) => writePrefixed(logStream, service.name, chunk));
  child.stderr.on("data", (chunk) => writePrefixed(logStream, `${service.name}:err`, chunk));

  child.on("error", (error) => {
    const message = `[${service.name}] failed to start: ${error.message}`;
    logStream.write(`${message}\n`);
    console.error(message);
  });

  child.on("exit", (code, signal) => {
    const message = `[${service.name}] exited with code ${code ?? "null"} signal ${signal ?? "null"}`;
    logStream.write(`\n[${now()}] ${message}\n`);
    logStream.end();
    children.delete(service.name);
    console.error(message);

    if (!shuttingDown) {
      shutdown(code || 1);
    }
  });
}

function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log("[local] stopping services...");

  for (const [name, { child }] of children) {
    if (!child.killed) {
      console.log(`[local] stopping ${name}`);
      child.kill();
    }
  }

  setTimeout(() => process.exit(exitCode), 750).unref();
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

console.log("Reconnect AI local runner");
console.log(`Node: ${process.version}`);
if (!process.version.startsWith("v22.")) {
  console.warn("[local] warning: backend package.json declares Node 22.x. Current runtime is different.");
}
console.log("Press Ctrl+C to stop all services.");
console.log("");

try {
  for (const service of services) {
    startService(service);
  }
} catch (error) {
  console.error(`[local] ${error.message}`);
  shutdown(1);
}
