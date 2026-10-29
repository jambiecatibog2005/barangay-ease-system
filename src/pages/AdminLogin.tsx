import React, { useState } from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { signInWithEmailAndPassword, signOut } from "firebase/auth"; 
import { doc, getDoc } from "firebase/firestore";
import { auth, db, logAction } from '../firebase';
import logoImage from '../assets/logo.png';

const AdminLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // 1. Mag-login sa Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Titingnan natin sa Firestore kung "admin" ang role
      const userDocRef = doc(db, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        
        if (userData.role === "admin") {
          localStorage.setItem('isAdminLoggedIn', 'true'); 
          localStorage.setItem('userRole', 'Admin'); 
          localStorage.setItem('adminName', userData.fullName || 'Admin'); 

          await logAction(
            "Admin Login", 
            `${userData.fullName || 'Admin'} logged in to the system.`,
            "info",
            userData.fullName || 'Admin', 
            "Admin"                       
          );
          
          window.location.href = '/admin-dashboard';
        } else {
          await signOut(auth); 
          alert("Access Denied. You are not authorized to access the Admin Portal.");
        }
      } else {
        await signOut(auth); 
        alert("User record not found in the database. (Kulang ang record sa Firestore)");
      }
    } catch (error: any) {
      alert("Access Denied. Invalid Admin credentials.");
      console.error("Login Error Details:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <IonPage>
      <IonContent className="bg-[#f0f4f8]">
        <div className="min-h-screen flex flex-col font-sans text-gray-800">
          
          {/* HEADER */}
          <header className="w-full bg-white border-b border-gray-100 py-3 px-6 md:px-12 flex flex-col sm:flex-row items-center justify-between shadow-sm gap-4 z-10 relative">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="w-12 h-12 md:w-14 md:h-14 flex-shrink-0">
                <img src={logoImage} alt="BarangayEase Logo" className="w-full h-full object-contain rounded-full" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg text-[#00236f] leading-tight">BarangayEase</span>
                <span className="text-xs text-gray-500 font-medium">Barangay Malinao Local Government Portal</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button onClick={() => window.location.href = '/staff-login'} className="flex items-center gap-1.5 bg-white text-[#00236f] border border-gray-200 hover:bg-gray-50 active:bg-gray-200 active:scale-95 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all shadow-sm">
                <span className="material-symbols-outlined text-[18px]">badge</span>
                <span>Staff Portal</span>
              </button>
              <button onClick={() => window.location.href = '/'} className="flex items-center gap-1.5 bg-[#00236f] text-white border border-[#00236f] hover:bg-[#00174d] active:bg-[#000d29] active:scale-95 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all shadow-md hover:shadow-lg">
                <span className="material-symbols-outlined text-[18px]">home</span>
                <span>Home</span>
              </button>
            </div>
          </header>

          {/* MAIN CONTENT */}
          <main className="flex-1 flex items-center justify-center p-4 md:p-8">
            <div className="bg-white border border-gray-200 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] w-full max-w-[500px] overflow-hidden relative z-10">
              
              {/* TOP TRICOLOR BAR */}
              <div className="h-2 w-full flex">
                <div className="w-1/3 bg-[#00236f]"></div>
                <div className="w-1/3 bg-[#b32424]"></div>
                <div className="w-1/3 bg-[#fe932c]"></div>
              </div>

              <div className="p-8 md:p-10">
                <div className="flex flex-col items-center text-center mb-8">
                  <div className="w-32 h-32 flex items-center justify-center mb-4">
                    <img src={logoImage} alt="BarangayEase Logo" className="w-full h-full object-contain rounded-full" />
                  </div>
                  
                  <span className="text-[#b32424] text-[10px] font-bold tracking-[0.2em] uppercase mb-1">Restricted Access</span>
                  <span className="text-gray-600 text-xs font-medium mb-2">Municipality of Naujan • Barangay Malinao</span>
                  <h1 className="text-2xl font-bold text-[#00236f] mb-1">Admin Portal Access</h1>
                  <p className="text-gray-500 text-sm">Authorized Punong Barangay Login</p>
                </div>

                {/* WARNING BOX */}
                <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-8 flex items-start gap-3">
                  <span className="material-symbols-outlined text-red-600 text-xl">gpp_maybe</span>
                  <div>
                    <span className="text-red-700 text-xs font-bold block mb-1">SECURITY WARNING</span>
                    <p className="text-xs text-red-600 leading-relaxed">
                      This area is for the Punong Barangay only. Unauthorized access attempts are logged and reported.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleLogin} className="flex flex-col gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Admin Email <span className="text-[#b32424]">*</span>
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">admin_panel_settings</span>
                      <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. captain@malinao.gov.ph"
                        className="w-full pl-10 pr-4 py-3 bg-[#eff4ff] border border-transparent rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#00236f] focus:bg-white transition-all placeholder:text-gray-400"
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Admin Password <span className="text-[#b32424]">*</span>
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">lock</span>
                      <input 
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••"
                        className="w-full pl-10 pr-12 py-3 bg-[#eff4ff] border border-transparent rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#00236f] focus:bg-white transition-all placeholder:text-gray-500 font-mono"
                        required
                        disabled={isLoading}
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <span className="material-symbols-outlined">{showPassword ? 'visibility_off' : 'visibility'}</span>
                      </button>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={isLoading}
                    className={`w-full ${isLoading ? 'bg-gray-400' : 'bg-[#00236f] hover:bg-[#00174d] active:bg-[#000d29] active:scale-[0.98]'} text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-md mt-4`}
                  >
                    <span className="material-symbols-outlined text-xl">
                      {isLoading ? 'sync' : 'login'}
                    </span>
                    {isLoading ? 'Signing In...' : 'Sign In as Admin'}
                  </button>
                </form>

                <div className="mt-8 text-center flex flex-col gap-1 text-[11px] text-gray-500 font-medium">
                  <p>Authorized Personnel Only • Barangay Malinao Administrative District</p>
                  <p className="flex items-center justify-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">lock</span>
                    System Secured via 256-Bit Encryption
                  </p>
                </div>

              </div>
            </div>
          </main>

          {/* FOOTER */}
          <footer className="w-full bg-white border-t border-gray-100 py-4 px-6 md:px-12 flex flex-col md:flex-row items-center justify-between text-xs text-gray-500 gap-2">
            <div className="flex items-center gap-2 flex-wrap justify-center md:justify-start">
              <span>Republic of the Philippines</span>
              <span>•</span>
              <span>City Government of Oriental Mindoro</span>
              <span>•</span>
              <span>Barangay Malinao Administrative District</span>
            </div>
            <div className="flex items-center gap-1.5 font-medium">
              <span className="material-symbols-outlined text-[16px]">lock</span>
              256-Bit Encrypted Municipal Records System
            </div>
          </footer>

        </div>
      </IonContent>
    </IonPage>
  );
};

export default AdminLogin;