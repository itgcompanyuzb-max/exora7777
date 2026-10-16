// server/tradingWs.ts
// Authenticated real-time gateway: per-account quotes (tier spreads), P/L, order and account events.
import type { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { tradingEngine, Account, Order } from './tradingEngine.js';
import { marketData, Quote } from './marketData.js';
import { userFromToken, AuthedUser } from './auth.js';
import { SYMBOL_SPECS } from './symbols.js';
import { orderView, accountView } from './brokerApi.js';

interface Client {
  ws: WebSocket;
  user: AuthedUser | null;
  symbols: Set<string>;
}

export function initTradingWebSocket(server: HttpServer) {
  const wss = new WebSocketServer({ server, path: '/ws/trading' });
  const clients = new Set<Client>();
  const send = (c: Client, msg: unknown) => c.ws.readyState === WebSocket.OPEN && c.ws.send(JSON.stringify(msg));
  const accountIds = (c: Client) => (c.user ? new Set(tradingEngine.accountsOf(c.user.id).map((a) => a.id)) : new Set<string>());

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url || '', 'http://localhost');
    const user = userFromToken(url.searchParams.get('token') ?? undefined);
    const client: Client = { ws, user, symbols: new Set(SYMBOL_SPECS.map((s) => s.symbol)) };
    clients.add(client);

    const accounts = user ? tradingEngine.accountsOf(user.id) : [];
    send(client, {
      type: 'INIT_SNAPSHOT', authenticated: !!user, serverTime: Date.now(), feed: marketData.feedMode,
      symbols: SYMBOL_SPECS.map((s) => ({ ...s, ...marketData.quote(s.symbol) })),
      accounts: accounts.map(accountView),
      positions: accounts.flatMap((a) => [...tradingEngine.openOrders(a.id), ...tradingEngine.pendingOrders(a.id)]).map(orderView),
    });

    ws.on('message', (raw) => {
      try {
        const m = JSON.parse(raw.toString());
        if (m.action === 'SUBSCRIBE' && Array.isArray(m.symbols)) client.symbols = new Set(m.symbols.map((s: string) => s.toUpperCase()));
        else if (m.action === 'PING') send(client, { type: 'PONG', t: Date.now() });
      } catch { /* ignore malformed frame */ }
    });
    ws.on('close', () => clients.delete(client));
    ws.on('error', () => clients.delete(client));
  });

  // Quotes: anonymous clients get Standard spreads, authenticated ones the spread of their account tier.
  marketData.onTick((q: Quote) => {
    for (const c of clients) {
      if (!c.symbols.has(q.symbol)) continue;
      const tier = c.user ? tradingEngine.accountsOf(c.user.id).find((a) => !a.isDemo)?.tier ?? 'Standard' : 'Standard';
      const quote = tier === 'Standard' ? q : marketData.quote(q.symbol, tier)!;
      send(c, { type: 'TICK', data: { ...quote, symbol: q.symbol } });
    }
  });

  const toOwners = (accountId: string, msg: unknown) => {
    for (const c of clients) if (c.user && accountIds(c).has(accountId)) send(c, msg);
  };
  tradingEngine.on('account', (a: Account) => toOwners(a.id, { type: 'ACCOUNT_UPDATE', data: accountView(a) }));
  tradingEngine.on('order', ({ order, event }: { order: Order; event: string }) => toOwners(order.accountId, { type: 'ORDER_EVENT', event, data: orderView(order) }));
  tradingEngine.on('pnl', (o: Order) => toOwners(o.accountId, { type: 'POSITION_UPDATE', data: orderView(o) }));
  tradingEngine.on('alert', (a: { accountId: string }) => toOwners(a.accountId, { type: 'ALERT', data: a }));

  console.log('[ws] trading gateway mounted at /ws/trading');
}
