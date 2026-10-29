import React, { useState, useEffect } from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { collection, addDoc, doc, getDoc, onSnapshot } from "firebase/firestore";
import { auth, db, logAction } from '../firebase'; // ✅ IDINAGDAG ANG logAction
import logoImage from '../assets/logo.png';

interface DocumentType {
  id: string; 
  code: string;
  title: string; 
  fee: string; 
  numericFee: number; 
  isFree: boolean;
  description: string; 
  requirements: string[]; 
  processingTime: string; 
  icon: string; 
  colorClass: string; 
  btnClass: string;
}

// --- MASTER DATA ---
const masterData: Record<string, { title: string, desc: string, reqs: string[], icon: string, color: string }> = {
  'BRGY-CLR-01': { 
    title: 'Barangay Clearance', 
    desc: 'Required for employment, postal ID, bank transactions, and legal verification.', 
    reqs: ['1 Valid Government-issued ID', 'Proof of Residency', 'Cedula'], 
    icon: 'badge', 
    color: 'text-primary' 
  },
  'BRGY-IND-02': { 
    title: 'Certificate of Indigency', 
    desc: 'Issued to low-income residents for medical assistance, hospital billing, PCSO claims.', 
    reqs: ['1 Valid ID', 'Sitio Kagawad Referral', 'Hospital Bill (if applicable)'], 
    icon: 'volunteer_activism', 
    color: 'text-tertiary-container' 
  },
  'BRGY-RES-03': {
    title: 'Certificate of Residency',
    desc: 'Attests that the applicant is a bonafide resident of Barangay Malinao for at least 6 months.',
    reqs: ['1 Valid ID', 'Barangay Household ID', 'Proof of 6 Months Dwelling'],
    icon: 'home_pin',
    color: 'text-secondary'
  },
  'BRGY-BUS-04': {
    title: 'Barangay Business Clearance',
    desc: 'Mandatory prerequisite for new or renewing micro, small, and medium businesses.',
    reqs: ['DTI / SEC Registration', 'Contract of Lease', 'Previous Clearance'],
    icon: 'storefront',
    color: 'text-primary'
  },
  'BRGY-JOB-05': {
    title: 'First-Time Jobseeker (RA 11261)',
    desc: 'Waives all local government fees for clearances for first-time Filipino jobseekers.',
    reqs: ['Signed Oath of Undertaking', 'Proof of Graduation', '1 Valid ID'],
    icon: 'work',
    color: 'text-secondary'
  }
};

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
    
    portalTitle: "Official Document Issuance Portal",
    mainHeading: "Select a Barangay Document",
    subHeading: "Choose a Document or Certification",
    searchLabel: "Quick Find Document",
    searchPlaceholder: "Search clearance...",
    standardFee: "Standard Fee",
    requestBtn: "Request",

    reqForm: "Request Form",
    requirements: "Requirements:",
    purposeLabel: "Purpose",
    purposePlaceholder: "e.g. Employment, Medical Assistance...",
    uploadLabel: "Upload Valid ID (Picture)",
    uploadNote: "Please upload a clear photo of your Valid ID / Cedula.",
    toPay: "Amount to Pay:",
    cancel: "Cancel",
    submit: "Submit Request",
    submitting: "Submitting...",

    successTitle: "Request Submitted!",
    successMsg: "Your request has been successfully submitted. You can view it on your Dashboard.",

    logoutTitle: "Are you sure you want to log out?",
    logoutMsg: "You will need to sign in again to view your requests and apply for new documents.",
    logoutConfirm: "Yes, Log out",
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
    
    portalTitle: "Opisyal na Portal ng Pagbibigay ng Dokumento",
    mainHeading: "Pumili ng Dokumento sa Barangay",
    subHeading: "Pumili ng Dokumento o Sertipikasyon",
    searchLabel: "Mabilisang Hanapin",
    searchPlaceholder: "Maghanap ng clearance...",
    standardFee: "Karaniwang Bayad",
    requestBtn: "Humiling",

    reqForm: "Form ng Kahilingan",
    requirements: "Mga Kailangan:",
    purposeLabel: "Layunin",
    purposePlaceholder: "hal. Trabaho, Tulong Medikal...",
    uploadLabel: "Mag-upload ng Valid ID (Larawan)",
    uploadNote: "Mangyaring mag-upload ng malinaw na larawan ng iyong Valid ID / Cedula.",
    toPay: "Babayaran:",
    cancel: "Kanselahin",
    submit: "Ipasa ang Kahilingan",
    submitting: "Isinusumite...",

    successTitle: "Naipasa ang Kahilingan!",
    successMsg: "Matagumpay na naipasa ang iyong request. Makikita mo na ito sa iyong Dashboard.",

    logoutTitle: "Sigurado ka bang gusto mong mag-logout?",
    logoutMsg: "Kailangan mong mag-login muli para makita ang iyong mga request at makapag-apply ng bagong dokumento.",
    logoutConfirm: "Oo, Mag-logout",
  }
};

type Language = 'en' | 'fil';

const DocumentCatalog: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<DocumentType | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [purpose, setPurpose] = useState('');
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [showSuccess, setShowSuccess] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  // Firebase Documents State
  const [documents, setDocuments] = useState<DocumentType[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(true);

  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('appLanguage') as Language) || 'en';
  });

  const t = translations[language];

  useEffect(() => {
    localStorage.setItem('appLanguage', language);
  }, [language]);

  // --- FETCH DYNAMIC DOCUMENTS AT I-MERGE SA MASTER LIST ---
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "documentTypes"), (snapshot) => {
      const docsData = snapshot.docs.map(doc => {
        const data = doc.data();
        const code = data.code || '';
        
        const localInfo = masterData[code] || {
          title: data.title || 'Unknown Document',
          desc: 'Official Barangay Document. Please prepare a valid ID.',
          reqs: ['1 Valid ID', 'Proof of Residency (if applicable)'],
          icon: 'description',
          color: 'text-primary'
        };

        const numericFee = data.numericFee || 0;
        const isFree = numericFee === 0;

        return {
          id: doc.id,
          code: code,
          title: data.title || localInfo.title,
          fee: data.fee || '₱0.00',
          numericFee: numericFee,
          isFree: isFree,
          processingTime: data.processingTime || 'N/A',
          description: localInfo.desc,
          requirements: localInfo.reqs,
          icon: localInfo.icon,
          colorClass: localInfo.color,
          btnClass: 'bg-primary hover:bg-primary-container text-on-primary'
        } as DocumentType;
      });
      
      const activeDocs = docsData.filter((d: any) => d.status !== 'Inactive');
      
      setDocuments(activeDocs);
      setIsLoadingDocs(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) || doc.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const handleRequestClick = (doc: DocumentType) => {
    const uid = localStorage.getItem('residentUid') || auth.currentUser?.uid;
    if (!uid) {
      alert(language === 'en' ? "Session expired. Please login again." : "Nag-expire ang session. Mangyaring mag-login muli.");
      window.location.href = '/login';
      return;
    }
    setSelectedDoc(doc); 
    setPurpose(''); 
    setUploadedFile(null); 
    setIsModalOpen(true); 
  };
  
  const closeModal = () => { 
    setIsModalOpen(false); 
    setSelectedDoc(null); 
    setUploadedFile(null);
  };

  const handleLogoutClick = () => setIsLogoutModalOpen(true);
  const confirmLogout = () => {
    localStorage.removeItem('residentUid');
    window.location.href = '/login';
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setUploadedFile(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc) return;
    if (!uploadedFile) return alert(language === 'en' ? "Please upload a valid ID." : "Mangyaring mag-upload ng valid ID.");
    
    setIsSubmitting(true);
    const uid = localStorage.getItem('residentUid') || auth.currentUser?.uid;

    try {
      if (!uid) throw new Error("No user ID found.");
      const userRef = doc(db, "users", uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) throw new Error("User data not found in database.");
      const userData = userSnap.data();
      const randomNum = Math.floor(1000 + Math.random() * 9000); 
      const refNo = `REQ-${new Date().getFullYear()}-${randomNum}`;
      const dateFiled = new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date());
      
      await addDoc(collection(db, "requests"), {
        residentId: uid,
        residentName: userData.fullName || 'Unknown Resident',
        purok: userData.purok || 'Unknown Purok',
        refNo: refNo,
        documentType: selectedDoc.title,
        purpose: purpose,
        dateFiled: dateFiled,
        estimatedRelease: selectedDoc.processingTime,
        fee: selectedDoc.fee,
        numericFee: selectedDoc.numericFee,
        status: 'Pending',
        requirementImage: uploadedFile,
      });

      // ✅ IDINAGDAG: I-LOG ANG NEW DOCUMENT REQUEST SA AUDIT LOGS
      await logAction(
        "New Document Request",
        `Requested ${selectedDoc.title} (${refNo}). Purpose: ${purpose}.`,
        "info",
        userData.fullName || 'Resident', // Pangalan ng Residente
        "Resident"                       // Role
      );

      closeModal();
      setIsSubmitting(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);

    } catch (error: any) {
      console.error("Error submitting request: ", error);
      alert("Failed to submit request: " + error.message);
      setIsSubmitting(false);
    }
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
                  <span className="text-[10px] sm:text-[11px] md:text-sm leading-tight">{t.officeHours}</span>
                </div>
                <div className="flex items-center justify-center gap-1 text-tertiary-fixed text-center md:text-right">
                  <span className="material-symbols-outlined text-[14px] shrink-0">campaign</span>
                  <span className="font-medium text-[10px] sm:text-[11px] md:text-sm leading-tight">{t.advisory}</span>
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
                <a className="px-3 py-2 transition-colors bg-primary text-on-primary font-bold rounded-lg shadow-sm text-sm whitespace-nowrap" href="/documents">{t.navRequest}</a>
                <a className="px-3 py-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors font-label-md text-sm whitespace-nowrap" href="/track-status">{t.navTrack}</a>
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
                        <a className="px-4 py-2.5 text-sm font-semibold text-primary bg-primary/10 rounded-lg" href="/documents">{t.navRequest}</a>
                        <a className="px-4 py-2.5 text-sm font-semibold text-on-surface hover:bg-surface-container rounded-lg transition-colors" href="/track-status">{t.navTrack}</a>
                        <a className="px-4 py-2.5 text-sm font-semibold text-on-surface hover:bg-surface-container rounded-lg transition-colors" href="/history">{t.navHistory}</a>
                        <div className="h-px bg-outline-variant/50 my-1 mx-2"></div>
                      </div>
                      <div className="px-2 py-2">
                        <p className="text-[10px] font-bold uppercase text-outline mb-2 px-2 tracking-wider">{t.langLabel}</p>
                        <div className="flex bg-surface-container rounded-lg p-1">
                          <button onClick={() => setLanguage('en')} className={`flex-1 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${language === 'en' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}>English</button>
                          <button onClick={() => setLanguage('fil')} className={`flex-1 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${language === 'fil' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}>Filipino</button>
                        </div>
                      </div>
                      <div className="h-px bg-outline-variant/50 my-1 mx-2"></div>
                      <button onClick={handleLogoutClick} className="mx-2 px-3 py-2.5 mt-1 text-sm text-left text-red-600 font-bold hover:bg-red-50 rounded-lg flex items-center gap-2 transition-colors">
                        <span className="material-symbols-outlined text-[18px]">logout</span>{t.logout}
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
              
              <div className="flex flex-col gap-6 md:gap-8">
                
                <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 md:gap-6">
                  <div className="flex flex-col max-w-2xl">
                    <div className="flex items-center gap-2 mb-2 md:mb-3 text-[#0a558c]">
                      <span className="material-symbols-outlined text-[18px] md:text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                        verified_user
                      </span>
                      <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest">
                        {t.portalTitle}
                      </span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#00236f] tracking-tight mb-1 md:mb-2">
                      {t.mainHeading}
                    </h1>
                    <p className="text-sm md:text-[15px] font-medium text-[#0a558c]">
                      {t.subHeading}
                    </p>
                  </div>
                  
                  <div className="w-full lg:w-96 flex flex-col gap-1">
                    <label className="text-xs md:text-sm font-semibold text-slate-600" htmlFor="catalog-search">{t.searchLabel}</label>
                    <div className="relative flex items-center mt-1">
                      <span className="material-symbols-outlined absolute left-3 text-slate-400 text-[20px] pointer-events-none">search</span>
                      <input className="w-full h-11 pl-10 pr-4 bg-white border border-slate-200 rounded-lg text-on-surface text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all shadow-sm" id="catalog-search" onChange={(e) => setSearchQuery(e.target.value)} placeholder={t.searchPlaceholder} type="text" value={searchQuery} />
                    </div>
                  </div>
                </section>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {isLoadingDocs ? (
                    <div className="col-span-full py-10 text-center text-slate-500 flex flex-col items-center justify-center">
                      <span className="material-symbols-outlined animate-spin text-4xl mb-2">autorenew</span>
                      <p>Loading documents...</p>
                    </div>
                  ) : filteredDocs.length === 0 ? (
                    <div className="col-span-full py-10 text-center text-slate-500 border border-dashed border-slate-300 bg-slate-50 rounded-xl">
                      <span className="material-symbols-outlined text-5xl text-slate-400 mb-3 block">folder_off</span>
                      <p>No documents found.</p>
                    </div>
                  ) : (
                    filteredDocs.map(doc => (
                      <article key={doc.id} className="flex flex-col justify-between bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md hover:border-blue-300 transition-all overflow-hidden group">
                        <div className="p-5 md:p-6 flex flex-col">
                          <div className="flex items-start justify-between mb-3 md:mb-4">
                            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center ${doc.colorClass}`}>
                              <span className="material-symbols-outlined text-[24px] md:text-[28px]">{doc.icon}</span>
                            </div>
                            <div className="flex flex-col items-end">
                              {doc.isFree ? (
                                <span className="px-2.5 py-1 bg-green-100 text-green-700 border border-green-200 font-bold rounded-full text-[10px] md:text-xs">Libre</span>
                              ) : (
                                <>
                                  <span className="font-bold text-base md:text-lg text-primary">{doc.fee}</span>
                                  <span className="text-[9px] md:text-[10px] text-slate-500 uppercase font-semibold">{t.standardFee}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <h2 className="font-bold text-base md:text-lg text-primary mt-1 md:mt-2">{doc.title}</h2>
                          <p className="text-xs md:text-sm text-slate-600 mt-1.5 md:mt-2 line-clamp-3">{doc.description}</p>
                        </div>
                        <div className="p-5 md:p-6 pt-0 md:pt-0 mt-2">
                          <button 
                            type="button"
                            onClick={() => handleRequestClick(doc)} 
                            className={`w-full h-10 md:h-11 ${doc.btnClass} font-bold rounded-lg flex items-center justify-center gap-2 shadow-sm text-sm transition-transform active:scale-95`}
                          >
                            {t.requestBtn} <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                          </button>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </div>
            </div>
          </main>
          
          {/* FOOTER */}
          <footer className="w-full bg-primary text-on-primary pt-8 pb-6 shadow-[0_-2px_12px_rgba(0,0,0,0.05)] mt-auto">
            <div className="max-w-7xl mx-auto px-4 text-center text-xs text-primary-fixed">
              <p>© 2025 Barangay Malinao, Naujan. All Rights Reserved. BarangayEase Digital Civic Portal.</p>
            </div>
          </footer>

          {/* REQUEST MODAL */}
          {isModalOpen && selectedDoc && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-primary/50 backdrop-blur-sm p-4">
              <div className="w-full max-w-md rounded-2xl bg-surface-container-lowest p-5 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-start justify-between gap-4 border-b border-outline-variant/50 pb-4">
                  <div>
                    <p className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-secondary">{t.reqForm}</p>
                    <h2 className="mt-1 text-lg md:text-xl font-bold text-primary">{selectedDoc.title}</h2>
                  </div>
                  <button onClick={closeModal} className="rounded-lg p-2 text-on-surface-variant hover:bg-surface-container"><span className="material-symbols-outlined">close</span></button>
                </div>
                
                <form onSubmit={handleSubmitRequest} className="mt-5 flex flex-col gap-4">
                  <div className="bg-surface-container-low p-3 rounded-lg border border-slate-200">
                    <p className="text-[11px] md:text-xs text-on-surface-variant mb-2"><strong>{t.requirements}</strong></p>
                    <ul className="list-disc list-inside text-[11px] md:text-xs text-on-surface-variant space-y-1">
                      {selectedDoc.requirements.map((req, i) => <li key={i}>{req}</li>)}
                    </ul>
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1">{t.purposeLabel} <span className="text-red-500">*</span></label>
                    <input type="text" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder={t.purposePlaceholder} className="w-full px-3 py-2.5 rounded-lg bg-surface-container-low border border-outline-variant/50 focus:outline-none focus:ring-2 focus:ring-primary text-sm" required />
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1">{t.uploadLabel} <span className="text-red-500">*</span></label>
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant/50 text-xs md:text-sm" required />
                    <p className="text-[10px] text-gray-500 mt-1">{t.uploadNote}</p>
                  </div>

                  <div className="flex items-center justify-between bg-tertiary-fixed/30 p-3 rounded-lg mt-2">
                    <span className="text-xs md:text-sm font-bold text-tertiary">{t.toPay}</span>
                    <span className="text-base md:text-lg font-bold text-tertiary">
                      {selectedDoc.isFree ? '₱0.00' : selectedDoc.fee}
                    </span>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button type="button" onClick={closeModal} className="flex-1 rounded-lg px-4 py-2.5 font-semibold text-primary bg-surface-container hover:bg-surface-container-high transition-colors text-xs md:text-sm">{t.cancel}</button>
                    <button type="submit" disabled={isSubmitting} className="flex-1 rounded-lg bg-primary px-4 py-2.5 font-bold text-on-primary hover:bg-primary-container transition-colors disabled:bg-gray-400 text-xs md:text-sm">
                      {isSubmitting ? t.submitting : t.submit}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* SUCCESS MODAL */}
          {showSuccess && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(11, 28, 48, 0.7)', backdropFilter: 'blur(4px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
              <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', padding: '32px 24px', width: '100%', maxWidth: '360px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
                <div style={{ width: '70px', height: '70px', borderRadius: '50%', backgroundColor: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', animation: 'pop 0.4s ease-out' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '40px' }}>check_circle</span>
                </div>
                <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#0b1c30', margin: '0 0 8px 0' }}>{t.successTitle}</h2>
                <p style={{ fontSize: '13px', color: '#444651', margin: '0 0 16px 0', lineHeight: 1.5 }}>{t.successMsg}</p>
                <div style={{ width: '100%', height: '4px', backgroundColor: '#e5eeff', borderRadius: '2px', overflow: 'hidden', marginTop: '10px' }}>
                  <div style={{ height: '100%', backgroundColor: '#15803d', width: '100%', animation: 'load 3s linear forwards' }}></div>
                </div>
              </div>
            </div>
          )}

          {/* LOGOUT CONFIRMATION MODAL */}
          {isLogoutModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-primary/50 backdrop-blur-sm p-4">
              <div className="w-full max-w-sm rounded-2xl bg-surface-container-lowest p-6 shadow-2xl">
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-[36px]">logout</span>
                  </div>
                  <h2 className="text-lg md:text-xl font-bold text-primary">{t.logoutTitle}</h2>
                  <p className="mt-2 text-xs md:text-sm text-on-surface-variant leading-relaxed">{t.logoutMsg}</p>
                </div>
                <div className="mt-6 flex flex-col-reverse sm:flex-row gap-2">
                  <button onClick={() => setIsLogoutModalOpen(false)} className="flex-1 rounded-lg px-4 py-2.5 font-semibold text-primary bg-surface-container hover:bg-surface-container-high transition-colors text-xs md:text-sm">{t.cancel}</button>
                  <button onClick={confirmLogout} className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 font-bold text-white hover:bg-red-700 transition-colors flex items-center justify-center gap-1.5 text-xs md:text-sm">
                    <span className="material-symbols-outlined text-[18px]">logout</span>{t.logoutConfirm}
                  </button>
                </div>
              </div>
            </div>
          )}

          <style>
            {`
              @keyframes pop { 0% { transform: scale(0.5); opacity: 0; } 80% { transform: scale(1.1); } 100% { transform: scale(1); opacity: 1; } }
              @keyframes load { 0% { width: 0%; } 100% { width: 100%; } }
            `}
          </style>

        </div>
      </IonContent>
    </IonPage>
  );
};

export default DocumentCatalog;