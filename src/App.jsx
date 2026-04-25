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
  User, Bell, Menu, X, MapPin, Sun, Share, Clock, Edit2, Users, Train, Ship, Car, 
  ChevronLeft, ChevronRight, Info, Luggage, Briefcase, Coffee, AlertCircle, 
  FileText, Printer, Save, CheckSquare, Square, Weight, Palette, Home, Shield, 
  Zap, DollarSign, Hotel, Bus, PieChart, TrendingUp, Wallet, Lock, LogOut, Key, Upload,
  Award, MinusCircle
} from 'lucide-react';

// --- 1. Firebase Initialization ---
const firebaseConfig = {
  apiKey: "AIzaSyCSX2xjZB7zqKvW9_ao007doKchwTCxGVs",
  authDomain: "charles-family-app.firebaseapp.com",
  projectId: "charles-family-app",
  storageBucket: "charles-family-app.firebasestorage.app",
  messagingSenderId: "702364504318",
  appId: "1:702364504318:web:751a0e3ef50d7d1e4c15af"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'charles-family-app';

// --- 2. Constants & Helpers ---
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
  { id: 'competition', name: '外出比賽', color: 'bg-purple-100 text-purple-800 border-purple-200', type: 'custom' },
];

const POPULAR_DESTINATIONS = ['東京, 日本', '大阪, 日本', '台北, 台灣', '首爾, 韓國', '倫敦, 英國', '曼谷, 泰國', '新加坡'];

const HK_HOLIDAYS = {
  '2025-01-01': '元旦', '2025-01-29': '農曆年初一', '2025-01-30': '農曆年初二', '2025-01-31': '農曆年初三',
  '2025-04-04': '清明節', '2025-04-18': '耶穌受難節', '2025-04-19': '受難節翌日', '2025-04-21': '復活節',
  '2025-05-01': '勞動節', '2025-05-05': '佛誕', '2025-05-31': '端午節', '2025-07-01': '特區紀念日',
  '2025-10-01': '國慶', '2025-10-07': '中秋翌日', '2025-10-29': '重陽節', '2025-12-25': '聖誕節', '2025-12-26': '拆禮物日',
  '2026-01-01': '元旦', '2026-02-17': '農曆年初一', '2026-02-18': '農曆年初二', '2026-02-19': '農曆年初三',
};

const LUNAR_DATA = [{ day: 1, text: '初一', ausp: '宜祭祀' }, { day: 15, text: '十五', ausp: '宜祭祀' }, { day: 2, text: '初二', ausp: '宜出行' }, { day: 8, text: '初八', ausp: '忌遠行' }, { day: 16, text: '十六', ausp: '宜開市' }];

const INITIAL_EXPENSES = [
  { name: '大埔帝欣苑 (供款)', amount: 19038, day: 15, category: '樓宇', bank: 'DBS', type: 'recurring_monthly' }, { name: '大埔帝欣苑 (管理費)', amount: 2500, day: 15, category: '樓宇', bank: 'DBS', type: 'recurring_monthly' }, { name: '九龍農圃道 (供款)', amount: 26207, day: 15, category: '樓宇', bank: 'DBS', type: 'recurring_monthly' }, { name: '九龍農圃道 (管理費)', amount: 4200, day: 15, category: '樓宇', bank: 'DBS', type: 'recurring_monthly' }, { name: '大埔太湖花園7座 (供款)', amount: 13923, day: 15, category: '樓宇', bank: 'DBS', type: 'recurring_monthly' }, { name: '大埔太湖花園5座 (供款)', amount: 12668, day: 15, category: '樓宇', bank: '大新', type: 'recurring_monthly' }, { name: '科學園嘉熙 (供款)', amount: 10891, day: 15, category: '樓宇', bank: '大新', type: 'recurring_monthly' }, { name: '私人貸款', amount: 13995, day: 15, category: '貸款', bank: '大新', type: 'recurring_monthly' }, { name: 'AXA 醫療 (Jason)', amount: 2384.83, month: 2, day: 21, category: '保險', type: 'recurring_yearly' }, { name: '農圃車位租金', amount: 3600, day: 1, category: '日常', bank: 'HSBC', type: 'recurring_monthly' }
];

const formatDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const formatMoney = (amount) => amount ? `HK$${Math.round(amount).toLocaleString()}` : '-'; // 強制處理浮點數
const getLunarInfo = (date) => {
  const day = date.getDate();
  const special = LUNAR_DATA.find(d => d.day === day);
  if (special) return { dayText: special.text, auspicious: special.ausp };
  const idx = (day - 1) % 30;
  return { dayText: idx === 0 ? '初一' : `${idx + 1}`, auspicious: '' };
};
const isDateInRange = (dateStr, startDateStr, endDateStr) => dateStr >= startDateStr && dateStr <= endDateStr;
const getDaysDiff = (start, end) => Math.ceil(Math.abs(new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24)) + 1;
const calculatePackingProgress = (list) => {
    if (!list) return 0;
    let total = 0, packed = 0;
    (list.shared || []).forEach(i => { total++; if(i.packed) packed++; });
    Object.values(list.individual || {}).forEach(pItems => { pItems.forEach(i => { total++; if(i.packed) packed++; }); });
    return total === 0 ? 0 : Math.round((packed / total) * 100);
};

// --- 3. Sub-Components (CDollar + Modals) ---

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

const Tooltip = ({ hoveredEvent, categories, members }) => {
    if (!hoveredEvent) return null;
    const { event, x, y } = hoveredEvent;
    const cat = categories.find(c => c.id === event.type) || categories[0];
    const style = { top: y + 20, left: Math.min(x, window.innerWidth - 250), zIndex: 100 };
    return (
      <div className="fixed bg-white p-3 rounded-xl shadow-xl border border-gray-100 w-64 pointer-events-none" style={style}>
        <div className={`text-[10px] font-bold px-2 py-0.5 rounded w-fit mb-1 ${cat.color}`}>{cat.name}</div>
        <div className="font-bold text-gray-800 text-sm">{event.title}</div>
        <div className="text-xs text-gray-500 mt-1 flex items-center gap-1"><Clock size={12}/> {event.startTime} - {event.endTime}</div>
        {event.notes && <div className="text-xs text-gray-600 mt-2 bg-gray-50 p-2 rounded">{event.notes}</div>}
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
                        <div className="flex flex-col gap-1 w-32">
                            <input type="time" className="w-full bg-slate-50 border-none rounded-xl p-2 font-bold text-sm" value={formData.startTime || ''} onChange={e => setFormData({...formData, startTime: e.target.value})} />
                            <input type="time" className="w-full bg-slate-50 border-none rounded-xl p-2 font-bold text-sm" value={formData.endTime || ''} onChange={e => setFormData({...formData, endTime: e.target.value})} />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-400 block mb-2">參與成員</label>
                        <div className="flex flex-wrap gap-2">
                            {members.map(m => (
                                <button key={m.id} onClick={() => { const newP = (formData.participants||[]).includes(m.id) ? formData.participants.filter(p => p !== m.id) : [...(formData.participants||[]), m.id]; setFormData({...formData, participants: newP}); }} className={`px-3 py-1.5 rounded-full text-xs font-bold border transition ${(formData.participants||[]).includes(m.id) ? `${m.color}` : 'bg-slate-50 text-slate-400'}`}>{m.name.split(' ')[0]}</button>
                            ))}
                        </div>
                    </div>
                    <textarea className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm resize-none h-20" placeholder="備註..." value={formData.notes || ''} onChange={e => setFormData({...formData, notes: e.target.value})}></textarea>
                    <div className="flex gap-2 pt-4">
                        {formData?.id && <button onClick={() => onDelete('events', formData.id)} className="p-4 text-red-500 bg-red-50 rounded-2xl"><Trash2/></button>}
                        <button onClick={() => onSave(formData)} className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-indigo-200 active:scale-95 transition">確認儲存</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ExpenseFormModal = ({ isOpen, onClose, onSave, onDelete, initialData }) => {
    const [formData, setFormData] = useState(initialData);
    useEffect(() => { setFormData(initialData); }, [initialData]);
    if (!isOpen) return null;
    return (
      <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-end md:items-center justify-center p-4 backdrop-blur-sm">
        <div className="bg-white rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl w-full max-w-md p-8 animate-in slide-in-from-bottom">
          <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-black">{formData?.id ? '修改開支' : '新增開支'}</h3><button onClick={onClose} className="p-2 bg-slate-100 rounded-full text-slate-400"><X size={20}/></button></div>
          <div className="space-y-4">
            <input className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="項目名稱 (如：大埔管理費)"/>
            <div className="flex gap-2">
                <button onClick={() => setFormData({...formData, type: 'recurring_monthly'})} className={`flex-1 py-2 text-xs rounded-xl font-bold ${formData.type === 'recurring_monthly' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-50 text-slate-500'}`}>每月</button>
                <button onClick={() => setFormData({...formData, type: 'recurring_yearly'})} className={`flex-1 py-2 text-xs rounded-xl font-bold ${formData.type === 'recurring_yearly' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-50 text-slate-500'}`}>每年</button>
            </div>
            <div className="flex gap-2">
                <input type="number" className="flex-1 bg-slate-50 border-none rounded-2xl p-4 font-bold" placeholder="金額 HK$" value={formData.amount || ''} onChange={e => setFormData({...formData, amount: Number(e.target.value)})} />
                {formData.type === 'recurring_yearly' && <input type="number" min="1" max="12" placeholder="月份" className="w-20 bg-slate-50 border-none rounded-2xl p-4 font-bold" value={formData.month || ''} onChange={e => setFormData({...formData, month: Number(e.target.value)})} />}
                <input type="number" min="1" max="31" placeholder="日" className="w-20 bg-slate-50 border-none rounded-2xl p-4 font-bold" value={formData.day || ''} onChange={e => setFormData({...formData, day: Number(e.target.value)})} />
            </div>
            <div className="flex gap-2">
                <select className="flex-1 bg-slate-50 border-none rounded-2xl p-4 font-bold text-sm" value={formData.category || '日常'} onChange={e => setFormData({...formData, category: e.target.value})}>{['樓宇','信用卡','保險','日常','貸款','其他'].map(c => <option key={c}>{c}</option>)}</select>
                <input className="flex-1 bg-slate-50 border-none rounded-2xl p-4 font-bold text-sm" placeholder="銀行/機構" value={formData.bank || ''} onChange={e => setFormData({...formData, bank: e.target.value})}/>
            </div>
            <div className="flex gap-2 pt-4">
                {formData?.id && <button onClick={() => onDelete('expenses', formData.id)} className="p-4 text-red-500 bg-red-50 rounded-2xl"><Trash2/></button>}
                <button onClick={() => onSave(formData)} className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-lg">確認儲存</button>
            </div>
          </div>
        </div>
      </div>
    );
};

const TripWizard = ({ isOpen, onClose, onFinish, members }) => {
    if (!isOpen) return null;
    const [data, setData] = useState({ arrivalType: 'Flight', arrivalDetail: '直飛', localTransport: '公共交通', destination: '', startDate: formatDate(new Date()), endDate: formatDate(new Date(Date.now() + 5*86400000)), participants: members.map(m=>m.id), hotelStar: 4, hotelType: 'City Hotel' });
    return (
      <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-end md:items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl p-8 w-full max-w-lg animate-in slide-in-from-bottom">
            <div className="flex justify-between items-center mb-6"><h3 className="font-black text-xl">新增旅行計畫</h3><button onClick={onClose} className="p-2 bg-slate-100 rounded-full text-slate-400"><X size={20}/></button></div>
            <div className="space-y-4">
                <input className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold" value={data.destination} onChange={e => setData({...data, destination: e.target.value})} placeholder="目的地 (例如: 東京)"/>
                <div className="flex flex-wrap gap-2">{POPULAR_DESTINATIONS.map(city => (<button key={city} onClick={() => setData({...data, destination: city.split(',')[0]})} className="text-[10px] font-bold bg-slate-100 px-3 py-1.5 rounded-full text-slate-600 active:scale-95">{city.split(',')[0]}</button>))}</div>
                <div className="flex gap-2">
                    <input type="date" className="flex-1 bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold" value={data.startDate} onChange={e => setData({...data, startDate: e.target.value})}/>
                    <input type="date" className="flex-1 bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold" value={data.endDate} onChange={e => setData({...data, endDate: e.target.value})}/>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <select className="bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold" value={data.arrivalType} onChange={e => setData({...data, arrivalType: e.target.value})}><option value="Flight">飛機</option><option value="Train">高鐵</option></select>
                    <select className="bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold" value={data.localTransport} onChange={e => setData({...data, localTransport: e.target.value})}><option>公共交通</option><option>自駕</option><option>包車</option></select>
                </div>
                <button onClick={() => onFinish(data)} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-lg mt-4 active:scale-95">建立行程與清單</button>
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
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [events, setEvents] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [trips, setTrips] = useState([]);
  
  // UI States
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState('month'); 
  const [hoveredEvent, setHoveredEvent] = useState(null); 

  // Modal States
  const [showEventModal, setShowEventModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showTripWizard, setShowTripWizard] = useState(false);
  
  const [editingItem, setEditingItem] = useState(null);
  const [eventFormData, setEventFormData] = useState({});
  const [expenseFormData, setExpenseFormData] = useState({});

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
        if (data.length === 0) DEFAULT_MEMBERS_SEED.forEach(m => addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'members'), { ...m, createdAt: serverTimestamp() }));
        else setMembers(data);
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
  
  const saveExpense = async (data) => {
    if (data.id) await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'expenses', data.id), data);
    else await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'expenses'), { ...data, createdAt: serverTimestamp() });
    setShowExpenseModal(false);
  };

  const deleteItem = async (col, id) => {
    if (confirm('確定刪除？')) {
        await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, col, id));
        if (col === 'events') setShowEventModal(false);
        if (col === 'expenses') setShowExpenseModal(false);
    }
  };

  const finishTripWizard = (data) => {
      const createItem = (name) => ({ name, packed: false });
      const shared = [createItem('Wifi 蛋/SIM卡'), createItem('急救包'), createItem('充電器')];
      const individual = {};
      data.participants.forEach(pid => { individual[pid] = [createItem('護照'), createItem('手機'), createItem('衣物')]; });
      addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'trips'), { ...data, packingList: { shared, individual }, createdAt: serverTimestamp() });
      addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'events'), { title: `✈️ ${data.destination}`, date: data.startDate, startTime: '00:00', endTime: '23:59', type: 'travel', participants: data.participants, notes: `至 ${data.endDate}` });
      setShowTripWizard(false);
  };

  const handleToggleExpensePaid = async (expenseId) => {
    const currentMonthKey = `paid_${new Date().getFullYear()}_${new Date().getMonth()}`;
    const expense = expenses.find(e => e.id === expenseId);
    const paidMonths = expense.paidMonths || [];
    const newPaidMonths = paidMonths.includes(currentMonthKey) ? paidMonths.filter(m => m !== currentMonthKey) : [...paidMonths, currentMonthKey];
    await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'expenses', expenseId), { paidMonths: newPaidMonths });
  };

  // --- Render Functions (Preserved & Styled) ---
  const renderCalendarHeader = () => (
    <div className="flex items-center justify-between p-4 border-b bg-white rounded-t-3xl md:rounded-none">
      <div className="flex items-center gap-4"><h2 className="text-xl font-black">{currentDate.getFullYear()}年 {calendarView !== 'year' && `${currentDate.getMonth()+1}月`}</h2><div className="hidden md:flex bg-slate-100 rounded-lg p-1">{['day','month','year'].map(v => <button key={v} onClick={() => setCalendarView(v)} className={`px-3 py-1 text-xs rounded-md capitalize font-bold ${calendarView===v?'bg-white shadow text-indigo-600':'text-slate-500'}`}>{v === 'day' ? '日' : v === 'month' ? '月' : '年'}</button>)}</div></div>
      <div className="flex gap-2"><button onClick={() => { const d = new Date(currentDate); calendarView==='year'?d.setFullYear(d.getFullYear()-1):calendarView==='month'?d.setMonth(d.getMonth()-1):d.setDate(d.getDate()-1); setCurrentDate(d); }} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-600"><ChevronLeft size={20}/></button><button onClick={() => setCurrentDate(new Date())} className="text-sm font-bold px-4 bg-slate-50 rounded-full text-slate-600 hover:bg-slate-100">今天</button><button onClick={() => { const d = new Date(currentDate); calendarView==='year'?d.setFullYear(d.getFullYear()+1):calendarView==='month'?d.setMonth(d.getMonth()+1):d.setDate(d.getDate()+1); setCurrentDate(d); }} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-600"><ChevronRight size={20}/></button></div>
    </div>
  );

  const renderCalendar = () => {
    const year = currentDate.getFullYear(); const month = currentDate.getMonth(); const dStr = formatDate(currentDate);
    const daysInMonth = new Date(year, month + 1, 0).getDate(); const firstDay = new Date(year, month, 1).getDay();
    const days = [];
    
    // Day View Optimization for Mobile
    if (calendarView === 'day' || window.innerWidth < 768) {
      const dayEvents = events.filter(e => e.date === dStr).sort((a,b) => (a.startTime||'').localeCompare(b.startTime||''));
      return (
        <div className="flex flex-col h-full bg-white md:rounded-3xl shadow-sm overflow-hidden pb-10">
           {renderCalendarHeader()}
           <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/50">
             <div className="mb-6 flex items-baseline gap-3">
                <span className="text-3xl font-black text-slate-800">{month+1}月{currentDate.getDate()}日</span>
                <span className="text-sm font-bold text-slate-400">{getLunarInfo(currentDate).dayText}</span>
                {HK_HOLIDAYS[dStr] && <span className="ml-auto text-xs bg-red-100 text-red-600 px-3 py-1 rounded-full font-black tracking-widest">{HK_HOLIDAYS[dStr]}</span>}
             </div>
             {dayEvents.length === 0 ? (
                 <div className="text-center text-slate-300 py-20 flex flex-col items-center">
                     <div className="w-20 h-20 bg-slate-100 rounded-[2rem] flex items-center justify-center mb-4"><CalendarIcon size={32} className="text-slate-300"/></div>
                     <p className="font-bold italic">今天沒有安排事項</p>
                 </div>
             ) : (
                 <div className="space-y-4">
                     {dayEvents.map(ev => {
                         const cat = categories.find(c => c.id === ev.type) || categories[0];
                         const isPast = new Date(`${ev.date}T${ev.endTime||'23:59'}`) < new Date();
                         return (
                           <div key={ev.id} onClick={() => { setEventFormData(ev); setShowEventModal(true); }} className={`flex gap-4 p-5 rounded-[2rem] border transition-transform active:scale-[0.98] cursor-pointer ${isPast ? 'opacity-50 bg-slate-50 border-slate-100' : 'bg-white shadow-sm border-slate-100'}`}>
                              <div className="flex flex-col items-center justify-center w-16 border-r pr-4 border-slate-100">
                                  <span className="text-sm font-black text-slate-800">{ev.startTime}</span>
                                  {ev.endTime && <><div className="h-4 w-[2px] bg-slate-100 my-1"></div><span className="text-xs font-bold text-slate-400">{ev.endTime}</span></>}
                              </div>
                              <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                      <span className={`w-3 h-3 rounded-full ${cat.color.replace('text', 'bg').split(' ')[0]}`}></span>
                                      <span className="font-black text-lg text-slate-800 truncate">{ev.title}</span>
                                  </div>
                                  {ev.notes && <div className="text-xs font-bold text-slate-400 truncate mb-3">{ev.notes}</div>}
                                  <div className="flex items-center gap-1">
                                      {ev.participants?.map(p => {
                                          const mem = members.find(m=>m.id===p);
                                          return mem ? <div key={p} className="w-6 h-6 rounded-full overflow-hidden bg-slate-100 border-2 border-white text-xs flex items-center justify-center shadow-sm" title={mem.name}>{mem.avatar}</div> : null
                                      })}
                                  </div>
                              </div>
                           </div>
                         )
                     })}
                 </div>
             )}
             <button onClick={() => {setEventFormData({date: dStr, startTime: '09:00', type: 'general', participants: members.map(m=>m.id)}); setShowEventModal(true);}} className="fixed bottom-24 right-6 w-14 h-14 bg-indigo-600 rounded-2xl text-white shadow-xl shadow-indigo-200 flex items-center justify-center active:scale-90 z-50 transition-transform"><Plus size={28} strokeWidth={3}/></button>
           </div>
        </div>
      );
    }
    // Desktop Month View
    for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} className="h-32 bg-slate-50/50 border-r border-b"></div>);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d); const dateStr = formatDate(dateObj); const isToday = formatDate(new Date()) === dateStr;
      const dayEvents = events.filter(e => e.date === dateStr); const dayExpenses = expenses.filter(e => (e.type === 'recurring_monthly' && e.day === d) || (e.type === 'recurring_yearly' && e.month === month + 1 && e.day === d));
      days.push(
        <div key={d} onClick={() => { setCurrentDate(dateObj); setCalendarView('day'); }} className={`h-32 border-r border-b p-2 relative hover:bg-indigo-50/50 transition-colors cursor-pointer ${isToday ? 'bg-indigo-50/30' : 'bg-white'}`}>
           <div className="flex justify-between items-start"><span className={`text-sm font-black w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-700'}`}>{d}</span></div>
           <div className="mt-2 flex flex-col gap-1 overflow-hidden h-[calc(100%-32px)]">
             {dayExpenses.length > 0 && (<div className="text-[10px] font-bold bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded-md flex items-center gap-1"><CreditCard size={10}/> ${dayExpenses.reduce((a,b)=>a+Number(b.amount||0),0).toLocaleString()}</div>)}
             {dayEvents.slice(0, 3).map(ev => { const cat = categories.find(c => c.id === ev.type) || categories[0]; return (<div key={ev.id} onMouseEnter={(e) => setHoveredEvent({ event: ev, x: e.clientX, y: e.clientY })} onMouseLeave={() => setHoveredEvent(null)} onClick={(e) => { e.stopPropagation(); setEventFormData(ev); setShowEventModal(true); }} className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md truncate border ${cat.color}`}>{ev.title}</div>); })}
           </div>
        </div>
      );
    }
    return (<div className="bg-white rounded-3xl shadow-sm h-full flex flex-col overflow-hidden">{renderCalendarHeader()}<div className="grid grid-cols-7 border-b bg-slate-50 text-center py-2 text-xs font-black text-slate-400"><div>日</div><div>一</div><div>二</div><div>三</div><div>四</div><div>五</div><div>六</div></div><div className="grid grid-cols-7 flex-1 overflow-y-auto">{days}</div></div>);
  };

  const renderExpenses = () => {
     const currentMonthKey = `paid_${new Date().getFullYear()}_${new Date().getMonth()}`;
     const monthlyExpenses = expenses.filter(e => e.type === 'recurring_monthly' || (e.type === 'recurring_yearly' && e.month === new Date().getMonth() + 1));
     const totalBudget = monthlyExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
     const paidAmount = monthlyExpenses.reduce((sum, e) => sum + ((e.paidMonths || []).includes(currentMonthKey) ? (e.amount || 0) : 0), 0);
     const unpaidAmount = totalBudget - paidAmount;
     
     return (
        <div className="h-full overflow-y-auto pb-10">
           <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-black text-slate-800">家庭開支</h2><button onClick={() => {setExpenseFormData({type: 'recurring_monthly', category: '日常', day: 1}); setShowExpenseModal(true);}} className="bg-indigo-600 text-white p-3 rounded-2xl shadow-lg shadow-indigo-200 active:scale-95"><Plus size={20}/></button></div>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-indigo-50 rounded-[2rem] p-6 shadow-sm"><span className="text-xs text-indigo-500 font-black uppercase mb-1 flex items-center gap-1"><PieChart size={14}/> 本月總預算</span><span className="text-3xl font-black text-indigo-900">{formatMoney(totalBudget)}</span></div>
              <div className="bg-green-50 rounded-[2rem] p-6 shadow-sm"><span className="text-xs text-green-500 font-black uppercase mb-1 flex items-center gap-1"><CheckSquare size={14}/> 已付</span><span className="text-3xl font-black text-green-700">{formatMoney(paidAmount)}</span></div>
              <div className="bg-red-50 rounded-[2rem] p-6 shadow-sm"><span className="text-xs text-red-500 font-black uppercase mb-1 flex items-center gap-1"><Wallet size={14}/> 待付</span><span className="text-3xl font-black text-red-600">{formatMoney(unpaidAmount)}</span></div>
           </div>
           <div className="bg-white rounded-[2rem] shadow-sm overflow-hidden border border-slate-100">
               {monthlyExpenses.map((item, idx) => {
                   const isPaid = (item.paidMonths || []).includes(currentMonthKey);
                   return (
                       <div key={item.id} className={`flex items-center justify-between p-5 transition-colors ${idx !== 0 ? 'border-t border-slate-50' : ''} ${isPaid ? 'bg-slate-50/50' : 'bg-white'}`}>
                           <div className="flex items-center gap-4">
                               <button onClick={() => handleToggleExpensePaid(item.id)} className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${isPaid ? 'bg-green-500 text-white shadow-md' : 'bg-slate-100 text-slate-300 hover:bg-slate-200'}`}>{isPaid && <Check size={16} strokeWidth={3}/>}</button>
                               <div onClick={() => {setExpenseFormData(item); setShowExpenseModal(true);}} className="cursor-pointer">
                                   <div className={`font-black text-lg ${isPaid ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{item.name}</div>
                                   <div className="text-xs font-bold text-slate-400 flex items-center gap-2"><span>每月 {item.day} 號</span><span className="bg-slate-100 px-2 py-0.5 rounded-full">{item.category}</span></div>
                               </div>
                           </div>
                           <div className={`font-black text-xl italic ${isPaid ? 'text-slate-300' : 'text-slate-800'}`}>{formatMoney(item.amount)}</div>
                       </div>
                   )
               })}
           </div>
        </div>
     );
  };

  const renderTravel = () => (
      <div className="h-full overflow-y-auto pb-10">
          <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-black text-slate-800">旅行計畫</h2><button onClick={() => setShowTripWizard(true)} className="bg-indigo-600 text-white p-3 rounded-2xl shadow-lg shadow-indigo-200 active:scale-95"><Plus size={20}/></button></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {trips.map(trip => (
                  <div key={trip.id} className="bg-white rounded-[2rem] shadow-sm overflow-hidden border border-slate-100 flex flex-col">
                      <div className="p-6 bg-gradient-to-br from-indigo-50 to-white">
                          <h3 className="text-2xl font-black text-slate-800 flex items-center gap-2 mb-1"><MapPin size={24} className="text-indigo-500"/> {trip.destination}</h3>
                          <div className="text-sm font-bold text-slate-400">{trip.startDate} - {trip.endDate}</div>
                      </div>
                      <div className="p-6 flex-1 bg-white border-t border-slate-50">
                          <div className="flex justify-between items-center mb-3"><span className="font-bold text-slate-700 flex items-center gap-2"><Luggage size={18}/> 行李進度</span><span className="text-xs font-black bg-green-100 text-green-700 px-2 py-1 rounded-lg">{calculatePackingProgress(trip.packingList)}%</span></div>
                          <div className="w-full bg-slate-100 rounded-full h-3 mb-6"><div className="bg-green-500 h-3 rounded-full transition-all duration-500" style={{width: `${calculatePackingProgress(trip.packingList)}%`}}></div></div>
                          <button onClick={() => deleteItem('trips', trip.id)} className="w-full py-3 bg-slate-50 text-slate-400 rounded-xl font-black hover:bg-red-50 hover:text-red-500 transition-colors">刪除計畫</button>
                      </div>
                  </div>
              ))}
          </div>
      </div>
  );

  const renderSettings = () => (
      <div className="max-w-2xl mx-auto space-y-8 pb-10">
          <h2 className="text-2xl font-black text-slate-800">系統設定</h2>
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-50 text-center md:text-left md:flex items-center justify-between">
              <div className="flex flex-col md:flex-row items-center gap-4 mb-6 md:mb-0">
                  <div className="text-5xl w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center shadow-inner">{currentUserRole.avatar}</div>
                  <div>
                      <p className="font-black text-2xl text-slate-800">{currentUserRole.name}</p>
                      <p className="text-indigo-500 font-bold text-sm uppercase tracking-widest">{currentUserRole.role}</p>
                  </div>
              </div>
              <button onClick={() => setCurrentUserRole(null)} className="w-full md:w-auto py-3 px-6 bg-red-50 text-red-500 rounded-2xl font-black active:scale-95 transition">登出切換</button>
          </div>
          {currentUserRole.role === 'admin' && (
              <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-50">
                  <h3 className="font-black text-lg mb-6">家庭成員管理</h3>
                  <div className="space-y-3">
                      {members.map(m => (
                          <div key={m.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                              <div className="flex items-center gap-3"><div className="text-2xl">{m.avatar}</div><div className="font-bold text-slate-800">{m.name}</div></div>
                              <div className="text-xs font-bold text-slate-400 uppercase">{m.role}</div>
                          </div>
                      ))}
                  </div>
              </div>
          )}
      </div>
  );

  if (loading) return <div className="h-[100dvh] flex items-center justify-center font-black text-indigo-400 animate-pulse text-xl">Charles Family Loading...</div>;

  // --- Login Screen ---
  if (!currentUserRole) {
    return (
      <div className="h-[100dvh] bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[2rem] shadow-2xl flex items-center justify-center text-white text-5xl font-black mb-12 italic">C</div>
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
      <aside className="hidden md:flex flex-col w-72 bg-white border-r border-slate-200 p-8 z-10">
        <h1 className="text-2xl font-black text-indigo-600 mb-12 flex items-center gap-3">
          <span className="bg-indigo-600 text-white w-10 h-10 rounded-2xl flex items-center justify-center italic shadow-lg shadow-indigo-200">C</span>
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
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold transition-all ${activeTab === item.id ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}>
              <item.icon size={22}/> {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden w-full max-w-md md:max-w-none mx-auto shadow-2xl md:shadow-none bg-slate-50">
        {/* Mobile Header */}
        <header className="md:hidden pt-safe bg-white/80 backdrop-blur-xl border-b border-slate-100 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
          <h1 className="font-black text-xl text-slate-800 italic">Charles Family</h1>
          <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400">{currentUserRole.name.split(' ')[0]}</span>
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center border-2 border-white shadow-sm text-lg">{currentUserRole.avatar}</div>
          </div>
        </header>

        {/* Content Router */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-32">
          {activeTab === 'calendar' && renderCalendar()}
          {activeTab === 'cdollar' && <CDollarView currentUser={currentUserRole} members={members} db={db} userId={user.uid} />}
          {activeTab === 'expenses' && renderExpenses()}
          {activeTab === 'travel' && renderTravel()}
          {activeTab === 'settings' && renderSettings()}
        </div>

        {/* iPhone Bottom Navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-2xl border-t border-slate-100 px-6 pb-safe pt-3 flex justify-between items-center z-[90]">
          {[
            { id: 'calendar', icon: CalendarIcon, label: '日曆' },
            { id: 'cdollar', icon: Award, label: '獎勵' },
            { id: 'expenses', icon: CreditCard, label: '開支' },
            { id: 'travel', icon: Plane, label: '旅行' },
            { id: 'settings', icon: Settings, label: '設定' },
          ].map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex flex-col items-center gap-1.5 transition-all active:scale-75 ${activeTab === item.id ? 'text-indigo-600' : 'text-slate-300'}`}>
              <div className={`p-1.5 rounded-xl ${activeTab === item.id ? 'bg-indigo-50 shadow-sm' : ''}`}>
                <item.icon size={22} strokeWidth={activeTab === item.id ? 2.5 : 2} />
              </div>
              <span className="text-[9px] font-black uppercase tracking-tighter">{item.label}</span>
            </button>
          ))}
        </nav>
      </main>

      {/* Shared Modals */}
      <Tooltip hoveredEvent={hoveredEvent} categories={categories} members={members} />
      <EventFormModal isOpen={showEventModal} onClose={() => setShowEventModal(false)} onSave={saveEvent} onDelete={deleteItem} initialData={eventFormData} categories={categories} members={members} />
      <ExpenseFormModal isOpen={showExpenseModal} onClose={() => setShowExpenseModal(false)} onSave={saveExpense} onDelete={deleteItem} initialData={expenseFormData} />
      <TripWizard isOpen={showTripWizard} onClose={() => setShowTripWizard(false)} onFinish={finishTripWizard} members={members} />
    </div>
  );
}
