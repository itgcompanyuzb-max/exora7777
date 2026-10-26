import { SupportCenter } from "../support/SupportCenter";
import React, { useState } from "react";
import { translations, Language } from "../../lib/i18n";
import { brokerStore } from "../../lib/brokerStore";
import { 
  BookOpen, 
  HelpCircle, 
  Send, 
  MessageSquare, 
  PlayCircle, 
  ShieldAlert, 
  CheckCircle2,
  Clock,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";

interface EducationAndSupportViewProps {
  lang: Language;
}

export function EducationAndSupportView({ lang }: EducationAndSupportViewProps) {
  const t = translations[lang];
  const user = brokerStore.getActiveUser();
  const [section, setSection] = useState<'education' | 'support'>('education');

  // Support Ticket state
  const [tickets, setTickets] = useState([
    {
      id: 'TCK-1092',
      subject: 'Payme orqali depozit tasdiqlanishi',
      category: 'Finance',
      status: 'resolved',
      createdAt: '2024-05-18 10:20',
      lastMessage: 'Depozitingiz hisobingizga muvaffaqiyatli o\'tkazildi.',
    },
    {
      id: 'TCK-1104',
      subject: 'ECN hisobida spredlar va VPS sozlamasi',
      category: 'Trading',
      status: 'open',
      createdAt: '2024-05-19 14:15',
      lastMessage: 'Mutaxassisimiz VPS IP ma\'lumotlarini tayyorlamoqda.',
    }
  ]);

  const [newSubject, setNewSubject] = useState('');
  const [newCategory, setNewCategory] = useState('Trading');
  const [newMessage, setNewMessage] = useState('');

  // Live Chat state
  const [chatMessages, setChatMessages] = useState([
    { sender: 'agent', text: 'Assalomu alaykum! Exora Prime qo\'llab-quvvatlash xizmati. Sizga qanday yordam bera olaman?' },
  ]);
  const [inputChat, setInputChat] = useState('');

  function handleSendChat(e: React.FormEvent) {
    e.preventDefault();
    if (!inputChat.trim()) return;

    const userText = inputChat.trim();
    setChatMessages((prev) => [...prev, { sender: 'user', text: userText }]);
    setInputChat('');

    setTimeout(() => {
      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'agent',
          text: `Rahmat! So'rovingiz (${userText.slice(0, 20)}...) navbatga qo'shildi. Mutaxassisimiz 1-2 daqiqa ichida javob beradi.`,
        },
      ]);
    }, 1000);
  }

  function handleCreateTicket(e: React.FormEvent) {
    e.preventDefault();
    if (!newSubject.trim() || !newMessage.trim()) {
      toast.error("Iltimos, mavzu va xabarni to'liq yozing");
      return;
    }

    const created = {
      id: `TCK-${Math.floor(1000 + Math.random() * 9000)}`,
      subject: newSubject,
      category: newCategory,
      status: 'open',
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      lastMessage: newMessage,
    };

    setTickets([created, ...tickets]);
    setNewSubject('');
    setNewMessage('');
    toast.success(`Chipta #${created.id} yaratildi. 24/7 operatorlarimiz ko'rib chiqadi.`);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Top Toggle Switch */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white">
            {section === 'education' ? "Treyderlar uchun Ta'lim Akademiyasi" : "Mijozlarni Qo'llab-Quvvatlash Markazi (24/7)"}
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            {section === 'education'
              ? "Boshlang'ichdan professional darajagacha bo'lgan video darslar va strategiyalar"
              : "Jonli chat yoki rasmiy ticket tizimi orqali mutaxassislar bilan bog'laning"}
          </p>
        </div>

        <div className="flex p-1 rounded-2xl bg-white/5 border border-white/10">
          <button
            onClick={() => setSection('education')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
              section === 'education' ? 'bg-primary text-black' : 'text-muted-foreground hover:text-white'
            }`}
          >
            Ta'lim
          </button>
          <button
            onClick={() => setSection('support')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
              section === 'support' ? 'bg-primary text-black' : 'text-muted-foreground hover:text-white'
            }`}
          >
            Qo'llab-quvvatlash
          </button>
        </div>
      </div>

      {/* 1. EDUCATION CONTENT */}
      {section === 'education' && (
        <div className="flex flex-col gap-8">
          {/* Featured Courses Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="glass rounded-3xl p-6 border border-white/10 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center text-primary mb-4">
                  <BookOpen className="size-5" />
                </div>
                <div className="text-xs font-bold uppercase text-primary">1-Modul</div>
                <h3 className="text-lg font-bold text-white mt-1">Forex Asoslari & Terminologiya</h3>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  Pip, Lot, Leverage (kaldıraç), Spred va Marja qanday hisoblanadi? Valyuta juftliklari qoidalari.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><PlayCircle className="size-3.5 text-primary" /> 6 Dars</span>
                <span className="font-bold text-white">Boshlang'ich</span>
              </div>
            </div>

            <div className="glass rounded-3xl p-6 border border-white/10 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-400 mb-4">
                  <Sparkles className="size-5" />
                </div>
                <div className="text-xs font-bold uppercase text-blue-400">2-Modul</div>
                <h3 className="text-lg font-bold text-white mt-1">Texnik Tahlil & Grafiklar</h3>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  Qo'llab-quvvatlash va qarshilik zonalari (Support & Resistance), yapon shamlari (Candlesticks) va trend indikatorlari.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><PlayCircle className="size-3.5 text-primary" /> 8 Dars</span>
                <span className="font-bold text-white">O'rta Daraja</span>
              </div>
            </div>

            <div className="glass rounded-3xl p-6 border border-white/10 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-2xl bg-rose-500/20 flex items-center justify-center text-rose-400 mb-4">
                  <ShieldAlert className="size-5" />
                </div>
                <div className="text-xs font-bold uppercase text-rose-400">3-Modul</div>
                <h3 className="text-lg font-bold text-white mt-1">Risk Boshqaruvi & Psixologiya</h3>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  Kapitalni saqlashning 1-2% oltin qoidasi. Stop Loss o'rnatish, drawdown kamaytirish va hissiyotlarni boshqarish.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><PlayCircle className="size-3.5 text-primary" /> 5 Dars</span>
                <span className="font-bold text-white">Professional</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. SUPPORT & TICKETS CONTENT: real tickets handled by operators */}
      {section === 'support' && <SupportCenter />}
    </div>
  );
}
