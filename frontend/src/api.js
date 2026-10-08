const API_BASE = import.meta.env.VITE_API_URL || "";

async function get(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Cache-Control": "no-store",
      Pragma: "no-cache",
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json();
}

async function stream(path, options = {}) {
  const url = `${API_BASE}${path}`;
  return fetch(url, {
    ...options,
    headers: {
      "Cache-Control": "no-store",
      Pragma: "no-cache",
      ...options.headers,
    },
  });
}

export async function checkHealth() {
  return get("/api/health");
}

export async function pingOnce() {
  const response = await get("/api/ping");
  return response.timestamp;
}

export async function downloadStream() {
  return stream("/api/download");
}

export async function uploadData(arrayBuffer) {
  const response = await fetch(`${API_BASE}/api/upload`, {
    method: "POST",
    body: arrayBuffer,
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status}`);
  }

  return response.json();
}

export function isBackendOnline() {
  return API_BASE.length > 0;
}
