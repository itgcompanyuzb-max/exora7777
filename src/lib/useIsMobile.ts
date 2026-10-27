import { useEffect, useState } from 'react';

/** True on phone-sized screens (updates on rotate / resize). */
export function useIsMobile(maxWidth = 767): boolean {
  const q = `(max-width: ${maxWidth}px)`;
  const [mobile, setMobile] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches);
  useEffect(() => {
    const m = window.matchMedia(q);
    const h = () => setMobile(m.matches);
    m.addEventListener('change', h);
    h();
    return () => m.removeEventListener('change', h);
  }, [q]);
  return mobile;
}
