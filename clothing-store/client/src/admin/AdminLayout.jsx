import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Shirt, Boxes, Tags, ShoppingCart, Users, TicketPercent, LogOut, Menu, X, ExternalLink, BarChart3, Undo2, Mail, Star, PanelsTopLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NAV = [
  ['Dashboard', '/admin', LayoutDashboard, true],
  ['Products', '/admin/products', Shirt],
  ['Inventory', '/admin/inventory', Boxes],
  ['Categories', '/admin/categories', Tags],
  ['Orders', '/admin/orders', ShoppingCart],
  ['Returns', '/admin/returns', Undo2],
  ['Customers', '/admin/customers', Users],
  ['Messages', '/admin/messages', Mail],
  ['Reviews', '/admin/reviews', Star],
  ['Coupons', '/admin/coupons', TicketPercent],
  ['Reports', '/admin/reports', BarChart3],
  ['Settings', '/admin/homepage', PanelsTopLeft],
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const nav = (
    <nav className="flex flex-col gap-0.5 overflow-y-auto text-sm" aria-label="Admin">
      {NAV.map(([label, to, Icon, end]) => (
        <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)}
          className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 ${isActive ? 'bg-paper text-ink' : 'text-paper/70 hover:bg-paper/10 hover:text-paper'}`}>
          <Icon size={17} strokeWidth={1.5} /> {label}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-mist/50 lg:grid lg:grid-cols-[232px_1fr]">
      <div className="hidden bg-ink lg:block" aria-hidden="true" />
      <aside className={`fixed inset-y-0 left-0 z-50 w-[232px] flex-col bg-ink p-4 text-paper lg:flex ${open ? 'flex' : 'hidden'}`}>
        <div className="mb-8 flex items-center justify-between px-3 pt-2">
          <Link to="/admin" className="font-display text-2xl tracking-wordmark">Modern</Link>
          <button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu"><X size={20} /></button>
        </div>
        {nav}
        <div className="mt-auto space-y-1 border-t border-paper/15 pt-4 text-sm">
          <Link to="/" className="flex items-center gap-3 px-3 py-2 text-paper/70 hover:text-paper"><ExternalLink size={16} /> View store</Link>
          <button onClick={() => { logout(); navigate('/admin/login'); }} className="flex w-full items-center gap-3 px-3 py-2 text-paper/70 hover:text-paper"><LogOut size={16} /> Sign out</button>
          <p className="truncate px-3 pt-2 text-xs text-paper/40">{user?.email}</p>
        </div>
      </aside>
      {open && <button className="fixed inset-0 z-40 bg-ink/40 lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu" />}
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-ink/10 bg-paper px-4 lg:hidden">
          <button onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={22} /></button>
          <span className="font-display text-xl">Admin</span>
        </header>
        <main className="p-4 sm:p-8"><Outlet /></main>
      </div>
    </div>
  );
}
