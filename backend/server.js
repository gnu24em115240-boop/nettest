const express = require("express");
const cors = require("cors");

const app = express();

const PORT = process.env.PORT || 3000;
const UPLOAD_LIMIT = process.env.UPLOAD_LIMIT || "50mb";

// Security headers
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Content-Security-Policy", "default-src 'self'");
  next();
});

// CORS configuration
app.use(
  cors({
    origin: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
    maxAge: 600,
  })
);

app.use(express.json({ limit: UPLOAD_LIMIT }));

// Health endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "online",
    service: "NetTest",
    time: new Date().toISOString(),
  });
});

// Ping endpoint
app.get("/api/ping", (req, res) => {
  res.json({
    success: true,
    timestamp: Date.now(),
  });
});

// Download endpoint - stream a fixed-size buffer
app.get("/api/download", (req, res) => {
  const sizeMB = 25;
  const size = sizeMB * 1024 * 1024;

  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Content-Length", size);
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  const chunk = Buffer.alloc(1024 * 1024);
  let remaining = size;

  function sendChunk() {
    if (res.headersSent && !res.writableEnded) {
      while (remaining > 0) {
        const currentSize = Math.min(chunk.length, remaining);
        const canContinue = res.write(chunk.subarray(0, currentSize));
        remaining -= currentSize;

        if (!canContinue) {
          res.once("drain", sendChunk);
          return;
        }
      }
      res.end();
    }
  }

  // Abort on client disconnect
  req.on("close", () => {
    if (!res.writableEnded) {
      res.end();
    }
  });

  sendChunk();
});

// Upload endpoint - requires at least 1 byte of data
app.post(
  "/api/upload",
  express.raw({
    type: "application/octet-stream",
    limit: UPLOAD_LIMIT,
  }),
  (req, res) => {
    let received = 0;

    // req.body is a Buffer when express.raw parses it
    // Express 5 creates an empty buffer even for 0-byte uploads, so check length explicitly
    if (req.body && Buffer.isBuffer(req.body) && req.body.length > 0) {
      received = req.body.length;
    }

    // Reject empty uploads - must have data
    if (received === 0) {
      return res.status(400).json({ success: false, error: "No data received" });
    }

    res.json({
      success: true,
      bytesReceived: received,
    });
  }
);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Request error:", err.message);
  if (err.type === "entity.too.large") {
    return res.status(413).json({ success: false, error: "Request too large" });
  }
  res.status(500).json({ success: false, error: "Internal server error" });
});

// Catch-all 404 handler - this runs for any unmatched route
app.use((req, res) => {
  res.type("json");
  res.status(404).json({ success: false, error: "Not found" });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`NetTest server running on port ${PORT}`);
});
