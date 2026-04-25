import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, setDoc, query, onSnapshot, serverTimestamp, orderBy, limit } from 'firebase/firestore';
import { 
  Calendar as CalendarIcon, CreditCard, Plane, Settings, Plus, Check, Trash2, 
  User, Bell, Menu, X, MapPin, Sun, Share, Clock, Edit2, Users, Train, Ship, Car, 
  ChevronLeft, ChevronRight, Info, Luggage, Briefcase, Coffee, AlertCircle, 
  FileText, Printer, Save, CheckSquare, Square, Weight, Palette, Home, Shield, 
  Zap, DollarSign, Hotel, Bus, PieChart, TrendingUp, Wallet, Lock, LogOut, Key, Upload,
  Award, MinusCircle, ShoppingBag, PiggyBank, Target, BarChart2, Landmark, RefreshCw
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

let app; try { app = initializeApp(firebaseConfig); } catch (e) {}
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'charles-family-app';

// --- 2. Constants & Core Data ---
const EXCHANGE_RATE_CNY_HKD = 1.08; 

const DEFAULT_MEMBERS_SEED = [
    { name: '爸爸 (Charles)', role: 'admin', color: 'bg-blue-100 text-blue-800', password: '888888', avatar: '👨', permissions: ['home', 'calendar', 'expenses', 'travel', 'settings', 'cdollar'] },
    { name: '媽媽', role: 'admin', color: 'bg-pink-100 text-pink-800', password: '888888', avatar: '👩', permissions: ['home', 'calendar', 'expenses', 'travel', 'settings', 'cdollar'] },
    { name: '女兒 (中五)', role: 'member', color: 'bg-purple-100 text-purple-800', password: '888888', avatar: '👧', permissions: ['home', 'calendar', 'travel', 'cdollar'] },
    { name: '兒子 (中一)', role: 'member', color: 'bg-green-100 text-green-800', password: '888888', avatar: '👦', permissions: ['home', 'calendar', 'cdollar'] },
];

const DEFAULT_CATEGORIES = [
  { id: 'general', name: '一般事務', color: 'bg-gray-100 text-gray-800 border-gray-200', type: 'system' },
  { id: 'expense', name: '家庭開支', color: 'bg-orange-100 text-orange-800 border-orange-200', type: 'system' },
  { id: 'travel', name: '旅行計劃', color: 'bg-blue-100 text-blue-800 border-blue-200', type: 'system' },
  { id: 'school', name: '學校活動', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', type: 'custom' },
];

const POPULAR_DESTINATIONS = ['東京, 日本', '大阪, 日本', '台北, 台灣', '首爾, 韓國', '倫敦, 英國', '曼谷, 泰國', '新加坡'];

const HK_HOLIDAYS = { '2025-01-01': '元旦', '2025-01-29': '農曆年初一', '2025-01-30': '農曆年初二', '2025-04-04': '清明節', '2025-04-18': '耶穌受難節' };
const LUNAR_DATA = [{ day: 1, text: '初一', ausp: '宜祭祀' }, { day: 15, text: '十五', ausp: '宜祈福' }, { day: 2, text: '初二', ausp: '宜出行' }, { day: 8, text: '初八', ausp: '諸事不宜' }];
const INITIAL_EXPENSES = [{ name: '大埔帝欣苑 (供款)', amount: 19038, day: 15, category: '樓宇', bank: 'DBS', type: 'recurring_monthly' }, { name: '農圃車位租金', amount: 3600, day: 1, category: '日常', bank: 'HSBC', type: 'recurring_monthly' }];

const SEED_SHOP_ITEMS = [
    { title: '遊戲時間 1 小時', cost: 50, icon: '🎮' }, { title: '免做一次家務', cost: 100, icon: '🧹' },
    { title: '自選餐廳食大餐', cost: 300, icon: '🍔' }, { title: '購買指定玩具/書本', cost: 500, icon: '🎁' }
];

const SEED_TASKS = [
    { title: '主動洗碗', reward: 10, type: 'daily' }, { title: '測驗/默書滿分', reward: 100, type: 'achievement' },
    { title: '房間執拾整齊', reward: 20, type: 'weekly' }
];

const SEED_INVESTMENTS = [
    { title: '標普 500 指數掛鉤', rate: 8, cycle: 30, risk: '中', icon: '📈' },
    { title: '實體黃金 ETF', rate: 4, cycle: 15, risk: '低', icon: '🪙' },
    { title: '加密貨幣高息定存', rate: 15, cycle: 60, risk: '高', icon: '🚀' }
];

const formatDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const formatMoney = (amount) => amount ? `HK$${Math.round(amount).toLocaleString()}` : '-';
const convertToHKD = (cdollar) => (cdollar * EXCHANGE_RATE_CNY_HKD).toFixed(1);

const getLunarInfo = (date) => {
  const day = date.getDate(); const special = LUNAR_DATA.find(d => d.day === day);
  if (special) return { dayText: special.text, auspicious: special.ausp };
  return { dayText: (day - 1) % 30 === 0 ? '初一' : `${(day - 1) % 30 + 1}`, auspicious: (day % 5 === 0) ? '宜會友' : '' };
};
const isDateInRange = (dateStr, start, end) => dateStr >= start && dateStr <= end;
const calculatePackingProgress = (list) => {
    if (!list) return 0; let total = 0, packed = 0;
    (list.shared || []).forEach(i => { total++; if(i.packed) packed++; });
    Object.values(list.individual || {}).forEach(pItems => { pItems.forEach(i => { total++; if(i.packed) packed++; }); });
    return total === 0 ? 0 : Math.round((packed / total) * 100);
};

// --- 3. Sub-Components ---

// Dashboard (首頁)
const DashboardView = ({ currentUser, wallets, events, trips, setActiveTab }) => {
    const today = formatDate(new Date());
    const upcomingEvents = events.filter(e => e.date >= today).sort((a,b) => a.date.localeCompare(b.date)).slice(0, 3);
    const activeTrips = trips.filter(t => t.endDate >= today).sort((a,b) => a.startDate.localeCompare(b.startDate)).slice(0, 1);
    const myWallet = wallets[currentUser.id] || { balance: 0, savings: 0, invested: 0 };
    const totalAssets = myWallet.balance + myWallet.savings + (myWallet.invested || 0);
    const isAdmin = currentUser.role === 'admin';

    return (
        <div className="space-y-6 pb-10">
            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[2rem] p-6 shadow-lg text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-10 -mt-10 blur-xl"></div>
                <div className="flex items-center gap-4 mb-5">
                    <div className="text-4xl bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center backdrop-blur-sm shadow-inner">{currentUser.avatar}</div>
                    <div>
                        <h2 className="text-2xl font-black tracking-tight">早安, {currentUser.name.split(' ')[0]}</h2>
                        <p className="text-sm font-bold opacity-80">{isAdmin ? '家庭管理員，準備好今天的安排了嗎？' : '準備好完成今天的任務了嗎？'}</p>
                    </div>
                </div>
                {(currentUser.permissions || []).includes('cdollar') && (
                    <div onClick={() => setActiveTab('cdollar')} className="bg-white/10 rounded-2xl p-4 backdrop-blur-md flex flex-col gap-3 cursor-pointer hover:bg-white/20 transition">
                        <div className="flex justify-between items-end border-b border-white/20 pb-3">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">{isAdmin ? '全家金融看板' : '我的總資產 (C-Dollar)'}</p>
                                <p className="text-3xl font-black italic tracking-tighter drop-shadow-md">© {isAdmin ? '管理模式' : totalAssets}</p>
                            </div>
                            {!isAdmin && (
                                <div className="text-right">
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1 flex items-center justify-end gap-1"><RefreshCw size={10}/> 折合港幣</p>
                                    <p className="text-lg font-bold italic drop-shadow-md">HK$ {convertToHKD(totalAssets)}</p>
                                </div>
                            )}
                        </div>
                        {!isAdmin && (
                            <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold">
                                <div><p className="opacity-60 mb-0.5">可用餘額</p><p>© {myWallet.balance}</p></div>
                                <div className="border-l border-white/20"><p className="opacity-60 mb-0.5">銀行存款</p><p>© {myWallet.savings}</p></div>
                                <div className="border-l border-white/20"><p className="opacity-60 mb-0.5">投資理財</p><p>© {myWallet.invested || 0}</p></div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div>
                <div className="flex justify-between items-center mb-3 px-2">
                    <h3 className="font-black text-lg text-slate-800 flex items-center gap-2"><CalendarIcon size={18} className="text-indigo-500"/> 近期日程</h3>
                    <button onClick={() => setActiveTab('calendar')} className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full active:scale-95 transition">查看全部</button>
                </div>
                <div className="space-y-3">
                    {upcomingEvents.length > 0 ? upcomingEvents.map(ev => (
                        <div key={ev.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                            <div className="w-14 h-14 bg-indigo-50 rounded-xl flex flex-col items-center justify-center text-indigo-600 shrink-0"><span className="text-[10px] font-bold uppercase tracking-widest">{ev.date.split('-')[1]}月</span><span className="text-xl font-black">{ev.date.split('-')[2]}</span></div>
                            <div className="flex-1 min-w-0"><p className="font-black text-slate-800 text-lg truncate">{ev.title}</p><p className="text-xs font-bold text-slate-400 flex items-center gap-1"><Clock size={12}/> {ev.startTime} {ev.notes ? `· ${ev.notes}` : ''}</p></div>
                        </div>
                    )) : <div className="text-center text-slate-400 font-bold py-8 bg-white rounded-2xl border border-slate-100 italic">近期沒有安排</div>}
                </div>
            </div>

            {(currentUser.permissions || []).includes('travel') && activeTrips.length > 0 && (
                <div>
                    <h3 className="font-black text-lg text-slate-800 mb-3 px-2 flex items-center gap-2"><Plane size={18} className="text-indigo-500"/> 即將出發旅行</h3>
                    {activeTrips.map(trip => (
                        <div key={trip.id} onClick={() => setActiveTab('travel')} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 cursor-pointer hover:border-indigo-200 transition">
                            <div className="flex items-center gap-3 mb-2"><MapPin size={22} className="text-indigo-500" /><h4 className="font-black text-xl text-slate-800 truncate">{trip.destination}</h4></div>
                            <p className="text-sm font-bold text-slate-400 mb-4 ml-8">{trip.startDate} - {trip.endDate}</p>
                            <div className="flex items-center gap-3">
                                <div className="flex-1 bg-slate-100 rounded-full h-3"><div className="bg-green-500 h-3 rounded-full" style={{width:`${calculatePackingProgress(trip.packingList)}%`}}></div></div>
                                <span className="text-xs font-black text-green-600 bg-green-50 px-2 py-1 rounded-md">行李 {calculatePackingProgress(trip.packingList)}%</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// 財商核心：C-Dollar 視圖
const CDollarView = ({ currentUser, members, wallets, db, userId }) => {
    const [transactions, setTransactions] = useState([]);
    const [requests, setRequests] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [shopItems, setShopItems] = useState([]);
    const [investProducts, setInvestProducts] = useState([]);
    const [portfolio, setPortfolio] = useState([]);
    
    const [activeSubTab, setActiveSubTab] = useState('tasks');
    const [bankAmount, setBankAmount] = useState('');
    const [investAmount, setInvestAmount] = useState('');
    const isAdmin = currentUser.role === 'admin';

    useEffect(() => {
        const unsubT = onSnapshot(query(collection(db, 'artifacts', appId, 'users', userId, 'cdollar_tx'), orderBy('date', 'desc'), limit(30)), snap => setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        const unsubReq = onSnapshot(query(collection(db, 'artifacts', appId, 'users', userId, 'cdollar_requests'), orderBy('createdAt', 'desc')), snap => setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        const unsubTasks = onSnapshot(collection(db, 'artifacts', appId, 'users', userId, 'cdollar_tasks'), snap => { if (snap.empty && isAdmin) SEED_TASKS.forEach(t => addDoc(collection(db, 'artifacts', appId, 'users', userId, 'cdollar_tasks'), t)); else setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });
        const unsubShop = onSnapshot(collection(db, 'artifacts', appId, 'users', userId, 'cdollar_shop'), snap => { if (snap.empty && isAdmin) SEED_SHOP_ITEMS.forEach(s => addDoc(collection(db, 'artifacts', appId, 'users', userId, 'cdollar_shop'), s)); else setShopItems(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });
        const unsubInvest = onSnapshot(collection(db, 'artifacts', appId, 'users', userId, 'cdollar_invest_products'), snap => { if (snap.empty && isAdmin) SEED_INVESTMENTS.forEach(i => addDoc(collection(db, 'artifacts', appId, 'users', userId, 'cdollar_invest_products'), i)); else setInvestProducts(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });
        const unsubPortfolio = onSnapshot(collection(db, 'artifacts', appId, 'users', userId, 'cdollar_portfolio'), snap => setPortfolio(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        
        return () => { unsubT(); unsubReq(); unsubTasks(); unsubShop(); unsubInvest(); unsubPortfolio(); };
    }, [userId, isAdmin]);

    const handleTransaction = async (memberId, amount, reason, type = 'general') => {
        const targetWallet = wallets[memberId] || { balance: 0, savings: 0, invested: 0 };
        const newBalance = Math.max(0, targetWallet.balance + amount);
        await addDoc(collection(db, 'artifacts', appId, 'users', userId, 'cdollar_tx'), { memberId, amount, reason, type, date: new Date().toISOString(), createdBy: currentUser.name });
        await setDoc(doc(db, 'artifacts', appId, 'users', userId, 'cdollar_wallets', memberId), { balance: newBalance, savings: targetWallet.savings, invested: targetWallet.invested || 0, memberId }, { merge: true });
    };

    const handleBankTransfer = async (type) => {
        const amt = Number(bankAmount);
        if (isNaN(amt) || amt <= 0) return alert('請輸入有效金額');
        const myWallet = wallets[currentUser.id] || { balance: 0, savings: 0, invested: 0 };
        let newBalance = myWallet.balance; let newSavings = myWallet.savings;
        if (type === 'deposit') {
            if (amt > myWallet.balance) return alert('可用餘額不足以存款');
            newBalance -= amt; newSavings += amt;
        } else {
            if (amt > myWallet.savings) return alert('銀行存款不足以提款');
            newBalance += amt; newSavings -= amt;
        }
        await setDoc(doc(db, 'artifacts', appId, 'users', userId, 'cdollar_wallets', currentUser.id), { balance: newBalance, savings: newSavings, invested: myWallet.invested || 0, memberId: currentUser.id }, { merge: true });
        setBankAmount(''); alert(`成功${type === 'deposit' ? '存入' : '提出'} ©${amt}`);
    };

    const handleAdminDistributeInterest = async (rate) => {
        if (!confirm(`確定按 ${rate}% 派發利息給所有有存款的成員嗎？`)) return;
        for (const memberId of Object.keys(wallets)) {
            const w = wallets[memberId];
            if (w.savings > 0) {
                const interest = Math.round(w.savings * (rate / 100));
                if (interest > 0) {
                    await handleTransaction(memberId, interest, `活期存款利息 (+${rate}%)`, 'interest');
                    await setDoc(doc(db, 'artifacts', appId, 'users', userId, 'cdollar_wallets', memberId), { ...w, savings: w.savings + interest, memberId }, { merge: true });
                }
            }
        }
        alert('利息派發完成！');
    };

    const handleInvest = async (product) => {
        const amt = Number(investAmount);
        if (isNaN(amt) || amt <= 0) return alert('請輸入有效投資金額');
        const myWallet = wallets[currentUser.id] || { balance: 0, savings: 0, invested: 0 };
        if (amt > myWallet.balance) return alert('可用餘額不足以投資此產品！');
        
        await setDoc(doc(db, 'artifacts', appId, 'users', userId, 'cdollar_wallets', currentUser.id), { balance: myWallet.balance - amt, savings: myWallet.savings, invested: (myWallet.invested || 0) + amt, memberId: currentUser.id }, { merge: true });
        await addDoc(collection(db, 'artifacts', appId, 'users', userId, 'cdollar_tx'), { memberId: currentUser.id, amount: -amt, reason: `買入基金: ${product.title}`, type: 'invest', date: new Date().toISOString(), createdBy: currentUser.name });
        await addDoc(collection(db, 'artifacts', appId, 'users', userId, 'cdollar_portfolio'), { memberId: currentUser.id, productId: product.id, title: product.title, amount: amt, rate: product.rate, purchaseDate: new Date().toISOString(), status: 'active' });
        
        setInvestAmount(''); alert(`成功買入 ©${amt} 的 ${product.title}`);
    };

    const handleAdminAdd = async (col) => {
        const title = prompt(`請輸入名稱:`); if (!title) return;
        const val = prompt(`請輸入數值 (例如獎勵額/花費額/回報率):`); if (!val || isNaN(val)) return alert('數值無效');
        if (col === 'tasks') await addDoc(collection(db, 'artifacts', appId, 'users', userId, 'cdollar_tasks'), { title, reward: Number(val), type: 'custom' });
        if (col === 'shop') await addDoc(collection(db, 'artifacts', appId, 'users', userId, 'cdollar_shop'), { title, cost: Number(val), icon: '✨' });
        if (col === 'invest') await addDoc(collection(db, 'artifacts', appId, 'users', userId, 'cdollar_invest_products'), { title, rate: Number(val), cycle: 30, risk: '中', icon: '📊' });
    };
    const handleAdminDelete = async (col, id) => { if(confirm('確定刪除？')) await deleteDoc(doc(db, 'artifacts', appId, 'users', userId, `cdollar_${col}`, id)); };

    const submitRequest = async (item, type, amount) => {
        if (type === 'shop' && (wallets[currentUser.id]?.balance || 0) < amount) return alert('可用餘額不足！');
        await addDoc(collection(db, 'artifacts', appId, 'users', userId, 'cdollar_requests'), { memberId: currentUser.id, memberName: currentUser.name.split(' ')[0], type, title: item.title, amount: type === 'shop' ? -amount : amount, status: 'pending', createdAt: new Date().toISOString() });
        alert('已發送申請，請等待父母審批！');
    };
    const handleRequestApproval = async (req, isApprove) => {
        if (isApprove) await handleTransaction(req.memberId, req.amount, `${req.type === 'shop' ? '兌換' : '完成'}: ${req.title}`, req.type);
        await deleteDoc(doc(db, 'artifacts', appId, 'users', userId, 'cdollar_requests', req.id));
    };
    const handleAdminBankUpdate = async (memberId, field, amount) => {
        const targetWallet = wallets[memberId] || { balance: 0, savings: 0 };
        await setDoc(doc(db, 'artifacts', appId, 'users', userId, 'cdollar_wallets', memberId), { ...targetWallet, [field]: amount, memberId }, { merge: true });
        alert('修改成功！');
    };

    const myWallet = wallets[currentUser.id] || { balance: 0, savings: 0, invested: 0 };
    const myPortfolio = portfolio.filter(p => p.memberId === currentUser.id && p.status === 'active');
    const pendingRequests = isAdmin ? requests : requests.filter(r => r.memberId === currentUser.id);

    return (
        <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
            <div className="p-4 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-b-[2rem] shadow-lg text-white mb-4 relative overflow-hidden shrink-0">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-10 -mt-10 blur-xl"></div>
                <div className="flex justify-between items-center mb-6 pt-2">
                    <div>
                        <h2 className="text-2xl font-black italic">Family FQ Center</h2>
                        <p className="text-[10px] font-bold opacity-80 flex items-center gap-1 mt-1"><RefreshCw size={10}/> 實時掛鉤 CNY 匯率: 1 © = {EXCHANGE_RATE_CNY_HKD} HKD</p>
                    </div>
                    <Award size={28} className="text-yellow-300 drop-shadow-md" />
                </div>
                
                {isAdmin ? (
                    <div className="grid grid-cols-2 gap-3">
                        {members.filter(m => m.role !== 'admin').map(m => (
                            <div key={m.id} className="bg-white/10 p-3 rounded-xl backdrop-blur-md border border-white/10">
                                <p className="text-[10px] uppercase font-bold opacity-80 mb-1 flex items-center gap-1">{m.avatar} {m.name.split(' ')[0]}</p>
                                <p className="text-xl font-black italic">© {wallets[m.id]?.balance || 0}</p>
                                <p className="text-[10px] opacity-60 mt-1 font-bold">存款: © {wallets[m.id]?.savings || 0} | 投資: © {wallets[m.id]?.invested || 0}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md border border-white/10 flex justify-between items-center">
                        <div><p className="text-xs font-bold opacity-80 mb-1">可用餘額</p><p className="text-3xl font-black italic tracking-tighter drop-shadow-lg">© {myWallet.balance}</p></div>
                        <div className="text-right border-l border-white/20 pl-3">
                            <p className="text-[10px] font-bold opacity-80 mb-0.5">活期存款</p><p className="text-sm font-bold italic">© {myWallet.savings}</p>
                            <p className="text-[10px] font-bold opacity-80 mt-1 mb-0.5">理財組合</p><p className="text-sm font-bold italic text-yellow-300">© {myWallet.invested || 0}</p>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex px-4 gap-2 mb-2 overflow-x-auto pb-2 shrink-0 hide-scrollbar">
                {[{id:'tasks',icon:Target,label:'任務'}, {id:'shop',icon:ShoppingBag,label:'商城'}, {id:'invest',icon:BarChart2,label:'理財'}, {id:'bank',icon:Landmark,label:'銀行'}, {id:'wallet',icon:Wallet,label:'審批', alert: pendingRequests.length > 0}].map(t => (
                    <button key={t.id} onClick={() => setActiveSubTab(t.id)} className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black whitespace-nowrap transition-all relative ${activeSubTab === t.id ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-100 hover:bg-slate-50'}`}>
                        <t.icon size={14}/> {isAdmin && t.id!=='wallet'&&t.id!=='bank' ? `管理${t.label}` : t.label}
                        {t.alert && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto px-4 space-y-4 pb-32">
                {activeSubTab === 'wallet' && (
                    <div className="space-y-4">
                        {pendingRequests.length > 0 && (
                            <div className="bg-orange-50 border border-orange-100 p-4 rounded-2xl">
                                <h4 className="font-black text-orange-800 mb-3 flex items-center gap-2"><Bell size={16}/> {isAdmin ? '待家長審批' : '我的申請進度'}</h4>
                                <div className="space-y-3">
                                    {pendingRequests.map(req => (
                                        <div key={req.id} className="bg-white p-3 rounded-xl shadow-sm flex justify-between items-center border border-orange-100/50">
                                            <div>
                                                <p className="font-bold text-slate-800 text-sm">{isAdmin && <span className="text-indigo-600 mr-1">{req.memberName}</span>}{req.title}</p>
                                                <p className={`font-black text-xs italic ${req.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>{req.amount > 0 ? '+' : ''}{req.amount} ©</p>
                                            </div>
                                            {isAdmin ? (
                                                <div className="flex gap-2"><button onClick={() => handleRequestApproval(req, false)} className="px-3 py-1.5 bg-slate-100 text-slate-500 rounded-lg text-xs font-black hover:bg-red-50 hover:text-red-500">拒絕</button><button onClick={() => handleRequestApproval(req, true)} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-black shadow-md">批准</button></div>
                                            ) : <span className="text-[10px] font-black text-orange-500 bg-orange-100 px-2 py-1 rounded">審核中</span>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        <h4 className="font-black text-slate-800 pt-2">最近交易紀錄</h4>
                        {transactions.map(tx => (
                            <div key={tx.id} className="bg-white p-4 rounded-2xl flex justify-between items-center shadow-sm border border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.amount > 0 ? 'bg-green-50 text-green-600':'bg-red-50 text-red-600'}`}>{tx.amount > 0 ? <TrendingUp size={18}/> : <MinusCircle size={18}/>}</div>
                                    <div><p className="font-bold text-slate-800 text-sm">{tx.reason}</p><p className="text-[10px] text-slate-400 font-bold">{tx.date.split('T')[0]} · {members.find(m=>m.id===tx.memberId)?.name.split(' ')[0]}</p></div>
                                </div>
                                <p className={`font-black text-lg italic ${tx.amount > 0 ? 'text-green-600':'text-red-600'}`}>{tx.amount > 0 ? '+':''}{tx.amount}</p>
                            </div>
                        ))}
                    </div>
                )}

                {activeSubTab === 'tasks' && (
                    <div className="space-y-3">
                        {isAdmin && <button onClick={() => handleAdminAdd('tasks')} className="w-full bg-indigo-50 text-indigo-600 border border-indigo-100 py-3 rounded-2xl font-black flex justify-center items-center gap-2 mb-4"><Plus size={18}/> 發佈新任務</button>}
                        {tasks.map(task => (
                            <div key={task.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center relative">
                                <div><span className="text-[9px] font-black uppercase text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full mb-1.5 inline-block tracking-widest">{task.type || '日常'}</span><h4 className="font-bold text-slate-800 text-sm">{task.title}</h4><p className="text-indigo-600 font-black italic text-sm mt-0.5">獎勵: © {task.reward}</p></div>
                                {isAdmin ? <button onClick={() => handleAdminDelete('tasks', task.id)} className="p-3 bg-red-50 text-red-500 rounded-xl"><Trash2 size={16}/></button> : <button onClick={() => submitRequest(task, 'task', task.reward)} className="px-4 py-2 bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white rounded-xl text-xs font-black transition-colors shadow-sm active:scale-95">完成請賞</button>}
                            </div>
                        ))}
                    </div>
                )}

                {activeSubTab === 'shop' && (
                    <div className="space-y-4">
                        {isAdmin && <button onClick={() => handleAdminAdd('shop')} className="w-full bg-indigo-50 text-indigo-600 border border-indigo-100 py-3 rounded-2xl font-black flex justify-center items-center gap-2"><Plus size={18}/> 上架新產品</button>}
                        <div className="grid grid-cols-2 gap-3">
                            {shopItems.map(item => (
                                <div key={item.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center text-center relative">
                                    {isAdmin && <button onClick={() => handleAdminDelete('shop', item.id)} className="absolute top-2 right-2 text-slate-300 hover:text-red-500"><Trash2 size={14}/></button>}
                                    <span className="text-4xl mb-2 drop-shadow-sm">{item.icon || '🎁'}</span><h4 className="font-bold text-slate-800 text-sm mb-1">{item.title}</h4><p className="text-indigo-600 font-black italic mb-3">© {item.cost}</p>
                                    {!isAdmin && <button onClick={() => submitRequest(item, 'shop', item.cost)} className="w-full py-2.5 rounded-xl text-xs font-black transition bg-indigo-600 text-white shadow-md active:scale-95">申請兌換</button>}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeSubTab === 'invest' && (
                    <div className="space-y-4">
                        {isAdmin && <button onClick={() => handleAdminAdd('invest')} className="w-full bg-indigo-50 text-indigo-600 border border-indigo-100 py-3 rounded-2xl font-black flex justify-center items-center gap-2 mb-4"><Plus size={18}/> 發行新金融產品</button>}
                        
                        {!isAdmin && myPortfolio.length > 0 && (
                            <div className="bg-slate-800 p-5 rounded-2xl text-white shadow-lg mb-6">
                                <h4 className="font-black text-sm mb-3 flex items-center gap-2"><PieChart size={16}/> 我的投資組合</h4>
                                {myPortfolio.map(p => (
                                    <div key={p.id} className="flex justify-between items-center bg-white/10 p-3 rounded-xl mb-2">
                                        <div><p className="font-bold text-sm">{p.title}</p><p className="text-[10px] opacity-70">買入: © {p.amount}</p></div>
                                        <div className="text-right"><p className="text-green-400 font-black text-sm">預期: +{p.rate}%</p></div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <h3 className="font-black text-lg text-slate-800 px-1">發行中產品</h3>
                        {investProducts.map(prod => (
                            <div key={prod.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative">
                                {isAdmin && <button onClick={() => handleAdminDelete('invest', prod.id)} className="absolute top-4 right-4 text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>}
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="text-3xl">{prod.icon}</div>
                                    <div><h4 className="font-black text-slate-800">{prod.title}</h4><div className="flex gap-2 mt-1"><span className="text-[9px] font-black bg-green-50 text-green-600 px-2 py-0.5 rounded">回報 +{prod.rate}%</span><span className="text-[9px] font-black bg-orange-50 text-orange-600 px-2 py-0.5 rounded">風險: {prod.risk}</span></div></div>
                                </div>
                                {!isAdmin && (
                                    <div className="flex gap-2 mt-4 pt-4 border-t border-slate-50">
                                        <input type="number" placeholder="投資金額 ©" value={investAmount} onChange={e=>setInvestAmount(e.target.value)} className="w-1/2 bg-slate-50 rounded-xl px-3 py-2 text-sm font-bold border-none" />
                                        <button onClick={() => handleInvest(prod)} className="w-1/2 bg-slate-800 text-white rounded-xl text-xs font-black shadow-md active:scale-95">買入</button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {activeSubTab === 'bank' && (
                    <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm text-center">
                        <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4"><Landmark size={40} className="text-indigo-500" /></div>
                        <h3 className="text-xl font-black text-slate-800 mb-2">活期存款銀行</h3>
                        
                        {!isAdmin ? (
                            <div className="space-y-4 max-w-xs mx-auto">
                                <p className="text-xs text-slate-500 font-bold mb-6">將餘額存入銀行，養成儲蓄好習慣並賺取利息。</p>
                                <input type="number" placeholder="輸入金額 ©" value={bankAmount} onChange={e => setBankAmount(e.target.value)} className="w-full bg-slate-50 border-none rounded-2xl p-4 font-black text-center text-xl focus:ring-2 ring-indigo-500 text-indigo-900" />
                                <div className="flex gap-2">
                                    <button onClick={() => handleBankTransfer('withdraw')} className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-black active:scale-95 transition">提款出錢包</button>
                                    <button onClick={() => handleBankTransfer('deposit')} className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-indigo-200 active:scale-95 transition">存入銀行</button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6 text-left">
                                <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100">
                                    <h4 className="font-black text-indigo-800 mb-2 flex items-center gap-2"><Settings size={16}/> 央行派息面板</h4>
                                    <p className="text-xs font-bold text-indigo-500 mb-4">點擊下方按鈕，系統將自動計算並發放利息至有存款的成員帳戶中。</p>
                                    <button onClick={() => handleAdminDistributeInterest(5)} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-black shadow-md active:scale-95">全家發放 5% 活期利息</button>
                                </div>
                                <div className="space-y-3 mt-4">
                                    <p className="text-sm font-black text-slate-800">成員資產手動修改</p>
                                    {members.filter(m => m.role !== 'admin').map(m => (
                                        <div key={m.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col gap-3">
                                            <p className="font-black text-slate-800 flex items-center gap-2">{m.avatar} {m.name}</p>
                                            <div className="flex items-center gap-2"><span className="text-xs font-bold text-slate-400 w-10">餘額</span><input type="number" className="flex-1 p-2 rounded-lg border-none text-sm font-bold shadow-sm" value={wallets[m.id]?.balance || 0} onChange={e => handleAdminBankUpdate(m.id, 'balance', Number(e.target.value))} /></div>
                                            <div className="flex items-center gap-2"><span className="text-xs font-bold text-slate-400 w-10">存款</span><input type="number" className="flex-1 p-2 rounded-lg border-none text-sm font-bold shadow-sm" value={wallets[m.id]?.savings || 0} onChange={e => handleAdminBankUpdate(m.id, 'savings', Number(e.target.value))} /></div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

// Tooltip, Modals
const Tooltip = ({ hoveredEvent, categories }) => {
    if (!hoveredEvent) return null; const { event, x, y } = hoveredEvent; const cat = categories.find(c => c.id === event.type) || categories[0];
    return (<div className="fixed bg-white p-3 rounded-xl shadow-xl border border-gray-100 w-64 pointer-events-none" style={{ top: y + 20, left: Math.min(x, window.innerWidth - 250), zIndex: 100 }}><div className={`text-[10px] font-bold px-2 py-0.5 rounded w-fit mb-1 ${cat.color}`}>{cat.name}</div><div className="font-bold text-gray-800 text-sm">{event.title}</div><div className="text-xs text-gray-500 mt-1 flex items-center gap-1"><Clock size={12}/> {event.startTime} - {event.endTime}</div>{event.notes && <div className="text-xs text-gray-600 mt-2 bg-gray-50 p-2 rounded">{event.notes}</div>}</div>);
};

const EventFormModal = ({ isOpen, onClose, onSave, onDelete, initialData, categories, members }) => {
    const [formData, setFormData] = useState(initialData); useEffect(() => { setFormData(initialData); }, [initialData]); if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-end md:items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-t-[2.5rem] md:rounded-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300">
                <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-black">{formData?.id ? '修改日程' : '新增計畫'}</h3><button onClick={onClose} className="p-2 bg-slate-100 rounded-full text-slate-400"><X size={20}/></button></div>
                <div className="space-y-4">
                    <input className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold focus:ring-2 ring-indigo-500" placeholder="活動標題" value={formData.title || ''} onChange={e => setFormData({...formData, title: e.target.value})} />
                    <div className="flex flex-wrap gap-2">{categories.map(cat => (<button key={cat.id} onClick={() => setFormData({...formData, type: cat.id})} className={`px-4 py-1.5 rounded-full text-xs font-bold border transition ${formData.type === cat.id ? `${cat.color} scale-105 shadow-sm` : 'bg-white text-slate-400'}`}>{cat.name}</button>))}</div>
                    <div className="flex gap-2"><input type="date" className="flex-1 bg-slate-50 border-none rounded-2xl p-4 font-bold" value={formData.date || ''} onChange={e => setFormData({...formData, date: e.target.value})} /><div className="flex flex-col gap-1 w-32"><input type="time" className="w-full bg-slate-50 border-none rounded-xl p-2 font-bold text-sm" value={formData.startTime || ''} onChange={e => setFormData({...formData, startTime: e.target.value})} /><input type="time" className="w-full bg-slate-50 border-none rounded-xl p-2 font-bold text-sm" value={formData.endTime || ''} onChange={e => setFormData({...formData, endTime: e.target.value})} /></div></div>
                    <div><label className="text-xs font-bold text-slate-400 block mb-2">參與成員</label><div className="flex flex-wrap gap-2">{members.map(m => (<button key={m.id} onClick={() => { const newP = (formData.participants||[]).includes(m.id) ? formData.participants.filter(p => p !== m.id) : [...(formData.participants||[]), m.id]; setFormData({...formData, participants: newP}); }} className={`px-3 py-1.5 rounded-full text-xs font-bold border transition ${(formData.participants||[]).includes(m.id) ? `${m.color}` : 'bg-slate-50 text-slate-400'}`}>{m.name.split(' ')[0]}</button>))}</div></div>
                    <textarea className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm resize-none h-20" placeholder="備註..." value={formData.notes || ''} onChange={e => setFormData({...formData, notes: e.target.value})}></textarea>
                    <div className="flex gap-2 pt-4">{formData?.id && <button onClick={() => onDelete('events', formData.id)} className="p-4 text-red-500 bg-red-50 rounded-2xl"><Trash2/></button>}<button onClick={() => onSave(formData)} className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-indigo-200 active:scale-95 transition">確認儲存</button></div>
                </div>
            </div>
        </div>
    );
};

const ExpenseFormModal = ({ isOpen, onClose, onSave, onDelete, initialData }) => {
    const [formData, setFormData] = useState(initialData); useEffect(() => { setFormData(initialData); }, [initialData]); if (!isOpen) return null;
    return (
      <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-end md:items-center justify-center p-4 backdrop-blur-sm">
        <div className="bg-white rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl w-full max-w-md p-8 animate-in slide-in-from-bottom">
          <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-black">{formData?.id ? '修改開支' : '新增開支'}</h3><button onClick={onClose} className="p-2 bg-slate-100 rounded-full text-slate-400"><X size={20}/></button></div>
          <div className="space-y-4">
            <input className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="項目名稱 (如：大埔管理費)"/>
            <div className="flex gap-2"><button onClick={() => setFormData({...formData, type: 'recurring_monthly'})} className={`flex-1 py-3 text-xs rounded-xl font-bold ${formData.type === 'recurring_monthly' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-50 text-slate-500'}`}>每月</button><button onClick={() => setFormData({...formData, type: 'recurring_yearly'})} className={`flex-1 py-3 text-xs rounded-xl font-bold ${formData.type === 'recurring_yearly' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-50 text-slate-500'}`}>每年</button></div>
            <div className="flex gap-2"><input type="number" className="flex-1 bg-slate-50 border-none rounded-2xl p-4 font-bold" placeholder="金額 HK$" value={formData.amount || ''} onChange={e => setFormData({...formData, amount: Number(e.target.value)})} />{formData.type === 'recurring_yearly' && <input type="number" min="1" max="12" placeholder="月份" className="w-20 bg-slate-50 border-none rounded-2xl p-4 font-bold" value={formData.month || ''} onChange={e => setFormData({...formData, month: Number(e.target.value)})} />}<input type="number" min="1" max="31" placeholder="日" className="w-20 bg-slate-50 border-none rounded-2xl p-4 font-bold" value={formData.day || ''} onChange={e => setFormData({...formData, day: Number(e.target.value)})} /></div>
            <div className="flex gap-2"><select className="flex-1 bg-slate-50 border-none rounded-2xl p-4 font-bold text-sm" value={formData.category || '日常'} onChange={e => setFormData({...formData, category: e.target.value})}>{['樓宇','信用卡','保險','日常','貸款','其他'].map(c => <option key={c}>{c}</option>)}</select><input className="flex-1 bg-slate-50 border-none rounded-2xl p-4 font-bold text-sm" placeholder="銀行/機構" value={formData.bank || ''} onChange={e => setFormData({...formData, bank: e.target.value})}/></div>
            <div className="flex gap-2 pt-4">{formData?.id && <button onClick={() => onDelete('expenses', formData.id)} className="p-4 text-red-500 bg-red-50 rounded-2xl"><Trash2/></button>}<button onClick={() => onSave(formData)} className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-lg">確認儲存</button></div>
          </div>
        </div>
      </div>
    );
};

const TripWizard = ({ isOpen, onClose, onFinish, members }) => {
    if (!isOpen) return null;
    const [data, setData] = useState({ arrivalType: 'Flight', arrivalDetail: '直飛', localTransport: '公共交通', destination: '', startDate: formatDate(new Date()), endDate: formatDate(new Date(Date.now() + 5*86400000)), participants: members.map(m=>m.id) });
    return (
      <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-end md:items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl p-8 w-full max-w-lg animate-in slide-in-from-bottom">
            <div className="flex justify-between items-center mb-6"><h3 className="font-black text-xl">新增旅行計畫</h3><button onClick={onClose} className="p-2 bg-slate-100 rounded-full text-slate-400"><X size={20}/></button></div>
            <div className="space-y-4">
                <input className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold" value={data.destination} onChange={e => setData({...data, destination: e.target.value})} placeholder="目的地 (例如: 東京)"/>
                <div className="flex flex-wrap gap-2">{POPULAR_DESTINATIONS.map(city => (<button key={city} onClick={() => setData({...data, destination: city.split(',')[0]})} className="text-[10px] font-bold bg-slate-100 px-3 py-1.5 rounded-full text-slate-600 active:scale-95">{city.split(',')[0]}</button>))}</div>
                <div className="flex gap-2"><input type="date" className="flex-1 bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold" value={data.startDate} onChange={e => setData({...data, startDate: e.target.value})}/><input type="date" className="flex-1 bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold" value={data.endDate} onChange={e => setData({...data, endDate: e.target.value})}/></div>
                <div className="grid grid-cols-2 gap-2"><select className="bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold" value={data.arrivalType} onChange={e => setData({...data, arrivalType: e.target.value})}><option value="Flight">飛機</option><option value="Train">高鐵</option></select><select className="bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold" value={data.localTransport} onChange={e => setData({...data, localTransport: e.target.value})}><option>公共交通</option><option>自駕</option><option>包車</option></select></div>
                <button onClick={() => onFinish(data)} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-lg mt-4 active:scale-95">建立行程與清單</button>
            </div>
          </div>
      </div>
    );
};

const AddMemberModal = ({ isOpen, onClose, onAdd }) => {
    if(!isOpen) return null;
    const [name, setName] = useState(''); const [role, setRole] = useState('member'); const [avatar, setAvatar] = useState('🧑');
    const [permissions, setPermissions] = useState({ home: true, calendar: true, expenses: false, travel: false, settings: true, cdollar: true });

    return (
        <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl w-full max-w-sm">
                <h3 className="font-black text-xl mb-6">新增家庭成員</h3>
                <div className="flex gap-2 overflow-x-auto pb-4 mb-2">{['👨','👩','👧','👦','👴','👵'].map(a=><button key={a} onClick={()=>setAvatar(a)} className={`text-3xl p-2 rounded-2xl ${avatar===a?'bg-indigo-50 ring-2 ring-indigo-400':''}`}>{a}</button>)}</div>
                <input className="w-full bg-slate-50 border-none p-4 rounded-2xl mb-4 font-bold" placeholder="名稱 (例如: 爺爺)" value={name} onChange={e => setName(e.target.value)} />
                <select className="w-full bg-slate-50 border-none p-4 rounded-2xl mb-4 font-bold" value={role} onChange={e => setRole(e.target.value)}><option value="member">一般成員</option><option value="admin">管理員</option></select>
                {role !== 'admin' && (
                  <div className="mb-6 p-4 bg-slate-50 rounded-2xl">
                      <label className="block text-xs font-black mb-3 text-slate-500 uppercase">設定訪問權限</label>
                      <div className="grid grid-cols-2 gap-3">
                          {Object.keys(permissions).map(p => (
                              <label key={p} className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer"><input type="checkbox" className="w-4 h-4 rounded text-indigo-600" checked={permissions[p]} onChange={e => setPermissions({...permissions, [p]: e.target.checked})} /><span>{p==='home'?'首頁':p==='calendar'?'日曆':p==='expenses'?'開支':p==='travel'?'旅行':p==='cdollar'?'C-Dollar':'設定'}</span></label>
                          ))}
                      </div>
                  </div>
                )}
                <div className="flex gap-3"><button onClick={onClose} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black">取消</button><button onClick={() => onAdd({name, role, avatar, permissions: role === 'admin' ? ['home','calendar','expenses','travel','settings','cdollar'] : Object.keys(permissions).filter(k=>permissions[k]), color: 'bg-slate-100 text-slate-800'})} disabled={!name} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg">確認新增</button></div>
            </div>
        </div>
    );
};

const ChangePasswordModal = ({ isOpen, onClose, onConfirm }) => {
    if(!isOpen) return null;
    const [pwd, setPwd] = useState('');
    return (<div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm"><div className="bg-white p-8 rounded-[2.5rem] shadow-2xl w-full max-w-sm"><h3 className="font-black text-xl mb-6">重設密碼</h3><input className="w-full bg-slate-50 border-none p-4 rounded-2xl text-center tracking-widest font-black text-xl mb-6" placeholder="輸入新密碼" value={pwd} onChange={e => setPwd(e.target.value)} /><div className="flex gap-3"><button onClick={onClose} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black">取消</button><button onClick={() => onConfirm(pwd)} disabled={!pwd} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg">確認修改</button></div></div></div>);
};

// --- 4. Main App Component ---
export default function App() {
  const [user, setUser] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [loading, setLoading] = useState(true);
  
  const [loginTarget, setLoginTarget] = useState(null);
  const [passwordInput, setPasswordInput] = useState('');
  
  const [members, setMembers] = useState([]);
  const [categories] = useState(DEFAULT_CATEGORIES);
  const [events, setEvents] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [trips, setTrips] = useState([]);
  const [wallets, setWallets] = useState({});
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState('month'); 
  const [hoveredEvent, setHoveredEvent] = useState(null); 

  const [showEventModal, setShowEventModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showTripWizard, setShowTripWizard] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  
  const [targetMemberId, setTargetMemberId] = useState(null);
  const [eventFormData, setEventFormData] = useState({});
  const [expenseFormData, setExpenseFormData] = useState({});

  const NAV_ITEMS = [
    { id: 'home', icon: Home, label: '首頁', perm: 'home' },
    { id: 'calendar', icon: CalendarIcon, label: '日曆', perm: 'calendar' },
    { id: 'cdollar', icon: Award, label: 'C-Dollar', perm: 'cdollar' },
    { id: 'expenses', icon: CreditCard, label: '開支', perm: 'expenses' },
    { id: 'travel', icon: Plane, label: '旅行', perm: 'travel' },
    { id: 'settings', icon: Settings, label: '設定', perm: 'settings' },
  ];

  useEffect(() => {
    const initAuth = async () => { await setPersistence(auth, browserLocalPersistence); try { await signInAnonymously(auth); } catch (e) {} };
    initAuth(); onAuthStateChanged(auth, u => { setUser(u); if(!u) setLoading(false); });
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
    const unsubExpenses = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'expenses'), snap => setExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubTrips = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'trips'), snap => setTrips(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubWallets = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'cdollar_wallets'), (snap) => {
        const d = {}; snap.docs.forEach(doc => d[doc.data().memberId] = { balance: doc.data().balance, savings: doc.data().savings || 0, invested: doc.data().invested || 0 });
        setWallets(d);
    });
    return () => { unsubMembers(); unsubEvents(); unsubExpenses(); unsubTrips(); unsubWallets(); };
  }, [user]);

  const handleLoginSubmit = () => {
      if (passwordInput === loginTarget.password || passwordInput === '888888') {
          setCurrentUserRole(loginTarget); setActiveTab('home'); setLoginTarget(null); setPasswordInput('');
      } else alert('密碼錯誤！');
  };

  // !!!修復部分!!! 補回失蹤的 handleAddMember 與 handleChangePassword
  const handleAddMember = async (newMember) => {
      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'members'), {
          ...newMember, password: '888888', createdAt: serverTimestamp()
      });
      setShowAddMemberModal(false);
  };

  const handleChangePassword = async (newPassword) => {
      if (!targetMemberId || !newPassword) return;
      await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'members', targetMemberId), {
          password: newPassword
      });
      setShowChangePasswordModal(false);
  };
  // !!!修復部分結束!!!

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
    if (confirm('確定刪除？')) { await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, col, id)); setShowEventModal(false); setShowExpenseModal(false); }
  };
  const finishTripWizard = (data) => {
      const createItem = (name) => ({ name, packed: false });
      const shared = [createItem('Wifi 蛋/SIM卡'), createItem('急救包'), createItem('充電器')];
      const individual = {}; data.participants.forEach(pid => { individual[pid] = [createItem('護照'), createItem('手機'), createItem('衣物')]; });
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

  const renderCalendarHeader = () => (
    <div className="flex items-center justify-between p-4 border-b bg-white rounded-t-3xl md:rounded-none">
      <div className="flex items-center gap-4"><h2 className="text-xl font-black text-slate-800">{currentDate.getFullYear()}年 {calendarView !== 'year' && `${currentDate.getMonth()+1}月`}</h2>
        <div className="hidden md:flex bg-slate-100 rounded-lg p-1">
            {['day','month','year'].map(v => <button key={v} onClick={() => setCalendarView(v)} className={`px-4 py-1.5 text-xs rounded-md capitalize font-black transition-all ${calendarView===v?'bg-white shadow text-indigo-600':'text-slate-400'}`}>{v === 'day' ? '日' : v === 'month' ? '月' : '年'}</button>)}
        </div>
      </div>
      <div className="flex gap-2"><button onClick={() => { const d = new Date(currentDate); calendarView==='year'?d.setFullYear(d.getFullYear()-1):calendarView==='month'?d.setMonth(d.getMonth()-1):d.setDate(d.getDate()-1); setCurrentDate(d); }} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-600"><ChevronLeft size={20}/></button><button onClick={() => setCurrentDate(new Date())} className="text-sm font-bold px-4 bg-slate-50 rounded-full text-slate-600 hover:bg-slate-100">今天</button><button onClick={() => { const d = new Date(currentDate); calendarView==='year'?d.setFullYear(d.getFullYear()+1):calendarView==='month'?d.setMonth(d.getMonth()+1):d.setDate(d.getDate()+1); setCurrentDate(d); }} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-600"><ChevronRight size={20}/></button></div>
    </div>
  );

  const renderCalendar = () => {
    const year = currentDate.getFullYear(); const month = currentDate.getMonth(); const dStr = formatDate(currentDate);
    const daysInMonth = new Date(year, month + 1, 0).getDate(); const firstDay = new Date(year, month, 1).getDay();
    const days = [];

    if (calendarView === 'year') {
      const months = Array.from({length: 12}, (_, i) => i);
      return ( <div className="bg-white md:rounded-3xl shadow-sm h-full flex flex-col overflow-hidden">{renderCalendarHeader()}<div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 overflow-y-auto">{months.map(m => ( <div key={m} className="border border-slate-100 rounded-2xl p-4 hover:shadow-md cursor-pointer bg-white transition-all active:scale-95" onClick={() => { setCurrentDate(new Date(year, m, 1)); setCalendarView('month'); }}><div className="text-center font-black mb-3 text-indigo-600 bg-indigo-50 rounded-xl py-2">{m+1}月</div><div className="grid grid-cols-7 gap-1 text-[8px] text-center font-bold text-slate-400">{['日','一','二','三','四','五','六'].map(d => <div key={d} className={d==='日'||d==='六'?'text-red-400':''}>{d}</div>)}{Array.from({length: new Date(year, m, 1).getDay()}).map((_, i) => <div key={`e-${i}`}></div>)}{Array.from({length: new Date(year, m+1, 0).getDate()}).map((_, i) => { const isHol = HK_HOLIDAYS[formatDate(new Date(year, m, i+1))]; return <div key={i} className={`rounded-full aspect-square flex items-center justify-center ${isHol ? 'bg-red-100 text-red-600' : 'bg-slate-50'}`}>{i+1}</div>; })}</div></div>))}</div></div>);
    }
    
    if (calendarView === 'day' || window.innerWidth < 768) {
      const miniDays = [];
      for (let i = 0; i < firstDay; i++) miniDays.push(<div key={`empty-${i}`} className="h-12"></div>);
      for (let d = 1; d <= daysInMonth; d++) {
         const dateObj = new Date(year, month, d); const dateStrIter = formatDate(dateObj);
         const isSelected = d === currentDate.getDate(); const isToday = formatDate(new Date()) === dateStrIter;
         const hasEvent = events.some(e => e.date === dateStrIter); const lunar = getLunarInfo(dateObj);
         miniDays.push(
           <div key={d} onClick={() => setCurrentDate(dateObj)} className={`h-12 flex flex-col items-center justify-center cursor-pointer rounded-xl text-xs relative transition-colors ${isSelected ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-slate-100 text-slate-700'} ${isToday && !isSelected ? 'text-indigo-600 font-black border border-indigo-200' : ''}`}>
             <span className="text-sm font-black">{d}</span>
             <span className={`text-[8px] font-bold ${isSelected?'text-indigo-200':'text-slate-400'}`}>{lunar.dayText}</span>
             {hasEvent && !isSelected && <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full absolute bottom-1"></div>}
           </div>
         );
      }
      const dayEvents = events.filter(e => e.date === dStr).sort((a,b) => (a.startTime||'').localeCompare(b.startTime||''));
      const todayLunar = getLunarInfo(currentDate);
      
      return (
        <div className="flex flex-col h-full bg-white md:rounded-3xl shadow-sm overflow-hidden pb-10 relative">
           {renderCalendarHeader()}
           <div className="p-3 border-b border-slate-100 bg-slate-50 flex-shrink-0 z-10 shadow-inner">
             <div className="grid grid-cols-7 text-center text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest"><div>日</div><div>一</div><div>二</div><div>三</div><div>四</div><div>五</div><div>六</div></div>
             <div className="grid grid-cols-7 text-center gap-1">{miniDays}</div>
           </div>
           <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/50">
             <div className="mb-6 flex items-baseline gap-3">
                <span className="text-4xl font-black text-slate-800 tracking-tighter">{month+1}月{currentDate.getDate()}日</span>
                <span className="text-sm font-black text-slate-400">{todayLunar.dayText}</span>
                {todayLunar.auspicious && <span className="text-xs font-black bg-orange-100 text-orange-600 px-3 py-1 rounded-full">{todayLunar.auspicious}</span>}
                {HK_HOLIDAYS[dStr] && <span className="ml-auto text-xs bg-red-100 text-red-600 px-3 py-1 rounded-full font-black tracking-widest">{HK_HOLIDAYS[dStr]}</span>}
             </div>
             {dayEvents.length === 0 ? (
                 <div className="text-center text-slate-300 py-10 flex flex-col items-center">
                     <div className="w-20 h-20 bg-slate-100 rounded-[2rem] flex items-center justify-center mb-4"><CalendarIcon size={32}/></div><p className="font-bold italic">今天沒有安排事項</p>
                 </div>
             ) : (
                 <div className="space-y-4">
                     {dayEvents.map(ev => {
                         const cat = categories.find(c => c.id === ev.type) || categories[0];
                         const isPast = new Date(`${ev.date}T${ev.endTime||'23:59'}`) < new Date();
                         return (
                           <div key={ev.id} onClick={() => { setEventFormData(ev); setShowEventModal(true); }} className={`flex gap-4 p-5 rounded-[2rem] border transition-transform active:scale-[0.98] cursor-pointer ${isPast ? 'opacity-50 bg-slate-50 border-slate-100' : 'bg-white shadow-sm border-slate-100'}`}>
                              <div className="flex flex-col items-center justify-center w-16 border-r pr-4 border-slate-100"><span className="text-sm font-black text-slate-800">{ev.startTime}</span>{ev.endTime && <><div className="h-4 w-[2px] bg-slate-100 my-1"></div><span className="text-xs font-bold text-slate-400">{ev.endTime}</span></>}</div>
                              <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1"><span className={`w-3 h-3 rounded-full ${cat.color.replace('text', 'bg').split(' ')[0]}`}></span><span className="font-black text-lg text-slate-800 truncate">{ev.title}</span></div>
                                  {ev.notes && <div className="text-xs font-bold text-slate-400 truncate mb-3">{ev.notes}</div>}
                                  <div className="flex items-center gap-1">{ev.participants?.map(p => { const mem = members.find(m=>m.id===p); return mem ? <div key={p} className="w-6 h-6 rounded-full overflow-hidden bg-slate-100 border-2 border-white text-xs flex items-center justify-center shadow-sm" title={mem.name}>{mem.avatar}</div> : null })}</div>
                              </div>
                           </div>
                         )
                     })}
                 </div>
             )}
           </div>
           <button onClick={() => {setEventFormData({date: dStr, startTime: '09:00', type: 'general', participants: members.map(m=>m.id)}); setShowEventModal(true);}} className="absolute bottom-6 right-6 w-14 h-14 bg-indigo-600 rounded-2xl text-white shadow-xl shadow-indigo-200 flex items-center justify-center active:scale-90 z-50 transition-transform"><Plus size={28} strokeWidth={3}/></button>
        </div>
      );
    }

    for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} className="h-28 bg-slate-50/50 border-r border-b"></div>);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d); const dateStr = formatDate(dateObj); const isToday = formatDate(new Date()) === dateStr;
      const lunar = getLunarInfo(dateObj); const holiday = HK_HOLIDAYS[dateStr];
      const dayEvents = events.filter(e => e.date === dateStr);
      days.push(
        <div key={d} onClick={() => { setCurrentDate(dateObj); setCalendarView('day'); }} className={`h-28 border-r border-b p-1.5 relative hover:bg-indigo-50/50 transition-colors cursor-pointer ${isToday ? 'bg-indigo-50/30' : 'bg-white'}`}>
           <div className="flex justify-between items-start"><span className={`text-sm font-black w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-700'}`}>{d}</span><div className="flex flex-col items-end"><span className="text-[9px] font-bold text-slate-400">{lunar.dayText}</span>{lunar.auspicious && <span className="text-[8px] font-bold text-orange-500 scale-90 origin-right border border-orange-200 rounded px-1 bg-orange-50 mt-0.5 whitespace-nowrap">{lunar.auspicious}</span>}{holiday && <span className="text-[9px] font-black text-red-500 mt-0.5">{holiday}</span>}</div></div>
           <div className="mt-1 flex flex-col gap-1 overflow-hidden h-[calc(100%-28px)]">{dayEvents.slice(0, 3).map(ev => { const cat = categories.find(c => c.id === ev.type) || categories[0]; return (<div key={ev.id} onMouseEnter={(e) => setHoveredEvent({ event: ev, x: e.clientX, y: e.clientY })} onMouseLeave={() => setHoveredEvent(null)} onClick={(e) => { e.stopPropagation(); setEventFormData(ev); setShowEventModal(true); }} className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md truncate border ${cat.color}`}>{ev.title}</div>); })}</div>
        </div>
      );
    }
    return (<div className="bg-white md:rounded-3xl shadow-sm h-full flex flex-col overflow-hidden">{renderCalendarHeader()}<div className="grid grid-cols-7 border-b bg-slate-50 text-center py-2 text-xs font-black text-slate-400 uppercase tracking-widest"><div>日</div><div>一</div><div>二</div><div>三</div><div>四</div><div>五</div><div>六</div></div><div className="grid grid-cols-7 flex-1 overflow-y-auto">{days}</div></div>);
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
                  <div><p className="font-black text-2xl text-slate-800">{currentUserRole.name}</p><p className="text-indigo-500 font-bold text-sm uppercase tracking-widest">{currentUserRole.role}</p></div>
              </div>
          </div>
          {currentUserRole.role === 'admin' && (
              <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-50">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="font-black text-lg">家庭成員管理</h3>
                      <button onClick={() => setShowAddMemberModal(true)} className="text-xs bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-1 shadow-md active:scale-95"><Plus size={14}/> 新增成員</button>
                  </div>
                  <div className="space-y-3">
                      {members.map(m => (
                          <div key={m.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                              <div className="flex items-center gap-4">
                                  <div className="text-3xl bg-white w-12 h-12 rounded-xl flex items-center justify-center shadow-sm">{m.avatar}</div>
                                  <div>
                                      <div className="font-black text-slate-800">{m.name}</div>
                                      <div className="text-[10px] font-bold text-slate-400 uppercase flex gap-1 mt-1">
                                          {m.role === 'admin' ? <span className="text-indigo-500">管理員</span> : m.permissions?.map(p => <span key={p} className="bg-slate-200 px-1.5 py-0.5 rounded">{p}</span>)}
                                      </div>
                                  </div>
                              </div>
                              <button onClick={() => { setTargetMemberId(m.id); setShowChangePasswordModal(true); }} className="p-2 bg-white rounded-xl text-slate-400 hover:text-indigo-600 shadow-sm"><Key size={16}/></button>
                          </div>
                      ))}
                  </div>
              </div>
          )}
      </div>
  );

  if (loading) return <div className="h-[100dvh] flex items-center justify-center font-black text-indigo-400 text-xl animate-pulse">Charles Family Loading...</div>;

  if (!currentUserRole) {
    if (loginTarget) {
        return (
            <div className="h-[100dvh] bg-slate-50 flex flex-col items-center justify-center p-6">
                <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl w-full max-w-sm text-center">
                    <div className="w-24 h-24 bg-slate-50 rounded-full mx-auto flex items-center justify-center text-5xl mb-6 shadow-inner">{loginTarget.avatar}</div>
                    <h2 className="text-2xl font-black mb-2">{loginTarget.name}</h2>
                    <p className="text-sm font-bold text-slate-400 mb-8">請輸入安全密碼</p>
                    <input type="password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLoginSubmit()} className="w-full bg-slate-50 border-none rounded-2xl p-4 font-black text-center text-2xl tracking-widest focus:ring-2 ring-indigo-500 mb-6" placeholder="******" autoFocus />
                    <div className="flex gap-2"><button onClick={() => {setLoginTarget(null); setPasswordInput('');}} className="flex-1 bg-slate-100 text-slate-500 py-4 rounded-2xl font-black">返回</button><button onClick={handleLoginSubmit} className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-indigo-200">登入系統</button></div>
                </div>
            </div>
        );
    }
    return (
      <div className="h-[100dvh] bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[2rem] shadow-2xl flex items-center justify-center text-white text-5xl font-black mb-12 italic">C</div>
        <h1 className="text-2xl font-black text-slate-800 mb-8">登入身份</h1>
        <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
          {members.map(m => (
            <button key={m.id} onClick={() => setLoginTarget(m)} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col items-center gap-3 active:scale-95 transition-all hover:border-indigo-200">
              <span className="text-5xl drop-shadow-sm">{m.avatar}</span>
              <span className="font-black text-slate-700">{m.name.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-slate-50 font-sans">
      <aside className="hidden md:flex flex-col w-72 bg-white border-r border-slate-200 p-8 z-10">
        <div className="flex justify-between items-center mb-12"><h1 className="text-2xl font-black text-indigo-600 flex items-center gap-3"><span className="bg-indigo-600 text-white w-10 h-10 rounded-2xl flex items-center justify-center italic shadow-lg shadow-indigo-200">C</span> Family</h1></div>
        <nav className="space-y-2 flex-1">
          {NAV_ITEMS.map(item => {
            if (currentUserRole.role !== 'admin' && !(currentUserRole.permissions || []).includes(item.perm)) return null;
            return (<button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-black transition-all ${activeTab === item.id ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}><item.icon size={22}/> {item.label}</button>)
          })}
        </nav>
        <button onClick={() => setCurrentUserRole(null)} className="flex items-center justify-center gap-2 w-full py-4 mt-4 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-2xl font-black transition-colors"><LogOut size={20}/> 登出帳號</button>
      </aside>

      <main className="flex-1 flex flex-col relative overflow-hidden w-full max-w-md md:max-w-none mx-auto shadow-2xl md:shadow-none bg-slate-50">
        <header className="md:hidden pt-safe bg-white/90 backdrop-blur-xl border-b border-slate-100 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
          <h1 className="font-black text-xl text-slate-800 italic tracking-tight">Charles Family</h1>
          <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-slate-50 flex items-center justify-center border border-slate-200 text-lg shadow-sm">{currentUserRole.avatar}</div>
              <button onClick={() => setCurrentUserRole(null)} className="p-2 bg-slate-100 rounded-full text-slate-500 active:scale-90"><LogOut size={16}/></button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-32">
          {activeTab === 'home' && <DashboardView currentUser={currentUserRole} wallets={wallets} events={events} trips={trips} setActiveTab={setActiveTab} />}
          {activeTab === 'calendar' && renderCalendar()}
          {activeTab === 'cdollar' && <CDollarView currentUser={currentUserRole} members={members} wallets={wallets} db={db} userId={user.uid} />}
          {activeTab === 'expenses' && renderExpenses()}
          {activeTab === 'travel' && renderTravel()}
          {activeTab === 'settings' && renderSettings()}
        </div>

        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-2xl border-t border-slate-100 px-4 pb-safe pt-3 flex justify-around items-center z-[90]">
          {NAV_ITEMS.map(item => {
            if (currentUserRole.role !== 'admin' && !(currentUserRole.permissions || []).includes(item.perm)) return null;
            return (
              <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex flex-col items-center gap-1.5 transition-all active:scale-75 ${activeTab === item.id ? 'text-indigo-600' : 'text-slate-300'}`}>
                <div className={`p-2 rounded-2xl ${activeTab === item.id ? 'bg-indigo-50 shadow-sm' : ''}`}><item.icon size={22} strokeWidth={activeTab === item.id ? 2.5 : 2} /></div>
                <span className="text-[9px] font-black uppercase tracking-tighter">{item.label}</span>
              </button>
            )
          })}
        </nav>
      </main>

      <Tooltip hoveredEvent={hoveredEvent} categories={categories} members={members} />
      <EventFormModal isOpen={showEventModal} onClose={() => setShowEventModal(false)} onSave={saveEvent} onDelete={deleteItem} initialData={eventFormData} categories={categories} members={members} />
      <ExpenseFormModal isOpen={showExpenseModal} onClose={() => setShowExpenseModal(false)} onSave={saveExpense} onDelete={deleteItem} initialData={expenseFormData} />
      <TripWizard isOpen={showTripWizard} onClose={() => setShowTripWizard(false)} onFinish={finishTripWizard} members={members} />
      <AddMemberModal isOpen={showAddMemberModal} onClose={() => setShowAddMemberModal(false)} onAdd={handleAddMember} />
      <ChangePasswordModal isOpen={showChangePasswordModal} onClose={() => setShowChangePasswordModal(false)} onConfirm={handleChangePassword} />
    </div>
  );
}
