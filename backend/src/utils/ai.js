/**
 * utils/ai.js — Claude Haiku AI integration
 *
 * MOU Scope 1.1.b: "AI-driven bid ranking and gap analysis engine"
 *
 * Uses Anthropic Claude Haiku (claude-haiku-4-5-20251001) — fast, cost-efficient,
 * ideal for structured JSON analysis tasks like bid ranking.
 *
 * Developer note (Naraway team):
 *   rankBids() is the only AI call in the platform. All prompts are structured to
 *   return valid JSON — the response is parsed and stored back to MongoDB per bid.
 *   If the AI call fails, a graceful fallback returns score=50 for all bids.
 */

const Anthropic = require('@anthropic-ai/sdk');
const logger    = require('./logger');

// Initialise Anthropic client — reads ANTHROPIC_API_KEY from env
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Model to use for all AI calls (as per project-wide haiku decision)
const AI_MODEL = 'claude-haiku-4-5-20251001';

/**
 * rankBids — AI-powered bid ranking and gap analysis.
 *
 * @param {Object} rfq  — Full RFQ document (quantity_mw, energy_type, price_ceiling, etc.)
 * @param {Array}  bids — Array of bid documents to evaluate
 * @returns {Object}    — { rankings: [{bid_id, score, strengths, gaps, recommendation}], summary, best_bid_id }
 */
async function rankBids(rfq, bids) {
  // Build concise prompt — Claude Haiku works best with clear, brief prompts
  const prompt = `You are an expert energy procurement analyst for India's B2B energy marketplace.

RFQ Requirements:
- Energy Type: ${rfq.energy_type}
- Quantity: ${rfq.quantity_mw} MW
- Price Ceiling: ₹${rfq.price_ceiling}/kWh
- Location: ${rfq.delivery_location}
- Timeline: ${rfq.delivery_start_date} to ${rfq.delivery_end_date}
- Payment Terms: ${rfq.payment_terms}
- Add-on Services: ${rfq.add_on_services?.join(', ') || 'None'}

Bids to rank:
${bids.map((b, i) => `
Bid ${i + 1}:
  bid_id: ${b.bid_id}
  Vendor: ${b.vendor_name}
  Price: ₹${b.price_per_unit}/kWh
  Quantity: ${b.quantity_mw} MW
  Timeline: ${b.delivery_timeline}
  Notes: ${b.notes || 'None'}
`).join('')}

Analyse each bid against the RFQ requirements. Consider: price competitiveness, quantity match, delivery timeline, vendor reliability.

Respond with ONLY valid JSON (no markdown, no code blocks):
{
  "rankings": [
    {
      "bid_id": "bid_id_here",
      "score": 85,
      "strengths": ["competitive price", "exact quantity match"],
      "gaps": ["longer delivery timeline"],
      "recommendation": "Best value bid — recommend shortlisting"
    }
  ],
  "summary": "2-3 sentence market analysis summary",
  "best_bid_id": "bid_id_here"
}`;

  try {
    const response = await anthropic.messages.create({
      model:      AI_MODEL,
      max_tokens: 1024,
      system:     'You are an expert energy procurement analyst. Always respond with valid JSON only.',
      messages:   [{ role: 'user', content: prompt }],
    });

    // Extract text content from Anthropic response
    const raw = response.content[0]?.text || '';

    // Strip any accidental markdown code fences
    const clean = raw.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    return JSON.parse(clean);

  } catch (err) {
    logger.error(`AI ranking error: ${err.message}`);
    // Graceful fallback — return neutral scores so the UI doesn't break
    return {
      rankings: bids.map(b => ({
        bid_id:         b.bid_id,
        score:          50,
        strengths:      [],
        gaps:           [],
        recommendation: 'Manual review required — AI analysis unavailable',
      })),
      summary:      'AI analysis unavailable. Please review bids manually.',
      best_bid_id:  bids[0]?.bid_id || null,
    };
  }
}

module.exports = { rankBids };
