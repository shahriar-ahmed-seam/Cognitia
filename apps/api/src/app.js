// Express app: middleware and routes. server.js adds the database connection, jobs,
// WebSockets and `listen`, so tests can import this file without starting anything.
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import jwt from "jsonwebtoken";
import corsMiddleware from "./middleware/cors.js";
import errorHandler from "./middleware/errorHandler.js";
import { authenticateToken } from "./middleware/auth.js";
import { validateCuidOrUUID, handleValidationErrors } from "./middleware/validation.js";
import { detectMimeType } from "./utils/fileUtils.js";
import { prisma } from "./lib/database.js";
import authRoutes from "./routes/auth.js";
import analyticsRoutes from "./routes/analytics.js";
import dashboardRoutes from "./routes/dashboard.js";
import tasksRoutes from "./routes/tasks.js";
import modelTestRoutes from "./routes/modelTest.js";
import notesRoutes from "./routes/notes.js";
import qnaRoutes from "./routes/qa.js";
import profileRoutes from "./routes/profile.js";
import notificationsRouter from "./routes/notifications.js";
import contestRoutes from "./modules/contests/participant.routes.js";
import contestOrganizerRoutes from "./modules/contests/organizer.routes.js";
import contestAdminRoutes from "./modules/contests/admin.routes.js";
import aiRoutes from "./modules/ai/routes.js";
import { getPublicAsset } from "./modules/contests/service.js";

const app = express();

// Security and optimization middleware
app.use(helmet());
app.use(compression());
app.use(corsMiddleware);
app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "frame-ancestors 'self' http://localhost:3000 http://130.33.96.3:3000 http://130.33.96.3 http://cognitiahub.me https://cognitiahub.me http://www.cognitiahub.me https://www.cognitiahub.me"
  );
  res.removeHeader("X-Frame-Options");
  next();
});

// Request log. Bodies are never logged: they carry passwords and AI keys.
if (process.env.NODE_ENV !== "test") app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// Body parsing middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Health check endpoint
app.get("/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: "connected",
      version: "1.1.0",
      environment: process.env.NODE_ENV || "development",
    });
  } catch (error) {
    console.error("Health check failed:", error);
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: "disconnected",
      error: error.message,
      version: "1.1.0",
      environment: process.env.NODE_ENV || "development",
    });
  }
});

app.get("/api/users/count", async (req, res) => {
  try {
    const userCount = await prisma.user.count();
    res.json({ count: userCount });
  } catch (error) {
    console.error("Error fetching user count:", error);
    res.status(500).json({ error: "Failed to fetch user count" });
  }
});

app.get("/api/notes/count", async (req, res) => {
  try {
    const notesCount = await prisma.note.count();
    res.json({ count: notesCount });
  } catch (error) {
    console.error("Error fetching notes count:", error);
    res.status(500).json({ error: "Failed to fetch notes count" });
  }
});

// File serving endpoint with better organization
app.get("/api/notes/:id/file", [validateCuidOrUUID("id"), handleValidationErrors], async (req, res) => {
  try {
    const token = req.query.token;
    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    let user;
    try {
      user = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    const note = await prisma.note.findUnique({
      where: { id: req.params.id },
      select: { file: true, title: true, visibility: true, authorId: true },
    });

    if (!note) {
      return res.status(404).json({ error: "Note not found" });
    }
    if (note.visibility === "PRIVATE" && note.authorId !== user.id) {
      return res.status(403).json({ error: "Access denied" });
    }
    if (!note.file) {
      return res.status(404).json({ error: "No file attached to this note" });
    }

    const contentType = await detectMimeType(note.file);
    const sanitizedFilename = note.title.replace(/[^a-zA-Z0-9.-]/g, "_");
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `inline; filename="${sanitizedFilename}"`);
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.send(note.file);
  } catch (error) {
    console.error("Serve note file error:", error);
    res.status(500).json({ error: "Failed to serve note file" });
  }
});

// Contest question images: public by unguessable id so <img> tags work without a token
app.get("/api/public/contest-assets/:id", async (req, res) => {
  const asset = await getPublicAsset(req.params.id);
  res.setHeader("Content-Type", asset.mimeType);
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.send(Buffer.from(asset.data));
});

// Authentication routes
app.use("/api/auth", authRoutes);
app.use("/api/notifications", authenticateToken, notificationsRouter);
// Protected routes
app.use("/api/dashboard", authenticateToken, dashboardRoutes);
app.use("/api/analytics", authenticateToken, analyticsRoutes);
app.use("/api/tasks", authenticateToken, tasksRoutes);
app.use("/api/model-test", authenticateToken, modelTestRoutes);
app.use("/api/notes", authenticateToken, notesRoutes);
app.use("/api/contests", authenticateToken, contestRoutes);
app.use("/api/qa", authenticateToken, qnaRoutes);
app.use("/api/profile", authenticateToken, profileRoutes);

// Organizer console (team roles are checked per contest) and admin tools
app.use("/api/organizer/contests", authenticateToken, contestOrganizerRoutes);
app.use("/api/organizer/ai", authenticateToken, aiRoutes);
app.use("/api/admin/organizers", authenticateToken, contestAdminRoutes);

app.use("/api", (req, res) => res.status(404).json({ error: "Not found" }));
app.use(errorHandler);

export default app;
