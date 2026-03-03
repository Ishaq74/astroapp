import express from "express";
import { createServer as createViteServer } from "vite";
import fs from "fs/promises";
import path from "path";
import { exec, execFile, spawn, ChildProcess } from "child_process";
import { promisify } from "util";
import multer from "multer";
import { createProxyMiddleware } from "http-proxy-middleware";
import kill from "tree-kill";

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);
const app = express();
const PORT = 3000;

app.use(express.json());

// Set the base path for the repo
const REPO_PATH = path.resolve(process.cwd(), "concordia_repo");

let astroDevServer: ChildProcess | null = null;

app.post("/api/dev-server", async (req, res) => {
  try {
    const { action, packageManager } = req.body;
    
    if (action === "start") {
      if (astroDevServer) {
        return res.json({ success: true, message: "Already running" });
      }
      
      const pm = packageManager || "npm";
      const cmd = pm === "pnpm" ? "npx" : "npm";
      const args = pm === "pnpm" ? ["pnpm", "run", "dev"] : ["run", "dev"];
      
      astroDevServer = spawn(cmd, args, { cwd: REPO_PATH });
      
      astroDevServer.stdout?.on("data", (data) => console.log(`Astro: ${data}`));
      astroDevServer.stderr?.on("data", (data) => console.error(`Astro Error: ${data}`));
      
      astroDevServer.on("close", () => {
        astroDevServer = null;
      });
      
      // Give it a moment to start
      await new Promise(resolve => setTimeout(resolve, 3000));
      return res.json({ success: true, message: "Started" });
    } else if (action === "stop") {
      if (astroDevServer && astroDevServer.pid) {
        kill(astroDevServer.pid, "SIGKILL");
        astroDevServer = null;
      }
      return res.json({ success: true, message: "Stopped" });
    } else if (action === "status") {
      return res.json({ running: !!astroDevServer });
    }
    
    res.status(400).json({ error: "Invalid action" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Setup multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: async (req, file, cb) => {
      const dest = path.join(REPO_PATH, "public/images");
      await fs.mkdir(dest, { recursive: true });
      cb(null, dest);
    },
    filename: (req, file, cb) => {
      cb(null, file.originalname);
    }
  })
});

app.post("/api/upload", upload.array("files"), (req, res) => {
  res.json({ success: true, files: req.files });
});

// Ensure repo path exists
async function ensureRepo() {
  try {
    await fs.access(path.join(REPO_PATH, '.git'));
    console.log("Repo already exists. Pulling latest changes...");
    await execAsync("git pull", { cwd: REPO_PATH });
  } catch {
    console.log("Cloning repository...");
    await fs.rm(REPO_PATH, { recursive: true, force: true }).catch(() => {});
    await execAsync(`git clone https://github.com/ishaq74/concordia.git ${REPO_PATH}`);
    console.log("Repository cloned successfully.");
  }
}

ensureRepo();

// API Routes
app.get("/api/fs/read", async (req, res) => {
  try {
    const targetPath = req.query.path as string;
    if (!targetPath) return res.status(400).json({ error: "Path is required" });
    
    const fullPath = path.join(REPO_PATH, targetPath);
    // Security check to prevent directory traversal
    if (!fullPath.startsWith(REPO_PATH)) {
      return res.status(403).json({ error: "Access denied" });
    }

    const stat = await fs.stat(fullPath);
    if (stat.isDirectory()) {
      const children = await fs.readdir(fullPath);
      return res.json({ type: "directory", children });
    } else {
      const content = await fs.readFile(fullPath, "utf-8");
      return res.json({ type: "file", content });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/fs/raw", async (req, res) => {
  try {
    const targetPath = req.query.path as string;
    if (!targetPath) return res.status(400).json({ error: "Path is required" });
    
    const fullPath = path.join(REPO_PATH, targetPath);
    if (!fullPath.startsWith(REPO_PATH)) {
      return res.status(403).json({ error: "Access denied" });
    }

    try {
      await fs.access(fullPath);
      res.sendFile(fullPath, (err) => {
        if (err && !res.headersSent) {
          res.status(404).json({ error: "File not found" });
        }
      });
    } catch {
      res.status(404).json({ error: "File not found" });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/fs/write", async (req, res) => {
  try {
    const { path: targetPath, content, createBackup } = req.body;
    if (!targetPath || content === undefined) return res.status(400).json({ error: "Path and content are required" });

    const fullPath = path.join(REPO_PATH, targetPath);
    if (!fullPath.startsWith(REPO_PATH)) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (createBackup) {
      try {
        await fs.copyFile(fullPath, `${fullPath}.bak`);
      } catch (e) {
        // Ignore if file doesn't exist yet
      }
    }

    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content, "utf-8");
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/fs/scan", async (req, res) => {
  try {
    // A simple recursive directory scan
    async function getFiles(dir: string): Promise<any[]> {
      const dirents = await fs.readdir(dir, { withFileTypes: true });
      const files = await Promise.all(dirents.map((dirent) => {
        const res = path.resolve(dir, dirent.name);
        return dirent.isDirectory() ? getFiles(res) : res;
      }));
      return Array.prototype.concat(...files);
    }

    const allFiles = await getFiles(REPO_PATH);
    const relativeFiles = allFiles.map(f => path.relative(REPO_PATH, f));
    res.json({ files: relativeFiles });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/exec", async (req, res) => {
  try {
    const { command, args, cwd } = req.body;
    if (!command) return res.status(400).json({ error: "Command is required" });
    
    // In a real app, we would validate against a whitelist
    const execCwd = cwd ? path.join(REPO_PATH, cwd) : REPO_PATH;
    const { stdout, stderr } = await execFileAsync(command, args || [], { cwd: execCwd });
    res.json({ stdout, stderr, exitCode: 0 });
  } catch (error: any) {
    res.status(500).json({ error: error.message, stdout: error.stdout, stderr: error.stderr, exitCode: error.code });
  }
});

async function startServer() {
  // Proxy Astro dev server routes
  const astroProxy = createProxyMiddleware({
    target: "http://localhost:4321",
    changeOrigin: true,
    ws: true,
    pathRewrite: (path) => {
      if (path.startsWith("/preview-site")) {
        return path.replace("/preview-site", "") || "/";
      }
      return path;
    }
  });

  app.use([
    "/preview-site",
    "/_astro",
    "/@vite",
    "/@fs",
    "/@id",
    "/src",
    "/node_modules",
    "/__astro_ping",
    "/__vite_ping",
    "/fr",
    "/en",
    "/ar",
    "/es"
  ], (req, res, next) => {
    if (astroDevServer) {
      astroProxy(req, res, next);
    } else {
      next();
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
