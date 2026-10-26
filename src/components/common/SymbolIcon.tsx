import { symbolIconUris } from '../../lib/symbolIcons';

/** Instrument logo: two overlapping flags for FX pairs, a single coin/metal/oil icon otherwise. */
export function SymbolIcon({ symbol, size = 20 }: { symbol: string; size?: number }) {
  const uris = symbolIconUris(symbol);
  return (
    <span className="inline-flex items-center shrink-0" style={{ height: size }}>
      {uris.map((u, i) => (
        <img key={i} src={u} alt="" width={size} height={size} draggable={false} className="rounded-full" style={{ marginLeft: i ? -size * 0.3 : 0, height: size, width: size }} />
      ))}
    </span>
  );
}
