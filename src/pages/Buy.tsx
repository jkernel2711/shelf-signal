import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SKUS, STORES, SUPPLIERS } from '../data/catalog';
import { poValue } from '../engine/plan';
import { cases, fmtDay, inr, inrCompact, num } from '../lib/format';
import { useStore, useTower } from '../store/Store';
import { Badge, Drawer, Empty } from '../ui/bits';
import type { PoStatus, PurchaseOrder, SuggestedLine } from '../types';

const STAT: Record<PoStatus, { label: string; tone: 'ok' | 'warn' | 'crit' | 'mute' | 'forest' }> = {
  draft: { label: 'Draft', tone: 'mute' },
  submitted: { label: 'Submitted', tone: 'warn' },
  approved: { label: 'Approved', tone: 'forest' },
  in_transit: { label: 'Transit', tone: 'warn' },
  received: { label: 'Received', tone: 'ok' },
  cancelled: { label: 'Cancelled', tone: 'mute' },
};

export function Buy() {
  const [params] = useSearchParams();
  const highlight = params.get('po');
  const { createBuy, receivePo, setPoStatus, cancelPo, hold, pos, user, live } = useStore();
  const { sug } = useTower();
  const [tab, setTab] = useState<'suggested' | 'orders'>(highlight ? 'orders' : 'suggested');
  const [edits, setEdits] = useState<Record<string, number>>({});
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [openPo, setOpenPo] = useState<string | null>(highlight);

  const lines = useMemo(() => {
    return sug.map((l) => ({ ...l, qty: edits[l.key] ?? l.qty, value: (edits[l.key] ?? l.qty) * SKUS.find((s) => s.id === l.skuId)!.cost }));
  }, [sug, edits]);

  const selected = lines.filter((l) => picked[l.key]);
  const selectedValue = selected.reduce((s, l) => s + l.value, 0);
  const grouped = groupBySupplier(lines);
  const canApprove = user?.role !== 'store';
  const po = pos.find((p) => p.id === openPo);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 bg-white border border-line rounded-lg p-1">
          <button
            type="button"
            className={`px-3 h-8 rounded-md text-[13px] ${tab === 'suggested' ? 'bg-forest text-paper' : 'text-mute'}`}
            onClick={() => setTab('suggested')}
          >
            Suggested
          </button>
          <button
            type="button"
            className={`px-3 h-8 rounded-md text-[13px] ${tab === 'orders' ? 'bg-forest text-paper' : 'text-mute'}`}
            onClick={() => setTab('orders')}
          >
            POs
          </button>
        </div>
      </div>

      {tab === 'suggested' ? (
        <>
          <div className="sheet rounded-2xl px-4 py-3 mb-4 flex items-center gap-3">
            <div className="text-[13px] num">
              {selected.length} · {inrCompact(selectedValue)}
            </div>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                const next: Record<string, boolean> = {};
                for (const l of lines.filter((x) => x.urgent)) next[l.key] = true;
                setPicked(next);
              }}
            >
              Urgent
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setPicked({})}>
              Clear
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => exportCsv(selected.length ? selected : lines)}>
              CSV
            </button>
            <button
              type="button"
              className="btn btn-primary ml-auto"
              disabled={!selected.length}
              onClick={() => {
                createBuy(selected.map((l) => ({ skuId: l.skuId, storeId: l.storeId, qty: l.qty })));
                setPicked({});
                setTab('orders');
              }}
            >
              {canApprove ? 'Approve' : 'Submit'} {selected.length}
            </button>
          </div>

          {grouped.map(([supplierId, glines]) => {
            const sup = SUPPLIERS.find((s) => s.id === supplierId)!;
            const val = glines.reduce((s, l) => s + l.value, 0);
            return (
              <section key={supplierId} className="sheet rounded-2xl overflow-hidden mb-3">
                <div className="px-4 py-2.5 border-b border-line flex items-center gap-3">
                  <div className="font-medium">{sup.name}</div>
                  <div className="text-[12px] text-mute">
                    {sup.leadDays}d · {Math.round(sup.otif * 100)}%
                    {sup.last != null && (
                      <span className="ml-2 num">
                        {sup.ticker} {sup.last.toFixed(2)}{' '}
                        <span className={sup.chg! >= 0 ? 'text-forest-dim' : 'text-crit'}>
                          {sup.chg! >= 0 ? '+' : ''}
                          {sup.chg}%
                        </span>
                      </span>
                    )}
                  </div>
                  <div className="ml-auto num text-[13px]">{inr(val)}</div>
                </div>
                <table className="data">
                  <thead>
                    <tr>
                      <th></th>
                      <th>SKU</th>
                      <th>Store</th>
                      <th>On hand</th>
                      <th>Cover</th>
                      <th>Qty</th>
                      <th>Value</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {glines.map((l) => {
                      const sku = SKUS.find((s) => s.id === l.skuId)!;
                      const st = STORES.find((s) => s.id === l.storeId)!;
                      return (
                        <tr key={l.key}>
                          <td>
                            <input
                              type="checkbox"
                              checked={!!picked[l.key]}
                              onChange={(e) => setPicked((p) => ({ ...p, [l.key]: e.target.checked }))}
                            />
                          </td>
                          <td>
                            <div className="font-medium">
                              {sku.brand} {sku.name}
                            </div>
                            <div className="text-[12px] text-mute">{l.reason}</div>
                          </td>
                          <td className="text-mute">{st.name}</td>
                          <td className="num">{num(l.onHand)}</td>
                          <td className="num">{l.coverDays.toFixed(1)}d</td>
                          <td>
                            <input
                              type="number"
                              className="w-20 h-8"
                              min={sku.casePack}
                              step={sku.casePack}
                              value={l.qty}
                              onChange={(e) => setEdits((x) => ({ ...x, [l.key]: Number(e.target.value) }))}
                            />
                            <div className="text-[11px] text-mute">{cases(l.qty, sku.casePack)}</div>
                          </td>
                          <td className="num">{inr(l.value)}</td>
                          <td>
                            <button type="button" className="text-[12px] text-mute" onClick={() => hold(l.key)}>
                              Hold
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </section>
            );
          })}
          {!lines.length && <Empty title="Nothing to buy" />}
          {(live.held ?? []).length > 0 && (
            <div className="text-[12px] text-mute mt-2">
              Held {(live.held ?? []).length}
              {(live.held ?? []).map((k) => (
                <button key={k} type="button" className="ml-2 underline" onClick={() => hold(k)}>
                  {k}
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <section className="sheet rounded-2xl overflow-hidden">
          <table className="data">
            <thead>
              <tr>
                <th>PO</th>
                <th>Supplier</th>
                <th>Store</th>
                <th>ETA</th>
                <th>Value</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pos.map((p) => {
                const sup = SUPPLIERS.find((s) => s.id === p.supplierId)!;
                const st = STORES.find((s) => s.id === p.storeId)!;
                return (
                  <tr key={p.id} className={highlight === p.id || openPo === p.id ? 'active' : ''} onClick={() => setOpenPo(p.id)}>
                    <td className="num font-medium">{p.id}</td>
                    <td>{sup.name}</td>
                    <td className="text-mute">{st.name}</td>
                    <td className="num">{fmtDay(p.eta)}</td>
                    <td className="num">{inr(poValue(p))}</td>
                    <td>
                      <Badge tone={STAT[p.status].tone}>{STAT[p.status].label}</Badge>
                    </td>
                    <td className="text-right" onClick={(e) => e.stopPropagation()}>
                      {p.status !== 'received' && p.status !== 'cancelled' && (
                        <button type="button" className="btn btn-ghost h-7 text-[12px]" onClick={() => receivePo(p.id)}>
                          Receive
                        </button>
                      )}
                      {p.status === 'submitted' && canApprove && (
                        <button type="button" className="btn btn-primary h-7 text-[12px] ml-1" onClick={() => setPoStatus(p.id, 'approved')}>
                          Approve
                        </button>
                      )}
                      {p.status !== 'received' && p.status !== 'cancelled' && (
                        <button type="button" className="text-[12px] text-mute ml-2" onClick={() => cancelPo(p.id)}>
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      {po && (
        <PoDrawer po={po} onClose={() => setOpenPo(null)} onReceive={receivePo} />
      )}
    </div>
  );
}

function PoDrawer({
  po,
  onClose,
  onReceive,
}: {
  po: PurchaseOrder;
  onClose: () => void;
  onReceive: (id: string, got?: Record<string, number>) => void;
}) {
  const [got, setGot] = useState<Record<string, number>>(() => Object.fromEntries(po.lines.map((l) => [l.skuId, l.qty])));
  const sup = SUPPLIERS.find((s) => s.id === po.supplierId)!;
  const st = STORES.find((s) => s.id === po.storeId)!;
  const open = po.status !== 'received' && po.status !== 'cancelled';

  return (
    <Drawer open onClose={onClose} title={po.id} kicker={`${sup.name} · ${st.name}`}>
      <div className="text-[13px] text-mute mb-3">
        ETA {fmtDay(po.eta)} · {inr(poValue(po))}
      </div>
      <table className="data mb-4">
        <thead>
          <tr>
            <th>SKU</th>
            <th>Ordered</th>
            {open && <th>Got</th>}
          </tr>
        </thead>
        <tbody>
          {po.lines.map((l) => {
            const sku = SKUS.find((s) => s.id === l.skuId)!;
            return (
              <tr key={l.skuId}>
                <td>
                  {sku.brand} {sku.name}
                </td>
                <td className="num">{l.qty}</td>
                {open && (
                  <td>
                    <input
                      type="number"
                      min={0}
                      className="w-20 h-8"
                      value={got[l.skuId] ?? l.qty}
                      onChange={(e) => setGot((g) => ({ ...g, [l.skuId]: Number(e.target.value) }))}
                    />
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      {open && (
        <button type="button" className="btn btn-primary" onClick={() => onReceive(po.id, got)}>
          Receive
        </button>
      )}
    </Drawer>
  );
}

function groupBySupplier(lines: SuggestedLine[]) {
  const m = new Map<string, SuggestedLine[]>();
  for (const l of lines) {
    const arr = m.get(l.supplierId) ?? [];
    arr.push(l);
    m.set(l.supplierId, arr);
  }
  return [...m.entries()].sort((a, b) => b[1].reduce((s, x) => s + x.value, 0) - a[1].reduce((s, x) => s + x.value, 0));
}

function exportCsv(lines: SuggestedLine[]) {
  const header = 'sku,brand,name,store,qty,value,reason';
  const body = lines
    .map((l) => {
      const sku = SKUS.find((s) => s.id === l.skuId)!;
      const st = STORES.find((s) => s.id === l.storeId)!;
      return `${sku.id},"${sku.brand}","${sku.name}","${st.name}",${l.qty},${l.value},"${l.reason}"`;
    })
    .join('\n');
  const blob = new Blob([header + '\n' + body], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'shelfsignal-buy.csv';
  a.click();
}
