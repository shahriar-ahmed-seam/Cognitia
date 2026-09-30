// Load .env before any other module reads process.env at import time
import "dotenv/config";
import http from "http";
import cron from "node-cron";
import { parse } from "url";
import app from "./app.js";
import { autoSubmitExpiredTests } from "./jobs/autoSubmit.js";
import { connectDatabase } from "./lib/database.js";
import { processGradingQueue } from "./modules/ai/queue.js";
import { runContestLifecycle } from "./modules/contests/service.js";
import wss from "./notificationSocket.js";

const PORT = process.env.PORT;

cron.schedule("* * * * *", async () => {
  try {
    await autoSubmitExpiredTests();
  } catch (err) {
    console.error("Error auto-submitting test attempts:", err);
  }
  try {
    // Contest reminders, start notices, expired attempts, finalization and auto-publishing
    await runContestLifecycle();
  } catch (err) {
    console.error("Contest lifecycle job failed:", err);
  }
  // AI grading can take most of a minute, so it runs on its own without blocking the next tick
  processGradingQueue().catch((err) => console.error("AI grading queue failed:", err));
});

// Create HTTP server (for Express + WebSocket)
const server = http.createServer(app);

// WebSocket upgrade handling
server.on("upgrade", (req, socket, head) => {
  // For now, userId is passed as a query param (?userId=...)
  const { query } = parse(req.url, true);
  const userId = query.userId;
  if (!userId) {
    socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit("connection", ws, req, userId);
  });
});

// Connect DB then start server
connectDatabase()
  .then(() => {
    console.log("✅ Database connected successfully");
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🔗 API base URL: http://localhost:${PORT}/api`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
    });
  })
  .catch((err) => {
    console.error("❌ Database connection failed:", err);
    process.exit(1); // Exit if database connection fails
  });

export default app;
