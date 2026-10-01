import { BrokerAdapter, Candle, NewOrder, Order, Position, Tick } from '../types';

export class RestWsBroker implements BrokerAdapter {
  name = 'RestWsBroker (REST / WebSocket)';
  private baseUrl: string;
  private apiKey: string;
  private wsUrl: string;
  private ws?: WebSocket;
  private listeners: Map<string, Set<(t: Tick) => void>> = new Map();

  constructor() {
    this.baseUrl = (import.meta as any).env?.VITE_BROKER_URL || 'https://api.broker-demo.com/v1';
    this.apiKey = (import.meta as any).env?.VITE_BROKER_KEY || 'demo_key_777';
    this.wsUrl = (import.meta as any).env?.VITE_BROKER_WS_URL || 'wss://stream.broker-demo.com/ticks';
  }

  async connect(): Promise<void> {
    try {
      if (typeof window !== 'undefined' && 'WebSocket' in window) {
        this.ws = new WebSocket(this.wsUrl);
        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'tick' && data.symbol) {
              const tick: Tick = {
                symbol: data.symbol,
                bid: Number(data.bid),
                ask: Number(data.ask),
                time: data.time || Math.floor(Date.now() / 1000),
              };
              this.listeners.get(data.symbol)?.forEach(cb => cb(tick));
            }
          } catch {
            // Ignore invalid messages
          }
        };
      }
    } catch (e) {
      console.warn('RestWsBroker WebSocket connection fallback', e);
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = undefined;
    }
  }

  subscribe(symbol: string, onTick: (t: Tick) => void): () => void {
    const s = symbol.toUpperCase().replace(/[\s\/-]/g, '');
    if (!this.listeners.has(s)) {
      this.listeners.set(s, new Set());
    }
    this.listeners.get(s)!.add(onTick);

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ action: 'subscribe', symbol: s }));
    }

    return () => {
      this.listeners.get(s)?.delete(onTick);
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ action: 'unsubscribe', symbol: s }));
      }
    };
  }

  async getCandles(symbol: string, tf: string, limit = 150): Promise<Candle[]> {
    try {
      const res = await fetch(`${this.baseUrl}/candles?symbol=${symbol}&tf=${tf}&limit=${limit}`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch {
      // Fallback empty or handled gracefully
      return [];
    }
  }

  async placeOrder(o: NewOrder): Promise<Position | Order> {
    const res = await fetch(`${this.baseUrl}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(o),
    });
    if (!res.ok) throw new Error('Order placement failed on server');
    return await res.json();
  }

  async modifyOrder(id: string, patch: { sl?: number | null; tp?: number | null; price?: number }): Promise<void> {
    await fetch(`${this.baseUrl}/orders/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(patch),
    });
  }

  async closePosition(id: string, volume?: number): Promise<void> {
    await fetch(`${this.baseUrl}/positions/${id}/close`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ volume }),
    });
  }

  async cancelOrder(id: string): Promise<void> {
    await fetch(`${this.baseUrl}/orders/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
  }
}
