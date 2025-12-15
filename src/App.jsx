import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  setPersistence,
  inMemoryPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  onSnapshot, 
  serverTimestamp, 
} from 'firebase/firestore';
import { 
  Calendar as CalendarIcon, CreditCard, Plane, Settings, Plus, Check, Trash2, User, 
  MapPin, Clock, Edit2, ChevronLeft, ChevronRight, Info, Luggage, Briefcase, 
  Printer, CheckSquare, Square, Weight, Wallet, LogOut, Key, Upload, PieChart, Lock
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

let app;
try {
  app = initializeApp(firebaseConfig);
} catch (e) {}

const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'charles-family-app';

// --- 2. Constants & Helpers ---

const DEFAULT_MEMBERS_SEED = [
    { name: '爸爸 (Charles)', role: 'admin', color: 'bg-blue-100 text-blue-800 border-blue-200', password: '888888', avatar: '👨', permissions: ['calendar', 'expenses', 'travel', 'settings'] },
    { name: '媽媽', role: 'admin', color: 'bg-pink-100 text-pink-800 border-pink-200', password: '888888', avatar: '👩', permissions: ['calendar', 'expenses', 'travel', 'settings'] },
    { name: '女兒 (中五)', role: 'member', color: 'bg-purple-100 text-purple-800 border-purple-200', password: '888888', avatar: '👧', permissions: ['calendar', 'travel'] },
    { name: '兒子 (中一)', role: 'member', color: 'bg-green-100 text-green-800 border-green-200', password: '888888', avatar: '👦', permissions: ['calendar'] },
];

const DEFAULT_CATEGORIES = [
  { id: 'general', name: '一般事務', color: 'bg-gray-100 text-gray-800 border-gray-200', type: 'system' },
  { id: 'expense', name: '家庭開支', color: 'bg-orange-100 text-orange-800 border-orange-200', type: 'system' },
  { id: 'travel', name: '旅行計劃', color: 'bg-blue-100 text-blue-800 border-blue-200', type: 'system' },
  { id: 'school', name: '學校活動', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', type: 'custom' },
  { id: 'competition', name: '外出比賽', color: 'bg-purple-100 text-purple-800 border-purple-200', type: 'custom' },
];

const POPULAR_DESTINATIONS = ['東京, 日本', '大阪, 日本', '台北, 台灣', '首爾, 韓國', '倫敦, 英國', '曼谷, 泰國', '新加坡', '悉尼, 澳洲', '北京, 中國', '上海, 中國', '福岡, 日本', '札幌, 日本'];

const HK_HOLIDAYS = {
  '2025-01-01': '元旦', '2025-01-29': '農曆年初一', '2025-01-30': '農曆年初二', '2025-01-31': '農曆年初三',
  '2025-04-04': '清明節', '2025-04-18': '耶穌受難節', '2025-04-19': '耶穌受難節翌日', '2025-04-21': '復活節一',
  '2025-05-01': '勞動節', '2025-05-05': '佛誕', '2025-05-31': '端午節', '2025-07-01': '特區紀念日',
  '2025-10-01': '國慶', '2025-10-07': '中秋翌日', '2025-10-29': '重陽節', '2025-12-25': '聖誕節', '2025-12-26': '拆禮物日',
};

const LUNAR_DATA = [{ day: 1, text: '初一', ausp: '宜祭祀' }, { day: 15, text: '十五', ausp: '宜祈福' }];

const INITIAL_EXPENSES = [
  { name: '大埔帝欣苑 (供款)', amount: 19038, day: 15, category: '樓宇', bank: 'DBS', type: 'recurring_monthly' },
  { name: '大埔帝欣苑 (管理費)', amount: 2500, day: 15, category: '樓宇', bank: 'DBS', type: 'recurring_monthly' }
];

const formatDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const formatMoney = (amount) => amount ? `HK$${Number(amount).toLocaleString()}` : '-';

const getLunarInfo = (date) => {
  const day = date.getDate();
  const lunarDays = ["初一", "初二", "初三", "初四", "初五", "初六", "初七", "初八", "初九", "初十", "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十", "廿一", "廿二", "廿三", "廿四", "廿五", "廿六", "廿七", "廿八", "廿九", "三十"];
  const idx = (day - 1) % 30;
  return { dayText: lunarDays[idx], auspicious: (day % 15 === 0 || day === 1) ? '宜祭祀' : '' };
};

const getDaysDiff = (start, end) => Math.ceil(Math.abs(new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24)) + 1;
const isDateInRange = (d, s, e) => d >= s && d <= e;

const getLuggageEstimate = (trip) => {
    const days = getDaysDiff(trip.startDate, trip.endDate);
    const personCount = trip.participants.length;
    let totalWeight = Math.round(personCount * (3 + (days * 1.2))); 
    if (trip.destination.includes('日本')) totalWeight += 5; 
    let advice = totalWeight < 10 ? "1個登機箱" : totalWeight < 25 ? "1個24吋 + 背包" : "2個26-28吋";
    return { totalWeight, advice };
};

const calculatePackingProgress = (list) => {
    if (!list) return 0;
    let total = 0, packed = 0;
    (list.shared || []).forEach(i => { total++; if(i.packed) packed++; });
    Object.values(list.individual || {}).forEach(pItems => { pItems.forEach(i => { total++; if(i.packed) packed++; }); });
    return total === 0 ? 0 : Math.round((packed / total) * 100);
};

// --- 3. View Components (Independent) ---

const CalendarView = ({ currentDate, calendarView, events, trips, categories, members, setCalendarView, setCurrentDate, openEventModal }) => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const days = [];

    // Header
    const header = (
        <div className="flex items-center justify-between p-4 border-b bg-white sticky top-0 z-10">
          <div className="flex items-center gap-4"><h2 className="text-xl font-bold text-gray-800">{year}年 {month+1}月</h2><div className="flex bg-gray-100 rounded p-1">{['day','month'].map(v => <button key={v} onClick={() => setCalendarView(v)} className={`px-3 py-1 text-xs rounded capitalize ${calendarView===v?'bg-white shadow text-blue-600 font-bold':'text-gray-500'}`}>{v === 'day' ? '日' : '月'}</button>)}</div></div>
          <div className="flex gap-2"><button onClick={() => setCurrentDate(new Date(year, month-1, 1))} className="p-1 hover:bg-gray-100 rounded"><ChevronLeft/></button><button onClick={() => setCurrentDate(new Date())} className="text-sm px-3 bg-gray-100 rounded hover:bg-gray-200">今天</button><button onClick={() => setCurrentDate(new Date(year, month+1, 1))} className="p-1 hover:bg-gray-100 rounded"><ChevronRight/></button></div>
        </div>
    );

    // Generate Calendar Grid
    for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} className="h-12 bg-gray-50/30 border-r border-b"></div>);
    for (let d = 1; d <= daysInMonth; d++) {
        const dateObj = new Date(year, month, d);
        const dStr = formatDate(dateObj);
        const isToday = formatDate(new Date()) === dStr;
        const isSelected = d === currentDate.getDate();
        const lunar = getLunarInfo(dateObj);
        const dayEvents = events.filter(e => e.date === dStr);
        const hasEvent = dayEvents.length > 0;
        
        days.push(
            <div key={d} onClick={() => { setCurrentDate(dateObj); setCalendarView('day'); }} className={`min-h-[50px] border-r border-b p-1 relative transition-colors cursor-pointer ${isSelected ? 'bg-blue-50 ring-2 ring-inset ring-blue-400' : 'hover:bg-gray-50'} ${isToday ? 'bg-orange-50' : 'bg-white'}`}>
                <div className="flex justify-between items-start">
                    <span className={`text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-orange-500 text-white' : isSelected ? 'text-blue-600' : 'text-gray-700'}`}>{d}</span>
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] text-gray-400 transform scale-90 origin-right">{lunar.dayText}</span>
                    </div>
                </div>
                {/* Event Dot Marker */}
                {hasEvent && <div className="absolute bottom-1 right-1/2 transform translate-x-1/2 w-1.5 h-1.5 bg-blue-500 rounded-full"></div>}
                {/* Desktop View: Show bars */}
                <div className="hidden md:flex flex-col gap-0.5 mt-1">
                    {dayEvents.slice(0, 2).map(ev => {
                         const cat = categories.find(c => c.id === ev.type) || categories[0];
                         return <div key={ev.id} className={`h-1.5 rounded-full ${cat.color.replace('text','bg').split(' ')[0]} opacity-70`}></div>
                    })}
                </div>
            </div>
        );
    }

    if (calendarView === 'day') {
        const selectedDateStr = formatDate(currentDate);
        const dayEvents = events.filter(e => e.date === selectedDateStr).sort((a,b) => a.startTime.localeCompare(b.startTime));
        
        return (
            <div className="flex flex-col h-full bg-white rounded-lg shadow overflow-hidden">
                {header}
                {/* Split View: Top is Mini Calendar */}
                <div className="flex-shrink-0 bg-gray-50 border-b shadow-inner">
                   <div className="grid grid-cols-7 text-center text-xs text-gray-500 py-1 font-bold"><div>日</div><div>一</div><div>二</div><div>三</div><div>四</div><div>五</div><div>六</div></div>
                   <div className="grid grid-cols-7 text-center">{days}</div>
                </div>
                
                {/* Split View: Bottom is Event List */}
                <div className="flex-1 overflow-y-auto p-4 bg-white relative">
                    <div className="flex justify-between items-center mb-4 pb-2 border-b">
                        <div>
                            <h3 className="text-2xl font-bold text-gray-800">{month+1}月{currentDate.getDate()}日</h3>
                            <div className="text-sm text-gray-500">{getLunarInfo(currentDate).dayText} {HK_HOLIDAYS[selectedDateStr]}</div>
                        </div>
                        <button onClick={() => openEventModal({ date: selectedDateStr })} className="bg-blue-600 text-white px-4 py-2 rounded-full shadow hover:bg-blue-700 flex items-center gap-2"><Plus size={16}/> 新增事項</button>
                    </div>

                    {dayEvents.length === 0 ? (
                        <div className="text-center py-10 text-gray-400">
                            <CalendarIcon className="w-12 h-12 mx-auto mb-2 opacity-20"/>
                            <p>今天沒有安排事項</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {dayEvents.map(ev => {
                                const cat = categories.find(c => c.id === ev.type) || categories[0];
                                const isPast = new Date(`${ev.date}T${ev.endTime}`) < new Date();
                                return (
                                    <div key={ev.id} onClick={() => openEventModal(ev)} className={`flex gap-4 p-4 rounded-xl border transition-all hover:shadow-md cursor-pointer ${isPast ? 'bg-gray-100 border-gray-200 opacity-60 grayscale' : 'bg-white border-blue-100 hover:border-blue-300'}`}>
                                        <div className="flex flex-col items-center justify-center w-16 border-r border-gray-200 pr-4">
                                            <span className="text-sm font-bold text-gray-800">{ev.startTime}</span>
                                            <span className="text-xs text-gray-400">{ev.endTime}</span>
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${cat.color}`}>{cat.name}</span>
                                                <h4 className={`font-bold text-lg ${isPast ? 'text-gray-600' : 'text-gray-800'}`}>{ev.title}</h4>
                                            </div>
                                            {ev.notes && <p className="text-sm text-gray-500 mb-2">{ev.notes}</p>}
                                            <div className="flex -space-x-2 overflow-hidden">
                                                {ev.participants?.map(pid => {
                                                    const m = members.find(mem => mem.id === pid);
                                                    return m ? (
                                                        <div key={pid} className="w-6 h-6 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-xs overflow-hidden" title={m.name}>
                                                            {m.avatar.startsWith('data:') ? <img src={m.avatar} className="w-full h-full object-cover"/> : m.avatar}
                                                        </div>
                                                    ) : null;
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Default Month View
    return (
      <div className="bg-white rounded-lg shadow h-full flex flex-col">
        {header}
        <div className="grid grid-cols-7 border-b bg-gray-50 text-center py-2 text-sm font-bold text-gray-500"><div>日</div><div>一</div><div>二</div><div>三</div><div>四</div><div>五</div><div>六</div></div>
        <div className="grid grid-cols-7 flex-1 overflow-y-auto bg-gray-100/50">{days}</div>
      </div>
    );
};

const ExpensesView = ({ expenses, openExpenseModal, handleToggleExpensePaid, deleteItem, currentUserRole }) => {
     if (!currentUserRole.permissions?.includes('expenses') && currentUserRole.role !== 'admin') {
         return <div className="h-full flex flex-col items-center justify-center text-gray-400"><Lock className="w-12 h-12 mb-2"/><p>您沒有權限查看家庭開支</p></div>;
     }
     const currentMonthIndex = new Date().getMonth(); const currentYear = new Date().getFullYear(); const currentMonthKey = `paid_${currentYear}_${currentMonthIndex}`;
     const monthlyExpenses = expenses.filter(e => { if (e.type === 'recurring_monthly') return true; if (e.type === 'recurring_yearly' && e.month === (currentMonthIndex + 1)) return true; return false; });
     const totalBudget = monthlyExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
     const paidAmount = monthlyExpenses.reduce((sum, e) => { const isPaid = (e.paidMonths || []).includes(currentMonthKey); return sum + (isPaid ? (e.amount || 0) : 0); }, 0);
     const unpaidAmount = totalBudget - paidAmount;
     const grouped = { '樓宇': { icon: Home, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', items: [] }, '信用卡': { icon: CreditCard, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', items: [] }, '保險': { icon: Shield, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', items: [] }, '日常': { icon: Zap, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', items: [] }, '貸款': { icon: DollarSign, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', items: [] }, '其他': { icon: Info, color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200', items: [] } };
     expenses.forEach(e => { const cat = Object.keys(grouped).find(k => e.category.includes(k)) || '其他'; grouped[cat].items.push(e); });
     return (
        <div className="bg-white rounded-lg shadow h-full overflow-y-auto p-6">
           <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-bold flex items-center gap-2"><CreditCard/> 家庭開支</h2><button onClick={() => openExpenseModal()} className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 shadow hover:bg-blue-700 transition"><Plus size={16}/> 新增</button></div>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 shadow-sm flex flex-col"><span className="text-xs text-blue-500 font-bold uppercase mb-1 flex items-center gap-1"><PieChart size={12}/> 本月總預算</span><span className="text-2xl font-bold text-blue-900">{formatMoney(totalBudget)}</span></div>
              <div className="bg-green-50 border border-green-100 rounded-xl p-4 shadow-sm flex flex-col"><span className="text-xs text-green-500 font-bold uppercase mb-1 flex items-center gap-1"><CheckSquare size={12}/> 已付金額</span><span className="text-2xl font-bold text-green-700">{formatMoney(paidAmount)}</span></div>
              <div className="bg-red-50 border border-red-100 rounded-xl p-4 shadow-sm flex flex-col"><span className="text-xs text-red-500 font-bold uppercase mb-1 flex items-center gap-1"><Wallet size={12}/> 待付金額</span><span className="text-2xl font-bold text-red-600">{formatMoney(unpaidAmount)}</span></div>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(grouped).map(([key, group]) => { if (group.items.length === 0) return null; const paidCount = group.items.filter(i => (i.paidMonths||[]).includes(currentMonthKey)).length; const progress = Math.round((paidCount / group.items.length) * 100); return (
                    <div key={key} className={`rounded-xl border ${group.border} overflow-hidden shadow-sm hover:shadow-md transition-shadow`}><div className={`p-4 ${group.bg} flex justify-between items-center border-b ${group.border}`}><h3 className={`font-bold text-lg flex items-center gap-2 ${group.color}`}><group.icon size={20}/> {key}</h3><div className="text-xs font-bold bg-white px-2 py-1 rounded shadow-sm">{paidCount}/{group.items.length} 已付</div></div><div className="h-1 w-full bg-gray-100"><div className={`h-1 transition-all duration-500 ${group.color.replace('text','bg')}`} style={{width: `${progress}%`}}></div></div>
                       <div className="p-2">{group.items.map(item => { const isPaid = (item.paidMonths || []).includes(currentMonthKey); return (<div key={item.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg group"><div className="flex items-center gap-3"><button onClick={() => handleToggleExpensePaid(item.id)} className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isPaid ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-green-500'}`}>{isPaid && <Check size={12}/>}</button><div><div className={`font-medium text-sm ${isPaid ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{item.name}</div><div className="text-xs text-gray-500 flex items-center gap-2"><span>{item.day}號</span></div></div></div><div className="text-right"><div className="font-mono font-bold text-sm">{formatMoney(item.amount)}</div><div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => openExpenseModal(item)} className="text-blue-500 hover:text-blue-700"><Edit2 size={12}/></button><button onClick={() => deleteItem('expenses', item.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={12}/></button></div></div></div>)})}</div></div>
                 );})}
           </div>
        </div>
     );
};

const SettingsView = ({ currentUserRole, members, categories, handleLogout, setShowAddMemberModal, setTargetMemberId, setShowChangePasswordModal, handleUpdateCategory, setCategories }) => (
    <div className="max-w-3xl mx-auto bg-white rounded-lg shadow p-8 overflow-y-auto">
      <h2 className="text-2xl font-bold mb-8 flex items-center gap-2"><Settings/> 系統設定</h2>
      <section className="mb-8"><h3 className="font-bold text-gray-700 mb-4 border-b pb-2">當前登入</h3><div className="flex items-center justify-between bg-blue-50 p-4 rounded-xl border border-blue-100"><div className="flex items-center gap-3"><div className={`w-12 h-12 rounded-full flex items-center justify-center text-3xl overflow-hidden ${currentUserRole.color}`}>{currentUserRole.avatar.startsWith('data:') ? <img src={currentUserRole.avatar} className="w-full h-full object-cover"/> : currentUserRole.avatar}</div><div><div className="font-bold text-gray-800">{currentUserRole.name}</div><div className="text-xs text-gray-500">{currentUserRole.role === 'admin' ? '管理員' : '一般成員'}</div></div></div><button onClick={handleLogout} className="flex items-center gap-2 text-red-500 hover:text-red-700 text-sm font-bold bg-white px-4 py-2 rounded shadow-sm"><LogOut size={16}/> 登出</button></div></section>
      <section className="mb-8"><div className="flex justify-between items-center mb-4 border-b pb-2"><h3 className="font-bold text-gray-700">家庭成員管理</h3>{currentUserRole.role === 'admin' && (<button onClick={() => setShowAddMemberModal(true)} className="text-sm bg-blue-600 text-white px-3 py-1 rounded flex items-center gap-1 hover:bg-blue-700"><Plus size={14}/> 新增成員</button>)}</div>
        <div className="space-y-2">{members.map(m => (<div key={m.id} className="flex items-center justify-between p-3 bg-gray-50 rounded"><div className="flex items-center gap-3"><div className={`w-10 h-10 rounded-full flex items-center justify-center text-2xl overflow-hidden ${m.color}`}>{m.avatar.startsWith('data:') ? <img src={m.avatar} className="w-full h-full object-cover"/> : m.avatar}</div><div><div className="font-bold text-gray-800">{m.name}</div><div className="text-xs text-gray-500">{m.role === 'admin' ? '管理員' : '一般成員'}</div></div></div>{currentUserRole.role === 'admin' && (<div className="flex gap-2"><button onClick={() => { setTargetMemberId(m.id); setShowChangePasswordModal(true); }} className="text-xs bg-white border border-gray-200 px-3 py-1.5 rounded text-gray-600 hover:bg-gray-100 flex items-center gap-1"><Key size={12}/> 重設密碼</button></div>)}</div>))}</div>
      </section>
      <section className="mb-8"><div className="flex justify-between items-center mb-4 border-b pb-2"><h3 className="font-bold text-gray-700">日曆項目分類 (Highlight)</h3><button onClick={() => handleUpdateCategory({ name: '新分類', color: 'bg-gray-100 text-gray-800 border-gray-200' })} className="text-sm text-blue-600 flex items-center gap-1"><Plus size={14}/> 新增</button></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{categories.map(c => (<div key={c.id} className={`p-3 rounded border flex justify-between items-center ${c.color}`}><div className="font-bold w-full">{c.name}</div>{c.type === 'custom' && (<div className="flex items-center gap-2"><button className="text-gray-400 hover:text-red-500" onClick={() => setCategories(categories.filter(x => x.id !== c.id))}><Trash2 size={14}/></button></div>)}</div>))}</div></section>
    </div>
);

const TravelView = ({ trips, openTripWizard, setShowPrintPreview, calculatePackingProgress, setEditingItem, setShowTripEditModal, currentUserRole }) => {
    if (!currentUserRole.permissions?.includes('travel') && currentUserRole.role !== 'admin') {
        return <div className="h-full flex flex-col items-center justify-center text-gray-400"><Lock className="w-12 h-12 mb-2"/><p>您沒有權限查看旅行計劃</p></div>;
    }
    return (
      <div className="space-y-6"><div className="flex justify-between items-center"><h2 className="text-2xl font-bold flex items-center gap-2"><Plane/> 旅行計劃</h2><button onClick={openTripWizard} className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 flex items-center gap-2"><Plus size={16}/> 新行程</button></div><div className="grid grid-cols-1 lg:grid-cols-2 gap-6">{trips.map(trip => (<div key={trip.id} className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100 flex flex-col"><div className="p-5 border-b bg-gradient-to-r from-blue-50 to-white flex justify-between items-start"><div><h3 className="text-xl font-bold text-gray-800 flex items-center gap-2"><MapPin size={20} className="text-red-500"/> {trip.destination}</h3><div className="text-sm text-gray-500 mt-1">{trip.startDate} - {trip.endDate} ({getDaysDiff(trip.startDate, trip.endDate)}天)</div></div><div className="flex gap-2"><button onClick={() => setShowPrintPreview({ trip })} className="p-2 bg-white border rounded hover:bg-gray-50 text-gray-600" title="列印報告"><Printer size={16}/></button></div></div><div className="p-5 flex-1 bg-gray-50/50"><div className="flex justify-between items-center mb-4"><span className="font-bold text-gray-700 flex items-center gap-2"><Luggage size={16}/> 行李進度</span><span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-1 rounded">{calculatePackingProgress(trip.packingList)}%</span></div><div className="w-full bg-gray-200 rounded-full h-2 mb-4"><div className="bg-green-500 h-2 rounded-full transition-all duration-500" style={{width: `${calculatePackingProgress(trip.packingList)}%`}}></div></div><button onClick={() => { setEditingItem(trip); setShowTripEditModal(true); }} className="w-full py-2 bg-white border border-blue-200 text-blue-600 rounded font-medium hover:bg-blue-50 shadow-sm">開始執行李 / 編輯清單</button></div></div>))}</div></div>
    );
};

const LoginScreen = ({ members, onLogin }) => {
    const [selectedMember, setSelectedMember] = useState(null);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLoginSubmit = () => {
        if (password === selectedMember.password) {
            onLogin(selectedMember);
        } else {
            setError('密碼錯誤');
        }
    };

    if (selectedMember) {
        return (
            <div className="h-screen flex items-center justify-center bg-gray-100 p-4">
                <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-sm text-center">
                    <div className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center text-5xl font-bold mb-4 ${selectedMember.color} overflow-hidden border-4 border-white shadow-md`}>
                        {selectedMember.avatar.startsWith('data:') ? <img src={selectedMember.avatar} alt={selectedMember.name} className="w-full h-full object-cover"/> : selectedMember.avatar}
                    </div>
                    <h2 className="text-2xl font-bold mb-6">歡迎, {selectedMember.name.split(' ')[0]}</h2>
                    <input type="password" className="w-full text-center border-2 border-gray-300 rounded-lg p-3 text-lg tracking-widest focus:border-blue-500 outline-none mb-4" placeholder="輸入密碼 (預設 888888)" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLoginSubmit()} />
                    {error && <div className="text-red-500 text-sm mb-4">{error}</div>}
                    <button onClick={handleLoginSubmit} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 mb-3">登入</button>
                    <button onClick={() => { setSelectedMember(null); setError(''); setPassword(''); }} className="text-gray-500 text-sm">返回選擇使用者</button>
                </div>
            </div>
        );
    }
    return (
        <div className="h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
           <div className="text-center mb-10">
               <div className="w-24 h-24 mx-auto mb-4 rounded-3xl shadow-lg overflow-hidden bg-white">
                   <img src="/app-icon.png" alt="Charles Family" className="w-full h-full object-cover" onError={(e)=>{e.target.style.display='none'; e.target.nextSibling.style.display='flex'}}/>
                   <div className="w-full h-full flex items-center justify-center bg-blue-600 text-white text-5xl font-bold" style={{display: 'none'}}>C</div>
               </div>
               <h1 className="text-3xl font-bold text-gray-800">Charles Family App</h1>
               <p className="text-gray-500">請選擇您的身分登入</p>
           </div>
           <div className="grid grid-cols-2 gap-4 w-full max-w-md">
              {members.map(m => (
                  <button key={m.id} onClick={() => setSelectedMember(m)} className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md border border-transparent hover:border-blue-200 transition-all flex flex-col items-center gap-3">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center text-4xl font-bold ${m.color} overflow-hidden shadow-inner`}>
                          {m.avatar.startsWith('data:') ? <img src={m.avatar} alt={m.name} className="w-full h-full object-cover"/> : m.avatar}
                      </div>
                      <span className="font-bold text-gray-700">{m.name.split(' ')[0]}</span>
                  </button>
              ))}
           </div>
        </div>
    );
};

const AddMemberModal = ({ isOpen, onClose, onAdd }) => {
    if(!isOpen) return null;
    const [name, setName] = useState(''); const [role, setRole] = useState('member'); const [avatar, setAvatar] = useState('🧑');
    const [permissions, setPermissions] = useState({ calendar: true, expenses: false, travel: false, settings: false });

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 50 * 1024) { alert("圖片過大，請選擇小於 50KB 的圖片"); return; }
            const reader = new FileReader();
            reader.onloadend = () => setAvatar(reader.result);
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
            <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-sm max-h-[80vh] overflow-y-auto">
                <h3 className="font-bold text-lg mb-4">新增家庭成員</h3>
                <div className="mb-4">
                  <label className="block text-xs text-gray-500 mb-2">頭像</label>
                  <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-2xl overflow-hidden border">
                          {avatar.startsWith('data:') ? <img src={avatar} className="w-full h-full object-cover"/> : avatar}
                      </div>
                      <label className="cursor-pointer bg-blue-50 text-blue-600 px-3 py-1 rounded text-xs flex items-center gap-1">
                          <Upload size={12}/> 上載圖片 <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload}/>
                      </label>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-2">{['👨','👩','👧','👦','👴','👵'].map(a=><button key={a} onClick={()=>setAvatar(a)} className={`text-xl p-1.5 rounded ${avatar===a?'bg-blue-100 ring-1 ring-blue-400':''}`}>{a}</button>)}</div>
              </div>
                <input className="w-full border p-2 rounded mb-4" placeholder="名稱 (例如: 爺爺)" value={name} onChange={e => setName(e.target.value)} />
                <select className="w-full border p-2 rounded mb-4" value={role} onChange={e => setRole(e.target.value)}><option value="member">一般成員</option><option value="admin">管理員</option></select>
                {role !== 'admin' && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <label className="block text-xs font-bold mb-2 text-gray-600">側邊欄權限</label>
                      <div className="grid grid-cols-2 gap-2">
                          {Object.keys(permissions).map(p => (
                              <label key={p} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={permissions[p]} onChange={e => setPermissions({...permissions, [p]: e.target.checked})} /><span className="capitalize">{p === 'calendar' ? '日曆' : p === 'expenses' ? '開支' : p === 'travel' ? '旅行' : '設定'}</span></label>
                          ))}
                      </div>
                  </div>
              )}
                <div className="text-xs text-gray-500 mb-4">預設密碼為 888888</div>
                <div className="flex gap-2 justify-end"><button onClick={onClose} className="px-4 py-2 bg-gray-100 rounded">取消</button><button onClick={() => onAdd({name, role, avatar, permissions: role === 'admin' ? ['calendar','expenses','travel','settings'] : Object.keys(permissions).filter(k=>permissions[k]), color: 'bg-gray-100 text-gray-800'})} disabled={!name} className="px-4 py-2 bg-blue-600 text-white rounded font-bold">確認新增</button></div>
            </div>
        </div>
    );
};

// ... (Other Modals: ChangePasswordModal, etc. same as before, ensuring they are defined here)
const ChangePasswordModal = ({ isOpen, onClose, onConfirm }) => {
    if(!isOpen) return null;
    const [pwd, setPwd] = useState('');
    return (<div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"><div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-sm"><h3 className="font-bold text-lg mb-4">重設密碼</h3><input className="w-full border p-2 rounded text-center tracking-widest mb-4" placeholder="新密碼" value={pwd} onChange={e => setPwd(e.target.value)} /><div className="flex gap-2 justify-end"><button onClick={onClose} className="px-4 py-2 bg-gray-100 rounded">取消</button><button onClick={() => onConfirm(pwd)} disabled={!pwd} className="px-4 py-2 bg-blue-600 text-white rounded font-bold">確認修改</button></div></div></div>);
};

const PrintPreview = ({ trip, onClose }) => {
    if (!trip) return null;
    const estimate = getLuggageEstimate(trip);
    return (<div className="fixed inset-0 bg-gray-800/90 z-[100] overflow-y-auto"><div className="min-h-screen flex items-center justify-center p-4"><div className="bg-white w-full max-w-4xl min-h-[80vh] rounded shadow-2xl overflow-hidden flex flex-col"><div className="bg-gray-100 p-4 border-b flex justify-between items-center print:hidden"><h3 className="font-bold flex items-center gap-2"><Printer/> 報告預覽</h3><div className="flex gap-2"><button onClick={() => window.print()} className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-700"><Printer size={16}/> 列印報告</button><button onClick={onClose} className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400">關閉</button></div></div><div className="p-10 bg-white text-gray-800 print:p-0"><div className="border-b-2 border-blue-600 pb-4 mb-8 flex justify-between items-end"><div><h1 className="text-3xl font-bold text-blue-900 mb-2">旅行行程與執行李報告</h1><div className="text-gray-500">Charles Family App • 自動生成</div></div><div className="text-right"><div className="text-2xl font-bold">{trip.destination}</div><div className="text-gray-600">{trip.startDate} 至 {trip.endDate}</div></div></div><div className="grid grid-cols-2 gap-8 mb-8"><div className="bg-gray-50 p-6 rounded-lg border"><h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Info size={20}/> 行程概覽</h3><div className="space-y-2"><div className="flex justify-between border-b pb-1"><span>天數</span> <span className="font-bold">{getDaysDiff(trip.startDate, trip.endDate)} 天</span></div><div className="flex justify-between border-b pb-1"><span>交通</span> <span className="font-bold">{trip.arrivalType} ({trip.arrivalDetail})</span></div><div className="flex justify-between border-b pb-1"><span>當地</span> <span className="font-bold">{trip.localTransport}</span></div><div className="flex justify-between border-b pb-1"><span>住宿</span> <span className="font-bold">{trip.hotelStar}星 ({trip.hotelType})</span></div><div className="flex justify-between border-b pb-1"><span>人數</span> <span className="font-bold">{trip.participants.length} 人</span></div><div className="flex justify-between pt-2"><span className="flex items-center gap-1"><Weight size={16}/> 預估重量</span> <span className="font-bold text-blue-600">{estimate.totalWeight} kg</span></div></div></div><div className="bg-orange-50 p-6 rounded-lg border border-orange-100"><h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Luggage size={20}/> 共用物品清單</h3><ul className="list-disc pl-5 space-y-1">{trip.packingList?.shared?.map((item, i) => (<li key={i} className="text-sm">{item.name} <span className="text-gray-400">x{item.qty}</span></li>))}</ul></div></div></div></div></div></div>);
};

const PackingMode = ({ trip, onClose, onToggleItem, members }) => {
     const estimate = getLuggageEstimate(trip);
     const progress = calculatePackingProgress(trip.packingList);
     return (<div className="fixed inset-0 bg-white z-50 flex flex-col"><div className="bg-blue-600 text-white p-4 flex justify-between items-center shadow-md"><div><h2 className="text-xl font-bold flex items-center gap-2"><Briefcase/> 執行李模式: {trip.destination}</h2><div className="text-blue-100 text-sm mt-1">{trip.startDate} 出發 • 完成度 {progress}%</div></div><button onClick={onClose} className="bg-blue-700 p-2 rounded hover:bg-blue-800"><X/></button></div><div className="flex-1 overflow-hidden flex flex-col md:flex-row"><div className="w-full md:w-80 bg-gray-50 p-6 border-r overflow-y-auto"><div className="bg-white p-4 rounded-xl shadow-sm mb-6"><h3 className="text-gray-500 text-xs font-bold uppercase mb-2">AI 智能分析</h3><div className="bg-blue-50 p-3 rounded text-sm text-blue-800 border border-blue-100"><div className="font-bold mb-1 flex items-center gap-1"><Luggage size={14}/> 建議</div>{estimate.advice}</div></div></div><div className="flex-1 overflow-y-auto p-6 md:p-10"><div className="mb-8"><h3 className="font-bold text-xl mb-4 text-orange-600 flex items-center gap-2">共用物品</h3><div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{trip.packingList?.shared?.map((item, i) => (<div key={i} onClick={() => onToggleItem(trip, 'shared', i)} className={`p-3 rounded border cursor-pointer flex items-center gap-3 transition-all ${item.packed ? 'bg-green-50 border-green-200 opacity-60' : 'bg-white hover:border-blue-300'}`}>{item.packed ? <CheckSquare className="text-green-500"/> : <Square className="text-gray-300"/>}<div className="flex-1">{item.name}</div><span className="text-xs bg-gray-100 px-2 py-1 rounded">x{item.qty}</span></div>))}</div></div>{Object.entries(trip.packingList?.individual || {}).map(([uid, items]) => { const m = members.find(mem => mem.id === uid); if(!m) return null; return (<div key={uid} className="mb-8"><h3 className={`font-bold text-xl mb-4 flex items-center gap-2 p-2 rounded w-fit ${m.color}`}><User size={20}/> {m.name}</h3><div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{items.map((item, i) => (<div key={i} onClick={() => onToggleItem(trip, 'individual', i, uid)} className={`p-3 rounded border cursor-pointer flex items-center gap-3 transition-all ${item.packed ? 'bg-green-50 border-green-200 opacity-60' : 'bg-white hover:border-blue-300'}`}>{item.packed ? <CheckSquare className="text-green-500"/> : <Square className="text-gray-300"/>}<div className="flex-1">{item.name}</div></div>))}</div></div>); })}</div></div></div>);
};

const EventFormModal = ({ isOpen, onClose, onSave, onDelete, initialData, categories, members }) => {
    const [formData, setFormData] = useState(initialData);
    useEffect(() => { setFormData(initialData); }, [initialData]);
    if (!isOpen) return null;
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"><div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6"><h3 className="text-lg font-bold mb-4">{formData?.id ? '修改日程' : '新增日程'}</h3><div className="space-y-4"><input className="w-full border rounded p-2 font-bold" placeholder="標題" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} /><div><label className="text-xs text-gray-500 mb-1 block">分類</label><div className="flex flex-wrap gap-2">{categories.map(cat => (<button key={cat.id} onClick={() => setFormData({...formData, type: cat.id})} className={`px-3 py-1 text-xs rounded border ${formData.type === cat.id ? `${cat.color} font-bold` : 'text-gray-500'}`}>{cat.name}</button>))}</div></div><div className="flex gap-2"><input type="date" className="w-full border rounded p-2" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} /><input type="time" className="w-full border rounded p-2" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} /></div><div><label className="text-xs text-gray-500">參與者</label><div className="flex flex-wrap gap-2">{members.map(m => (<button key={m.id} onClick={() => { const newP = formData.participants.includes(m.id) ? formData.participants.filter(p => p !== m.id) : [...formData.participants, m.id]; setFormData({...formData, participants: newP}); }} className={`px-2 py-1 rounded text-xs border ${formData.participants.includes(m.id) ? `${m.color}` : 'bg-gray-50'}`}>{m.name.split(' ')[0]}</button>))}</div></div><textarea className="w-full border rounded p-2 h-20 text-sm" placeholder="備註..." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})}></textarea><div className="flex gap-2 pt-2">{formData?.id && <button onClick={() => onDelete('events', formData.id)} className="px-4 py-2 text-red-500 border rounded"><Trash2/></button>}<button onClick={onClose} className="flex-1 px-4 py-2 bg-gray-100 rounded">取消</button><button onClick={() => onSave(formData)} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded">儲存</button></div></div></div></div>
    );
};

const ExpenseFormModal = ({ isOpen, onClose, onSave, onDelete, initialData, historicalNames }) => {
    const [formData, setFormData] = useState(initialData);
    useEffect(() => { setFormData(initialData); }, [initialData]);
    if (!isOpen) return null;
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"><div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6"><h3 className="text-lg font-bold mb-4">{formData?.id ? '修改開支' : '新增開支'}</h3><div className="space-y-3"><div><label className="text-xs text-gray-500">項目名稱</label><input list="expense-names" className="w-full border rounded p-2" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="例如：大埔帝欣苑..."/><datalist id="expense-names">{historicalNames.map((n, i) => <option key={i} value={n}/>)}</datalist></div><div><label className="text-xs text-gray-500 mb-1 block">頻率</label><div className="flex gap-2"><button onClick={() => setFormData({...formData, type: 'recurring_monthly'})} className={`flex-1 py-1 text-xs rounded border ${formData.type === 'recurring_monthly' ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold' : 'bg-white text-gray-600'}`}>每月 (Monthly)</button><button onClick={() => setFormData({...formData, type: 'recurring_yearly'})} className={`flex-1 py-1 text-xs rounded border ${formData.type === 'recurring_yearly' ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold' : 'bg-white text-gray-600'}`}>每年 (Yearly)</button></div></div><div className="grid grid-cols-2 gap-3"><div><label className="text-xs text-gray-500">金額</label><input type="number" className="w-full border rounded p-2" value={formData.amount} onChange={e => setFormData({...formData, amount: Number(e.target.value)})} /></div>{formData.type === 'recurring_yearly' ? (<div className="flex gap-2"><div className="flex-1"><label className="text-xs text-gray-500">月份</label><input type="number" min="1" max="12" className="w-full border rounded p-2" value={formData.month} onChange={e => setFormData({...formData, month: Number(e.target.value)})} /></div><div className="flex-1"><label className="text-xs text-gray-500">日期</label><input type="number" min="1" max="31" className="w-full border rounded p-2" value={formData.day} onChange={e => setFormData({...formData, day: Number(e.target.value)})} /></div></div>) : (<div><label className="text-xs text-gray-500">每月扣數日</label><input type="number" className="w-full border rounded p-2" value={formData.day} onChange={e => setFormData({...formData, day: Number(e.target.value)})} /></div>)}</div><div className="grid grid-cols-2 gap-3"><div><label className="text-xs text-gray-500">類別</label><select className="w-full border rounded p-2" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>{['樓宇','信用卡','保險','日常','貸款','其他'].map(c => <option key={c}>{c}</option>)}</select></div><div><label className="text-xs text-gray-500">銀行</label><input className="w-full border rounded p-2" value={formData.bank} onChange={e => setFormData({...formData, bank: e.target.value})}/></div></div><div className="flex gap-2 pt-4">{formData?.id && <button onClick={() => onDelete('expenses', formData.id)} className="px-4 py-2 text-red-500 border rounded"><Trash2/></button>}<button onClick={onClose} className="flex-1 px-4 py-2 bg-gray-100 rounded">取消</button><button onClick={() => onSave(formData)} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded">儲存</button></div></div></div></div>
    );
};

const TripWizard = ({ isOpen, onClose, onFinish, members }) => {
    if (!isOpen) return null;
    const [data, setData] = useState({ arrivalType: 'Flight', arrivalDetail: '直飛', localTransport: '公共交通', destination: '', startDate: formatDate(new Date()), endDate: formatDate(new Date(Date.now() + 5*86400000)), participants: members.map(m=>m.id), hotelStar: 4, hotelType: 'City Hotel' });
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"><div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg"><h3 className="font-bold text-lg mb-4">新增旅行計劃</h3><div className="space-y-4"><div><label className="block text-xs font-bold mb-1">目的地</label><input className="border w-full p-2 rounded mb-2" value={data.destination} onChange={e => setData({...data, destination: e.target.value})} placeholder="例如: 東京"/><div className="flex flex-wrap gap-2">{POPULAR_DESTINATIONS.map(city => (<button key={city} onClick={() => setData({...data, destination: city.split(',')[0]})} className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded text-gray-600">{city.split(',')[0]}</button>))}</div></div><div className="flex gap-4"><div className="flex-1"><label className="block text-xs font-bold mb-1">出發</label><input type="date" className="border w-full p-2 rounded" value={data.startDate} onChange={e => setData({...data, startDate: e.target.value})}/></div><div className="flex-1"><label className="block text-xs font-bold mb-1">回程</label><input type="date" className="border w-full p-2 rounded" value={data.endDate} onChange={e => setData({...data, endDate: e.target.value})}/></div></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-bold mb-1">往返交通</label><select className="border w-full p-2 rounded" value={data.arrivalType} onChange={e => setData({...data, arrivalType: e.target.value})}><option value="Flight">飛機</option><option value="Train">高鐵</option></select></div><div><label className="block text-xs font-bold mb-1">細節</label><select className="border w-full p-2 rounded" value={data.arrivalDetail} onChange={e => setData({...data, arrivalDetail: e.target.value})}><option>直飛/直達</option><option>轉機/轉車</option></select></div></div><div><label className="block text-xs font-bold mb-1">當地出行</label><select className="border w-full p-2 rounded" value={data.localTransport} onChange={e => setData({...data, localTransport: e.target.value})}><option>公共交通</option><option>自駕</option><option>包車</option></select></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-bold mb-1">星級</label><input type="number" className="border w-full p-2 rounded" value={data.hotelStar} onChange={e => setData({...data, hotelStar: parseInt(e.target.value)})}/></div><div><label className="block text-xs font-bold mb-1">類型</label><select className="border w-full p-2 rounded" value={data.hotelType} onChange={e => setData({...data, hotelType: e.target.value})}><option value="City Hotel">酒店</option><option value="Resort">度假村</option></select></div></div><button onClick={() => onFinish(data)} className="w-full bg-blue-600 text-white py-3 rounded font-bold mt-4">建立行程與清單</button><button onClick={onClose} className="w-full text-gray-500 py-2">取消</button></div></div></div>
    );
};

// --- Main App Component ---
export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('calendar');
  const [authError, setAuthError] = useState(null);
  const [members, setMembers] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [currentUserRole, setCurrentUserRole] = useState(null); 
  const [events, setEvents] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState('month'); 
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [hoveredEvent, setHoveredEvent] = useState(null); 

  const [showEventModal, setShowEventModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showTripWizard, setShowTripWizard] = useState(false);
  const [showTripEditModal, setShowTripEditModal] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(null);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  
  const [editingItem, setEditingItem] = useState(null);
  const [targetMemberId, setTargetMemberId] = useState(null);
  const [eventFormData, setEventFormData] = useState({});
  const [expenseFormData, setExpenseFormData] = useState({});

  const [loginTargetMember, setLoginTargetMember] = useState(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  // Styles
  useEffect(() => {
    const script = document.createElement('script'); script.src = "https://cdn.tailwindcss.com"; script.async = true; document.head.appendChild(script);
    const style = document.createElement('style'); style.innerHTML = `body { font-family: system-ui, -apple-system, sans-serif; background: #f3f4f6; } .flex { display: flex; } .hidden { display: none; }`;
    document.head.appendChild(style);
  }, []);

  // Auth
  useEffect(() => {
    const initAuth = async () => {
      try { try { await setPersistence(auth, browserLocalPersistence); } catch (e) { await setPersistence(auth, inMemoryPersistence); } await signInAnonymously(auth); } catch (err) { setAuthError(err.message); setLoading(false); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => { setUser(u); if(u) setAuthError(null); });
    return () => unsubscribe();
  }, []);

  // Data
  useEffect(() => {
    if (!user) return;
    const unsubMembers = onSnapshot(query(collection(db, 'artifacts', appId, 'users', user.uid, 'members')), (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (data.length === 0) DEFAULT_MEMBERS_SEED.forEach(async (m) => addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'members'), { ...m, createdAt: serverTimestamp() }));
        else setMembers(data);
        setLoading(false);
    });
    const unsubEvents = onSnapshot(query(collection(db, 'artifacts', appId, 'users', user.uid, 'events')), (snap) => setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubExpenses = onSnapshot(query(collection(db, 'artifacts', appId, 'users', user.uid, 'expenses')), (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setExpenses(data);
        if (data.length === 0) INITIAL_EXPENSES.forEach(e => addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'expenses'), { ...e, createdAt: serverTimestamp() }));
    });
    const unsubTrips = onSnapshot(query(collection(db, 'artifacts', appId, 'users', user.uid, 'trips')), (snap) => setTrips(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { unsubMembers(); unsubEvents(); unsubExpenses(); unsubTrips(); };
  }, [user]);

  // Handlers
  const handleLogin = () => { if (passwordInput === loginTargetMember.password) { setCurrentUserRole(loginTargetMember); setLoginTargetMember(null); setPasswordInput(''); setLoginError(''); } else { setLoginError('密碼錯誤'); } };
  const handleLogout = () => setCurrentUserRole(null);
  const handleAddMember = async (newMember) => { await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'members'), { ...newMember, password: '888888', createdAt: serverTimestamp() }); setShowAddMemberModal(false); };
  const handleChangePassword = async (newPassword) => { if (!targetMemberId || !newPassword) return; await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'members', targetMemberId), { password: newPassword }); setShowChangePasswordModal(false); };
  const deleteItem = async (collectionName, id) => { if (confirm('確定刪除?')) { await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, collectionName, id)); if (collectionName === 'trips') setShowTripEditModal(false); if (collectionName === 'events') setShowEventModal(false); if (collectionName === 'expenses') setShowExpenseModal(false); } };
  
  const openEventModal = (item) => { setEditingItem(item); setEventFormData({ title: item?.title || '', type: item?.type || 'general', date: item?.date || formatDate(selectedDate), startTime: item?.startTime || '09:00', endTime: item?.endTime || '10:00', participants: item?.participants || members.map(m=>m.id), notes: item?.notes || '' }); setShowEventModal(true); };
  const openExpenseModal = (item) => { setEditingItem(item); setExpenseFormData({ name: item?.name || '', amount: item?.amount || '', day: item?.day || 1, month: item?.month || 1, category: item?.category || '日常', bank: item?.bank || '', type: item?.type || 'recurring_monthly' }); setShowExpenseModal(true); };
  const openTripWizard = () => { setTripWizardData({ arrivalType: 'Flight', arrivalDetail: '直飛', localTransport: '公共交通', destination: '', startDate: formatDate(new Date()), endDate: formatDate(new Date(Date.now() + 5*86400000)), participants: members.map(m => m.id), hotelStar: 4, hotelType: 'City Hotel' }); setShowTripWizard(true); };
  const handleUpdateCategory = (newCat) => { if (newCat.id) setCategories(categories.map(c => c.id === newCat.id ? newCat : c)); else setCategories([...categories, { ...newCat, id: `cat_${Date.now()}`, type: 'custom' }]); };
  const saveEvent = async () => { const payload = { ...eventFormData, updatedAt: serverTimestamp() }; if (editingItem?.id) await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'events', editingItem.id), payload); else await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'events'), { ...payload, createdAt: serverTimestamp() }); setShowEventModal(false); setEditingItem(null); };
  const saveExpense = async () => { if (editingItem?.id) await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'expenses', editingItem.id), expenseFormData); else await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'expenses'), { ...expenseFormData, createdAt: serverTimestamp() }); setShowExpenseModal(false); setEditingItem(null); };
  const finishTripWizard = (data) => {
      const createItem = (name, qty=1) => ({ name, qty, packed: false });
      const shared = [createItem('Wifi 蛋/SIM卡', 2), createItem('萬能轉插', 2), createItem('急救包', 1), createItem('充電器總座', 1)];
      const individualBase = [createItem('護照', 1), createItem('手機', 1), createItem('內衣褲', 5), createItem('襪子', 5), createItem('替換衣物', 5)];
      if (data.arrivalDetail === '轉機' || data.arrivalType === 'Train') individualBase.push(createItem('頸枕'));
      if (data.localTransport === '自駕 (Rental Car)') { shared.push(createItem('國際車牌')); shared.push(createItem('車用手機架')); } else if (data.localTransport === '公共交通') { individualBase.push(createItem('交通卡')); individualBase.push(createItem('好行的鞋')); }
      const individual = {};
      data.participants.forEach(pid => { individual[pid] = [...individualBase]; if (pid.includes('dad')) individual[pid].push(createItem('鬚刨')); if (pid.includes('mom') || pid.includes('daughter')) individual[pid].push(createItem('化妝品')); });
      addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'trips'), { ...data, packingList: { shared, individual }, createdAt: serverTimestamp() });
      addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'events'), { title: `✈️ ${data.destination} 之旅`, date: data.startDate, startTime: '00:00', endTime: '23:59', type: 'travel', participants: data.participants, notes: `至 ${data.endDate}`, createdAt: serverTimestamp() });
      setShowTripWizard(false);
  };
  const togglePackedItem = async (trip, category, index, uid) => { const newList = JSON.parse(JSON.stringify(trip.packingList)); if (category === 'shared') newList.shared[index].packed = !newList.shared[index].packed; else if (uid) newList.individual[uid][index].packed = !newList.individual[uid][index].packed; await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'trips', trip.id), { packingList: newList }); };
  const handleToggleExpensePaid = async (expenseId) => { const currentMonthKey = `paid_${new Date().getFullYear()}_${new Date().getMonth()}`; const expense = expenses.find(e => e.id === expenseId); const paidMonths = expense.paidMonths || []; const newPaidMonths = paidMonths.includes(currentMonthKey) ? paidMonths.filter(m => m !== currentMonthKey) : [...paidMonths, currentMonthKey]; await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'expenses', expenseId), { paidMonths: newPaidMonths }); };

  // --- Views ---

  if (loading) return <div className="h-screen flex items-center justify-center">載入中...</div>;
  if (authError) return <div className="h-screen flex flex-col items-center justify-center p-8 bg-gray-50 text-center"><div className="bg-white p-8 rounded-xl shadow-lg border border-red-100 max-w-md"><h2 className="text-xl font-bold text-gray-800 mb-2">無法登入系統</h2><p className="text-sm text-gray-600 mb-4">{authError}</p><button onClick={() => window.location.reload()} className="mt-6 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">重新整理</button></div></div>;

  if (!currentUserRole) return <LoginScreen members={members} onLogin={setCurrentUserRole} />;

  return (
    <div className="flex h-screen bg-gray-100 font-sans text-gray-900">
      <div className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 z-10">
        <div className="p-6 border-b"><h1 className="text-xl font-bold text-blue-600 flex items-center gap-2"><div className="w-8 h-8 bg-blue-600 rounded text-white flex items-center justify-center">C</div> Charles Family</h1></div>
        <nav className="flex-1 p-4 space-y-1">
          {[{ id: 'calendar', icon: CalendarIcon, label: '日曆日程', perm: 'calendar' }, { id: 'expenses', icon: CreditCard, label: '家庭開支', perm: 'expenses' }, { id: 'travel', icon: Plane, label: '旅行計劃', perm: 'travel' }, { id: 'settings', icon: Settings, label: '設定與身份', perm: 'settings' }].map(i => {
             if(currentUserRole.role !== 'admin' && !currentUserRole.permissions?.includes(i.perm)) return null;
             return (<button key={i.id} onClick={() => setActiveTab(i.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === i.id ? 'bg-blue-50 text-blue-700 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}><i.icon size={18}/> {i.label}</button>)
          })}
        </nav>
        <div className="p-4 border-t bg-gray-50">
          <div className="flex items-center gap-3"><div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 border-white shadow overflow-hidden ${currentUserRole.color}`}>{currentUserRole.avatar.startsWith('data:image') ? <img src={currentUserRole.avatar} className="w-full h-full object-cover"/> : currentUserRole.avatar}</div><div className="truncate flex-1"><div className="font-bold text-sm">{currentUserRole.name}</div><div className="text-xs text-gray-500">{currentUserRole.role==='admin'?'管理員':'成員'}</div></div><button onClick={handleLogout} className="text-gray-400 hover:text-red-500"><LogOut size={16}/></button></div>
        </div>
      </div>
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="md:hidden bg-white border-b p-4 flex justify-between items-center z-20"><h1 className="font-bold text-lg">Charles Family</h1>{currentUserRole && <button onClick={() => setActiveTab('settings')} className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${currentUserRole.color} overflow-hidden`}>{currentUserRole.avatar.startsWith('data:image') ? <img src={currentUserRole.avatar} className="w-full h-full object-cover"/> : currentUserRole.avatar}</button>}</header>
        <main className="flex-1 overflow-y-auto p-2 md:p-6 bg-gray-50">
            {activeTab === 'calendar' && <CalendarView currentDate={currentDate} calendarView={calendarView} events={events} trips={trips} expenses={expenses} categories={categories} members={members} setCalendarView={setCalendarView} setCurrentDate={setCurrentDate} setHoveredEvent={setHoveredEvent} openEventModal={openEventModal} setSelectedDate={setSelectedDate} setEditingItem={setEditingItem} />}
            {activeTab === 'expenses' && <ExpensesView expenses={expenses} openExpenseModal={openExpenseModal} handleToggleExpensePaid={handleToggleExpensePaid} deleteItem={deleteItem} currentUserRole={currentUserRole} />}
            {activeTab === 'travel' && <TravelView trips={trips} openTripWizard={openTripWizard} setShowPrintPreview={setShowPrintPreview} calculatePackingProgress={calculatePackingProgress} setEditingItem={setEditingItem} setShowTripEditModal={setShowTripEditModal} currentUserRole={currentUserRole} />}
            {activeTab === 'settings' && <SettingsView currentUserRole={currentUserRole} members={members} categories={categories} handleLogout={handleLogout} setShowAddMemberModal={setShowAddMemberModal} setTargetMemberId={setTargetMemberId} setShowChangePasswordModal={setShowChangePasswordModal} handleUpdateCategory={handleUpdateCategory} setCategories={setCategories} />}
        </main>
        {currentUserRole && (<div className="md:hidden bg-white border-t flex justify-around p-2 pb-safe fixed bottom-0 w-full z-40 shadow-lg">{['calendar','expenses','travel','settings'].map(t => { const permMap = { calendar: 'calendar', expenses: 'expenses', travel: 'travel', settings: 'settings' }; if(currentUserRole.role !== 'admin' && !currentUserRole.permissions?.includes(permMap[t])) return null; return (<button key={t} onClick={() => setActiveTab(t)} className={`p-2 rounded-lg ${activeTab===t?'text-blue-600':'text-gray-400'}`}><div className="capitalize text-xs">{t}</div></button>) })}</div>)}
      </div>
      <Tooltip hoveredEvent={hoveredEvent} categories={categories} members={members} />
      <EventFormModal isOpen={showEventModal} onClose={() => setShowEventModal(false)} onSave={async(d)=>{const p={...d, updatedAt:serverTimestamp()}; if(editingItem?.id) await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'events', editingItem.id), p); else await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'events'), {...p, createdAt:serverTimestamp()}); setShowEventModal(false); setEditingItem(null);}} onDelete={(t,id)=>deleteItem(t,id)} initialData={eventFormData} categories={categories} members={members} />
      <ExpenseFormModal isOpen={showExpenseModal} onClose={() => setShowExpenseModal(false)} onSave={async(d)=>{if(editingItem?.id) await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'expenses', editingItem.id), d); else await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'expenses'), {...d, createdAt:serverTimestamp()}); setShowExpenseModal(false); setEditingItem(null);}} onDelete={(t,id)=>deleteItem(t,id)} initialData={expenseFormData} historicalNames={[...new Set([...INITIAL_EXPENSES, ...expenses].map(e => e.name))]} />
      <TripWizard isOpen={showTripWizard} onClose={() => setShowTripWizard(false)} onFinish={(d) => finishTripWizard(d)} members={members} />
      {showTripEditModal && editingItem && <PackingMode trip={editingItem} onClose={() => setShowTripEditModal(false)} onToggleItem={(t,c,i,u)=>togglePackedItem(t,c,i,u)} members={members} />}
      {showPrintPreview && <PrintPreview trip={showPrintPreview.trip} onClose={() => setShowPrintPreview(null)} />}
      <AddMemberModal isOpen={showAddMemberModal} onClose={() => setShowAddMemberModal(false)} onAdd={handleAddMember} />
      <ChangePasswordModal isOpen={showChangePasswordModal} onClose={() => setShowChangePasswordModal(false)} onConfirm={handleChangePassword} />
    </div>
  );
}
