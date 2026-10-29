import React, { useState, useEffect, useRef } from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { collection, onSnapshot, query, where, doc, getDoc, updateDoc } from "firebase/firestore";
import { updatePassword } from "firebase/auth";
import { auth, db } from '../firebase'; 
import logoImage from '../assets/logo.png';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface RequestData {
  id: string;
  refNo: string;
  documentType: string;
  purpose: string;
  dateFiled: string;
  dateReleased?: string;
  estimatedRelease: string;
  fee: string;
  status: string;
  residentName?: string;
  purok?: string;
}

interface AnnouncementData {
  title: string;
  audience: string;
  date: string;
  location: string;
  details: string;
  isActive: boolean;
}

interface HolidayData {
  id: string;
  name: string;
  date: string;
}

const translations = {
  en: {
    dashboard: "Dashboard", requestDocument: "Request Document", trackStatus: "Track Status", transactionHistory: "Transaction History",
    logout: "Logout", cancel: "Cancel", yesLogout: "Yes, Log out", logoutTitle: "Are you sure you want to log out?",
    logoutMessage: "You will need to sign in again to view your requests and apply for new documents.",
    welcome: "Welcome", active: "Active", requestNewDoc: "Request New Document", trackMyRequests: "Track My Requests",
    total: "Total", underReview: "Under Review", approved: "Approved", readyToClaim: "Ready to Claim",
    recentRequests: "Recent Requests", filter: "Filter", allStatuses: "All Statuses", readyForRelease: "Ready for Release",
    released: "Released", refNo: "Reference No.", docType: "Document Type", purpose: "Purpose", dateFiled: "Date Filed",
    estRelease: "Est. Release", fee: "Fee", status: "Status", loading: "Loading requests...",
    noRequests: 'You have no requests yet. Go to "Request Document" to apply.',
    readyBannerTitle: "Document Ready for Pickup", readyBannerMsg: "is ready. Proceed to Barangay Hall with valid ID.",
    viewClaimSlip: "View Claim Slip", claimSlipTitle: "Document Claim Slip", resident: "Resident", dateIssued: "Date Issued",
    document: "Document", download: "Download PDF", print: "Print", close: "Close", language: "Language",
    publicAnnouncement: "Public Announcement", for: "For",
    upcomingHolidays: "Upcoming Holidays", noUpcomingHolidays: "No upcoming holidays.",
    slaNote: "Note: SLA deadlines for document requests are paused on these dates."
  },
  fil: {
    dashboard: "Panel ng Residente", requestDocument: "Humiling ng Dokumento", trackStatus: "Subaybayan ang Status", transactionHistory: "Kasaysayan ng Transaksyon",
    logout: "Mag-logout", cancel: "Kanselahin", yesLogout: "Oo, Mag-logout", logoutTitle: "Sigurado ka bang gusto mong mag-logout?",
    logoutMessage: "Kailangan mong mag-login muli para makita ang iyong mga request at makapag-apply ng bagong dokumento.",
    welcome: "Mabuhay", active: "Aktibo", requestNewDoc: "Humiling ng Bagong Dokumento", trackMyRequests: "Subaybayan ang Aking Request",
    total: "Kabuuan", underReview: "Sinusuri", approved: "Naaprubahan", readyToClaim: "Handa Kunin",
    recentRequests: "Mga Kamakailang Kahilingan", filter: "Salain", allStatuses: "Lahat ng Status", readyForRelease: "Handa nang Kunin",
    released: "Naibigay na", refNo: "Reference No.", docType: "Uri ng Dokumento", purpose: "Layunin", dateFiled: "Petsa ng Pag-file",
    estRelease: "Tantyang Paglabas", fee: "Bayad", status: "Status", loading: "Naglo-load ng mga request...",
    noRequests: 'Wala ka pang request. Pumunta sa "Humiling ng Dokumento" para mag-apply.',
    readyBannerTitle: "Handa nang Kunin ang Dokumento", readyBannerMsg: "ay handa na. Pumunta sa Barangay Hall at magdala ng valid ID.",
    viewClaimSlip: "Tingnan ang Claim Slip", claimSlipTitle: "Claim Slip ng Dokumento", resident: "Residente", dateIssued: "Petsa ng Paglabas",
    document: "Dokumento", download: "I-download", print: "I-print", close: "Isara", language: "Wika",
    publicAnnouncement: "Pampublikong Abiso", for: "Para sa",
    upcomingHolidays: "Mga Paparating na Holiday", noUpcomingHolidays: "Walang paparating na holiday.",
    slaNote: "Paalala: Pansamantalang naka-pause ang oras ng SLA tuwing may holiday."
  }
};

type Language = 'en' | 'fil';

const ResidentDashboard: React.FC = () => {
  const [filter, setFilter] = useState('all');
  const [isClaimSlipOpen, setIsClaimSlipOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState({ ref: '', doc: '', fee: '', dateReleased: '' });
  
  const [requests, setRequests] = useState<RequestData[]>([]);
  const [userData, setUserData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // ✅ BAGONG STATES PARA SA PROFILE / SETTINGS
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [newPurok, setNewPurok] = useState('');
  const [profileMsg, setProfileMsg] = useState({ text: '', type: '' });
  const [isUpdating, setIsUpdating] = useState(false);

  const [announcement, setAnnouncement] = useState<AnnouncementData | null>(null);
  const [holidays, setHolidays] = useState<HolidayData[]>([]);

  const [isSuspendedModalOpen, setIsSuspendedModalOpen] = useState(false);
  const [countdown, setCountdown] = useState(10);

  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('appLanguage') as Language) || 'en';
  });

  const t = translations[language];
  const claimSlipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('appLanguage', language);
  }, [language]);

  // ✅ MONITOR USER STATUS
  useEffect(() => {
    let unsubUser: any;
    const currentUid = localStorage.getItem('residentUid');

    if (currentUid) {
      const userRef = doc(db, "users", currentUid);
      unsubUser = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const status = data.status?.toLowerCase();
          
          if (status === 'suspended' || status === 'rejected') {
            setIsSuspendedModalOpen(true);
          }
        }
      });
    }

    return () => {
      if (unsubUser) unsubUser();
    };
  }, []);

  // ✅ COUNTDOWN TIMER
  useEffect(() => {
    let timer: any;
    if (isSuspendedModalOpen && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (isSuspendedModalOpen && countdown === 0) {
      localStorage.removeItem('residentUid');
      window.location.href = '/login';
    }
    return () => clearTimeout(timer);
  }, [isSuspendedModalOpen, countdown]);

  useEffect(() => {
    let unsubRequests: any;

    const fetchData = async () => {
      let currentUid = localStorage.getItem('residentUid');
      
      if (!currentUid && auth.currentUser) {
        currentUid = auth.currentUser.uid;
        localStorage.setItem('residentUid', currentUid);
      }

      if (currentUid) {
        const userRef = doc(db, "users", currentUid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          setUserData(userSnap.data());
        }

        const q = query(collection(db, "requests"), where("residentId", "==", currentUid));
        unsubRequests = onSnapshot(q, (snapshot) => {
          const reqData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as RequestData[];
          setRequests(reqData);
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    };

    fetchData();

    return () => {
      if (unsubRequests) unsubRequests();
    };
  }, []);

  // ✅ FETCH ANNOUNCEMENT & HOLIDAYS
  useEffect(() => {
    const fetchAnnouncement = async () => {
      try {
        const docRef = doc(db, "system_settings", "announcement");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          
          let isExpired = false;
          if (data.date) {
            const today = new Date();
            today.setHours(0, 0, 0, 0); 
            
            const parts = data.date.split('-');
            const annDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            annDate.setHours(23, 59, 59, 999); 

            if (annDate < today) {
              isExpired = true;
            }
          }

          if (data.isActive !== false && !isExpired) {
            setAnnouncement(data as AnnouncementData);
          } else {
            setAnnouncement(null); 
          }
        }
      } catch (error) {
        console.error("Error fetching announcement:", error);
      }
    };

    const unsubscribeHolidays = onSnapshot(collection(db, "holidays"), (snapshot) => {
      const holidaysData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as HolidayData[];
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const futureHolidays = holidaysData
        .filter(h => {
          if (!h.date) return false;
          const parts = h.date.split('-');
          const hDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
          return hDate >= today;
        })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 3); 

      setHolidays(futureHolidays);
    });

    fetchAnnouncement();
    return () => unsubscribeHolidays();
  }, []);

  const totalCount = requests.length;
  const underReviewCount = requests.filter(r => r.status === 'Under Review').length;
  const readyCount = requests.filter(r => r.status === 'Ready for Release').length;
  const releasedCount = requests.filter(r => r.status === 'Released').length;
  const approvedCount = readyCount + releasedCount;
  
  const filteredRequests = filter === 'all' 
    ? requests 
    : requests.filter(req => {
        if (filter === 'action-required') return req.status === 'Ready for Release';
        if (filter === 'in-progress') return req.status === 'Under Review';
        if (filter === 'released') return req.status === 'Released';
        return true;
      });

  const handleOpenClaimSlip = (ref: string, doc: string, fee: string, dateReleased?: string) => { 
    setSelectedRequest({ ref, doc, fee, dateReleased: dateReleased || '' }); 
    setIsClaimSlipOpen(true); 
  };

  const handleLogoutClick = () => {
    setIsMobileMenuOpen(false);
    setIsLogoutModalOpen(true);
  };

  const confirmLogout = () => {
    localStorage.removeItem('residentUid');
    window.location.href = '/login';
  };

  // ✅ FUNCTIONS PARA SA PROFILE MODAL
  const handleUpdatePurok = async () => {
    if (!newPurok) return;
    setIsUpdating(true);
    setProfileMsg({ text: '', type: '' });
    try {
      const currentUid = localStorage.getItem('residentUid');
      if (!currentUid) throw new Error("No UID");
      
      await updateDoc(doc(db, "users", currentUid), { purok: newPurok });
      setUserData((prev: any) => ({ ...prev, purok: newPurok }));
      setProfileMsg({ text: 'Purok updated successfully!', type: 'success' });
    } catch (error) {
      setProfileMsg({ text: 'Failed to update Purok.', type: 'error' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      setProfileMsg({ text: 'Password must be at least 6 characters.', type: 'error' });
      return;
    }
    setIsUpdating(true);
    setProfileMsg({ text: '', type: '' });
    try {
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, newPassword);
        setProfileMsg({ text: 'Password changed successfully!', type: 'success' });
        setNewPassword('');
      } else {
        throw new Error("Session expired. Please logout and login again.");
      }
    } catch (error: any) {
      setProfileMsg({ text: error.message || 'Failed to change password.', type: 'error' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDownloadClaimSlip = async () => {
    if (!claimSlipRef.current) return;
    
    try {
      const canvas = await html2canvas(claimSlipRef.current, {
        scale: 3,
        backgroundColor: '#ffffff',
        useCORS: true
      });
      
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a5' 
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Claim-Slip-${selectedRequest.ref}.pdf`);
    } catch (error) {
      console.error("Error generating PDF: ", error);
      alert("Failed to download PDF.");
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'R';
    const names = name.trim().split(' ');
    if (names.length > 1) return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    return names[0][0].toUpperCase();
  };

  const formatCurrency = (feeString: string) => {
    if (!feeString) return '₱0.00';
    if (feeString.toLowerCase().includes('libre') || feeString === '₱0.00' || feeString === '0') {
      return '₱0.00';
    }
    const numericValue = parseFloat(feeString.replace(/[^0-9.-]+/g, ""));
    if (isNaN(numericValue)) return feeString;
    return `₱${numericValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1; 
      const day = parseInt(parts[2]);
      const dateObj = new Date(year, month, day);
      return dateObj.toLocaleDateString(language === 'en' ? 'en-US' : 'fil-PH', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    return dateStr;
  };

  return (
    <IonPage>
      <IonContent className="bg-surface">
        
        <style>
          {`
            @media print {
              body * { visibility: hidden; }
              #printable-claim-slip, #printable-claim-slip * { visibility: visible; }
              #printable-claim-slip {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                padding: 10px;
                background: white;
                box-shadow: none !important;
              }
              .no-print { display: none !important; }
              @page { 
                size: A5 portrait;
                margin: 10mm; 
              }
            }
          `}
        </style>

        <div className="bg-surface font-body-md text-on-surface antialiased min-h-screen flex flex-col">
          
          {/* HEADER */}
          <header className="no-print fixed top-0 left-0 right-0 z-50 bg-surface-container-lowest/95 backdrop-blur-md shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
            <div className="bg-primary text-on-primary text-label-sm font-label-sm">
              <div className="max-w-7xl mx-auto px-4 md:px-margin flex flex-col md:flex-row items-center justify-between py-2 md:py-0 md:h-8 gap-1.5 md:gap-0">
                <div className="flex items-center justify-center gap-1 text-surface-container-high text-center md:text-left">
                  <span className="material-symbols-outlined text-secondary-fixed text-[14px] shrink-0">domain</span>
                  <span className="text-[10px] sm:text-[11px] md:text-sm leading-tight">
                    {language === 'en' ? 'Office Hours: Monday-Sunday 8:00 AM – 5:00 PM' : 'Oras ng Opisina: Lunes-Linggo 8:00 AM – 5:00 PM'}
                  </span>
                </div>
                <div className="flex items-center justify-center gap-1 text-tertiary-fixed text-center md:text-right">
                  <span className="material-symbols-outlined text-[14px] shrink-0">campaign</span>
                  <span className="font-medium text-[10px] sm:text-[11px] md:text-sm leading-tight">
                    {language === 'en' ? 'Advisory: Regular document processing schedule active.' : 'Abiso: Regular ang iskedyul ng pagproseso ng dokumento.'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="h-16 md:h-20 max-w-7xl mx-auto px-4 md:px-margin flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 shrink-0">
                <img alt="Logo" className="h-10 w-10 md:h-14 md:w-14 rounded-full object-cover bg-white shadow-sm" src={logoImage}/>
                <div className="flex flex-col">
                  <span className="font-title-lg text-sm md:text-title-lg font-bold text-primary tracking-tight leading-tight">BarangayEase</span>
                  <span className="font-label-sm text-[10px] md:text-label-sm text-on-surface-variant font-medium leading-none">Brgy. Malinao, Naujan</span>
                </div>
              </div>
              <nav className="hidden md:flex items-center justify-center gap-1 flex-1">
                <a className="px-3 py-2 transition-colors bg-primary text-on-primary font-bold rounded-lg shadow-sm text-sm whitespace-nowrap" href="/dashboard">{t.dashboard}</a>
                <a className="px-3 py-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors font-label-md text-sm whitespace-nowrap" href="/documents">{t.requestDocument}</a>
                <a className="px-3 py-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors font-label-md text-sm whitespace-nowrap" href="/track-status">{t.trackStatus}</a>
                <a className="px-3 py-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors font-label-md text-sm whitespace-nowrap" href="/history">{t.transactionHistory}</a>
              </nav>
              
              <div className="flex items-center justify-end gap-2 shrink-0">
                {/* ✅ USER PROFILE ICON */}
                <button 
                  onClick={() => {
                    setNewPurok(userData?.purok || '');
                    setProfileMsg({ text: '', type: '' });
                    setIsProfileModalOpen(true);
                  }}
                  className="p-2 text-primary cursor-pointer hover:bg-surface-container rounded-lg focus:outline-none transition-colors"
                  title="My Account"
                >
                  <span className="material-symbols-outlined text-[28px]">account_circle</span>
                </button>

                <div className="relative">
                  <button 
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="p-2 text-primary cursor-pointer hover:bg-surface-container rounded-lg focus:outline-none transition-colors"
                  >
                    <span className="material-symbols-outlined text-[28px]">
                      {isMobileMenuOpen ? 'close' : 'menu'}
                    </span>
                  </button>
                  
                  {isMobileMenuOpen && (
                    <div className="absolute right-0 mt-2 w-60 bg-white rounded-xl shadow-xl border border-outline-variant/50 flex flex-col p-2 z-[999] overflow-hidden">
                      
                      <div className="flex flex-col md:hidden gap-1">
                        <a className="px-4 py-2.5 text-sm font-semibold text-primary bg-primary/10 rounded-lg" href="/dashboard">{t.dashboard}</a>
                        <a className="px-4 py-2.5 text-sm font-semibold text-on-surface hover:bg-surface-container rounded-lg transition-colors" href="/documents">{t.requestDocument}</a>
                        <a className="px-4 py-2.5 text-sm font-semibold text-on-surface hover:bg-surface-container rounded-lg transition-colors" href="/track-status">{t.trackStatus}</a>
                        <a className="px-4 py-2.5 text-sm font-semibold text-on-surface hover:bg-surface-container rounded-lg transition-colors" href="/history">{t.transactionHistory}</a>
                        <div className="h-px bg-outline-variant/50 my-1 mx-2"></div>
                      </div>
                      
                      <div className="px-2 py-2">
                        <p className="text-[10px] font-bold uppercase text-outline mb-2 px-2 tracking-wider">{t.language}</p>
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
                  )}
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
          <main className="no-print w-full pt-28 md:pt-32 bg-surface flex-1">
            <div className="max-w-7xl mx-auto px-4 md:px-margin pt-space-xl pb-8">
              <div className="flex flex-col w-full gap-6">
                
                {/* ✅ PUBLIC ANNOUNCEMENT BANNER */}
                {announcement && (
                  <section className="animate-fade-in">
                    <article className="relative rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 p-4 md:p-6 shadow-sm flex flex-col md:flex-row items-start justify-between gap-4 overflow-hidden">
                      <div className="flex flex-col sm:flex-row items-start gap-4 relative z-10 w-full">
                        <div className="p-2.5 rounded-xl bg-blue-600 text-white shrink-0 shadow-sm">
                          <span className="material-symbols-outlined text-[26px]">campaign</span>
                        </div>
                        <div className="flex flex-col space-y-1 w-full">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-bold uppercase tracking-wider">
                              {t.publicAnnouncement}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-gray-200 text-gray-700 text-[10px] font-bold uppercase tracking-wider">
                              {t.for}: {announcement.audience}
                            </span>
                          </div>
                          <h3 className="font-title-md text-lg md:text-xl font-bold text-gray-900 mt-1">{announcement.title}</h3>
                          <p className="font-body-sm text-sm text-gray-700 leading-relaxed mt-1 whitespace-pre-wrap">{announcement.details}</p>
                          
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-xs font-semibold text-gray-600">
                            {announcement.date && (
                              <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-[16px]">calendar_month</span>
                                {formatDateDisplay(announcement.date)}
                              </span>
                            )}
                            {announcement.location && (
                              <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-[16px]">location_on</span>
                                {announcement.location}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </article>
                  </section>
                )}

                {/* READY FOR RELEASE BANNER */}
                {requests.filter(r => r.status === 'Ready for Release').map(req => (
                  <section key={req.id}>
                    <article className="rounded-xl bg-secondary-fixed p-4 md:p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div className="flex items-start gap-4 w-full">
                        <div className="p-2.5 rounded-xl bg-secondary text-on-secondary shrink-0 shadow-sm"><span className="material-symbols-outlined text-[26px]">mark_email_unread</span></div>
                        <div className="flex flex-col space-y-0.5 w-full">
                          <div className="flex items-center gap-2">
                            <span className="font-title-md text-sm md:text-base font-bold text-on-secondary-fixed">{t.readyBannerTitle}</span>
                            <span className="animate-pulse inline-block w-2.5 h-2.5 rounded-full bg-secondary"></span>
                          </div>
                          <p className="font-body-md text-xs md:text-sm text-on-secondary-fixed-variant leading-relaxed">Your {req.documentType} (Ref: {req.refNo}) {t.readyBannerMsg}</p>
                        </div>
                      </div>
                      <button onClick={() => handleOpenClaimSlip(req.refNo, req.documentType, req.fee, req.dateReleased)} className="w-full md:w-auto shrink-0 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-secondary text-on-secondary font-bold shadow-sm hover:bg-secondary-container text-xs md:text-sm" type="button">
                        <span className="material-symbols-outlined text-[18px]">receipt_long</span><span>{t.viewClaimSlip}</span>
                      </button>
                    </article>
                  </section>
                ))}

                {/* WELCOME BANNER */}
                <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary via-primary-container to-primary p-5 md:p-8 shadow-sm text-on-primary">
                  <div className="absolute -right-10 -bottom-10 w-64 h-64 rounded-full bg-secondary-container/10 blur-2xl pointer-events-none"></div>
                  <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                    <div className="flex items-start sm:items-center gap-4">
                      <div className="w-14 h-14 md:w-20 md:h-20 rounded-full bg-white text-primary font-bold flex items-center justify-center text-xl md:text-3xl shadow-md border-2 border-primary-fixed shrink-0">
                        {getInitials(userData?.fullName)}
                      </div>
                      <div className="flex flex-col space-y-1">
                        <h1 className="font-headline-md text-lg md:text-2xl font-bold text-on-primary">
                          {t.welcome}, {userData?.fullName ? userData.fullName.split(' ')[0] : 'Resident'}!
                        </h1>
                        <p className="font-body-md text-xs md:text-sm text-primary-fixed flex items-center gap-1.5 flex-wrap">
                          {userData?.fullName || 'Loading...'} • {userData?.purok || 'No Purok'}
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 text-[10px] md:text-xs font-bold ml-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span> {t.active}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* QUICK ACTIONS */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <button onClick={() => window.location.href = '/documents'} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-surface-container-lowest text-primary font-bold text-sm shadow-sm border border-outline-variant/50 hover:bg-surface-container transition-colors">
                    <span className="material-symbols-outlined text-[20px]">add_circle</span><span>{t.requestNewDoc}</span>
                  </button>
                  <button onClick={() => window.location.href = '/track-status'} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-surface-container-lowest text-secondary font-bold text-sm shadow-sm border border-outline-variant/50 hover:bg-surface-container transition-colors">
                    <span className="material-symbols-outlined text-[20px]">track_changes</span><span>{t.trackMyRequests}</span>
                  </button>
                </div>

                {/* ✅ UPCOMING HOLIDAYS SECTION */}
                {holidays.length > 0 && (
                  <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm border border-outline-variant/30 flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-orange-500 text-[20px]">event</span>
                      <h3 className="text-sm font-bold text-gray-800">{t.upcomingHolidays}</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {holidays.map(h => (
                        <div key={h.id} className="flex flex-col bg-orange-50 border border-orange-100 rounded-lg p-3">
                          <span className="text-[11px] font-bold text-orange-800 uppercase mb-1">{formatDateDisplay(h.date)}</span>
                          <span className="text-sm font-semibold text-gray-700 leading-tight">{h.name}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] text-gray-500 italic mt-1">{t.slaNote}</p>
                  </div>
                )}

                {/* STATS CARDS */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                  <div className="rounded-xl bg-surface-container-lowest p-3 md:p-5 shadow-sm flex flex-col justify-between border border-outline-variant/30">
                    <div className="flex items-center justify-between">
                      <span className="font-label-sm text-[10px] md:text-xs font-semibold uppercase text-on-surface-variant">{t.total}</span>
                      <div className="w-7 h-7 md:w-9 md:h-9 rounded-lg bg-surface-container-high flex items-center justify-center text-primary"><span className="material-symbols-outlined text-[16px] md:text-[20px]">folder_copy</span></div>
                    </div>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="font-display-hero text-xl md:text-3xl font-bold text-primary">{totalCount}</span>
                    </div>
                  </div>
                  <div className="rounded-xl bg-surface-container-lowest p-3 md:p-5 shadow-sm flex flex-col justify-between border border-outline-variant/30">
                    <div className="flex items-center justify-between">
                      <span className="font-label-sm text-[10px] md:text-xs font-semibold uppercase text-on-surface-variant">{t.underReview}</span>
                      <div className="w-7 h-7 md:w-9 md:h-9 rounded-lg bg-amber-100 flex items-center justify-center text-amber-800"><span className="material-symbols-outlined text-[16px] md:text-[20px]">hourglass_top</span></div>
                    </div>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="font-display-hero text-xl md:text-3xl font-bold text-on-surface">{underReviewCount}</span>
                    </div>
                  </div>
                  <div className="rounded-xl bg-surface-container-lowest p-3 md:p-5 shadow-sm flex flex-col justify-between border border-outline-variant/30">
                    <div className="flex items-center justify-between">
                      <span className="font-label-sm text-[10px] md:text-xs font-semibold uppercase text-on-surface-variant">{t.approved}</span>
                      <div className="w-7 h-7 md:w-9 md:h-9 rounded-lg bg-tertiary-fixed flex items-center justify-center text-tertiary"><span className="material-symbols-outlined text-[16px] md:text-[20px]">task_alt</span></div>
                    </div>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="font-display-hero text-xl md:text-3xl font-bold text-tertiary-container">{approvedCount}</span>
                    </div>
                  </div>
                  <div className="rounded-xl bg-secondary-fixed p-3 md:p-5 shadow-sm flex flex-col justify-between border border-secondary/20">
                    <div className="flex items-center justify-between">
                      <span className="font-label-sm text-[10px] md:text-xs font-bold uppercase text-secondary">{t.readyToClaim}</span>
                      <div className="w-7 h-7 md:w-9 md:h-9 rounded-lg bg-secondary text-on-secondary flex items-center justify-center shadow-sm"><span className="material-symbols-outlined text-[16px] md:text-[20px]">assignment_turned_in</span></div>
                    </div>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="font-display-hero text-xl md:text-3xl font-bold text-secondary">{readyCount}</span>
                    </div>
                  </div>
                </div>

                {/* RECENT REQUESTS SECTION */}
                <div className="flex flex-col space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h2 className="font-title-lg text-lg md:text-xl font-bold text-primary">{t.recentRequests}</h2>
                    <div className="flex items-center gap-2">
                      <span className="font-label-sm text-xs text-outline hidden sm:inline">{t.filter}:</span>
                      <select className="w-full sm:w-auto text-xs md:text-sm font-label-sm px-3 py-2 rounded-lg bg-surface-container text-on-surface outline-none cursor-pointer border border-outline-variant/30" value={filter} onChange={(e) => setFilter(e.target.value)}>
                        <option value="all">{t.allStatuses}</option>
                        <option value="action-required">{t.readyForRelease}</option>
                        <option value="in-progress">{t.underReview}</option>
                        <option value="released">{t.released}</option>
                      </select>
                    </div>
                  </div>

                  {/* ✅ DESKTOP TABLE */}
                  <div className="hidden md:block overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm border border-outline-variant/30">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-surface-container-low text-on-surface-variant font-label-sm uppercase tracking-wider">
                          <tr>
                            <th className="py-3 px-4">{t.refNo}</th>
                            <th className="py-3 px-4">{t.docType}</th>
                            <th className="py-3 px-4">{t.purpose}</th>
                            <th className="py-3 px-4">{t.dateFiled}</th>
                            <th className="py-3 px-4">{t.estRelease}</th>
                            <th className="py-3 px-4">{t.fee}</th>
                            <th className="py-3 px-4">{t.status}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y-0 text-body-sm font-body-sm">
                          {isLoading ? (
                            <tr><td colSpan={7} className="py-8 text-center text-outline">{t.loading}</td></tr>
                          ) : filteredRequests.length === 0 ? (
                            <tr><td colSpan={7} className="py-8 text-center text-outline">{t.noRequests}</td></tr>
                          ) : (
                            filteredRequests.map((req) => (
                              <tr key={req.id} className="hover:bg-surface-container-low/60 bg-surface-container-lowest">
                                <td className="py-3.5 px-4 font-mono font-bold text-secondary text-sm">{req.refNo}</td>
                                <td className="py-3.5 px-4">
                                  <div className="font-bold text-primary text-sm">{req.documentType}</div>
                                </td>
                                <td className="py-3.5 px-4 text-on-surface-variant text-sm">{req.purpose}</td>
                                <td className="py-3.5 px-4 text-on-surface-variant text-sm">{req.dateFiled}</td>
                                <td className="py-3.5 px-4 text-on-surface-variant font-semibold text-primary text-sm">{req.estimatedRelease || '—'}</td>
                                <td className="py-3.5 px-4 font-semibold text-on-surface text-sm">
                                  {formatCurrency(req.fee)}
                                </td>
                                <td className="py-3.5 px-4">
                                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold whitespace-nowrap ${
                                    req.status === 'Ready for Release' ? 'bg-secondary-fixed text-secondary' : 
                                    req.status === 'Under Review' ? 'bg-amber-100 text-amber-800' : 'bg-surface-container-high text-on-surface-variant'
                                  }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${req.status === 'Ready for Release' ? 'bg-secondary' : req.status === 'Under Review' ? 'bg-amber-600' : 'bg-outline'}`}></span> {req.status}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* ✅ MOBILE CARD VIEW */}
                  <div className="md:hidden flex flex-col gap-3">
                    {isLoading ? (
                      <div className="text-center text-outline text-sm py-8">{t.loading}</div>
                    ) : filteredRequests.length === 0 ? (
                      <div className="text-center text-outline text-sm py-8 bg-surface-container-lowest rounded-xl border border-outline-variant/30">{t.noRequests}</div>
                    ) : (
                      filteredRequests.map((req) => (
                        <div key={req.id} className="bg-surface-container-lowest rounded-xl p-4 shadow-sm border border-outline-variant/30 flex flex-col gap-3">
                          
                          <div className="flex justify-between items-start">
                            <span className="font-mono text-xs font-bold text-secondary bg-secondary/10 px-2 py-1 rounded-md">
                              #{req.refNo}
                            </span>
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap ${
                              req.status === 'Ready for Release' ? 'bg-secondary-fixed text-secondary' : 
                              req.status === 'Under Review' ? 'bg-amber-100 text-amber-800' : 'bg-surface-container-high text-on-surface-variant'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${req.status === 'Ready for Release' ? 'bg-secondary' : req.status === 'Under Review' ? 'bg-amber-600' : 'bg-outline'}`}></span> {req.status}
                            </span>
                          </div>

                          <div>
                            <div className="font-bold text-primary text-sm mb-1">{req.documentType}</div>
                            <div className="text-xs text-on-surface-variant mb-2">Purpose: {req.purpose}</div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 bg-surface-container-low p-2 rounded-lg">
                            <div>
                              <span className="text-[10px] text-outline uppercase block">Date Filed</span>
                              <span className="text-xs font-semibold text-on-surface">{req.dateFiled}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-outline uppercase block">Est. Release</span>
                              <span className="text-xs font-semibold text-primary">{req.estimatedRelease || '—'}</span>
                            </div>
                            <div className="col-span-2 mt-1 border-t border-outline-variant/30 pt-2 flex justify-between items-center">
                              <span className="text-[10px] text-outline uppercase font-bold">Fee</span>
                              <span className="text-sm font-bold text-on-surface">{formatCurrency(req.fee)}</span>
                            </div>
                          </div>

                        </div>
                      ))
                    )}
                  </div>

                </div>
              </div>
            </div>
          </main>

          {/* FOOTER */}
          <footer className="no-print w-full bg-primary text-on-primary pt-8 pb-6 shadow-[0_-2px_12px_rgba(0,0,0,0.05)] mt-auto">
            <div className="max-w-7xl mx-auto px-4 text-center text-xs text-primary-fixed">
              <p>© 2025 Barangay Malinao, Naujan. All Rights Reserved. BarangayEase Digital Civic Portal.</p>
            </div>
          </footer>

          {/* ✅ CLAIM SLIP MODAL */}
          {isClaimSlipOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-primary/50 backdrop-blur-sm p-4 print:bg-white print:p-0 print:static">
              
              <div 
                ref={claimSlipRef} 
                className="w-full max-w-md bg-white p-5 sm:p-8 rounded-xl shadow-2xl border-t-8 border-primary print:shadow-none print:rounded-none print:max-w-none print:border-t-0 print:p-4 max-h-[90vh] overflow-y-auto"
              >
                <div id="printable-claim-slip">
                  <div className="text-center border-b-2 border-gray-300 pb-4 mb-4">
                    <img src={logoImage} alt="Logo" style={{ width: '70px', height: '70px', borderRadius: '50%', objectFit: 'cover', margin: '0 auto 10px auto', display: 'block' }} />
                    <h1 className="text-base font-bold text-gray-900 uppercase tracking-widest leading-tight">Barangay Malinao</h1>
                    <p className="text-xs text-gray-600">Naujan, Oriental Mindoro</p>
                    <p className="text-[10px] font-semibold text-primary mt-1.5 uppercase tracking-wider">Document Claim Slip</p>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-center">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Reference Number</p>
                      <p className="text-base font-mono font-bold text-primary tracking-widest">{selectedRequest.ref}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                      <div className="col-span-2">
                        <p className="text-[10px] font-bold text-gray-500 uppercase mb-0.5">Resident Name</p>
                        <p className="font-semibold text-gray-900">{userData?.fullName || 'Resident'}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-[10px] font-bold text-gray-500 uppercase mb-0.5">Document Requested</p>
                        <p className="font-semibold text-gray-900">{selectedRequest.doc}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-500 uppercase mb-0.5">Date Released</p>
                        <p className="font-semibold text-gray-900 text-xs">{selectedRequest.dateReleased || new Date().toLocaleDateString('en-PH', { dateStyle: 'medium' })}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-500 uppercase mb-0.5">Purok</p>
                        <p className="font-semibold text-gray-900 text-xs">{userData?.purok || 'N/A'}</p>
                      </div>
                      
                      <div className="col-span-2 bg-blue-50/50 p-2.5 rounded-lg border border-blue-100 mt-1">
                        <p className="text-[10px] font-bold text-gray-500 uppercase mb-0.5">Amount to Pay / Fee</p>
                        <p className="font-bold text-blue-900 text-sm">{formatCurrency(selectedRequest.fee)}</p>
                      </div>

                      <div className="col-span-2 mt-1">
                        <p className="text-[10px] font-bold text-gray-500 uppercase mb-0.5">Status</p>
                        <span className="inline-block px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded uppercase tracking-wider">Ready for Release</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <p className="text-[10px] text-gray-500 leading-relaxed text-center italic mb-5">
                      "Please present this claim slip and a valid government-issued ID to the Barangay Hall to claim your document."
                    </p>
                    <div className="flex justify-between items-end px-2">
                      <div className="text-center w-28 sm:w-32">
                        <div className="border-b border-gray-400 mb-1"></div>
                        <p className="text-[10px] text-gray-600">Resident Signature</p>
                      </div>
                      <div className="text-center w-28 sm:w-32">
                        <div className="border-b border-gray-400 mb-1"></div>
                        <p className="text-[10px] text-gray-600">Barangay Secretary</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div 
                  className="no-print mt-6 flex flex-wrap justify-end gap-2 bg-gray-50 p-3 rounded-xl border border-gray-200"
                  data-html2canvas-ignore="true"
                >
                  <button onClick={() => setIsClaimSlipOpen(false)} className="rounded-lg px-3 py-1.5 font-semibold text-gray-600 hover:bg-gray-200 transition-colors text-xs sm:text-sm" type="button">{t.close}</button>
                  <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-lg bg-gray-800 px-3 py-1.5 font-bold text-white hover:bg-gray-900 transition-colors text-xs sm:text-sm" type="button"><span className="material-symbols-outlined text-[16px]">print</span>{t.print}</button>
                  <button onClick={handleDownloadClaimSlip} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 font-bold text-white hover:bg-primary-container transition-colors text-xs sm:text-sm" type="button"><span className="material-symbols-outlined text-[16px]">download</span>{t.download}</button>
                </div>
              </div>

            </div>
          )}

          {/* ================= LOGOUT CONFIRMATION MODAL ================= */}
          {isLogoutModalOpen && (
            <div className="no-print fixed inset-0 z-[100] flex items-center justify-center bg-primary/50 backdrop-blur-sm p-4">
              <div className="w-full max-w-sm rounded-2xl bg-surface-container-lowest p-6 shadow-2xl">
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-[36px]">logout</span>
                  </div>
                  <h2 className="text-xl font-bold text-primary">{t.logoutTitle}</h2>
                  <p className="mt-2 text-sm text-on-surface-variant leading-relaxed">
                    {t.logoutMessage}
                  </p>
                </div>
                <div className="mt-6 flex flex-col-reverse sm:flex-row gap-2">
                  <button onClick={() => setIsLogoutModalOpen(false)} className="flex-1 rounded-lg px-4 py-2.5 font-semibold text-primary bg-surface-container hover:bg-surface-container-high transition-colors">
                    {t.cancel}
                  </button>
                  <button onClick={confirmLogout} className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 font-bold text-white hover:bg-red-700 transition-colors flex items-center justify-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px]">logout</span>
                    {t.yesLogout}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ✅ PROFILE / CHANGE PASSWORD MODAL */}
          {isProfileModalOpen && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-primary/50 backdrop-blur-sm p-4">
              <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4 border-b pb-3">
                  <h2 className="text-xl font-bold text-primary">My Account</h2>
                  <button onClick={() => setIsProfileModalOpen(false)} className="text-gray-500 hover:bg-gray-100 rounded-full p-1">
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                {profileMsg.text && (
                  <div className={`p-2 mb-4 text-xs font-bold rounded-lg ${profileMsg.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {profileMsg.text}
                  </div>
                )}

                <div className="mb-4">
                  <p className="text-xs text-gray-500 font-bold uppercase">Full Name</p>
                  <p className="font-semibold text-gray-800">{userData?.fullName || 'Loading...'}</p>
                  <p className="text-xs text-gray-500 font-bold uppercase mt-2">Email</p>
                  <p className="font-semibold text-gray-800 text-sm">{userData?.email}</p>
                </div>

                <div className="mb-4">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Update Purok</label>
                  <select 
                    value={newPurok} 
                    onChange={(e) => setNewPurok(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm mb-2 cursor-pointer"
                  >
                    <option value="Purok 1 Centro">Purok 1 Centro</option>
                    <option value="Purok 2 Riverside">Purok 2 Riverside</option>
                    <option value="Purok 3 Ilaya">Purok 3 Ilaya</option>
                    <option value="Purok 4 Pag-asa">Purok 4 Pag-asa</option>
                    <option value="Purok 5 Maharlika">Purok 5 Maharlika</option>
                    <option value="Purok 6 Bukid">Purok 6 Bukid</option>
                    <option value="Purok 7 Silangan">Purok 7 Silangan</option>
                  </select>
                  <button onClick={handleUpdatePurok} disabled={isUpdating} className="w-full bg-secondary text-white font-bold py-2 rounded-lg text-xs hover:bg-blue-800 transition-colors">
                    Save Purok
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Change Password</label>
                  <input 
                    type="password" 
                    placeholder="New Password (min 6 chars)" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm mb-2"
                  />
                  <button onClick={handleChangePassword} disabled={isUpdating || !newPassword} className="w-full bg-primary text-white font-bold py-2 rounded-lg text-xs hover:bg-blue-900 disabled:bg-gray-400 transition-colors">
                    Update Password
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* ✅ SUSPENDED ACCOUNT AUTO-LOGOUT MODAL */}
          {isSuspendedModalOpen && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(11, 28, 48, 0.85)', backdropFilter: 'blur(8px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
              <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', padding: '40px 32px', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
                
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#ffdad6', color: '#ba1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', animation: 'pop 0.4s ease-out' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '48px' }}>gpp_bad</span>
                </div>
                
                <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#111827', margin: '0 0 12px 0' }}>Account Suspended</h2>
                <p style={{ fontSize: '14px', color: '#4b5563', margin: '0 0 32px 0', lineHeight: 1.6 }}>
                  Your account has been temporarily suspended by the Barangay Administration. You will be automatically logged out in <strong>{countdown}</strong> seconds.
                </p>
                
                <button 
                  onClick={() => {
                    localStorage.removeItem('residentUid');
                    window.location.href = '/login';
                  }} 
                  style={{ width: '100%', padding: '14px', borderRadius: '12px', backgroundColor: '#ba1a1a', color: '#ffffff', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px', transition: 'background-color 0.2s' }}
                >
                  Okay, I Understand
                </button>
                
                <style>
                  {`
                    @keyframes pop { 0% { transform: scale(0.5); opacity: 0; } 80% { transform: scale(1.1); } 100% { transform: scale(1); opacity: 1; } }
                  `}
                </style>
              </div>
            </div>
          )}

        </div>
      </IonContent>
    </IonPage>
  );
};

export default ResidentDashboard;