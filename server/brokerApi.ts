import { Router, Request, Response } from "express";
import { tradingEngine } from "./tradingEngine.js";

export const brokerRouter = Router();

// In-memory rate limiting map for security
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function rateLimiter(limit: number, windowMs: number) {
  return (req: Request, res: Response, next: () => void) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();
    const entry = rateLimitMap.get(ip) || { count: 0, resetAt: now + windowMs };

    if (now > entry.resetAt) {
      entry.count = 1;
      entry.resetAt = now + windowMs;
    } else {
      entry.count++;
    }
    rateLimitMap.set(ip, entry);

    if (entry.count > limit) {
      return res.status(429).json({
        success: false,
        error: "Too many requests. Rate limit exceeded (Brute-force protection).",
      });
    }
    next();
  };
}

// ============================================================================
// 1. AUTHENTICATION & KYC ENDPOINTS
// ============================================================================
brokerRouter.post("/auth/register", rateLimiter(15, 60000), (req, res) => {
  const { email, phone, fullName, password } = req.body;
  if (!email || !password || !fullName) {
    return res.status(400).json({ success: false, error: "Email, fullName and password are required" });
  }

  if (password.length < 8) {
    return res.status(400).json({ success: false, error: "Password must be at least 8 characters long" });
  }

  const userId = `usr_${Date.now()}`;
  return res.json({
    success: true,
    message: "Registration successful",
    user: {
      id: userId,
      email,
      phone,
      fullName,
      role: "client",
      kycStatus: "unsubmitted",
      token: `jwt_exora_${Date.now()}_token`,
    },
  });
});

brokerRouter.post("/auth/login", rateLimiter(20, 60000), (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, error: "Email and password required" });
  }

  const isAdmin = email.toLowerCase().includes("admin");
  return res.json({
    success: true,
    message: "Login successful",
    user: {
      id: isAdmin ? "usr_admin" : "usr_trader_101",
      email,
      fullName: isAdmin ? "Broker Administrator" : "Avazbek Turgunov",
      role: isAdmin ? "super_admin" : "client",
      token: `jwt_token_${Date.now()}`,
    },
  });
});

// ============================================================================
// 2. WALLET & TRADING ACCOUNTS MANAGEMENT
// ============================================================================
brokerRouter.get("/wallet/accounts", (_req, res) => {
  const accList = Array.from(tradingEngine.accounts.values());
  return res.json({
    success: true,
    accounts: accList,
  });
});

brokerRouter.post("/wallet/deposit", (req, res) => {
  const { accountId, amount } = req.body;
  const targetId = accountId || Array.from(tradingEngine.accounts.keys())[0];
  const depositAmt = parseFloat(amount);

  if (isNaN(depositAmt) || depositAmt <= 0) {
    return res.status(400).json({ success: false, error: "Invalid deposit amount" });
  }

  const result = tradingEngine.depositFunds(targetId, depositAmt);
  if (!result.success) {
    return res.status(400).json({ success: false, error: result.error });
  }

  return res.json({
    success: true,
    message: `$${depositAmt.toFixed(2)} successfully credited to account`,
    newBalance: result.newBalance,
    account: tradingEngine.accounts.get(targetId),
  });
});

// ============================================================================
// 3. TRADING ENGINE: OMS (ORDER MANAGEMENT SYSTEM)
// ============================================================================

// Open Position (Market or Limit)
brokerRouter.post("/trading/order/open", (req, res) => {
  const { accountId, symbol, type, lots, sl, tp } = req.body;
  const targetAccId = accountId || Array.from(tradingEngine.accounts.keys())[0];
  const lotSize = parseFloat(lots) || 0.10;

  if (!symbol || !type) {
    return res.status(400).json({ success: false, error: "Symbol and order type (BUY/SELL) are required" });
  }

  const result = tradingEngine.openOrder({
    accountId: targetAccId,
    symbol: symbol.toUpperCase(),
    type: type.toUpperCase() as 'BUY' | 'SELL',
    lots: lotSize,
    sl: sl ? parseFloat(sl) : undefined,
    tp: tp ? parseFloat(tp) : undefined,
  });

  if (!result.success) {
    return res.status(400).json({ success: false, error: result.error });
  }

  return res.json({
    success: true,
    message: `Order #${result.position?.ticket} executed successfully`,
    position: result.position,
    account: tradingEngine.accounts.get(targetAccId),
  });
});

// Modify Order / Position (Stop Loss & Take Profit)
brokerRouter.post("/trading/order/modify", (req, res) => {
  const { positionId, sl, tp } = req.body;
  if (!positionId) {
    return res.status(400).json({ success: false, error: "positionId is required" });
  }

  const result = tradingEngine.modifyPosition(positionId, sl, tp);
  if (!result.success) {
    return res.status(400).json({ success: false, error: result.error });
  }

  return res.json({
    success: true,
    message: "Position SL/TP updated successfully",
    position: result.position,
  });
});

// Close Position
brokerRouter.post("/trading/order/close", (req, res) => {
  const { positionId } = req.body;
  if (!positionId) {
    return res.status(400).json({ success: false, error: "positionId is required" });
  }

  const result = tradingEngine.closePosition(positionId, "Client Close");
  if (!result.success) {
    return res.status(400).json({ success: false, error: result.error });
  }

  return res.json({
    success: true,
    message: "Position closed successfully",
    realizedPnl: result.realizedPnl,
    newBalance: result.newBalance,
  });
});

// List Positions (Open or Closed)
brokerRouter.get("/trading/positions", (req, res) => {
  const status = (req.query.status as string) || "OPEN";
  const list = Array.from(tradingEngine.positions.values()).filter(
    (p) => status === "ALL" || p.status === status
  );

  return res.json({
    success: true,
    positions: list,
    count: list.length,
  });
});

// ============================================================================
// 4. MARKET DATA & CANDLESTICKS (OHLCV)
// ============================================================================
brokerRouter.get("/rates/live", (_req, res) => {
  return res.json({
    success: true,
    timestamp: new Date().toISOString(),
    rates: Array.from(tradingEngine.symbols.values()),
  });
});

brokerRouter.get("/rates/candles", (req, res) => {
  const symbol = (req.query.symbol as string || "XAUUSD").toUpperCase();
  const candles = tradingEngine.candles.get(symbol) || [];

  return res.json({
    success: true,
    symbol,
    candles,
  });
});

// Admin stats overview
brokerRouter.get("/admin/dashboard", (_req, res) => {
  const totalPositions = tradingEngine.positions.size;
  const openPositions = Array.from(tradingEngine.positions.values()).filter((p) => p.status === "OPEN").length;
  const accounts = Array.from(tradingEngine.accounts.values());
  const totalBalance = accounts.reduce((acc, a) => acc + a.balance, 0);

  return res.json({
    success: true,
    data: {
      totalUsers: 1482,
      activeTradingAccounts: accounts.length,
      totalDepositedBalance: totalBalance,
      openPositionsCount: openPositions,
      totalOrdersExecuted: totalPositions,
      brokerHealth: "Tier-1 Hybrid MM Online",
    },
  });
});
