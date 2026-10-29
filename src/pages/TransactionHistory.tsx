import React, { useState, useEffect } from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { auth, db } from '../firebase';
import logoImage from '../assets/logo.png';

// --- TYPES ---
interface HistoryData {
  id: string;
  ref: string;
  doc: string;
  purpose: string;
  dateRequested: string;
  dateReleased: string;
  fee: string;
  amountPaid: number;
  status: 'Released' | 'Rejected';
  processedBy: string;
  remarks?: string;
}

type Language = 'en' | 'fil';

// --- TRANSLATIONS DICTIONARY ---
const translations = {
  en: {
    navDashboard: "Dashboard",
    navRequest: "Request Document",
    navTrack: "Track Status",
    navHistory: "Transaction History",
    logout: "Logout",
    langLabel: "Language",
    officeHours: "Office Hours: Monday-Sunday 8:00 AM – 5:00 PM",
    advisory: "Advisory: Regular document processing schedule active.",
    
    // Main Page
    myHistory: "Transaction History",
    myHistoryLabel: "Records",
    totalTransactions: "Total Transactions",
    totalPaid: "Total Paid",
    freeDocs: "Free Documents",
    searchPlaceholder: "Search by reference no. or document...",
    filterLabel: "Filter:",
    allStatuses: "All Statuses",
    released: "Released",
    rejected: "Rejected",
    
    // Table
    refNo: "Reference No.",
    document: "Document",
    dateReq: "Date Requested",
    dateRel: "Date Released",
    fee: "Fee",
    status: "Status",
    loading: "Loading transactions...",
    noData: "No transactions found. Released or Rejected requests will appear here.",
    showing: "Showing",
    of: "of",
    records: "records",

    // Footer
    footerRepTitle: "Republic of the Philippines",
    footerRepDesc: "Barangay Malinao, Municipality of Naujan\nProvince of Oriental Mindoro, Region IV-B MIMAROPA",
    footerPrivacyTitle: "Data Privacy Act Compliance",
    footerPrivacyDesc: "In strict accordance with Republic Act No. 10173 (Data Privacy Act of 2012), all resident personal identification data and civic application records are encrypted, confidential, and used solely for lawful local administrative services.",
    footerContactTitle: "Barangay Hall Direct Contact",
    hotline: "Hotline: (043) 286-7000 / +63 917 842 1290",
    email: "barangaymalinao.naujan@gmail.com",
    address: "Barangay Hall Compound, Sitio Centro, Malinao, Naujan",
    copyright: "© 2025 Barangay Malinao, Naujan. All Rights Reserved. BarangayEase Digital Civic Portal.",

    // Logout Modal
    logoutTitle: "Are you sure you want to log out?",
    logoutMsg: "You will need to sign in again to view your requests and apply for new documents.",
    logoutConfirm: "Yes, Log out",
    cancel: "Cancel"
  },
  fil: {
    navDashboard: "Panel ng Residente",
    navRequest: "Humiling ng Dokumento",
    navTrack: "Subaybayan ang Status",
    navHistory: "Kasaysayan ng Transaksyon",
    logout: "Mag-logout",
    langLabel: "Wika",
    officeHours: "Oras ng Opisina: Lunes-Linggo 8:00 AM – 5:00 PM",
    advisory: "Abiso: Regular ang iskedyul ng pagproseso ng dokumento.",
    
    // Main Page
    myHistory: "Kasaysayan ng Transaksyon",
    myHistoryLabel: "Mga Rekord",
    totalTransactions: "Kabuuang Transaksyon",
    totalPaid: "Kabuuang Bayad",
    freeDocs: "Libreng Dokumento",
    searchPlaceholder: "Maghanap gamit ang reference no. o dokumento...",
    filterLabel: "Salain:",
    allStatuses: "Lahat ng Status",
    released: "Naibigay na",
    rejected: "Tinanggihan",
    
    // Table
    refNo: "Reference No.",
    document: "Dokumento",
    dateReq: "Petsa ng Kahilingan",
    dateRel: "Petsa ng Paglabas",
    fee: "Bayad",
    status: "Status",
    loading: "Naglo-load ng mga transaksyon...",
    noData: "Walang nahanap na transaksyon. Dito lalabas ang mga Naibigay o Tinanggihan na request.",
    showing: "Ipinapakita",
    of: "ng",
    records: "rekord",

    // Footer
    footerRepTitle: "Republika ng Pilipinas",
    footerRepDesc: "Barangay Malinao, Munisipalidad ng Naujan\nLalawigan ng Oriental Mindoro, Rehiyon IV-B MIMAROPA",
    footerPrivacyTitle: "Pagsunod sa Data Privacy Act",
    footerPrivacyDesc: "Alinsunod sa Republic Act No. 10173 (Data Privacy Act of 2012), ang lahat ng personal na impormasyon ng residente at rekord ng aplikasyon ay naka-encrypt, kumpidensyal, at ginagamit lamang para sa mga legal na serbisyong lokal.",
    footerContactTitle: "Direktang Kontak ng Barangay Hall",
    hotline: "Hotline: (043) 286-7000 / +63 917 842 1290",
    email: "barangaymalinao.naujan@gmail.com",
    address: "Barangay Hall Compound, Sitio Centro, Malinao, Naujan",
    copyright: "© 2025 Barangay Malinao, Naujan. Lahat ng Karapatan ay Nakalaan. BarangayEase Digital Civic Portal.",

    // Logout Modal
    logoutTitle: "Sigurado ka bang gusto mong mag-logout?",
    logoutMsg: "Kailangan mong mag-login muli para makita ang iyong mga request at makapag-apply ng bagong dokumento.",
    logoutConfirm: "Oo, Mag-logout",
    cancel: "Kanselahin"
  }
};

const TransactionHistory: React.FC = () => {
  // --- STATES ---
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [history, setHistory] = useState<HistoryData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('appLanguage') as Language) || 'en';
  });

  const t = translations[language];

  useEffect(() => {
    localStorage.setItem('appLanguage', language);
  }, [language]);

  // --- FETCH HISTORY (Released + Rejected only) ---
  useEffect(() => {
    const uid = localStorage.getItem('residentUid') || auth.currentUser?.uid;
    if (!uid) {
      setIsLoading(false);
      return;
    }

    const q = query(
      collection(db, "requests"),
      where("residentId", "==", uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const all = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          ref: d.refNo || '',
          doc: d.documentType || '',
          purpose: d.purpose || '',
          dateRequested: d.dateFiled || '—',
          dateReleased: d.dateReleased || '—',
          fee: d.fee || '—',
          amountPaid: Number(d.amountPaid) || 0,
          status: d.status,
          processedBy: d.processedBy || 'N/A',
          remarks: d.remarks || '',
        };
      })
      .filter(r => r.status === 'Released' || r.status === 'Rejected')
      .map(r => ({
        ...r,
        status: r.status === 'Rejected' ? 'Rejected' : 'Released',
      })) as HistoryData[];

      // Sort newest first
      all.sort((a, b) => {
        const da = new Date(a.dateReleased !== '—' ? a.dateReleased : a.dateRequested).getTime() || 0;
        const db_ = new Date(b.dateReleased !== '—' ? b.dateReleased : b.dateRequested).getTime() || 0;
        return db_ - da;
      });

      setHistory(all);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // --- HANDLERS ---
  const handleLogoutClick = () => setIsLogoutModalOpen(true);
  
  const confirmLogout = () => {
    localStorage.removeItem('residentUid');
    window.location.href = '/login';
  };

  // --- DERIVED DATA PARA SA SUMMARY ---
  const totalTransactions = history.length;
  const totalPaid = history.reduce((sum, item) => sum + item.amountPaid, 0);
  const totalFree = history.filter(item => item.amountPaid === 0 && item.status === 'Released').length;

  // --- FILTER LOGIC ---
  const filteredHistory = history.filter(item => {
    const matchesSearch =
      (item.ref || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.doc || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Helper to translate Status labels
  const translateStatus = (status: string) => {
    if (status === 'Released') return t.released;
    if (status === 'Rejected') return t.rejected;
    return status;
  };

  // ✅ HELPER PARA SA PERA
  const formatFee = (feeStr: string) => {
    if (!feeStr) return '₱0.00';
    if (feeStr.toLowerCase().includes('libre') || feeStr === '₱0.00' || feeStr === '0') {
      return 'Libre (₱0.00)'; // O kaya gawin mong '₱0.00' kung ayaw mo ng "Libre"
    }
    return feeStr;
  };

  return (
    <IonPage>
      <IonContent className="bg-surface">
        <div className="bg-surface font-body-md text-on-surface antialiased min-h-screen flex flex-col">

          {/* HEADER */}
          <header className="fixed top-0 left-0 right-0 z-50 bg-surface-container-lowest/95 backdrop-blur-md shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
            
            {/* TOP BAR (Office Hours at Advisory) */}
            <div className="bg-primary text-on-primary text-label-sm font-label-sm">
              <div className="max-w-7xl mx-auto px-4 md:px-margin flex flex-col md:flex-row items-center justify-between py-2 md:py-0 md:h-8 gap-1.5 md:gap-0">
                
                <div className="flex items-center justify-center gap-1 text-surface-container-high text-center md:text-left">
                  <span className="material-symbols-outlined text-secondary-fixed text-[14px] shrink-0">domain</span>
                  <span className="text-[10px] sm:text-[11px] md:text-sm leading-tight">
                    {t.officeHours}
                  </span>
                </div>

                <div className="flex items-center justify-center gap-1 text-tertiary-fixed text-center md:text-right">
                  <span className="material-symbols-outlined text-[14px] shrink-0">campaign</span>
                  <span className="font-medium text-[10px] sm:text-[11px] md:text-sm leading-tight">
                    {t.advisory}
                  </span>
                </div>

              </div>
            </div>

            {/* MAIN NAV BAR */}
            <div className="h-16 md:h-20 max-w-7xl mx-auto px-4 md:px-margin flex items-center justify-between gap-4">
              
              <div className="flex items-center gap-2 shrink-0">
                <img alt="Logo" className="h-10 w-10 md:h-14 md:w-14 rounded-full object-cover bg-white shadow-sm" src={logoImage}/>
                <div className="flex flex-col">
                  <span className="font-title-lg text-sm md:text-title-lg font-bold text-primary tracking-tight leading-tight">BarangayEase</span>
                  <span className="font-label-sm text-[10px] md:text-label-sm text-on-surface-variant font-medium leading-none">Brgy. Malinao, Naujan</span>
                </div>
              </div>

              <nav className="hidden md:flex items-center justify-center gap-1 flex-1">
                <a className="px-3 py-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors font-label-md text-sm whitespace-nowrap" href="/dashboard">{t.navDashboard}</a>
                <a className="px-3 py-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors font-label-md text-sm whitespace-nowrap" href="/documents">{t.navRequest}</a>
                <a className="px-3 py-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors font-label-md text-sm whitespace-nowrap" href="/track-status">{t.navTrack}</a>
                <a className="px-3 py-2 transition-colors bg-primary text-on-primary font-bold rounded-lg shadow-sm text-sm whitespace-nowrap" href="/history">{t.navHistory}</a>
              </nav>

              <div className="flex items-center justify-end gap-2 shrink-0">
                <div className="relative">
                  <details className="group [&_summary::-webkit-details-marker]:hidden">
                    <summary className="list-none outline-none p-2 text-primary cursor-pointer hover:bg-surface-container rounded-lg focus:outline-none transition-colors">
                      <span className="material-symbols-outlined text-[28px] group-open:hidden">menu</span>
                      <span className="material-symbols-outlined text-[28px] hidden group-open:block">close</span>
                    </summary>
                    
                    <div className="absolute right-0 mt-2 w-60 bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant/50 flex flex-col p-2 z-[100] overflow-hidden">
                      
                      <div className="flex flex-col md:hidden gap-1">
                        <a className="px-4 py-2.5 text-sm font-semibold text-on-surface hover:bg-surface-container rounded-lg transition-colors" href="/dashboard">{t.navDashboard}</a>
                        <a className="px-4 py-2.5 text-sm font-semibold text-on-surface hover:bg-surface-container rounded-lg transition-colors" href="/documents">{t.navRequest}</a>
                        <a className="px-4 py-2.5 text-sm font-semibold text-on-surface hover:bg-surface-container rounded-lg transition-colors" href="/track-status">{t.navTrack}</a>
                        <a className="px-4 py-2.5 text-sm font-semibold text-primary bg-primary/10 rounded-lg" href="/history">{t.navHistory}</a>
                        <div className="h-px bg-outline-variant/50 my-1 mx-2"></div>
                      </div>
                      
                      <div className="px-2 py-2">
                        <p className="text-[10px] font-bold uppercase text-outline mb-2 px-2 tracking-wider">{t.langLabel}</p>
                        <div className="flex bg-surface-container rounded-lg p-1">
                          <button
                            onClick={() => setLanguage('en')}
                            className={`flex-1 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${language === 'en' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
                          >
                            English
                          </button>
                          <button
                            onClick={() => setLanguage('fil')}
                            className={`flex-1 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${language === 'fil' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
                          >
                            Filipino
                          </button>
                        </div>
                      </div>

                      <div className="h-px bg-outline-variant/50 my-1 mx-2"></div>
                      
                      <button onClick={handleLogoutClick} className="mx-2 px-3 py-2.5 mt-1 text-sm text-left text-red-600 font-bold hover:bg-red-50 rounded-lg flex items-center gap-2 transition-colors">
                        <span className="material-symbols-outlined text-[18px]">logout</span>
                        {t.logout}
                      </button>
                    </div>
                  </details>
                </div>
              </div>
            </div>
            <div className="h-[3px] w-full flex">
              <div className="h-full w-1/3 bg-secondary-container"></div>
              <div className="h-full w-1/3 bg-error"></div>
              <div className="h-full w-1/3 bg-tertiary-fixed"></div>
            </div>
          </header>

          {/* MAIN CONTENT */}
          <main className="w-full pt-28 md:pt-32 bg-surface flex-1">
            <div className="max-w-7xl mx-auto px-4 md:px-margin py-6 md:py-10">

              {/* ✅ HEADER DESIGN */}
              <div className="mb-6 md:mb-8">
                <div className="flex items-center gap-2 mb-2 md:mb-3 text-[#0a558c]">
                  <span className="material-symbols-outlined text-[18px] md:text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    verified_user
                  </span>
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest">
                    Official Document Issuance Portal
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#00236f] tracking-tight mb-1 md:mb-2">
                  {t.myHistory}
                </h2>
              </div>

              {/* SUMMARY CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-6">
                <div className="bg-surface-container-lowest p-4 md:p-5 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] md:text-xs font-semibold uppercase text-slate-600 mb-1">{t.totalTransactions}</p>
                    <p className="text-2xl md:text-3xl font-bold text-primary">{totalTransactions}</p>
                  </div>
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[20px] md:text-[24px]">receipt_long</span>
                  </div>
                </div>
                <div className="bg-surface-container-lowest p-4 md:p-5 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] md:text-xs font-semibold uppercase text-slate-600 mb-1">{t.totalPaid}</p>
                    <p className="text-2xl md:text-3xl font-bold text-primary">₱{totalPaid.toFixed(2)}</p>
                  </div>
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-green-100 text-green-800 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[20px] md:text-[24px]">payments</span>
                  </div>
                </div>
                <div className="bg-surface-container-lowest p-4 md:p-5 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] md:text-xs font-semibold uppercase text-slate-600 mb-1">{t.freeDocs}</p>
                    <p className="text-2xl md:text-3xl font-bold text-primary">{totalFree}</p>
                  </div>
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[20px] md:text-[24px]">volunteer_activism</span>
                  </div>
                </div>
              </div>

              {/* SEARCH & FILTER BAR */}
              <div className="bg-surface-container-lowest p-3 md:p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row gap-3 md:gap-4 justify-between items-center">
                <div className="w-full md:w-96 relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">search</span>
                  <input
                    type="text"
                    placeholder={t.searchPlaceholder}
                    className="w-full h-10 md:h-11 pl-10 pr-4 rounded-lg bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-blue-100 outline-none transition-colors text-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
                  <span className="text-xs md:text-sm font-semibold text-slate-600 whitespace-nowrap">{t.filterLabel}</span>
                  <div className="relative w-full md:w-48">
                    <select
                      className="h-10 md:h-11 w-full appearance-none rounded-lg bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-blue-100 outline-none px-3 pr-8 cursor-pointer transition-colors text-sm"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="all">{t.allStatuses}</option>
                      <option value="Released">{t.released}</option>
                      <option value="Rejected">{t.rejected}</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
                  </div>
                </div>
              </div>

              {/* ✅ DESKTOP TABLE (hidden sa mobile) */}
              <div className="hidden md:block bg-surface-container-lowest rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-600 font-bold text-xs uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="py-4 px-6">{t.refNo}</th>
                        <th className="py-4 px-6">{t.document}</th>
                        <th className="py-4 px-6">{t.dateReq}</th>
                        <th className="py-4 px-6">{t.dateRel}</th>
                        <th className="py-4 px-6">{t.fee}</th>
                        <th className="py-4 px-6">{t.status}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {isLoading ? (
                        <tr>
                          <td colSpan={6} className="py-10 text-center text-slate-500">
                            <span className="material-symbols-outlined animate-spin text-2xl mb-2 block">autorenew</span>
                            {t.loading}
                          </td>
                        </tr>
                      ) : filteredHistory.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-10 text-center text-slate-500">
                            {t.noData}
                          </td>
                        </tr>
                      ) : (
                        filteredHistory.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-4 px-6 font-mono font-bold text-primary">{item.ref}</td>
                            <td className="py-4 px-6">
                              <div className="font-bold text-slate-900">{item.doc}</div>
                            </td>
                            <td className="py-4 px-6 text-slate-600">{item.dateRequested}</td>
                            <td className="py-4 px-6 text-slate-600">{item.dateReleased}</td>
                            <td className={`py-4 px-6 font-bold ${
                              item.status === 'Rejected' ? 'text-red-600' : 'text-slate-800'
                            }`}>
                              {formatFee(item.fee)}
                            </td>
                            <td className="py-4 px-6">
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                                item.status === 'Released'
                                  ? 'bg-green-50 text-green-700 border-green-200'
                                  : 'bg-red-50 text-red-700 border-red-200'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${item.status === 'Released' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                {translateStatus(item.status)}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs font-medium text-slate-500">
                  <span>{t.showing} <strong>{filteredHistory.length}</strong> {t.of} {history.length} {t.records}</span>
                </div>
              </div>

              {/* ✅ MOBILE CARD VIEW (hidden sa desktop) */}
              <div className="md:hidden flex flex-col gap-3">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-10 text-slate-500">
                    <span className="material-symbols-outlined animate-spin text-3xl mb-2">autorenew</span>
                    <p className="text-sm">{t.loading}</p>
                  </div>
                ) : filteredHistory.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 bg-surface-container-lowest rounded-xl border border-slate-200 text-sm">
                    {t.noData}
                  </div>
                ) : (
                  filteredHistory.map((item) => (
                    <div key={item.id} className="bg-surface-container-lowest rounded-xl p-4 shadow-sm border border-slate-200 flex flex-col gap-3">
                      
                      {/* Top Row: Ref & Status */}
                      <div className="flex justify-between items-start">
                        <span className="font-mono text-xs font-bold text-primary bg-primary/5 px-2 py-1 rounded-md">
                          #{item.ref}
                        </span>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          item.status === 'Released'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${item.status === 'Released' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                          {translateStatus(item.status)}
                        </span>
                      </div>

                      {/* Middle: Doc Type & Purpose */}
                      <div>
                        <div className="font-bold text-slate-900 text-sm mb-1">{item.doc}</div>
                        <div className="text-[11px] text-slate-600">Purpose: {item.purpose || 'N/A'}</div>
                      </div>

                      {/* Bottom Row: Dates & Fee */}
                      <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100 mt-1">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Requested</span>
                          <span className="text-xs font-medium text-slate-800">{item.dateRequested}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Released</span>
                          <span className="text-xs font-medium text-slate-800">{item.dateReleased}</span>
                        </div>
                        <div className="col-span-2 mt-1 border-t border-slate-200/60 pt-2 flex justify-between items-center">
                          <span className="text-[10px] text-slate-400 uppercase font-bold">Fee</span>
                          <span className={`text-sm font-bold ${
                            item.status === 'Rejected' ? 'text-red-600' : 'text-slate-900'
                          }`}>
                            {formatFee(item.fee)}
                          </span>
                        </div>
                      </div>

                    </div>
                  ))
                )}
              </div>

            </div>
          </main>

          {/* FOOTER */}
          <footer className="w-full bg-primary text-on-primary pt-8 pb-6 shadow-[0_-2px_12px_rgba(0,0,0,0.05)]">
            <div className="max-w-7xl mx-auto px-4 md:px-margin">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 pb-8">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-secondary-fixed text-[20px] md:text-[24px]">verified</span>
                    <h3 className="text-sm md:text-base font-bold text-on-primary">{t.footerRepTitle}</h3>
                  </div>
                  <p className="text-xs md:text-sm text-primary-fixed whitespace-pre-line">{t.footerRepDesc}</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-secondary-fixed text-[20px] md:text-[24px]">shield</span>
                    <h3 className="text-sm md:text-base font-bold text-on-primary">{t.footerPrivacyTitle}</h3>
                  </div>
                  <p className="text-xs md:text-sm text-primary-fixed">{t.footerPrivacyDesc}</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-secondary-fixed text-[20px] md:text-[24px]">contact_support</span>
                    <h3 className="text-sm md:text-base font-bold text-on-primary">{t.footerContactTitle}</h3>
                  </div>
                  <ul className="space-y-1.5 text-xs md:text-sm text-primary-fixed">
                    <li className="flex items-center gap-2"><span className="material-symbols-outlined text-[16px] text-secondary-fixed">call</span><span>{t.hotline}</span></li>
                    <li className="flex items-center gap-2"><span className="material-symbols-outlined text-[16px] text-secondary-fixed">mail</span><span>{t.email}</span></li>
                    <li className="flex items-center gap-2"><span className="material-symbols-outlined text-[16px] text-secondary-fixed">location_on</span><span>{t.address}</span></li>
                  </ul>
                </div>
              </div>
              <div className="pt-4 flex flex-col md:flex-row items-center justify-between text-on-primary-container text-xs gap-2 border-t border-primary-container/30">
                <p className="text-center md:text-left">{t.copyright}</p>
              </div>
            </div>
          </footer>

          {/* ================= LOGOUT CONFIRMATION MODAL ================= */}
          {isLogoutModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-primary/50 backdrop-blur-sm p-4">
              <div className="w-full max-w-sm rounded-2xl bg-surface-container-lowest p-6 shadow-2xl">
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-[36px]">logout</span>
                  </div>
                  <h2 className="text-lg md:text-xl font-bold text-primary">{t.logoutTitle}</h2>
                  <p className="mt-2 text-xs md:text-sm text-on-surface-variant leading-relaxed">
                    {t.logoutMsg}
                  </p>
                </div>

                <div className="mt-6 flex flex-col-reverse sm:flex-row gap-2">
                  <button 
                    onClick={() => setIsLogoutModalOpen(false)} 
                    className="flex-1 rounded-lg px-4 py-2.5 font-semibold text-primary bg-surface-container hover:bg-surface-container-high transition-colors text-xs md:text-sm"
                  >
                    {t.cancel}
                  </button>
                  <button 
                    onClick={confirmLogout} 
                    className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 font-bold text-white hover:bg-red-700 transition-colors flex items-center justify-center gap-1.5 text-xs md:text-sm"
                  >
                    <span className="material-symbols-outlined text-[18px]">logout</span>
                    {t.logoutConfirm}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </IonContent>
    </IonPage>
  );
};

export default TransactionHistory;