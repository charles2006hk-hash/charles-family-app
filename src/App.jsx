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
  Award, MinusCircle, ShoppingBag, PiggyBank, Target, BarChart2, Landmark, RefreshCw,
  Repeat, Tag, Filter
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

// 🚀 核心修復：使用全域固定的家庭資料庫路徑，不再依賴會變動的匿名 UID
const getCol = (colName) => collection(db, 'artifacts', appId, 'family', 'main', colName);
const getDoc = (colName, id) => doc(db, 'artifacts', appId, 'family', 'main', colName, id);

// --- 2. Constants & Core Data ---
const EXCHANGE_RATE_CNY_HKD = 1.08; 

const DEFAULT_MEMBERS_SEED = [
    { name: '爸爸 (Charles)', role: 'admin', color: 'bg-blue-100 text-blue-800', password: '888888', avatar: '👨', permissions: ['home', 'calendar', 'expenses', 'travel', 'settings', 'cdollar'] },
    { name: '媽媽', role: 'admin', color: 'bg-pink-100 text-pink-800', password: '888888', avatar: '👩', permissions: ['home', 'calendar', 'expenses', 'travel', 'settings', 'cdollar'] },
    { name: '女兒 (中五)', role: 'member', color: 'bg-purple-100 text-purple-800', password: '888888', avatar: '👧', permissions: ['home', 'calendar', 'travel', 'cdollar', 'expenses'] },
    { name: '兒子 (中一)', role: 'member', color: 'bg-green-100 text-green-800', password: '888888', avatar: '👦', permissions: ['home', 'calendar', 'cdollar', 'expenses'] },
];

const DEFAULT_CATEGORIES = [
  { id: 'general', name: '一般事務', color: 'bg-gray-100 text-gray-800 border-gray-200', type: 'system' },
  { id: 'expense', name: '家庭開支', color: 'bg-orange-100 text-orange-800 border-orange-200', type: 'system' },
  { id: 'travel', name: '旅行計劃', color: 'bg-blue-100 text-blue-800 border-blue-200', type: 'system' },
  { id: 'school', name: '學校活動', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', type: 'custom' },
  { id: 'competition', name: '外出比賽', color: 'bg-purple-100 text-purple-800 border-purple-200', type: 'custom' },
];

const DEFAULT_EXPENSE_CATEGORIES = ['樓宇', '水電煤', '信用卡', '保險', '餐飲', '交通', '日常', '貸款', '教育', '醫療', '娛樂', '其他'];
const POPULAR_DESTINATIONS = ['東京, 日本', '大阪, 日本', '台北, 台灣', '首爾, 韓國', '倫敦, 英國', '曼谷, 泰國', '新加坡', '悉尼, 澳洲', '北京, 中國', '上海, 中國', '福岡, 日本', '札幌, 日本'];

const HK_HOLIDAYS = {
  '2025-01-01': '元旦', '2025-01-29': '農曆年初一', '2025-01-30': '農曆年初二', '2025-01-31': '農曆年初三',
  '2025-04-04': '清明節', '2025-04-18': '耶穌受難節', '2025-04-19': '耶穌受難節翌日', '2025-04-21': '復活節一',
  '2026-01-01': '元旦', '2026-02-17': '農曆年初一'
};

const LUNAR_DATA = [{ day: 1, text: '初一', ausp: '宜祭祀 祈福' }, { day: 15, text: '十五', ausp: '宜祭祀' }, { day: 2, text: '初二', ausp: '宜出行' }, { day: 8, text: '初八', ausp: '諸事不宜' }, { day: 16, text: '十六', ausp: '宜開市' }, { day: 23, text: '廿三', ausp: '宜大掃除' }];

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
const formatMoney = (amount) => (amount !== undefined && amount !== null) ? `$${Math.round(amount).toLocaleString()}` : '$0';
const formatCDollar = (amount) => (amount !== undefined && amount !== null) ? `C$ ${Math.round(amount).toLocaleString()}` : 'C$ 0';
const convertToHKD = (cdollar) => `$${(cdollar * EXCHANGE_RATE_CNY_HKD).toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 1})}`;

const getLunarInfo = (date) => {
  const day = date.getDate(); const special = LUNAR_DATA.find(d => d.day === day);
  if (special) return { dayText: special.text, auspicious: special.ausp };
  const idx = (day - 1) % 30;
  const randAusp = (day % 5 === 0) ? '宜會友' : (day % 7 === 0 ? '忌遠行' : '');
  return { dayText: idx === 0 ? '初一' : `${idx + 1}`, auspicious: randAusp };
};
const calculatePackingProgress = (list) => {
    if (!list) return 0; let total = 0, packed = 0;
    (list.shared || []).forEach(i => { total++; if(i.packed) packed++; });
    Object.values(list.individual || {}).forEach(pItems => { pItems.forEach(i => { total++; if(i.packed) packed++; }); });
    return total === 0 ? 0 : Math.round((packed / total) * 100);
};

const renderAvatar = (avatarValue) => {
    if (!avatarValue) return '🧑';
    if (avatarValue.startsWith('data:image') || avatarValue.startsWith('http')) {
        return <img src={avatarValue} alt="avatar" className="w-full h-full object-cover" />;
    }
    return avatarValue;
};

// --- 3. Sub-Components ---

const DashboardView = ({ currentUser, members, wallets, events, trips, expenses, setActiveTab }) => {
    const [now, setNow] = useState(new Date());
    useEffect(() => { const timer = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(timer); }, []);
    
    const todayStr = formatDate(now); const lunar = getLunarInfo(now); const holiday = HK_HOLIDAYS[todayStr];
    const currentYear = now.getFullYear(); const currentMonth = now.getMonth();
    
    const upcomingEvents = events.filter(e => e.date >= todayStr && (e.participants || []).includes(currentUser.id)).sort((a,b) => a.date.localeCompare(b.date)).slice(0, 3);
    const activeTrips = trips.filter(t => t.endDate >= todayStr && (t.participants || []).includes(currentUser.id)).sort((a,b) => a.startDate.localeCompare(b.startDate)).slice(0, 1);
    
    const myWallet = wallets[currentUser.id] || { balance: 0, savings: 0, invested: 0 };
    const totalAssets = myWallet.balance + myWallet.savings + (myWallet.invested || 0);
    const isAdmin = currentUser.role === 'admin';

    const myDisplayExpenses = expenses.filter(e => e.memberId === currentUser.id).map(e => {
        let periodKey = ''; let amountMultiplier = 1; let isApplicable = false;
        const eDate = new Date(e.date || new Date().toISOString());
        switch (e.recurringPeriod) {
            case 'daily': isApplicable = true; amountMultiplier = 30; periodKey = `paid_${currentYear}_${currentMonth}_daily`; break;
            case 'weekly': isApplicable = true; amountMultiplier = 4; periodKey = `paid_${currentYear}_${currentMonth}_weekly`; break;
            case 'monthly': isApplicable = true; periodKey = `paid_${currentYear}_${currentMonth}_monthly`; break;
            case 'yearly': isApplicable = eDate.getMonth() === currentMonth; periodKey = `paid_${currentYear}_${currentMonth}_yearly`; break;
            default: isApplicable = eDate.getFullYear() === currentYear && eDate.getMonth() === currentMonth; periodKey = `paid_${e.id}_oneoff`; break;
        }
        return { ...e, calculatedAmount: (e.amount || 0) * amountMultiplier, periodKey, isApplicable };
    }).filter(e => e.isApplicable);

    const myTotalBudget = myDisplayExpenses.reduce((sum, e) => sum + e.calculatedAmount, 0);
    const myPaidAmount = myDisplayExpenses.reduce((sum, e) => sum + ((e.paidPeriods || []).includes(e.periodKey) ? e.calculatedAmount : 0), 0);

    return (
        <div className="space-y-6 pb-10">
            <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-slate-100 flex flex-col relative overflow-hidden">
                <div className="absolute right-0 top-0 opacity-5 text-9xl pointer-events-none -mt-4 -mr-4">🕒</div>
                <p className="text-xs font-bold text-slate-400 mb-1">{now.toLocaleDateString('zh-HK', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</p>
                <div className="flex items-end gap-3 flex-wrap">
                    <span className="text-4xl font-black text-slate-800 tracking-tighter">{now.toLocaleTimeString('zh-HK', { hour12: false, hour: '2-digit', minute: '2-digit' })}</span>
                    <div className="flex gap-2 mb-1.5"><span className="bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-lg text-[10px] font-black">{lunar.dayText} {lunar.auspicious}</span>{holiday && <span className="bg-red-50 text-red-500 px-2.5 py-1 rounded-lg text-[10px] font-black">{holiday}</span>}</div>
                </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[2rem] p-6 shadow-lg text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-10 -mt-10 blur-xl"></div>
                <div className="flex items-center gap-4 mb-5">
                    <div className="text-4xl bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center backdrop-blur-sm shadow-inner overflow-hidden">{renderAvatar(currentUser.avatar)}</div>
                    <div><h2 className="text-2xl font-black tracking-tight">早安, {currentUser.name.split(' ')[0]}</h2><p className="text-sm font-bold opacity-80">{isAdmin ? '家庭管理員，準備好今天的安排了嗎？' : '準備好完成今天的任務了嗎？'}</p></div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(currentUser.permissions || []).includes('cdollar') && (
                        <div onClick={() => setActiveTab('cdollar')} className="bg-white/10 rounded-2xl p-4 backdrop-blur-md flex flex-col gap-2 cursor-pointer hover:bg-white/20 transition">
                            <div className="flex justify-between items-center"><p className="text-[10px] font-black uppercase tracking-widest opacity-90 flex items-center gap-1"><Award size={12}/> {isAdmin ? '全家金融儲備看板' : 'C-Dollar 總儲備'}</p>{!isAdmin && <p className="text-[9px] opacity-80">{convertToHKD(totalAssets)}</p>}</div>
                            <p className="text-2xl font-black italic tracking-tighter drop-shadow-md">{isAdmin ? '管理模式' : formatCDollar(totalAssets)}</p>
                        </div>
                    )}
                    {(currentUser.permissions || []).includes('expenses') && !isAdmin && (
                        <div onClick={() => setActiveTab('expenses')} className="bg-orange-500/20 rounded-2xl p-4 backdrop-blur-md flex flex-col gap-2 cursor-pointer hover:bg-orange-500/30 transition border border-orange-400/30">
                            <div className="flex justify-between items-center"><p className="text-[10px] font-black uppercase tracking-widest opacity-90 flex items-center gap-1 text-orange-100"><CreditCard size={12}/> 本月個人花費</p><p className="text-[9px] opacity-90 text-orange-200">已付 {formatMoney(myPaidAmount)}</p></div>
                            <p className="text-2xl font-black italic tracking-tighter drop-shadow-md text-orange-50">{formatMoney(myTotalBudget)}</p>
                        </div>
                    )}
                </div>
            </div>

            <div>
                <div className="flex justify-between items-center mb-3 px-2">
                    <h3 className="font-black text-lg text-slate-800 flex items-center gap-2"><CalendarIcon size={18} className="text-indigo-500"/> 近期與我相關的日程</h3>
                    <button onClick={() => setActiveTab('calendar')} className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full active:scale-95 transition">查看全部</button>
                </div>
                <div className="space-y-3">
                    {upcomingEvents.length > 0 ? upcomingEvents.map(ev => (
                        <div key={ev.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                            <div className="w-14 h-14 bg-indigo-50 rounded-xl flex flex-col items-center justify-center text-indigo-600 shrink-0"><span className="text-[10px] font-bold uppercase tracking-widest">{ev.date.split('-')[1]}月</span><span className="text-xl font-black">{ev.date.split('-')[2]}</span></div>
                            <div className="flex-1 min-w-0">
                                <p className="font-black text-slate-800 text-lg truncate">{ev.title}</p>
                                <p className="text-xs font-bold text-slate-400 flex items-center gap-1"><Clock size={12}/> {ev.startTime} {ev.notes ? `· ${ev.notes}` : ''}</p>
                                <div className="flex items-center -space-x-1.5 mt-2">{ev.participants?.map(pId => { const mem = members.find(m => m.id === pId); return mem ? <div key={pId} className="w-6 h-6 rounded-full overflow-hidden bg-slate-50 border-2 border-white text-[10px] flex items-center justify-center shadow-sm relative z-10" title={mem.name}>{renderAvatar(mem.avatar)}</div> : null; })}</div>
                            </div>
                        </div>
                    )) : <div className="text-center text-slate-400 font-bold py-8 bg-white rounded-2xl border border-slate-100 italic">近期沒有與您相關的安排</div>}
                </div>
            </div>
        </div>
    );
};

const CDollarView = ({ currentUser, members, wallets, db }) => {
    const [transactions, setTransactions] = useState([]);
    const [requests, setRequests] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [shopItems, setShopItems] = useState([]);
    const [investProducts, setInvestProducts] = useState([]);
    const [portfolio, setPortfolio] = useState([]);
    
    const [activeSubTab, setActiveSubTab] = useState('tasks');
    const [bankAmount, setBankAmount] = useState('');
    const [investAmount, setInvestAmount] = useState('');
    const [adminBankInputs, setAdminBankInputs] = useState({});
    const isAdmin = currentUser.role === 'admin';

    useEffect(() => {
        const unsubT = onSnapshot(query(getCol('cdollar_tx'), orderBy('date', 'desc'), limit(50)), snap => setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        const unsubReq = onSnapshot(query(getCol('cdollar_requests'), orderBy('createdAt', 'desc')), snap => setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        const unsubTasks = onSnapshot(getCol('cdollar_tasks'), snap => { if (snap.empty && isAdmin) SEED_TASKS.forEach(t => addDoc(getCol('cdollar_tasks'), t)); else setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });
        const unsubShop = onSnapshot(getCol('cdollar_shop'), snap => { if (snap.empty && isAdmin) SEED_SHOP_ITEMS.forEach(s => addDoc(getCol('cdollar_shop'), s)); else setShopItems(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });
        const unsubInvest = onSnapshot(getCol('cdollar_invest_products'), snap => { if (snap.empty && isAdmin) SEED_INVESTMENTS.forEach(i => addDoc(getCol('cdollar_invest_products'), i)); else setInvestProducts(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });
        const unsubPortfolio = onSnapshot(getCol('cdollar_portfolio'), snap => setPortfolio(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        
        return () => { unsubT(); unsubReq(); unsubTasks(); unsubShop(); unsubInvest(); unsubPortfolio(); };
    }, [isAdmin]);

    const handleTransaction = async (memberId, amount, reason, type = 'general') => {
        const targetWallet = wallets[memberId] || { balance: 0, savings: 0, invested: 0 };
        const newBalance = Math.max(0, targetWallet.balance + amount);
        await addDoc(getCol('cdollar_tx'), { memberId, amount, reason, type, date: new Date().toISOString(), createdBy: currentUser.name });
        await setDoc(getDoc('cdollar_wallets', memberId), { balance: newBalance, savings: targetWallet.savings, invested: targetWallet.invested || 0, memberId }, { merge: true });
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
        await setDoc(getDoc('cdollar_wallets', currentUser.id), { balance: newBalance, savings: newSavings, invested: myWallet.invested || 0, memberId: currentUser.id }, { merge: true });
        await addDoc(getCol('cdollar_tx'), { memberId: currentUser.id, amount: type === 'deposit' ? -amt : amt, reason: type === 'deposit' ? '存入銀行' : '銀行提款', type: 'bank', date: new Date().toISOString(), createdBy: currentUser.name });
        setBankAmount(''); alert(`成功${type === 'deposit' ? '存入' : '提出'} ${formatCDollar(amt)}`);
    };

    const handleAdminBankInputChange = (memberId, field, value) => {
        setAdminBankInputs(prev => ({ ...prev, [memberId]: { ...(prev[memberId] || {}), [field]: value === '' ? '' : Number(value) } }));
    };

    const saveAdminBankUpdate = async (memberId) => {
        const currentWallet = wallets[memberId] || { balance: 0, savings: 0 };
        const edits = adminBankInputs[memberId] || {};
        const finalBalance = edits.balance !== undefined ? edits.balance : currentWallet.balance;
        const finalSavings = edits.savings !== undefined ? edits.savings : currentWallet.savings;
        await setDoc(getDoc('cdollar_wallets', memberId), { balance: finalBalance, savings: finalSavings, memberId }, { merge: true });
        setAdminBankInputs(prev => { const next = { ...prev }; delete next[memberId]; return next; });
        alert('修改成功！');
    };

    const handleAdminDistributeInterest = async (rate) => {
        if (!confirm(`確定按 ${rate}% 派發利息嗎？`)) return;
        for (const memberId of Object.keys(wallets)) {
            const w = wallets[memberId];
            if (w.savings > 0) {
                const interest = Math.round(w.savings * (rate / 100));
                if (interest > 0) {
                    await handleTransaction(memberId, interest, `活期存款利息 (+${rate}%)`, 'interest');
                    await setDoc(getDoc('cdollar_wallets', memberId), { ...w, savings: w.savings + interest, memberId }, { merge: true });
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
        
        await setDoc(getDoc('cdollar_wallets', currentUser.id), { balance: myWallet.balance - amt, savings: myWallet.savings, invested: (myWallet.invested || 0) + amt, memberId: currentUser.id }, { merge: true });
        await addDoc(getCol('cdollar_tx'), { memberId: currentUser.id, amount: -amt, reason: `買入基金: ${product.title}`, type: 'invest', date: new Date().toISOString(), createdBy: currentUser.name });
        await addDoc(getCol('cdollar_portfolio'), { memberId: currentUser.id, productId: product.id, title: product.title, amount: amt, rate: product.rate, purchaseDate: new Date().toISOString(), status: 'active' });
        setInvestAmount(''); alert(`成功買入 ${formatCDollar(amt)} 的 ${product.title}`);
    };
    
    const handleSellInvest = async (portfolioItem) => {
        if(!confirm(`確定要賣出 ${portfolioItem.title} 嗎？將收回 ${formatCDollar(portfolioItem.amount)}`)) return;
        const myWallet = wallets[currentUser.id] || { balance: 0, savings: 0, invested: 0 };
        const newBalance = myWallet.balance + portfolioItem.amount;
        const newInvested = Math.max(0, (myWallet.invested || 0) - portfolioItem.amount);

        await setDoc(getDoc('cdollar_wallets', currentUser.id), { balance: newBalance, savings: myWallet.savings, invested: newInvested, memberId: currentUser.id }, { merge: true });
        await addDoc(getCol('cdollar_tx'), { memberId: currentUser.id, amount: portfolioItem.amount, reason: `賣出基金: ${portfolioItem.title}`, type: 'invest', date: new Date().toISOString(), createdBy: currentUser.name });
        await deleteDoc(getDoc('cdollar_portfolio', portfolioItem.id));
        alert('賣出成功！資金已退回餘額。');
    };

    const handleAdminAdd = async (col) => {
        const title = prompt(`請輸入名稱:`); if (!title) return;
        const val = prompt(`請輸入數值:`); if (!val || isNaN(val)) return alert('數值無效');
        if (col === 'tasks') await addDoc(getCol('cdollar_tasks'), { title, reward: Number(val), type: 'custom' });
        if (col === 'shop') await addDoc(getCol('cdollar_shop'), { title, cost: Number(val), icon: '✨' });
        if (col === 'invest') await addDoc(getCol('cdollar_invest_products'), { title, rate: Number(val), cycle: 30, risk: '中', icon: '📊' });
    };
    
    const handleAdminDelete = async (col, id) => { 
        if(confirm('確定刪除？此動作無法復原。')) await deleteDoc(getDoc(`cdollar_${col}`, id)); 
    };

    const submitRequest = async (item, type, amount) => {
        if (type === 'shop' && (wallets[currentUser.id]?.balance || 0) < amount) return alert('可用餘額不足！');
        await addDoc(getCol('cdollar_requests'), { memberId: currentUser.id, memberName: currentUser.name.split(' ')[0], type, title: item.title, amount: type === 'shop' ? -amount : amount, status: 'pending', createdAt: new Date().toISOString() });
        alert('已發送申請，請等待父母審批！');
    };
    const handleRequestApproval = async (req, isApprove) => {
        if (isApprove) await handleTransaction(req.memberId, req.amount, `${req.type === 'shop' ? '兌換' : '完成'}: ${req.title}`, req.type);
        await deleteDoc(getDoc('cdollar_requests', req.id));
    };

    const myWallet = wallets[currentUser.id] || { balance: 0, savings: 0, invested: 0 };
    const myPortfolio = portfolio.filter(p => p.memberId === currentUser.id && p.status === 'active');
    const myTransactions = isAdmin ? transactions : transactions.filter(tx => tx.memberId === currentUser.id);
    const pendingRequests = isAdmin ? requests : requests.filter(r => r.memberId === currentUser.id);

    return (
        <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
            <div className="p-4 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-b-[2rem] shadow-lg text-white mb-4 relative overflow-hidden shrink-0">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-10 -mt-10 blur-xl"></div>
                <div className="flex justify-between items-center mb-6 pt-2">
                    <div><h2 className="text-2xl font-black italic">Family FQ Center</h2><p className="text-[10px] font-bold opacity-80 flex items-center gap-1 mt-1"><RefreshCw size={10}/> 實時掛鉤 CNY 匯率: 1 C$ = {EXCHANGE_RATE_CNY_HKD} HKD</p></div>
                    <Award size={28} className="text-yellow-300 drop-shadow-md" />
                </div>
                
                {isAdmin ? (
                    <div className="grid grid-cols-2 gap-3">
                        {members.filter(m => m.role !== 'admin').map(m => (
                            <div key={m.id} className="bg-white/10 p-3 rounded-xl backdrop-blur-md border border-white/10">
                                <p className="text-[10px] uppercase font-bold opacity-80 mb-1 flex items-center gap-1"><span className="w-4 h-4 rounded-full overflow-hidden inline-block">{renderAvatar(m.avatar)}</span> {m.name.split(' ')[0]}</p>
                                <p className="text-xl font-black italic">{formatCDollar(wallets[m.id]?.balance)}</p>
                                <p className="text-[10px] opacity-60 mt-1 font-bold">存款: {formatCDollar(wallets[m.id]?.savings)} | 投資: {formatCDollar(wallets[m.id]?.invested)}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md border border-white/10 flex justify-between items-center">
                        <div><p className="text-xs font-bold opacity-80 mb-1">可用餘額</p><p className="text-3xl font-black italic tracking-tighter drop-shadow-lg">{formatCDollar(myWallet.balance)}</p></div>
                        <div className="text-right border-l border-white/20 pl-3">
                            <p className="text-[10px] font-bold opacity-80 mb-0.5">活期存款</p><p className="text-sm font-bold italic">{formatCDollar(myWallet.savings)}</p>
                            <p className="text-[10px] font-bold opacity-80 mt-1 mb-0.5">理財組合</p><p className="text-sm font-bold italic text-yellow-300">{formatCDollar(myWallet.invested)}</p>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex px-4 gap-2 mb-2 overflow-x-auto pb-2 shrink-0 hide-scrollbar">
                {[{id:'tasks',icon:Target,label:'任務'}, {id:'shop',icon:ShoppingBag,label:'商城'}, {id:'invest',icon:BarChart2,label:'理財'}, {id:'bank',icon:Landmark,label:'銀行'}, {id:'wallet',icon:Wallet,label:'審批與明細', alert: pendingRequests.length > 0}].map(t => (
                    <button key={t.id} onClick={() => setActiveSubTab(t.id)} className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black whitespace-nowrap transition-all relative ${activeSubTab === t.id ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-100 hover:bg-slate-50'}`}>
                        <t.icon size={14}/> {isAdmin && t.id!=='wallet'&&t.id!=='bank' ? `管理${t.label}` : t.label}
                        {t.alert && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto px-4 space-y-4 pb-32">
                {activeSubTab === 'wallet' && (
                    <div className="space-y-6">
                        {pendingRequests.length > 0 && (
                            <div className="bg-orange-50 border border-orange-100 p-4 rounded-2xl">
                                <h4 className="font-black text-orange-800 mb-3 flex items-center gap-2"><Bell size={16}/> {isAdmin ? '待處理申請 (家長審批)' : '我的申請進度'}</h4>
                                <div className="space-y-3">
                                    {pendingRequests.map(req => (
                                        <div key={req.id} className="bg-white p-3 rounded-xl shadow-sm flex justify-between items-center border border-orange-100/50">
                                            <div>
                                                <p className="font-bold text-slate-800 text-sm">{isAdmin && <span className="text-indigo-600 mr-1">{req.memberName}</span>}{req.title}</p>
                                                <p className={`font-black text-xs italic ${req.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>{req.amount > 0 ? '+' : ''}{formatCDollar(Math.abs(req.amount))}</p>
                                            </div>
                                            {isAdmin ? (
                                                <div className="flex gap-2"><button onClick={() => handleRequestApproval(req, false)} className="px-3 py-1.5 bg-slate-100 text-slate-500 rounded-lg text-xs font-black hover:bg-red-50 hover:text-red-500">拒絕</button><button onClick={() => handleRequestApproval(req, true)} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-black shadow-md active:scale-95">批准</button></div>
                                            ) : <span className="text-[10px] font-black text-orange-500 bg-orange-100 px-2 py-1 rounded">等待父母審核</span>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div>
                            <h4 className="font-black text-slate-800 mb-3">資金明細紀錄</h4>
                            <div className="space-y-3">
                                {myTransactions.length > 0 ? myTransactions.map(tx => (
                                    <div key={tx.id} className="bg-white p-4 rounded-2xl flex justify-between items-center shadow-sm border border-slate-100 group">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${tx.amount > 0 ? 'bg-green-50 text-green-600':'bg-red-50 text-red-600'}`}>{tx.amount > 0 ? <TrendingUp size={18}/> : <MinusCircle size={18}/>}</div>
                                            <div><p className="font-bold text-slate-800 text-sm leading-tight">{tx.reason}</p><p className="text-[10px] text-slate-400 font-bold mt-1">{tx.date.split('T')[0]} {isAdmin && `· ${members.find(m=>m.id===tx.memberId)?.name.split(' ')[0]}`}</p></div>
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0">
                                            <p className={`font-black text-lg italic ${tx.amount > 0 ? 'text-green-600':'text-red-600'}`}>{tx.amount > 0 ? '+' : ''}{formatCDollar(Math.abs(tx.amount))}</p>
                                            {isAdmin && <button onClick={() => handleAdminDelete('tx', tx.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1"><Trash2 size={16}/></button>}
                                        </div>
                                    </div>
                                )) : <p className="text-xs font-bold text-slate-400 italic">無交易紀錄</p>}
                            </div>
                        </div>
                    </div>
                )}

                {activeSubTab === 'tasks' && (
                    <div className="space-y-3">
                        {isAdmin && <button onClick={() => handleAdminAdd('tasks')} className="w-full bg-indigo-50 text-indigo-600 border border-indigo-100 py-3 rounded-2xl font-black flex justify-center items-center gap-2 mb-4"><Plus size={18}/> 發佈新任務</button>}
                        {tasks.map(task => (
                            <div key={task.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center relative">
                                <div><span className="text-[9px] font-black uppercase text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full mb-1.5 inline-block tracking-widest">{task.type || '日常'}</span><h4 className="font-bold text-slate-800 text-sm">{task.title}</h4><p className="text-indigo-600 font-black italic text-sm mt-0.5">獎勵: {formatCDollar(task.reward)}</p></div>
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
                                    <span className="text-4xl mb-2 drop-shadow-sm">{item.icon || '🎁'}</span><h4 className="font-bold text-slate-800 text-sm mb-1">{item.title}</h4><p className="text-indigo-600 font-black italic mb-3">{formatCDollar(item.cost)}</p>
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
                                        <div><p className="font-bold text-sm">{p.title}</p><p className="text-[10px] opacity-70">買入: {formatCDollar(p.amount)}</p></div>
                                        <div className="flex items-center gap-3">
                                            <p className="text-green-400 font-black text-sm">預期: +{p.rate}%</p>
                                            <button onClick={() => handleSellInvest(p)} className="px-2 py-1 bg-red-500 text-white text-[10px] font-black rounded-lg active:scale-95">賣出</button>
                                        </div>
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
                                        <input type="number" placeholder="投資金額 (數字)" value={investAmount} onChange={e=>setInvestAmount(e.target.value)} className="w-1/2 bg-slate-50 rounded-xl px-3 py-2 text-sm font-bold border-none" />
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
                                <input type="number" placeholder="輸入金額 (數字)" value={bankAmount} onChange={e => setBankAmount(e.target.value)} className="w-full bg-slate-50 border-none rounded-2xl p-4 font-black text-center text-xl focus:ring-2 ring-indigo-500 text-indigo-900" />
                                <div className="flex gap-2">
                                    <button onClick={() => handleBankTransfer('withdraw')} className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-black active:scale-95 transition">提款出錢包</button>
                                    <button onClick={() => handleBankTransfer('deposit')} className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-indigo-200 active:scale-95 transition">存入銀行</button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6 text-left">
                                <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100">
                                    <h4 className="font-black text-indigo-800 mb-2 flex items-center gap-2"><Settings size={16}/> 央行派息面板</h4>
                                    <p className="text-xs font-bold text-indigo-500 mb-4">點擊下方按鈕，系統將發放利息至有存款的成員帳戶。</p>
                                    <button onClick={() => handleAdminDistributeInterest(5)} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-black shadow-md active:scale-95">全家發放 5% 活期利息</button>
                                </div>
                                <div className="space-y-3 mt-4">
                                    <p className="text-sm font-black text-slate-800 flex items-center justify-between">
                                        成員資產手動修改 <span className="text-[10px] font-bold text-slate-400">更改後需點擊儲存</span>
                                    </p>
                                    {members.filter(m => m.role !== 'admin').map(m => (
                                        <div key={m.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col gap-3">
                                            <div className="font-black text-slate-800 flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full overflow-hidden text-xs flex justify-center items-center">{renderAvatar(m.avatar)}</div> {m.name}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-slate-400 w-10">餘額</span>
                                                <input type="number" className="flex-1 p-2 rounded-lg border border-slate-200 focus:border-indigo-500 outline-none text-sm font-bold shadow-sm" value={adminBankInputs[m.id]?.balance ?? wallets[m.id]?.balance ?? 0} onChange={e => handleAdminBankInputChange(m.id, 'balance', e.target.value)} />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-slate-400 w-10">存款</span>
                                                <input type="number" className="flex-1 p-2 rounded-lg border border-slate-200 focus:border-indigo-500 outline-none text-sm font-bold shadow-sm" value={adminBankInputs[m.id]?.savings ?? wallets[m.id]?.savings ?? 0} onChange={e => handleAdminBankInputChange(m.id, 'savings', e.target.value)} />
                                            </div>
                                            <button onClick={() => saveAdminBankUpdate(m.id)} className="w-full mt-1 bg-slate-800 text-white py-2 rounded-lg text-xs font-black shadow-md active:scale-95">儲存修改</button>
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

// --- Modals ---
const ExpenseFormModal = ({ isOpen, onClose, onSave, onDelete, initialData, members, expenseCategories, historicalNames }) => {
    const [formData, setFormData] = useState({ ...initialData, memberId: initialData?.memberId || (members.length > 0 ? members[0].id : '') }); 
    useEffect(() => { setFormData({ ...initialData, memberId: initialData?.memberId || (members.length > 0 ? members[0].id : '') }); }, [initialData, members]); 
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-end md:items-center justify-center p-4 backdrop-blur-sm">
        <div className="bg-white rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl w-full max-w-md p-8 animate-in slide-in-from-bottom">
          <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-black">{formData?.id ? '修改開支' : '新增開支'}</h3><button onClick={onClose} className="p-2 bg-slate-100 rounded-full text-slate-400"><X size={20}/></button></div>
          <div className="space-y-4">
            <div>
                <label className="text-xs font-bold text-slate-400 block mb-2">開支歸屬 (誰的開支？)</label>
                <div className="flex flex-wrap gap-2">
                    {members.map(m => (
                        <button key={m.id} onClick={() => setFormData({...formData, memberId: m.id})} className={`px-3 py-1.5 rounded-full text-xs font-bold border transition flex items-center gap-1.5 ${formData.memberId === m.id ? 'bg-indigo-100 border-indigo-200 text-indigo-700' : 'bg-slate-50 text-slate-400 border-transparent'}`}>
                            <div className="w-4 h-4 rounded-full overflow-hidden flex items-center justify-center bg-white/50">{renderAvatar(m.avatar)}</div> {m.name.split(' ')[0]}
                        </button>
                    ))}
                </div>
            </div>
            
            <input list="expense-names" className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="開支內容 (輸入以搜尋歷史紀錄)"/>
            <datalist id="expense-names">{historicalNames.map((n, i) => <option key={i} value={n} />)}</datalist>
            
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <DollarSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="number" className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-10 pr-4 font-black text-lg text-slate-800" placeholder="金額" value={formData.amount || ''} onChange={e => setFormData({...formData, amount: Number(e.target.value)})} />
                </div>
                <input type="date" className="flex-1 bg-slate-50 border-none rounded-2xl p-4 font-bold text-sm" value={formData.date || formatDate(new Date())} onChange={e => setFormData({...formData, date: e.target.value})} />
            </div>

            <div>
                <label className="text-xs font-bold text-slate-400 block mb-2">重複週期</label>
                <div className="grid grid-cols-3 gap-2">
                    {[{v:'none', l:'單次'}, {v:'daily', l:'每日'}, {v:'weekly', l:'每週'}, {v:'monthly', l:'每月'}, {v:'yearly', l:'每年'}].map(p => (
                        <button key={p.v} onClick={() => setFormData({...formData, recurringPeriod: p.v})} className={`py-2 rounded-xl text-xs font-bold transition ${formData.recurringPeriod === p.v ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-50 text-slate-500'}`}>{p.l}</button>
                    ))}
                </div>
            </div>

            <div className="flex gap-2">
                <select className="flex-1 bg-slate-50 border-none rounded-2xl p-4 font-bold text-sm" value={formData.category || expenseCategories[0]} onChange={e => setFormData({...formData, category: e.target.value})}>
                    {expenseCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input className="flex-1 bg-slate-50 border-none rounded-2xl p-4 font-bold text-sm" placeholder="銀行/付款方式" value={formData.bank || ''} onChange={e => setFormData({...formData, bank: e.target.value})}/>
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
                    <div><label className="text-xs font-bold text-slate-400 block mb-2">參與成員</label><div className="flex flex-wrap gap-2">{members.map(m => (<button key={m.id} onClick={() => { const newP = (formData.participants||[]).includes(m.id) ? formData.participants.filter(p => p !== m.id) : [...(formData.participants||[]), m.id]; setFormData({...formData, participants: newP}); }} className={`px-3 py-1.5 rounded-full text-xs font-bold border transition flex items-center gap-1 ${(formData.participants||[]).includes(m.id) ? `${m.color}` : 'bg-slate-50 text-slate-400'}`}><div className="w-4 h-4 rounded-full overflow-hidden flex items-center justify-center bg-white/50">{renderAvatar(m.avatar)}</div> {m.name.split(' ')[0]}</button>))}</div></div>
                    <textarea className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm resize-none h-20" placeholder="備註..." value={formData.notes || ''} onChange={e => setFormData({...formData, notes: e.target.value})}></textarea>
                    <div className="flex gap-2 pt-4">{formData?.id && <button onClick={() => onDelete('events', formData.id)} className="p-4 text-red-500 bg-red-50 rounded-2xl"><Trash2/></button>}<button onClick={() => onSave(formData)} className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-indigo-200 active:scale-95 transition">確認儲存</button></div>
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

const EditPermissionsModal = ({ isOpen, onClose, onSave, member }) => {
    const [permissions, setPermissions] = useState({});
    useEffect(() => { if (member) { const p = {}; ['home', 'calendar', 'expenses', 'travel', 'settings', 'cdollar'].forEach(k => p[k] = member.permissions?.includes(k)); setPermissions(p); } }, [member]);
    if (!isOpen || !member) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl w-full max-w-sm">
                <h3 className="font-black text-xl mb-6 flex items-center gap-2">修改權限 <div className="w-6 h-6 rounded-full overflow-hidden text-sm flex items-center justify-center bg-slate-100">{renderAvatar(member.avatar)}</div> {member.name.split(' ')[0]}</h3>
                <div className="grid grid-cols-2 gap-3 mb-6">
                    {Object.keys(permissions).map(p => (
                        <label key={p} className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer"><input type="checkbox" className="w-4 h-4 rounded text-indigo-600" checked={permissions[p]} onChange={e => setPermissions({...permissions, [p]: e.target.checked})} /><span>{p==='home'?'首頁':p==='calendar'?'日曆':p==='expenses'?'開支':p==='travel'?'旅行':p==='cdollar'?'C-Dollar':'設定'}</span></label>
                    ))}
                </div>
                <div className="flex gap-3"><button onClick={onClose} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black">取消</button><button onClick={() => onSave(member.id, Object.keys(permissions).filter(k=>permissions[k]))} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg">儲存</button></div>
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
  const [expenseCategories, setExpenseCategories] = useState(DEFAULT_EXPENSE_CATEGORIES);
  const [events, setEvents] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [trips, setTrips] = useState([]);
  const [wallets, setWallets] = useState({});
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState('month'); 
  const [hoveredEvent, setHoveredEvent] = useState(null); 

  const [expenseMonth, setExpenseMonth] = useState(new Date().getMonth());
  const [expenseYear, setExpenseYear] = useState(new Date().getFullYear());
  const [expenseViewMember, setExpenseViewMember] = useState('all');

  const [showEventModal, setShowEventModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showTripWizard, setShowTripWizard] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showEditPermissionsModal, setShowEditPermissionsModal] = useState(false);
  
  const [targetMemberId, setTargetMemberId] = useState(null);
  const [editingMember, setEditingMember] = useState(null);
  const [eventFormData, setEventFormData] = useState({});
  const [expenseFormData, setExpenseFormData] = useState({});

  const historicalExpenseNames = useMemo(() => { return [...new Set(expenses.map(e => e.name).filter(Boolean))]; }, [expenses]);

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
    const unsubMembers = onSnapshot(getCol('members'), (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (data.length === 0) DEFAULT_MEMBERS_SEED.forEach(m => addDoc(getCol('members'), { ...m, createdAt: serverTimestamp() }));
        else setMembers(data);
        setLoading(false);
    });
    const unsubEvents = onSnapshot(getCol('events'), snap => setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubExpenses = onSnapshot(getCol('expenses'), snap => setExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubTrips = onSnapshot(getCol('trips'), snap => setTrips(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubWallets = onSnapshot(getCol('cdollar_wallets'), (snap) => {
        const d = {}; snap.docs.forEach(doc => d[doc.id] = { balance: doc.data().balance || 0, savings: doc.data().savings || 0, invested: doc.data().invested || 0 });
        setWallets(d);
    });
    const unsubSettings = onSnapshot(getDoc('settings', 'expenses'), docSnap => {
        if (docSnap.exists() && docSnap.data().categories) setExpenseCategories(docSnap.data().categories);
    });

    return () => { unsubMembers(); unsubEvents(); unsubExpenses(); unsubTrips(); unsubWallets(); unsubSettings(); };
  }, [user]);

  const handleLoginSubmit = () => {
      if (passwordInput === loginTarget.password || passwordInput === '888888') {
          setCurrentUserRole(loginTarget); setActiveTab('home'); setLoginTarget(null); setPasswordInput('');
      } else alert('密碼錯誤！');
  };

  // Avatar Upload Logic in Settings
  const handleUpdateAvatar = async (e) => {
      const file = e.target.files[0];
      if (file) {
          if (file.size > 100 * 1024) return alert("圖片過大，請選擇小於 100KB 的圖片");
          const reader = new FileReader();
          reader.onloadend = async () => {
              await updateDoc(getDoc('members', currentUserRole.id), { avatar: reader.result });
              setCurrentUserRole(prev => ({ ...prev, avatar: reader.result })); // Optimistic UI update
          };
          reader.readAsDataURL(file);
      }
  };

  const handleAddMember = async (newMember) => { await addDoc(getCol('members'), { ...newMember, password: '888888', createdAt: serverTimestamp() }); setShowAddMemberModal(false); };
  const handleChangePassword = async (newPassword) => { if (!targetMemberId || !newPassword) return; await updateDoc(getDoc('members', targetMemberId), { password: newPassword }); setShowChangePasswordModal(false); };
  const savePermissions = async (memberId, newPerms) => { await updateDoc(getDoc('members', memberId), { permissions: newPerms }); setShowEditPermissionsModal(false); };

  const saveEvent = async (data) => { const payload = { ...data, updatedAt: serverTimestamp() }; if (data.id) await updateDoc(getDoc('events', data.id), payload); else await addDoc(getCol('events'), { ...payload, createdAt: serverTimestamp() }); setShowEventModal(false); };
  const saveExpense = async (data) => { 
      const payload = { ...data, amount: Number(data.amount) || 0, updatedAt: serverTimestamp() };
      if (data.id) await updateDoc(getDoc('expenses', data.id), payload); 
      else await addDoc(getCol('expenses'), { ...payload, createdAt: serverTimestamp(), paidPeriods: [] }); 
      setShowExpenseModal(false); 
  };
  
  const deleteItem = async (col, id) => { if (confirm('確定刪除？此動作無法復原。')) { await deleteDoc(getDoc(col, id)); setShowEventModal(false); setShowExpenseModal(false); } };
  const finishTripWizard = (data) => {
      const createItem = (name) => ({ name, packed: false });
      const shared = [createItem('Wifi 蛋/SIM卡'), createItem('急救包'), createItem('充電器')];
      const individual = {}; data.participants.forEach(pid => { individual[pid] = [createItem('護照'), createItem('手機'), createItem('衣物')]; });
      addDoc(getCol('trips'), { ...data, packingList: { shared, individual }, createdAt: serverTimestamp() });
      addDoc(getCol('events'), { title: `✈️ ${data.destination}`, date: data.startDate, startTime: '00:00', endTime: '23:59', type: 'travel', participants: data.participants, notes: `至 ${data.endDate}` });
      setShowTripWizard(false);
  };
  
  const handleToggleExpensePaid = async (expenseId, periodKey) => {
    const expense = expenses.find(e => e.id === expenseId);
    const paidPeriods = expense.paidPeriods || [];
    const isPaid = paidPeriods.includes(periodKey);
    const newPaidPeriods = isPaid ? paidPeriods.filter(m => m !== periodKey) : [...paidPeriods, periodKey];
    await updateDoc(getDoc('expenses', expenseId), { paidPeriods: newPaidPeriods });
  };

  const addExpCat = async () => {
      const newCat = prompt('輸入新的開支類型名稱：');
      if (newCat && !expenseCategories.includes(newCat)) {
          const updated = [...expenseCategories, newCat];
          await setDoc(getDoc('settings', 'expenses'), { categories: updated }, { merge: true });
      }
  };
  const deleteExpCat = async (catName) => {
      if (confirm(`確定刪除分類「${catName}」？`)) {
          const updated = expenseCategories.filter(c => c !== catName);
          await setDoc(getDoc('settings', 'expenses'), { categories: updated }, { merge: true });
      }
  };

  // --- Render Functions ---
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
                              <div className="flex flex-col items-center justify-center w-16 border-r pr-4 border-slate-100">
                                  <span className="text-sm font-black text-slate-800">{ev.startTime}</span>
                                  {ev.endTime && <><div className="h-4 w-[2px] bg-slate-100 my-1"></div><span className="text-xs font-bold text-slate-400">{ev.endTime}</span></>}
                              </div>
                              <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                      <span className={`w-3 h-3 rounded-full shrink-0 ${cat.color.replace('text', 'bg').split(' ')[0]}`}></span>
                                      <div className="flex items-center -space-x-1.5 shrink-0">
                                          {ev.participants?.map(p => { 
                                              const mem = members.find(m=>m.id===p); 
                                              return mem ? <div key={p} className="w-5 h-5 rounded-full overflow-hidden bg-slate-100 border border-slate-200 text-[10px] flex items-center justify-center shadow-sm relative z-10" title={mem.name}>{renderAvatar(mem.avatar)}</div> : null 
                                          })}
                                      </div>
                                      <span className="font-black text-lg text-slate-800 truncate">{ev.title}</span>
                                  </div>
                                  {ev.notes && <div className="text-xs font-bold text-slate-400 truncate mb-1">{ev.notes}</div>}
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
           <div className="mt-1 flex flex-col gap-1 overflow-hidden h-[calc(100%-28px)]">{dayEvents.slice(0, 3).map(ev => { 
               const cat = categories.find(c => c.id === ev.type) || categories[0]; 
               return (<div key={ev.id} onMouseEnter={(e) => setHoveredEvent({ event: ev, x: e.clientX, y: e.clientY })} onMouseLeave={() => setHoveredEvent(null)} onClick={(e) => { e.stopPropagation(); setEventFormData(ev); setShowEventModal(true); }} className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md truncate border flex items-center gap-1 ${cat.color}`}><div className="flex -space-x-1 shrink-0">{ev.participants?.slice(0,3).map(p => {const mem = members.find(m=>m.id===p); return mem ? <span key={p} className="w-3 h-3 rounded-full overflow-hidden inline-block text-[6px] drop-shadow-sm z-10 relative">{renderAvatar(mem.avatar)}</span> : null;})}</div><span className="truncate">{ev.title}</span></div>); 
           })}</div>
        </div>
      );
    }
    return (<div className="bg-white md:rounded-3xl shadow-sm h-full flex flex-col overflow-hidden">{renderCalendarHeader()}<div className="grid grid-cols-7 border-b bg-slate-50 text-center py-2 text-xs font-black text-slate-400 uppercase tracking-widest"><div>日</div><div>一</div><div>二</div><div>三</div><div>四</div><div>五</div><div>六</div></div><div className="grid grid-cols-7 flex-1 overflow-y-auto">{days}</div></div>);
  };

  const renderExpenses = () => {
     const viewMemberId = currentUserRole.role === 'admin' ? expenseViewMember : currentUserRole.id;
     
     const displayExpenses = expenses.filter(e => viewMemberId === 'all' || e.memberId === viewMemberId).map(e => {
        let periodKey = ''; let amountMultiplier = 1; let isApplicable = false;
        const eDate = new Date(e.date || new Date().toISOString());
        
        switch (e.recurringPeriod) {
            case 'daily':
                isApplicable = true; amountMultiplier = 30; periodKey = `paid_${expenseYear}_${expenseMonth}_daily`; break;
            case 'weekly':
                isApplicable = true; amountMultiplier = 4; periodKey = `paid_${expenseYear}_${expenseMonth}_weekly`; break;
            case 'monthly':
                isApplicable = true; periodKey = `paid_${expenseYear}_${expenseMonth}_monthly`; break;
            case 'yearly':
                isApplicable = eDate.getMonth() === expenseMonth; periodKey = `paid_${expenseYear}_${expenseMonth}_yearly`; break;
            default: 
                isApplicable = eDate.getFullYear() === expenseYear && eDate.getMonth() === expenseMonth; periodKey = `paid_${e.id}_oneoff`; break;
        }
        
        return { ...e, calculatedAmount: (e.amount || 0) * amountMultiplier, periodKey, isApplicable, displayDate: eDate.getDate() };
     }).filter(e => e.isApplicable).sort((a,b) => a.displayDate - b.displayDate);

     const totalBudget = displayExpenses.reduce((sum, e) => sum + e.calculatedAmount, 0);
     const paidAmount = displayExpenses.reduce((sum, e) => sum + ((e.paidPeriods || []).includes(e.periodKey) ? e.calculatedAmount : 0), 0);
     const unpaidAmount = totalBudget - paidAmount;
     
     return (
        <div className="h-full overflow-y-auto pb-10">
           <div className="flex justify-between items-center mb-4">
               <h2 className="text-2xl font-black text-slate-800">家庭開支</h2>
               <button onClick={() => {setExpenseFormData({recurringPeriod: 'monthly', category: expenseCategories[0], date: formatDate(new Date())}); setShowExpenseModal(true);}} className="bg-indigo-600 text-white p-3 rounded-2xl shadow-lg shadow-indigo-200 active:scale-95"><Plus size={20}/></button>
           </div>
           
           <div className="flex flex-wrap gap-2 mb-6">
               <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-1 shadow-sm">
                   <Filter size={14} className="text-slate-400 mr-2"/>
                   <input type="month" value={`${expenseYear}-${String(expenseMonth+1).padStart(2,'0')}`} onChange={(e) => { const [y, m] = e.target.value.split('-'); setExpenseYear(Number(y)); setExpenseMonth(Number(m)-1); }} className="border-none outline-none font-bold text-slate-700 text-sm bg-transparent cursor-pointer" />
               </div>
               
               {currentUserRole.role === 'admin' && (
                   <select value={expenseViewMember} onChange={e => setExpenseViewMember(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-3 py-1 shadow-sm font-bold text-slate-700 text-sm outline-none">
                       <option value="all">全家綜合開支</option>
                       {members.map(m => <option key={m.id} value={m.id}>{m.name}的開支</option>)}
                   </select>
               )}
           </div>

           <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-indigo-50 rounded-[2rem] p-6 shadow-sm"><span className="text-xs text-indigo-500 font-black uppercase mb-1 flex items-center gap-1"><PieChart size={14}/> 當月預估總計</span><span className="text-3xl font-black text-indigo-900">{formatMoney(totalBudget)}</span></div>
              <div className="bg-green-50 rounded-[2rem] p-6 shadow-sm"><span className="text-xs text-green-500 font-black uppercase mb-1 flex items-center gap-1"><CheckSquare size={14}/> 已付</span><span className="text-3xl font-black text-green-700">{formatMoney(paidAmount)}</span></div>
              <div className="bg-red-50 rounded-[2rem] p-6 shadow-sm"><span className="text-xs text-red-500 font-black uppercase mb-1 flex items-center gap-1"><Wallet size={14}/> 待付</span><span className="text-3xl font-black text-red-600">{formatMoney(unpaidAmount)}</span></div>
           </div>

           <div className="bg-white rounded-[2rem] shadow-sm overflow-hidden border border-slate-100">
               {displayExpenses.length > 0 ? displayExpenses.map((item, idx) => {
                   const isPaid = (item.paidPeriods || []).includes(item.periodKey);
                   const member = members.find(m => m.id === item.memberId) || members[0];
                   return (
                       <div key={item.id} className={`flex items-center justify-between p-5 transition-colors ${idx !== 0 ? 'border-t border-slate-50' : ''} ${isPaid ? 'bg-slate-50/50' : 'bg-white'}`}>
                           <div className="flex items-center gap-4">
                               <button onClick={() => handleToggleExpensePaid(item.id, item.periodKey)} className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all shrink-0 ${isPaid ? 'bg-green-500 text-white shadow-md' : 'bg-slate-100 text-slate-300 hover:bg-slate-200'}`}>{isPaid && <Check size={16} strokeWidth={3}/>}</button>
                               <div onClick={() => {setExpenseFormData(item); setShowExpenseModal(true);}} className="cursor-pointer">
                                   <div className="flex items-center gap-2 mb-0.5">
                                       <span className="text-sm bg-white border border-slate-200 rounded-full w-5 h-5 flex items-center justify-center shadow-sm overflow-hidden" title={member?.name}>{renderAvatar(member?.avatar)}</span>
                                       <span className={`font-black text-lg ${isPaid ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{item.name}</span>
                                   </div>
                                   <div className="text-xs font-bold text-slate-400 flex items-center gap-2">
                                       <span className="flex items-center gap-1"><Repeat size={10}/> {item.recurringPeriod==='monthly'?'每月':item.recurringPeriod==='yearly'?'每年':item.recurringPeriod==='weekly'?'每週':item.recurringPeriod==='daily'?'每日':'單次'} {item.recurringPeriod==='monthly'||item.recurringPeriod==='yearly' ? `${item.displayDate}號` : ''}</span>
                                       <span className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-full text-slate-500"><Tag size={10}/> {item.category}</span>
                                   </div>
                               </div>
                           </div>
                           <div className="text-right">
                               <div className={`font-black text-xl italic ${isPaid ? 'text-slate-300' : 'text-slate-800'}`}>{formatMoney(item.calculatedAmount)}</div>
                               {item.calculatedAmount !== item.amount && <div className="text-[9px] font-bold text-slate-400">(${item.amount}/期)</div>}
                           </div>
                       </div>
                   )
               }) : <div className="text-center text-slate-400 font-bold py-10 italic">當月沒有任何開支紀錄</div>}
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
                  <div className="relative group cursor-pointer">
                      <div className="text-5xl w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center shadow-inner overflow-hidden">{renderAvatar(currentUserRole.avatar)}</div>
                      <label className="absolute inset-0 bg-black/50 rounded-[2rem] flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition cursor-pointer">
                          <Upload size={24}/>
                          <input type="file" className="hidden" accept="image/*" onChange={handleUpdateAvatar} />
                      </label>
                  </div>
                  <div><p className="font-black text-2xl text-slate-800">{currentUserRole.name}</p><p className="text-indigo-500 font-bold text-sm uppercase tracking-widest">{currentUserRole.role}</p></div>
              </div>
          </div>
          {currentUserRole.role === 'admin' && (
              <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-50">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="font-black text-lg">家庭成員與權限管理</h3>
                      <button onClick={() => setShowAddMemberModal(true)} className="text-xs bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-1 shadow-md active:scale-95"><Plus size={14}/> 新增成員</button>
                  </div>
                  <div className="space-y-3">
                      {members.map(m => (
                          <div key={m.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-slate-50 rounded-2xl gap-4 border border-slate-100">
                              <div className="flex items-center gap-4">
                                  <div className="text-3xl bg-white w-12 h-12 rounded-xl flex items-center justify-center shadow-sm shrink-0 overflow-hidden">{renderAvatar(m.avatar)}</div>
                                  <div>
                                      <div className="font-black text-slate-800">{m.name}</div>
                                      <div className="text-[10px] font-bold text-slate-400 uppercase flex gap-1 mt-1 flex-wrap">
                                          {m.role === 'admin' ? <span className="text-indigo-500">管理員全權限</span> : m.permissions?.map(p => <span key={p} className="bg-slate-200 px-1.5 py-0.5 rounded">{p}</span>)}
                                      </div>
                                  </div>
                              </div>
                              <div className="flex items-center gap-2 justify-end">
                                  {m.role !== 'admin' && (
                                      <button onClick={() => { setEditingMember(m); setShowEditPermissionsModal(true); }} className="p-2 bg-white rounded-xl text-slate-400 hover:text-indigo-600 shadow-sm transition"><Shield size={16}/></button>
                                  )}
                                  <button onClick={() => { setTargetMemberId(m.id); setShowChangePasswordModal(true); }} className="p-2 bg-white rounded-xl text-slate-400 hover:text-indigo-600 shadow-sm transition"><Key size={16}/></button>
                              </div>
                          </div>
                      ))}
                  </div>

                  <div className="mt-8 pt-8 border-t border-slate-100">
                      <h3 className="font-black text-lg mb-4 flex items-center gap-2"><Tag size={18} className="text-indigo-500"/> 開支類型設定</h3>
                      <div className="flex flex-wrap gap-2">
                          {expenseCategories.map(c => (
                              <span key={c} className="px-3 py-1.5 bg-slate-100 rounded-full text-xs font-bold text-slate-600 flex items-center gap-1 shadow-sm">
                                  {c} <button onClick={()=>deleteExpCat(c)} className="text-slate-400 hover:text-red-500 ml-1"><X size={12}/></button>
                              </span>
                          ))}
                          <button onClick={addExpCat} className="px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-xs font-black flex items-center gap-1 hover:bg-indigo-100 transition"><Plus size={12}/> 新增類型</button>
                      </div>
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
                    <div className="w-24 h-24 bg-slate-50 rounded-full mx-auto flex items-center justify-center text-5xl mb-6 shadow-inner overflow-hidden">{renderAvatar(loginTarget.avatar)}</div>
                    <h2 className="text-2xl font-black mb-2">{loginTarget.name}</h2>
                    <p className="text-sm font-bold text-slate-400 mb-8">請輸入安全密碼</p>
                    <input type="password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLoginSubmit()} className="w-full bg-slate-50 border-none rounded-2xl p-4 font-black text-center text-2xl tracking-widest focus:ring-2 ring-indigo-500 mb-6" placeholder="******" autoFocus />
                    <div className="flex gap-2"><button onClick={() => {setLoginTarget(null); setPasswordInput('');}} className="flex-1 bg-slate-100 text-slate-500 py-4 rounded-2xl font-black active:scale-95 transition">返回</button><button onClick={handleLoginSubmit} className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-indigo-200 active:scale-95 transition">登入系統</button></div>
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
              <span className="text-5xl drop-shadow-sm w-14 h-14 flex items-center justify-center rounded-full overflow-hidden">{renderAvatar(m.avatar)}</span>
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
              <div className="w-9 h-9 rounded-full bg-slate-50 flex items-center justify-center border border-slate-200 text-lg shadow-sm overflow-hidden">{renderAvatar(currentUserRole.avatar)}</div>
              <button onClick={() => setCurrentUserRole(null)} className="p-2 bg-slate-100 rounded-full text-slate-500 active:scale-90"><LogOut size={16}/></button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-32">
          {activeTab === 'home' && <DashboardView currentUser={currentUserRole} members={members} wallets={wallets} events={events} trips={trips} expenses={expenses} setActiveTab={setActiveTab} />}
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

      <Tooltip hoveredEvent={hoveredEvent} categories={categories} />
      <EventFormModal isOpen={showEventModal} onClose={() => setShowEventModal(false)} onSave={saveEvent} onDelete={deleteItem} initialData={eventFormData} categories={categories} members={members} />
      <ExpenseFormModal isOpen={showExpenseModal} onClose={() => setShowExpenseModal(false)} onSave={saveExpense} onDelete={deleteItem} initialData={expenseFormData} members={members} expenseCategories={expenseCategories} historicalNames={historicalExpenseNames} />
      <TripWizard isOpen={showTripWizard} onClose={() => setShowTripWizard(false)} onFinish={finishTripWizard} members={members} />
      <AddMemberModal isOpen={showAddMemberModal} onClose={() => setShowAddMemberModal(false)} onAdd={handleAddMember} />
      <ChangePasswordModal isOpen={showChangePasswordModal} onClose={() => setShowChangePasswordModal(false)} onConfirm={handleChangePassword} />
      <EditPermissionsModal isOpen={showEditPermissionsModal} onClose={() => setShowEditPermissionsModal(false)} onSave={savePermissions} member={editingMember} />
    </div>
  );
}
