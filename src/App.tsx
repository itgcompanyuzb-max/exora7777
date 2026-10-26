import React, { useState, useEffect } from "react";
import { Toaster, toast } from "sonner";
import { translations, Language } from "./lib/i18n";
import { brokerStore } from "./lib/brokerStore";
import { BrokerUser } from "./types/broker";
import { LandingView } from "./components/broker/LandingView";
import { WebTraderView } from "./components/broker/WebTraderView";
import { ClientCabinetView } from "./components/broker/ClientCabinetView";
import { KycVerificationView } from "./components/broker/KycVerificationView";
import { EducationAndSupportView } from "./components/broker/EducationAndSupportView";
import { AdminPortalView } from "./components/broker/AdminPortalView";
import { MediaCenterView } from "./components/broker/MediaCenterView";
import { AuthModal } from "./components/broker/AuthModal";
import { AuthGate } from "./components/broker/AuthGate";
import { MetaTraderTerminal } from "./components/MetaTraderTerminal";
import { getToken } from "./lib/api";
import { startServerSync, signOut } from "./lib/serverSync";
import { 
  ShieldCheck, 
  TrendingUp, 
  Wallet, 
  Layers, 
  BookOpen, 
  HelpCircle, 
  Lock, 
  Globe, 
  Menu, 
  X, 
  ChevronDown,
  User,
  LogOut,
  ArrowUpRight,
  Radio
} from "lucide-react";

export default function App() {
  const [lang, setLang] = useState<Language>('uz');
  const t = translations[lang];
  const [currentUser, setCurrentUser] = useState<BrokerUser>(brokerStore.getActiveUser());
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => !!getToken());
  // While a stored session is being restored from the server, hold back the UI.
  const [booting, setBooting] = useState<boolean>(() => !!getToken());
  const [activeTab, setActiveTab] = useState<'landing' | 'webtrader' | 'metatrader' | 'cabinet' | 'kyc' | 'support' | 'admin' | 'media'>(() => (getToken() ? 'webtrader' : 'landing'));

  useEffect(() => {
    if (!getToken()) return;
    startServerSync().then((ok) => {
      if (!ok) {
        setIsLoggedIn(false);
        setActiveTab('landing');
      }
      setBooting(false);
    });
  }, []);

  // Auth Modal State
  const [authOpen, setAuthOpen] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'register'>('register');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const unsub = brokerStore.subscribe(() => {
      setCurrentUser(brokerStore.getActiveUser());
    });
    return unsub;
  }, []);

  // Trading, cabinet and admin need a real session; never show the local demo store to guests.
  useEffect(() => {
    if (!isLoggedIn && ['webtrader', 'metatrader', 'cabinet', 'kyc', 'admin'].includes(activeTab)) {
      setActiveTab('landing');
      setAuthInitialMode('login');
      setAuthOpen(true);
    }
  }, [isLoggedIn, activeTab]);

  function handleOpenAuth(mode: 'login' | 'register') {
    setAuthInitialMode(mode);
    setAuthOpen(true);
    setMobileMenuOpen(false);
  }

  function handleLogout() {
    toast.success("Tizimdan muvaffaqiyatli chiqildi");
    signOut();
  }

  function handleAuthSuccess() {
    setIsLoggedIn(true);
    try {
      localStorage.setItem('exora_logged_in', 'true');
    } catch {}
    setActiveTab('cabinet');
    setMobileMenuOpen(false);
  }

  if (booting) {
    return (
      <div className="min-h-screen bg-[#0e110f] text-gray-400 flex items-center justify-center font-mono text-sm">
        Exora Prime — serverga ulanmoqda…
      </div>
    );
  }

  // Signed-out visitors see a single sign-in / register screen and nothing else.
  if (!isLoggedIn) {
    return (
      <>
        <Toaster position="top-right" richColors />
        <AuthGate onRegister={() => handleOpenAuth('register')} onSignIn={() => handleOpenAuth('login')} />
        <AuthModal
          isOpen={authOpen}
          onClose={() => setAuthOpen(false)}
          onSuccess={handleAuthSuccess}
          lang={lang}
          initialMode={authInitialMode}
        />
      </>
    );
  }

  return (
    <div className={`min-h-screen bg-[#0e110f] text-[#f4f7f2] font-sans antialiased selection:bg-primary selection:text-black flex flex-col ${(activeTab === 'webtrader' || activeTab === 'metatrader') ? 'h-screen overflow-hidden' : 'justify-between'}`}>
      <Toaster position="top-right" theme="dark" richColors />

      {/* The top navigation bar was removed: sections are reached from the cabinet sidebar and profile menu. */}

      {/* 3. MAIN WORKSPACE CONTAINER */}
      {activeTab === 'cabinet' ? (
        <div className="flex-1 w-full flex flex-col">
          <ClientCabinetView
            lang={lang}
            onOpenKyc={() => setActiveTab('kyc')}
            onOpenTrade={() => setActiveTab('webtrader')}
            onOpenMedia={() => setActiveTab('media')}
            onLogout={handleLogout}
            onOpenAdmin={['super_admin', 'finance_admin', 'compliance_admin', 'support_admin'].includes(currentUser.role) ? () => setActiveTab('admin') : undefined}
          />
        </div>
      ) : activeTab === 'webtrader' ? (
        <div className="w-full h-screen overflow-hidden flex flex-col">
          <WebTraderView
            lang={lang}
            onOpenDeposit={() => setActiveTab('cabinet')}
            onReturnToCabinet={() => setActiveTab('cabinet')}
            onLogout={handleLogout}
          />
        </div>
      ) : activeTab === 'metatrader' ? (
        <div className="w-full h-screen overflow-hidden flex flex-col">
          <MetaTraderTerminal
            onBackToCabinet={() => setActiveTab('cabinet')}
            onSwitchToWebTrader={() => setActiveTab('webtrader')}
          />
        </div>
      ) : (
        <main className={`${activeTab === 'admin' ? 'max-w-[1800px]' : 'max-w-7xl'} mx-auto px-4 sm:px-6 pt-6 sm:pt-8 flex-1 w-full`}>
          {activeTab === 'landing' && (
            <LandingView
              lang={lang}
              onOpenTrading={() => setActiveTab('webtrader')}
              onOpenCabinet={() => setActiveTab('cabinet')}
              onOpenRegister={() => handleOpenAuth('register')}
            />
          )}

          {activeTab === 'kyc' && (
            <div className="space-y-4">
              <button
                onClick={() => setActiveTab('cabinet')}
                className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-300 hover:text-white inline-flex items-center gap-1.5 border border-white/10"
              >
                &larr; Kabinetga qaytish
              </button>
              {brokerStore.isServerMode() ? (
                <div className="max-w-xl rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center text-gray-300">
                  <div className="text-lg font-bold text-white mb-2">Shaxsni tasdiqlash (KYC)</div>
                  <p className="text-sm">Test rejimida shaxsni tasdiqlash talab qilinmaydi. Bu bo'lim litsenziya olingach, hujjat yuklash va operator tekshiruvi bilan yoqiladi.</p>
                </div>
              ) : (
                <KycVerificationView lang={lang} />
              )}
            </div>
          )}

          {activeTab === 'support' && (
            <div className="space-y-4">
              <button
                onClick={() => setActiveTab('cabinet')}
                className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-300 hover:text-white inline-flex items-center gap-1.5 border border-white/10"
              >
                &larr; Kabinetga qaytish
              </button>
              <EducationAndSupportView lang={lang} />
            </div>
          )}

          {activeTab === 'admin' && (
            <div className="space-y-4">
              <button
                onClick={() => setActiveTab('cabinet')}
                className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-300 hover:text-white inline-flex items-center gap-1.5 border border-white/10"
              >
                &larr; Kabinetga qaytish
              </button>
              <AdminPortalView lang={lang} />
            </div>
          )}

          {activeTab === 'media' && (
            <div className="space-y-4">
              <button
                onClick={() => setActiveTab('cabinet')}
                className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-300 hover:text-white inline-flex items-center gap-1.5 border border-white/10 cursor-pointer"
              >
                &larr; Kabinetga qaytish
              </button>
              <MediaCenterView
                lang={lang}
                onOpenTrading={() => setActiveTab('webtrader')}
                onOpenCabinet={() => setActiveTab('cabinet')}
              />
            </div>
          )}
        </main>
      )}

      {/* 4. FOOTER WITH REGULATORY & RISK WARNING (Only shown on public landing page) */}
      {activeTab === 'landing' && (
        <footer className="mt-16 border-t border-white/10 bg-black/40 py-12 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col gap-8">
          <div className="flex flex-wrap items-center justify-between gap-6 pb-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">
                EX
              </div>
              <span className="font-bold text-white text-sm">EXORA PRIME GLOBAL</span>
            </div>
            <div className="flex flex-wrap gap-6 text-xs text-muted-foreground">
              <button onClick={() => setActiveTab('landing')} className="hover:text-white">Asosiy</button>
              <button onClick={() => setActiveTab('webtrader')} className="hover:text-white">WebTrader</button>
              <button onClick={() => setActiveTab('cabinet')} className="hover:text-white">Kabinet</button>
              <button onClick={() => setActiveTab('kyc')} className="hover:text-white">KYC</button>
              <button onClick={() => setActiveTab('support')} className="hover:text-white">Yordam</button>
              <button onClick={() => setActiveTab('admin')} className="text-rose-400 hover:text-rose-300">Admin</button>
            </div>
          </div>

          <div className="text-[11px] text-muted-foreground leading-relaxed flex flex-col gap-2">
            <p>
              <strong>Xavf to'g'risida ogohlantirish (Risk Warning):</strong> Forex va CFD (narxlar farqi bo'yicha shartnomalar) marjali vositalar bo'lib, yuqori darajadagi risk bilan bog'liq. Kaldıraç (leverage) ham foydangizni, ham zararingizni bir necha barobar oshirishi mumkin. Savdoni boshlashdan oldin moliyaviy imkoniyatlaringizni to'g'ri baholang va xavflarni to'liq tushunganingizga ishonch hosil qiling.
            </p>
            <p>
              Exora Prime hozircha demo (sinov) rejimida ishlaydi. Litsenziya va ro'yxatdan o'tish ma'lumotlari rasmiy ishga tushirishdan oldin e'lon qilinadi. Haqiqiy mablag' kiritmang.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between text-xs text-muted-foreground pt-4 border-t border-white/5">
            <div>&copy; {new Date().getFullYear()} Exora Prime. Barcha huquqlar himoyalangan.</div>
            <div className="font-mono text-[11px]">Secure Connection: TLS 1.3 &bull; AES-256</div>
          </div>
        </div>
      </footer>
      )}

      {/* Auth Modal (Register + OTP & Login + 2FA) */}
      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={handleAuthSuccess}
        lang={lang}
        initialMode={authInitialMode}
      />
    </div>
  );
}
