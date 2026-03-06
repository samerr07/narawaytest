/**
 * GridMonitor.jsx — 5G/6G Real-Time Grid Balancing Dashboard
 *
 * MOU Scope 1.1.f: "Integration of 5G/6G low-latency communication architecture
 * for real-time grid balancing"
 *
 * Architecture:
 *   - Polls /api/grid/status every 2 s to simulate a 5G/6G low-latency telemetry stream
 *   - Shows: live grid frequency (target 50 Hz), renewable energy mix, regional load
 *     distribution, connected 5G/6G edge node count, latency metrics, event log
 *
 * Production upgrade path:
 *   Replace the 2-second poll with a WebSocket connection to the 5G/6G edge gateway
 *   and swap the simulated backend endpoint with a real SCADA / NLDC API feed.
 *
 * Consumed by: AdminDashboard.jsx (Grid tab)
 *
 * Developer note (Naraway team):
 *   Keep all polling / cleanup logic inside useEffect with the cleanup return.
 *   Never start an interval outside useEffect — it won't clean up on unmount.
 */

import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { API } from '../../App';
import {
  Activity, Wifi, Zap, AlertTriangle, CheckCircle,
  Radio, Cpu, TrendingUp, Globe, Sun, Wind, Droplets, Flame
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import LoadingSpinner from '../shared/LoadingSpinner';

// ─── Constants ────────────────────────────────────────────────────────────────

const NOMINAL_HZ  = 50.0;   // India grid nominal frequency
const FREQ_WARN   = 0.15;   // Hz deviation → yellow alert
const FREQ_CRIT   = 0.30;   // Hz deviation → red alert
const POLL_MS     = 2000;   // polling interval in ms (simulates 5G/6G push cadence)
const MAX_HISTORY = 30;     // data points to keep in the rolling frequency chart (~60 s)

// Colour for each energy source in the mix pie chart
const MIX_COLORS = {
  solar:   '#F59E0B',   // amber
  wind:    '#0EA5E9',   // sky
  hydro:   '#6366F1',   // indigo
  thermal: '#EF4444',   // red (non-renewable)
};

// Icons for energy type labels
const ENERGY_ICONS = {
  solar:   <Sun    size={12} />,
  wind:    <Wind   size={12} />,
  hydro:   <Droplets size={12} />,
  thermal: <Flame  size={12} />,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns Tailwind text-color class based on grid stability state. */
function stabilityTextColor(s) {
  return s === 'stable' ? 'text-emerald-400' : s === 'warning' ? 'text-amber-400' : 'text-red-400';
}

/** Returns Tailwind bg + border classes for the stability KPI card. */
function stabilityBg(s) {
  return s === 'stable'
    ? 'bg-emerald-500/10 border-emerald-500/20'
    : s === 'warning'
    ? 'bg-amber-500/10  border-amber-500/20'
    : 'bg-red-500/10    border-red-500/20';
}

/** Colour for frequency number (green/amber/red based on Hz deviation). */
function freqColor(hz) {
  const d = Math.abs(hz - NOMINAL_HZ);
  return d > FREQ_CRIT ? 'text-red-400' : d > FREQ_WARN ? 'text-amber-400' : 'text-emerald-400';
}

/** Format ISO timestamp → HH:MM:SS for the events log. */
const fmtTime = iso => new Date(iso).toLocaleTimeString('en-IN', { hour12: false });

// ─── Sub-components ───────────────────────────────────────────────────────────

/**
 * FrequencyDisplay — Shows live Hz value with colour-coded deviation indicator.
 * Green = nominal, Amber = minor deviation, Red = critical deviation.
 */
function FrequencyDisplay({ hz }) {
  const color    = freqColor(hz);
  const deviation = (hz - NOMINAL_HZ).toFixed(3);
  const sign     = hz >= NOMINAL_HZ ? '+' : '';

  return (
    <div className="flex flex-col items-center justify-center py-6">
      {/* Large numeric readout */}
      <div className={`font-['JetBrains_Mono',monospace] font-bold text-5xl tabular-nums ${color}`}>
        {hz?.toFixed(3)}
      </div>
      <div className="text-slate-500 text-xs mt-1 tracking-widest uppercase">Hertz</div>

      {/* Deviation from nominal */}
      <div className={`mt-3 text-xs ${color} font-semibold`}>
        {sign}{deviation} Hz from nominal {NOMINAL_HZ.toFixed(1)} Hz
      </div>
    </div>
  );
}

/**
 * LiveDot — Animated pulse indicator showing the 5G/6G link is active.
 */
function LiveDot() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500" />
    </span>
  );
}

/**
 * EventsLog — Most-recent-first scrollable log of grid events.
 * Severity icons: info (sky), warning (amber), critical (red), action (emerald).
 */
function EventsLog({ events = [] }) {
  const severityStyle = {
    info:     { icon: <CheckCircle   size={12} />, color: 'text-sky-400'     },
    warning:  { icon: <AlertTriangle size={12} />, color: 'text-amber-400'   },
    critical: { icon: <AlertTriangle size={12} />, color: 'text-red-400'     },
    action:   { icon: <Zap           size={12} />, color: 'text-emerald-400' },
  };

  if (!events.length) {
    return <p className="text-slate-600 text-xs">No events in current window.</p>;
  }

  return (
    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
      {events.map((evt, i) => {
        const s = severityStyle[evt.severity] || severityStyle.info;
        return (
          <div key={i} className="flex items-start gap-2 text-xs">
            <span className="text-slate-600 font-['JetBrains_Mono',monospace] shrink-0">{fmtTime(evt.timestamp)}</span>
            <span className={`${s.color} shrink-0 mt-0.5`}>{s.icon}</span>
            <span className="text-slate-400">{evt.message}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function GridMonitor() {
  const [gridData,    setGridData]    = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [freqHistory, setFreqHistory] = useState([]);  // rolling 60-s frequency chart data
  const intervalRef = useRef(null);

  // ── Data fetching ─────────────────────────────────────────────────────────

  const fetchGrid = async () => {
    try {
      const { data } = await axios.get(`${API}/grid/status`, { withCredentials: true });
      setGridData(data);
      setError(null);

      // Append to rolling frequency history (cap at MAX_HISTORY points)
      setFreqHistory(prev => [
        ...prev.slice(-(MAX_HISTORY - 1)),
        { t: new Date().toLocaleTimeString('en-IN', { hour12: false }), hz: data.frequency_hz },
      ]);
    } catch (err) {
      setError('Grid telemetry unavailable. Check /api/grid/status.');
      console.error('[GridMonitor] poll error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGrid();
    // Poll every POLL_MS to simulate 5G/6G low-latency push
    intervalRef.current = setInterval(fetchGrid, POLL_MS);
    // Cleanup: stop polling when tab is switched or component unmounts
    return () => clearInterval(intervalRef.current);
  }, []);

  // ── Pie chart data ────────────────────────────────────────────────────────

  const mixData = gridData
    ? Object.entries(gridData.renewable_mix || {}).map(([name, value]) => ({ name, value }))
    : [];

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-sm p-6 text-center">
        <AlertTriangle size={24} className="text-red-400 mx-auto mb-2" />
        <p className="text-red-400 text-sm font-semibold">{error}</p>
        <p className="text-slate-500 text-xs mt-1">Verify the backend is running and the endpoint exists.</p>
      </div>
    );
  }

  const stability = gridData?.grid_stability;

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-sky-500/10 border border-sky-500/20 rounded-sm flex items-center justify-center">
            <Radio size={16} className="text-sky-400" />
          </div>
          <div>
            <h2 className="font-['Chivo'] font-bold text-base text-white">5G/6G Grid Balancing Monitor</h2>
            <p className="text-xs text-slate-500">Low-latency real-time grid telemetry · polling every {POLL_MS / 1000}s</p>
          </div>
        </div>

        {/* Live latency pill */}
        <div className="flex items-center gap-2 bg-[#0F172A] border border-[#1E293B] rounded-sm px-3 py-1.5">
          <LiveDot />
          <span className="font-['JetBrains_Mono',monospace] text-sm font-bold text-sky-400">
            {gridData?.latency_ms?.toFixed(2)} ms
          </span>
          <span className="text-xs text-slate-600">5G/6G latency</span>
        </div>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Stability */}
        <div className={`border rounded-sm p-4 ${stabilityBg(stability)}`}>
          <div className="flex items-center gap-2 mb-2">
            <Activity size={14} className={stabilityTextColor(stability)} />
            <span className="text-xs text-slate-500">Grid Stability</span>
          </div>
          <div className={`font-['Chivo'] font-bold text-lg capitalize ${stabilityTextColor(stability)}`}>
            {stability}
          </div>
        </div>

        {/* Connected nodes */}
        <div className="bg-[#0F172A] border border-[#1E293B] rounded-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <Cpu size={14} className="text-sky-400" />
            <span className="text-xs text-slate-500">5G/6G Nodes</span>
          </div>
          <div className="font-['Chivo'] font-bold text-lg text-sky-400">{gridData?.active_nodes}</div>
          <div className="text-xs text-slate-600 mt-0.5">edge nodes connected</div>
        </div>

        {/* Total load */}
        <div className="bg-[#0F172A] border border-[#1E293B] rounded-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={14} className="text-amber-400" />
            <span className="text-xs text-slate-500">Total Load</span>
          </div>
          <div className="font-['Chivo'] font-bold text-lg text-amber-400">
            {gridData?.total_load_mw?.toLocaleString()} MW
          </div>
        </div>

        {/* Voltage */}
        <div className="bg-[#0F172A] border border-[#1E293B] rounded-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={14} className="text-emerald-400" />
            <span className="text-xs text-slate-500">Voltage</span>
          </div>
          <div className="font-['Chivo'] font-bold text-lg text-emerald-400">
            {gridData?.voltage_kv?.toFixed(1)} kV
          </div>
        </div>
      </div>

      {/* ── Frequency Gauge + History Chart ────────────────────────────────── */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Live frequency readout */}
        <div className="bg-[#0F172A] border border-[#1E293B] rounded-sm p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Activity size={14} className="text-sky-400" />
              <h3 className="text-sm font-semibold text-white">Live Grid Frequency</h3>
            </div>
            <span className="text-xs text-slate-600">Nominal: 50.000 Hz</span>
          </div>
          <FrequencyDisplay hz={gridData?.frequency_hz} />
        </div>

        {/* Rolling frequency history (last ~60 s) */}
        <div className="bg-[#0F172A] border border-[#1E293B] rounded-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Globe size={14} className="text-sky-400" />
            <h3 className="text-sm font-semibold text-white">Frequency History (~60 s)</h3>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={freqHistory} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
              <XAxis dataKey="t" tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              {/* Domain centres on 50 Hz — makes small deviations visible */}
              <YAxis tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} domain={[49.5, 50.5]} />
              <Tooltip
                contentStyle={{ background: '#0F172A', border: '1px solid #1E293B', borderRadius: '2px', fontSize: 11 }}
                formatter={v => [`${v.toFixed(3)} Hz`, 'Frequency']}
              />
              <Line type="monotone" dataKey="hz" stroke="#0EA5E9" strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Energy Mix + Events Log ─────────────────────────────────────────── */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Renewable mix pie */}
        <div className="bg-[#0F172A] border border-[#1E293B] rounded-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sun size={14} className="text-amber-400" />
            <h3 className="text-sm font-semibold text-white">Real-Time Energy Mix</h3>
          </div>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width={140} height={140}>
              <PieChart>
                <Pie data={mixData} cx="50%" cy="50%" innerRadius={38} outerRadius={64} paddingAngle={2} dataKey="value">
                  {mixData.map(e => (
                    <Cell key={e.name} fill={MIX_COLORS[e.name] || '#64748B'} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#0F172A', border: '1px solid #1E293B', fontSize: 11 }} formatter={v => [`${v}%`, '']} />
              </PieChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div className="space-y-2.5">
              {mixData.map(e => (
                <div key={e.name} className="flex items-center gap-2 text-xs">
                  <span style={{ background: MIX_COLORS[e.name] || '#64748B' }} className="w-2.5 h-2.5 rounded-sm shrink-0" />
                  <span className="text-slate-400 capitalize flex items-center gap-1">
                    {ENERGY_ICONS[e.name]} {e.name}
                  </span>
                  <span className="text-white font-semibold ml-auto">{e.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Event log */}
        <div className="bg-[#0F172A] border border-[#1E293B] rounded-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={14} className="text-amber-400" />
            <h3 className="text-sm font-semibold text-white">Grid Event Log</h3>
            <div className="ml-auto flex items-center gap-1.5 text-xs text-emerald-400">
              <LiveDot /> Live
            </div>
          </div>
          <EventsLog events={gridData?.events} />
        </div>
      </div>

      {/* ── Regional Load Distribution ──────────────────────────────────────── */}
      {gridData?.regions?.length > 0 && (
        <div className="bg-[#0F172A] border border-[#1E293B] rounded-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Wifi size={14} className="text-sky-400" />
            <h3 className="text-sm font-semibold text-white">Regional Load Distribution — 5G/6G Node Network</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {gridData.regions.map(r => (
              <div key={r.name} className="bg-[#1E293B]/40 rounded-sm p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-white">{r.name}</span>
                  <span className={`text-xs font-bold ${r.load_pct > 85 ? 'text-red-400' : r.load_pct > 70 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {r.load_pct}%
                  </span>
                </div>
                {/* Percentage bar */}
                <div className="w-full bg-[#1E293B] rounded-full h-1.5 mb-2">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-700 ${r.load_pct > 85 ? 'bg-red-400' : r.load_pct > 70 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                    style={{ width: `${Math.min(r.load_pct, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>{r.load_mw} MW</span>
                  <span>{r.nodes} nodes</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
