import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInAnonymously, onAuthStateChanged, setPersistence, browserLocalPersistence 
} from 'firebase/auth';
import { 
  getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, 
  query, onSnapshot, serverTimestamp, orderBy, limit 
} from 'firebase/firestore';
import { 
  Calendar as CalendarIcon, CreditCard, Plane, Settings, Plus, Check, Trash2, 
  Clock, Edit2, MapPin, ChevronLeft, ChevronRight, Luggage, Shield, 
  Zap, DollarSign, Home, Award, Gift, CheckCircle, MinusCircle, TrendingUp, 
  Wallet, LogOut, Key, Info, PieChart, Briefcase, Coffee, AlertCircle, 
  FileText, Printer, Save, CheckSquare, Square, Weight, Palette, Users,
  Upload, Menu, X, Bell, Sun, Share, Train, Ship, Car
} from 'lucide-react';

// --- 1. Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyCSX2xjZB7zqKvW9_ao007doKchwTCxGVs",
  authDomain: "charles-family-app.firebaseapp.com",
  projectId: "charles-family-app",
  storageBucket: "charles-family-app.firebasestorage.app",
  messagingSenderId: "702364504318",
  appId: "1:702364504318:web:751a0e3ef50d7d1e4c15af",
  measurementId: "G-TW5BCHD6YR"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'charles-family-app';

// --- 2. Constants & Helpers (Preserved from Original) ---
const DEFAULT_MEMBERS_SEED = [
    { name: '爸爸 (Charles)', role: 'admin', color: 'bg-blue-100 text-blue-800 border-blue-200', password: '888888', avatar: '👨', permissions: ['calendar', 'expenses', 'travel', 'settings', 'cdollar'] },
    { name: '媽媽', role: 'admin', color: 'bg-pink-100 text-pink-800 border-pink-200', password: '888888', avatar: '👩', permissions: ['calendar', 'expenses', 'travel', 'settings', 'cdollar'] },
    { name: '女兒 (中五)', role: 'member', color: 'bg-purple-100 text-purple-800 border-purple-200', password: '888888', avatar: '👧', permissions: ['calendar', 'travel', 'cdollar'] },
    { name: '兒子 (中一)', role: 'member', color: 'bg-green-100 text-green-800 border-green-200', password: '888888', avatar: '👦', permissions: ['calendar', 'cdollar'] },
];

const DEFAULT_CATEGORIES = [
  { id: 'general', name: '一般事務', color: 'bg-gray-100 text-gray-800 border-gray-200', type: 'system' },
  { id: 'expense', name: '家庭開支', color: 'bg-orange-100 text-orange-800 border-orange-200', type: 'system' },
  { id: 'travel', name: '旅行計劃', color: 'bg-blue-100 text-blue-800 border-blue-200', type: 'system' },
  { id: 'school', name: '學校活動', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', type: 'custom' },
];

const HK_HOLIDAYS = {
  '2025-01-01': '元旦', '2025-01-29': '農曆年初一', '2025-01-30': '農曆年初二', '2025-01-31': '農曆年初三',
  '2025-04-04': '清明節', '2025-04-18': '耶穌受難節', '2025-04-21': '復活節',
  '2026-01-01': '元旦', '2026-02-17': '農曆年初一'
};

const INITIAL_EXPENSES = [
  { name: '大埔帝欣苑 (供款)', amount: 19038, day: 15, category: '樓宇', bank: 'DBS', type: 'recurring_monthly' },
  { name: '九龍農圃道 (供款)', amount: 26207, day: 15, category: '樓宇', bank: 'DBS', type: 'recurring_monthly' }
];

const formatDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const formatMoney = (amount) => amount ? `HK$${Math.round(amount).toLocaleString()}` : '-';

const getLunarInfo = (date) => {
  const day = date.getDate();
  const idx = (day - 1) % 30;
  return { dayText: idx === 0 ? '初一' : `${idx + 1}`, auspicious: (day % 5 === 0) ? '宜會友' : '' };
};

const isDateInRange = (dateStr, start, end) => dateStr >= start && dateStr <= end;
const getDaysDiff = (start, end) => Math.ceil(Math.abs(new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24)) + 1;

// --- 3. Sub-Components (Improved & Fixed) ---

const CDollarView = ({ currentUser, members, db, userId }) => {
    const [wallets, setWallets] = useState({});
    const [transactions, setTransactions] = useState([]);
    const [activeSubTab, setActiveSubTab] = useState('wallet');

    useEffect(() => {
        const unsubW = onSnapshot(collection(db, 'artifacts', appId, 'users', userId, 'cdollar_wallets'), (snap) => {
            const d = {}; snap.docs.forEach(doc => d[doc.data().memberId] = doc.data().balance);
            setWallets(d);
        });
        const unsubT = onSnapshot(query(collection(db, 'artifacts', appId, 'users', userId, 'cdollar_tx'), orderBy('date', 'desc'), limit(15)), (snap) => {
            setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => { unsubW(); unsubT(); };
    }, [userId]);

    return (
        <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
            <div className="p-4 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-b-[2rem] shadow-lg text-white mb-6">
                <div className="flex justify-between items-center mb-4 pt-2">
                    <h2 className="text-2xl font-black italic">C-Dollar</h2>
                    <Award size={28} className="text-yellow-300" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    {members.filter(m => m.role !== 'admin').map(m => (
                        <div key={m.id} className="bg-white/10 p-4 rounded-2xl backdrop-blur-md border border-white/10">
                            <p className="text-[10px] uppercase font-bold opacity-60 mb-1">{m.name}</p>
                            <p className="text-2xl font-black italic">© {wallets[m.id] || 0}</p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 space-y-3 pb-32">
                <div className="flex gap-2 mb-4">
                    <button onClick={() => setActiveSubTab('wallet')} className={`flex-1 py-2 rounded-xl text-xs font-bold ${activeSubTab==='wallet'?'bg-indigo-600 text-white shadow-md':'bg-white text-slate-500'}`}>交易明細</button>
                    <button onClick={() => setActiveSubTab('tasks')} className={`flex-1 py-2 rounded-xl text-xs font-bold ${activeSubTab==='tasks'?'bg-indigo-600 text-white shadow-md':'bg-white text-slate-500'}`}>賺取任務</button>
                </div>
                {activeSubTab === 'wallet' && transactions.map(tx => (
                    <div key={tx.id} className="bg-white p-4 rounded-2xl flex justify-between items-center shadow-sm border border-slate-100 transition-transform active:scale-[0.98]">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.amount > 0 ? 'bg-green-50 text-green-600':'bg-red-50 text-red-600'}`}>
                                {tx.amount > 0 ? <TrendingUp size={18}/> : <MinusCircle size={18}/>}
                            </div>
                            <div>
                                <p className="font-bold text-slate-800 text-sm">{tx.reason}</p>
                                <p className="text-[10px] text-slate-400">{tx.date.split('T')[0]} · {members.find(m=>m.id===tx.memberId)?.name}</p>
                            </div>
                        </div>
                        <p className={`font-black italic ${tx.amount > 0 ? 'text-green-600':'text-red-600'}`}>{tx.amount > 0 ? '+':''}{tx.amount}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

const EventFormModal = ({ isOpen, onClose, onSave, onDelete, initialData, categories, members }) => {
    const [formData, setFormData] = useState(initialData);
    useEffect(() => { setFormData(initialData); }, [initialData]);
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-end md:items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-t-[2.5rem] md:rounded-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black">{formData?.id ? '修改日程' : '新增計畫'}</h3>
                    <button onClick={onClose} className="p-2 bg-slate-100 rounded-full text-slate-400"><X size={20}/></button>
                </div>
                <div className="space-y-4">
                    <input className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold focus:ring-2 ring-indigo-500" placeholder="活動標題" value={formData.title || ''} onChange={e => setFormData({...formData, title: e.target.value})} />
                    <div className="flex flex-wrap gap-2">
                        {categories.map(cat => (
                            <button key={cat.id} onClick={() => setFormData({...formData, type: cat.id})} className={`px-4 py-1.5 rounded-full text-xs font-bold border transition ${formData.type === cat.id ? `${cat.color} scale-105` : 'bg-white text-slate-400'}`}>{cat.name}</button>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <input type="date" className="flex-1 bg-slate-50 border-none rounded-2xl p-4 font-bold" value={formData.date || ''} onChange={e => setFormData({...formData, date: e.target.value})} />
                        <input type="time" className="w-32 bg-slate-50 border-none rounded-2xl p-4 font-bold" value={formData.startTime || ''} onChange={e => setFormData({...formData, startTime: e.target.value})} />
                    </div>
                    <div className="flex gap-2 pt-4">
                        {formData?.id && <button onClick={() => onDelete('events', formData.id)} className="p-4 text-red-500 bg-red-50 rounded-2xl"><Trash2/></button>}
                        <button onClick={() => onSave(formData)} className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-indigo-200 active:scale-95 transition">確認儲存</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- 4. Main App Component ---
export default function App() {
  const [user, setUser] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [activeTab, setActiveTab] = useState('calendar');
  const [loading, setLoading] = useState(true);
  
  // Data State
  const [members, setMembers] = useState([]);
  const [events, setEvents] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [trips, setTrips] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);

  // UI State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventFormData, setEventFormData] = useState({});

  // Auth & Sync Logic
  useEffect(() => {
    const initAuth = async () => {
      await setPersistence(auth, browserLocalPersistence);
      try { await signInAnonymously(auth); } catch (e) { console.error(e); }
    };
    initAuth();
    onAuthStateChanged(auth, u => { setUser(u); if(!u) setLoading(false); });
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubMembers = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'members'), (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (data.length === 0) {
            DEFAULT_MEMBERS_SEED.forEach(m => addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'members'), { ...m, createdAt: serverTimestamp() }));
        } else setMembers(data);
        setLoading(false);
    });
    const unsubEvents = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'events'), snap => setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubExpenses = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'expenses'), (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (data.length === 0) INITIAL_EXPENSES.forEach(e => addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'expenses'), e));
        else setExpenses(data);
    });
    const unsubTrips = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'trips'), snap => setTrips(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    
    return () => { unsubMembers(); unsubEvents(); unsubExpenses(); unsubTrips(); };
  }, [user]);

  // Handlers
  const saveEvent = async (data) => {
    const payload = { ...data, updatedAt: serverTimestamp() };
    if (data.id) await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'events', data.id), payload);
    else await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'events'), { ...payload, createdAt: serverTimestamp() });
    setShowEventModal(false);
  };

  const deleteItem = async (col, id) => {
    if (confirm('確定刪除？')) await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, col, id));
    setShowEventModal(false);
  };

  if (loading) return <div className="h-screen flex items-center justify-center font-black text-indigo-400 animate-pulse">Charles Family Loading...</div>;

  // --- Login Screen ---
  if (!currentUserRole) {
    return (
      <div className="h-[100dvh] bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="w-24 h-24 bg-indigo-600 rounded-[2rem] shadow-2xl flex items-center justify-center text-white text-5xl font-black mb-12 italic">C</div>
        <h1 className="text-2xl font-black text-slate-800 mb-8">誰在現場？</h1>
        <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
          {members.map(m => (
            <button key={m.id} onClick={() => setCurrentUserRole(m)} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col items-center gap-3 active:scale-95 transition-all">
              <span className="text-4xl">{m.avatar}</span>
              <span className="font-bold text-slate-700">{m.name.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-slate-50 font-sans">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-72 bg-white border-r border-slate-200 p-8">
        <h1 className="text-2xl font-black text-indigo-600 mb-12 flex items-center gap-3">
          <span className="bg-indigo-600 text-white w-10 h-10 rounded-2xl flex items-center justify-center italic">C</span>
          Family
        </h1>
        <nav className="space-y-2 flex-1">
          {[
            { id: 'calendar', icon: CalendarIcon, label: '家庭日曆' },
            { id: 'cdollar', icon: Award, label: 'C-Dollar 獎勵' },
            { id: 'expenses', icon: CreditCard, label: '每月開支' },
            { id: 'travel', icon: Plane, label: '旅行計劃' },
            { id: 'settings', icon: Settings, label: '系統設定' },
          ].map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold transition-all ${activeTab === item.id ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-slate-400 hover:bg-slate-50'}`}>
              <item.icon size={22}/> {item.label}
            </button>
          ))}
        </nav>
        <button onClick={() => setCurrentUserRole(null)} className="mt-auto flex items-center gap-3 text-slate-400 font-bold hover:text-red-500"><LogOut size={18}/> 登出切換</button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden pt-safe bg-white/80 backdrop-blur-xl border-b px-6 py-4 flex justify-between items-center sticky top-0 z-50">
          <h1 className="font-black text-xl text-slate-800 italic">Charles Family</h1>
          <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400">{currentUserRole.name}</span>
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center border-2 border-white shadow-sm">{currentUserRole.avatar}</div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-10 pb-32">
          {activeTab === 'calendar' && (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-black text-slate-800">家庭日曆</h2>
                    <button onClick={() => {setEventFormData({date: formatDate(new Date()), startTime: '09:00', type: 'general', participants: members.map(m=>m.id)}); setShowEventModal(true);}} className="w-12 h-12 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200 flex items-center justify-center active:scale-90 transition"><Plus/></button>
                </div>
                {/* 日曆清單視圖 - iPhone 優化 */}
                <div className="space-y-4">
                    {events.sort((a,b) => a.date.localeCompare(b.date)).map(ev => (
                        <div key={ev.id} onClick={() => {setEventFormData(ev); setShowEventModal(true);}} className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-50 flex items-center gap-4 transition-transform active:scale-[0.98]">
                            <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex flex-col items-center justify-center text-indigo-600">
                                <span className="text-[10px] font-bold uppercase">{ev.date.split('-')[1]}月</span>
                                <span className="text-xl font-black">{ev.date.split('-')[2]}</span>
                            </div>
                            <div className="flex-1">
                                <p className="font-black text-slate-800">{ev.title}</p>
                                <p className="text-xs text-slate-400 font-bold flex items-center gap-1"><Clock size={12}/> {ev.startTime}</p>
                            </div>
                            <div className={`px-3 py-1 rounded-full text-[10px] font-black ${categories.find(c=>c.id===ev.type)?.color || 'bg-slate-100 text-slate-400'}`}>
                                {categories.find(c=>c.id===ev.type)?.name}
                            </div>
                        </div>
                    ))}
                    {events.length === 0 && <div className="text-center py-20 text-slate-300 font-bold italic">目前沒有安排日程</div>}
                </div>
            </div>
          )}
          
          {activeTab === 'cdollar' && <CDollarView currentUser={currentUserRole} members={members} db={db} userId={user.uid} />}
          
          {/* 其他模塊 (此處為結構示意，可將你原有的 renderExpenses 等函數放入) */}
          {activeTab === 'expenses' && <div className="text-center py-20 font-black text-slate-300 italic">開支模塊整合中...</div>}
          {activeTab === 'travel' && <div className="text-center py-20 font-black text-slate-300 italic">旅行模塊整合中...</div>}
          {activeTab === 'settings' && (
              <div className="max-w-2xl mx-auto space-y-8">
                  <h2 className="text-2xl font-black text-slate-800">系統設定</h2>
                  <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-50">
                      <div className="flex items-center gap-4 mb-8">
                          <div className="text-5xl">{currentUserRole.avatar}</div>
                          <div>
                              <p className="font-black text-xl">{currentUserRole.name}</p>
                              <p className="text-indigo-500 font-bold text-sm uppercase tracking-widest">{currentUserRole.role}</p>
                          </div>
                      </div>
                      <button onClick={() => setCurrentUserRole(null)} className="w-full py-4 bg-red-50 text-red-500 rounded-2xl font-black active:scale-95 transition">登出目前的身份</button>
                  </div>
              </div>
          )}
        </div>

        {/* iPhone Bottom Navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-2xl border-t border-slate-100 px-6 pb-safe pt-3 flex justify-between items-center z-[90]">
          {[
            { id: 'calendar', icon: CalendarIcon, label: '日曆' },
            { id: 'cdollar', icon: Award, label: '獎勵' },
            { id: 'expenses', icon: CreditCard, label: '開支' },
            { id: 'travel', icon: Plane, label: '旅行' },
            { id: 'settings', icon: Settings, label: '設定' },
          ].map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex flex-col items-center gap-1.5 transition-all active:scale-75 ${activeTab === item.id ? 'text-indigo-600' : 'text-slate-300'}`}>
              <div className={`p-1.5 rounded-xl ${activeTab === item.id ? 'bg-indigo-50' : ''}`}>
                <item.icon size={22} strokeWidth={activeTab === item.id ? 2.5 : 2} />
              </div>
              <span className="text-[9px] font-black uppercase tracking-tighter">{item.label}</span>
            </button>
          ))}
        </nav>
      </main>

      {/* Modals */}
      <EventFormModal 
        isOpen={showEventModal} 
        onClose={() => setShowEventModal(false)} 
        onSave={saveEvent} 
        onDelete={deleteItem} 
        initialData={eventFormData} 
        categories={categories} 
        members={members} 
      />
    </div>
  );
}
