import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import Navbar from '../Navbar';
import { API } from '../../App';

const ENERGY_TYPES = [
  { id: 'solar', label: 'Solar' },
  { id: 'wind', label: 'Wind' },
  { id: 'hydro', label: 'Hydro' },
  { id: 'thermal', label: 'Thermal' },
  { id: 'green_hydrogen', label: 'Green Hydrogen' },
];

const STEPS = ['Basic Info', 'Technical Specs', 'Logistics & Timeline', 'Financial Terms'];

export default function CreateRFQ() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    title: '', description: '', energy_type: 'solar',
    quantity_mw: '', voltage_kv: '', phase: '',
    delivery_location: '', start_date: '', end_date: '',
    price_ceiling: '', payment_terms: '', advance_percent: '',
    add_on_services: [],
  });

  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const canNext = () => {
    if (step === 0) return form.title && form.description && form.energy_type;
    if (step === 1) return form.quantity_mw;
    if (step === 2) return form.delivery_location && form.start_date && form.end_date;
    return true;
  };

  const handleSubmit = async () => {
    setLoading(true); setError('');
    try {
      const payload = {
        title: form.title,
        description: form.description,
        energy_type: form.energy_type,
        quantity_mw: parseFloat(form.quantity_mw),
        delivery_location: form.delivery_location,
        start_date: form.start_date,
        end_date: form.end_date,
        price_ceiling: form.price_ceiling ? parseFloat(form.price_ceiling) : null,
        specs: { voltage_kv: form.voltage_kv, phase: form.phase },
        financial_terms: { payment_terms: form.payment_terms, advance_percent: form.advance_percent },
        add_on_services: form.add_on_services,
      };
      const res = await axios.post(`${API}/rfqs`, payload, { withCredentials: true });
      navigate(`/client/rfqs/${res.data.rfq_id}`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create RFQ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617]">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate('/client/dashboard')} className="text-slate-400 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="font-['Chivo'] font-bold text-2xl text-white">Post New RFQ</h1>
            <p className="text-slate-500 text-sm mt-0.5">Step {step + 1} of {STEPS.length}: {STEPS[step]}</p>
          </div>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <div className={`flex items-center gap-1.5 text-xs font-semibold transition-colors ${i <= step ? 'text-sky-400' : 'text-slate-600'}`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs border ${i < step ? 'bg-sky-500 border-sky-500 text-white' : i === step ? 'border-sky-500 text-sky-400' : 'border-slate-700 text-slate-600'}`}>
                  {i < step ? <Check size={10} /> : i + 1}
                </div>
                <span className="hidden sm:block">{s}</span>
              </div>
              {i < STEPS.length - 1 && <div className={`flex-1 h-px ${i < step ? 'bg-sky-500' : 'bg-[#1E293B]'}`} />}
            </React.Fragment>
          ))}
        </div>

        {/* Form */}
        <div className="bg-[#0F172A] border border-[#1E293B] rounded-sm p-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-sm text-sm mb-6">
              {error}
            </div>
          )}

          {step === 0 && (
            <div className="space-y-5">
              <div>
                <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-2 block">RFQ Title *</label>
                <input
                  data-testid="rfq-title-input"
                  value={form.title}
                  onChange={e => upd('title', e.target.value)}
                  placeholder="e.g. Solar Power Supply - 50 MW Rajasthan"
                  className="w-full bg-[#020617] border border-[#1E293B] focus:border-sky-500 text-white placeholder-slate-600 px-4 py-3 rounded-sm text-sm outline-none transition-colors"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-2 block">Description *</label>
                <textarea
                  data-testid="rfq-description-input"
                  value={form.description}
                  onChange={e => upd('description', e.target.value)}
                  placeholder="Describe your energy requirements in detail..."
                  rows={4}
                  className="w-full bg-[#020617] border border-[#1E293B] focus:border-sky-500 text-white placeholder-slate-600 px-4 py-3 rounded-sm text-sm outline-none transition-colors resize-none"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-2 block">Energy Type *</label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {ENERGY_TYPES.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      data-testid={`energy-type-${t.id}`}
                      onClick={() => upd('energy_type', t.id)}
                      className={`py-2.5 text-sm font-medium rounded-sm border transition-all duration-200 ${
                        form.energy_type === t.id
                          ? 'border-sky-500 bg-sky-500/10 text-sky-400'
                          : 'border-[#1E293B] text-slate-400 hover:border-[#334155] hover:text-white'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-2 block">Quantity (MW) *</label>
                  <input
                    data-testid="rfq-quantity-input"
                    type="number"
                    value={form.quantity_mw}
                    onChange={e => upd('quantity_mw', e.target.value)}
                    placeholder="50"
                    className="w-full bg-[#020617] border border-[#1E293B] focus:border-sky-500 text-white placeholder-slate-600 px-4 py-3 rounded-sm text-sm outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-2 block">Voltage (kV)</label>
                  <input
                    data-testid="rfq-voltage-input"
                    value={form.voltage_kv}
                    onChange={e => upd('voltage_kv', e.target.value)}
                    placeholder="33"
                    className="w-full bg-[#020617] border border-[#1E293B] focus:border-sky-500 text-white placeholder-slate-600 px-4 py-3 rounded-sm text-sm outline-none transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-2 block">Phase</label>
                <select
                  data-testid="rfq-phase-select"
                  value={form.phase}
                  onChange={e => upd('phase', e.target.value)}
                  className="w-full bg-[#020617] border border-[#1E293B] focus:border-sky-500 text-white px-4 py-3 rounded-sm text-sm outline-none transition-colors"
                >
                  <option value="">Select phase</option>
                  <option value="3-phase">3-Phase</option>
                  <option value="1-phase">1-Phase</option>
                  <option value="DC">DC</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-2 block">Add-on Services</label>
                <div className="flex flex-wrap gap-2">
                  {['Grid Integration', 'O&M Support', 'Storage', 'Commissioning', 'Carbon Credits'].map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => upd('add_on_services', form.add_on_services.includes(s) ? form.add_on_services.filter(x => x !== s) : [...form.add_on_services, s])}
                      className={`text-xs px-3 py-1.5 rounded-sm border font-medium transition-all duration-200 ${form.add_on_services.includes(s) ? 'border-sky-500 bg-sky-500/10 text-sky-400' : 'border-[#1E293B] text-slate-400 hover:border-[#334155]'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-2 block">Delivery Location *</label>
                <input
                  data-testid="rfq-location-input"
                  value={form.delivery_location}
                  onChange={e => upd('delivery_location', e.target.value)}
                  placeholder="e.g. Jodhpur, Rajasthan"
                  className="w-full bg-[#020617] border border-[#1E293B] focus:border-sky-500 text-white placeholder-slate-600 px-4 py-3 rounded-sm text-sm outline-none transition-colors"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-2 block">Start Date *</label>
                  <input
                    data-testid="rfq-start-date-input"
                    type="date"
                    value={form.start_date}
                    onChange={e => upd('start_date', e.target.value)}
                    className="w-full bg-[#020617] border border-[#1E293B] focus:border-sky-500 text-white px-4 py-3 rounded-sm text-sm outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-2 block">End Date *</label>
                  <input
                    data-testid="rfq-end-date-input"
                    type="date"
                    value={form.end_date}
                    onChange={e => upd('end_date', e.target.value)}
                    className="w-full bg-[#020617] border border-[#1E293B] focus:border-sky-500 text-white px-4 py-3 rounded-sm text-sm outline-none transition-colors"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div>
                <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-2 block">Price Ceiling (INR/kWh)</label>
                <input
                  data-testid="rfq-price-ceiling-input"
                  type="number"
                  step="0.01"
                  value={form.price_ceiling}
                  onChange={e => upd('price_ceiling', e.target.value)}
                  placeholder="3.50"
                  className="w-full bg-[#020617] border border-[#1E293B] focus:border-sky-500 text-white placeholder-slate-600 px-4 py-3 rounded-sm text-sm outline-none transition-colors"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-2 block">Payment Terms</label>
                <select
                  data-testid="rfq-payment-terms-select"
                  value={form.payment_terms}
                  onChange={e => upd('payment_terms', e.target.value)}
                  className="w-full bg-[#020617] border border-[#1E293B] focus:border-sky-500 text-white px-4 py-3 rounded-sm text-sm outline-none transition-colors"
                >
                  <option value="">Select payment terms</option>
                  <option value="30_days">Net 30 Days</option>
                  <option value="45_days">Net 45 Days</option>
                  <option value="60_days">Net 60 Days</option>
                  <option value="monthly">Monthly Billing</option>
                  <option value="quarterly">Quarterly</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-2 block">Advance Payment (%)</label>
                <input
                  data-testid="rfq-advance-input"
                  type="number"
                  value={form.advance_percent}
                  onChange={e => upd('advance_percent', e.target.value)}
                  placeholder="10"
                  className="w-full bg-[#020617] border border-[#1E293B] focus:border-sky-500 text-white placeholder-slate-600 px-4 py-3 rounded-sm text-sm outline-none transition-colors"
                />
              </div>
              <div className="bg-[#1E293B]/50 rounded-sm p-4">
                <h3 className="text-sm font-semibold text-white mb-3">Review Summary</h3>
                <div className="space-y-2 text-xs text-slate-400">
                  <div className="flex justify-between"><span>Title</span><span className="text-white">{form.title}</span></div>
                  <div className="flex justify-between"><span>Energy Type</span><span className="text-white capitalize">{form.energy_type}</span></div>
                  <div className="flex justify-between"><span>Quantity</span><span className="text-white">{form.quantity_mw} MW</span></div>
                  <div className="flex justify-between"><span>Location</span><span className="text-white">{form.delivery_location}</span></div>
                  <div className="flex justify-between"><span>Duration</span><span className="text-white">{form.start_date} → {form.end_date}</span></div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-6 border-t border-[#1E293B]">
            <button
              data-testid="rfq-back-btn"
              onClick={() => step === 0 ? navigate('/client/dashboard') : setStep(s => s - 1)}
              className="flex items-center gap-2 text-slate-400 hover:text-white text-sm font-medium transition-colors"
            >
              <ChevronLeft size={16} /> {step === 0 ? 'Cancel' : 'Back'}
            </button>
            {step < STEPS.length - 1 ? (
              <button
                data-testid="rfq-next-btn"
                disabled={!canNext()}
                onClick={() => setStep(s => s + 1)}
                className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-40 text-white px-5 py-2.5 rounded-sm font-semibold text-sm transition-colors"
              >
                Next <ChevronRight size={16} />
              </button>
            ) : (
              <button
                data-testid="rfq-submit-btn"
                disabled={loading}
                onClick={handleSubmit}
                className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-60 text-white px-6 py-2.5 rounded-sm font-semibold text-sm transition-colors"
              >
                {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <>Submit RFQ <Check size={14} /></>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
