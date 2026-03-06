import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Zap, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { API, useAuth } from '../App';

const ENERGY_ROLES = [
  { id: 'client', label: 'Energy Buyer', desc: 'Post RFQs and find the best energy deals' },
  { id: 'vendor', label: 'Energy Vendor', desc: 'Bid on projects and grow your business' },
];

export default function Auth() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [tab, setTab] = useState('login'); // login / register
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    email: '', password: '', name: '', role: 'client', company: '',
  });

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await axios.post(`${API}/auth/login`, { email: form.email, password: form.password }, { withCredentials: true });
      console.log(res)
      setUser(res.data);
      console.log(res)
      const role = res.data.role;
      navigate(role === 'admin' ? '/admin' : `/${role}/dashboard`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) { setError('Please fill all fields'); return; }
    setLoading(true); setError('');
    try {
      const res = await axios.post(`${API}/auth/register`, {
        email: form.email, password: form.password, name: form.name,
        role: form.role, company: form.company || undefined,
      }, { withCredentials: true });
      setUser(res.data.user);
      const role = res.data.user.role;
      navigate(role === 'admin' ? '/admin' : `/${role}/dashboard`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
  const handleGoogleLogin = (role) => {
    localStorage.setItem('google_auth_role', role);
    const redirectUrl = window.location.origin + (role === 'vendor' ? '/vendor/dashboard' : '/client/dashboard');
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen bg-[#020617] flex">
      {/* Left Panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-[#0F172A] border-r border-[#1E293B] p-12 relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{ backgroundImage: `url(https://images.unsplash.com/photo-1611365892117-00ac5ef43c90?crop=entropy&cs=srgb&fm=jpg&q=85&w=1000)` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0F172A]/60 to-[#0F172A]/90" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-16">
            <div className="w-8 h-8 bg-sky-500 rounded-sm flex items-center justify-center">
              <Zap size={16} strokeWidth={2.5} className="text-white" />
            </div>
            <span className="font-['Chivo'] font-black text-xl text-white">RENERGIZR</span>
          </div>
          <h2 className="font-['Chivo'] font-black text-5xl text-white leading-tight mb-6">
            The future of<br />energy trading<br />is <span className="text-sky-400">here.</span>
          </h2>
          <p className="text-slate-400 text-base leading-relaxed max-w-sm">
            Connect with verified energy vendors, leverage AI-powered bid analysis, and close deals faster than ever.
          </p>
        </div>
        <div className="relative space-y-4">
          {[
            { stat: '500+', text: 'Verified energy vendors' },
            { stat: '94%', text: 'AI bid match accuracy' },
            { stat: '< 48h', text: 'Average bid response' },
          ].map(item => (
            <div key={item.stat} className="flex items-center gap-4">
              <div className="font-['Chivo'] font-black text-2xl text-sky-400 w-20">{item.stat}</div>
              <div className="text-sm text-slate-400">{item.text}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="flex items-center gap-2 mb-10 lg:hidden">
            <div className="w-8 h-8 bg-sky-500 rounded-sm flex items-center justify-center">
              <Zap size={16} strokeWidth={2.5} className="text-white" />
            </div>
            <span className="font-['Chivo'] font-black text-xl text-white">RENERGIZR</span>
          </div>

          {/* Tabs */}
          <div className="flex bg-[#0F172A] border border-[#1E293B] rounded-sm p-1 mb-8">
            <button
              data-testid="auth-login-tab"
              onClick={() => { setTab('login'); setError(''); }}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-sm transition-colors duration-200 ${
                tab === 'login' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              data-testid="auth-register-tab"
              onClick={() => { setTab('register'); setError(''); }}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-sm transition-colors duration-200 ${
                tab === 'register' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>

          {error && (
            <div data-testid="auth-error" className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-sm text-sm mb-6">
              {error}
            </div>
          )}

          {tab === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-2 block">Email</label>
                <input
                  data-testid="login-email-input"
                  type="email"
                  value={form.email}
                  onChange={e => update('email', e.target.value)}
                  placeholder="you@company.com"
                  className="w-full bg-[#0F172A] border border-[#1E293B] focus:border-sky-500 text-white placeholder-slate-600 px-4 py-3 rounded-sm text-sm outline-none transition-colors duration-200"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-2 block">Password</label>
                <div className="relative">
                  <input
                    data-testid="login-password-input"
                    type={showPw ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => update('password', e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#0F172A] border border-[#1E293B] focus:border-sky-500 text-white placeholder-slate-600 px-4 py-3 pr-10 rounded-sm text-sm outline-none transition-colors duration-200"
                    required
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button
                data-testid="login-submit-btn"
                type="submit"
                disabled={loading}
                className="w-full bg-sky-500 hover:bg-sky-600 disabled:opacity-60 text-white py-3 rounded-sm font-semibold text-sm transition-colors duration-200 flex items-center justify-center gap-2 mt-2"
              >
                {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <>Sign In <ArrowRight size={14} /></>}
              </button>
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#1E293B]" /></div>
                <div className="relative flex justify-center text-xs text-slate-500 bg-[#020617] px-3">or continue with</div>
              </div>
              <button
                data-testid="google-login-btn"
                type="button"
                onClick={() => handleGoogleLogin('client')}
                className="w-full bg-[#0F172A] hover:bg-[#1E293B] border border-[#1E293B] text-white py-3 rounded-sm font-semibold text-sm transition-colors duration-200 flex items-center justify-center gap-3"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              {/* Role Selection */}
              <div>
                <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-2 block">I am a...</label>
                <div className="grid grid-cols-2 gap-3">
                  {ENERGY_ROLES.map(r => (
                    <button
                      key={r.id}
                      type="button"
                      data-testid={`role-${r.id}-btn`}
                      onClick={() => update('role', r.id)}
                      className={`p-3 border rounded-sm text-left transition-all duration-200 ${
                        form.role === r.id
                          ? 'border-sky-500 bg-sky-500/10'
                          : 'border-[#1E293B] hover:border-[#334155]'
                      }`}
                    >
                      <div className={`text-sm font-semibold mb-0.5 ${form.role === r.id ? 'text-sky-400' : 'text-white'}`}>{r.label}</div>
                      <div className="text-xs text-slate-500">{r.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-2 block">Full Name</label>
                <input
                  data-testid="register-name-input"
                  type="text"
                  value={form.name}
                  onChange={e => update('name', e.target.value)}
                  placeholder="John Sharma"
                  className="w-full bg-[#0F172A] border border-[#1E293B] focus:border-sky-500 text-white placeholder-slate-600 px-4 py-3 rounded-sm text-sm outline-none transition-colors"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-2 block">Company Name</label>
                <input
                  data-testid="register-company-input"
                  type="text"
                  value={form.company}
                  onChange={e => update('company', e.target.value)}
                  placeholder="Your Company Ltd"
                  className="w-full bg-[#0F172A] border border-[#1E293B] focus:border-sky-500 text-white placeholder-slate-600 px-4 py-3 rounded-sm text-sm outline-none transition-colors"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-2 block">Email</label>
                <input
                  data-testid="register-email-input"
                  type="email"
                  value={form.email}
                  onChange={e => update('email', e.target.value)}
                  placeholder="you@company.com"
                  className="w-full bg-[#0F172A] border border-[#1E293B] focus:border-sky-500 text-white placeholder-slate-600 px-4 py-3 rounded-sm text-sm outline-none transition-colors"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-2 block">Password</label>
                <div className="relative">
                  <input
                    data-testid="register-password-input"
                    type={showPw ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => update('password', e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#0F172A] border border-[#1E293B] focus:border-sky-500 text-white placeholder-slate-600 px-4 py-3 pr-10 rounded-sm text-sm outline-none transition-colors"
                    required
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button
                data-testid="register-submit-btn"
                type="submit"
                disabled={loading}
                className="w-full bg-sky-500 hover:bg-sky-600 disabled:opacity-60 text-white py-3 rounded-sm font-semibold text-sm transition-colors duration-200 flex items-center justify-center gap-2"
              >
                {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <>Create Account <ArrowRight size={14} /></>}
              </button>
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#1E293B]" /></div>
                <div className="relative flex justify-center text-xs text-slate-500 bg-[#020617] px-3">or sign up with</div>
              </div>
              <button
                data-testid="google-register-btn"
                type="button"
                onClick={() => handleGoogleLogin(form.role)}
                className="w-full bg-[#0F172A] hover:bg-[#1E293B] border border-[#1E293B] text-white py-3 rounded-sm font-semibold text-sm transition-colors duration-200 flex items-center justify-center gap-3"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>
            </form>
          )}

          <p className="text-center text-xs text-slate-600 mt-8">
            By continuing, you agree to Renergizr's{' '}
            <a href="#" className="text-slate-400 hover:text-white">Terms of Service</a>{' '}
            and{' '}
            <a href="#" className="text-slate-400 hover:text-white">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
