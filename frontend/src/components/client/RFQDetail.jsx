import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowLeft, Zap, Bot, TrendingUp, CheckCircle, XCircle, Star, AlertTriangle,
  BarChart3, Lock, Trophy, ChevronDown, ChevronUp, FileSignature, Clock, Bookmark
} from 'lucide-react';
import Navbar from '../Navbar';
import { API } from '../../App';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';

const STATUS_STYLES = {
  open: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  bidding_closed: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  under_review: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  awarded: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  completed: 'bg-slate-500/10 text-slate-400 border border-slate-500/20',
  cancelled: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

const BID_STATUS_STYLES = {
  submitted: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  shortlisted: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  accepted: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  rejected: 'bg-red-500/10 text-red-400 border border-red-500/20',
  contract_signed: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  contract_declined: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

const STATUS_LABELS = {
  open: 'Open — Accepting Bids',
  bidding_closed: 'Bidding Closed — Under Review',
  awarded: 'Contract Awarded',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

function ScoreBar({ score }) {
  const color = score >= 80 ? '#10B981' : score >= 60 ? '#F59E0B' : '#EF4444';
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 bg-[#1E293B] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${score}%`, backgroundColor: color }} />
      </div>
      <span className="font-['JetBrains_Mono',monospace] text-sm font-medium" style={{ color }}>{score}</span>
    </div>
  );
}

function AwardModal({ bid, rfq, onConfirm, onCancel }) {
  const [terms, setTerms] = useState('Standard RERC/CERC terms apply. Governed by Indian Electricity Act 2003 and applicable MNRE regulations.');
  const [payment, setPayment] = useState('Net 30 days from invoice date');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    await onConfirm({ contract_terms: terms, payment_schedule: payment });
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0F172A] border border-[#1E293B] rounded-sm w-full max-w-lg">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-[#1E293B]">
          <Trophy size={16} className="text-amber-400" />
          <h2 className="font-['Chivo'] font-bold text-lg text-white">Award Contract</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-[#1E293B] rounded-sm p-4 text-sm">
            <div className="text-slate-500 text-xs mb-2 uppercase tracking-wide font-semibold">Awarding to</div>
            <div className="text-white font-semibold">{bid.vendor_company}</div>
            <div className="text-slate-400 text-xs mt-1">₹{bid.price_per_unit}/kWh · {bid.quantity_mw} MW · {bid.delivery_timeline}</div>
          </div>
          <div>
            <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-2 block">Contract Terms</label>
            <textarea
              value={terms}
              onChange={e => setTerms(e.target.value)}
              rows={3}
              className="w-full bg-[#020617] border border-[#1E293B] focus:border-sky-500 text-white px-3 py-2.5 rounded-sm text-sm outline-none transition-colors resize-none"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-2 block">Payment Schedule</label>
            <input
              value={payment}
              onChange={e => setPayment(e.target.value)}
              className="w-full bg-[#020617] border border-[#1E293B] focus:border-sky-500 text-white px-3 py-2.5 rounded-sm text-sm outline-none transition-colors"
            />
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-sm p-3 text-xs text-amber-400">
            All other bids will be automatically rejected. The vendor will receive notification and must accept within 48 hours.
          </div>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onCancel} className="flex-1 border border-[#1E293B] text-slate-400 hover:text-white px-4 py-2.5 rounded-sm text-sm font-semibold transition-colors">
            Cancel
          </button>
          <button
            data-testid="confirm-award-btn"
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white px-4 py-2.5 rounded-sm text-sm font-semibold transition-colors"
          >
            {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Trophy size={14} /> Award Contract</>}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RFQDetail() {
  const { rfq_id } = useParams();
  const navigate = useNavigate();
  const [rfq, setRfq] = useState(null);
  const [bids, setBids] = useState([]);
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [selectedBid, setSelectedBid] = useState(null);
  const [awardBid, setAwardBid] = useState(null);
  const [actionLoading, setActionLoading] = useState({});

  const fetchData = async () => {
    try {
      const [rfqRes, bidsRes] = await Promise.all([
        axios.get(`${API}/rfqs/${rfq_id}`, { withCredentials: true }),
        axios.get(`${API}/rfqs/${rfq_id}/bids`, { withCredentials: true }),
      ]);
      setRfq(rfqRes.data);
      setBids(bidsRes.data);
      // Fetch contract if awarded
      if (rfqRes.data.contract_id) {
        axios.get(`${API}/contracts/${rfqRes.data.contract_id}`, { withCredentials: true })
          .then(r => setContract(r.data))
          .catch(() => {});
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [rfq_id]);

  const runAIRanking = async () => {
    setAiLoading(true);
    try {
      const res = await axios.post(`${API}/rfqs/${rfq_id}/bids/ai-rank`, {}, { withCredentials: true });
      setAiResult(res.data);
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setAiLoading(false);
    }
  };

  const closeBidding = async () => {
    setActionLoading(p => ({ ...p, close: true }));
    try {
      await axios.post(`${API}/rfqs/${rfq_id}/close-bidding`, {}, { withCredentials: true });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to close bidding');
    } finally {
      setActionLoading(p => ({ ...p, close: false }));
    }
  };

  const toggleShortlist = async (bid_id) => {
    setActionLoading(p => ({ ...p, [bid_id]: true }));
    try {
      await axios.patch(`${API}/rfqs/${rfq_id}/bids/${bid_id}/shortlist`, {}, { withCredentials: true });
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(p => ({ ...p, [bid_id]: false }));
    }
  };

  const handleAwardConfirm = async (awardData) => {
    try {
      await axios.post(`${API}/rfqs/${rfq_id}/award/${awardBid.bid_id}`, awardData, { withCredentials: true });
      setAwardBid(null);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to award contract');
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!rfq) return <div className="min-h-screen bg-[#020617] flex items-center justify-center text-slate-400">RFQ not found</div>;

  const bestBid = bids.find(b => b.bid_id === rfq.best_bid_id);
  const rankedBids = [...bids].sort((a, b) => (b.ai_score || -1) - (a.ai_score || -1));
  const awardedBid = bids.find(b => b.bid_id === rfq.awarded_bid_id);

  const CONTRACT_STATUS_STYLES = {
    pending_vendor_acceptance: 'text-amber-400 bg-amber-500/10 border border-amber-500/20',
    active: 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20',
    vendor_declined: 'text-red-400 bg-red-500/10 border border-red-500/20',
  };

  return (
    <div className="min-h-screen bg-[#020617]">
      <Navbar />
      {awardBid && (
        <AwardModal
          bid={awardBid}
          rfq={rfq}
          onConfirm={handleAwardConfirm}
          onCancel={() => setAwardBid(null)}
        />
      )}
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-8">
        {/* Header */}
        <div className="flex items-start gap-4 mb-6">
          <button onClick={() => navigate('/client/dashboard')} className="text-slate-400 hover:text-white mt-1 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <span className={`text-xs px-2.5 py-1 rounded-sm font-semibold capitalize ${STATUS_STYLES[rfq.status] || STATUS_STYLES.open}`}>
                {STATUS_LABELS[rfq.status] || rfq.status}
              </span>
              <span className="text-xs text-slate-500 capitalize">{rfq.energy_type?.replace('_', ' ')}</span>
            </div>
            <h1 className="font-['Chivo'] font-bold text-2xl md:text-3xl text-white mb-1">{rfq.title}</h1>
            <p className="text-slate-500 text-sm">{rfq.delivery_location} · {rfq.quantity_mw} MW · {rfq.start_date} → {rfq.end_date}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            {rfq.status === 'open' && bids.length > 0 && (
              <button
                data-testid="close-bidding-btn"
                onClick={closeBidding}
                disabled={actionLoading.close}
                className="flex items-center gap-1.5 text-xs border border-amber-500/30 hover:border-amber-500/60 text-amber-400 px-3 py-2 rounded-sm transition-colors disabled:opacity-60"
              >
                {actionLoading.close ? <div className="w-3 h-3 border border-amber-400 border-t-transparent rounded-full animate-spin" /> : <Lock size={12} />}
                Close Bidding
              </button>
            )}
            {rfq.status === 'open' && (
              <button
                data-testid="close-rfq-btn"
                onClick={() => axios.patch(`${API}/rfqs/${rfq_id}/status`, { status: 'cancelled' }, { withCredentials: true }).then(fetchData)}
                className="text-xs border border-[#1E293B] hover:border-red-500/30 text-slate-400 hover:text-red-400 px-3 py-2 rounded-sm transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Contract Banner (if awarded) */}
        {contract && (
          <div className={`mb-6 rounded-sm p-4 ${CONTRACT_STATUS_STYLES[contract.status] || 'bg-slate-500/10 text-slate-400 border border-slate-500/20'}`}>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <FileSignature size={18} strokeWidth={1.5} />
                <div>
                  <div className="text-sm font-semibold">
                    {contract.status === 'pending_vendor_acceptance' && 'Contract Sent — Awaiting Vendor Acceptance'}
                    {contract.status === 'active' && 'Contract Active — Energy Delivery in Progress'}
                    {contract.status === 'vendor_declined' && 'Contract Declined — Award to Another Vendor'}
                  </div>
                  <div className="text-xs opacity-70 mt-0.5">
                    Awarded to {contract.vendor_company} · ₹{contract.price_per_unit}/kWh · {contract.quantity_mw} MW
                  </div>
                </div>
              </div>
              <button
                data-testid="view-contract-btn"
                onClick={() => navigate(`/client/contracts`)}
                className="text-xs border border-current px-3 py-1.5 rounded-sm hover:opacity-80 transition-opacity"
              >
                View Contract
              </button>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          {/* Left - RFQ Info */}
          <div className="md:col-span-1 space-y-4">
            <div className="bg-[#0F172A] border border-[#1E293B] rounded-sm p-4">
              <h3 className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-3">RFQ Details</h3>
              <div className="space-y-3 text-sm">
                <div><div className="text-slate-500 text-xs mb-0.5">Description</div><div className="text-slate-300 leading-relaxed text-xs">{rfq.description}</div></div>
                <div className="border-t border-[#1E293B] pt-3">
                  <div className="flex justify-between mb-2"><span className="text-slate-500 text-xs">Quantity</span><span className="text-white font-medium font-['JetBrains_Mono',monospace]">{rfq.quantity_mw} MW</span></div>
                  {rfq.price_ceiling && <div className="flex justify-between mb-2"><span className="text-slate-500 text-xs">Price Ceiling</span><span className="text-amber-400 font-medium font-['JetBrains_Mono',monospace]">₹{rfq.price_ceiling}/kWh</span></div>}
                  <div className="flex justify-between"><span className="text-slate-500 text-xs">Bids Received</span><span className="text-white font-medium">{rfq.bid_count || 0}</span></div>
                </div>
                {rfq.add_on_services?.length > 0 && (
                  <div>
                    <div className="text-slate-500 text-xs mb-2">Add-on Services</div>
                    <div className="flex flex-wrap gap-1">
                      {rfq.add_on_services.map(s => (
                        <span key={s} className="text-xs bg-sky-500/10 text-sky-400 px-2 py-0.5 rounded-sm">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {rfq.ai_analysis_summary && (
              <div className="bg-[#0F172A] border border-sky-500/20 rounded-sm p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Bot size={14} className="text-sky-400" />
                  <h3 className="text-xs text-sky-400 font-semibold uppercase tracking-wide">AI Summary</h3>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">{rfq.ai_analysis_summary}</p>
              </div>
            )}

            {/* Workflow Steps */}
            <div className="bg-[#0F172A] border border-[#1E293B] rounded-sm p-4">
              <h3 className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-3">Workflow</h3>
              {[
                { key: 'open', label: 'Bids Open' },
                { key: 'bidding_closed', label: 'Bidding Closed' },
                { key: 'awarded', label: 'Contract Awarded' },
                { key: 'completed', label: 'Completed' },
              ].map((step, idx) => {
                const statuses = ['open', 'bidding_closed', 'awarded', 'completed'];
                const currentIdx = statuses.indexOf(rfq.status);
                const stepIdx = statuses.indexOf(step.key);
                const done = stepIdx < currentIdx || rfq.status === step.key;
                const current = rfq.status === step.key;
                return (
                  <div key={step.key} className="flex items-center gap-3 mb-3 last:mb-0">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${current ? 'border-sky-500 bg-sky-500/20' : done ? 'border-emerald-500 bg-emerald-500/20' : 'border-[#334155] bg-transparent'}`}>
                      {done && !current && <CheckCircle size={10} className="text-emerald-400" />}
                      {current && <div className="w-2 h-2 bg-sky-400 rounded-full" />}
                    </div>
                    <span className={`text-xs ${current ? 'text-white font-semibold' : done ? 'text-emerald-400' : 'text-slate-600'}`}>{step.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right - Bids */}
          <div className="md:col-span-2 space-y-4">
            {bids.length > 1 && (
              <div className="bg-[#0F172A] border border-[#1E293B] rounded-sm p-4">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 size={14} strokeWidth={1.5} className="text-sky-400" />
                  <h3 className="text-sm font-semibold text-white">Bid Price Comparison</h3>
                  {rfq.price_ceiling && <span className="ml-auto text-xs text-amber-400">Ceiling: ₹{rfq.price_ceiling}/kWh</span>}
                </div>
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={rankedBids.map(b => ({ name: b.vendor_company?.split(' ')[0] || 'Vendor', price: b.price_per_unit }))} barSize={24}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                    <Tooltip contentStyle={{ background: '#0F172A', border: '1px solid #1E293B', borderRadius: '2px', fontSize: 11 }} formatter={(v) => [`₹${v}/kWh`, 'Price']} />
                    {rfq.price_ceiling && <ReferenceLine y={rfq.price_ceiling} stroke="#F59E0B" strokeDasharray="4 4" />}
                    <Bar dataKey="price" fill="#0EA5E9" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="flex items-center justify-between">
              <h2 className="font-['Chivo'] font-bold text-lg text-white">Bids ({bids.length})</h2>
              {bids.length > 0 && rfq.status !== 'awarded' && rfq.status !== 'completed' && (
                <button
                  data-testid="ai-rank-btn"
                  onClick={runAIRanking}
                  disabled={aiLoading}
                  className="flex items-center gap-2 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-400 px-4 py-2 rounded-sm text-xs font-semibold transition-colors"
                >
                  {aiLoading ? <div className="w-3 h-3 border border-sky-400 border-t-transparent rounded-full animate-spin" /> : <Bot size={14} />}
                  {aiLoading ? 'Analyzing...' : 'AI Rank'}
                </button>
              )}
            </div>

            {bids.length === 0 ? (
              <div className="bg-[#0F172A] border border-[#1E293B] rounded-sm py-12 text-center">
                <TrendingUp size={28} strokeWidth={1} className="text-slate-700 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">No bids received yet.</p>
                <p className="text-slate-600 text-xs mt-1">Vendors can discover and bid on your RFQ in the Marketplace.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {rankedBids.map((bid, idx) => (
                  <div
                    key={bid.bid_id}
                    data-testid={`bid-card-${bid.bid_id}`}
                    className={`bg-[#0F172A] border rounded-sm p-4 transition-all duration-200 ${
                      bid.bid_id === rfq.awarded_bid_id ? 'border-amber-500/40' :
                      bid.status === 'shortlisted' ? 'border-sky-500/30' :
                      bid.status === 'rejected' ? 'border-red-500/10 opacity-60' :
                      selectedBid === bid.bid_id ? 'border-sky-500/50' : 'border-[#1E293B] hover:border-[#334155]'
                    }`}
                  >
                    <div
                      className="cursor-pointer"
                      onClick={() => setSelectedBid(selectedBid === bid.bid_id ? null : bid.bid_id)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          {bid.bid_id === rfq.best_bid_id && <Star size={12} className="text-amber-400 shrink-0" fill="currentColor" />}
                          {bids.length > 1 && bid.ai_score !== null && (
                            <span className="text-xs text-slate-600 font-mono">#{idx + 1}</span>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-white">{bid.vendor_company}</span>
                              {bid.vendor_verification === 'verified' && (
                                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-sm">CCTS</span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">{bid.vendor_location || 'Location not set'}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <div className="font-['JetBrains_Mono',monospace] text-base font-bold text-white">₹{bid.price_per_unit}<span className="text-xs text-slate-500 font-normal">/kWh</span></div>
                            <div className="text-xs text-slate-500">{bid.quantity_mw} MW</div>
                          </div>
                          <span className={`text-[10px] px-2 py-1 rounded-sm font-semibold capitalize ${BID_STATUS_STYLES[bid.status] || ''}`}>
                            {bid.status === 'contract_signed' ? 'Contract Signed' : bid.status === 'contract_declined' ? 'Contract Declined' : bid.status}
                          </span>
                          {selectedBid === bid.bid_id ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
                        </div>
                      </div>

                      {bid.ai_score !== null && (
                        <div className="mt-3 pt-3 border-t border-[#1E293B]">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-slate-500">AI Score</span>
                          </div>
                          <ScoreBar score={bid.ai_score} />
                        </div>
                      )}
                    </div>

                    {selectedBid === bid.bid_id && (
                      <div className="mt-4 pt-4 border-t border-[#1E293B] space-y-3">
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div><span className="text-slate-500 block mb-0.5">Delivery Timeline</span><span className="text-slate-300">{bid.delivery_timeline}</span></div>
                          <div><span className="text-slate-500 block mb-0.5">Quantity Offered</span><span className="text-slate-300">{bid.quantity_mw} MW</span></div>
                        </div>
                        {bid.notes && <div className="text-xs"><span className="text-slate-500">Notes: </span><span className="text-slate-400">{bid.notes}</span></div>}

                        {bid.ai_analysis && (
                          <div className="space-y-3">
                            {bid.ai_analysis.strengths?.length > 0 && (
                              <div>
                                <div className="text-xs text-emerald-400 font-semibold mb-1.5 flex items-center gap-1"><CheckCircle size={10} /> Strengths</div>
                                <ul className="space-y-1">{bid.ai_analysis.strengths.map((s, i) => <li key={i} className="text-xs text-slate-400">• {s}</li>)}</ul>
                              </div>
                            )}
                            {bid.ai_analysis.gaps?.length > 0 && (
                              <div>
                                <div className="text-xs text-amber-400 font-semibold mb-1.5 flex items-center gap-1"><AlertTriangle size={10} /> Gaps</div>
                                <ul className="space-y-1">{bid.ai_analysis.gaps.map((g, i) => <li key={i} className="text-xs text-slate-400">• {g}</li>)}</ul>
                              </div>
                            )}
                            {bid.ai_analysis.recommendation && (
                              <div className="bg-sky-500/5 border border-sky-500/10 rounded-sm p-3">
                                <div className="text-xs text-sky-400 font-semibold mb-1 flex items-center gap-1"><Bot size={10} /> Recommendation</div>
                                <p className="text-xs text-slate-300">{bid.ai_analysis.recommendation}</p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Action Buttons */}
                        {rfq.status !== 'awarded' && rfq.status !== 'completed' && bid.status !== 'rejected' && bid.status !== 'accepted' && (
                          <div className="flex gap-2 pt-2 flex-wrap">
                            {rfq.status !== 'cancelled' && (
                              <>
                                <button
                                  data-testid={`shortlist-bid-${bid.bid_id}`}
                                  onClick={(e) => { e.stopPropagation(); toggleShortlist(bid.bid_id); }}
                                  disabled={actionLoading[bid.bid_id]}
                                  className={`flex items-center gap-1.5 text-xs border px-3 py-1.5 rounded-sm font-semibold transition-colors ${
                                    bid.status === 'shortlisted'
                                      ? 'border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-transparent'
                                      : 'border-[#334155] text-slate-400 hover:text-amber-400 hover:border-amber-500/30'
                                  }`}
                                >
                                  <Bookmark size={11} fill={bid.status === 'shortlisted' ? 'currentColor' : 'none'} />
                                  {bid.status === 'shortlisted' ? 'Shortlisted' : 'Shortlist'}
                                </button>
                                <button
                                  data-testid={`award-bid-${bid.bid_id}`}
                                  onClick={(e) => { e.stopPropagation(); setAwardBid(bid); }}
                                  className="flex items-center gap-1.5 text-xs bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 px-3 py-1.5 rounded-sm font-semibold transition-colors"
                                >
                                  <Trophy size={11} /> Award Contract
                                </button>
                              </>
                            )}
                          </div>
                        )}

                        {bid.bid_id === rfq.awarded_bid_id && (
                          <div className="flex items-center gap-1.5 text-xs text-amber-400 font-semibold pt-2">
                            <Trophy size={12} /> Contract Awarded to this vendor
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
