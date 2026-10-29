import React, { useState, useEffect } from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { auth, db, logAction } from '../firebase'; 
import logoImage from '../assets/logo.png';

const ResidentSettings: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [purok, setPurok] = useState('');
  
  // Password states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  
  const [language, setLanguage] = useState<'en' | 'fil'>(() => {
    return (localStorage.getItem('appLanguage') as 'en' | 'fil') || 'en';
  });

  // ✅ KUMPLETONG TRANSLATIONS (Menu + Settings Content)
  const t = {
    en: { 
      dashboard: "Dashboard", 
      requestDoc: "Request Document", 
      trackStatus: "Track Status", 
      history: "Transaction History", 
      settings: "Settings", 
      langLabel: "Language", 
      logout: "Logout",
      cancel: "Cancel", 
      yesLogout: "Yes, Log out", 
      logoutTitle: "Are you sure you want to log out?",
      logoutMessage: "You will need to sign in again to view your requests and apply for new documents.",
      officeHours: "Office Hours: Monday-Sunday 8:00 AM – 5:00 PM",
      advisory: "Advisory: Regular document processing schedule active.",
      profileInfo: "Profile Information",
      updateProfileDesc: "Update your personal details.",
      fullNameLabel: "Full Name",
      purokLabel: "Purok",
      saveProfile: "Save Profile",
      saving: "Saving...",
      securityTitle: "Security",
      changePasswordDesc: "Change your account password.",
      currentPasswordLabel: "Current Password",
      newPasswordLabel: "New Password",
      passwordNote: "Must be at least 6 characters long.",
      updatePassword: "Update Password",
      updating: "Updating...",
      successProfile: "Profile updated successfully!",
      errorProfile: "Failed to update profile: ",
      successPassword: "Password updated successfully!",
      errorPasswordWrong: "Incorrect current password.",
      errorPasswordFail: "Failed to update password: "
    },
    fil: { 
      dashboard: "Panel ng Residente", 
      requestDoc: "Humiling ng Dokumento", 
      trackStatus: "Subaybayan ang Status", 
      history: "Kasaysayan ng Transaksyon", 
      settings: "Mga Setting", 
      langLabel: "Wika", 
      logout: "Mag-logout",
      cancel: "Kanselahin", 
      yesLogout: "Oo, Mag-logout", 
      logoutTitle: "Sigurado ka bang gusto mong mag-logout?",
      logoutMessage: "Kailangan mong mag-login muli para makita ang iyong mga request at makapag-apply ng bagong dokumento.",
      officeHours: "Oras ng Opisina: Lunes-Linggo 8:00 AM – 5:00 PM",
      advisory: "Abiso: Regular ang iskedyul ng pagproseso ng dokumento.",
      profileInfo: "Impormasyon ng Profile",
      updateProfileDesc: "I-update ang iyong personal na detalye.",
      fullNameLabel: "Buong Pangalan",
      purokLabel: "Purok",
      saveProfile: "I-save ang Profile",
      saving: "Isinasave...",
      securityTitle: "Seguridad",
      changePasswordDesc: "Palitan ang password ng iyong account.",
      currentPasswordLabel: "Kasalukuyang Password",
      newPasswordLabel: "Bagong Password",
      passwordNote: "Dapat hindi bababa sa 6 na karakter.",
      updatePassword: "I-update ang Password",
      updating: "Ina-update...",
      successProfile: "Matagumpay na na-update ang profile!",
      errorProfile: "Nabigong i-update ang profile: ",
      successPassword: "Matagumpay na na-update ang password!",
      errorPasswordWrong: "Mali ang kasalukuyang password.",
      errorPasswordFail: "Nabigong i-update ang password: "
    }
  }[language];

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3500);
  };

  useEffect(() => {
    localStorage.setItem('appLanguage', language);
  }, [language]);

  useEffect(() => {
    const fetchUserData = async () => {
      const uid = localStorage.getItem('residentUid');
      if (uid) {
        const docRef = doc(db, "users", uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setFullName(data.fullName || '');
          setPurok(data.purok || '');
        }
      }
    };

    fetchUserData();
  }, []);

  const handleLogoutClick = () => {
    setIsMobileMenuOpen(false);
    setIsLogoutModalOpen(true);
  };

  const confirmLogout = () => {
    localStorage.removeItem('residentUid');
    window.location.href = '/login';
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const uid = localStorage.getItem('residentUid');
    
    try {
      if (!uid) throw new Error("User not found");
      
      await updateDoc(doc(db, "users", uid), {
        fullName: fullName,
        purok: purok
      });

      await logAction(
        "Updated Profile",
        `Resident updated their profile info (Name: ${fullName}, Purok: ${purok}).`,
        "info",
        fullName,
        "Resident"
      );

      showNotification(t.successProfile, "success");
    } catch (error: any) {
      showNotification(t.errorProfile + error.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    setIsSaving(true);

    try {
      const credential = EmailAuthProvider.credential(auth.currentUser.email!, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, newPassword);

      await logAction(
        "Changed Password",
        `Resident changed their account password.`,
        "warning",
        fullName || 'Resident',
        "Resident"
      );

      showNotification(t.successPassword, "success");
      setCurrentPassword('');
      setNewPassword('');
    } catch (error: any) {
      if (error.code === 'auth/wrong-password') {
        showNotification(t.errorPasswordWrong, "error");
      } else {
        showNotification(t.errorPasswordFail + error.message, "error");
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <IonPage>
      <IonContent className="bg-surface">
        <div className="bg-surface font-body-md text-on-surface antialiased min-h-screen flex flex-col">
          
          {/* HEADER (Gaya sa Dashboard) */}
          <header className="fixed top-0 left-0 right-0 z-50 bg-surface-container-lowest/95 backdrop-blur-md shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
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
            
            <div className="h-16 md:h-20 max-w-7xl mx-auto px-4 md:px-margin flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 shrink-0">
                <img alt="Logo" className="h-10 w-10 md:h-14 md:w-14 rounded-full object-cover bg-white shadow-sm" src={logoImage}/>
                <div className="flex flex-col">
                  <span className="font-title-lg text-sm md:text-title-lg font-bold text-primary tracking-tight leading-tight">BarangayEase</span>
                  <span className="font-label-sm text-[10px] md:text-label-sm text-on-surface-variant font-medium leading-none">Brgy. Malinao, Naujan</span>
                </div>
              </div>
              <nav className="hidden md:flex items-center justify-center gap-1 flex-1">
                <a className="px-3 py-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors font-label-md text-sm whitespace-nowrap" href="/dashboard">{t.dashboard}</a>
                <a className="px-3 py-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors font-label-md text-sm whitespace-nowrap" href="/documents">{t.requestDoc}</a>
                <a className="px-3 py-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors font-label-md text-sm whitespace-nowrap" href="/track-status">{t.trackStatus}</a>
                <a className="px-3 py-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors font-label-md text-sm whitespace-nowrap" href="/history">{t.history}</a>
                <a className="px-3 py-2 transition-colors bg-primary text-on-primary font-bold rounded-lg shadow-sm text-sm whitespace-nowrap" href="/settings">{t.settings}</a>
              </nav>
              
              <div className="flex items-center justify-end gap-2 shrink-0">
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
                        <a className="px-4 py-2.5 text-sm font-semibold text-on-surface hover:bg-surface-container rounded-lg transition-colors" href="/dashboard">{t.dashboard}</a>
                        <a className="px-4 py-2.5 text-sm font-semibold text-on-surface hover:bg-surface-container rounded-lg transition-colors" href="/documents">{t.requestDoc}</a>
                        <a className="px-4 py-2.5 text-sm font-semibold text-on-surface hover:bg-surface-container rounded-lg transition-colors" href="/track-status">{t.trackStatus}</a>
                        <a className="px-4 py-2.5 text-sm font-semibold text-on-surface hover:bg-surface-container rounded-lg transition-colors" href="/history">{t.history}</a>
                        <a className="px-4 py-2.5 text-sm font-semibold text-primary bg-primary/10 rounded-lg" href="/settings">{t.settings}</a>
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
          <main className="w-full pt-28 md:pt-32 bg-surface flex-1">
            <div className="max-w-3xl mx-auto px-4 md:px-margin py-6 md:py-10">
              <div className="flex flex-col gap-6">
                
                {/* PROFILE SECTION */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                  <div className="border-b border-slate-100 pb-4 mb-6">
                    <h2 className="text-lg font-bold text-slate-900">{t.profileInfo}</h2>
                    <p className="text-sm text-slate-500 mt-1">{t.updateProfileDesc}</p>
                  </div>
                  
                  <form onSubmit={handleUpdateProfile} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-600">{t.fullNameLabel}</label>
                      <input 
                        type="text" 
                        value={fullName} 
                        onChange={(e) => setFullName(e.target.value)} 
                        className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all text-sm"
                        required
                      />
                    </div>
                    
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-600">{t.purokLabel}</label>
                      <select 
                        value={purok} 
                        onChange={(e) => setPurok(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all text-sm cursor-pointer"
                      >
                        <option value="Purok 1 Centro">Purok 1 Centro</option>
                        <option value="Purok 2 Riverside">Purok 2 Riverside</option>
                        <option value="Purok 3 Pag-asa">Purok 3 Pag-asa</option>
                        <option value="Purok 4 Pag-asa">Purok 4 Pag-asa</option>
                      </select>
                    </div>

                    <div className="flex justify-end mt-2">
                      <button 
                        type="submit" 
                        disabled={isSaving}
                        className={`px-6 py-2.5 rounded-lg ${isSaving ? 'bg-gray-400' : 'bg-[#00236f] hover:bg-[#00174d]'} text-white font-bold transition-colors`}
                      >
                        {isSaving ? t.saving : t.saveProfile}
                      </button>
                    </div>
                  </form>
                </div>

                {/* SECURITY SECTION */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                  <div className="border-b border-slate-100 pb-4 mb-6">
                    <h2 className="text-lg font-bold text-slate-900">{t.securityTitle}</h2>
                    <p className="text-sm text-slate-500 mt-1">{t.changePasswordDesc}</p>
                  </div>
                  
                  <form onSubmit={handleUpdatePassword} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-600">{t.currentPasswordLabel}</label>
                      <input 
                        type="password" 
                        value={currentPassword} 
                        onChange={(e) => setCurrentPassword(e.target.value)} 
                        className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all text-sm"
                        required
                      />
                    </div>
                    
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-600">{t.newPasswordLabel}</label>
                      <div className="relative">
                        <input 
                          type={showPassword ? 'text' : 'password'} 
                          value={newPassword} 
                          onChange={(e) => setNewPassword(e.target.value)} 
                          className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all text-sm"
                          required
                          minLength={6}
                        />
                        <button 
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          <span className="material-symbols-outlined text-[20px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-400">{t.passwordNote}</p>
                    </div>

                    <div className="flex justify-end mt-2">
                      <button 
                        type="submit" 
                        disabled={isSaving}
                        className={`px-6 py-2.5 rounded-lg ${isSaving ? 'bg-gray-400' : 'bg-[#b32424] hover:bg-[#93000a]'} text-white font-bold transition-colors`}
                      >
                        {isSaving ? t.updating : t.updatePassword}
                      </button>
                    </div>
                  </form>
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

          {/* TOAST NOTIFICATION */}
          {toast.show && (
            <div className="fixed top-6 right-6 z-[10000] bg-gray-900 text-white px-5 py-3 rounded-lg flex items-center gap-3 shadow-2xl animate-slide-in">
              <span className="material-symbols-outlined" style={{ color: toast.type === 'success' ? '#68dba9' : '#ffb4ab', fontSize: '22px' }}>
                {toast.type === 'success' ? 'check_circle' : 'error'}
              </span>
              <span className="text-sm font-semibold">{toast.message}</span>
            </div>
          )}

          {/* LOGOUT CONFIRMATION MODAL */}
          {isLogoutModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-primary/50 backdrop-blur-sm p-4">
              <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-[36px]">logout</span>
                  </div>
                  <h2 className="text-lg md:text-xl font-bold text-primary">{t.logoutTitle}</h2>
                  <p className="mt-2 text-xs md:text-sm text-slate-500 leading-relaxed">
                    {t.logoutMessage}
                  </p>
                </div>
                <div className="mt-6 flex flex-col-reverse sm:flex-row gap-2">
                  <button onClick={() => setIsLogoutModalOpen(false)} className="flex-1 rounded-lg px-4 py-2.5 font-semibold text-primary bg-slate-100 hover:bg-slate-200 transition-colors">
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

          <style>
            {`
              @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
              .animate-slide-in { animation: slideIn 0.3s ease-out; }
            `}
          </style>

        </div>
      </IonContent>
    </IonPage>
  );
};

export default ResidentSettings;