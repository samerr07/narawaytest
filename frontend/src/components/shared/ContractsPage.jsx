import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FileSignature, ArrowLeft, Clock, CheckCircle, XCircle, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import Navbar from '../Navbar';
import { API, useAuth } from '../../App';

const CONTRACT_STATUS = {
  pending_vendor_acceptance: { label: 'Awaiting Vendor Acceptance', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', icon: <Clock size={12} /> },
  active: { label: 'Active', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', icon: <CheckCircle size={12} /> },
  vendor_declined: { label: 'Declined by Vendor', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', icon: <XCircle size={12} /> },
  completed: { label: 'Completed', color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/20', icon: <CheckCircle size={12} /> },
};

function ContractCard({ contract, role, onNavigate }) {
  const [expanded, setExpanded] = useState(false);
  const status = CONTRACT_STATUS[contract.status] || CONTRACT_STATUS.active;
  const otherParty = role === 'client' ? contract.vendor_company : contract.client_company;
  const otherLabel = role === 'client' ? 'Vendor' : 'Client';

  return (
    <div className="bg-[#0F172A] border border-[#1E293B] rounded-sm overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-['Chivo'] font-bold text-base text-white truncate">{contract.rfq_title}</h3>
            <p className="text-slate-500 text-xs mt-0.5">{otherLabel}: {otherParty}</p>
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-sm font-semibold flex items-center gap-1 shrink-0 border ${status.bg} ${status.color}`}>
            {status.icon} {status.label}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3 text-sm mb-4">
          <div className="bg-[#1E293B]/50 rounded-sm p-2.5">
            <div className="text-slate-500 text-xs mb-1">Energy Type</div>
            <div className="text-white text-xs font-medium capitalize">{contract.energy_type?.replace('_', ' ')}</div>
          </div>
          <div className="bg-[#1E293B]/50 rounded-sm p-2.5">
            <div className="text-slate-500 text-xs mb-1">Price</div>
            <div className="text-white text-xs font-['JetBrains_Mono',monospace] font-bold">₹{contract.price_per_unit}/kWh</div>
          </div>
          <div className="bg-[#1E293B]/50 rounded-sm p-2.5">
            <div className="text-slate-500 text-xs mb-1">Quantity</div>
            <div className="text-white text-xs font-medium">{contract.quantity_mw} MW</div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-600">
            Created {new Date(contract.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
          <button
            data-testid={`expand-contract-${contract.contract_id}`}
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 transition-colors"
          >
            {expanded ? 'Less' : 'Full Details'}
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-[#1E293B] px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <div className="text-slate-500 mb-1 uppercase tracking-wide text-[10px]">Delivery Location</div>
              <div className="text-slate-300">{contract.delivery_location}</div>
            </div>
            <div>
              <div className="text-slate-500 mb-1 uppercase tracking-wide text-[10px]">Delivery Timeline</div>
              <div className="text-slate-300">{contract.delivery_timeline}</div>
            </div>
            <div>
              <div className="text-slate-500 mb-1 uppercase tracking-wide text-[10px]">Start Date</div>
              <div className="text-slate-300">{contract.start_date}</div>
            </div>
            <div>
              <div className="text-slate-500 mb-1 uppercase tracking-wide text-[10px]">End Date</div>
              <div className="text-slate-300">{contract.end_date}</div>
            </div>
            <div>
              <div className="text-slate-500 mb-1 uppercase tracking-wide text-[10px]">Payment Schedule</div>
              <div className="text-slate-300">{contract.payment_schedule}</div>
            </div>
            {contract.estimated_annual_value_inr && (
              <div>
                <div className="text-slate-500 mb-1 uppercase tracking-wide text-[10px]">Est. Annual Value</div>
                <div className="text-emerald-400 font-semibold font-['JetBrains_Mono',monospace]">
                  ₹{(contract.estimated_annual_value_inr / 100000).toFixed(2)}L
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="text-slate-500 mb-1 uppercase tracking-wide text-[10px]">Contract Terms</div>
            <p className="text-slate-400 text-xs leading-relaxed">{contract.contract_terms}</p>
          </div>

          {contract.vendor_notes && (
            <div>
              <div className="text-slate-500 mb-1 uppercase tracking-wide text-[10px]">Vendor Notes</div>
              <p className="text-slate-400 text-xs">{contract.vendor_notes}</p>
            </div>
          )}

          {contract.status === 'vendor_declined' && role === 'client' && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-sm p-3 text-xs text-red-400">
              This contract was declined by the vendor. Please return to the RFQ to award the contract to another bid.
            </div>
          )}

          <button
            onClick={() => onNavigate(contract.rfq_id)}
            className="flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 transition-colors"
          >
            <ExternalLink size={11} /> View RFQ
          </button>
        </div>
      )}
    </div>
  );
}

export default function ContractsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/contracts`, { withCredentials: true })
      .then(r => setContracts(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const dashboardPath = user?.role === 'client' ? '/client/dashboard' : '/vendor/dashboard';
  const rfqPath = user?.role === 'client' ? '/client/rfqs' : '/vendor/rfqs';

  const stats = {
    total: contracts.length,
    active: contracts.filter(c => c.status === 'active').length,
    pending: contracts.filter(c => c.status === 'pending_vendor_acceptance').length,
    declined: contracts.filter(c => c.status === 'vendor_declined').length,
  };

  return (
    <div className="min-h-screen bg-[#020617]">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-8">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate(dashboardPath)} className="text-slate-400 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="font-['Chivo'] font-bold text-2xl md:text-3xl text-white">Contracts</h1>
            <p className="text-slate-500 text-sm mt-0.5">Manage your energy supply contracts</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Total', value: stats.total, color: 'text-white' },
            { label: 'Active', value: stats.active, color: 'text-emerald-400' },
            { label: 'Pending', value: stats.pending, color: 'text-amber-400' },
            { label: 'Declined', value: stats.declined, color: 'text-red-400' },
          ].map(s => (
            <div key={s.label} className="bg-[#0F172A] border border-[#1E293B] rounded-sm p-3 text-center">
              <div className={`font-['Chivo'] font-bold text-2xl ${s.color}`}>{s.value}</div>
              <div className="text-xs text-slate-600 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : contracts.length === 0 ? (
          <div className="bg-[#0F172A] border border-[#1E293B] rounded-sm py-16 text-center">
            <FileSignature size={40} strokeWidth={1} className="text-slate-700 mx-auto mb-4" />
            <p className="text-slate-400 text-base font-semibold mb-2">No contracts yet</p>
            <p className="text-slate-600 text-sm">
              {user?.role === 'client' ? 'Award a bid on one of your RFQs to create a contract.' : 'Win a bid to receive a contract offer.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {contracts.map(c => (
              <ContractCard
                key={c.contract_id}
                contract={c}
                role={user?.role}
                onNavigate={(rfq_id) => navigate(`/${user?.role}/rfqs/${rfq_id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
