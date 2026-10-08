const express = require("express");
const cors = require("cors");

const app = express();

const PORT = process.env.PORT || 3000;

app.use(cors());

app.get("/api/ping", (req, res) => {
    res.json({
        success: true,
        timestamp: Date.now()
    });
});

app.get("/api/download", (req, res) => {
    const sizeMB = 25;
    const size = sizeMB * 1024 * 1024;

    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Length", size);
    res.setHeader("Cache-Control", "no-store");

    const chunk = Buffer.alloc(1024 * 1024);

    let remaining = size;

    function sendChunk() {
        while (remaining > 0) {
            const currentSize = Math.min(chunk.length, remaining);

            const canContinue = res.write(
                chunk.subarray(0, currentSize)
            );

            remaining -= currentSize;

            if (!canContinue) {
                res.once("drain", sendChunk);
                return;
            }
        }

        res.end();
    }

    sendChunk();
});

app.post(
    "/api/upload",
    express.raw({
        type: "*/*",
        limit: "100mb"
    }),
    (req, res) => {

        const received = req.body
            ? req.body.length
            : 0;

        res.json({
            success: true,
            bytesReceived: received
        });
    }
);
app.get("/api/health", (req, res) => {
    res.json({
        status: "online",
        service: "NetTest",
        time: new Date().toISOString()
    });
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`NetTest server running on port ${PORT}`);
});
