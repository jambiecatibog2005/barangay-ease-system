import React, { useState, useEffect, useRef } from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { auth, db } from '../firebase'; 
import logoImage from '../assets/logo.png';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// --- TYPES ---
interface RequestData {
  id: string;
  refNo: string;
  documentType: string;
  purpose: string;
  dateFiled: string;
  dateReleased?: string;
  status: string;
  fee: string;
  remarks?: string;
  residentName?: string; 
  purok?: string;        
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
    myRequests: "My Requests",
    requestsLabel: "Requests",
    showing: "Showing",
    of: "of",
    requestsWord: "requests",
    pending: "Pending",
    processing: "Processing",
    ready: "Ready",
    released: "Released",
    rejected: "Rejected",
    inProgress: "In Progress",
    done: "Done",
    searchLabel: "Search by request number or document name",
    searchPlaceholder: "e.g. REQ-2026-001 or Barangay Clearance",
    filterLabel: "Filter by status",
    all: "All",
    underReview: "Under Review",
    approved: "Approved",
    readyForRelease: "Ready for Release",
    loading: "Loading requests...",
    noRequests: 'No requests found. Go to "Request Document" to apply.',
    requestNo: "Request No.",
    submitted: "Submitted:",
    purpose: "Purpose:",
    viewDetails: "View Details",

    // Status Guide
    statusGuideTitle: "What do the statuses mean?",
    guidePendingTitle: "Pending",
    guidePendingDesc: "Newly submitted and waiting for staff review.",
    guideUnderReviewTitle: "Under Review",
    guideUnderReviewDesc: "Barangay staff is checking the application and submitted documents.",
    guideApprovedTitle: "Approved",
    guideApprovedDesc: "Request is approved. Waiting for the document to be prepared.",
    guideReadyTitle: "Ready for Release",
    guideReadyDesc: "Document is ready. Bring the reference number and a valid ID.",
    guideReleasedTitle: "Released",
    guideReleasedDesc: "Document has been given to the applicant or authorized representative.",
    guideRejectedTitle: "Rejected",
    guideRejectedDesc: "Request did not proceed. Check the remarks for the reason.",

    // Details Modal
    reqDetailsTitle: "Request Details",
    reqDetailsMsg: "Full information and status timeline of your request.",
    reqNumber: "Request Number",
    docName: "Document Name",
    dateSubmitted: "Date Submitted",
    currentStatus: "Current Status",
    fee: "Fee",
    statusTimeline: "Status Timeline",
    claimSlipBtn: "View Claim Slip",
    claimSlipTitle: "Claim Slip",
    claimSlipMsg: "Sample claim slip only. Confirm the actual claiming schedule at the barangay.",
    claimingLocation: "Claiming Location",
    reminder: "Reminder",
    reminderText: "Bring one valid ID.",
    close: "Close",
    stoppedRejected: "Stopped — Rejected",
    currentStep: "Current step",
    reason: "Reason:",
    checkRemarks: "Check the staff remarks for the reason or next steps.",

    // Timeline
    tlPendingLabel: "Request Submitted",
    tlPendingDesc: "Request received by the system",
    tlUnderReviewLabel: "Under Review",
    tlUnderReviewDesc: "Staff checks the submitted information",
    tlApprovedLabel: "Approved",
    tlApprovedDesc: "Authorized barangay personnel approve the request",
    tlReadyLabel: "Ready for Release",
    tlReadyDesc: "Document is available for claiming",
    tlReleasedLabel: "Released",
    tlReleasedDesc: "Resident has received the document",

    // Print & Download Translations
    print: "Print",
    download: "Download PDF",

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
    myRequests: "Aking mga Kahilingan",
    requestsLabel: "Kahilingan",
    showing: "Ipinapakita",
    of: "ng",
    requestsWord: "kahilingan",
    pending: "Nakabinbin",
    processing: "Ginagawa",
    ready: "Handa",
    released: "Naibigay na",
    rejected: "Tinanggihan",
    inProgress: "Isinasagawa",
    done: "Tapos na",
    searchLabel: "Maghanap gamit ang request number o pangalan ng dokumento",
    searchPlaceholder: "Hal. REQ-2026-001 o Barangay Clearance",
    filterLabel: "Salain ayon sa status",
    all: "Lahat",
    underReview: "Sinusuri",
    approved: "Naaprubahan",
    readyForRelease: "Handa nang Kunin",
    loading: "Naglo-load ng mga request...",
    noRequests: 'Walang nahanap na request. Pumunta sa "Humiling ng Dokumento" para mag-apply.',
    requestNo: "Request No.",
    submitted: "Isinumite:",
    purpose: "Layunin:",
    viewDetails: "Tingnan ang Detalye",

    // Status Guide
    statusGuideTitle: "Ano ang ibig sabihin ng mga status?",
    guidePendingTitle: "Nakabinbin",
    guidePendingDesc: "Bagong pasok ang request at nakapila pa para sa review ng staff.",
    guideUnderReviewTitle: "Sinusuri",
    guideUnderReviewDesc: "Sinusuri pa ng barangay staff ang application at mga dokumentong isinumite.",
    guideApprovedTitle: "Naaprubahan",
    guideApprovedDesc: "Aprubado na ang request. Hinihintay na lang na maihanda ang dokumento.",
    guideReadyTitle: "Handa nang Kunin",
    guideReadyDesc: "Handa nang kunin ang dokumento. Dalhin ang reference number at isang valid ID.",
    guideReleasedTitle: "Naibigay na",
    guideReleasedDesc: "Naibigay na ang dokumento sa aplikante o awtorisadong kinatawan.",
    guideRejectedTitle: "Tinanggihan",
    guideRejectedDesc: "Hindi natuloy ang request. Tingnan ang remarks para sa dahilan.",

    // Details Modal
    reqDetailsTitle: "Detalye ng Kahilingan",
    reqDetailsMsg: "Buong impormasyon at status timeline ng iyong request.",
    reqNumber: "Request Number",
    docName: "Pangalan ng Dokumento",
    dateSubmitted: "Petsa ng Pagsusumite",
    currentStatus: "Kasalukuyang Status",
    fee: "Bayad",
    statusTimeline: "Timeline ng Status",
    claimSlipBtn: "Tingnan ang Claim Slip",
    claimSlipTitle: "Claim Slip",
    claimSlipMsg: "Sample claim slip lamang. Kumpirmahin ang aktuwal na claiming schedule sa barangay.",
    claimingLocation: "Lokasyon ng Pagkuha",
    reminder: "Paalala",
    reminderText: "Magdala ng isang valid ID.",
    close: "Isara",
    stoppedRejected: "Hinto — Tinanggihan",
    currentStep: "Kasalukuyang hakbang",
    reason: "Dahilan:",
    checkRemarks: "Tingnan ang remarks ng staff para sa dahilan o susunod na hakbang.",

    // Timeline
    tlPendingLabel: "Isinumite ang Request",
    tlPendingDesc: "Natanggap na ng system ang request",
    tlUnderReviewLabel: "Sinusuri",
    tlUnderReviewDesc: "Sinusuri ng staff ang isinumiteng impormasyon",
    tlApprovedLabel: "Naaprubahan",
    tlApprovedDesc: "Inaprubahan ng awtorisadong barangay personnel ang request",
    tlReadyLabel: "Handa nang Kunin",
    tlReadyDesc: "Pwede nang kunin ang dokumento",
    tlReleasedLabel: "Naibigay na",
    tlReleasedDesc: "Natanggap na ng residente ang dokumento",

    // Print & Download Translations
    print: "I-print",
    download: "I-download",

    // Logout Modal
    logoutTitle: "Sigurado ka bang gusto mong mag-logout?",
    logoutMsg: "Kailangan mong mag-login muli para makita ang iyong mga request at makapag-apply ng bagong dokumento.",
    logoutConfirm: "Oo, Mag-logout",
    cancel: "Kanselahin"
  }
};

const TrackStatus: React.FC = () => {
  // --- STATES ---
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState({ title: '', message: '', content: null as React.ReactNode });
  
  const [requests, setRequests] = useState<RequestData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  
  // ✅ STATES PARA SA CLAIM SLIP MODAL
  const [isClaimSlipOpen, setIsClaimSlipOpen] = useState(false);
  const [claimRequestData, setClaimRequestData] = useState<RequestData | null>(null);
  const claimSlipRef = useRef<HTMLDivElement>(null);

  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('appLanguage') as Language) || 'en';
  });

  const t = translations[language];

  useEffect(() => {
    localStorage.setItem('appLanguage', language);
  }, [language]);

  useEffect(() => {
    const uid = localStorage.getItem('residentUid') || auth.currentUser?.uid;
    if (!uid) {
      setIsLoading(false);
      return;
    }

    const q = query(collection(db, "requests"), where("residentId", "==", uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reqData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as RequestData[];
      setRequests(reqData);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // --- DERIVED DATA ---
  const pendingTotal = requests.filter(r => r.status === 'Pending').length;
  const processingTotal = requests.filter(r => r.status === 'Under Review' || r.status === 'Approved').length;
  const readyTotal = requests.filter(r => r.status === 'Ready for Release').length;
  const releasedTotal = requests.filter(r => r.status === 'Released').length;
  const rejectedTotal = requests.filter(r => r.status === 'Rejected').length;

  const filteredRequests = requests.filter(req => {
    const matchesSearch = !searchQuery || 
      (req.refNo || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
      (req.documentType || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusOrder = [
    { key: "Pending", label: t.tlPendingLabel, description: t.tlPendingDesc },
    { key: "Under Review", label: t.tlUnderReviewLabel, description: t.tlUnderReviewDesc },
    { key: "Approved", label: t.tlApprovedLabel, description: t.tlApprovedDesc },
    { key: "Ready for Release", label: t.tlReadyLabel, description: t.tlReadyDesc },
    { key: "Released", label: t.tlReleasedLabel, description: t.tlReleasedDesc }
  ];

  const translateStatus = (status: string) => {
    if (status === 'Pending') return t.pending;
    if (status === 'Under Review') return t.underReview;
    if (status === 'Approved') return t.approved;
    if (status === 'Ready for Release') return t.readyForRelease;
    if (status === 'Released') return t.released;
    if (status === 'Rejected') return t.rejected;
    return status;
  };

  // --- HANDLERS ---
  const openModal = (title: string, message: string, content: React.ReactNode) => {
    setModalConfig({ title, message, content });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalConfig({ title: '', message: '', content: null });
  };

  const handleLogoutClick = () => setIsLogoutModalOpen(true);
  const confirmLogout = () => {
    localStorage.removeItem('residentUid');
    window.location.href = '/login';
  };

  // ✅ DOWNLOAD AT PRINT FUNCTIONS
  const handleDownloadClaimSlip = async () => {
    if (!claimSlipRef.current) return;
    
    try {
      const canvas = await html2canvas(claimSlipRef.current, {
        scale: 3,
        backgroundColor: '#ffffff',
        useCORS: true
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Claim-Slip-${claimRequestData?.refNo}.pdf`);
    } catch (error) {
      console.error("Error generating PDF: ", error);
      alert("Failed to download PDF.");
    }
  };

  // --- RENDER HELPERS ---
  const renderTimeline = (request: RequestData) => {
    const currentIndex = statusOrder.findIndex(step => step.key === request.status);
    const isRejected = request.status === 'Rejected';
    const effectiveIndex = isRejected ? 1 : currentIndex;

    return (
      <ol className="space-y-3">
        {statusOrder.map((step, index) => {
          const reached = index <= effectiveIndex;
          const isCurrent = index === effectiveIndex;

          return (
            <li key={step.key} className="flex gap-3">
              <span className={`mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                reached
                  ? (isRejected && isCurrent ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-900')
                  : 'bg-slate-200 text-slate-500'
              }`}>
                {reached ? (isRejected && isCurrent ? '!' : '✓') : index + 1}
              </span>
              <div>
                <h4 className="font-semibold text-slate-900">{step.label}</h4>
                <p className="text-sm leading-5 text-slate-600">{step.description}</p>
                {isCurrent && (
                  <span className={`mt-1 inline-block text-xs font-bold uppercase tracking-wide ${
                    isRejected ? 'text-red-600' : 'text-blue-600'
                  }`}>
                    {isRejected ? t.stoppedRejected : t.currentStep}
                  </span>
                )}
              </div>
            </li>
          );
        })}
        {isRejected && (
          <li className="flex gap-3">
            <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-800">!</span>
            <div>
              <h4 className="font-semibold text-red-800">{t.rejected}</h4>
              <p className="text-sm leading-5 text-slate-600">
                {request.remarks
                  ? `${t.reason} ${request.remarks}`
                  : t.checkRemarks}
              </p>
            </div>
          </li>
        )}
      </ol>
    );
  };

  const renderDetail = (label: string, value: string) => (
    <div key={label}>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 break-words font-semibold text-slate-900">{value}</dd>
    </div>
  );

  const handleViewDetails = (request: RequestData) => {
    const content = (
      <div className="space-y-6">
        <dl className="grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
          {renderDetail(t.reqNumber, request.refNo)}
          {renderDetail(t.docName, request.documentType)}
          {renderDetail(t.dateSubmitted, request.dateFiled)}
          {renderDetail(t.purpose, request.purpose)}
          {renderDetail(t.currentStatus, translateStatus(request.status))}
          {renderDetail(t.fee, request.fee)}
        </dl>

        <section className="rounded-xl border border-slate-200 p-4">
          <h3 className="font-bold text-primary mb-4">{t.statusTimeline}</h3>
          {renderTimeline(request)}
        </section>

        <div className="flex flex-wrap gap-2">
          {request.status === 'Ready for Release' && (
            <button 
              onClick={() => {
                setClaimRequestData(request);
                setIsClaimSlipOpen(true);
              }}
              className="w-full sm:w-auto rounded-lg bg-secondary px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-800"
            >
              {t.claimSlipBtn}
            </button>
          )}
        </div>
      </div>
    );

    openModal(t.reqDetailsTitle, t.reqDetailsMsg, content);
  };

  return (
    <IonPage>
      <IonContent className="bg-surface">
        
        {/* ✅ CSS PARA SA PAG-PRINT */}
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
              @page { size: A5 portrait; margin: 10mm; }
            }
          `}
        </style>

        <div className="bg-surface font-body-md text-on-surface antialiased min-h-screen flex flex-col">
          
          {/* HEADER */}
          <header className="fixed top-0 left-0 right-0 z-50 bg-surface-container-lowest/95 backdrop-blur-md shadow-[0_1px_8px_rgba(0,0,0,0.04)] print:hidden">
            
            {/* TOP BAR */}
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
                <a className="px-3 py-2 transition-colors bg-primary text-on-primary font-bold rounded-lg shadow-sm text-sm whitespace-nowrap" href="/track-status">{t.navTrack}</a>
                <a className="px-3 py-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors font-label-md text-sm whitespace-nowrap" href="/history">{t.navHistory}</a>
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
                        <a className="px-4 py-2.5 text-sm font-semibold text-primary bg-primary/10 rounded-lg" href="/track-status">{t.navTrack}</a>
                        <a className="px-4 py-2.5 text-sm font-semibold text-on-surface hover:bg-surface-container rounded-lg transition-colors" href="/history">{t.navHistory}</a>
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
              
              <section className="rounded-2xl border border-slate-200 bg-white p-4 md:p-8 shadow-sm">
                
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
                    {t.myRequests}
                  </h2>
                  <p className="text-sm md:text-[15px] font-medium text-[#0a558c]">
                    {filteredRequests.length} {t.requestsLabel}
                  </p>
                </div>

                {/* Right side text (Showing X of Y) */}
                <div className="flex justify-end mb-4">
                   <p className="text-xs md:text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                     {t.showing} <span className="font-bold text-primary">{filteredRequests.length}</span> {t.of} {requests.length} {t.requestsWord}
                   </p>
                </div>

                {/* SUMMARY CARDS */}
                <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-5">
                  <article className="rounded-xl bg-white p-3 md:p-4 shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] md:text-xs font-semibold uppercase tracking-wider text-slate-600">{t.pending}</span>
                      <span className="flex h-7 w-7 md:h-9 md:w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
                        <span className="material-symbols-outlined text-base md:text-xl">hourglass_top</span>
                      </span>
                    </div>
                    <div className="mt-2 flex items-baseline justify-between gap-2">
                      <span className="text-2xl md:text-4xl font-bold text-primary">{pendingTotal}</span>
                      <span className="hidden sm:inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">{t.pending}</span>
                    </div>
                  </article>

                  <article className="rounded-xl bg-white p-3 md:p-4 shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] md:text-xs font-semibold uppercase tracking-wider text-slate-600">{t.processing}</span>
                      <span className="flex h-7 w-7 md:h-9 md:w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-800">
                        <span className="material-symbols-outlined text-base md:text-xl">fact_check</span>
                      </span>
                    </div>
                    <div className="mt-2 flex items-baseline justify-between gap-2">
                      <span className="text-2xl md:text-4xl font-bold text-primary">{processingTotal}</span>
                      <span className="hidden sm:inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800">{t.inProgress}</span>
                    </div>
                  </article>

                  <article className="rounded-xl bg-white p-3 md:p-4 shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] md:text-xs font-semibold uppercase tracking-wider text-slate-600">{t.ready}</span>
                      <span className="flex h-7 w-7 md:h-9 md:w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                        <span className="material-symbols-outlined text-base md:text-xl">assignment_turned_in</span>
                      </span>
                    </div>
                    <div className="mt-2 flex items-baseline justify-between gap-2">
                      <span className="text-2xl md:text-4xl font-bold text-primary">{readyTotal}</span>
                      <span className="hidden sm:inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">{t.ready}</span>
                    </div>
                  </article>

                  <article className="rounded-xl bg-white p-3 md:p-4 shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] md:text-xs font-semibold uppercase tracking-wider text-slate-600">{t.released}</span>
                      <span className="flex h-7 w-7 md:h-9 md:w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-800">
                        <span className="material-symbols-outlined text-base md:text-xl">check_circle</span>
                      </span>
                    </div>
                    <div className="mt-2 flex items-baseline justify-between gap-2">
                      <span className="text-2xl md:text-4xl font-bold text-primary">{releasedTotal}</span>
                      <span className="hidden sm:inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-800">{t.done}</span>
                    </div>
                  </article>

                  <article className="rounded-xl bg-white p-3 md:p-4 shadow-sm border border-slate-200 col-span-2 lg:col-span-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] md:text-xs font-semibold uppercase tracking-wider text-slate-600">{t.rejected}</span>
                      <span className="flex h-7 w-7 md:h-9 md:w-9 items-center justify-center rounded-lg bg-red-100 text-red-800">
                        <span className="material-symbols-outlined text-base md:text-xl">cancel</span>
                      </span>
                    </div>
                    <div className="mt-2 flex items-baseline justify-between gap-2">
                      <span className="text-2xl md:text-4xl font-bold text-primary">{rejectedTotal}</span>
                      <span className="hidden sm:inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">{t.rejected}</span>
                    </div>
                  </article>
                </div>

                {/* SEARCH & FILTER */}
                <div className="mt-6 flex flex-col md:flex-row gap-4">
                  <label className="block flex-1">
                    <span className="text-xs md:text-sm font-semibold text-slate-800">{t.searchLabel}</span>
                    <div className="relative mt-1.5 md:mt-2">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">search</span>
                      <input 
                        type="search" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={t.searchPlaceholder}
                        className="h-11 w-full rounded-lg border border-slate-300 pl-10 pr-4 outline-none focus:border-secondary focus:ring-2 focus:ring-blue-100 text-sm bg-slate-50 focus:bg-white transition-colors"
                      />
                    </div>
                  </label>
                  <label className="block md:w-64">
                    <span className="text-xs md:text-sm font-semibold text-slate-800">{t.filterLabel}</span>
                    <div className="relative mt-1.5 md:mt-2">
                      <select 
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="h-11 w-full appearance-none rounded-lg border border-slate-300 bg-slate-50 px-4 outline-none focus:border-secondary focus:ring-2 focus:ring-blue-100 text-sm focus:bg-white transition-colors cursor-pointer"
                      >
                        <option value="all">{t.all}</option>
                        <option value="Pending">{t.pending}</option>
                        <option value="Under Review">{t.underReview}</option>
                        <option value="Approved">{t.approved}</option>
                        <option value="Ready for Release">{t.readyForRelease}</option>
                        <option value="Released">{t.released}</option>
                        <option value="Rejected">{t.rejected}</option>
                      </select>
                      <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
                    </div>
                  </label>
                </div>

                {/* LIST */}
                <div className="mt-6 md:mt-8 space-y-3 md:space-y-4">
                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                      <span className="material-symbols-outlined animate-spin text-4xl mb-2">autorenew</span>
                      <p className="text-sm">{t.loading}</p>
                    </div>
                  ) : filteredRequests.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center flex flex-col items-center">
                      <span className="material-symbols-outlined text-5xl text-slate-400 mb-3">receipt_long</span>
                      <p className="text-sm text-slate-600 font-medium">{t.noRequests}</p>
                    </div>
                  ) : (
                    filteredRequests.map((request) => (
                      <article key={request.id} className="group rounded-xl border border-slate-200 bg-white p-4 md:p-5 shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-200">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="material-symbols-outlined text-[16px] md:text-[18px] text-blue-500">tag</span>
                              <p className="font-mono text-xs md:text-sm font-bold tracking-wide text-blue-700">{request.refNo}</p>
                            </div>
                            <h3 className="text-base md:text-lg font-bold text-slate-900">{request.documentType}</h3>
                          </div>
                          <span className={`inline-flex items-center gap-1.5 w-fit rounded-full px-2.5 py-1 text-[10px] md:text-xs font-bold border ${
                            request.status === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                            request.status === 'Under Review' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                            request.status === 'Approved' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 
                            request.status === 'Ready for Release' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                            request.status === 'Released' ? 'bg-slate-100 text-slate-700 border-slate-300' :
                            request.status === 'Rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                            'bg-slate-100 text-slate-700 border-slate-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              request.status === 'Pending' ? 'bg-amber-500' : 
                              request.status === 'Under Review' ? 'bg-blue-500' : 
                              request.status === 'Approved' ? 'bg-indigo-500' : 
                              request.status === 'Ready for Release' ? 'bg-emerald-500' : 
                              request.status === 'Released' ? 'bg-slate-500' :
                              request.status === 'Rejected' ? 'bg-red-500' :
                              'bg-slate-500'
                            }`}></span>
                            {translateStatus(request.status)}
                          </span>
                        </div>
                        
                        <div className="mt-3 md:mt-4 grid gap-2 text-xs md:text-sm sm:grid-cols-2 bg-slate-50 p-2.5 md:p-3 rounded-lg border border-slate-100">
                          <div className="flex items-center gap-1.5 md:gap-2 text-slate-600">
                            <span className="material-symbols-outlined text-[14px] md:text-[16px]">calendar_today</span>
                            <span className="font-semibold">{t.submitted}</span> {request.dateFiled}
                          </div>
                          <div className="flex items-center gap-1.5 md:gap-2 text-slate-600">
                            <span className="material-symbols-outlined text-[14px] md:text-[16px]">info</span>
                            <span className="font-semibold">{t.purpose}</span> {request.purpose}
                          </div>
                        </div>

                        <div className="mt-3 md:mt-4 flex justify-end">
                          <button 
                            onClick={() => handleViewDetails(request)}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-primary/10 px-4 py-2 text-xs md:text-sm font-bold text-primary hover:bg-primary hover:text-white transition-colors"
                          >
                            <span className="material-symbols-outlined text-[16px] md:text-[18px]">visibility</span>
                            {t.viewDetails}
                          </button>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </section>

              {/* STATUS GUIDE */}
              <section className="mt-8 md:mt-10">
                <h2 className="text-lg md:text-xl font-bold text-primary">{t.statusGuideTitle}</h2>
                <div className="mt-3 md:mt-4 grid gap-3 md:gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <article className="rounded-xl border border-slate-200 bg-white p-4 md:p-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-800">
                        <span className="material-symbols-outlined text-[16px] md:text-[18px]">hourglass_top</span>
                      </div>
                      <h3 className="font-bold text-slate-900 text-sm md:text-base">{t.guidePendingTitle}</h3>
                    </div>
                    <p className="mt-1 text-xs md:text-sm leading-relaxed text-slate-600">{t.guidePendingDesc}</p>
                  </article>
                  <article className="rounded-xl border border-slate-200 bg-white p-4 md:p-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-800">
                        <span className="material-symbols-outlined text-[16px] md:text-[18px]">fact_check</span>
                      </div>
                      <h3 className="font-bold text-slate-900 text-sm md:text-base">{t.guideUnderReviewTitle}</h3>
                    </div>
                    <p className="mt-1 text-xs md:text-sm leading-relaxed text-slate-600">{t.guideUnderReviewDesc}</p>
                  </article>
                  <article className="rounded-xl border border-slate-200 bg-white p-4 md:p-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-800">
                        <span className="material-symbols-outlined text-[16px] md:text-[18px]">task_alt</span>
                      </div>
                      <h3 className="font-bold text-slate-900 text-sm md:text-base">{t.guideApprovedTitle}</h3>
                    </div>
                    <p className="mt-1 text-xs md:text-sm leading-relaxed text-slate-600">{t.guideApprovedDesc}</p>
                  </article>
                  <article className="rounded-xl border border-slate-200 bg-white p-4 md:p-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800">
                        <span className="material-symbols-outlined text-[16px] md:text-[18px]">assignment_turned_in</span>
                      </div>
                      <h3 className="font-bold text-slate-900 text-sm md:text-base">{t.guideReadyTitle}</h3>
                    </div>
                    <p className="mt-1 text-xs md:text-sm leading-relaxed text-slate-600">{t.guideReadyDesc}</p>
                  </article>
                  <article className="rounded-xl border border-slate-200 bg-white p-4 md:p-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-800">
                        <span className="material-symbols-outlined text-[16px] md:text-[18px]">check_circle</span>
                      </div>
                      <h3 className="font-bold text-slate-900 text-sm md:text-base">{t.guideReleasedTitle}</h3>
                    </div>
                    <p className="mt-1 text-xs md:text-sm leading-relaxed text-slate-600">{t.guideReleasedDesc}</p>
                  </article>
                  <article className="rounded-xl border border-slate-200 bg-white p-4 md:p-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-red-100 flex items-center justify-center text-red-800">
                        <span className="material-symbols-outlined text-[16px] md:text-[18px]">cancel</span>
                      </div>
                      <h3 className="font-bold text-slate-900 text-sm md:text-base">{t.guideRejectedTitle}</h3>
                    </div>
                    <p className="mt-1 text-xs md:text-sm leading-relaxed text-slate-600">{t.guideRejectedDesc}</p>
                  </article>
                </div>
              </section>

            </div>
          </main>

          {/* FOOTER */}
          <footer className="w-full bg-primary text-on-primary pt-8 pb-6 shadow-[0_-2px_12px_rgba(0,0,0,0.05)] print:hidden mt-auto">
            <div className="max-w-7xl mx-auto px-4 text-center text-xs text-primary-fixed">
              <p>© 2025 Barangay Malinao, Naujan. All Rights Reserved. BarangayEase Digital Civic Portal.</p>
            </div>
          </footer>

          {/* ACTION DIALOG MODAL */}
          {isModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-primary/50 backdrop-blur-sm p-4 overflow-y-auto">
              <div className="w-full max-w-lg rounded-2xl bg-white p-5 md:p-6 shadow-2xl relative my-8 max-h-[90vh] overflow-y-auto">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg md:text-xl font-bold text-primary">{modalConfig.title}</h2>
                    <p className="mt-1.5 md:mt-2 text-xs md:text-sm leading-6 text-slate-600">{modalConfig.message}</p>
                  </div>
                  <button onClick={closeModal} type="button" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close">✕</button>
                </div>
                
                <div className="mt-4 md:mt-5">{modalConfig.content}</div>
                
                <div className="mt-6 flex justify-end">
                  <button onClick={closeModal} type="button" className="rounded-lg bg-primary px-5 py-2.5 font-semibold text-white hover:bg-blue-900 text-sm">
                    {t.close}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ✅ CLAIM SLIP MODAL (UPDATED) */}
          {isClaimSlipOpen && claimRequestData && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-primary/50 backdrop-blur-sm p-4 print:bg-white print:p-0 print:static">
              
              <div 
                ref={claimSlipRef} 
                className="w-full max-w-md bg-white p-5 sm:p-8 rounded-xl shadow-2xl border-t-8 border-primary print:shadow-none print:rounded-none print:max-w-none print:border-t-0 print:p-4 max-h-[90vh] overflow-y-auto"
              >
                {/* ✅ ITO YUNG PAPEL NA MAKUKUHA SA PDF/PRINT */}
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
                      <p className="text-base font-mono font-bold text-primary tracking-widest">{claimRequestData.refNo}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                      <div className="col-span-2">
                        <p className="text-[10px] font-bold text-gray-500 uppercase mb-0.5">Resident Name</p>
                        <p className="font-semibold text-gray-900">{claimRequestData.residentName || 'Resident'}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-[10px] font-bold text-gray-500 uppercase mb-0.5">Document Requested</p>
                        <p className="font-semibold text-gray-900">{claimRequestData.documentType}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-500 uppercase mb-0.5">Date Released</p>
                        <p className="font-semibold text-gray-900 text-xs">{claimRequestData.dateReleased || new Date().toLocaleDateString('en-PH', { dateStyle: 'medium' })}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-500 uppercase mb-0.5">Purok</p>
                        <p className="font-semibold text-gray-900 text-xs">{claimRequestData.purok || 'N/A'}</p>
                      </div>
                      
                      {/* ✅ IDINAGDAG NA FEE */}
                      <div className="col-span-2 bg-blue-50/50 p-2.5 rounded-lg border border-blue-100 mt-1">
                        <p className="text-[10px] font-bold text-gray-500 uppercase mb-0.5">Amount to Pay / Fee</p>
                        <p className="font-bold text-blue-900 text-sm">{claimRequestData.fee || '₱0.00'}</p>
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

                {/* ✅ MGA BUTTONS (Nasa loob para maganda, pero naka-ignore sa Print at PDF) */}
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

export default TrackStatus;