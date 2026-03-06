import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Zap, LayoutDashboard, FileText, Search, User, Settings, LogOut, ChevronDown, Bell, CheckCheck, FileSignature } from 'lucide-react';
import { useAuth, API } from '../App';
import axios from 'axios';

const clientLinks = [
  { href: '/client/dashboard', icon: <LayoutDashboard size={16} strokeWidth={1.5} />, label: 'Dashboard' },
  { href: '/client/rfqs/new', icon: <FileText size={16} strokeWidth={1.5} />, label: 'New RFQ' },
  { href: '/client/contracts', icon: <FileSignature size={16} strokeWidth={1.5} />, label: 'Contracts' },
];
const vendorLinks = [
  { href: '/vendor/dashboard', icon: <LayoutDashboard size={16} strokeWidth={1.5} />, label: 'Dashboard' },
  { href: '/vendor/marketplace', icon: <Search size={16} strokeWidth={1.5} />, label: 'Marketplace' },
  { href: '/vendor/profile', icon: <User size={16} strokeWidth={1.5} />, label: 'My Profile' },
  { href: '/vendor/contracts', icon: <FileSignature size={16} strokeWidth={1.5} />, label: 'Contracts' },
];
const adminLinks = [
  { href: '/admin', icon: <Settings size={16} strokeWidth={1.5} />, label: 'Admin Panel' },
];

const NOTIF_ICONS = {
  new_bid: '📨',
  bid_shortlisted: '⭐',
  contract_awarded: '🏆',
  bid_rejected: '❌',
  vendor_verified: '✅',
  vendor_rejected: '⚠️',
  rfq_closed: '🔒',
  contract_response: '📋',
  default: '🔔',
};

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [dropOpen, setDropOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef(null);
  const dropRef = useRef(null);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await axios.get(`${API}/notifications`, { withCredentials: true });
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unread_count || 0);
    } catch {}
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (!user) return null;

  const links = user.role === 'client' ? clientLinks : user.role === 'vendor' ? vendorLinks : adminLinks;
  const roleColor = user.role === 'client' ? 'text-sky-400' : user.role === 'vendor' ? 'text-emerald-400' : 'text-amber-400';
  const roleBg = user.role === 'client' ? 'bg-sky-500/10' : user.role === 'vendor' ? 'bg-emerald-500/10' : 'bg-amber-500/10';

  const handleLogout = async () => {
    navigate('/');
    await logout();
  };

  const handleNotifClick = async (notif) => {
    if (!notif.read) {
      await axios.patch(`${API}/notifications/${notif.notif_id}/read`, {}, { withCredentials: true }).catch(() => {});
      setNotifications(prev => prev.map(n => n.notif_id === notif.notif_id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    if (notif.link) {
      setNotifOpen(false);
      navigate(notif.link);
    }
  };

  const markAllRead = async () => {
    await axios.post(`${API}/notifications/read-all`, {}, { withCredentials: true }).catch(() => {});
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  return (
    <nav data-testid="app-navbar" className="bg-[#0F172A]/95 backdrop-blur-xl border-b border-[#1E293B] sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link to={user.role === 'admin' ? '/admin' : `/${user.role}/dashboard`} className="flex items-center gap-2 shrink-0">
          <div className="w-6 h-6 bg-sky-500 rounded-sm flex items-center justify-center">
            <Zap size={12} strokeWidth={2.5} className="text-white" />
          </div>
          <span className="font-['Chivo'] font-black text-base text-white hidden sm:block">RENERGIZR</span>
        </Link>

        {/* Nav Links */}
        <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-hide">
          {links.map(l => (
            <Link
              key={l.href}
              to={l.href}
              data-testid={`nav-${l.label.toLowerCase().replace(/\s+/g, '-')}`}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm text-xs font-medium transition-colors duration-200 whitespace-nowrap ${
                location.pathname === l.href || (l.href !== '/' && location.pathname.startsWith(l.href) && l.href.length > 10)
                  ? 'bg-[#1E293B] text-white'
                  : 'text-slate-400 hover:text-white hover:bg-[#1E293B]/50'
              }`}
            >
              {l.icon}
              <span className="hidden md:block">{l.label}</span>
            </Link>
          ))}
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-2 ml-auto shrink-0">
          {/* Notification Bell */}
          <div className="relative" ref={notifRef}>
            <button
              data-testid="notification-bell"
              onClick={() => { setNotifOpen(!notifOpen); setDropOpen(false); }}
              className="relative w-8 h-8 flex items-center justify-center rounded-sm text-slate-400 hover:text-white hover:bg-[#1E293B] transition-colors"
            >
              <Bell size={15} strokeWidth={1.5} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[14px] h-3.5 bg-sky-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white px-0.5">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-full mt-1 w-80 bg-[#0F172A] border border-[#1E293B] rounded-sm shadow-2xl z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#1E293B]">
                  <div className="flex items-center gap-2">
                    <Bell size={13} className="text-sky-400" />
                    <span className="text-xs font-semibold text-white">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="bg-sky-500/20 text-sky-400 text-[10px] px-1.5 py-0.5 rounded-sm font-semibold">{unreadCount} new</span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} data-testid="mark-all-read-btn" className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-sky-400 transition-colors">
                      <CheckCheck size={11} /> Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center">
                      <Bell size={24} strokeWidth={1} className="text-slate-700 mx-auto mb-2" />
                      <p className="text-slate-600 text-xs">No notifications yet</p>
                    </div>
                  ) : (
                    notifications.map(n => (
                      <button
                        key={n.notif_id}
                        data-testid={`notif-${n.notif_id}`}
                        onClick={() => handleNotifClick(n)}
                        className={`w-full text-left px-4 py-3 border-b border-[#1E293B]/50 hover:bg-[#1E293B]/50 transition-colors last:border-0 ${!n.read ? 'bg-sky-500/5' : ''}`}
                      >
                        <div className="flex items-start gap-2.5">
                          <span className="text-sm mt-0.5 shrink-0">{NOTIF_ICONS[n.type] || NOTIF_ICONS.default}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-0.5">
                              <span className={`text-xs font-semibold truncate ${n.read ? 'text-slate-300' : 'text-white'}`}>{n.title}</span>
                              {!n.read && <span className="w-1.5 h-1.5 bg-sky-500 rounded-full shrink-0" />}
                            </div>
                            <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">{n.message}</p>
                            <p className="text-[10px] text-slate-700 mt-1">{timeAgo(n.created_at)}</p>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Menu */}
          <div className="relative" ref={dropRef}>
            <button
              data-testid="user-menu-btn"
              onClick={() => { setDropOpen(!dropOpen); setNotifOpen(false); }}
              className="flex items-center gap-2 bg-[#1E293B] hover:bg-[#334155] px-3 py-1.5 rounded-sm transition-colors duration-200"
            >
              <div className="w-6 h-6 bg-sky-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
                {user.name?.[0]?.toUpperCase()}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-semibold text-white leading-tight truncate max-w-[100px]">{user.name}</div>
                <div className={`text-xs ${roleColor} capitalize`}>{user.role}</div>
              </div>
              <ChevronDown size={14} className="text-slate-400" />
            </button>

            {dropOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-[#0F172A] border border-[#1E293B] rounded-sm shadow-xl z-50">
                <div className="px-4 py-3 border-b border-[#1E293B]">
                  <div className="text-xs text-white font-semibold truncate">{user.email}</div>
                  <div className={`text-xs ${roleColor} ${roleBg} inline-block px-1.5 py-0.5 rounded-sm mt-1 capitalize font-semibold`}>
                    {user.role}
                  </div>
                </div>
                <button
                  data-testid="logout-btn"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-400 hover:text-white hover:bg-[#1E293B] transition-colors"
                >
                  <LogOut size={14} />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
