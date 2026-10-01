/**
 * ExnessBrokerAdapter.ts
 * 
 * Professional TradingView Broker API & Platform Adapter (Exness Terminal style)
 * Implements IBrokerTerminal and direct Trading Primitives (createPositionLine & createOrderLine)
 * 
 * Features:
 * 1. Full Broker API: placeOrder, modifyOrder, cancelOrder, orders, positions, isTradable, symbolInfo.
 * 2. Real Backend Communication: Sends orders to /api/orders, gets filled price & ticket.
 * 3. Exact Price Locking: Position line is attached directly to the price coordinate space,
 *    so it NEVER drifts or moves during chart zoom, mouse drag, or timeframe switch.
 * 4. Real-time P/L badges (+12.45 USD / -8.30 USD).
 * 5. Interactive Mouse-Draggable Stop Loss (SL) and Take Profit (TP) lines.
 * 6. Automatic cleanup on position close.
 */

// ============================================================================
// 1. TradingView Broker Types Definition
// ============================================================================

export type OrderType = 'Market' | 'Limit' | 'Stop' | 'StopLimit';
export type OrderSide = 'Buy' | 'Sell';
export type OrderStatus = 'Placing' | 'Open' | 'Filled' | 'Cancelled' | 'Rejected';

export interface PreOrder {
  symbol: string;
  type: OrderType;
  side: OrderSide;
  qty: number;
  price?: number;
  stopLoss?: number;
  takeProfit?: number;
  duration?: {
    type: 'GTC' | 'DAY';
  };
}

export interface PlacedOrder extends PreOrder {
  id: string;
  status: OrderStatus;
  filledQty?: number;
  avgPrice?: number;
  createdAt: number;
}

export interface PositionData {
  id: string;
  symbol: string;
  qty: number; // positive for buy, negative for sell
  side: 'Buy' | 'Sell';
  avgPrice: number;
  currentPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  unrealizedPl: number;
  realizedPl?: number;
  openedAt: number; // Unix timestamp in ms
}

export interface SymbolInfoData {
  name: string;
  ticker: string;
  description: string;
  type: string;
  session: string;
  exchange: string;
  listed_exchange: string;
  timezone: string;
  minmov: number;
  pricescale: number;
  minmove2?: number;
  fractional?: boolean;
  has_intraday: boolean;
  supported_resolutions: string[];
  intraday_multipliers: string[];
  has_daily: boolean;
  has_weekly_and_monthly: boolean;
  currency_code: string;
  original_currency_code?: string;
  pipSize: number;
  contractSize: number;
}

/**
 * Host interface provided by TradingView Charting Library / Trading Platform
 */
export interface IBrokerConnectionAdapterHost {
  orderUpdate(order: PlacedOrder): void;
  orderPartialUpdate(id: string, orderChanges: Partial<PlacedOrder>): void;
  positionUpdate(position: PositionData): void;
  positionPartialUpdate(id: string, positionChanges: Partial<PositionData>): void;
  plUpdate(positionId: string, pl: number): void;
  equityUpdate(equity: number): void;
  showNotification(title: string, message: string, type?: number): void;
}

/**
 * TradingView Native Chart Position Line Primitive
 */
export interface IPositionLineAdapter {
  setText(text: string): this;
  setTooltip(tooltip: string): this;
  setPrice(price: number): this;
  setQuantity(quantity: string): this;
  setLineStyle(style: number): this;
  setLineLength(length: number): this;
  setLineColor(color: string): this;
  setBodyBorderColor(color: string): this;
  setBodyBackgroundColor(color: string): this;
  setBodyTextColor(color: string): this;
  setQuantityBorderColor(color: string): this;
  setQuantityBackgroundColor(color: string): this;
  setQuantityTextColor(color: string): this;
  setCloseButtonBorderColor(color: string): this;
  setCloseButtonBackgroundColor(color: string): this;
  setCloseButtonIconColor(color: string): this;
  onClose(callback: () => void): this;
  onModify(callback: () => void): this;
  remove(): void;
}

/**
 * TradingView Native Chart Order Line Primitive (Draggable for SL / TP)
 */
export interface IOrderLineAdapter {
  setText(text: string): this;
  setTooltip(tooltip: string): this;
  setPrice(price: number): this;
  setQuantity(quantity: string): this;
  setLineStyle(style: number): this;
  setLineLength(length: number): this;
  setLineColor(color: string): this;
  setBodyBorderColor(color: string): this;
  setBodyBackgroundColor(color: string): this;
  setBodyTextColor(color: string): this;
  setQuantityBorderColor(color: string): this;
  setQuantityBackgroundColor(color: string): this;
  setQuantityTextColor(color: string): this;
  onCancel(callback: () => void): this;
  onMove(callback: (newPrice: number) => void): this;
  onModify(callback: () => void): this;
  remove(): void;
}

// ============================================================================
// 2. Main ExnessBrokerAdapter Class
// ============================================================================

export class ExnessBrokerAdapter {
  private _host: IBrokerConnectionAdapterHost | null = null;
  private _positions: Map<string, PositionData> = new Map();
  private _orders: Map<string, PlacedOrder> = new Map();
  private _chartLines: Map<string, {
    positionLine?: IPositionLineAdapter;
    slLine?: IOrderLineAdapter;
    tpLine?: IOrderLineAdapter;
  }> = new Map();
  private _chart: any = null; // TradingView active chart reference

  constructor(host?: IBrokerConnectionAdapterHost) {
    if (host) {
      this._host = host;
    }
  }

  /**
   * Set host if created before TradingView widget initializes
   */
  public setHost(host: IBrokerConnectionAdapterHost) {
    this._host = host;
  }

  /**
   * Set TradingView Chart instance for native Line Primitives
   */
  public setChart(chart: any) {
    this._chart = chart;
    this.refreshAllChartLines();
  }

  // ==========================================================================
  // Broker API: 1. placeOrder
  // ==========================================================================
  public async placeOrder(preOrder: PreOrder): Promise<{ success: boolean; orderId?: string; error?: string }> {
    try {
      // 1. Send order execution request to Backend OMS
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: preOrder.symbol,
          type: preOrder.type.toUpperCase(),
          side: preOrder.side.toUpperCase(),
          lots: preOrder.qty,
          qty: preOrder.qty,
          price: preOrder.price,
          sl: preOrder.stopLoss,
          tp: preOrder.takeProfit,
        }),
      });

      const data = await response.json();
      if (!data.success) {
        const errorMsg = data.error || 'Buyurtma ochishda xatolik yuz berdi';
        this._host?.showNotification('Buyurtma Rad Etildi', errorMsg, 1);
        return { success: false, error: errorMsg };
      }

      const orderId = String(data.orderId || data.ticket || `ord_${Date.now()}`);
      const fillPrice = Number(data.fillPrice || preOrder.price || 0);

      // 2. Create Placed Order entity
      const placedOrder: PlacedOrder = {
        ...preOrder,
        id: orderId,
        status: 'Filled',
        filledQty: preOrder.qty,
        avgPrice: fillPrice,
        createdAt: Date.now(),
      };
      this._orders.set(orderId, placedOrder);
      this._host?.orderUpdate(placedOrder);

      // 3. Create Position entity
      const positionId = String(data.position?.id || orderId);
      const position: PositionData = {
        id: positionId,
        symbol: preOrder.symbol,
        qty: preOrder.side === 'Buy' ? preOrder.qty : -preOrder.qty,
        side: preOrder.side,
        avgPrice: fillPrice,
        currentPrice: fillPrice,
        stopLoss: preOrder.stopLoss,
        takeProfit: preOrder.takeProfit,
        unrealizedPl: 0.00,
        openedAt: Date.now(),
      };
      this._positions.set(positionId, position);
      this._host?.positionUpdate(position);

      // 4. Draw native locked position line on TradingView chart
      this.drawPositionOnChart(position);

      this._host?.showNotification(
        'Sdelka Ochildi',
        `${preOrder.side.toUpperCase()} ${preOrder.qty} ${preOrder.symbol} @ ${fillPrice}`,
        0
      );

      return { success: true, orderId };
    } catch (err: any) {
      console.error('[BrokerAdapter placeOrder Error]', err);
      return { success: false, error: err.message || 'Tarmoq xatosi' };
    }
  }

  // ==========================================================================
  // Broker API: 2. modifyOrder (Stop Loss & Take Profit)
  // ==========================================================================
  public async modifyOrder(orderId: string, stopLoss?: number, takeProfit?: number): Promise<boolean> {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sl: stopLoss, tp: takeProfit }),
      });

      const data = await response.json();
      if (!data.success) {
        this._host?.showNotification('SL/TP Xatosi', data.error || 'O‘zgartirib bo‘lmadi', 1);
        return false;
      }

      // Update position state
      const pos = this._positions.get(orderId);
      if (pos) {
        pos.stopLoss = stopLoss;
        pos.takeProfit = takeProfit;
        this._host?.positionPartialUpdate(orderId, { stopLoss, takeProfit });
        this.updateSlTpLinesOnChart(pos);
      }

      this._host?.showNotification('SL/TP Yangilandi', `SL: ${stopLoss || 'None'}, TP: ${takeProfit || 'None'}`, 0);
      return true;
    } catch (err) {
      console.error('[BrokerAdapter modifyOrder Error]', err);
      return false;
    }
  }

  // ==========================================================================
  // Broker API: 3. cancelOrder
  // ==========================================================================
  public async cancelOrder(orderId: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        this._orders.delete(orderId);
        this.removeChartLines(orderId);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  // ==========================================================================
  // Broker API: 4. closePosition
  // ==========================================================================
  public async closePosition(positionId: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/orders/${positionId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!data.success) {
        this._host?.showNotification('Yopishda xatolik', data.error, 1);
        return false;
      }

      // 1. Remove from local store
      this._positions.delete(positionId);

      // 2. Remove all native chart lines (Position Line, SL Line, TP Line)
      this.removeChartLines(positionId);

      // 3. Notify TradingView host
      this._host?.positionUpdate({
        id: positionId,
        symbol: '',
        qty: 0,
        side: 'Buy',
        avgPrice: 0,
        currentPrice: 0,
        unrealizedPl: 0,
        openedAt: 0,
      });

      const pnl = data.realizedPnl ?? 0;
      this._host?.showNotification(
        'Bitim Yopildi',
        `Yakuniy Foyda: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)} USD`,
        0
      );
      return true;
    } catch (err) {
      console.error('[BrokerAdapter closePosition Error]', err);
      return false;
    }
  }

  // ==========================================================================
  // Broker API: 5. orders() & positions()
  // ==========================================================================
  public async orders(): Promise<PlacedOrder[]> {
    return Array.from(this._orders.values());
  }

  public async positions(): Promise<PositionData[]> {
    return Array.from(this._positions.values());
  }

  // ==========================================================================
  // Broker API: 6. isTradable & symbolInfo
  // ==========================================================================
  public isTradable(symbol: string): boolean {
    const s = symbol.toUpperCase().replace(/[\s\/-]/g, '');
    const tradables = ['XAUUSD', 'EURUSD', 'BTCUSD', 'GBPUSD', 'USDJPY', 'USOIL'];
    return tradables.includes(s) || s.includes('XAU') || s.includes('BTC') || s.includes('EUR');
  }

  public symbolInfo(symbol: string): SymbolInfoData {
    const s = symbol.toUpperCase().replace(/[\s\/-]/g, '');
    const isCrypto = s.includes('BTC');
    const isJpy = s.includes('JPY');
    const isGold = s.includes('XAU');

    const pricescale = isCrypto || isGold ? 100 : isJpy ? 1000 : 100000;
    const pipSize = isCrypto || isGold ? 0.01 : isJpy ? 0.01 : 0.0001;

    return {
      name: s,
      ticker: s,
      description: isGold ? 'Gold / US Dollar' : isCrypto ? 'Bitcoin / USD' : `${s} Currency Pair`,
      type: isCrypto ? 'crypto' : isGold ? 'commodity' : 'forex',
      session: '24x7',
      exchange: 'EXORA',
      listed_exchange: 'EXORA',
      timezone: 'Etc/UTC',
      minmov: 1,
      pricescale,
      has_intraday: true,
      supported_resolutions: ['1', '5', '15', '30', '60', '240', '1D', '1W'],
      intraday_multipliers: ['1', '5', '15', '30', '60', '240'],
      has_daily: true,
      has_weekly_and_monthly: true,
      currency_code: 'USD',
      pipSize,
      contractSize: isCrypto ? 1 : isGold ? 100 : 100000,
    };
  }

  // ==========================================================================
  // 7. REAL-TIME PROFIT & TICK UPDATE (Update P/L on Chart Line)
  // ==========================================================================
  public updateMarketTick(symbol: string, currentBid: number, currentAsk: number) {
    const norm = symbol.toUpperCase().replace(/[\s\/-]/g, '');

    for (const [posId, pos] of this._positions.entries()) {
      const posNorm = pos.symbol.toUpperCase().replace(/[\s\/-]/g, '');
      if (norm !== posNorm) continue;

      const isBuy = pos.side === 'Buy';
      const livePrice = isBuy ? currentBid : currentAsk;
      pos.currentPrice = livePrice;

      // Calculate PnL: (livePrice - avgPrice) * lotSize * contractSize
      const priceDiff = isBuy ? livePrice - pos.avgPrice : pos.avgPrice - livePrice;
      const contractSize = posNorm.includes('XAU') ? 100 : posNorm.includes('BTC') ? 1 : 100000;
      const pnl = Number((priceDiff * Math.abs(pos.qty) * contractSize).toFixed(2));
      pos.unrealizedPl = pnl;

      // 1. Notify TradingView host
      this._host?.plUpdate(posId, pnl);
      this._host?.positionPartialUpdate(posId, { currentPrice: livePrice, unrealizedPl: pnl });

      // 2. Update text & badge directly on TradingView native position line
      const lines = this._chartLines.get(posId);
      if (lines?.positionLine) {
        const pnlFormatted = `${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)} USD`;
        const text = `${isBuy ? '▲ BUY' : '▼ SELL'} ${Math.abs(pos.qty)} (${pnlFormatted})`;
        lines.positionLine.setText(text);
        
        // Dynamically style based on profit or loss
        const isProfit = pnl >= 0;
        lines.positionLine.setBodyBackgroundColor(isProfit ? '#064e3b' : '#450a0a');
        lines.positionLine.setBodyBorderColor(isProfit ? '#10b981' : '#ef4444');
      }
    }
  }

  // ==========================================================================
  // 8. TRADING PRIMITIVES: Native Chart Position & Draggable SL/TP Lines
  // ==========================================================================

  /**
   * Draw locked position line using TradingView chart.createPositionLine()
   * This stays 100% locked on the exact price coordinate regardless of chart zoom or mouse panning!
   */
  public drawPositionOnChart(position: PositionData) {
    if (!this._chart || typeof this._chart.createPositionLine !== 'function') {
      return;
    }

    // Clean up existing lines if re-drawing
    this.removeChartLines(position.id);

    const isBuy = position.side === 'Buy';
    const lineColor = isBuy ? '#2563eb' : '#dc2626';
    const bgColor = isBuy ? '#1e3a8a' : '#7f1d1d';
    const lotStr = Math.abs(position.qty).toString();

    // 1. Native Position Line
    const posLine = this._chart.createPositionLine();
    posLine
      .setPrice(position.avgPrice) // Locked to exact price coordinate!
      .setText(`${isBuy ? '▲ BUY' : '▼ SELL'} ${lotStr} (+$0.00)`)
      .setQuantity(lotStr)
      .setTooltip(`Ochilgan Narx: ${position.avgPrice}`)
      .setLineStyle(2) // 0=Solid, 1=Dotted, 2=Dashed
      .setLineLength(100)
      .setLineColor(lineColor)
      .setBodyBorderColor(lineColor)
      .setBodyBackgroundColor(bgColor)
      .setBodyTextColor('#ffffff')
      .setQuantityBackgroundColor(lineColor)
      .setQuantityTextColor('#ffffff')
      .setCloseButtonBackgroundColor(bgColor)
      .setCloseButtonIconColor('#ffffff')
      .onClose(() => {
        this.closePosition(position.id);
      })
      .onModify(() => {
        const input = prompt(`SL yoki TP ni o‘zgartirish [${position.symbol}]:`, `SL: ${position.stopLoss || ''}, TP: ${position.takeProfit || ''}`);
        // Modify dialog hook
      });

    this._chartLines.set(position.id, { positionLine: posLine });

    // 2. Draw Draggable Stop Loss & Take Profit Order Lines
    this.updateSlTpLinesOnChart(position);
  }

  /**
   * Draw or update Draggable SL / TP Lines using chart.createOrderLine()
   */
  public updateSlTpLinesOnChart(position: PositionData) {
    if (!this._chart || typeof this._chart.createOrderLine !== 'function') return;

    const lineGroup = this._chartLines.get(position.id) || {};

    // A. STOP LOSS LINE (Draggable with Mouse)
    if (position.stopLoss && position.stopLoss > 0) {
      if (!lineGroup.slLine) {
        const slLine = this._chart.createOrderLine();
        slLine
          .setPrice(position.stopLoss)
          .setText('SL')
          .setQuantity(Math.abs(position.qty).toString())
          .setLineStyle(1) // Dotted
          .setLineLength(100)
          .setLineColor('#ef4444')
          .setBodyBorderColor('#ef4444')
          .setBodyBackgroundColor('#450a0a')
          .setBodyTextColor('#ffffff')
          .onMove((newPrice: number) => {
            // Fired when user finishes dragging the SL line with the mouse!
            console.log(`[SL Dragged] Position: ${position.id} New SL: ${newPrice}`);
            this.modifyOrder(position.id, newPrice, position.takeProfit);
          })
          .onCancel(() => {
            this.modifyOrder(position.id, undefined, position.takeProfit);
          });
        lineGroup.slLine = slLine;
      } else {
        lineGroup.slLine.setPrice(position.stopLoss);
      }
    } else if (lineGroup.slLine) {
      lineGroup.slLine.remove();
      lineGroup.slLine = undefined;
    }

    // B. TAKE PROFIT LINE (Draggable with Mouse)
    if (position.takeProfit && position.takeProfit > 0) {
      if (!lineGroup.tpLine) {
        const tpLine = this._chart.createOrderLine();
        tpLine
          .setPrice(position.takeProfit)
          .setText('TP')
          .setQuantity(Math.abs(position.qty).toString())
          .setLineStyle(1) // Dotted
          .setLineLength(100)
          .setLineColor('#10b981')
          .setBodyBorderColor('#10b981')
          .setBodyBackgroundColor('#064e3b')
          .setBodyTextColor('#ffffff')
          .onMove((newPrice: number) => {
            // Fired when user finishes dragging the TP line with the mouse!
            console.log(`[TP Dragged] Position: ${position.id} New TP: ${newPrice}`);
            this.modifyOrder(position.id, position.stopLoss, newPrice);
          })
          .onCancel(() => {
            this.modifyOrder(position.id, position.stopLoss, undefined);
          });
        lineGroup.tpLine = tpLine;
      } else {
        lineGroup.tpLine.setPrice(position.takeProfit);
      }
    } else if (lineGroup.tpLine) {
      lineGroup.tpLine.remove();
      lineGroup.tpLine = undefined;
    }

    this._chartLines.set(position.id, lineGroup);
  }

  /**
   * Remove all lines associated with a position
   */
  public removeChartLines(positionId: string) {
    const lineGroup = this._chartLines.get(positionId);
    if (lineGroup) {
      if (lineGroup.positionLine) {
        try { lineGroup.positionLine.remove(); } catch {}
      }
      if (lineGroup.slLine) {
        try { lineGroup.slLine.remove(); } catch {}
      }
      if (lineGroup.tpLine) {
        try { lineGroup.tpLine.remove(); } catch {}
      }
      this._chartLines.delete(positionId);
    }
  }

  /**
   * Redraw all open position lines on active chart
   */
  public refreshAllChartLines() {
    if (!this._chart) return;
    for (const pos of this._positions.values()) {
      this.drawPositionOnChart(pos);
    }
  }
}

// Singleton broker instance
export const exnessBroker = new ExnessBrokerAdapter();
