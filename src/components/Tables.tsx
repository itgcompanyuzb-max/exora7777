import React, { useState } from 'react';
import { useTradingStore } from '../store';
import { Position } from '../types';
import { toast } from 'sonner';

export const Tables: React.FC = () => {
  const [tab, setTab] = useState<'positions' | 'pending' | 'history'>('positions');
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [newSl, setNewSl] = useState<string>('');
  const [newTp, setNewTp] = useState<string>('');
  const [partialVolume, setPartialVolume] = useState<string>('0.01');
  const [partialModalPos, setPartialModalPos] = useState<Position | null>(null);

  const {
    positions,
    pending,
    history,
    closePosition,
    partialClosePosition,
    closeAllPositions,
    cancelPendingOrder,
    modifyPosition,
  } = useTradingStore();

  const handleOpenModify = (p: Position) => {
    setEditingPosition(p);
    setNewSl(p.sl ? String(p.sl) : '');
    setNewTp(p.tp ? String(p.tp) : '');
  };

  const handleSaveModify = () => {
    if (!editingPosition) return;
    const sl = newSl ? parseFloat(newSl) : null;
    const tp = newTp ? parseFloat(newTp) : null;

    modifyPosition(editingPosition.id, { sl, tp });
    toast.success(`${editingPosition.symbol} SL/TP o'zgartirildi!`);
    setEditingPosition(null);
  };

  const handleExecutePartialClose = () => {
    if (!partialModalPos) return;
    const vol = parseFloat(partialVolume);
    if (isNaN(vol) || vol <= 0) {
      toast.error("Noto'g'ri hajm kiritildi");
      return;
    }
    partialClosePosition(partialModalPos.id, vol);
    toast.success(`${partialModalPos.symbol} ${vol} lot qisman yopildi!`);
    setPartialModalPos(null);
  };

  const handleCloseAll = () => {
    const count = closeAllPositions();
    if (count > 0) {
      toast.success(`Barcha ${count} ta ochiq pozitsiya yopildi!`);
    }
  };

  return (
    <div className="h-64 bg-[#1e222d] border-t border-[#2a2e39] flex flex-col select-none text-xs text-gray-300">
      {/* Tabs Header */}
      <div className="h-9 px-3 bg-[#181b23] border-b border-[#2a2e39] flex items-center justify-between">
        <div className="flex items-center gap-4 h-full">
          <button
            onClick={() => setTab('positions')}
            className={`h-full flex items-center gap-1.5 font-bold cursor-pointer relative ${
              tab === 'positions' ? 'text-white' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <span>Pozitsiyalar (Positions)</span>
            {positions.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-blue-500/20 text-blue-400 text-[10px]">
                {positions.length}
              </span>
            )}
            {tab === 'positions' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
          </button>

          <button
            onClick={() => setTab('pending')}
            className={`h-full flex items-center gap-1.5 font-bold cursor-pointer relative ${
              tab === 'pending' ? 'text-white' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <span>Kutilayotgan (Pending)</span>
            {pending.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-400 text-[10px]">
                {pending.length}
              </span>
            )}
            {tab === 'pending' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
          </button>

          <button
            onClick={() => setTab('history')}
            className={`h-full flex items-center gap-1.5 font-bold cursor-pointer relative ${
              tab === 'history' ? 'text-white' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <span>Tarix (History)</span>
            {history.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-gray-500/20 text-gray-400 text-[10px]">
                {history.length}
              </span>
            )}
            {tab === 'history' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
          </button>
        </div>

        {tab === 'positions' && positions.length > 0 && (
          <button
            onClick={handleCloseAll}
            className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white font-bold text-[10px] cursor-pointer transition-colors"
          >
            Barchasini yopish ({positions.length})
          </button>
        )}
      </div>

      {/* Table Body */}
      <div className="flex-1 overflow-auto p-2 font-mono text-[11px]">
        {/* TAB 1: POSITIONS */}
        {tab === 'positions' && (
          positions.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-500">
              Ochiq pozitsiyalar yo'q. Trade panel orqali BUY yoki SELL oching.
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="text-gray-400 border-b border-[#2a2e39] pb-1 text-[10px]">
                  <th className="py-1">Simvol</th>
                  <th>Turi</th>
                  <th>Hajm</th>
                  <th>Ochilgan narx</th>
                  <th>Joriy narx</th>
                  <th>SL</th>
                  <th>TP</th>
                  <th>Foyda (P/L)</th>
                  <th className="text-right">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a2e39]/50">
                {positions.map((p) => {
                  const isBuy = p.side === 'BUY';
                  const isProfit = p.pnl >= 0;
                  return (
                    <tr key={p.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-1.5 font-bold text-white">{p.symbol}</td>
                      <td>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          isBuy ? 'bg-blue-950 text-blue-400' : 'bg-orange-950 text-orange-400'
                        }`}>
                          {p.side}
                        </span>
                      </td>
                      <td className="text-white font-bold">{p.lot.toFixed(2)}</td>
                      <td className="text-gray-300">{p.openPrice}</td>
                      <td className="text-white font-bold">{p.currentPrice}</td>
                      <td className="text-red-400">{p.sl ?? '--'}</td>
                      <td className="text-emerald-400">{p.tp ?? '--'}</td>
                      <td className={`font-bold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isProfit ? '+' : ''}${p.pnl.toFixed(2)}
                      </td>
                      <td className="text-right space-x-1.5">
                        <button
                          onClick={() => handleOpenModify(p)}
                          className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer text-[10px]"
                        >
                          Tahrirlash
                        </button>
                        <button
                          onClick={() => {
                            setPartialModalPos(p);
                            setPartialVolume(String(Math.min(0.01, p.lot)));
                          }}
                          className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-black transition-colors cursor-pointer text-[10px]"
                        >
                          Qisman
                        </button>
                        <button
                          onClick={() => closePosition(p.id, 'MANUAL')}
                          className="px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white transition-colors cursor-pointer text-[10px]"
                        >
                          Yopish
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )
        )}

        {/* TAB 2: PENDING ORDERS */}
        {tab === 'pending' && (
          pending.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-500">
              Kutilayotgan buyurtmalar mavjud emas.
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="text-gray-400 border-b border-[#2a2e39] pb-1 text-[10px]">
                  <th className="py-1">Simvol</th>
                  <th>Order Turi</th>
                  <th>Hajm</th>
                  <th>Belgilangan Narx</th>
                  <th>SL</th>
                  <th>TP</th>
                  <th className="text-right">Amal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a2e39]/50">
                {pending.map((ord) => (
                  <tr key={ord.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-1.5 font-bold text-white">{ord.symbol}</td>
                    <td>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-gray-800 text-gray-300">
                        {ord.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="text-white font-bold">{ord.lot.toFixed(2)}</td>
                    <td className="text-primary font-bold">{ord.price}</td>
                    <td className="text-red-400">{ord.sl ?? '--'}</td>
                    <td className="text-emerald-400">{ord.tp ?? '--'}</td>
                    <td className="text-right">
                      <button
                        onClick={() => cancelPendingOrder(ord.id)}
                        className="px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white transition-colors cursor-pointer text-[10px]"
                      >
                        Bekor qilish
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}

        {/* TAB 3: HISTORY */}
        {tab === 'history' && (
          history.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-500">
              Bitimlar tarixi toza.
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="text-gray-400 border-b border-[#2a2e39] pb-1 text-[10px]">
                  <th className="py-1">Simvol</th>
                  <th>Turi</th>
                  <th>Hajm</th>
                  <th>Ochilgan narx</th>
                  <th>Yopilgan narx</th>
                  <th>Sabab</th>
                  <th className="text-right">Foyda / Zarar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a2e39]/50">
                {history.map((h) => {
                  const isBuy = h.side === 'BUY';
                  const isProfit = h.pnl >= 0;
                  return (
                    <tr key={h.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-1.5 font-bold text-white">{h.symbol}</td>
                      <td>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          isBuy ? 'bg-blue-950 text-blue-400' : 'bg-orange-950 text-orange-400'
                        }`}>
                          {h.side}
                        </span>
                      </td>
                      <td className="text-white">{h.lot.toFixed(2)}</td>
                      <td className="text-gray-400">{h.openPrice}</td>
                      <td className="text-white">{h.closePrice}</td>
                      <td>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold ${
                          h.reason === 'TP'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                            : h.reason === 'SL'
                            ? 'bg-red-950 text-red-400 border border-red-500/30'
                            : 'bg-gray-800 text-gray-300'
                        }`}>
                          {h.reason}
                        </span>
                      </td>
                      <td className={`text-right font-bold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isProfit ? '+' : ''}${h.pnl.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )
        )}
      </div>

      {/* Modify SL/TP Modal */}
      {editingPosition && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-[#1e222d] border border-[#2a2e39] rounded-2xl p-4 w-80 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between pb-1 border-b border-[#2a2e39]">
              <span className="font-bold text-white">SL / TP O'zgartirish</span>
              <span className="text-primary font-mono">{editingPosition.symbol}</span>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-red-400 uppercase font-bold">Stop Loss</label>
              <input
                type="number"
                step="0.00001"
                value={newSl}
                onChange={(e) => setNewSl(e.target.value)}
                placeholder="0.00000"
                className="w-full bg-[#131722] border border-[#2a2e39] rounded p-2 text-white font-mono text-xs focus:outline-none focus:border-red-400"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-emerald-400 uppercase font-bold">Take Profit</label>
              <input
                type="number"
                step="0.00001"
                value={newTp}
                onChange={(e) => setNewTp(e.target.value)}
                placeholder="0.00000"
                className="w-full bg-[#131722] border border-[#2a2e39] rounded p-2 text-white font-mono text-xs focus:outline-none focus:border-emerald-400"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingPosition(null)}
                className="px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 text-gray-300 text-xs cursor-pointer"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleSaveModify}
                className="px-4 py-1.5 rounded bg-primary text-black font-bold text-xs cursor-pointer hover:opacity-90"
              >
                Saqlash
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Partial Close Modal */}
      {partialModalPos && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-[#1e222d] border border-[#2a2e39] rounded-2xl p-4 w-80 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between pb-1 border-b border-[#2a2e39]">
              <span className="font-bold text-white">Qisman Yopish (Partial Close)</span>
              <span className="text-amber-400 font-mono">{partialModalPos.symbol}</span>
            </div>
            <div className="text-gray-400 text-xs">
              Joriy hajm: <strong className="text-white">{partialModalPos.lot} lot</strong>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-gray-300 uppercase font-bold">Yopiladigan hajm (Lot)</label>
              <input
                type="number"
                step="0.01"
                max={partialModalPos.lot}
                min="0.01"
                value={partialVolume}
                onChange={(e) => setPartialVolume(e.target.value)}
                className="w-full bg-[#131722] border border-amber-500/40 rounded p-2 text-white font-mono text-xs focus:outline-none"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setPartialModalPos(null)}
                className="px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 text-gray-300 text-xs cursor-pointer"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleExecutePartialClose}
                className="px-4 py-1.5 rounded bg-amber-400 text-black font-bold text-xs cursor-pointer hover:opacity-90"
              >
                Qisman Yopish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
