const fs = require("fs");
const path = require("path");

function loadEnvFile() {
  const envPath = path.join(__dirname, ".env");
  try {
    const raw = fs.readFileSync(envPath, "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  } catch {
    // sin .env en desarrollo local
  }
}

loadEnvFile();

module.exports = {
  apps: [
    {
      name: "tienda-barrio",
      cwd: "/home/ubuntu/tienda-barrio",
      script: "node_modules/next/dist/bin/next",
      // Solo localhost: Nginx hace de reverse proxy HTTPS
      args: "start --hostname 127.0.0.1 --port 3000",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "260M",
      min_uptime: "10s",
      restart_delay: 2000,
      exp_backoff_restart_delay: 1000,
      kill_timeout: 4000,
      env: {
        NODE_ENV: "production",
        PORT: "3000",
        NODE_OPTIONS: "--max-old-space-size=192",
        SESSION_SECRET: process.env.SESSION_SECRET || "",
      },
    },
  ],
};
