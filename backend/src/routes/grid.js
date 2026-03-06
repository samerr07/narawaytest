/**
 * routes/grid.js — 5G/6G Real-Time Grid Balancing (MOU Scope 1.1.f)
 * GET /api/grid/status — Returns simulated real-time grid telemetry
 *
 * Production: replace with WebSocket + SCADA/NLDC API integration via 5G/6G edge gateway.
 * Frontend polls every 2s to simulate low-latency data push.
 */
const express = require('express');
const router  = express.Router();
const { requireAuth } = require('../middleware/auth');

router.get('/status', requireAuth, (req, res) => {
  // Simulate slight frequency deviation from India nominal 50.0 Hz
  const freq    = parseFloat((50.0 + (Math.random() * 0.40 - 0.20)).toFixed(4));
  const latency = parseFloat((Math.random() * 0.67 + 0.28).toFixed(3));  // 0.28–0.95 ms
  const voltage = parseFloat((220.0 + (Math.random() * 6 - 3)).toFixed(2));

  const dev = Math.abs(freq - 50.0);
  const stability = dev < 0.10 ? 'stable' : dev < 0.25 ? 'warning' : 'critical';

  const solar   = Math.floor(Math.random() * 15) + 33;  // 33–48%
  const wind    = Math.floor(Math.random() * 10) + 24;  // 24–34%
  const hydro   = Math.floor(Math.random() * 7)  + 9;   // 9–16%
  const thermal = 100 - solar - wind - hydro;

  const nodes    = Math.floor(Math.random() * 18) + 120;
  const totalMW  = Math.floor(Math.random() * 800) + 4100;
  const now      = new Date().toISOString();

  const events = [
    { timestamp: now, severity: 'info',   message: `Grid frequency: ${freq} Hz — ${stability === 'stable' ? 'nominal' : 'deviation detected, balancing active'}` },
    { timestamp: now, severity: 'action', message: `5G/6G sync: ${nodes} edge nodes balanced across regional grid` },
    { timestamp: now, severity: 'info',   message: `Renewable mix: Solar ${solar}%, Wind ${wind}%, Hydro ${hydro}%` },
  ];
  if (stability !== 'stable') {
    events.unshift({ timestamp: now, severity: 'warning', message: `Frequency deviation ${freq.toFixed(3)} Hz — auto-balancing engaged via 5G control plane` });
  }

  const regions = [
    { name: 'North India', load_mw: Math.floor(Math.random()*400)+1200, load_pct: Math.floor(Math.random()*30)+58, nodes: Math.floor(Math.random()*8)+38 },
    { name: 'South India', load_mw: Math.floor(Math.random()*400)+1000, load_pct: Math.floor(Math.random()*30)+52, nodes: Math.floor(Math.random()*10)+30 },
    { name: 'West India',  load_mw: Math.floor(Math.random()*300)+900,  load_pct: Math.floor(Math.random()*30)+48, nodes: Math.floor(Math.random()*10)+26 },
    { name: 'East India',  load_mw: Math.floor(Math.random()*300)+700,  load_pct: Math.floor(Math.random()*30)+44, nodes: Math.floor(Math.random()*8)+22 },
  ];

  return res.json({
    frequency_hz: freq, voltage_kv: voltage, total_load_mw: totalMW,
    grid_stability: stability, latency_ms: latency, active_nodes: nodes,
    renewable_mix: { solar, wind, hydro, thermal },
    events, regions, timestamp: now,
  });
});

module.exports = router;
