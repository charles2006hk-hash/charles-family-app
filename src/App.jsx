import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  signInWithCustomToken,
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
  Calendar as CalendarIcon, 
  CreditCard, 
  Plane, 
  Settings, 
  Plus, 
  Check, 
  Trash2, 
  User, 
  Bell, 
  Menu, 
  X, 
  MapPin, 
  Sun, 
  Share, 
  Clock, 
  Edit2, 
  Users, 
  Train, 
  Ship, 
  Car, 
  ChevronLeft, 
  ChevronRight, 
  Info, 
  Luggage, 
  Briefcase, 
  Coffee, 
  AlertCircle, 
  FileText, 
  Printer, 
  Save, 
  CheckSquare, 
  Square, 
  Weight, 
  Palette, 
  Home, 
  Shield, 
  Zap, 
  DollarSign, 
  Hotel, 
  Bus, 
  PieChart, 
  TrendingUp, 
  Wallet,
  Lock,
  LogOut,
  Key
} from 'lucide-react';

// --- 1. Firebase Initialization (Direct Config) ---
const firebaseConfig = {
  apiKey: "AIzaSyCSX2xjZB7zqKvW9_ao007doKchwTCxGVs",
  authDomain: "charles-family-app.firebaseapp.com",
  projectId: "charles-family-app",
  storageBucket: "charles-family-app.firebasestorage.app",
  messagingSenderId: "702364504318",
  appId: "1:702364504318:web:751a0e3ef50d7d1e4c15af",
  measurementId: "G-TW5BCHD6YR"
};

// Initialize Firebase safely
let app;
try {
  app = initializeApp(firebaseConfig);
} catch (e) {
  // Ignore duplicate app initialization error
}

const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'charles-family-app';

// --- Constants & Data ---

const DEFAULT_MEMBERS_SEED = [
    { name: '爸爸 (Charles)', role: 'admin', color: 'bg-blue-100 text-blue-800 border-blue-200', password: '888888' },
    { name: '媽媽', role: 'admin', color: 'bg-pink-100 text-pink-800 border-pink-200', password: '888888' },
    { name: '女兒 (中五)', role: 'member', color: 'bg-purple-100 text-purple-800 border-purple-200', password: '888888' },
    { name: '兒子 (中一)', role: 'member', color: 'bg-green-100 text-green-800 border-green-200', password: '888888' },
];

const DEFAULT_CATEGORIES = [
  { id: 'general', name: '一般事務', color: 'bg-gray-100 text-gray-800 border-gray-200', type: 'system' },
  { id: 'expense', name: '家庭開支', color: 'bg-orange-100 text-orange-800 border-orange-200', type: 'system' },
  { id: 'travel', name: '旅行計劃', color: 'bg-blue-100 text-blue-800 border-blue-200', type: 'system' },
  { id: 'school', name: '學校活動', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', type: 'custom' },
  { id: 'competition', name: '外出比賽', color: 'bg-purple-100 text-purple-800 border-purple-200', type: 'custom' },
];

const POPULAR_DESTINATIONS = [
  '東京, 日本', '大阪, 日本', '台北, 台灣', '首爾, 韓國', '倫敦, 英國', 
  '曼谷, 泰國', '新加坡', '悉尼, 澳洲', '北京, 中國', '上海, 中國', '福岡, 日本', '札幌, 日本'
];

const HK_HOLIDAYS = {
  '2025-01-01': '元旦', '2025-01-29': '農曆年初一', '2025-01-30': '農曆年初二', '2025-01-31': '農曆年初三',
  '2025-04-04': '清明節', '2025-04-18': '耶穌受難節', '2025-04-19': '耶穌受難節翌日', '2025-04-21': '復活節一',
  '2025-05-01': '勞動節', '2025-05-05': '佛誕', '2025-05-31': '端午節', '2025-07-01': '特區紀念日',
  '2025-10-01': '國慶', '2025-10-07': '中秋翌日', '2025-10-29': '重陽節', '2025-12-25': '聖誕節', '2025-12-26': '拆禮物日',
  '2026-01-01': '元旦', '2026-02-17': '農曆年初一', '2026-02-18': '農曆年初二', '2026-02-19': '農曆年初三',
  '2026-04-03': '耶穌受難節', '2026-04-04': '清明節', '2026-04-06': '復活節一', '2026-05-01': '勞動節',
  '2026-05-24': '佛誕', '2026-06-19': '端午節', '2026-07-01': '特區紀念日', '2026-10-01': '國慶',
  '2026-09-26': '中秋翌日', '2026-10-18': '重陽節', '2026-12-25': '聖誕節', '2026-12-26': '拆禮物日'
};

const LUNAR_DATA = [
  { day: 1, text: '初一', ausp: '宜祭祀 祈福' }, { day: 15, text: '十五', ausp: '宜祭祀' },
  { day: 2, text: '初二', ausp: '宜出行' }, { day: 8, text: '初八', ausp: '諸事不宜' },
  { day: 16, text: '十六', ausp: '宜開市' }, { day: 23, text: '廿三', ausp: '宜大掃除' }
];

const INITIAL_EXPENSES = [
  { name: '大埔帝欣苑 (供款)', amount: 19038, day: 15, category: '樓宇', bank: 'DBS', type: 'recurring_monthly' },
  { name: '大埔帝欣苑 (管理費)', amount: 2500, day: 15, category: '樓宇', bank: 'DBS', type: 'recurring_monthly' },
  { name: '九龍農圃道 (供款)', amount: 26207, day: 15, category: '樓宇', bank: 'DBS', type: 'recurring_monthly' },
  { name: '九龍農圃道 (管理費)', amount: 4200, day: 15, category: '樓宇', bank: 'DBS', type: 'recurring_monthly' },
  { name: '大埔太湖花園7座 (供款)', amount: 13923, day: 15, category: '樓宇', bank: 'DBS', type: 'recurring_monthly' },
  { name: '大埔太湖花園5座 (供款)', amount: 12668, day: 15, category: '樓宇', bank: '大新', type: 'recurring_monthly' },
  { name: '科學園嘉熙 (供款)', amount: 10891, day: 15, category: '樓宇', bank: '大新', type: 'recurring_monthly' },
  { name: '譚公道 (供款)', amount: 10891, day: 15, category: '樓宇', bank: '恆生', type: 'recurring_monthly' },
  { name: '私人貸款 (Autopay)', amount: 13995, day: 15, category: '貸款', bank: '大新', type: 'recurring_monthly' },
  { name: 'Citibank Club Master', day: 21, category: '信用卡', bank: 'Citibank', type: 'recurring_monthly' },
  { name: 'DBS Visa (Target)', day: 10, amount: 50000, category: '信用卡', bank: 'DBS', type: 'recurring_monthly' },
  { name: 'AXA 醫療 (Jason)', amount: 2384.83, month: 2, day: 21, category: '保險', type: 'recurring_yearly' },
  { name: 'AXA 人壽 (Charles)', amount: 106739.68, month: 10, day: 22, category: '保險', type: 'recurring_yearly' },
  { name: '農圃車位租金', amount: 3600, day: 1, category: '日常', bank: 'HSBC', type: 'recurring_monthly' },
  { name: '農圃水費', amount: 1000, day: 1, category: '日常', type: 'recurring_monthly' },
];

// --- Helper Functions ---
const formatDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const formatMoney = (amount) => amount ? `HK$${Number(amount).toLocaleString()}` : '-';

const getLunarInfo = (date) => {
  const day = date.getDate();
  const special = LUNAR_DATA.find(d => d.day === day);
  if (special) return { dayText: special.text, auspicious: special.ausp };
  
  const lunarDays = ["初一", "初二", "初三", "初四", "初五", "初六", "初七", "初八", "初九", "初十", "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十", "廿一", "廿二", "廿三", "廿四", "廿五", "廿六", "廿七", "廿八", "廿九", "三十"];
  const idx = (day - 1) % 30;
  const randAusp = (day % 5 === 0) ? '宜會友' : (day % 7 === 0 ? '忌遠行' : '');
  return { dayText: lunarDays[idx], auspicious: randAusp };
};

const isDateInRange = (dateStr, startDateStr, endDateStr) => dateStr >= startDateStr && dateStr <= endDateStr;
const getDaysDiff = (start, end) => Math.ceil(Math.abs(new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24)) + 1;

// --- Main Component ---
export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('calendar');
  const [authError, setAuthError] = useState(null);
  
  // Data State
  const [members, setMembers] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  
  // Auth State
  const [currentUserRole, setCurrentUserRole] = useState(null); 
  const [loginTargetMember, setLoginTargetMember] = useState(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  
  const [events, setEvents] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  // Calendar UI State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState('month'); 
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [hoveredEvent, setHoveredEvent] = useState(null); 
  
  // Modal States
  const [showEventModal, setShowEventModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showTripWizard, setShowTripWizard] = useState(false);
  const [showTripEditModal, setShowTripEditModal] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(null);
  const [editingItem, setEditingItem] = useState(null);

  // Admin Modal States
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [targetMemberId, setTargetMemberId] = useState(null);
  
  // Form States
  const [eventFormData, setEventFormData] = useState({});
  const [expenseFormData, setExpenseFormData] = useState({});
  const [tripWizardData, setTripWizardData] = useState({});
  const [tripStep, setTripStep] = useState(1);
  const [memberFormData, setMemberFormData] = useState({ name: '', role: 'member', color: '' });
  const [newPassword, setNewPassword] = useState('');

  // --- FORCE STYLE INJECTION ---
  useEffect(() => {
    const script = document.createElement('script');
    script.src = "https://cdn.tailwindcss.com";
    script.async = true;
    document.head.appendChild(script);
    const style = document.createElement('style');
    style.innerHTML = `body { font-family: system-ui, -apple-system, sans-serif; background: #f3f4f6; } .flex { display: flex; } .hidden { display: none; }`;
    document.head.appendChild(style);
  }, []);

  // Auth & Sync
  useEffect(() => {
    const initAuth = async () => {
      try {
        try { await setPersistence(auth, browserLocalPersistence); } catch (e) { await setPersistence(auth, inMemoryPersistence); }
        await signInAnonymously(auth);
      } catch (err) { setAuthError(err.message); setLoading(false); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => { setUser(u); if(u) setAuthError(null); });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    
    // Listeners
    const unsubMembers = onSnapshot(query(collection(db, 'artifacts', appId, 'users', user.uid, 'members')), (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (data.length === 0) {
            DEFAULT_MEMBERS_SEED.forEach(async (m) => addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'members'), { ...m, createdAt: serverTimestamp() }));
        } else {
            setMembers(data);
        }
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

  // --- Logic Helpers ---
  const getLuggageEstimate = (trip) => {
    const days = getDaysDiff(trip.startDate, trip.endDate);
    const personCount = trip.participants.length;
    let totalWeight = Math.round(personCount * (3 + (days * 1.2))); 
    if (trip.hotelStar < 3) totalWeight += personCount * 1; 
    if (trip.hotelType === 'Resort') totalWeight += personCount * 1; 
    if (trip.destination.includes('日本')) totalWeight += 5; 
    let advice = totalWeight < 10 ? "1個登機箱" : totalWeight < 25 ? "1個24吋 + 背包" : totalWeight < 45 ? "2個26-28吋" : `建議 ${Math.ceil(totalWeight/20)}個 大型行李箱`;
    return { totalWeight, advice };
  };

  const calculatePackingProgress = (list) => {
    if (!list) return 0;
    let total = 0, packed = 0;
    (list.shared || []).forEach(i => { total++; if(i.packed) packed++; });
    Object.values(list.individual || {}).forEach(pItems => { pItems.forEach(i => { total++; if(i.packed) packed++; }); });
    return total === 0 ? 0 : Math.round((packed / total) * 100);
  };

  // --- Actions ---
  const handleLogin = () => {
      if (passwordInput === loginTargetMember.password) {
          setCurrentUserRole(loginTargetMember);
          setLoginTargetMember(null);
          setPasswordInput('');
          setLoginError('');
      } else {
          setLoginError('密碼錯誤');
      }
  };

  const handleLogout = () => { setCurrentUserRole(null); };

  const handleAddMember = async () => {
      if(!memberFormData.name) return;
      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'members'), { ...memberFormData, password: '888888', createdAt: serverTimestamp() });
      setShowAddMemberModal(false);
      setMemberFormData({ name: '', role: 'member', color: 'bg-gray-100' });
  };

  const handleChangePassword = async () => {
      if (!targetMemberId || !newPassword) return;
      await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'members', targetMemberId), { password: newPassword });
      setShowChangePasswordModal(false);
      setTargetMemberId(null);
      setNewPassword('');
  };

  const saveEvent = async () => {
    const payload = { ...eventFormData, updatedAt: serverTimestamp() };
    if (editingItem?.id) await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'events', editingItem.id), payload);
    else await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'events'), { ...payload, createdAt: serverTimestamp() });
    setShowEventModal(false);
    setEditingItem(null);
  };

  const saveExpense = async () => {
    if (editingItem?.id) await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'expenses', editingItem.id), expenseFormData);
    else await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'expenses'), { ...expenseFormData, createdAt: serverTimestamp() });
    setShowExpenseModal(false);
    setEditingItem(null);
  };

  const finishTripWizard = () => {
      const createItem = (name, qty=1) => ({ name, qty, packed: false });
      const shared = [createItem('Wifi 蛋/SIM卡', 2), createItem('萬能轉插', 2), createItem('急救包', 1), createItem('充電器總座', 1)];
      const individualBase = [createItem('護照', 1), createItem('手機', 1), createItem('內衣褲', 5), createItem('襪子', 5), createItem('替換衣物', 5)];
      
      if (tripWizardData.arrivalDetail === '轉機' || tripWizardData.arrivalType === 'Train') individualBase.push(createItem('頸枕'));
      if (tripWizardData.localTransport === '自駕 (Rental Car)') { shared.push(createItem('國際車牌')); shared.push(createItem('車用手機架')); }
      else if (tripWizardData.localTransport === '公共交通') { individualBase.push(createItem('交通卡')); individualBase.push(createItem('好行的鞋')); }
      if (tripWizardData.hotelStar < 3) individualBase.push(createItem('洗漱用品'), createItem('毛巾'));
      if (tripWizardData.hotelType === 'Resort') individualBase.push(createItem('泳衣'), createItem('太陽眼鏡'));

      const individual = {};
      tripWizardData.participants.forEach(pid => {
         individual[pid] = [...individualBase];
         if (pid === 'dad') individual[pid].push(createItem('鬚刨'));
         if (pid === 'mom' || pid === 'daughter') individual[pid].push(createItem('化妝品'));
      });

      addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'trips'), { ...tripWizardData, packingList: { shared, individual }, createdAt: serverTimestamp() });
      addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'events'), { title: `✈️ ${tripWizardData.destination} 之旅`, date: tripWizardData.startDate, startTime: '00:00', endTime: '23:59', type: 'travel', participants: tripWizardData.participants, notes: `至 ${tripWizardData.endDate}`, createdAt: serverTimestamp() });
      setShowTripWizard(false);
  };

  const togglePackedItem = async (trip, category, index, uid = null) => {
    const newList = JSON.parse(JSON.stringify(trip.packingList));
    if (category === 'shared') newList.shared[index].packed = !newList.shared[index].packed;
    else if (uid) newList.individual[uid][index].packed = !newList.individual[uid][index].packed;
    await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'trips', trip.id), { packingList: newList });
  };

  const handleToggleExpensePaid = async (expenseId) => {
    const currentMonthKey = `paid_${new Date().getFullYear()}_${new Date().getMonth()}`;
    const expense = expenses.find(e => e.id === expenseId);
    const paidMonths = expense.paidMonths || [];
    const newPaidMonths = paidMonths.includes(currentMonthKey) ? paidMonths.filter(m => m !== currentMonthKey) : [...paidMonths, currentMonthKey];
    await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'expenses', expenseId), { paidMonths: newPaidMonths });
  };

  const deleteItem = async (collectionName, id) => {
    if (confirm('確定刪除?')) {
      await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, collectionName, id));
      if (collectionName === 'trips') setShowTripEditModal(false);
      if (collectionName === 'events') setShowEventModal(false);
      if (collectionName === 'expenses') setShowExpenseModal(false);
    }
  };

  // --- Initializing Forms ---
  const openEventModal = (item) => {
      setEditingItem(item);
      setEventFormData({
          title: item?.title || '',
          type: item?.type || 'general',
          date: item?.date || formatDate(selectedDate),
          startTime: item?.startTime || '09:00',
          endTime: item?.endTime || '10:00',
          participants: item?.participants || members.map(m=>m.id),
          notes: item?.notes || ''
      });
      setShowEventModal(true);
  };

  const openExpenseModal = (item) => {
      setEditingItem(item);
      setExpenseFormData({
          name: item?.name || '',
          amount: item?.amount || '',
          day: item?.day || 1,
          month: item?.month || 1,
          category: item?.category || '日常',
          bank: item?.bank || '',
          type: item?.type || 'recurring_monthly'
      });
      setShowExpenseModal(true);
  };

  const openTripWizard = () => {
      setTripStep(1);
      setTripWizardData({
          arrivalType: 'Flight', arrivalDetail: '直飛', localTransport: '公共交通',
          destination: '', startDate: formatDate(new Date()), endDate: formatDate(new Date(Date.now() + 5*86400000)),
          participants: members.map(m => m.id), hotelStar: 4, hotelType: 'City Hotel'
      });
      setShowTripWizard(true);
  };

  const handleUpdateCategory = (newCat) => {
    if (newCat.id) {
       setCategories(categories.map(c => c.id === newCat.id ? newCat : c));
    } else {
       setCategories([...categories, { ...newCat, id: `cat_${Date.now()}`, type: 'custom' }]);
    }
  };

  // --- Render Functions (To prevent focus loss) ---

  const renderLoginScreen = () => {
      if (loginTargetMember) {
          return (
              <div className="h-screen flex items-center justify-center bg-gray-100 p-4">
                  <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-sm text-center">
                      <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center text-3xl font-bold mb-4 ${loginTargetMember.color}`}>{loginTargetMember.name[0]}</div>
                      <h2 className="text-2xl font-bold mb-6">歡迎, {loginTargetMember.name.split(' ')[0]}</h2>
                      <input type="password" className="w-full text-center border-2 border-gray-300 rounded-lg p-3 text-lg tracking-widest focus:border-blue-500 outline-none mb-4" placeholder="輸入密碼 (預設 888888)" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} autoFocus />
                      {loginError && <div className="text-red-500 text-sm mb-4">{loginError}</div>}
                      <button onClick={handleLogin} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 mb-3">登入</button>
                      <button onClick={() => { setLoginTargetMember(null); setLoginError(''); setPasswordInput(''); }} className="text-gray-500 text-sm">返回</button>
                  </div>
              </div>
          )
      }
      return (
          <div className="h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
             <div className="text-center mb-10">
                 <div className="w-24 h-24 mx-auto mb-4 rounded-3xl shadow-lg bg-blue-600 flex items-center justify-center text-white text-5xl font-bold overflow-hidden">
                     {/* Safe fallback for logo */}
                     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-16 h-16"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                 </div>
                 <h1 className="text-3xl font-bold text-gray-800">Charles Family App</h1>
                 <p className="text-gray-500">請選擇您的身分登入</p>
             </div>
             <div className="grid grid-cols-2 gap-4 w-full max-w-md">
                {members.map(m => (
                    <button key={m.id} onClick={() => setLoginTargetMember(m)} className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md border border-transparent hover:border-blue-200 transition-all flex flex-col items-center gap-3">
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold ${m.color}`}>{m.name[0]}</div>
                        <span className="font-bold text-gray-700">{m.name.split(' ')[0]}</span>
                    </button>
                ))}
             </div>
          </div>
      );
  };

  const renderModals = () => (
      <>
        {/* Event Form Modal */}
        {showEventModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
              <h3 className="text-lg font-bold mb-4">{editingItem?.id ? '修改日程' : '新增日程'}</h3>
              <div className="space-y-4">
                 <input className="w-full border rounded p-2 font-bold" placeholder="標題" value={eventFormData.title} onChange={e => setEventFormData({...eventFormData, title: e.target.value})} />
                 <div className="flex flex-wrap gap-2">{categories.map(cat => (<button key={cat.id} onClick={() => setEventFormData({...eventFormData, type: cat.id})} className={`px-3 py-1 text-xs rounded border ${eventFormData.type === cat.id ? `${cat.color} font-bold` : 'text-gray-500'}`}>{cat.name}</button>))}</div>
                 <div className="flex gap-2"><input type="date" className="w-full border rounded p-2" value={eventFormData.date} onChange={e => setEventFormData({...eventFormData, date: e.target.value})} /><input type="time" className="w-full border rounded p-2" value={eventFormData.startTime} onChange={e => setEventFormData({...eventFormData, startTime: e.target.value})} /></div>
                 <div><label className="text-xs text-gray-500">參與者</label><div className="flex flex-wrap gap-2">{members.map(m => (<button key={m.id} onClick={() => { const newP = eventFormData.participants.includes(m.id) ? eventFormData.participants.filter(p => p !== m.id) : [...eventFormData.participants, m.id]; setEventFormData({...eventFormData, participants: newP}); }} className={`px-2 py-1 rounded text-xs border ${eventFormData.participants.includes(m.id) ? `${m.color}` : 'bg-gray-50'}`}>{m.name.split(' ')[0]}</button>))}</div></div>
                 <textarea className="w-full border rounded p-2 h-20 text-sm" placeholder="備註..." value={eventFormData.notes} onChange={e => setEventFormData({...eventFormData, notes: e.target.value})}></textarea>
                 <div className="flex gap-2 pt-2">{editingItem?.id && <button onClick={() => deleteItem('events', editingItem.id)} className="px-4 py-2 text-red-500 border rounded"><Trash2/></button>}<button onClick={() => setShowEventModal(false)} className="flex-1 px-4 py-2 bg-gray-100 rounded">取消</button><button onClick={saveEvent} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded">儲存</button></div>
              </div>
            </div>
          </div>
        )}

        {/* Expense Form Modal */}
        {showExpenseModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
              <h3 className="text-lg font-bold mb-4">{editingItem?.id ? '修改開支' : '新增開支'}</h3>
              <div className="space-y-3">
                 <div><label className="text-xs text-gray-500">項目</label><input className="w-full border rounded p-2" value={expenseFormData.name} onChange={e => setExpenseFormData({...expenseFormData, name: e.target.value})} /></div>
                 <div className="flex gap-2"><button onClick={() => setExpenseFormData({...expenseFormData, type: 'recurring_monthly'})} className={`flex-1 py-1 text-xs rounded border ${expenseFormData.type==='recurring_monthly'?'bg-blue-100 border-blue-500':''}`}>每月</button><button onClick={() => setExpenseFormData({...expenseFormData, type: 'recurring_yearly'})} className={`flex-1 py-1 text-xs rounded border ${expenseFormData.type==='recurring_yearly'?'bg-blue-100 border-blue-500':''}`}>每年</button></div>
                 <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-xs text-gray-500">金額</label><input type="number" className="w-full border rounded p-2" value={expenseFormData.amount} onChange={e => setExpenseFormData({...expenseFormData, amount: Number(e.target.value)})} /></div>
                    {expenseFormData.type === 'recurring_yearly' ? <div className="flex gap-1"><input type="number" placeholder="月" className="w-1/2 border rounded p-2" value={expenseFormData.month} onChange={e => setExpenseFormData({...expenseFormData, month: Number(e.target.value)})}/><input type="number" placeholder="日" className="w-1/2 border rounded p-2" value={expenseFormData.day} onChange={e => setExpenseFormData({...expenseFormData, day: Number(e.target.value)})}/></div> : <div><label className="text-xs text-gray-500">扣數日</label><input type="number" className="w-full border rounded p-2" value={expenseFormData.day} onChange={e => setExpenseFormData({...expenseFormData, day: Number(e.target.value)})}/></div>}
                 </div>
                 <div className="grid grid-cols-2 gap-3"><div><label className="text-xs text-gray-500">類別</label><select className="w-full border rounded p-2" value={expenseFormData.category} onChange={e => setExpenseFormData({...expenseFormData, category: e.target.value})}>{['樓宇','信用卡','保險','日常','貸款','其他'].map(c => <option key={c}>{c}</option>)}</select></div><div><label className="text-xs text-gray-500">銀行</label><input className="w-full border rounded p-2" value={expenseFormData.bank} onChange={e => setExpenseFormData({...expenseFormData, bank: e.target.value})}/></div></div>
                 <div className="flex gap-2 pt-4">{editingItem?.id && <button onClick={() => deleteItem('expenses', editingItem.id)} className="px-4 py-2 text-red-500 border rounded"><Trash2/></button>}<button onClick={() => setShowExpenseModal(false)} className="flex-1 px-4 py-2 bg-gray-100 rounded">取消</button><button onClick={saveExpense} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded">儲存</button></div>
              </div>
            </div>
          </div>
        )}

        {/* Trip Wizard */}
        {showTripWizard && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
             <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg">
                <h3 className="font-bold text-lg mb-4">新增旅行計劃</h3>
                <div className="space-y-4">
                   <div><label className="block text-xs font-bold mb-1">目的地</label><input className="border w-full p-2 rounded mb-2" value={tripWizardData.destination} onChange={e => setTripWizardData({...tripWizardData, destination: e.target.value})}/><div className="flex flex-wrap gap-2">{POPULAR_DESTINATIONS.map(city => <button key={city} onClick={() => setTripWizardData({...tripWizardData, destination: city.split(',')[0]})} className="text-xs bg-gray-100 px-2 py-1 rounded">{city.split(',')[0]}</button>)}</div></div>
                   <div className="flex gap-4"><input type="date" className="border w-full p-2 rounded" value={tripWizardData.startDate} onChange={e => setTripWizardData({...tripWizardData, startDate: e.target.value})}/><input type="date" className="border w-full p-2 rounded" value={tripWizardData.endDate} onChange={e => setTripWizardData({...tripWizardData, endDate: e.target.value})}/></div>
                   <div className="grid grid-cols-2 gap-4">
                      <div><label className="block text-xs font-bold mb-1">交通</label><select className="border w-full p-2 rounded" value={tripWizardData.arrivalType} onChange={e => setTripWizardData({...tripWizardData, arrivalType: e.target.value})}><option value="Flight">飛機</option><option value="Train">高鐵</option></select></div>
                      <div><label className="block text-xs font-bold mb-1">細節</label><select className="border w-full p-2 rounded" value={tripWizardData.arrivalDetail} onChange={e => setTripWizardData({...tripWizardData, arrivalDetail: e.target.value})}><option>直飛/直達</option><option>轉機/轉車</option></select></div>
                   </div>
                   <div><label className="block text-xs font-bold mb-1">當地出行</label><select className="border w-full p-2 rounded" value={tripWizardData.localTransport} onChange={e => setTripWizardData({...tripWizardData, localTransport: e.target.value})}><option>公共交通</option><option>自駕</option><option>包車</option></select></div>
                   <div className="grid grid-cols-2 gap-4">
                      <div><label className="block text-xs font-bold mb-1">星級</label><input type="number" className="border w-full p-2 rounded" value={tripWizardData.hotelStar} onChange={e => setTripWizardData({...tripWizardData, hotelStar: parseInt(e.target.value)})}/></div>
                      <div><label className="block text-xs font-bold mb-1">類型</label><select className="border w-full p-2 rounded" value={tripWizardData.hotelType} onChange={e => setTripWizardData({...tripWizardData, hotelType: e.target.value})}><option value="City Hotel">酒店</option><option value="Resort">度假村</option></select></div>
                   </div>
                   <button onClick={finishTripWizard} className="w-full bg-blue-600 text-white py-3 rounded font-bold mt-4">建立</button>
                   <button onClick={() => setShowTripWizard(false)} className="w-full text-gray-500 py-2">取消</button>
                </div>
             </div>
          </div>
        )}

        {/* Add Member Modal */}
        {showAddMemberModal && (
          <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
              <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-sm">
                  <h3 className="font-bold text-lg mb-4">新增成員</h3>
                  <input className="w-full border p-2 rounded mb-4" placeholder="名稱" value={memberFormData.name} onChange={e => setMemberFormData({...memberFormData, name: e.target.value})} />
                  <select className="w-full border p-2 rounded mb-4" value={memberFormData.role} onChange={e => setMemberFormData({...memberFormData, role: e.target.value})}><option value="member">一般</option><option value="admin">管理員</option></select>
                  <div className="flex gap-2 justify-end"><button onClick={() => setShowAddMemberModal(false)} className="px-4 py-2 bg-gray-100 rounded">取消</button><button onClick={handleAddMember} className="px-4 py-2 bg-blue-600 text-white rounded">新增</button></div>
              </div>
          </div>
        )}

        {/* Change Password Modal */}
        {showChangePasswordModal && (
          <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
              <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-sm">
                  <h3 className="font-bold text-lg mb-4">重設密碼</h3>
                  <input className="w-full border p-2 rounded text-center mb-4" placeholder="新密碼" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                  <div className="flex gap-2 justify-end"><button onClick={() => setShowChangePasswordModal(false)} className="px-4 py-2 bg-gray-100 rounded">取消</button><button onClick={handleChangePassword} className="px-4 py-2 bg-blue-600 text-white rounded">確認</button></div>
              </div>
          </div>
        )}
        
        {/* Packing Mode & Print */}
        {showTripEditModal && editingItem && <PackingMode trip={editingItem}/>}
        {showPrintPreview && renderPrintPreview()}
      </>
  );

  // Main Render
  if (loading) return <div className="h-screen flex items-center justify-center">載入中...</div>;
  if (authError) return (
    <div className="h-screen flex flex-col items-center justify-center p-8 bg-gray-50 text-center">
      <div className="bg-white p-8 rounded-xl shadow-lg border border-red-100 max-w-md">
        <div className="text-red-500 mb-4 flex justify-center"><AlertCircle size={48} /></div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">無法登入系統</h2>
        <p className="text-sm text-gray-600 mb-4">{authError}</p>
        <button onClick={() => window.location.reload()} className="mt-6 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">重新整理</button>
      </div>
    </div>
  );

  // If not logged in app-level auth
  if (!currentUserRole) {
      return renderLoginScreen();
  }

  return (
    <div className="flex h-screen bg-gray-100 font-sans text-gray-900">
      {/* Sidebar */}
      <div className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 z-10">
        <div className="p-6 border-b"><h1 className="text-xl font-bold text-blue-600 flex items-center gap-2"><div className="w-8 h-8 bg-blue-600 rounded text-white flex items-center justify-center">C</div> Charles Family</h1></div>
        <nav className="flex-1 p-4 space-y-1">
          {[{ id: 'calendar', icon: CalendarIcon, label: '日曆日程' }, { id: 'expenses', icon: CreditCard, label: '家庭開支' }, { id: 'travel', icon: Plane, label: '旅行計劃' }, { id: 'settings', icon: Settings, label: '設定與身份' }].map(i => (
            <button key={i.id} onClick={() => setActiveTab(i.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === i.id ? 'bg-blue-50 text-blue-700 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}><i.icon size={18}/> {i.label}</button>
          ))}
        </nav>
        <div className="p-4 border-t bg-gray-50">
          <div className="flex items-center gap-3">
             <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 border-white shadow ${currentUserRole.color}`}>{currentUserRole.name[0]}</div>
             <div className="truncate flex-1"><div className="font-bold text-sm">{currentUserRole.name}</div><div className="text-xs text-gray-500">{currentUserRole.role==='admin'?'管理員':'成員'}</div></div>
             <button onClick={handleLogout} className="text-gray-400 hover:text-red-500"><LogOut size={16}/></button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="md:hidden bg-white border-b p-4 flex justify-between items-center z-20">
          <h1 className="font-bold text-lg">Charles Family</h1>
          <button onClick={() => setActiveTab('settings')} className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${currentUserRole.color}`}>{currentUserRole.name[0]}</button>
        </header>

        <main className="flex-1 overflow-y-auto p-2 md:p-6 bg-gray-50">
          {activeTab === 'calendar' && renderCalendar()}
          {activeTab === 'expenses' && renderExpenses()}
          {activeTab === 'travel' && (
            <div className="space-y-6">
               <div className="flex justify-between items-center">
                 <h2 className="text-2xl font-bold flex items-center gap-2"><Plane/> 旅行計劃</h2>
                 <button onClick={openTripWizard} className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 flex items-center gap-2"><Plus size={16}/> 新行程</button>
               </div>
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 {trips.map(trip => (
                   <div key={trip.id} className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100 flex flex-col">
                      <div className="p-5 border-b bg-gradient-to-r from-blue-50 to-white flex justify-between items-start">
                         <div><h3 className="text-xl font-bold text-gray-800 flex items-center gap-2"><MapPin size={20} className="text-red-500"/> {trip.destination}</h3><div className="text-sm text-gray-500 mt-1">{trip.startDate} - {trip.endDate} ({getDaysDiff(trip.startDate, trip.endDate)}天)</div></div>
                         <div className="flex gap-2"><button onClick={() => setShowPrintPreview({ trip })} className="p-2 bg-white border rounded hover:bg-gray-50 text-gray-600" title="列印報告"><Printer size={16}/></button></div>
                      </div>
                      <div className="p-5 flex-1 bg-gray-50/50">
                         <div className="flex justify-between items-center mb-4"><span className="font-bold text-gray-700 flex items-center gap-2"><Luggage size={16}/> 行李進度</span><span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-1 rounded">{calculatePackingProgress(trip.packingList)}%</span></div>
                         <div className="w-full bg-gray-200 rounded-full h-2 mb-4"><div className="bg-green-500 h-2 rounded-full transition-all duration-500" style={{width: `${calculatePackingProgress(trip.packingList)}%`}}></div></div>
                         <button onClick={() => { setEditingItem(trip); setShowTripEditModal(true); }} className="w-full py-2 bg-white border border-blue-200 text-blue-600 rounded font-medium hover:bg-blue-50 shadow-sm">開始執行李 / 編輯清單</button>
                      </div>
                   </div>
                 ))}
               </div>
            </div>
          )}
          {activeTab === 'settings' && renderSettings()}
        </main>

        <div className="md:hidden bg-white border-t flex justify-around p-2 pb-safe fixed bottom-0 w-full z-40 shadow-lg">
           {['calendar','expenses','travel','settings'].map(t => (
             <button key={t} onClick={() => setActiveTab(t)} className={`p-2 rounded-lg ${activeTab===t?'text-blue-600':'text-gray-400'}`}><div className="capitalize text-xs">{t}</div></button>
           ))}
        </div>
      </div>
      
      {/* Tooltip & Modals */}
      <Tooltip />
      {renderModals()}
    </div>
  );
}
