import { useState } from "react";
import "./App.css";

function App() {
  const [testing, setTesting] = useState(false);
  const [ping, setPing] = useState("--");
  const [download, setDownload] = useState("--");
  const [upload, setUpload] = useState("--");
  const [jitter, setJitter] = useState("--");

  // Measure ping
  async function measurePing() {
    const times = [];

    for (let i = 0; i < 5; i++) {
      const start = performance.now();

      await fetch(
        `http://localhost:3000/api/ping?t=${Date.now()}-${i}`,
        {
          cache: "no-store",
        }
      );

      const end = performance.now();
      times.push(end - start);
    }

    const average =
      times.reduce((sum, value) => sum + value, 0) / times.length;

    let variation = 0;

    for (let i = 1; i < times.length; i++) {
      variation += Math.abs(times[i] - times[i - 1]);
    }

    variation /= times.length - 1;

    return {
      ping: Math.round(average),
      jitter: Math.round(variation),
    };
  }

  // Measure download speed
  async function measureDownload() {
    const start = performance.now();

    const response = await fetch(
      `http://localhost:3000/api/download?t=${Date.now()}`,
      {
        cache: "no-store",
      }
    );

    const data = await response.arrayBuffer();

    const end = performance.now();

    const seconds = (end - start) / 1000;
    const megabits = (data.byteLength * 8) / 1000000;

    return Math.round(megabits / seconds);
  }

  // Measure upload speed
  async function measureUpload() {
    const size = 10 * 1024 * 1024;

    const data = new Uint8Array(size);

    const start = performance.now();

    await fetch(
      `http://localhost:3000/api/upload?t=${Date.now()}`,
      {
        method: "POST",
        body: data,
      }
    );

    const end = performance.now();

    const seconds = (end - start) / 1000;
    const megabits = (size * 8) / 1000000;

    return Math.round(megabits / seconds);
  }

  // Start complete test
  async function startTest() {
    try {
      setTesting(true);

      setPing("...");
      setDownload("...");
      setUpload("...");
      setJitter("...");

      // Ping
      const pingResult = await measurePing();

      setPing(pingResult.ping);
      setJitter(pingResult.jitter);

      // Download
      const downloadResult = await measureDownload();

      setDownload(downloadResult);

      // Upload
      const uploadResult = await measureUpload();

      setUpload(uploadResult);

    } catch (error) {
      console.error(error);
      alert("Speed test failed. Make sure the backend is running.");
    }

    setTesting(false);
  }

  return (
    <div className="app">

      <header>
        <h1>NetTest</h1>
        <p>Internet Speed & Network Diagnostics</p>
      </header>

      <main>

        <section className="speed-card">

          <div className="gauge">

            <div className="speed-value">
              {download === "--" ? "0" : download}
            </div>

            <div className="unit">
              Mbps
            </div>

          </div>

          <button
            onClick={startTest}
            disabled={testing}
          >
            {testing ? "TESTING..." : "START TEST"}
          </button>


          <div className="stats">

            <div className="stat">
              <span>↓</span>

              <strong>
                {download === "--"
                  ? "--"
                  : `${download} Mbps`}
              </strong>

              <small>
                Download
              </small>
            </div>


            <div className="stat">
              <span>↑</span>

              <strong>
                {upload === "--"
                  ? "--"
                  : `${upload} Mbps`}
              </strong>

              <small>
                Upload
              </small>
            </div>


            <div className="stat">
              <span>◉</span>

              <strong>
                {ping === "--"
                  ? "--"
                  : `${ping} ms`}
              </strong>

              <small>
                Ping
              </small>
            </div>


            <div className="stat">
              <span>〽</span>

              <strong>
                {jitter === "--"
                  ? "--"
                  : `${jitter} ms`}
              </strong>

              <small>
                Jitter
              </small>
            </div>

          </div>

        </section>


        <section className="quality">

          <h2>
            Connection Quality
          </h2>

          <div className="quality-score">
            {testing ? "Testing..." : "—"}
          </div>

          <p>
            Run a test to analyze your connection.
          </p>

        </section>


        <section className="tools">

          <div>DNS Test</div>

          <div>IPv6 Test</div>

          <div>WebRTC Test</div>

          <div>Packet Loss</div>

          <div>CDN Test</div>

          <div>Stability Test</div>

        </section>

      </main>


      <footer>

        <p>
          NetTest • Free Internet Diagnostics
        </p>

      </footer>

    </div>
  );
}

export default App;