import React, { useState } from "react";
import { Language } from "../../lib/i18n";
import { 
  Newspaper, 
  Video, 
  Radio, 
  Send, 
  Youtube, 
  Instagram, 
  Twitter, 
  Share2, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Calendar, 
  Eye, 
  ExternalLink, 
  Play, 
  Pause, 
  Volume2, 
  Bookmark, 
  Search, 
  Sparkles, 
  CheckCircle2, 
  ShieldCheck, 
  Globe, 
  MessageSquare, 
  X,
  ChevronRight,
  Flame,
  Award
} from "../icons/FlaticonIcons";
import { toast } from "sonner";

interface MediaCenterViewProps {
  lang: Language;
  onOpenTrading?: () => void;
  onOpenCabinet?: () => void;
}

interface NewsArticle {
  id: string;
  title: string;
  category: 'Forex' | 'Crypto' | 'Commodities' | 'Macro' | 'Press';
  summary: string;
  content: string;
  date: string;
  readTime: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  impact: 'High' | 'Medium' | 'Low';
  author: string;
  views: number;
  tags: string[];
}

interface VideoTutorial {
  id: string;
  title: string;
  duration: string;
  level: 'Boshlang\'ich' | 'O\'rta' | 'Professional';
  speaker: string;
  views: number;
  category: string;
  description: string;
}

const NEWS_LIST: NewsArticle[] = [
  {
    id: "news-1",
    title: "Oltin (XAU/USD) yangi rekord sari: $2,750 qarshilik darajasi va AQSh inflyatsiya bosimi",
    category: "Commodities",
    summary: "Markaziy banklar tomonidan oltin xaridi va geosiyosiy xatarlar fonida oltin narxi yangi tarixiy cho'qqilarni zabt etishda davom etmoqda.",
    content: `Oltin (XAU/USD) xalqaro bozorlarda kuchli xarid bosimi ostida savdo qilinmoqda. Asosiy drayverlar:
    
1. Federal Rezerv stavkalari pasayishi kutuvlari: Bozor ishtirokchilari navbatdagi foiz stavkasi pasayishiga 85% ehtimol bermoqda. Bu AQSh dollarining zaiflashishiga va tilla kabi xavfsiz aktivlarga talab oshishiga sabab bo'lmoqda.
2. Markaziy banklar oltin zaxiralarini muttasil oshirmoqda.
3. Texnik tahlil: $2,720 darajasidan yuqorida barqarorlashuv $2,780 va hatto $2,800 maqsadli darajalariga yo'l ochadi.

Exora Prime tahlilchilari treyderlarga qat'iy Stop Loss buyurtmalaridan foydalanishni va yuqori volatillik paytida marja ko'rsatkichlarini kuzatib borishni tavsiya qiladi.`,
    date: "Bugun, 15:40",
    readTime: "3 daqiqa",
    sentiment: "bullish",
    impact: "High",
    author: "Farrux Qodirov (Bosh Tahlilchi)",
    views: 3420,
    tags: ["XAUUSD", "Gold", "Fed", "Dollar"]
  },
  {
    id: "news-2",
    title: "EUR/USD juftligi Yevropa Markaziy Banki qarori oldidan tor diapazonda tebranmoqda",
    category: "Forex",
    summary: "Yevro hududidagi iqtisodiy sekinlashuv va inflyatsiya pasayishi YMB tomonidan stavka kamaytirilishi ehtimolini oshirmoqda.",
    content: `Yevro/Dollar (EUR/USD) 1.0850 - 1.0920 oralig'ida konsolidatsiya bosqichida qolmoqda.
    
Germaniya sanoat ishlab chiqarish ko'rsatkichlari kutilganidan past chiqishi yevro valyutasiga qisqa muddatli bosim o'tkazmoqda. Shu bilan birga, AQSh Mehnat statistikasi (NFP) ma'lumotlari dollar indeksining yo'nalishini belgilab beradi.

Savdo strategiyasi: 1.0820 kuchli tayanch (Support) darajasi hisoblanadi. Ushbu darajadan qaytish xarid imkoniyatlarini taqdim etishi mumkin.`,
    date: "Bugun, 12:15",
    readTime: "4 daqiqa",
    sentiment: "neutral",
    impact: "High",
    author: "Sherzod Aliyev (Valyuta Strategi)",
    views: 2890,
    tags: ["EURUSD", "ECB", "Forex", "Euro"]
  },
  {
    id: "news-3",
    title: "Bitcoin $68,000 darajasidan yuqoriga chiqdi: Institutsional oqimlar va likvidlik tahlili",
    category: "Crypto",
    summary: "Spot Bitcoin ETF'lariga kunlik $400M+ kirib kelishi kriptovalyutalar bozorida kuchli o'sish to'lqinini paydo qildi.",
    content: `Kriptovalyuta bozori yana faollashdi. BTC/USD $68,500 darajasini sinab ko'rmoqda.
    
Exora Prime Order Book (DOM) ma'lumotlariga ko'ra, $70,000 darajasida yirik sotish buyurtmalari (Sell Wall) to'plangan. Agar ushbu likvidlik zonasidan o'tilsa, yangi barcha davrlarning rekordi (ATH) qayd etilishi mumkin.`,
    date: "Kecha, 21:00",
    readTime: "2 daqiqa",
    sentiment: "bullish",
    impact: "Medium",
    author: "Alisher Karimov (Kripto Tahlil)",
    views: 4510,
    tags: ["BTC", "Crypto", "ETF", "Bullish"]
  },
  {
    id: "news-4",
    title: "O'zbekistonda mahalliy to'lovlar yangilanishi: Payme va Click orqali 0% komissiyali lahzali depozit",
    category: "Press",
    summary: "Exora Prime o'zbekistonlik treyderlar uchun milliy to'lov tizimlarida hisob to'ldirish tezligini 3 soniyagacha qisqartirdi.",
    content: `Rasmiy xabar:
    
Exora Prime xalqaro brokeri O'zbekistondagi foydalanuvchilar qulayligi uchun to'lov shlyuzlarini to'liq yangiladi:
- Payme, Click, Uzcard va Humo kartalari orqali to'lovlar 0% vositachilik haqisiz amalga oshiriladi.
- Konvertatsiya O'zbekiston Respublikasi Markaziy Bankining rasmiy kursi asosida shaffof bajariladi.
- Mablag'lar darhol MT5 va WebTrader hisobingiz balansida aks etadi.`,
    date: "25-Sentabr",
    readTime: "2 daqiqa",
    sentiment: "bullish",
    impact: "High",
    author: "Exora Prime Matbuot Xizmati",
    views: 6120,
    tags: ["Press", "Payme", "Click", "Uzcard", "Humo"]
  }
];

const VIDEO_LIST: VideoTutorial[] = [
  {
    id: "vid-1",
    title: "1-Dars: Exora WebTrader va MT5 terminalida professional savdoni boshlash",
    duration: "18:45",
    level: "Boshlang'ich",
    speaker: "Farrux Qodirov",
    views: 12400,
    category: "Terminal Asoslari",
    description: "Grafik sozlamalari, buyurtma turlari (Market, Limit, Stop), Stop Loss va Take Profit darajalarini to'g'ri hisoblash bo'yicha to'liq amaliy qo'llanma."
  },
  {
    id: "vid-2",
    title: "Order Book (DOM) va Likvidlik: Institutsional buyurtmalarni aniqlash siri",
    duration: "26:30",
    level: "Professional",
    speaker: "Jahongir Rustamov",
    views: 8900,
    category: "DOM & Order Flow",
    description: "Chuqurlik xaritasi (Market Depth), yirik banklar va bozor yaratuvchilari (Market Makers) qayerda buyurtma joylashtirayotganini real vaqtda o'qish."
  },
  {
    id: "vid-3",
    title: "Risk & Money Management: Depozitni 100% yo'qotishdan himoya qilish qoidalari",
    duration: "15:20",
    level: "O'rta",
    speaker: "Sherzod Aliyev",
    views: 15300,
    category: "Psixologiya & Risk",
    description: "Har bir savdoga maksimal 1-2% risk qilish, Risk-to-Reward (RRR) nisbatini 1:3 qilib sozlash va hisobni ko'paytirish formulasi."
  },
  {
    id: "vid-4",
    title: "Smart Money Concepts (SMC): FVG, Order Block va Bozor sinishi (BOS)",
    duration: "34:10",
    level: "Professional",
    speaker: "Farrux Qodirov",
    views: 19800,
    category: "Strategiyalar",
    description: "Zamonaviy institutsional savdo strategiyasi: Fair Value Gap qidirish va manipulyatsiyalardan keyin bozordagi eng qulay nuqtadan kirish."
  }
];

const PODCAST_EPISODES = [
  {
    id: "pod-1",
    title: "Ertalabki Forex Brifing: XAU/USD, EUR/USD va Neft bo'yicha kunlik prognoz",
    date: "Bugun, 08:30",
    duration: "06:45",
    speaker: "Exora Bozor Tahlili Jamoasi",
    listens: 1840
  },
  {
    id: "pod-2",
    title: "AQSh inflyatsiyasi va Foiz stavkalari: Keyingi haftada nimani kutish kerak?",
    date: "Kecha, 09:00",
    duration: "09:20",
    speaker: "Farrux Qodirov",
    listens: 2430
  }
];

export function MediaCenterView({ lang, onOpenTrading, onOpenCabinet }: MediaCenterViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<'all' | 'news' | 'videos' | 'socials' | 'podcast'>('all');
  const [selectedNews, setSelectedNews] = useState<NewsArticle | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<VideoTutorial | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Barchasi");
  
  // Audio player state
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(35);

  const filteredNews = NEWS_LIST.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.summary.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === "Barchasi" || item.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const filteredVideos = VIDEO_LIST.filter(item => {
    return item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
           item.category.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="flex flex-col gap-6 sm:gap-10 pb-16 w-full">
      {/* 1. HERO HEADER */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.07] via-white/[0.02] to-transparent p-6 sm:p-10">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1.5 text-xs font-semibold text-primary mb-4">
              <Sparkles className="size-3.5" />
              <span>Exora Media & Insights Hub</span>
            </div>
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
              Rasmiy Media & Bozor Tahlillari Markazi
            </h1>
            <p className="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed">
              Moliyaviy bozorlar yangiliklari, professional video darsliklar, podkastlar va 50,000+ a'zoga ega rasmiy ijtimoiy kanallarimiz.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href="https://t.me"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#229ED9] hover:bg-[#1f8ec4] text-white text-xs sm:text-sm font-bold shadow-lg shadow-[#229ED9]/20 transition-all active:scale-95"
            >
              <Send className="size-4" />
              <span>Telegram Kanalimiz</span>
            </a>
            <a
              href="https://youtube.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-bold shadow-lg shadow-rose-600/20 transition-all active:scale-95"
            >
              <Youtube className="size-4" />
              <span>YouTube</span>
            </a>
          </div>
        </div>

        {/* Live Market Audio Podcast Player Banner */}
        <div className="mt-8 p-4 sm:p-5 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <button
              onClick={() => setIsPlayingAudio(!isPlayingAudio)}
              className="w-12 h-12 rounded-2xl bg-primary text-black flex items-center justify-center shrink-0 hover:scale-105 transition-transform shadow-md shadow-primary/30"
            >
              {isPlayingAudio ? <Pause className="size-5 fill-black" /> : <Play className="size-5 fill-black ml-0.5" />}
            </button>
            <div>
              <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-primary uppercase font-mono tracking-wider">
                <Radio className="size-3 animate-pulse" />
                <span>Kunlik Ovozli Tahlil (Audio Brief)</span>
              </div>
              <p className="text-sm font-bold text-white mt-0.5">
                XAU/USD va EUR/USD bo'yicha bugungi kutilayotgan harakatlar
              </p>
            </div>
          </div>

          {/* Audio progress bar */}
          <div className="flex items-center gap-3 w-full sm:w-72">
            <span className="text-xs text-muted-foreground font-mono">02:22</span>
            <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden relative cursor-pointer" onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const pos = (e.clientX - rect.left) / rect.width;
              setAudioProgress(Math.round(pos * 100));
            }}>
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${audioProgress}%` }} />
            </div>
            <span className="text-xs text-muted-foreground font-mono">06:45</span>
            <Volume2 className="size-4 text-muted-foreground" />
          </div>
        </div>
      </section>

      {/* 2. NAVIGATION SUBTABS & SEARCH */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Subtabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: 'all', label: 'Barchasi', icon: Sparkles },
            { id: 'news', label: 'Yangiliklar & Tahlillar', icon: Newspaper },
            { id: 'videos', label: 'Video Darsliklar', icon: Video },
            { id: 'socials', label: 'Ijtimoiy Tarmoqlar', icon: Send },
            { id: 'podcast', label: 'Audio Podkastlar', icon: Radio },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`whitespace-nowrap px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  isActive 
                    ? 'bg-primary text-black shadow-md shadow-primary/20' 
                    : 'bg-white/5 text-muted-foreground hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon className="size-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-64">
          <Search className="size-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Mavzu yoki aktivni qidiring..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-all"
          />
        </div>
      </div>

      {/* 3. MAIN CONTENT BASED ON ACTIVE SUBTAB */}

      {/* TAB: NEWS & ANALYSIS */}
      {(activeSubTab === 'all' || activeSubTab === 'news') && (
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <Newspaper className="size-5 text-primary" />
              <span>Bozor Yangiliklari va Jonli Tahlillar</span>
            </h2>
            <div className="flex items-center gap-1.5">
              {['Barchasi', 'Forex', 'Commodities', 'Crypto', 'Press'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    selectedCategory === cat
                      ? 'bg-white/20 text-white'
                      : 'text-muted-foreground hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredNews.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedNews(item)}
                className="group p-5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-primary/40 transition-all cursor-pointer flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase bg-white/10 text-primary border border-primary/20">
                        {item.category}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 ${
                        item.sentiment === 'bullish' 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : item.sentiment === 'bearish'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {item.sentiment === 'bullish' && <TrendingUp className="size-3" />}
                        {item.sentiment === 'bearish' && <TrendingDown className="size-3" />}
                        <span className="capitalize">{item.sentiment}</span>
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Clock className="size-3" />
                      <span>{item.readTime}</span>
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white group-hover:text-primary transition-colors leading-snug">
                    {item.title}
                  </h3>

                  <p className="mt-2 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {item.summary}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-white/5 text-[11px] text-muted-foreground">
                  <span>{item.author} &bull; {item.date}</span>
                  <span className="flex items-center gap-1 text-primary group-hover:translate-x-1 transition-transform font-semibold">
                    <span>O'qish</span>
                    <ChevronRight className="size-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* TAB: VIDEO TUTORIALS */}
      {(activeSubTab === 'all' || activeSubTab === 'videos') && (
        <section className="flex flex-col gap-4 mt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <Video className="size-5 text-rose-400" />
              <span>Video Akademiya & Vebinarlar</span>
            </h2>
            <span className="text-xs text-muted-foreground">4 ta amaliy dars</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredVideos.map((video) => (
              <div
                key={video.id}
                onClick={() => setSelectedVideo(video)}
                className="group rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-rose-500/40 transition-all overflow-hidden cursor-pointer flex flex-col justify-between"
              >
                {/* Thumbnail placeholder with play button */}
                <div className="relative aspect-video bg-gradient-to-br from-neutral-900 to-black flex items-center justify-center p-4 border-b border-white/10">
                  <div className="w-12 h-12 rounded-full bg-rose-600/90 text-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-rose-600/30">
                    <Play className="size-5 fill-white ml-0.5" />
                  </div>
                  <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/80 text-[10px] font-mono text-white">
                    {video.duration}
                  </span>
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/60 backdrop-blur-xs text-[10px] font-bold text-primary">
                    {video.level}
                  </span>
                </div>

                <div className="p-4 flex flex-col justify-between flex-1 gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      {video.category}
                    </span>
                    <h4 className="text-sm font-bold text-white group-hover:text-rose-400 transition-colors line-clamp-2 mt-1">
                      {video.title}
                    </h4>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-white/5">
                    <span>{video.speaker}</span>
                    <span className="flex items-center gap-1 font-mono">
                      <Eye className="size-3" />
                      <span>{video.views.toLocaleString()}</span>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* TAB: OFFICIAL SOCIAL COMMUNITIES */}
      {(activeSubTab === 'all' || activeSubTab === 'socials') && (
        <section className="flex flex-col gap-4 mt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <Send className="size-5 text-sky-400" />
              <span>Rasmiy Ijtimoiy Tarmoqlar & Hamjamiyat</span>
            </h2>
            <span className="text-xs text-muted-foreground">50,000+ faol treyderlar</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Telegram Channel */}
            <a
              href="https://t.me"
              target="_blank"
              rel="noopener noreferrer"
              className="p-5 rounded-2xl bg-gradient-to-b from-[#229ED9]/15 to-transparent border border-[#229ED9]/30 hover:border-[#229ED9] transition-all group flex flex-col justify-between gap-4"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-[#229ED9] text-white flex items-center justify-center shadow-lg shadow-[#229ED9]/20">
                  <Send className="size-5" />
                </div>
                <ExternalLink className="size-4 text-muted-foreground group-hover:text-white transition-colors" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Telegram Kanal</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Har daqiqalik bozor yangiliklari, signallar va iqtisodiy tahlillar.
                </p>
                <div className="mt-3 text-xs font-bold text-[#229ED9]">
                  48,200+ Obunachilar &rarr;
                </div>
              </div>
            </a>

            {/* YouTube */}
            <a
              href="https://youtube.com"
              target="_blank"
              rel="noopener noreferrer"
              className="p-5 rounded-2xl bg-gradient-to-b from-rose-600/15 to-transparent border border-rose-600/30 hover:border-rose-600 transition-all group flex flex-col justify-between gap-4"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-lg shadow-rose-600/20">
                  <Youtube className="size-5" />
                </div>
                <ExternalLink className="size-4 text-muted-foreground group-hover:text-white transition-colors" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">YouTube Darsliklar</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Jonli efirlar, platforma darsliklari va haftalik vebinarlar.
                </p>
                <div className="mt-3 text-xs font-bold text-rose-500">
                  24,500+ Obunachilar &rarr;
                </div>
              </div>
            </a>

            {/* Instagram */}
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="p-5 rounded-2xl bg-gradient-to-b from-pink-600/15 to-transparent border border-pink-600/30 hover:border-pink-600 transition-all group flex flex-col justify-between gap-4"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-pink-600/20">
                  <Instagram className="size-5" />
                </div>
                <ExternalLink className="size-4 text-muted-foreground group-hover:text-white transition-colors" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Instagram Sahifa</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Muvaffaqiyatli treyderlar hikoyalari, foyda natijalari va motivatsiya.
                </p>
                <div className="mt-3 text-xs font-bold text-pink-400">
                  @exoraprime.fx &rarr;
                </div>
              </div>
            </a>

            {/* Telegram Community Chat */}
            <a
              href="https://t.me"
              target="_blank"
              rel="noopener noreferrer"
              className="p-5 rounded-2xl bg-gradient-to-b from-emerald-500/15 to-transparent border border-emerald-500/30 hover:border-emerald-500 transition-all group flex flex-col justify-between gap-4"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-black flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <MessageSquare className="size-5" />
                </div>
                <ExternalLink className="size-4 text-muted-foreground group-hover:text-white transition-colors" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Treyderlar Chati</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Savdo g'oyalarini boshqa treyderlar bilan erkin muhokama qiling.
                </p>
                <div className="mt-3 text-xs font-bold text-emerald-400">
                  12,800+ Faol A'zolar &rarr;
                </div>
              </div>
            </a>
          </div>
        </section>
      )}

      {/* ARTICLE READER MODAL */}
      {selectedNews && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#141815] border border-white/10 rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 sm:p-6 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-primary/20 text-primary border border-primary/30">
                  {selectedNews.category}
                </span>
                <span className="text-xs text-muted-foreground">{selectedNews.date}</span>
              </div>
              <button
                onClick={() => setSelectedNews(null)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
                {selectedNews.title}
              </h2>

              <div className="flex items-center gap-3 text-xs text-muted-foreground pb-4 border-b border-white/10">
                <span>Muallif: <strong className="text-white">{selectedNews.author}</strong></span>
                <span>&bull;</span>
                <span>O'qish vaqti: <strong>{selectedNews.readTime}</strong></span>
                <span>&bull;</span>
                <span>Ko'rishlar: <strong>{selectedNews.views.toLocaleString()}</strong></span>
              </div>

              <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-line space-y-3 font-normal">
                {selectedNews.content}
              </div>

              <div className="flex flex-wrap gap-2 pt-4">
                {selectedNews.tags.map(tag => (
                  <span key={tag} className="px-2.5 py-1 rounded-lg bg-white/5 text-xs text-primary font-mono font-medium">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-4 sm:p-5 border-t border-white/10 bg-black/40 flex items-center justify-between">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  toast.success("Havola nusxalandi!");
                }}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-white flex items-center gap-2"
              >
                <Share2 className="size-3.5" />
                <span>Ulashish</span>
              </button>
              
              <button
                onClick={() => {
                  setSelectedNews(null);
                  onOpenTrading?.();
                }}
                className="px-6 py-2 rounded-xl bg-primary text-black text-xs font-bold shadow-md shadow-primary/20 hover:opacity-90 flex items-center gap-2"
              >
                <TrendingUp className="size-3.5" />
                <span>Savdoga o'tish</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIDEO PREVIEW MODAL */}
      {selectedVideo && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#141815] border border-white/10 rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="relative aspect-video bg-black flex items-center justify-center">
              <div className="text-center p-6 flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-rose-600 flex items-center justify-center text-white shadow-xl shadow-rose-600/40">
                  <Play className="size-8 fill-white ml-1" />
                </div>
                <div className="text-sm font-bold text-white mt-2">
                  Video darslik ijrosi faol
                </div>
                <div className="text-xs text-muted-foreground font-mono">
                  Davomiyligi: {selectedVideo.duration} &bull; Spiker: {selectedVideo.speaker}
                </div>
              </div>
              <button
                onClick={() => setSelectedVideo(null)}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center border border-white/10"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded bg-primary/20 text-primary text-[11px] font-bold">
                  {selectedVideo.level}
                </span>
                <span className="text-xs text-muted-foreground">
                  {selectedVideo.category}
                </span>
              </div>
              <h3 className="text-lg font-bold text-white">
                {selectedVideo.title}
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-gray-400 leading-relaxed">
                {selectedVideo.description}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
