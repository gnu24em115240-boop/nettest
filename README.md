# NetTest

**Internet Speed & Network Diagnostics**

NetTest is a free, open-source web application for testing internet speed and performing network diagnostics. It measures download speed, upload speed, ping, jitter, and connection quality using a Node.js backend.

![NetTest Screenshot](https://nettest.app/og-image.png)

## Features

### Speed Testing
- **Download Speed** — Measures actual download throughput from the server
- **Upload Speed** — Measures actual upload throughput to the server
- **Ping** — Measures round-trip latency to the server
- **Jitter** — Calculates latency variation across multiple samples
- **Connection Quality Score** — Composite score based on all metrics

### Network Diagnostics
- DNS resolution status
- IPv6 availability detection
- Network information (via browser APIs)
- Packet loss approximation
- CDN connectivity test
- Connection stability analysis
- Server latency measurement

### User Experience
- Modern dark theme interface
- Fully responsive design (desktop, tablet, mobile)
- Animated progress indicators
- Accessible markup with ARIA labels
- Graceful error handling
- Abortable tests

## Technology Stack

### Frontend
- **React 19** — UI framework
- **Vite 8** — Build tool & dev server
- **Vanilla CSS** — No external CSS libraries
- **ESLint** — Code linting

### Backend
- **Node.js** — Runtime
- **Express 5** — Web framework
- **CORS** — Cross-origin resource sharing

## Folder Structure

```
NetTest/
├── frontend/
│   ├── public/
│   │   ├── favicon.svg       # Custom SVG favicon
│   │   ├── robots.txt        # SEO robots
│   │   └── sitemap.xml       # SEO sitemap
│   ├── src/
│   │   ├── api.js            # API service layer
│   │   ├── App.jsx           # Main application component
│   │   ├── App.css           # Application styles
│   │   ├── index.css         # Global styles
│   │   └── main.jsx          # React entry point
│   ├── .env.example          # Frontend environment variables example
│   ├── index.html            # HTML entry point with SEO meta tags
│   ├── vite.config.js        # Vite configuration
│   ├── package.json          # Dependencies
│   └── eslint.config.js      # ESLint configuration
├── backend/
│   ├── server.js             # Express server
│   ├── .env.example          # Backend environment variables example
│   ├── package.json          # Dependencies
│   └── osexp1.py             # (empty - placeholder)
├── .gitignore                # Git ignore rules
└── README.md                 # This file
```

## Local Setup

### Prerequisites
- Node.js 18 or later
- npm (or yarn/pnpm)

### 1. Install Dependencies

```bash
# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install
```

### 2. Configure Environment

Copy the example environment files and customize as needed:

```bash
# Backend
cd backend
cp .env.example .env

# Frontend
cd ../frontend
cp .env.example .env
```

#### Backend Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `UPLOAD_LIMIT` | `50mb` | Maximum upload size |

#### Frontend Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | (empty) | Backend API URL. Leave empty for local dev (uses Vite proxy) |
| `VITE_PORT` | `5173` | Dev server port |

### 3. Run the Application

#### Development (both running)

Terminal 1 — Backend:
```bash
cd backend
npm run dev
```

Terminal 2 — Frontend:
```bash
cd frontend
npm run dev
```

Open http://localhost:5173 in your browser.

#### Production Build

```bash
# Build the frontend
cd frontend
npm run build

# Serve the built files (requires a static file server)
npm run preview
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/ping` | Ping timestamp (for latency measurement) |
| `GET` | `/api/download` | Stream for download speed test |
| `POST` | `/api/upload` | Upload endpoint for upload speed test |

### Response Examples

**Health**
```json
{
  "status": "online",
  "service": "NetTest",
  "time": "2026-10-08T12:00:00.000Z"
}
```

**Ping**
```json
{
  "success": true,
  "timestamp": 1728398400000
}
```

**Download**
- Streams 25 MB of data as `application/octet-stream`
- Headers: `Cache-Control: no-store`, `Content-Length: 26214400`

**Upload**
```json
{
  "success": true,
  "bytesReceived": 10485760
}
```

## Deployment

### Backend Deployment

The backend is a standard Express server. Deploy it to any Node.js hosting platform:

- **Render** — Set `PORT` environment variable
- **Railway** — Set `PORT` environment variable  
- **Heroku** — Set `PORT` environment variable (Heroku sets this automatically)
- **VPS** — Run with `npm start`, set `PORT` as needed

Example production environment:
```bash
PORT=3000
UPLOAD_LIMIT=50mb
NODE_ENV=production
```

### Frontend Deployment

The frontend builds to static files in `frontend/dist/`. Deploy these to any static hosting:

#### Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd frontend
vercel --prod
```

Set environment variables in Vercel dashboard:
- `VITE_API_URL` = `https://your-backend-url.com`

#### Netlify
1. Build: `npm run build`
2. Publish directory: `dist`
3. Set environment variable `VITE_API_URL` in Netlify dashboard

#### Cloudflare Pages
1. Build: `npm run build`
2. Build output directory: `dist`
3. Set environment variable `VITE_API_URL`

#### Nginx (self-hosted)

```nginx
server {
    listen 80;
    server_name nettest.app;

    location / {
        root /var/www/nettest/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Environment Variables for Production

When deploying, set:

1. **Frontend `VITE_API_URL`** — The URL of your deployed backend
2. **Backend `PORT`** — The port your backend listens on (hosting platforms usually set this)

## Browser Compatibility

NetTest works best in modern browsers:
- Chrome 90+
- Firefox 88+
- Safari 15+
- Edge 90+

### Known Limitations

1. **Speed Test Accuracy** — Browser-based speed tests are estimates. Results can vary due to:
   - Network congestion
   - Server distance
   - Device performance
   - Browser limitations
   - Background processes

2. **WebRTC Diagnostics** — Full WebRTC peer connection stats require user media permissions. NetTest uses the Network Information API where available.

3. **IPv6 Detection** — IPv6 availability is detected by attempting to reach IPv6-enabled endpoints. Some networks may route IPv6 through IPv4.

4. **Packet Loss** — Approximated through repeated HTTP requests. Not as accurate as ICMP-based tools.

5. **Network Information API** — Only available in Chromium-based browsers. Other browsers show "Not available".

## Security

- CORS configured to allow requests from any origin (required for public use)
- Upload size limited (default: 50 MB)
- Security headers set (X-Content-Type-Options, X-Frame-Options, etc.)
- No secrets in source code
- Request validation on all endpoints
- Reject empty uploads (must have data)

### Known Express 5 Limitations

- **404 responses**: Express 5 sends its own HTML 404 page for unmatched routes before custom middleware runs. This is a framework limitation, not a security issue.
- **Empty uploads**: Express 5's `express.raw()` parser creates an empty buffer for 0-byte uploads. The backend rejects these, but if Content-Length is explicitly set to 0, Express may still parse it.

## License

MIT License — see LICENSE file for details.

## Contributing

Contributions are welcome! Please open an issue or pull request.

## Support

For issues, questions, or feedback, please open an issue in the repository.
