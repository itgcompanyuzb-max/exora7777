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
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('exora_logged_in');
      return stored !== 'false';
    } catch {
      return true;
    }
  });
  const [activeTab, setActiveTab] = useState<'landing' | 'webtrader' | 'cabinet' | 'kyc' | 'support' | 'admin' | 'media'>('cabinet');

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

  function handleOpenAuth(mode: 'login' | 'register') {
    setAuthInitialMode(mode);
    setAuthOpen(true);
    setMobileMenuOpen(false);
  }

  function handleLogout() {
    setIsLoggedIn(false);
    try {
      localStorage.setItem('exora_logged_in', 'false');
    } catch {}
    setActiveTab('landing');
    setMobileMenuOpen(false);
    toast.success("Tizimdan muvaffaqiyatli chiqildi");
  }

  function handleAuthSuccess() {
    setIsLoggedIn(true);
    try {
      localStorage.setItem('exora_logged_in', 'true');
    } catch {}
    setActiveTab('cabinet');
    setMobileMenuOpen(false);
  }

  return (
    <div className={`min-h-screen bg-[#0e110f] text-[#f4f7f2] font-sans antialiased selection:bg-primary selection:text-black flex flex-col ${activeTab === 'webtrader' ? 'h-screen overflow-hidden' : 'justify-between'}`}>
      <Toaster position="top-right" theme="dark" richColors />

      {/* 2. PRIMARY NAVBAR (Displayed across all sections except WebTrader which has full-screen terminal header) */}
      {activeTab !== 'webtrader' && (
        <header className="sticky top-0 z-40 bg-[#0e110f]/90 backdrop-blur-xl border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
            {/* Brand Logo */}
            <div 
              onClick={() => setActiveTab(isLoggedIn ? 'cabinet' : 'landing')}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary via-[#b9ef40] to-white flex items-center justify-center text-black font-black text-lg shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
                EX
              </div>
              <div>
                <div className="font-extrabold text-lg sm:text-xl tracking-tight text-white flex items-center gap-1.5">
                  <span>EXORA</span>
                  <span className="text-primary font-black">PRIME</span>
                </div>
                <div className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider -mt-1">
                  Forex & CFD Broker
                </div>
              </div>
            </div>

            {/* Center Navigation Links: Filtered based on Authentication Status */}
            {isLoggedIn ? (
              <nav className="hidden lg:flex items-center gap-1.5 bg-white/[0.04] p-1.5 rounded-2xl border border-white/10 text-xs font-semibold">
                <button
                  onClick={() => setActiveTab('webtrader')}
                  className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                    activeTab === 'webtrader' ? 'bg-primary text-black font-extrabold shadow-md' : 'text-gray-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <TrendingUp className="size-3.5" />
                  <span>{t.webTraderTitle}</span>
                </button>
                <button
                  onClick={() => setActiveTab('cabinet')}
                  className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                    activeTab === 'cabinet' ? 'bg-primary text-black font-extrabold shadow-md' : 'text-gray-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Wallet className="size-3.5" />
                  <span>{t.clientCabinet}</span>
                </button>

                {(currentUser.role === 'admin' || currentUser.role === 'super_admin') && (
                  <button
                    onClick={() => setActiveTab('admin')}
                    className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                      activeTab === 'admin' ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40' : 'text-rose-400/80 hover:text-rose-300'
                    }`}
                  >
                    <Lock className="size-3.5" />
                    <span>Admin Panel</span>
                  </button>
                )}
              </nav>
            ) : (
              <nav className="hidden lg:flex items-center gap-1 bg-white/[0.04] p-1.5 rounded-2xl border border-white/10 text-xs font-semibold">
                <button
                  onClick={() => setActiveTab('landing')}
                  className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
                    activeTab === 'landing' ? 'bg-white/10 text-white font-bold' : 'text-muted-foreground hover:text-white'
                  }`}
                >
                  {t.home}
                </button>
                <button
                  onClick={() => setActiveTab('webtrader')}
                  className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'webtrader' ? 'bg-primary text-black font-bold shadow-md' : 'text-muted-foreground hover:text-white'
                  }`}
                >
                  <TrendingUp className="size-3.5" />
                  <span>{t.webTraderTitle}</span>
                </button>
                <button
                  onClick={() => setActiveTab('media')}
                  className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'media' ? 'bg-white/10 text-white font-bold' : 'text-muted-foreground hover:text-white'
                  }`}
                >
                  <Radio className="size-3.5 text-primary" />
                  <span>{t.navMedia}</span>
                </button>
                <button
                  onClick={() => setActiveTab('support')}
                  className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'support' ? 'bg-white/10 text-white font-bold' : 'text-muted-foreground hover:text-white'
                  }`}
                >
                  <HelpCircle className="size-3.5 text-blue-400" />
                  <span>{t.support}</span>
                </button>
              </nav>
            )}

            {/* Right: Language Selector & Auth or User Profile */}
            <div className="hidden sm:flex items-center gap-3">
              {/* Language Dropdown */}
              <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 text-xs">
                {(['uz', 'ru', 'en'] as Language[]).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className={`px-2 py-1 rounded-lg uppercase font-bold text-[11px] transition-all cursor-pointer ${
                      lang === l ? 'bg-primary text-black' : 'text-muted-foreground hover:text-white'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>

              {/* User Profile for Registered User vs Guest Buttons */}
              {isLoggedIn ? (
                <div className="flex items-center gap-2 pl-1">
                  <div 
                    onClick={() => setActiveTab('cabinet')}
                    className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 cursor-pointer transition-all"
                  >
                    <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-primary to-[#b9ef40] text-black font-black text-xs flex items-center justify-center shadow-xs">
                      {currentUser.fullName ? currentUser.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'TR'}
                    </div>
                    <div className="hidden md:flex flex-col text-left">
                      <span className="text-xs font-bold text-white leading-none">{currentUser.fullName}</span>
                      <span className="text-[10px] text-primary font-medium tracking-tight mt-0.5">
                        {currentUser.role === 'admin' || currentUser.role === 'super_admin' ? 'Administrator' : 'Tasdiqlangan treyder'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    title="Chiqish"
                    className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-gray-400 hover:text-rose-400 border border-white/10 transition-all cursor-pointer"
                  >
                    <LogOut className="size-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenAuth('login')}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold transition-all cursor-pointer"
                  >
                    {t.login}
                  </button>
                  <button
                    onClick={() => handleOpenAuth('register')}
                    className="px-4 py-2 rounded-xl bg-primary text-black text-xs font-bold shadow-md shadow-primary/20 hover:opacity-90 transition-all cursor-pointer"
                  >
                    {t.register}
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Menu Trigger */}
            <div className="flex items-center gap-2 lg:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white"
              >
                {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
              </button>
            </div>
          </div>

          {/* Mobile Dropdown Menu */}
          {mobileMenuOpen && (
            <div className="lg:hidden border-t border-white/10 bg-[#0e110f] p-4 flex flex-col gap-3">
              <div className="flex gap-2 pb-3 border-b border-white/10">
                {(['uz', 'ru', 'en'] as Language[]).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className={`flex-1 py-1.5 rounded-lg uppercase font-bold text-xs ${
                      lang === l ? 'bg-primary text-black' : 'bg-white/5 text-muted-foreground'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>

              {isLoggedIn ? (
                <>
                  <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5 border border-white/10 mb-1">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-[#b9ef40] text-black font-black text-sm flex items-center justify-center">
                      {currentUser.fullName ? currentUser.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'TR'}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">{currentUser.fullName}</div>
                      <div className="text-xs text-primary font-medium">{currentUser.email}</div>
                    </div>
                  </div>

                  <button
                    onClick={() => { setActiveTab('webtrader'); setMobileMenuOpen(false); }}
                    className={`text-left py-2.5 px-3 rounded-xl text-sm font-bold flex items-center gap-2.5 transition-all ${
                      activeTab === 'webtrader' ? 'bg-primary text-black' : 'text-gray-300 hover:text-white bg-white/5'
                    }`}
                  >
                    <TrendingUp className="size-4" />
                    <span>{t.webTraderTitle}</span>
                  </button>
                  <button
                    onClick={() => { setActiveTab('cabinet'); setMobileMenuOpen(false); }}
                    className={`text-left py-2.5 px-3 rounded-xl text-sm font-bold flex items-center gap-2.5 transition-all ${
                      activeTab === 'cabinet' ? 'bg-primary text-black' : 'text-gray-300 hover:text-white bg-white/5'
                    }`}
                  >
                    <Wallet className="size-4" />
                    <span>{t.clientCabinet}</span>
                  </button>

                  {(currentUser.role === 'admin' || currentUser.role === 'super_admin') && (
                    <button
                      onClick={() => { setActiveTab('admin'); setMobileMenuOpen(false); }}
                      className="text-left py-2.5 px-3 rounded-xl text-sm font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 flex items-center gap-2.5"
                    >
                      <Lock className="size-4" />
                      <span>Admin Panel</span>
                    </button>
                  )}

                  <div className="pt-2 border-t border-white/10">
                    <button
                      onClick={handleLogout}
                      className="w-full py-2.5 rounded-xl bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 border border-rose-500/30 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <LogOut className="size-4" />
                      <span>Tizimdan chiqish</span>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <button
                    onClick={() => { setActiveTab('landing'); setMobileMenuOpen(false); }}
                    className="text-left py-2 text-sm font-semibold text-white"
                  >
                    {t.home}
                  </button>
                  <button
                    onClick={() => { setActiveTab('webtrader'); setMobileMenuOpen(false); }}
                    className="text-left py-2 text-sm font-bold text-primary flex items-center gap-2"
                  >
                    <TrendingUp className="size-4" />
                    <span>{t.webTraderTitle}</span>
                  </button>
                  <button
                    onClick={() => { setActiveTab('media'); setMobileMenuOpen(false); }}
                    className="text-left py-2 text-sm font-semibold text-white flex items-center gap-2"
                  >
                    <Radio className="size-4 text-primary" />
                    <span>{t.navMedia}</span>
                  </button>
                  <button
                    onClick={() => { setActiveTab('support'); setMobileMenuOpen(false); }}
                    className="text-left py-2 text-sm font-semibold text-white flex items-center gap-2"
                  >
                    <HelpCircle className="size-4 text-blue-400" />
                    <span>{t.support}</span>
                  </button>

                  <div className="flex gap-2 pt-3 border-t border-white/10">
                    <button
                      onClick={() => handleOpenAuth('login')}
                      className="flex-1 py-2.5 rounded-xl bg-white/10 text-white text-xs font-bold"
                    >
                      {t.login}
                    </button>
                    <button
                      onClick={() => handleOpenAuth('register')}
                      className="flex-1 py-2.5 rounded-xl bg-primary text-black text-xs font-bold"
                    >
                      {t.register}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </header>
      )}

      {/* 3. MAIN WORKSPACE CONTAINER */}
      {activeTab === 'cabinet' ? (
        <div className="flex-1 w-full flex flex-col">
          <ClientCabinetView
            lang={lang}
            onOpenKyc={() => setActiveTab('kyc')}
            onOpenTrade={() => setActiveTab('webtrader')}
            onOpenMedia={() => setActiveTab('media')}
            onLogout={handleLogout}
          />
        </div>
      ) : activeTab === 'webtrader' ? (
        <div className="w-full h-screen overflow-hidden flex flex-col">
          <WebTraderView
            lang={lang}
            onOpenDeposit={() => setActiveTab('cabinet')}
            onReturnToCabinet={() => setActiveTab('cabinet')}
          />
        </div>
      ) : (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 flex-1 w-full">
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
              <KycVerificationView lang={lang} />
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
              Exora Prime Financial Services Authority (FSA-SVG) tomonidan litsenziyalangan va xalqaro AML/KYC qoidalariga to'liq amal qiladi. Ro'yxatdan o'tish raqami: 26842 IBC 2024. Barcha mijoz mablag'lari Tier-1 xalqaro banklarida ajratilgan (segregated) hisoblarda saqlanadi.
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
