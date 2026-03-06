import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowLeft, Send, CheckCircle, FileSignature, Clock, Trophy, AlertTriangle, XCircle
} from 'lucide-react';
import Navbar from '../Navbar';
import { API } from '../../App';

const BID_STATUS = {
  submitted: { label: 'Submitted — Under Review', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
  shortlisted: { label: 'Shortlisted by Client', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  accepted: { label: 'Accepted — Contract Pending', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  rejected: { label: 'Not Selected', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
  contract_signed: { label: 'Contract Signed — Active', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
  contract_declined: { label: 'Contract Declined', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
};

export default function VendorRFQView() {
  const { rfq_id } = useParams();
  const navigate = useNavigate();
  const [rfq, setRfq] = useState(null);
  const [myBid, setMyBid] = useState(null);
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [contractLoading, setContractLoading] = useState(false);
  const [error, setError] = useState('');
  const [declineNotes, setDeclineNotes] = useState('');
  const [showDeclineForm, setShowDeclineForm] = useState(false);
  const [form, setForm] = useState({
    price_per_unit: '', quantity_mw: '', delivery_timeline: '', specs: {}, notes: '',
  });

  const fetchData = async () => {
    try {
      const [rfqRes, bidsRes] = await Promise.all([
        axios.get(`${API}/rfqs/${rfq_id}`, { withCredentials: true }),
        axios.get(`${API}/rfqs/${rfq_id}/bids`, { withCredentials: true }),
      ]);
      setRfq(rfqRes.data);
      const bid = bidsRes.data[0] || null;
      setMyBid(bid);
      setForm(f => ({ ...f, quantity_mw: rfqRes.data.quantity_mw?.toString() || '' }));

      // Fetch contract if bid has one
      if (bid?.contract_id) {
        axios.get(`${API}/contracts/${bid.contract_id}`, { withCredentials: true })
          .then(r => setContract(r.data))
          .catch(() => {});
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [rfq_id]);

  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.price_per_unit || !form.quantity_mw || !form.delivery_timeline) {
      setError('Please fill all required fields');
      return;
    }
    setSubmitting(true); setError('');
    try {
      const res = await axios.post(`${API}/rfqs/${rfq_id}/bids`, {
        price_per_unit: parseFloat(form.price_per_unit),
        quantity_mw: parseFloat(form.quantity_mw),
        delivery_timeline: form.delivery_timeline,
        notes: form.notes,
      }, { withCredentials: true });
      setMyBid(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit bid');
    } finally {
      setSubmitting(false);
    }
  };

  const respondToContract = async (accept, notes = '') => {
    if (!contract) return;
    setContractLoading(true);
    try {
      await axios.post(`${API}/contracts/${contract.contract_id}/respond`, { accept, notes }, { withCredentials: true });
      fetchData();
      setShowDeclineForm(false);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to respond to contract');
    } finally {
      setContractLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!rfq) return <div className="min-h-screen bg-[#020617] flex items-center justify-center text-slate-400">RFQ not found</div>;

  const bidStatus = myBid ? (BID_STATUS[myBid.status] || BID_STATUS.submitted) : null;

  return (
    <div className="min-h-screen bg-[#020617]">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-8">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate('/vendor/marketplace')} className="text-slate-400 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="font-['Chivo'] font-bold text-2xl text-white">{rfq.title}</h1>
            <p className="text-slate-500 text-sm mt-0.5">{rfq.delivery_location} · {rfq.energy_type?.replace('_', ' ')} · {rfq.quantity_mw} MW</p>
          </div>
          <div className="ml-auto">
            <span className={`text-xs px-2.5 py-1 rounded-sm font-semibold capitalize ${rfq.status === 'open' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'}`}>
              {rfq.status === 'open' ? 'Open for Bids' : rfq.status?.replace('_', ' ')}
            </span>
          </div>
        </div>

        <div className="grid md:grid-cols-5 gap-6">
          {/* RFQ Details */}
          <div className="md:col-span-3 space-y-4">
            <div className="bg-[#0F172A] border border-[#1E293B] rounded-sm p-5">
              <h2 className="font-['Chivo'] font-bold text-base text-white mb-4">RFQ Requirements</h2>
              <div className="space-y-3 text-sm">
                {[
                  ['Energy Type', rfq.energy_type?.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())],
                  ['Quantity Required', `${rfq.quantity_mw} MW`],
                  ['Delivery Location', rfq.delivery_location],
                  ['Duration', `${rfq.start_date} → ${rfq.end_date}`],
                  rfq.price_ceiling && ['Price Ceiling', `₹${rfq.price_ceiling}/kWh`],
                  rfq.specs?.voltage_kv && ['Voltage', `${rfq.specs.voltage_kv} kV`],
                  rfq.specs?.phase && ['Phase', rfq.specs.phase],
                  rfq.financial_terms?.payment_terms && ['Payment Terms', rfq.financial_terms.payment_terms.replace('_', ' ')],
                ].filter(Boolean).map(([label, value]) => (
                  <div key={label} className="flex justify-between border-b border-[#1E293B] pb-2 last:border-0">
                    <span className="text-slate-500">{label}</span>
                    <span className={`text-white ${label === 'Price Ceiling' ? 'text-amber-400 font-medium font-[\'JetBrains_Mono\',monospace]' : ''}`}>{value}</span>
                  </div>
                ))}
              </div>
              {rfq.description && (
                <div className="mt-4 pt-4 border-t border-[#1E293B]">
                  <div className="text-xs text-slate-500 mb-2">Description</div>
                  <p className="text-slate-300 text-sm leading-relaxed">{rfq.description}</p>
                </div>
              )}
            </div>

            {rfq.add_on_services?.length > 0 && (
              <div className="bg-[#0F172A] border border-[#1E293B] rounded-sm p-5">
                <h3 className="text-sm font-semibold text-white mb-3">Required Add-on Services</h3>
                <div className="flex flex-wrap gap-2">
                  {rfq.add_on_services.map(s => (
                    <span key={s} className="text-xs bg-sky-500/10 text-sky-400 border border-sky-500/20 px-3 py-1.5 rounded-sm">{s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Panel: Bid Form or Status */}
          <div className="md:col-span-2 space-y-4">
            {/* Contract Panel (if contract exists) */}
            {contract && (
              <div className={`rounded-sm p-5 border ${contract.status === 'active' ? 'border-emerald-500/20 bg-emerald-500/5' : contract.status === 'vendor_declined' ? 'border-red-500/20 bg-red-500/5' : 'border-amber-500/20 bg-amber-500/5'}`}>
                <div className="flex items-center gap-2 mb-4">
                  <FileSignature size={16} strokeWidth={1.5} className={contract.status === 'active' ? 'text-emerald-400' : contract.status === 'vendor_declined' ? 'text-red-400' : 'text-amber-400'} />
                  <h3 className="font-['Chivo'] font-bold text-base text-white">Contract Offer</h3>
                </div>

                <div className="space-y-2 text-sm mb-4">
                  {[
                    ['Price', `₹${contract.price_per_unit}/kWh`],
                    ['Quantity', `${contract.quantity_mw} MW`],
                    ['Location', contract.delivery_location],
                    ['Start Date', contract.start_date],
                    ['End Date', contract.end_date],
                    ['Payment', contract.payment_schedule],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between text-xs">
                      <span className="text-slate-500">{k}</span>
                      <span className="text-slate-300 text-right max-w-[60%]">{v}</span>
                    </div>
                  ))}
                </div>

                <div className="bg-[#1E293B]/50 rounded-sm p-3 mb-4">
                  <div className="text-xs text-slate-500 mb-1">Contract Terms</div>
                  <p className="text-xs text-slate-400 leading-relaxed">{contract.contract_terms}</p>
                </div>

                {contract.status === 'pending_vendor_acceptance' && (
                  <>
                    {!showDeclineForm ? (
                      <div className="flex gap-2">
                        <button
                          data-testid="accept-contract-btn"
                          onClick={() => respondToContract(true)}
                          disabled={contractLoading}
                          className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white py-2.5 rounded-sm text-xs font-semibold transition-colors"
                        >
                          {contractLoading ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <CheckCircle size={12} />}
                          Accept Contract
                        </button>
                        <button
                          data-testid="decline-contract-btn"
                          onClick={() => setShowDeclineForm(true)}
                          className="flex-1 flex items-center justify-center gap-1.5 border border-red-500/30 hover:bg-red-500/10 text-red-400 py-2.5 rounded-sm text-xs font-semibold transition-colors"
                        >
                          <XCircle size={12} /> Decline
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <textarea
                          value={declineNotes}
                          onChange={e => setDeclineNotes(e.target.value)}
                          placeholder="Reason for declining (optional)..."
                          rows={2}
                          className="w-full bg-[#020617] border border-[#1E293B] focus:border-red-500/50 text-white placeholder-slate-600 px-3 py-2 rounded-sm text-xs outline-none resize-none"
                        />
                        <div className="flex gap-2">
                          <button onClick={() => setShowDeclineForm(false)} className="flex-1 border border-[#1E293B] text-slate-400 py-2 rounded-sm text-xs font-semibold">
                            Cancel
                          </button>
                          <button
                            data-testid="confirm-decline-btn"
                            onClick={() => respondToContract(false, declineNotes)}
                            disabled={contractLoading}
                            className="flex-1 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 py-2 rounded-sm text-xs font-semibold disabled:opacity-60"
                          >
                            Confirm Decline
                          </button>
                        </div>
                      </div>
                    )}
                    <p className="text-[10px] text-slate-600 mt-2 text-center">48-hour acceptance window from contract offer</p>
                  </>
                )}

                {contract.status === 'active' && (
                  <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold">
                    <CheckCircle size={14} /> Contract Active — Energy delivery in progress
                  </div>
                )}

                {contract.status === 'vendor_declined' && (
                  <div className="flex items-center gap-2 text-xs text-red-400">
                    <XCircle size={14} /> You declined this contract
                  </div>
                )}
              </div>
            )}

            {/* Bid Status Card (if bid exists but no active contract panel to show) */}
            {myBid && !contract && (
              <div className={`bg-[#0F172A] rounded-sm p-5 border ${myBid.status === 'rejected' ? 'border-red-500/20' : myBid.status === 'shortlisted' ? 'border-amber-500/20' : 'border-emerald-500/20'}`}>
                <div className="text-center mb-4">
                  {myBid.status === 'rejected' ? (
                    <XCircle size={32} strokeWidth={1.5} className="text-red-400 mx-auto mb-3" />
                  ) : myBid.status === 'shortlisted' ? (
                    <Trophy size={32} strokeWidth={1.5} className="text-amber-400 mx-auto mb-3" />
                  ) : (
                    <Clock size={32} strokeWidth={1.5} className="text-blue-400 mx-auto mb-3" />
                  )}
                  <h3 className="font-['Chivo'] font-bold text-lg text-white mb-1">Bid {myBid.status === 'rejected' ? 'Not Selected' : myBid.status === 'shortlisted' ? 'Shortlisted!' : 'Submitted'}</h3>
                  <p className={`text-sm ${bidStatus?.color}`}>{bidStatus?.label}</p>
                </div>
                <div className="bg-[#1E293B] rounded-sm p-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">Your Price</span><span className="text-white font-['JetBrains_Mono',monospace]">₹{myBid.price_per_unit}/kWh</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Quantity</span><span className="text-white">{myBid.quantity_mw} MW</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Timeline</span><span className="text-white text-xs text-right max-w-[60%]">{myBid.delivery_timeline}</span></div>
                </div>
                {myBid.status === 'shortlisted' && (
                  <div className="mt-3 bg-amber-500/10 border border-amber-500/20 rounded-sm p-3 text-xs text-amber-400">
                    Your bid has been shortlisted! The client is reviewing final bids. A contract offer may follow soon.
                  </div>
                )}
                <button onClick={() => navigate('/vendor/dashboard')} className="mt-4 w-full text-sky-400 text-sm hover:text-sky-300 transition-colors text-center block">
                  Back to Dashboard
                </button>
              </div>
            )}

            {/* Bid Form (if no bid yet and RFQ is open) */}
            {!myBid && rfq.status === 'open' && (
              <form onSubmit={handleSubmit} className="bg-[#0F172A] border border-[#1E293B] rounded-sm p-5">
                <h2 className="font-['Chivo'] font-bold text-base text-white mb-5">Submit Your Bid</h2>
                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-3 py-2.5 rounded-sm text-xs mb-4">{error}</div>
                )}
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-2 block">Price per kWh (INR) *</label>
                    <input
                      data-testid="bid-price-input"
                      type="number" step="0.01" value={form.price_per_unit}
                      onChange={e => upd('price_per_unit', e.target.value)}
                      placeholder="3.20"
                      className="w-full bg-[#020617] border border-[#1E293B] focus:border-sky-500 text-white placeholder-slate-600 px-4 py-3 rounded-sm text-sm outline-none transition-colors"
                      required
                    />
                    {rfq.price_ceiling && <p className="text-xs text-amber-400 mt-1">Client ceiling: ₹{rfq.price_ceiling}/kWh</p>}
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-2 block">Quantity You Can Supply (MW) *</label>
                    <input
                      data-testid="bid-quantity-input"
                      type="number" value={form.quantity_mw}
                      onChange={e => upd('quantity_mw', e.target.value)}
                      className="w-full bg-[#020617] border border-[#1E293B] focus:border-sky-500 text-white placeholder-slate-600 px-4 py-3 rounded-sm text-sm outline-none transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-2 block">Delivery Timeline *</label>
                    <input
                      data-testid="bid-timeline-input"
                      value={form.delivery_timeline}
                      onChange={e => upd('delivery_timeline', e.target.value)}
                      placeholder="e.g. Ready in 3 months from LOI"
                      className="w-full bg-[#020617] border border-[#1E293B] focus:border-sky-500 text-white placeholder-slate-600 px-4 py-3 rounded-sm text-sm outline-none transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-2 block">Additional Notes</label>
                    <textarea
                      data-testid="bid-notes-input"
                      value={form.notes} onChange={e => upd('notes', e.target.value)}
                      placeholder="Warranties, certifications, unique advantages..."
                      rows={3}
                      className="w-full bg-[#020617] border border-[#1E293B] focus:border-sky-500 text-white placeholder-slate-600 px-4 py-3 rounded-sm text-sm outline-none transition-colors resize-none"
                    />
                  </div>
                  <button
                    data-testid="submit-bid-btn"
                    type="submit" disabled={submitting}
                    className="w-full flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-60 text-white py-3 rounded-sm font-semibold text-sm transition-colors glow-primary"
                  >
                    {submitting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Send size={14} /> Submit Bid</>}
                  </button>
                </div>
              </form>
            )}

            {!myBid && rfq.status !== 'open' && (
              <div className="bg-[#0F172A] border border-[#1E293B] rounded-sm py-10 text-center">
                <AlertTriangle size={28} strokeWidth={1} className="text-slate-700 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">This RFQ is {rfq.status?.replace('_', ' ')}.</p>
                <p className="text-slate-600 text-xs mt-1">Bidding is no longer available.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
