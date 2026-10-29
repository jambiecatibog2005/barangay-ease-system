import React from 'react';
import { IonContent, IonPage } from '@ionic/react';
import logoImage from '../assets/logo.png';

const LandingPage: React.FC = () => {
  return (
    <IonPage>
      <IonContent className="bg-surface">
        <div className="bg-surface font-body-md text-on-surface antialiased min-h-screen flex flex-col">
          
          {/* HEADER */}
          <header className="fixed top-0 left-0 right-0 z-50 bg-surface-container-lowest/95 backdrop-blur-md shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
            
            {/* TOP ADVISORY BAR - Full Width */}
            <div className="bg-primary text-on-primary text-label-sm font-label-sm w-full">
              <div className="w-full px-4 md:px-8 flex items-center justify-between h-8">
                <div className="flex items-center gap-space-lg">
                  <div className="hidden md:flex items-center gap-space-xs text-surface-container-high">
                    <span className="material-symbols-outlined text-secondary-fixed text-[14px]">domain</span>
                    <span>Office Hours: Monday-Sunday 8:00 AM – 5:00 PM</span>
                  </div>
                </div>
                <div className="flex items-center gap-space-xs text-tertiary-fixed">
                  <span className="material-symbols-outlined text-[14px]">campaign</span>
                  <span className="font-medium text-[11px] sm:text-sm truncate">Advisory: Regular document processing schedule active.</span>
                </div>
              </div>
            </div>
            
            {/* MAIN HEADER NAV - Full Width */}
            <div className="h-20 w-full px-4 md:px-8 flex items-center justify-between gap-2">
              
              {/* LOGO SECTION - Sakto lang ang laki */}
              <div className="flex items-center gap-3 md:gap-4 shrink-0">
                <div className="w-14 h-14 md:w-16 md:h-16 flex-shrink-0">
                  <img 
                    alt="BarangayEase Logo" 
                    className="w-full h-full object-contain rounded-full" 
                    src={logoImage} 
                  />
                </div>
                <div className="flex flex-col">
                  <span className="font-title-lg text-lg md:text-xl font-bold text-primary tracking-tight leading-tight truncate">BarangayEase</span>
                  <span className="font-label-sm text-[11px] md:text-xs text-on-surface-variant font-medium leading-none truncate mt-1">Brgy. Malinao, Naujan, Oriental Mindoro</span>
                </div>
              </div>
              
              {/* RIGHT SIDE ACTIONS */}
              <div className="flex items-center gap-2 md:gap-3">
                
                {/* Emergency Hotline */}
                <a href="tel:0432867000" className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-surface-container-low rounded-lg border border-outline-variant/30 text-primary hover:bg-surface-container transition-colors">
                  <span className="material-symbols-outlined text-secondary text-[20px]">call</span>
                  <div className="hidden lg:flex flex-col text-left">
                    <span className="font-label-sm text-[9px] text-on-surface-variant uppercase tracking-wider font-semibold leading-none">Emergency Hotline</span>
                    <span className="font-label-md text-label-md font-bold text-primary leading-tight">(043) 286-7000</span>
                  </div>
                </a>

                {/* STAFF & ADMIN PORTAL BUTTONS */}
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => window.location.href = '/staff-login'}
                    className="group flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300 hover:text-primary transition-all shadow-sm hover:shadow active:scale-95 whitespace-nowrap"
                  >
                    <span className="material-symbols-outlined text-[18px] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:text-primary">badge</span>
                    <span className="text-xs font-bold hidden sm:inline">Staff Portal</span>
                  </button>

                  <button 
                    onClick={() => window.location.href = '/admin-login'}
                    className="group relative flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white hover:bg-blue-900 transition-all shadow-md hover:shadow-lg active:scale-95 whitespace-nowrap overflow-hidden"
                  >
                    <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none"></div>
                    <span className="material-symbols-outlined text-[18px] transition-transform duration-300 group-hover:rotate-12">admin_panel_settings</span>
                    <span className="text-xs font-bold hidden sm:inline">Admin Portal</span>
                  </button>
                </div>

              </div>
            </div>

            {/* TRI-COLOR BAR */}
            <div className="h-[3px] w-full flex">
              <div className="h-full w-1/3 bg-secondary-container"></div>
              <div className="h-full w-1/3 bg-error"></div>
              <div className="h-full w-1/3 bg-tertiary-fixed"></div>
            </div>
          </header>

          {/* MAIN CONTENT */}
          <main className="w-full pt-28 bg-surface flex-1">
            <div className="w-full px-4 md:px-8 py-8 md:py-12">
              <div className="flex flex-col w-full">
                
                {/* HERO SECTION */}
                <section className="relative w-full rounded-2xl overflow-hidden bg-primary text-on-primary shadow-xl">
                  <div className="absolute -right-20 -top-20 w-96 h-96 rounded-full bg-secondary-container/20 blur-3xl pointer-events-none"></div>
                  <div className="absolute left-1/3 -bottom-24 w-80 h-80 rounded-full bg-tertiary-fixed/10 blur-2xl pointer-events-none"></div>
                  
                  <div className="relative z-10 px-margin py-space-xl md:py-20 flex flex-col items-center text-center gap-space-xl">
                    <div className="space-y-space-md max-w-5xl flex flex-col items-center">
                      <div className="inline-flex items-center gap-space-xs px-space-sm py-1 rounded-full bg-surface-container-lowest/10 backdrop-blur-md text-tertiary-fixed text-label-sm font-label-sm">
                        <span className="material-symbols-outlined text-[16px]">verified_user</span>
                        <span className="tracking-wide uppercase">Opisyal na Portal • Sangguniang Barangay ng Malinao</span>
                      </div>
                      
                      <div className="space-y-space-xs">
                        <h1 className="font-headline-lg text-headline-lg md:font-display-hero md:text-display-hero text-on-primary tracking-tight leading-tight">
                          Mabilis, Maaasahan, at Modernong Serbisyong Barangay
                        </h1>
                        <p className="font-title-lg text-title-lg text-primary-fixed font-medium">
                          Digital Document Request & Transaction Tracking for Barangay Malinao, Naujan
                        </p>
                      </div>
                      
                      <p className="font-body-lg text-body-lg text-surface-container-high leading-relaxed max-w-3xl">
                        Mga kabarangay sa Malinao, maaari na ninyong makuha ang inyong mga sertipikasyon, clearance, at permit online 24/7. Walang mahabang pila, ligtas, at direktang konektado sa Barangay Hall.
                      </p>
                      
                      {/* BUTTONS */}
                      <div className="pt-space-md flex flex-col sm:flex-row justify-center items-center gap-4 w-full sm:w-auto mt-2">
                        <button 
                          onClick={() => window.location.href = '/signup'} 
                          className="group relative inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition-all duration-300 border border-white/30 hover:border-white/60 shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:scale-95 w-full sm:w-auto overflow-hidden backdrop-blur-sm"
                          type="button"
                        >
                          <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none"></div>
                          <span className="material-symbols-outlined text-[20px] transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12">person_add</span>
                          <span>Resident Signup</span>
                        </button>

                        <button 
                          onClick={() => window.location.href = '/login'} 
                          className="group relative inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-secondary text-white font-bold text-sm transition-all duration-300 hover:bg-blue-800 shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:scale-95 w-full sm:w-auto overflow-hidden"
                          type="button"
                        >
                          <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none"></div>
                          <span className="material-symbols-outlined text-[20px] transition-transform duration-300 group-hover:translate-x-1">login</span>
                          <span>Resident Login</span>
                        </button>
                      </div>

                    </div>
                  </div>
                </section>

                {/* 3-STEP GUIDE SECTION */}
                <section className="mt-space-xl max-w-7xl mx-auto w-full">
                  <div className="flex flex-col items-center text-center max-w-3xl mx-auto space-y-space-xs">
                    <span className="px-space-sm py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm uppercase tracking-wider">
                      Proseso ng Paghingi ng Dokumento
                    </span>
                    <h2 className="font-headline-lg text-headline-lg text-primary mt-2">
                      Tatlong Hakbang Lamang Patungo sa Iyong Dokumento
                    </h2>
                  </div>
                  <div className="mt-space-lg grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="group relative rounded-2xl bg-surface-container-lowest p-8 shadow-sm hover:shadow-md transition-all border border-slate-100">
                      <div className="w-12 h-12 rounded-xl bg-secondary-fixed text-on-secondary-fixed font-headline-md text-headline-md font-bold flex items-center justify-center mb-4 shadow-sm">01</div>
                      <h3 className="font-title-lg text-title-lg text-primary">Pumili ng Dokumento</h3>
                      <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed mt-2">Pumili sa listahan ng mga dokumento ayon sa iyong layunin.</p>
                    </div>
                    <div className="group relative rounded-2xl bg-surface-container-lowest p-8 shadow-sm hover:shadow-md transition-all border border-slate-100">
                      <div className="w-12 h-12 rounded-xl bg-primary-fixed text-on-primary-fixed font-headline-md text-headline-md font-bold flex items-center justify-center mb-4 shadow-sm">02</div>
                      <h3 className="font-title-lg text-title-lg text-primary">Magsumite ng Impormasyon</h3>
                      <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed mt-2">Ibigay ang kailangang impormasyon at mag-upload ng Valid ID.</p>
                    </div>
                    <div className="group relative rounded-2xl bg-surface-container-lowest p-8 shadow-sm hover:shadow-md transition-all border border-slate-100">
                      <div className="w-12 h-12 rounded-xl bg-tertiary-fixed text-on-tertiary-fixed font-headline-md text-headline-md font-bold flex items-center justify-center mb-4 shadow-sm">03</div>
                      <h3 className="font-title-lg text-title-lg text-primary">I-track at Kunin</h3>
                      <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed mt-2">Subaybayan ang status at kunin ang dokumento sa Barangay Hall.</p>
                    </div>
                  </div>
                </section>

              </div>
            </div>
          </main>

          {/* FOOTER */}
          <footer className="w-full bg-primary text-on-primary pt-space-xl pb-space-lg mt-auto shadow-[0_-2px_12px_rgba(0,0,0,0.05)]">
            <div className="w-full px-4 md:px-8 flex flex-col md:flex-row items-center justify-between text-center md:text-left gap-4">
               <p className="font-body-sm text-body-sm text-primary-fixed">© 2025 Barangay Malinao, Naujan. All Rights Reserved. BarangayEase Digital Civic Portal.</p>
               <div className="flex items-center gap-4 text-xs font-medium text-surface-container-high">
                  <span>Privacy Policy</span>
                  <span>Terms of Service</span>
                  <span>Contact Support</span>
               </div>
            </div>
          </footer>

        </div>
      </IonContent>
    </IonPage>
  );
};

export default LandingPage;