/**
 * routes/market.js — Market insights (public endpoint)
 * GET /api/market/insights — Returns simulated energy market data
 * Production: integrate with POWER-UP / NRLDC live APIs.
 */
const express = require('express');
const router  = express.Router();

router.get('/insights', (req, res) => {
  return res.json({
    energy_prices: [
      { type: 'Solar',    price: 2.85, change: 0.05,  change_pct: 1.79,  unit: '₹/kWh', trend: 'up'   },
      { type: 'Wind',     price: 3.12, change: -0.08, change_pct: -2.50, unit: '₹/kWh', trend: 'down' },
      { type: 'Hydro',    price: 2.45, change: 0.02,  change_pct: 0.82,  unit: '₹/kWh', trend: 'up'   },
      { type: 'Thermal',  price: 4.20, change: 0.15,  change_pct: 3.70,  unit: '₹/kWh', trend: 'up'   },
      { type: 'Green H2', price: 5.80, change: -0.22, change_pct: -3.65, unit: '₹/kWh', trend: 'down' },
    ],
    carbon: {
      ccts_price: 245.50, ccts_change: 12.30, ccts_change_pct: 5.27, unit: '₹/tCO2e',
      eu_cbam: 68.50, eu_cbam_change: 1.20, eu_cbam_unit: 'EUR/tCO2e',
      india_budget_crore: 20000, trading_scheme: 'CCTS',
    },
    market_stats: {
      active_rfqs_india: 142, registered_vendors: 523,
      total_mw_traded: 8540, avg_bid_response_hours: 36, yoy_growth_pct: 34,
    },
    price_history: [
      { month: 'Aug', solar: 3.10, wind: 3.35, carbon: 210 },
      { month: 'Sep', solar: 3.05, wind: 3.28, carbon: 218 },
      { month: 'Oct', solar: 2.98, wind: 3.22, carbon: 225 },
      { month: 'Nov', solar: 2.92, wind: 3.18, carbon: 232 },
      { month: 'Dec', solar: 2.88, wind: 3.15, carbon: 238 },
      { month: 'Jan', solar: 2.85, wind: 3.12, carbon: 245 },
    ],
  });
});

module.exports = router;
