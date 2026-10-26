// Self-drawn instrument icons (flags, coins, metals, oil). Pure functions so both the UI and the
// server (chart legend `logo_urls`) can use them without hot-linking third-party artwork.

type Part = string; // SVG fragment drawn inside a 32x32 box

const GB: Part = `<rect width="32" height="32" fill="#012169"/><path d="M0 0L32 32M32 0L0 32" stroke="#fff" stroke-width="6"/><path d="M0 0L32 32M32 0L0 32" stroke="#c8102e" stroke-width="2.4"/><path d="M16 0V32M0 16H32" stroke="#fff" stroke-width="10"/><path d="M16 0V32M0 16H32" stroke="#c8102e" stroke-width="6"/>`;

const dots = (pts: Array<[number, number]>, r: number, fill: string) => pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`).join('');

const FLAGS: Record<string, Part> = {
  US: `<rect width="32" height="32" fill="#fff"/>${[0, 2, 4, 6, 8, 10, 12].map((i) => `<rect y="${(i * 32) / 13}" width="32" height="${32 / 13}" fill="#b22234"/>`).join('')}<rect width="15" height="17.5" fill="#3c3b6e"/>${dots([[3, 3], [7.5, 3], [12, 3], [5, 7], [10, 7], [3, 11], [7.5, 11], [12, 11], [5, 15], [10, 15]], 0.9, '#fff')}`,
  EU: `<rect width="32" height="32" fill="#003399"/>${dots(Array.from({ length: 12 }, (_, i) => [16 + 9 * Math.cos((i * Math.PI) / 6), 16 + 9 * Math.sin((i * Math.PI) / 6)] as [number, number]), 1.4, '#ffcc00')}`,
  GB,
  JP: `<rect width="32" height="32" fill="#fff"/><circle cx="16" cy="16" r="9" fill="#bc002d"/>`,
  CH: `<rect width="32" height="32" fill="#d52b1e"/><rect x="13" y="6" width="6" height="20" fill="#fff"/><rect x="6" y="13" width="20" height="6" fill="#fff"/>`,
  CA: `<rect width="32" height="32" fill="#fff"/><rect width="8" height="32" fill="#d52b1e"/><rect x="24" width="8" height="32" fill="#d52b1e"/><path d="M16 7l2 5 4-1-2 4 3 2-5 1v5h-2v-5l-5-1 3-2-2-4 4 1z" fill="#d52b1e"/>`,
  AU: `<rect width="32" height="32" fill="#00247d"/><g transform="scale(.5)">${GB}</g>${dots([[8, 24], [22, 8], [26, 14], [22, 23], [17, 15]], 1.8, '#fff')}`,
  NZ: `<rect width="32" height="32" fill="#00247d"/><g transform="scale(.5)">${GB}</g>${dots([[22, 8], [26, 14], [22, 23], [17, 15]], 2, '#cc142b')}`,
};

const CCY_FLAG: Record<string, string> = { USD: 'US', EUR: 'EU', GBP: 'GB', JPY: 'JP', CHF: 'CH', CAD: 'CA', AUD: 'AU', NZD: 'NZ' };

const circle = (inner: Part) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32"><defs><clipPath id="c"><circle cx="16" cy="16" r="15.5"/></clipPath></defs><g clip-path="url(#c)">${inner}</g><circle cx="16" cy="16" r="15.5" fill="none" stroke="rgba(0,0,0,.35)"/></svg>`;

const COINS: Record<string, Part> = {
  XAU: `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff3b0"/><stop offset=".55" stop-color="#e5b422"/><stop offset="1" stop-color="#a87400"/></linearGradient></defs><rect width="32" height="32" fill="url(#g)"/><circle cx="16" cy="16" r="11.5" fill="none" stroke="#fff6c8" stroke-opacity=".7"/><text x="16" y="21" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="13" fill="#6b4a00">Au</text>`,
  XAG: `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fafbfc"/><stop offset=".55" stop-color="#b9c0c8"/><stop offset="1" stop-color="#7c8691"/></linearGradient></defs><rect width="32" height="32" fill="url(#g)"/><circle cx="16" cy="16" r="11.5" fill="none" stroke="#fff" stroke-opacity=".7"/><text x="16" y="21" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="13" fill="#444f5a">Ag</text>`,
  BTC: `<rect width="32" height="32" fill="#f7931a"/><text x="16" y="23" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="20" fill="#fff">&#8383;</text>`,
  ETH: `<rect width="32" height="32" fill="#627eea"/><path d="M16 5l-7 11.5 7 4 7-4z" fill="#fff"/><path d="M16 27l-7-9.5 7 4 7-4z" fill="#fff" fill-opacity=".85"/>`,
  SOL: `<defs><linearGradient id="g" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#9945ff"/><stop offset="1" stop-color="#14f195"/></linearGradient></defs><rect width="32" height="32" fill="#0d0d12"/><path d="M10 9.5h14l-2.5 3.5H7.500z" fill="url(#g)"/><path d="M7.500 14.300h14l2.500 3.500H10z" fill="url(#g)"/><path d="M10 19.500h14l-2.500 3.500H7.500z" fill="url(#g)"/>`,
  OIL: `<rect width="32" height="32" fill="#1b1f24"/><path d="M16 6c4 5.500 6.500 8.500 6.500 12a6.500 6.500 0 0 1-13 0c0-3.500 2.500-6.500 6.500-12z" fill="#fff"/><path d="M13 19.500a3.200 3.200 0 0 0 3 3" stroke="#1b1f24" stroke-width="1.600" fill="none" stroke-linecap="round"/>`,
};

function parse(symbol: string): { kind: 'pair'; base: string; quote: string } | { kind: 'coin'; key: string } | { kind: 'index' } | null {
  const s = symbol.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (s.startsWith('XAU') || s === 'GOLD') return { kind: 'coin', key: 'XAU' };
  if (s.startsWith('XAG') || s === 'SILVER') return { kind: 'coin', key: 'XAG' };
  for (const c of ['BTC', 'ETH', 'SOL']) if (s.startsWith(c)) return { kind: 'coin', key: c };
  if (s.includes('OIL') || s === 'WTI') return { kind: 'coin', key: 'OIL' };
  if (s === 'US30' || s === 'USTEC') return { kind: 'index' };
  if (/^[A-Z]{6}$/.test(s) && CCY_FLAG[s.slice(0, 3)] && CCY_FLAG[s.slice(3)]) return { kind: 'pair', base: s.slice(0, 3), quote: s.slice(3) };
  return null;
}

const generic = (label: string) => circle(`<rect width="32" height="32" fill="#3a4350"/><text x="16" y="20.500" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="11" fill="#fff">${label.slice(0, 3)}</text>`);

/** One SVG per leg: forex pairs return [base flag, quote flag], everything else a single icon. */
export function symbolIconSvgs(symbol: string): string[] {
  const p = parse(symbol);
  if (!p) return [generic(symbol.toUpperCase().replace(/[^A-Z0-9]/g, ''))];
  if (p.kind === 'pair') return [circle(FLAGS[CCY_FLAG[p.base]]), circle(FLAGS[CCY_FLAG[p.quote]])];
  if (p.kind === 'index') return [circle(`${FLAGS.US}<circle cx="23" cy="24" r="8" fill="#10151a"/><text x="23" y="27.500" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="9" fill="#fff">30</text>`)];
  return [circle(COINS[p.key])];
}

export const svgToDataUri = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
export const symbolIconUris = (symbol: string): string[] => symbolIconSvgs(symbol).map(svgToDataUri);
