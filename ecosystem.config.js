const path = require("node:path");

module.exports = {
  apps: [
    {
      name: "reconnect-ai-backend",
      cwd: path.join(__dirname, "backend"),
      script: "npm.cmd",
      args: "start",
      interpreter: "none",
      env: {
        NODE_ENV: "development",
        PORT: "4100",
        CLIENT_ORIGIN: "http://localhost:5173"
      }
    },
    {
      name: "reconnect-ai-frontend",
      cwd: path.join(__dirname, "frontend"),
      script: "npm.cmd",
      args: "run dev -- --host 127.0.0.1 --port 5173",
      interpreter: "none",
      env: {
        NODE_ENV: "development",
        VITE_API_URL: "http://localhost:4100"
      }
    }
  ]
};
