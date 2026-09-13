import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { REGION_LABEL, SKUS, SUPPLIERS, USERS } from '../data/catalog';
import { fmtDay, parseDay } from '../lib/format';
import { useStore } from '../store/Store';
import { WORLD } from '../data/world';
import { ToastHost } from './bits';

const NAV = [
  { to: '/', label: 'Today', end: true, key: 't' },
  { to: '/forecast', label: 'Forecast', key: 'f' },
  { to: '/models', label: 'Models', key: 'm' },
  { to: '/stock', label: 'Stock', key: 's' },
  { to: '/buy', label: 'Buy', key: 'b' },
  { to: '/sales', label: 'Sales', key: 'a' },
  { to: '/network', label: 'Network', key: 'n' },
  { to: '/catalog', label: 'Catalog', key: 'c' },
];

export function Shell() {
  const { user, storeFilter, setStoreFilter, regionFilter, setRegionFilter, signIn, signOut, reset, toasts, pos, regionStores } = useStore();
  const nav = useNavigate();
  const loc = useLocation();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const g = useRef(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(true);
        return;
      }
      if (e.key === '/' && !typing) {
        e.preventDefault();
        setOpen(true);
        return;
      }
      if (e.key === 'Escape') {
        setOpen(false);
        setMenu(false);
        g.current = false;
      }
      if (typing) return;
      if (e.key === 'g') {
        g.current = true;
        window.setTimeout(() => {
          g.current = false;
        }, 700);
        return;
      }
      if (g.current) {
        const hit = NAV.find((n) => n.key === e.key.toLowerCase());
        if (hit) {
          e.preventDefault();
          nav(hit.to);
          g.current = false;
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nav]);

  useEffect(() => {
    setOpen(false);
    setQ('');
  }, [loc.pathname]);

  const hits = useMemo(() => {
    const s = q.trim().toLowerCase();
    const pages = NAV.map((n) => ({ kind: 'Page', label: n.label, to: n.to }));
    const skus = SKUS.map((k) => ({ kind: 'SKU', label: `${k.brand} ${k.name}`, to: `/forecast?sku=${k.id}` }));
    const stores = regionStores.map((st) => ({ kind: 'Store', label: `${st.name}, ${st.city}`, to: `/network?store=${st.id}` }));
    const sup = SUPPLIERS.map((x) => ({ kind: 'Supplier', label: x.name, to: `/network?supplier=${x.id}` }));
    const orders = pos.map((p) => ({ kind: 'PO', label: p.id, to: `/buy?po=${p.id}` }));
    const all = [...pages, ...skus, ...stores, ...sup, ...orders];
    if (!s) return all.slice(0, 12);
    return all.filter((x) => x.label.toLowerCase().includes(s) || x.kind.toLowerCase().includes(s)).slice(0, 16);
  }, [q, pos, regionStores]);

  const locked = Boolean(user?.storeId);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="sticky top-0 z-30 bg-paper/95 backdrop-blur border-b border-line">
        <div className="max-w-[1320px] mx-auto px-4 md:px-6 h-14 flex items-center gap-3 md:gap-6">
          <button type="button" onClick={() => nav('/')} className="flex items-center gap-2.5 shrink-0">
            <span className="w-7 h-7 rounded-md bg-forest text-paper grid place-items-center">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="1" y="2.5" width="12" height="1.5" rx="0.6" fill="currentColor" />
                <rect x="1" y="6.2" width="12" height="1.5" rx="0.6" fill="currentColor" />
                <rect x="1" y="9.9" width="8" height="1.5" rx="0.6" fill="currentColor" />
                <circle cx="11.4" cy="10.65" r="1.35" fill="#E2B15A" />
              </svg>
            </span>
            <span className="font-display text-[17px] tracking-tight">SHELFSIGNAL</span>
          </button>

          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex flex-1 max-w-md h-9 items-center gap-2 px-3 rounded-lg border border-line bg-white text-mute text-[13px]"
          >
            <span className="truncate">Search SKU, store, PO</span>
            <span className="ml-auto num text-[11px] border border-line rounded px-1.5 py-0.5 hidden sm:inline">⌘K</span>
          </button>

          <div className="ml-auto flex items-center gap-3 text-[13px]">
            <div className="num hidden sm:block">{fmtDay(parseDay(WORLD.asOf), true)}</div>
            <div className="relative pl-3 border-l border-line">
              <button type="button" onClick={() => setMenu((m) => !m)} className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-forest text-paper grid place-items-center text-[12px] font-medium">
                  {user?.name
                    .split(' ')
                    .map((p) => p[0])
                    .join('')}
                </span>
                <span className="text-left hidden lg:block">
                  <span className="block leading-tight">{user?.name}</span>
                  <span className="block text-[11px] text-mute leading-tight">{user?.title}</span>
                </span>
              </button>
              {menu && (
                <div className="absolute right-0 top-10 w-64 sheet rounded-xl p-1 text-left z-40">
                  <div className="px-3 py-1.5 text-[11px] text-mute">Account</div>
                  {USERS.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      className={`w-full text-left px-3 py-2 rounded-lg hover:bg-mist ${u.id === user?.id ? 'bg-mist' : ''}`}
                      onClick={() => {
                        setMenu(false);
                        if (u.id !== user?.id) signIn(u.id);
                      }}
                    >
                      <div className="font-medium text-[13px]">{u.name}</div>
                      <div className="text-[11px] text-mute">{u.title}</div>
                    </button>
                  ))}
                  <div className="h-px bg-line my-1" />
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-mist"
                    onClick={() => {
                      setMenu(false);
                      reset();
                    }}
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-mist"
                    onClick={() => {
                      setMenu(false);
                      signOut();
                      nav('/in');
                    }}
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="max-w-[1320px] mx-auto px-4 md:px-6 h-11 flex items-center gap-1 overflow-x-auto no-scrollbar">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `px-3 h-11 flex items-center text-[13.5px] border-b-2 shrink-0 ${
                  isActive ? 'border-forest text-ink' : 'border-transparent text-mute hover:text-ink'
                }`
              }
            >
              {n.label}
            </NavLink>
          ))}
          <div className="ml-auto flex items-center gap-3 shrink-0 pl-3">
            <select
              className="h-8 text-[13px] bg-transparent max-w-[42vw] sm:max-w-none"
              value={user?.region || regionFilter}
              disabled={Boolean(user?.storeId || user?.region)}
              onChange={(e) => setRegionFilter(e.target.value)}
            >
              <option value="all">All regions</option>
              {Object.entries(REGION_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <select
              className="h-8 text-[13px] bg-transparent max-w-[42vw] sm:max-w-none"
              value={storeFilter}
              disabled={locked}
              onChange={(e) => setStoreFilter(e.target.value)}
            >
              <option value="all">All {regionStores.length} stores</option>
              {regionStores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {s.city}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <main className="max-w-[1320px] mx-auto px-4 md:px-6 py-4 md:py-6 min-w-0">
        <Outlet />
      </main>
      <ToastHost toasts={toasts} />

      {open && (
        <div className="fixed inset-0 z-50 bg-ink/25 flex items-start justify-center pt-[12vh]" onClick={() => setOpen(false)}>
          <div className="w-[min(560px,calc(100vw-24px))] sheet rounded-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="SKU, store, supplier, PO…"
              className="w-full border-0 rounded-none px-4 h-12 text-[15px] focus:shadow-none"
            />
            <div className="max-h-[360px] overflow-y-auto border-t border-line">
              {hits.map((h) => (
                <button
                  key={h.kind + h.label + h.to}
                  type="button"
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-mist"
                  onClick={() => {
                    if (h.to.startsWith('/forecast?sku=')) {
                      const id = h.to.split('sku=')[1];
                      nav(`/forecast?sku=${id}`);
                    } else if (h.to.startsWith('/network?store=')) {
                      const id = h.to.split('store=')[1];
                      setStoreFilter(id);
                      nav('/stock');
                    } else {
                      nav(h.to);
                    }
                    setOpen(false);
                  }}
                >
                  <span className="kicker w-16">{h.kind}</span>
                  <span>{h.label}</span>
                </button>
              ))}
              {!hits.length && <div className="px-4 py-8 text-center text-mute text-sm">Nothing matches.</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
