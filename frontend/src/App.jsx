import { useState, useEffect, useRef } from "react";
import "./App.css";
import * as api from "./api";

// ==================== Constants ====================

const PING_SAMPLES = 5;
const PACKET_LOSS_SAMPLES = 10;
const STABILITY_SAMPLES = 5;
// ==================== Utility Functions ====================

function calculateJitter(times) {
  if (times.length < 2) return 0;
  let variation = 0;
  for (let i = 1; i < times.length; i++) {
    variation += Math.abs(times[i] - times[i - 1]);
  }
  return Math.round(variation / (times.length - 1));
}

function calculatePacketLoss(results) {
  const failed = results.filter((r) => r === null).length;
  return Math.round((failed / results.length) * 100);
}

function calculateConnectionQuality(download, upload, ping) {
  if (download === null || upload === null || ping === null) return null;

  let score = 0;

  // Download score (0-40 points)
  if (download >= 100) score += 40;
  else if (download >= 50) score += 30;
  else if (download >= 20) score += 20;
  else if (download >= 10) score += 10;
  else if (download > 0) score += 5;

  // Upload score (0-30 points)
  if (upload >= 50) score += 30;
  else if (upload >= 20) score += 20;
  else if (upload >= 10) score += 10;
  else if (upload > 0) score += 5;

  // Ping score (0-30 points)
  if (ping <= 20) score += 30;
  else if (ping <= 50) score += 20;
  else if (ping <= 100) score += 10;
  else if (ping <= 200) score += 5;
  else score += 0;

  return Math.min(100, Math.round(score));
}

function getQualityLabel(score) {
  if (score === null) return "—";
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Fair";
  if (score >= 20) return "Poor";
  return "Very Poor";
}

function getQualityColor(score) {
  if (score === null) return "var(--text-muted)";
  if (score >= 80) return "var(--success)";
  if (score >= 60) return "#60a5fa";
  if (score >= 40) return "var(--warning)";
  if (score >= 20) return "#fb923c";
  return "var(--error)";
}

// ==================== Component ====================

// ==================== DiagnosticCard Component ====================

function DiagnosticCard({ title, icon, diagnosticsKey, diagnostics }) {
  const diag = diagnostics[diagnosticsKey];
  let statusIcon;
  let statusClass;

  if (diag.status === "pending") {
    statusIcon = "⏳";
    statusClass = "status-pending";
  } else if (diag.status === "running") {
    statusIcon = "🔄";
    statusClass = "status-running";
  } else if (diag.status === "success") {
    statusIcon = "✓";
    statusClass = "status-success";
  } else if (diag.status === "info") {
    statusIcon = "ℹ";
    statusClass = "status-info";
  } else {
    statusIcon = "✗";
    statusClass = "status-error";
  }

  return (
    <div className="diagnostic-card">
      <div className="diagnostic-header">
        <span className="diagnostic-icon" aria-hidden="true">{icon}</span>
        <span className={`status-badge ${statusClass}`}>{statusIcon}</span>
      </div>
      <h3 className="diagnostic-title">{title}</h3>
      <p className="diagnostic-details">{diag.details}</p>
      {diag.value !== null && diag.value !== undefined && (
        <span className="diagnostic-value">{diag.value}</span>
      )}
    </div>
  );
}

// ==================== Main App Component ====================

function App() {
  // Test state
  const [testing, setTesting] = useState(false);
  const [testError, setTestError] = useState(null);
  const [testAborted, setTestAborted] = useState(false);

  // Speed test results
  const [ping, setPing] = useState(null);
  const [jitter, setJitter] = useState(null);
  const [download, setDownload] = useState(null);
  const [upload, setUpload] = useState(null);
  const [qualityScore, setQualityScore] = useState(null);

  // Diagnostics state
  const [diagnostics, setDiagnostics] = useState({
    dns: { status: "pending", details: "" },
    ipv6: { status: "pending", details: "" },
    webrtc: { status: "pending", details: "" },
    packetLoss: { status: "pending", value: null, details: "" },
    cdn: { status: "pending", details: "" },
    stability: { status: "pending", value: null, details: "" },
    latency: { status: "pending", value: null, details: "" },
  });

  const abortControllerRef = useRef(null);
  const [progress, setProgress] = useState(0);

  // ==================== Diagnostics ====================

  // Run diagnostics on mount
  useEffect(() => {
    (async () => {
      const results = {
        dns: { status: "running", details: "" },
        ipv6: { status: "running", details: "" },
        webrtc: { status: "running", details: "" },
        packetLoss: { status: "running", value: null, details: "" },
        cdn: { status: "running", details: "" },
        stability: { status: "running", value: null, details: "" },
        latency: { status: "running", value: null, details: "" },
      };
      setDiagnostics(results);

      // DNS check
      try {
        await Promise.all([
          fetch("https://dns.google", { mode: "no-cors", cache: "no-store" })
            .then(() => "reachable"),
          fetch("https://1.1.1.1", { mode: "no-cors", cache: "no-store" })
            .then(() => "reachable"),
        ]);
        results.dns = { status: "success", details: "DNS resolution working" };
      } catch {
        results.dns = { status: "error", details: "DNS check unavailable" };
      }

      // IPv6 check
      try {
        const ipv6Supported = await fetch("https://ipv6.google.com", {
          mode: "no-cors",
          cache: "no-store",
        }).then(() => true).catch(() => false);
        results.ipv6 = ipv6Supported
          ? { status: "success", details: "IPv6 available" }
          : { status: "info", details: "IPv6 not detected" };
      } catch {
        results.ipv6 = { status: "info", details: "Not available in this browser" };
      }

      // WebRTC info
      try {
        const conn = navigator.connection || navigator.mobileConnection;
        if (conn) {
          const type = conn.effectiveType || "unknown";
          const downlink = conn.downlink ? `${conn.downlink} Mbps` : "N/A";
          const rtt = conn.rtt ? `${conn.rtt} ms` : "N/A";
          results.webrtc = {
            status: "success",
            details: `Connection: ${type}, Est. downlink: ${downlink}, RTT: ${rtt}`,
          };
        } else {
          results.webrtc = { status: "info", details: "Network info API not available" };
        }
      } catch {
        results.webrtc = { status: "info", details: "Not available in this browser" };
      }

      // Packet loss test
      try {
        const resultsArr = [];
        for (let i = 0; i < PACKET_LOSS_SAMPLES; i++) {
          try {
            await api.pingOnce();
            resultsArr.push(1);
          } catch {
            resultsArr.push(null);
          }
        }
        const loss = calculatePacketLoss(resultsArr);
        results.packetLoss = {
          status: "success",
          value: loss,
          details: loss === 0 ? "No packet loss detected" : `${loss}% packet loss`,
        };
      } catch {
        results.packetLoss = { status: "error", value: null, details: "Test failed" };
      }

      // CDN/connectivity test
      try {
        await Promise.all([
          fetch("https://cloudflare.com", { cache: "no-store", mode: "no-cors" }),
          fetch("https://google.com", { cache: "no-store", mode: "no-cors" }),
        ]);
        results.cdn = { status: "success", details: "CDN connectivity OK" };
      } catch {
        results.cdn = { status: "error", details: "CDN test failed" };
      }

      // Stability test
      try {
        const times = [];
        for (let i = 0; i < STABILITY_SAMPLES; i++) {
          const start = performance.now();
          await api.pingOnce();
          times.push(performance.now() - start);
          await new Promise((r) => setTimeout(r, 200));
        }
        const jitter = calculateJitter(times);
        results.stability = {
          status: "success",
          value: jitter,
          details: jitter < 10 ? "Stable connection" : jitter < 30 ? "Some variation" : "Unstable connection",
        };
      } catch {
        results.stability = { status: "error", value: null, details: "Test failed" };
      }

      // Latency
      try {
        const times = [];
        for (let i = 0; i < PING_SAMPLES; i++) {
          const start = performance.now();
          await api.pingOnce();
          times.push(performance.now() - start);
        }
        const avgLatency = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
        results.latency = {
          status: "success",
          value: avgLatency,
          details: `Average server latency: ${avgLatency} ms`,
        };
      } catch {
        results.latency = { status: "error", value: null, details: "Test failed" };
      }

      setDiagnostics(results);
    })();
  }, []);

  // ==================== Speed Test Functions ====================

  async function measurePing() {
    const times = [];
    for (let i = 0; i < PING_SAMPLES; i++) {
      if (abortControllerRef.current?.signal.aborted) throw new Error("aborted");
      const start = performance.now();
      await api.pingOnce();
      const end = performance.now();
      times.push(end - start);
    }
    return {
      ping: Math.round(times.reduce((a, b) => a + b, 0) / times.length),
      jitter: calculateJitter(times),
    };
  }

  async function measureDownload() {
    const startTime = performance.now();
    const controller = new AbortController();
    const response = await api.downloadStream({
      signal: controller.signal,
    });

    const reader = response.body.getReader();
    let totalBytes = 0;

    while (true) {
      if (abortControllerRef.current?.signal.aborted) {
        controller.abort();
        throw new Error("aborted");
      }
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.length;
    }

    const endTime = performance.now();
    const seconds = (endTime - startTime) / 1000;
    const megabits = (totalBytes * 8) / 1000000;
    return Math.round(megabits / seconds);
  }

  async function measureUpload() {
    const size = 10 * 1024 * 1024;
    const data = new Uint8Array(size);

    // Fill with pseudo-random but deterministic data
    for (let i = 0; i < size; i++) {
      data[i] = i % 256;
    }

    const startTime = performance.now();
    const result = await api.uploadData(data.buffer);
    const endTime = performance.now();

    const seconds = (endTime - startTime) / 1000;
    const megabits = (result.bytesReceived * 8) / 1000000;
    return Math.round(megabits / seconds);
  }

  // ==================== Main Test Function ====================

  async function startTest() {
    abortControllerRef.current = new AbortController();
    setTesting(true);
    setTestError(null);
    setTestAborted(false);
    setProgress(0);

    setPing(null);
    setJitter(null);
    setDownload(null);
    setUpload(null);
    setQualityScore(null);

    try {
      // Ping test
      setProgress(0.2);
      const pingResult = await measurePing();
      setPing(pingResult.ping);
      setJitter(pingResult.jitter);

      // Download test
      setProgress(0.5);
      const downloadResult = await measureDownload();
      setDownload(downloadResult);

      // Upload test
      setProgress(0.8);
      const uploadResult = await measureUpload();
      setUpload(uploadResult);

      // Quality score
      setProgress(1.0);
      const score = calculateConnectionQuality(downloadResult, uploadResult, pingResult.ping);
      setQualityScore(score);
    } catch (error) {
      if (error.message === "aborted") {
        setTestAborted(true);
      } else {
        setTestError(error.message || "Test failed. Please try again.");
        console.error("Speed test error:", error);
      }
    } finally {
      setTesting(false);
    }
  }

  function abortTest() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }

  // ==================== Render Helpers ====================

  function renderResult(value, formatFn, unit) {
    if (value === null) {
      return (
        <span className="result-empty" aria-label="Not tested yet">—</span>
      );
    }
    return (
      <span className="result-value" aria-label={`${formatFn(value)} ${unit}`}>
        {formatFn(value)} {unit}
      </span>
    );
  }

  // ==================== JSX ====================

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <h1 className="logo" aria-label="NetTest">
            <svg
              className="logo-icon"
              viewBox="0 0 32 32"
              fill="none"
              aria-hidden="true"
            >
              <rect width="32" height="32" rx="8" fill="var(--accent)" />
              <path
                d="M8 16h4l3-8 4 16 3-8h4"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="24" cy="8" r="3" fill="#34d399" />
            </svg>
            NetTest
          </h1>
          <p className="subtitle">
            Internet Speed & Network Diagnostics
          </p>
        </div>
      </header>

      <main className="main">
        {/* Speed Test Section */}
        <section className="speed-test-section" aria-label="Speed test">
          <div className="speed-card">
            {/* Gauge */}
            <div
              className="gauge"
              role="status"
              aria-label={`Download speed: ${download !== null ? `${download} Mbps` : "Not tested yet"}`}
            >
              <svg className="gauge-ring" viewBox="0 0 100 100" aria-hidden="true">
                <circle
                  className="gauge-bg"
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  strokeWidth="6"
                />
                <circle
                  className="gauge-progress"
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray="283"
                  strokeDashoffset={283 - (progress * 283)}
                />
              </svg>
              <div className="gauge-content">
                <span
                  className="speed-value"
                  aria-hidden={download === null}
                >
                  {download !== null ? download : "0"}
                </span>
                <span className="unit" aria-hidden="true">Mbps</span>
              </div>
            </div>

            {/* Action Button */}
            <div className="action-area">
              {testing ? (
                <button
                  className="btn btn-primary btn-testing"
                  onClick={abortTest}
                  aria-label="Stop the speed test"
                >
                  <span className="btn-icon" aria-hidden="true">⏹</span>
                  Stop Test
                </button>
              ) : (
                <button
                  className="btn btn-primary"
                  onClick={startTest}
                  disabled={testError !== null && !testing}
                  aria-label="Start the internet speed test"
                >
                  <span className="btn-icon" aria-hidden="true">▶</span>
                  Start Test
                </button>
              )}

              {testError && (
                <p className="error-message" role="alert">
                  {testError}
                </p>
              )}

              {testAborted && (
                <p className="info-message" role="status">
                  Test was stopped.
                </p>
              )}
            </div>

            {/* Stats Grid */}
            <div className="stats" role="list">
              <div className="stat-card" role="listitem">
                <span className="stat-icon" aria-hidden="true">↓</span>
                <div className="stat-content">
                  <span className="stat-label">Download</span>
                  <strong className="stat-value">
                    {renderResult(download, (v) => v, "")}
                  </strong>
                </div>
              </div>

              <div className="stat-card" role="listitem">
                <span className="stat-icon" aria-hidden="true">↑</span>
                <div className="stat-content">
                  <span className="stat-label">Upload</span>
                  <strong className="stat-value">
                    {renderResult(upload, (v) => v, "")}
                  </strong>
                </div>
              </div>

              <div className="stat-card" role="listitem">
                <span className="stat-icon" aria-hidden="true">◉</span>
                <div className="stat-content">
                  <span className="stat-label">Ping</span>
                  <strong className="stat-value">
                    {renderResult(ping, (v) => v, "ms")}
                  </strong>
                </div>
              </div>

              <div className="stat-card" role="listitem">
                <span className="stat-icon" aria-hidden="true">〽</span>
                <div className="stat-content">
                  <span className="stat-label">Jitter</span>
                  <strong className="stat-value">
                    {renderResult(jitter, (v) => v, "ms")}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* Quality Score */}
          <section className="quality-section" aria-label="Connection quality">
            <h2 className="quality-title">Connection Quality</h2>
            <div className="quality-display">
              <div
                className="quality-ring"
                style={{
                  borderColor: qualityScore !== null
                    ? getQualityColor(qualityScore)
                    : "var(--text-muted)",
                  transform: qualityScore !== null
                    ? `rotate(${qualityScore * 3.6}deg)`
                    : "none",
                }}
                aria-hidden="true"
              />
              <div className="quality-content">
                <span
                  className="quality-score"
                  style={{
                    color: qualityScore !== null
                      ? getQualityColor(qualityScore)
                      : "var(--text-muted)",
                  }}
                  aria-label={`Quality score: ${qualityScore !== null ? `${qualityScore} out of 100` : "Not tested"}`}
                >
                  {qualityScore !== null ? qualityScore : "—"}
                </span>
                <span className="quality-label">
                  {getQualityLabel(qualityScore)}
                </span>
              </div>
            </div>
            <p className="quality-note">
              Score based on download, upload, and ping performance.
            </p>
          </section>

          {/* Disclaimer */}
          <div className="disclaimer" role="note">
            <p>
              Browser-based speed tests can vary depending on your network,
              device performance, server distance, and browser capabilities.
              Results are estimates and may differ from other testing tools.
            </p>
          </div>
        </section>

        {/* Diagnostics Section */}
        <section className="diagnostics-section" aria-label="Network diagnostics">
          <h2 className="section-title">
            <span aria-hidden="true">🔍</span>
            Network Diagnostics
          </h2>
          <p className="section-subtitle">
            Real-time network analysis using browser APIs.
          </p>

          <div className="diagnostics-grid">
            <DiagnosticCard
              title="DNS Status"
              icon="🌐"
              diagnosticsKey="dns"
              diagnostics={diagnostics}
            />
            <DiagnosticCard
              title="IPv6 Availability"
              icon="🔗"
              diagnosticsKey="ipv6"
              diagnostics={diagnostics}
            />
            <DiagnosticCard
              title="Network Info"
              icon="📡"
              diagnosticsKey="webrtc"
              diagnostics={diagnostics}
            />
            <DiagnosticCard
              title="Packet Loss"
              icon="📦"
              diagnosticsKey="packetLoss"
              diagnostics={diagnostics}
            />
            <DiagnosticCard
              title="CDN Connectivity"
              icon="☁️"
              diagnosticsKey="cdn"
              diagnostics={diagnostics}
            />
            <DiagnosticCard
              title="Stability"
              icon="⚡"
              diagnosticsKey="stability"
              diagnostics={diagnostics}
            />
            <DiagnosticCard
              title="Server Latency"
              icon="⏱️"
              diagnosticsKey="latency"
              diagnostics={diagnostics}
            />
          </div>
        </section>
      </main>

      <footer className="footer">
        <p className="footer-text">
          NetTest • Free Internet Diagnostics
        </p>
        <p className="footer-note">
          Results are estimates and may vary based on network conditions.
        </p>
      </footer>
    </div>
  );
}

export default App;
