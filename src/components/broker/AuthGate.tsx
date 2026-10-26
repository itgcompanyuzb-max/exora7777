import { useEffect, useState } from 'react';

interface AuthGateProps {
  onRegister: () => void;
  onSignIn: () => void;
}

/** The only page a signed-out visitor sees: brand, one line, Register / Sign in. */
export function AuthGate({ onRegister, onSignIn }: AuthGateProps) {
  const [cfg, setCfg] = useState<{ supportEmail: string | null; testMode: boolean }>({ supportEmail: null, testMode: true });
  useEffect(() => {
    fetch('/api/v1/public-config').then((r) => r.json()).then((d) => d?.success && setCfg(d)).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-white text-[#141414] flex flex-col font-sans">
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="mb-10 flex items-center gap-3 select-none">
          <div className="w-11 h-11 rounded-2xl bg-[#b9ef40] flex items-center justify-center font-black text-lg text-black">EX</div>
          <div className="text-[34px] leading-none font-extrabold tracking-tight">
            Exora<span className="text-[#6cab00]"> Prime</span>
          </div>
        </div>

        <p className="text-[15px] text-[#6b6f76] max-w-md">
          Exora Prime xizmatlaridan to'liq foydalanish uchun tizimga kiring yoki ro'yxatdan o'ting.
        </p>

        <div className="mt-9 w-full max-w-[216px] flex flex-col gap-4">
          <button onClick={onRegister} className="h-12 rounded-md bg-[#b9ef40] hover:bg-[#a8de2f] text-black font-bold text-[15px] transition-colors">
            Ro'yxatdan o'tish
          </button>
          <button onClick={onSignIn} className="h-12 rounded-md bg-[#f2f3f5] hover:bg-[#e8eaed] text-[#141414] font-bold text-[15px] transition-colors">
            Kirish
          </button>
        </div>

        {cfg.supportEmail && (
          <a href={`mailto:${cfg.supportEmail}`} className="mt-12 text-sm underline underline-offset-4 decoration-[#141414]/40 hover:decoration-[#141414]">
            {cfg.supportEmail}
          </a>
        )}
      </main>

      <footer className="mx-auto w-full max-w-5xl border-t border-[#e6e8eb] px-6 py-8 text-center text-[13px] text-[#6b6f76]">
        Exora Prime hozircha demo (sinov) rejimida ishlaydi, litsenziyalash jarayonida.
        {cfg.testMode && " Haqiqiy mablag' qabul qilinmaydi, savdo virtual hisobda amalga oshiriladi."}
      </footer>
    </div>
  );
}
