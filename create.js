// create.js
// Express API that provides endpoints for creating/listing mock instances and for keeping VPS instances alive.
// Endpoints:
//  - POST /api/create            -> create a new instance (mock)
//  - GET  /api/list              -> list created instances
//  - GET  /api/list-images       -> list available images
//  - GET  /api/list-os           -> list OS images
//  - GET  /api/list-boot         -> list boot disk images
//  - GET  /api/list-ubuntu       -> list Ubuntu versions
//  - GET  /api/list-ssh          -> list SSH settings (default port 22)
//  - GET  /api/get-ip/:id        -> get instance IP by id
// Notes:
//  - This is a template/mock implementation. Replace the mock creation logic with calls to your cloud provider API/CLI.
//  - To keep instances "alive" this script attempts a TCP connect to the instance's SSH port on an interval.

const express = require('express');
const bodyParser = require('body-parser');
const net = require('net');

const app = express();
app.use(bodyParser.json());

// In-memory instance store (id -> { id, ip, image, os, boot, ubuntu, sshPort, username, password, createdAt })
const instances = new Map();

// Keep-alive configuration
const KEEPALIVE_INTERVAL_MS = process.env.KEEPALIVE_INTERVAL_MS ? parseInt(process.env.KEEPALIVE_INTERVAL_MS, 10) : 60_000; // 60s default
const KEEPALIVE_TIMEOUT_MS = process.env.KEEPALIVE_TIMEOUT_MS ? parseInt(process.env.KEEPALIVE_TIMEOUT_MS, 10) : 5_000; // 5s

// Mock lists (replace with provider queries)
const mockImages = [
  { id: 'img-w10arm64-1', name: 'Windows10-ARM64-Base' },
  { id: 'img-ubuntu-2204', name: 'Ubuntu-22.04-Cloud' }
];
const mockOS = [ 'windows-10-arm64', 'ubuntu' ];
const mockBootDisks = [ { id: 'boot-1', name: 'Standard Boot Disk 50GB' }, { id: 'boot-2', name: 'Premium Boot Disk 100GB' } ];
const mockUbuntuVersions = [ '18.04', '20.04', '22.04', '24.04' ];
const mockSSH = { port: 22 };

// Utility: generate simple id
function genId() {
  return 'ins-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
}

// Utility: generate a reserved TEST IP (RFC 5737 range 192.0.2.0/24)
let _mockIpCounter = 10;
function genMockIp() {
  _mockIpCounter = (_mockIpCounter + 1) % 250;
  return `192.0.2.${_mockIpCounter}`;
}

// Keep-alive: try to open a TCP connection to keep NAT/firewall state active
function keepAliveOnce(instance) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let completed = false;
    const onDone = (ok, err) => {
      if (completed) return;
      completed = true;
      try { socket.destroy(); } catch (e) {}
      resolve({ ok, err: err ? String(err) : null });
    };
    socket.setTimeout(KEEPALIVE_TIMEOUT_MS);
    socket.once('connect', () => onDone(true, null));
    socket.once('timeout', () => onDone(false, new Error('timeout')));
    socket.once('error', (err) => onDone(false, err));
    socket.connect(instance.sshPort || 22, instance.ip);
  });
}

// Periodic keep-alive loop
setInterval(() => {
  for (const inst of instances.values()) {
    // Only attempt keepalive if instance has an ip
    if (!inst.ip) continue;
    keepAliveOnce(inst).then((res) => {
      inst.lastKeepAlive = { at: new Date().toISOString(), success: res.ok, error: res.err };
      // Optional: log successes/failures
      if (!res.ok) {
        console.warn(`keepalive failed for ${inst.id}@${inst.ip}:${inst.sshPort} -> ${res.err}`);
      }
    }).catch((e) => {
      inst.lastKeepAlive = { at: new Date().toISOString(), success: false, error: String(e) };
    });
  }
}, KEEPALIVE_INTERVAL_MS);

// API: list generic images
app.get('/api/list-images', (req, res) => {
  res.json(mockImages);
});

app.get('/api/list-os', (req, res) => {
  res.json(mockOS);
});

app.get('/api/list-boot', (req, res) => {
  res.json(mockBootDisks);
});

app.get('/api/list-ubuntu', (req, res) => {
  res.json(mockUbuntuVersions);
});

app.get('/api/list-ssh', (req, res) => {
  res.json(mockSSH);
});

// Create a new instance (mock). Replace with provider API calls.
// Expected body: { image, os, boot, ubuntu, sshPort, username, password }
app.post('/api/create', (req, res) => {
  const { image, os, boot, ubuntu, sshPort = 22, username = 'ubuntu', password } = req.body || {};
  // Basic validation
  if (!image || !os) {
    return res.status(400).json({ error: 'image and os are required' });
  }
  const id = genId();
  const ip = genMockIp();
  const now = new Date().toISOString();
  const inst = { id, ip, image, os, boot, ubuntu, sshPort, username, password: password || null, createdAt: now };
  instances.set(id, inst);
  // Immediately attempt a first keepalive
  keepAliveOnce(inst).then((r) => inst.lastKeepAlive = { at: new Date().toISOString(), success: r.ok, error: r.err }).catch(() => {});
  res.status(201).json({ id, ip });
});

// List created instances
app.get('/api/list', (req, res) => {
  const arr = Array.from(instances.values());
  res.json(arr);
});

// Get IP for an instance
app.get('/api/get-ip/:id', (req, res) => {
  const id = req.params.id;
  if (!instances.has(id)) return res.status(404).json({ error: 'not found' });
  const inst = instances.get(id);
  res.json({ id: inst.id, ip: inst.ip, sshPort: inst.sshPort, lastKeepAlive: inst.lastKeepAlive || null });
});

// Simple health
app.get('/api/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`create.js API server listening on port ${PORT}`);
});

// Export for testing
module.exports = app;
