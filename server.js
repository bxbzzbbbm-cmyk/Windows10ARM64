const express = require('express');
const app = express();
const PORT = 5900;

// Middleware
app.use(express.json());

// VPN State Management
let vpnState = {
  connected: false,
  currentCountry: null,
  currentIP: '0.0.0.0',
  vpnIP: null,
  connectedAt: null
};

// Available countries with their VPN IP ranges
const vpnCountries = {
  'US': {
    name: 'United States',
    baseIP: '192.168.1',
    ips: ['192.168.1.10', '192.168.1.11', '192.168.1.12']
  },
  'UK': {
    name: 'United Kingdom',
    baseIP: '192.168.2',
    ips: ['192.168.2.10', '192.168.2.11', '192.168.2.12']
  },
  'CA': {
    name: 'Canada',
    baseIP: '192.168.3',
    ips: ['192.168.3.10', '192.168.3.11', '192.168.3.12']
  },
  'DE': {
    name: 'Germany',
    baseIP: '192.168.4',
    ips: ['192.168.4.10', '192.168.4.11', '192.168.4.12']
  },
  'JP': {
    name: 'Japan',
    baseIP: '192.168.5',
    ips: ['192.168.5.10', '192.168.5.11', '192.168.5.12']
  },
  'AU': {
    name: 'Australia',
    baseIP: '192.168.6',
    ips: ['192.168.6.10', '192.168.6.11', '192.168.6.12']
  }
};

// Helper function to get random IP from country
function getRandomIP(countryCode) {
  const ips = vpnCountries[countryCode].ips;
  return ips[Math.floor(Math.random() * ips.length)];
}

// Helper function to get local machine IP
function getLocalIP() {
  const os = require('os');
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

// ===== API ENDPOINTS =====

/**
 * GET /list
 * Returns list of available countries and their VPN servers
 */
app.get('/list', (req, res) => {
  const countries = Object.entries(vpnCountries).map(([code, data]) => ({
    code: code,
    name: data.name,
    baseIP: data.baseIP,
    servers: data.ips.length
  }));

  res.json({
    success: true,
    message: 'Available VPN countries',
    data: countries
  });
});

/**
 * POST /connect
 * Connect to VPN with specified country
 * Body: { "country": "US" }
 */
app.post('/connect', (req, res) => {
  const { country } = req.body;

  if (!country || !vpnCountries[country]) {
    return res.status(400).json({
      success: false,
      error: `Invalid country code. Available countries: ${Object.keys(vpnCountries).join(', ')}`
    });
  }

  if (vpnState.connected) {
    return res.status(409).json({
      success: false,
      error: 'Already connected to VPN. Disconnect first.',
      currentCountry: vpnState.currentCountry
    });
  }

  const vpnIP = getRandomIP(country);
  vpnState = {
    connected: true,
    currentCountry: country,
    currentIP: vpnIP,
    vpnIP: vpnIP,
    connectedAt: new Date()
  };

  res.json({
    success: true,
    message: `Successfully connected to VPN - ${vpnCountries[country].name}`,
    data: {
      country: country,
      countryName: vpnCountries[country].name,
      vpnIP: vpnIP,
      status: 'connected',
      timestamp: vpnState.connectedAt
    }
  });
});

/**
 * POST /disconnect
 * Disconnect from VPN
 */
app.post('/disconnect', (req, res) => {
  if (!vpnState.connected) {
    return res.status(409).json({
      success: false,
      error: 'Not currently connected to VPN'
    });
  }

  const previousCountry = vpnState.currentCountry;
  const previousIP = vpnState.vpnIP;

  vpnState = {
    connected: false,
    currentCountry: null,
    currentIP: '0.0.0.0',
    vpnIP: null,
    connectedAt: null
  };

  res.json({
    success: true,
    message: 'Successfully disconnected from VPN',
    data: {
      previousCountry: previousCountry,
      previousIP: previousIP,
      status: 'disconnected'
    }
  });
});

/**
 * GET /getip
 * Get current IP address (local or VPN)
 */
app.get('/getip', (req, res) => {
  const localIP = getLocalIP();

  res.json({
    success: true,
    message: 'Current IP information',
    data: {
      vpnConnected: vpnState.connected,
      localIP: localIP,
      vpnIP: vpnState.vpnIP || 'Not connected',
      currentCountry: vpnState.currentCountry || 'None',
      countryName: vpnState.currentCountry ? vpnCountries[vpnState.currentCountry].name : 'N/A',
      connectedAt: vpnState.connectedAt || null
    }
  });
});

/**
 * GET /status
 * Get current VPN connection status
 */
app.get('/status', (req, res) => {
  res.json({
    success: true,
    message: 'VPN Status',
    data: {
      connected: vpnState.connected,
      currentCountry: vpnState.currentCountry,
      countryName: vpnState.currentCountry ? vpnCountries[vpnState.currentCountry].name : null,
      vpnIP: vpnState.vpnIP,
      connectedAt: vpnState.connectedAt,
      uptime: vpnState.connected ? Math.floor((Date.now() - vpnState.connectedAt) / 1000) + 's' : null
    }
  });
});

/**
 * GET /health
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date()
  });
});

// Error handling middleware
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Endpoint not found: ${req.method} ${req.path}`,
    availableEndpoints: [
      'GET /health',
      'GET /list',
      'GET /getip',
      'GET /status',
      'POST /connect',
      'POST /disconnect'
    ]
  });
});

// Start server
app.listen(PORT, '127.0.0.1', () => {
  console.log(`🚀 VPN API Server running on http://127.0.0.1:${PORT}`);
  console.log(`📡 Available endpoints:`);
  console.log(`   GET  /health          - Health check`);
  console.log(`   GET  /list            - List available VPN countries`);
  console.log(`   GET  /getip           - Get current IP information`);
  console.log(`   GET  /status          - Get VPN connection status`);
  console.log(`   POST /connect         - Connect to VPN (body: {"country": "US"})`);
  console.log(`   POST /disconnect      - Disconnect from VPN`);
});
