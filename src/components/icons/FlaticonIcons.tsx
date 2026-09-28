import React from "react";

interface FlaticonProps {
  className?: string;
  size?: number;
}

/**
 * High-definition Flaticon (www.flaticon.com) vector icon collection.
 * Recreates Flaticon's signature multi-color, flat-gradient, and duotone style
 * for financial trading, cryptocurrency, banking, KYC, and personal area interfaces.
 */

// 1. Trading & Candlestick Charts (Flaticon Trading Pack)
export const FlaticonTrading: React.FC<FlaticonProps> = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 48 48" className={`inline-block shrink-0 ${className}`} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 42H42" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" />
    {/* Bearish red candle */}
    <line x1="12" y1="16" x2="12" y2="34" stroke="#F43F5E" strokeWidth="2" strokeLinecap="round" />
    <rect x="9" y="20" width="6" height="10" rx="1.5" fill="url(#fl-red)" />
    {/* Bullish green candle 1 */}
    <line x1="22" y1="10" x2="22" y2="30" stroke="#10B981" strokeWidth="2" strokeLinecap="round" />
    <rect x="19" y="14" width="6" height="12" rx="1.5" fill="url(#fl-green)" />
    {/* Bullish green candle 2 (large) */}
    <line x1="32" y1="6" x2="32" y2="26" stroke="#10B981" strokeWidth="2" strokeLinecap="round" />
    <rect x="29" y="9" width="6" height="13" rx="1.5" fill="url(#fl-green)" />
    {/* Dynamic upward trend arrow */}
    <path d="M10 28L22 18L31 22L42 8" stroke="#FBBF24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M37 8H42V13" stroke="#FBBF24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <defs>
      <linearGradient id="fl-green" x1="19" y1="14" x2="25" y2="26" gradientUnits="userSpaceOnUse">
        <stop stopColor="#34D399" />
        <stop offset="1" stopColor="#059669" />
      </linearGradient>
      <linearGradient id="fl-red" x1="9" y1="20" x2="15" y2="30" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FB7185" />
        <stop offset="1" stopColor="#E11D48" />
      </linearGradient>
    </defs>
  </svg>
);

// 2. Digital Wallet & Assets (Flaticon Wallet Pack)
export const FlaticonWallet: React.FC<FlaticonProps> = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 48 48" className={`inline-block shrink-0 ${className}`} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="6" y="12" width="36" height="26" rx="5" fill="url(#fl-wallet-bg)" />
    {/* Front flap overlay */}
    <path d="M6 18C6 14.6863 8.68629 12 12 12H36C39.3137 12 42 14.6863 42 18V21H6V18Z" fill="#334155" opacity="0.3" />
    {/* Cash bill popping out */}
    <path d="M12 8C12 6.89543 12.8954 6 14 6H34C35.1046 6 36 6.89543 36 8V12H12V8Z" fill="url(#fl-cash)" />
    {/* Clasp button */}
    <rect x="28" y="21" width="14" height="8" rx="4" fill="#0F172A" />
    <circle cx="35" cy="25" r="2.5" fill="url(#fl-gold)" />
    <defs>
      <linearGradient id="fl-wallet-bg" x1="6" y1="12" x2="42" y2="38" gradientUnits="userSpaceOnUse">
        <stop stopColor="#3B82F6" />
        <stop offset="1" stopColor="#1D4ED8" />
      </linearGradient>
      <linearGradient id="fl-cash" x1="12" y1="6" x2="36" y2="12" gradientUnits="userSpaceOnUse">
        <stop stopColor="#4ADE80" />
        <stop offset="1" stopColor="#16A34A" />
      </linearGradient>
      <linearGradient id="fl-gold" x1="33" y1="23" x2="37" y2="27" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FDE047" />
        <stop offset="1" stopColor="#EAB308" />
      </linearGradient>
    </defs>
  </svg>
);

// 3. Deposit / Inflow Arrow (Flaticon Banking)
export const FlaticonDeposit: React.FC<FlaticonProps> = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 48 48" className={`inline-block shrink-0 ${className}`} fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="24" cy="24" r="20" fill="url(#fl-dep-bg)" />
    <path d="M18 16H30C31.1046 16 32 16.8954 32 18V26" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M32 30L16 30" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
    {/* Diagonal incoming arrow */}
    <path d="M30 18L17 31" stroke="#FDE047" strokeWidth="3.5" strokeLinecap="round" />
    <path d="M17 23V31H25" stroke="#FDE047" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    <defs>
      <linearGradient id="fl-dep-bg" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
        <stop stopColor="#10B981" />
        <stop offset="1" stopColor="#047857" />
      </linearGradient>
    </defs>
  </svg>
);

// 4. Withdraw / Outflow Arrow (Flaticon Banking)
export const FlaticonWithdraw: React.FC<FlaticonProps> = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 48 48" className={`inline-block shrink-0 ${className}`} fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="24" cy="24" r="20" fill="url(#fl-with-bg)" />
    <path d="M18 32H30C31.1046 32 32 31.1046 32 30V22" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M16 18H32" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
    {/* Diagonal outgoing arrow */}
    <path d="M18 30L31 17" stroke="#FDE047" strokeWidth="3.5" strokeLinecap="round" />
    <path d="M23 17H31V25" stroke="#FDE047" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    <defs>
      <linearGradient id="fl-with-bg" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
        <stop stopColor="#EF4444" />
        <stop offset="1" stopColor="#B91C1C" />
      </linearGradient>
    </defs>
  </svg>
);

// 5. Transfer / Exchange (Flaticon Currency Transfer)
export const FlaticonTransfer: React.FC<FlaticonProps> = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 48 48" className={`inline-block shrink-0 ${className}`} fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="24" cy="24" r="20" fill="url(#fl-trans-bg)" />
    {/* Top arrow right */}
    <path d="M14 20H32M32 20L26 14M32 20L26 26" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    {/* Bottom arrow left */}
    <path d="M34 28H16M16 28L22 22M16 28L22 34" stroke="#FDE047" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    <defs>
      <linearGradient id="fl-trans-bg" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
        <stop stopColor="#0EA5E9" />
        <stop offset="1" stopColor="#0369A1" />
      </linearGradient>
    </defs>
  </svg>
);

// 6. Security Shield & Verification (Flaticon KYC Security)
export const FlaticonShield: React.FC<FlaticonProps> = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 48 48" className={`inline-block shrink-0 ${className}`} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M24 4L8 10V22C8 32.5 14.8 42.1 24 45C33.2 42.1 40 32.5 40 22V10L24 4Z" fill="url(#fl-shield-bg)" />
    <path d="M24 8L12 13V22C12 30.5 17.1 38.3 24 40.8C30.9 38.3 36 30.5 36 22V13L24 8Z" fill="#1E293B" opacity="0.25" />
    {/* Checkmark */}
    <path d="M17 24L22 29L31 19" stroke="#FDE047" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    <defs>
      <linearGradient id="fl-shield-bg" x1="8" y1="4" x2="40" y2="45" gradientUnits="userSpaceOnUse">
        <stop stopColor="#10B981" />
        <stop offset="0.5" stopColor="#059669" />
        <stop offset="1" stopColor="#047857" />
      </linearGradient>
    </defs>
  </svg>
);

// 7. Customer Support 24/7 (Flaticon Support)
export const FlaticonSupport: React.FC<FlaticonProps> = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 48 48" className={`inline-block shrink-0 ${className}`} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Headset Arc */}
    <path d="M10 24C10 16.268 16.268 10 24 10C31.732 10 38 16.268 38 24V28" stroke="url(#fl-headset)" strokeWidth="3.5" strokeLinecap="round" />
    {/* Ear cups */}
    <rect x="7" y="24" width="6" height="12" rx="3" fill="#3B82F6" />
    <rect x="35" y="24" width="6" height="12" rx="3" fill="#3B82F6" />
    {/* Microphone Boom */}
    <path d="M38 28V36C38 38.2 36.2 40 34 40H28" stroke="#3B82F6" strokeWidth="3" strokeLinecap="round" />
    <circle cx="26" cy="40" r="2.5" fill="#FDE047" />
    {/* Chat bubble overlay */}
    <circle cx="24" cy="22" r="7" fill="url(#fl-gold-grad)" />
    <circle cx="21" cy="22" r="1" fill="#0F172A" />
    <circle cx="24" cy="22" r="1" fill="#0F172A" />
    <circle cx="27" cy="22" r="1" fill="#0F172A" />
    <defs>
      <linearGradient id="fl-headset" x1="10" y1="10" x2="38" y2="38" gradientUnits="userSpaceOnUse">
        <stop stopColor="#60A5FA" />
        <stop offset="1" stopColor="#1D4ED8" />
      </linearGradient>
      <linearGradient id="fl-gold-grad" x1="17" y1="15" x2="31" y2="29" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FDE047" />
        <stop offset="1" stopColor="#EAB308" />
      </linearGradient>
    </defs>
  </svg>
);

// 8. Media Center & News (Flaticon Newspaper & Broadcast)
export const FlaticonMedia: React.FC<FlaticonProps> = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 48 48" className={`inline-block shrink-0 ${className}`} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="8" y="10" width="32" height="30" rx="4" fill="url(#fl-news-bg)" />
    <rect x="13" y="15" width="12" height="10" rx="2" fill="url(#fl-gold-grad)" />
    <line x1="28" y1="16" x2="35" y2="16" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="28" y1="21" x2="35" y2="21" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="13" y1="29" x2="35" y2="29" stroke="#CBD5E1" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="13" y1="34" x2="29" y2="34" stroke="#CBD5E1" strokeWidth="2.5" strokeLinecap="round" />
    {/* Live badge */}
    <circle cx="36" cy="10" r="5" fill="#EF4444" />
    <circle cx="36" cy="10" r="2" fill="#FFFFFF" />
    <defs>
      <linearGradient id="fl-news-bg" x1="8" y1="10" x2="40" y2="40" gradientUnits="userSpaceOnUse">
        <stop stopColor="#334155" />
        <stop offset="1" stopColor="#0F172A" />
      </linearGradient>
    </defs>
  </svg>
);

// 9. Gold & Commodities Bullion (Flaticon Gold Bars)
export const FlaticonGold: React.FC<FlaticonProps> = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 48 48" className={`inline-block shrink-0 ${className}`} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Bottom left bar */}
    <path d="M6 34L12 24H26L22 34H6Z" fill="#CA8A04" />
    <path d="M26 24L30 30L22 34L26 24Z" fill="#A16207" />
    <path d="M8 32L13 25H25L21 32H8Z" fill="#EAB308" />
    {/* Bottom right bar */}
    <path d="M22 34L28 24H42L38 34H22Z" fill="#CA8A04" />
    <path d="M42 24L46 30L38 34L42 24Z" fill="#A16207" />
    <path d="M24 32L29 25H41L37 32H24Z" fill="#EAB308" />
    {/* Top center bar */}
    <path d="M14 22L20 12H34L30 22H14Z" fill="#EAB308" />
    <path d="M34 12L38 18L30 22L34 12Z" fill="#CA8A04" />
    <path d="M16 20L21 13H33L29 20H16Z" fill="#FDE047" />
    {/* Sparkles */}
    <path d="M36 6L37 9L40 10L37 11L36 14L35 11L32 10L35 9L36 6Z" fill="#FDE047" />
  </svg>
);

// 10. Crypto & Bitcoin (Flaticon Crypto)
export const FlaticonCrypto: React.FC<FlaticonProps> = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 48 48" className={`inline-block shrink-0 ${className}`} fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="24" cy="24" r="20" fill="url(#fl-btc-bg)" />
    <circle cx="24" cy="24" r="17" stroke="#FDE047" strokeWidth="1.5" strokeDasharray="3 3" />
    {/* Bitcoin B */}
    <path d="M20 14V34M24 14V34M18 17H26C28.2 17 30 18.8 30 21C30 22.8 28.8 24.3 27 24.8C29.2 25.4 31 27.2 31 29.5C31 32 29 34 26.5 34H18" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <defs>
      <linearGradient id="fl-btc-bg" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
        <stop stopColor="#F59E0B" />
        <stop offset="1" stopColor="#D97706" />
      </linearGradient>
    </defs>
  </svg>
);

// 11. Forex Globe & Currency (Flaticon Forex)
export const FlaticonForex: React.FC<FlaticonProps> = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 48 48" className={`inline-block shrink-0 ${className}`} fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="24" cy="24" r="20" fill="url(#fl-forex-bg)" />
    {/* Grid lines */}
    <ellipse cx="24" cy="24" rx="10" ry="20" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.4" />
    <line x1="4" y1="24" x2="44" y2="24" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.4" />
    <line x1="9" y1="14" x2="39" y2="14" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.3" />
    <line x1="9" y1="34" x2="39" y2="34" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.3" />
    {/* Exchange symbol badge */}
    <circle cx="34" cy="14" r="8" fill="#10B981" />
    <text x="34" y="18" fill="#FFFFFF" fontSize="11" fontWeight="bold" textAnchor="middle">$</text>
    <circle cx="14" cy="34" r="8" fill="#F59E0B" />
    <text x="14" y="38" fill="#FFFFFF" fontSize="11" fontWeight="bold" textAnchor="middle">€</text>
    <defs>
      <linearGradient id="fl-forex-bg" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
        <stop stopColor="#3B82F6" />
        <stop offset="1" stopColor="#1E40AF" />
      </linearGradient>
    </defs>
  </svg>
);

// 12. Ultra Fast Execution Lightning (Flaticon Lightning)
export const FlaticonLightning: React.FC<FlaticonProps> = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 48 48" className={`inline-block shrink-0 ${className}`} fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="24" cy="24" r="20" fill="url(#fl-zap-bg)" />
    <path d="M26 8L14 26H24L20 40L34 22H24L26 8Z" fill="#FDE047" stroke="#CA8A04" strokeWidth="1.5" strokeLinejoin="round" />
    <defs>
      <linearGradient id="fl-zap-bg" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
        <stop stopColor="#1E293B" />
        <stop offset="1" stopColor="#0F172A" />
      </linearGradient>
    </defs>
  </svg>
);

// 13. VIP / Pro Tier Award Crown (Flaticon Crown & Award)
export const FlaticonAward: React.FC<FlaticonProps> = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 48 48" className={`inline-block shrink-0 ${className}`} fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="24" cy="20" r="14" fill="url(#fl-gold-grad)" />
    {/* Inner medal star */}
    <path d="M24 12L26.5 17L32 17.8L28 21.7L28.9 27.2L24 24.6L19.1 27.2L20 21.7L16 17.8L21.5 17L24 12Z" fill="#FFFFFF" />
    {/* Ribbon folds */}
    <path d="M17 31L13 44L22 40L24 33" fill="#DC2626" />
    <path d="M31 31L35 44L26 40L24 33" fill="#991B1B" />
  </svg>
);

// 14. User Profile & Avatar (Flaticon User)
export const FlaticonUser: React.FC<FlaticonProps> = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 48 48" className={`inline-block shrink-0 ${className}`} fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="24" cy="24" r="20" fill="url(#fl-user-bg)" />
    <circle cx="24" cy="18" r="7" fill="#FFFFFF" />
    <path d="M12 38C12 31.5 17.5 28 24 28C30.5 28 36 31.5 36 38" fill="#FFFFFF" />
    <defs>
      <linearGradient id="fl-user-bg" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
        <stop stopColor="#F59E0B" />
        <stop offset="1" stopColor="#D97706" />
      </linearGradient>
    </defs>
  </svg>
);

// 15. Partner & Referrals (Flaticon Community Users)
export const FlaticonUsers: React.FC<FlaticonProps> = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 48 48" className={`inline-block shrink-0 ${className}`} fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="18" cy="18" r="5" fill="#3B82F6" />
    <path d="M10 34C10 29.5 13.5 27 18 27C22.5 27 26 29.5 26 34" fill="#3B82F6" />
    <circle cx="30" cy="18" r="5" fill="#10B981" />
    <path d="M26 34C26 30 28.5 28 32 28C35.5 28 38 30 38 34" fill="#10B981" />
  </svg>
);

// 16. Clock & Transaction History (Flaticon History)
export const FlaticonHistory: React.FC<FlaticonProps> = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 48 48" className={`inline-block shrink-0 ${className}`} fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="24" cy="24" r="18" fill="url(#fl-clock-bg)" />
    <circle cx="24" cy="24" r="15" fill="#0F172A" />
    {/* Hands */}
    <path d="M24 14V24L31 28" stroke="#FDE047" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="24" cy="24" r="2" fill="#FDE047" />
    <defs>
      <linearGradient id="fl-clock-bg" x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
        <stop stopColor="#64748B" />
        <stop offset="1" stopColor="#334155" />
      </linearGradient>
    </defs>
  </svg>
);

// 17. Security Padlock & Admin (Flaticon Lock)
export const FlaticonLock: React.FC<FlaticonProps> = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 48 48" className={`inline-block shrink-0 ${className}`} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Shackle */}
    <path d="M16 20V14C16 9.58 19.58 6 24 6C28.42 6 32 9.58 32 14V20" stroke="#FBBF24" strokeWidth="4" strokeLinecap="round" />
    {/* Body */}
    <rect x="10" y="20" width="28" height="22" rx="5" fill="url(#fl-lock-body)" />
    {/* Keyhole */}
    <circle cx="24" cy="29" r="3" fill="#0F172A" />
    <path d="M23 31H25L26 36H22L23 31Z" fill="#0F172A" />
    <defs>
      <linearGradient id="fl-lock-body" x1="10" y1="20" x2="38" y2="42" gradientUnits="userSpaceOnUse">
        <stop stopColor="#F59E0B" />
        <stop offset="1" stopColor="#D97706" />
      </linearGradient>
    </defs>
  </svg>
);

// 18. Credit Card & Banking Cards (Flaticon Payment)
export const FlaticonCreditCard: React.FC<FlaticonProps> = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 48 48" className={`inline-block shrink-0 ${className}`} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="6" y="12" width="36" height="24" rx="4" fill="url(#fl-card-bg)" />
    {/* Magnetic stripe */}
    <rect x="6" y="17" width="36" height="5" fill="#0F172A" />
    {/* Chip */}
    <rect x="11" y="26" width="6" height="5" rx="1" fill="#FDE047" />
    {/* Card number line */}
    <line x1="20" y1="28.5" x2="32" y2="28.5" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
    <defs>
      <linearGradient id="fl-card-bg" x1="6" y1="12" x2="42" y2="36" gradientUnits="userSpaceOnUse">
        <stop stopColor="#6366F1" />
        <stop offset="1" stopColor="#4338CA" />
      </linearGradient>
    </defs>
  </svg>
);

// 19. Search Magnifier (Flaticon Search)
export const FlaticonSearch: React.FC<FlaticonProps> = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 48 48" className={`inline-block shrink-0 ${className}`} fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="21" cy="21" r="13" stroke="url(#fl-search-lens)" strokeWidth="4" />
    <path d="M30 30L42 42" stroke="url(#fl-search-handle)" strokeWidth="5" strokeLinecap="round" />
    <defs>
      <linearGradient id="fl-search-lens" x1="8" y1="8" x2="34" y2="34" gradientUnits="userSpaceOnUse">
        <stop stopColor="#38BDF8" />
        <stop offset="1" stopColor="#0284C7" />
      </linearGradient>
      <linearGradient id="fl-search-handle" x1="30" y1="30" x2="42" y2="42" gradientUnits="userSpaceOnUse">
        <stop stopColor="#F59E0B" />
        <stop offset="1" stopColor="#D97706" />
      </linearGradient>
    </defs>
  </svg>
);

// 20. Education & Academy (Flaticon Graduation Book)
export const FlaticonEducation: React.FC<FlaticonProps> = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 48 48" className={`inline-block shrink-0 ${className}`} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M24 8L6 18L24 28L42 18L24 8Z" fill="url(#fl-grad-cap)" />
    <path d="M12 21.3V31C12 36.5 17.5 40 24 40C30.5 40 36 36.5 36 31V21.3L24 28L12 21.3Z" fill="#1E293B" />
    {/* Tassel */}
    <path d="M40 20V32" stroke="#FDE047" strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="40" cy="33" r="2" fill="#FDE047" />
    <defs>
      <linearGradient id="fl-grad-cap" x1="6" y1="8" x2="42" y2="28" gradientUnits="userSpaceOnUse">
        <stop stopColor="#3B82F6" />
        <stop offset="1" stopColor="#1D4ED8" />
      </linearGradient>
    </defs>
  </svg>
);

// 21. Telegram Official Logo (Flaticon Social Pack)
export const FlaticonTelegram: React.FC<FlaticonProps> = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 48 48" className={`inline-block shrink-0 ${className}`} fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="24" cy="24" r="20" fill="url(#fl-tg-bg)" />
    <path d="M12 23L36 13L30 33L23 27L19 30V24L12 23Z" fill="#FFFFFF" />
    <path d="M23 27L31 20L21 26L23 27Z" fill="#CBD5E1" />
    <defs>
      <linearGradient id="fl-tg-bg" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
        <stop stopColor="#2AABEE" />
        <stop offset="1" stopColor="#229ED9" />
      </linearGradient>
    </defs>
  </svg>
);

// 22. YouTube Official Logo (Flaticon Social Pack)
export const FlaticonYoutube: React.FC<FlaticonProps> = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 48 48" className={`inline-block shrink-0 ${className}`} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="6" y="12" width="36" height="24" rx="8" fill="#FF0000" />
    <path d="M20 18L32 24L20 30V18Z" fill="#FFFFFF" />
  </svg>
);

// 23. Instagram Official Logo (Flaticon Social Pack)
export const FlaticonInstagram: React.FC<FlaticonProps> = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 48 48" className={`inline-block shrink-0 ${className}`} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="6" y="6" width="36" height="36" rx="10" fill="url(#fl-insta-bg)" />
    <rect x="13" y="13" width="22" height="22" rx="6" stroke="#FFFFFF" strokeWidth="3" />
    <circle cx="24" cy="24" r="5" stroke="#FFFFFF" strokeWidth="3" />
    <circle cx="31" cy="17" r="1.5" fill="#FFFFFF" />
    <defs>
      <radialGradient id="fl-insta-bg" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(14 42) rotate(-55) scale(45)">
        <stop stopColor="#FFDD55" />
        <stop offset="0.2" stopColor="#FF543E" />
        <stop offset="0.5" stopColor="#C837AB" />
        <stop offset="1" stopColor="#435CE6" />
      </radialGradient>
    </defs>
  </svg>
);

// 24. Success Checkmark (Flaticon Success Badge)
export const FlaticonCheck: React.FC<FlaticonProps> = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 48 48" className={`inline-block shrink-0 ${className}`} fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="24" cy="24" r="20" fill="url(#fl-check-bg)" />
    <path d="M15 24L21 30L33 18" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    <defs>
      <linearGradient id="fl-check-bg" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
        <stop stopColor="#10B981" />
        <stop offset="1" stopColor="#059669" />
      </linearGradient>
    </defs>
  </svg>
);

// 25. Alert Warning (Flaticon Alert Badge)
export const FlaticonAlert: React.FC<FlaticonProps> = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 48 48" className={`inline-block shrink-0 ${className}`} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M24 6L4 40H44L24 6Z" fill="url(#fl-alert-bg)" />
    <line x1="24" y1="18" x2="24" y2="28" stroke="#0F172A" strokeWidth="3.5" strokeLinecap="round" />
    <circle cx="24" cy="34" r="2" fill="#0F172A" />
    <defs>
      <linearGradient id="fl-alert-bg" x1="4" y1="6" x2="44" y2="40" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FBBF24" />
        <stop offset="1" stopColor="#F59E0B" />
      </linearGradient>
    </defs>
  </svg>
);

// 26. Sun Theme (Flaticon Sun)
export const FlaticonSun: React.FC<FlaticonProps> = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 48 48" className={`inline-block shrink-0 ${className}`} fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="24" cy="24" r="10" fill="url(#fl-sun-bg)" />
    {/* Rays */}
    <line x1="24" y1="4" x2="24" y2="8" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
    <line x1="24" y1="40" x2="24" y2="44" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
    <line x1="4" y1="24" x2="8" y2="24" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
    <line x1="40" y1="24" x2="44" y2="24" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
    <line x1="10" y1="10" x2="13" y2="13" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
    <line x1="35" y1="35" x2="38" y2="38" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
    <line x1="10" y1="38" x2="13" y2="35" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
    <line x1="35" y1="13" x2="38" y2="10" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
    <defs>
      <linearGradient id="fl-sun-bg" x1="14" y1="14" x2="34" y2="34" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FDE047" />
        <stop offset="1" stopColor="#EAB308" />
      </linearGradient>
    </defs>
  </svg>
);

// 27. Moon Theme (Flaticon Moon)
export const FlaticonMoon: React.FC<FlaticonProps> = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 48 48" className={`inline-block shrink-0 ${className}`} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M36 29C35 37 28 43 20 43C11 43 4 36 4 27C4 19 10 12 18 11C17 14 17 17 18 20C20 28 28 34 36 29Z" fill="url(#fl-moon-bg)" />
    <path d="M38 12L39 15L42 16L39 17L38 20L37 17L34 16L37 15L38 12Z" fill="#FDE047" />
    <path d="M30 6L31 8L33 9L31 10L30 12L29 10L27 9L29 8L30 6Z" fill="#FDE047" />
    <defs>
      <linearGradient id="fl-moon-bg" x1="4" y1="11" x2="36" y2="43" gradientUnits="userSpaceOnUse">
        <stop stopColor="#60A5FA" />
        <stop offset="1" stopColor="#1E40AF" />
      </linearGradient>
    </defs>
  </svg>
);

// 28. Notifications Bell (Flaticon Alert Bell)
export const FlaticonBell: React.FC<FlaticonProps> = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 48 48" className={`inline-block shrink-0 ${className}`} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M24 6C18 6 14 10.5 14 17V26L10 32H38L34 26V17C34 10.5 30 6 24 6Z" fill="url(#fl-bell-bg)" />
    <path d="M20 36C20 38.2 21.8 40 24 40C26.2 40 28 38.2 28 36" stroke="#EAB308" strokeWidth="3" strokeLinecap="round" />
    <circle cx="36" cy="12" r="5" fill="#EF4444" />
    <defs>
      <linearGradient id="fl-bell-bg" x1="10" y1="6" x2="38" y2="32" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FDE047" />
        <stop offset="1" stopColor="#EAB308" />
      </linearGradient>
    </defs>
  </svg>
);

// 29. Hamburger Menu (Flaticon Navigation)
export const FlaticonMenu: React.FC<FlaticonProps> = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 48 48" className={`inline-block shrink-0 ${className}`} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="8" y="10" width="32" height="5" rx="2.5" fill="#FBBF24" />
    <rect x="8" y="21.5" width="32" height="5" rx="2.5" fill="#38BDF8" />
    <rect x="8" y="33" width="32" height="5" rx="2.5" fill="#34D399" />
  </svg>
);

// 30. Close / Cancel Button (Flaticon Close Badge)
export const FlaticonClose: React.FC<FlaticonProps> = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 48 48" className={`inline-block shrink-0 ${className}`} fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="24" cy="24" r="20" fill="url(#fl-close-bg)" />
    <path d="M16 16L32 32M32 16L16 32" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
    <defs>
      <linearGradient id="fl-close-bg" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
        <stop stopColor="#F43F5E" />
        <stop offset="1" stopColor="#BE123C" />
      </linearGradient>
    </defs>
  </svg>
);

// 31. Calendar (Flaticon Calendar)
export const FlaticonCalendar: React.FC<FlaticonProps> = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 48 48" className={`inline-block shrink-0 ${className}`} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="6" y="10" width="36" height="32" rx="6" fill="#1E293B" />
    <path d="M6 16C6 12.6863 8.68629 10 12 10H36C39.3137 10 42 12.6863 42 16V18H6V16Z" fill="#3B82F6" />
    <rect x="14" y="6" width="4" height="8" rx="2" fill="#FDE047" />
    <rect x="30" y="6" width="4" height="8" rx="2" fill="#FDE047" />
    <circle cx="16" cy="26" r="2" fill="#94A3B8" />
    <circle cx="24" cy="26" r="2" fill="#94A3B8" />
    <circle cx="32" cy="26" r="2" fill="#94A3B8" />
    <circle cx="16" cy="34" r="2" fill="#94A3B8" />
    <circle cx="24" cy="34" r="3" fill="#10B981" />
    <circle cx="32" cy="34" r="2" fill="#94A3B8" />
  </svg>
);

// 32. Document & Statements (Flaticon Document)
export const FlaticonFileText: React.FC<FlaticonProps> = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 48 48" className={`inline-block shrink-0 ${className}`} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 6C10 4.89543 10.8954 4 12 4H28L38 14V42C38 43.1046 37.1046 44 36 44H12C10.8954 44 10 43.1046 10 42V6Z" fill="#1E293B" />
    <path d="M28 4L38 14H28V4Z" fill="#3B82F6" />
    <line x1="16" y1="20" x2="32" y2="20" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="16" y1="26" x2="32" y2="26" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="16" y1="32" x2="26" y2="32" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

// 33. Sparkles / AI Magic (Flaticon Sparkles)
export const FlaticonSparkles: React.FC<FlaticonProps> = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 48 48" className={`inline-block shrink-0 ${className}`} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Large Star */}
    <path d="M22 6L25.5 16.5L36 20L25.5 23.5L22 34L18.5 23.5L8 20L18.5 16.5L22 6Z" fill="url(#fl-sparkle-1)" />
    {/* Small Star Top-Right */}
    <path d="M37 26L39 31L44 33L39 35L37 40L35 35L30 33L35 31L37 26Z" fill="#38BDF8" />
    <defs>
      <linearGradient id="fl-sparkle-1" x1="8" y1="6" x2="36" y2="34" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FDE047" />
        <stop offset="1" stopColor="#F59E0B" />
      </linearGradient>
    </defs>
  </svg>
);

// 34. QR Code Scanner (Flaticon QR)
export const FlaticonQrCode: React.FC<FlaticonProps> = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 48 48" className={`inline-block shrink-0 ${className}`} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Frame brackets */}
    <path d="M6 16V8C6 6.89543 6.89543 6 8 6H16" stroke="#38BDF8" strokeWidth="3.5" strokeLinecap="round" />
    <path d="M42 16V8C42 6.89543 41.1046 6 40 6H32" stroke="#38BDF8" strokeWidth="3.5" strokeLinecap="round" />
    <path d="M6 32V40C6 41.1046 6.89543 42 8 42H16" stroke="#38BDF8" strokeWidth="3.5" strokeLinecap="round" />
    <path d="M42 32V40C42 41.1046 41.1046 42 40 42H32" stroke="#38BDF8" strokeWidth="3.5" strokeLinecap="round" />
    {/* QR blocks */}
    <rect x="13" y="13" width="8" height="8" rx="1.5" fill="#FDE047" />
    <rect x="27" y="13" width="8" height="8" rx="1.5" fill="#FDE047" />
    <rect x="13" y="27" width="8" height="8" rx="1.5" fill="#FDE047" />
    <rect x="27" y="27" width="4" height="4" fill="#34D399" />
    <rect x="31" y="31" width="4" height="4" fill="#34D399" />
  </svg>
);

// 35. Log Out / Exit (Flaticon Exit)
export const FlaticonLogOut: React.FC<FlaticonProps> = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 48 48" className={`inline-block shrink-0 ${className}`} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M18 10H10C8.89543 10 8 10.8954 8 12V36C8 37.1046 8.89543 38 10 38H18" stroke="#94A3B8" strokeWidth="3.5" strokeLinecap="round" />
    <path d="M30 16L40 24L30 32" stroke="#EF4444" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="20" y1="24" x2="38" y2="24" stroke="#EF4444" strokeWidth="3.5" strokeLinecap="round" />
  </svg>
);

// 36. Plus Icon (Flaticon Add Badge)
export const FlaticonPlus: React.FC<FlaticonProps> = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 48 48" className={`inline-block shrink-0 ${className}`} fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="24" cy="24" r="20" fill="url(#fl-plus-bg)" />
    <line x1="24" y1="14" x2="24" y2="34" stroke="#0F172A" strokeWidth="4" strokeLinecap="round" />
    <line x1="14" y1="24" x2="34" y2="24" stroke="#0F172A" strokeWidth="4" strokeLinecap="round" />
    <defs>
      <linearGradient id="fl-plus-bg" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FDE047" />
        <stop offset="1" stopColor="#EAB308" />
      </linearGradient>
    </defs>
  </svg>
);

// 37. Play Media Video (Flaticon Play Button)
export const FlaticonPlay: React.FC<FlaticonProps> = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 48 48" className={`inline-block shrink-0 ${className}`} fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="24" cy="24" r="20" fill="url(#fl-play-bg)" />
    <path d="M19 15L34 24L19 33V15Z" fill="#FFFFFF" />
    <defs>
      <linearGradient id="fl-play-bg" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
        <stop stopColor="#EF4444" />
        <stop offset="1" stopColor="#B91C1C" />
      </linearGradient>
    </defs>
  </svg>
);

// 38. Chevrons & Arrows (Flaticon Arrows)
export const FlaticonChevronDown: React.FC<FlaticonProps> = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 24 24" className={`inline-block shrink-0 ${className}`} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

export const FlaticonChevronUp: React.FC<FlaticonProps> = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 24 24" className={`inline-block shrink-0 ${className}`} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="18 15 12 9 6 15" />
  </svg>
);

export const FlaticonChevronRight: React.FC<FlaticonProps> = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 24 24" className={`inline-block shrink-0 ${className}`} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);


// =========================================================================
// FLATICON (www.flaticon.com) DROP-IN ICON COMPONENTS & HELPERS
// =========================================================================

export const FlaticonUIcon: React.FC<{
  name: string;
  variant?: "rr" | "sr" | "br" | "brands";
  className?: string;
  size?: number | string;
  style?: React.CSSProperties;
}> = ({ name, variant = "rr", className = "", size, style }) => {
  const sizeStyle = size ? { fontSize: typeof size === "number" ? `${size}px` : size } : {};
  return (
    <i 
      className={`fi fi-${variant}-${name} inline-flex items-center justify-center ${className}`}
      style={{ ...sizeStyle, ...style }}
      aria-hidden="true"
    />
  );
};

// Drop-in icon components styled according to Flaticon standards:
export const Activity: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-rr-pulse" {...props}>
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

export const AlertCircle: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-sr-info" {...props}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" strokeWidth={strokeWidth} />
  </svg>
);

export const AlertTriangle: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-sr-triangle-warning" {...props}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

export const ArrowDown: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-rr-arrow-down" {...props}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <polyline points="19 12 12 19 5 12" />
  </svg>
);

export const ArrowDownRight: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-rr-arrow-down-right" {...props}>
    <line x1="7" y1="7" x2="17" y2="17" />
    <polyline points="17 7 17 17 7 17" />
  </svg>
);

export const ArrowLeft: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-rr-arrow-left" {...props}>
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

export const ArrowRight: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-rr-arrow-right" {...props}>
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

export const ArrowUp: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-rr-arrow-up" {...props}>
    <line x1="12" y1="19" x2="12" y2="5" />
    <polyline points="5 12 12 5 19 12" />
  </svg>
);

export const ArrowUpRight: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-rr-arrow-up-right" {...props}>
    <line x1="7" y1="17" x2="17" y2="7" />
    <polyline points="7 7 17 7 17 17" />
  </svg>
);

export const Award: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-sr-trophy" {...props}>
    <circle cx="12" cy="8" r="7" />
    <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
  </svg>
);

export const BarChart2: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-sr-chart-histogram" {...props}>
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);

export const BookOpen: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-sr-book-alt" {...props}>
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
);

export const Bookmark: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-sr-bookmark" {...props}>
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
);

export const Building: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-sr-bank" {...props}>
    <line x1="3" y1="21" x2="21" y2="21" />
    <line x1="3" y1="10" x2="21" y2="10" />
    <polyline points="3 10 12 3 21 10" />
    <line x1="6" y1="10" x2="6" y2="21" />
    <line x1="10" y1="10" x2="10" y2="21" />
    <line x1="14" y1="10" x2="14" y2="21" />
    <line x1="18" y1="10" x2="18" y2="21" />
  </svg>
);

export const Calendar: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-rr-calendar" {...props}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

export const Camera: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-rr-camera" {...props}>
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);

export const Check: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-rr-check" {...props}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export const CheckCircle: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-sr-check-circle" {...props}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

export const CheckCircle2: React.FC<FlaticonProps> = CheckCircle;

export const ChevronDown: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-rr-angle-small-down" {...props}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

export const ChevronRight: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-rr-angle-small-right" {...props}>
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

export const ChevronUp: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-rr-angle-small-up" {...props}>
    <polyline points="18 15 12 9 6 15" />
  </svg>
);

export const ChevronsLeft: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-rr-angle-double-small-left" {...props}>
    <polyline points="11 17 6 12 11 7" />
    <polyline points="18 17 13 12 18 7" />
  </svg>
);

export const ChevronsRight: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-rr-angle-double-small-right" {...props}>
    <polyline points="13 17 18 12 13 7" />
    <polyline points="6 17 11 12 6 7" />
  </svg>
);

export const Clock: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-rr-clock" {...props}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

export const Compass: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-rr-compass" {...props}>
    <circle cx="12" cy="12" r="10" />
    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
  </svg>
);

export const Copy: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-rr-copy" {...props}>
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

export const Crosshair: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-rr-crosshairs" {...props}>
    <circle cx="12" cy="12" r="10" />
    <line x1="22" y1="12" x2="18" y2="12" />
    <line x1="6" y1="12" x2="2" y2="12" />
    <line x1="12" y1="6" x2="12" y2="2" />
    <line x1="12" y1="22" x2="12" y2="18" />
  </svg>
);

export const DollarSign: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-sr-usd-circle" {...props}>
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

export const Download: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-rr-download" {...props}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

export const Edit: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-rr-edit" {...props}>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

export const Edit2: React.FC<FlaticonProps> = Edit;
export const Edit3: React.FC<FlaticonProps> = Edit;

export const ExternalLink: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-rr-up-right-from-square" {...props}>
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

export const Eye: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-rr-eye" {...props}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const EyeOff: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-rr-eye-crossed" {...props}>
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

export const FileCheck: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-rr-file-check" {...props}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <path d="M9 15l2 2 4-4" />
  </svg>
);

export const FileText: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-rr-document" {...props}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

export const Fingerprint: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-rr-fingerprint" {...props}>
    <path d="M2 12C2 6.5 6.5 2 12 2a10 10 0 0 1 8 4" />
    <path d="M5 19.5C5.5 18 6 15 6 12c0-.7.12-1.37.34-2" />
    <path d="M17.29 21.02c.12-.6.18-1.2.18-1.85 0-2-.5-3.5-1.5-5" />
    <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
    <path d="M8.65 22c.21-.66.45-1.32.57-2" />
    <path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
    <path d="M2 16h.01" />
    <path d="M21.8 16c.2-2 .131-5.354 0-6" />
    <path d="M9 6.8a6 6 0 0 1 9 5.2c0 .47 0 1.17-.02 2" />
  </svg>
);

export const Flame: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-sr-flame" {...props}>
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
  </svg>
);

export const Globe: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-rr-globe" {...props}>
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

export const Globe2: React.FC<FlaticonProps> = Globe;

export const Grid: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-rr-grid" {...props}>
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
  </svg>
);

export const HelpCircle: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-sr-interrogation" {...props}>
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

export const History: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-rr-time-past" {...props}>
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <polyline points="3 3 3 8 8 8" />
    <polyline points="12 7 12 12 15 15" />
  </svg>
);

export const Instagram: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-brands-instagram" {...props}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

export const KeyRound: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-sr-key" {...props}>
    <circle cx="8" cy="15" r="5" />
    <polyline points="12 11 22 1 22 5 18 5 18 9 14 9" />
  </svg>
);

export const Key: React.FC<FlaticonProps> = KeyRound;

export const Layers: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-sr-layers" {...props}>
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </svg>
);

export const List: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-rr-list" {...props}>
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);

export const Lock: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-sr-lock" {...props}>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

export const Mail: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-sr-envelope" {...props}>
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

export const Maximize2: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-rr-expand" {...props}>
    <polyline points="15 3 21 3 21 9" />
    <polyline points="9 21 3 21 3 15" />
    <line x1="21" y1="3" x2="14" y2="10" />
    <line x1="3" y1="21" x2="10" y2="14" />
  </svg>
);

export const Menu: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-rr-menu-burger" {...props}>
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

export const MessageSquare: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-sr-comment-alt" {...props}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

export const Minimize2: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-rr-compress" {...props}>
    <polyline points="4 14 10 14 10 20" />
    <polyline points="20 10 14 10 14 4" />
    <line x1="14" y1="10" x2="21" y2="3" />
    <line x1="3" y1="21" x2="10" y2="14" />
  </svg>
);

export const Minus: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-rr-minus" {...props}>
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

export const MoreVertical: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-rr-menu-dots-vertical" {...props}>
    <circle cx="12" cy="12" r="1" />
    <circle cx="12" cy="5" r="1" />
    <circle cx="12" cy="19" r="1" />
  </svg>
);

export const MousePointer: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-rr-cursor" {...props}>
    <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
    <path d="M13 13l6 6" />
  </svg>
);

export const Newspaper: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-sr-newspaper" {...props}>
    <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
    <path d="M18 14h-8" />
    <path d="M15 18h-5" />
    <path d="M10 6h8v4h-8V6Z" />
  </svg>
);

export const Pause: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-sr-pause" {...props}>
    <rect x="6" y="4" width="4" height="16" />
    <rect x="14" y="4" width="4" height="16" />
  </svg>
);

export const PenTool: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-rr-pen-clip" {...props}>
    <path d="M12 19l7-7 3 3-7 7-3-3z" />
    <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
    <circle cx="11" cy="11" r="2" />
  </svg>
);

export const Phone: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-sr-phone-call" {...props}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

export const Play: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-sr-play" {...props}>
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

export const PlayCircle: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-sr-play-alt" {...props}>
    <circle cx="12" cy="12" r="10" />
    <polygon points="10 8 16 12 10 16 10 8" />
  </svg>
);

export const Plus: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-rr-plus" {...props}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

export const Radio: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-sr-podcast" {...props}>
    <circle cx="12" cy="12" r="2" />
    <path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14" />
  </svg>
);

export const RefreshCw: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-rr-refresh" {...props}>
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

export const RotateCcw: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-rr-rotate-left" {...props}>
    <polyline points="1 4 1 10 7 10" />
    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
  </svg>
);

export const Ruler: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-rr-ruler-combined" {...props}>
    <path d="M21.3 8.7 8.7 21.3c-1 1-2.5 1-3.4 0l-2.6-2.6c-1-1-1-2.5 0-3.4L15.3 2.7c1-1 2.5-1 3.4 0l2.6 2.6c1 1 1 2.5 0 3.4Z" />
    <line x1="14" y1="4" x2="16" y2="6" />
    <line x1="11" y1="7" x2="14" y2="10" />
    <line x1="8" y1="10" x2="10" y2="12" />
    <line x1="5" y1="13" x2="8" y2="16" />
  </svg>
);

export const Search: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-rr-search" {...props}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

export const Send: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-sr-paper-plane" {...props}>
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

export const Share2: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-rr-share" {...props}>
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </svg>
);

export const ShieldAlert: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-sr-shield-exclamation" {...props}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

export const ShieldCheck: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-sr-shield-check" {...props}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <polyline points="9 12 11 14 15 10" />
  </svg>
);

export const Sliders: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-rr-settings-sliders" {...props}>
    <line x1="4" y1="21" x2="4" y2="14" />
    <line x1="4" y1="10" x2="4" y2="3" />
    <line x1="12" y1="21" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12" y2="3" />
    <line x1="20" y1="21" x2="20" y2="16" />
    <line x1="20" y1="12" x2="20" y2="3" />
    <line x1="1" y1="14" x2="7" y2="14" />
    <line x1="9" y1="8" x2="15" y2="8" />
    <line x1="17" y1="16" x2="23" y2="16" />
  </svg>
);

export const SlidersHorizontal: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-rr-filter" {...props}>
    <line x1="21" y1="4" x2="14" y2="4" />
    <line x1="10" y1="4" x2="3" y2="4" />
    <line x1="21" y1="12" x2="12" y2="12" />
    <line x1="8" y1="12" x2="3" y2="12" />
    <line x1="21" y1="20" x2="16" y2="20" />
    <line x1="12" y1="20" x2="3" y2="20" />
    <line x1="14" y1="2" x2="14" y2="6" />
    <line x1="8" y1="10" x2="8" y2="14" />
    <line x1="16" y1="18" x2="16" y2="22" />
  </svg>
);

export const Smartphone: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-rr-smartphone" {...props}>
    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
    <line x1="12" y1="18" x2="12.01" y2="18" />
  </svg>
);

export const Sparkles: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-sr-sparkles" {...props}>
    <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3z" />
  </svg>
);

export const Square: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-rr-square" {...props}>
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
  </svg>
);

export const Trash2: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-rr-trash" {...props}>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);

export const TrendingDown: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-sr-chart-line-down" {...props}>
    <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
    <polyline points="17 18 23 18 23 12" />
  </svg>
);

export const TrendingUp: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-sr-chart-line-up" {...props}>
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);

export const Twitter: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-brands-twitter" {...props}>
    <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z" />
  </svg>
);

export const Unlock: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-sr-unlock" {...props}>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 9.9-1" />
  </svg>
);

export const UploadCloud: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-rr-cloud-upload" {...props}>
    <polyline points="16 16 12 12 8 16" />
    <line x1="12" y1="12" x2="12" y2="21" />
    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
    <polyline points="16 16 12 12 8 16" />
  </svg>
);

export const Upload: React.FC<FlaticonProps> = UploadCloud;

export const User: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-sr-user" {...props}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

export const Users: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-sr-users" {...props}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

export const Video: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-sr-video-camera-alt" {...props}>
    <polygon points="23 7 16 12 23 17 23 7" />
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
  </svg>
);

export const Volume2: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-sr-volume" {...props}>
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
  </svg>
);

export const X: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-rr-cross" {...props}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export const XCircle: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-sr-cross-circle" {...props}>
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);

export const Youtube: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-brands-youtube" {...props}>
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
  </svg>
);

export const Zap: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-sr-bolt" {...props}>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

export const Wallet: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-sr-wallet" {...props}>
    <rect x="2" y="5" width="20" height="14" rx="3" />
    <path d="M16 12h3" />
    <circle cx="17.5" cy="12" r="1.5" />
    <path d="M6 5V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v2" />
  </svg>
);

export const CreditCard: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-sr-credit-card" {...props}>
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
    <line x1="1" y1="10" x2="23" y2="10" />
  </svg>
);

export const Bell: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-sr-bell" {...props}>
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

export const Settings: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-sr-settings" {...props}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

export const Percent: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-rr-percentage" {...props}>
    <line x1="19" y1="5" x2="5" y2="19" />
    <circle cx="6.5" cy="6.5" r="2.5" />
    <circle cx="17.5" cy="17.5" r="2.5" />
  </svg>
);

export const Headphones: React.FC<FlaticonProps> = ({ className = "w-5 h-5", size, strokeWidth = 2, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} width={size} height={size} data-flaticon="fi-sr-headphones" {...props}>
    <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
    <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
  </svg>
);

export const QrCode: React.FC<FlaticonProps> = FlaticonQrCode;
export const LogOut: React.FC<FlaticonProps> = FlaticonLogOut;
