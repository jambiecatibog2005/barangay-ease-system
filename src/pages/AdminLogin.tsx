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
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

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
      <IonContent className="bg-surface">
        <div className="min-h-screen flex font-sans text-gray-800 bg-[#f8f9ff]">
          
          {/* ================= KALIWA: BRANDING / INFO PANEL (Hidden sa mobile) ================= */}
          <div className="hidden lg:flex w-1/2 bg-[#00236f] relative overflow-hidden flex-col justify-between p-12 text-white">
            {/* Background Decorative Circles */}
            <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-400/10 rounded-full blur-3xl"></div>
            
            <div className="relative z-10 flex items-center gap-3">
              <div className="w-14 h-14 bg-white rounded-full p-1 shadow-lg">
                <img src={logoImage} alt="Logo" className="w-full h-full object-contain rounded-full" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">BarangayEase</h1>
                <p className="text-blue-200 text-sm">Barangay Malinao, Naujan</p>
              </div>
            </div>

            <div className="relative z-10 max-w-lg">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-bold tracking-wider mb-6">
                <span className="material-symbols-outlined text-[16px] text-blue-300">shield_person</span>
                RESTRICTED SYSTEM
              </div>
              <h2 className="text-4xl font-extrabold mb-4 leading-tight">Secure Admin <br/>Portal Access</h2>
              <p className="text-blue-100 text-base leading-relaxed mb-8">
                Authorized personnel only. All activities within this portal are monitored and logged for security and compliance purposes.
              </p>
              
              <div className="bg-white/10 border border-white/10 rounded-xl p-4 flex items-start gap-3 backdrop-blur-sm">
                <span className="material-symbols-outlined text-amber-400 mt-0.5">gpp_maybe</span>
                <div>
                  <span className="text-sm font-bold text-white block mb-1">Security Warning</span>
                  <p className="text-xs text-blue-100 leading-relaxed">
                    Unauthorized access is strictly prohibited. Attempts to breach this system will be reported to local authorities.
                  </p>
                </div>
              </div>
            </div>

            <div className="relative z-10 text-xs text-blue-300 flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">lock</span>
              System Secured via 256-Bit Encryption
            </div>
          </div>

          {/* ================= KANAN: LOGIN FORM ================= */}
          <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative">
            {/* Mobile Background Pattern (Optional) */}
            <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-50 pointer-events-none"></div>

            <div className="w-full max-w-md relative z-10">
              
              {/* Mobile Header (Lalabas lang sa cellphone) */}
              <div className="lg:hidden flex flex-col items-center mb-8 text-center">
                <div className="w-20 h-20 bg-white rounded-full p-1 shadow-sm mb-4">
                  <img src={logoImage} alt="Logo" className="w-full h-full object-contain rounded-full" />
                </div>
                <h1 className="text-2xl font-bold text-[#00236f]">BarangayEase</h1>
                <p className="text-sm text-gray-500">Barangay Malinao, Naujan</p>
              </div>

              <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-gray-100 p-8 sm:p-10">
                
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Admin Login</h2>
                  <p className="text-sm text-gray-500">Enter your credentials to access the portal.</p>
                </div>

                <form onSubmit={handleLogin} className="flex flex-col gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Admin Email
                    </label>
                    <div className="relative group">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#00236f] transition-colors">mail</span>
                      <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="captain@malinao.gov.ph"
                        className="w-full pl-10 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#00236f]/20 focus:border-[#00236f] transition-all placeholder:text-gray-400"
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-semibold text-gray-700">
                        Password
                      </label>
                    </div>
                    <div className="relative group">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#00236f] transition-colors">lock</span>
                      <input 
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••"
                        className="w-full pl-10 pr-12 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#00236f]/20 focus:border-[#00236f] transition-all placeholder:text-gray-400 font-mono"
                        required
                        disabled={isLoading}
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                        tabIndex={-1}
                      >
                        <span className="material-symbols-outlined text-[20px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
                      </button>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={isLoading}
                    className={`w-full mt-2 ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#00236f] hover:bg-[#00174d] active:scale-[0.98]'} text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#00236f]/20`}
                  >
                    {isLoading ? (
                      <>
                        <span className="material-symbols-outlined animate-spin text-xl">autorenew</span>
                        Authenticating...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-xl">login</span>
                        Sign In
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                  <p className="text-xs text-gray-500 mb-4">Are you a Barangay Staff or Resident?</p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button 
                      onClick={() => window.location.href = '/staff-login'}
                      className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200 text-xs font-bold transition-colors w-full sm:w-auto"
                    >
                      <span className="material-symbols-outlined text-[16px]">badge</span>
                      Staff Portal
                    </button>
                    <button 
                      onClick={() => window.location.href = '/'}
                      className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200 text-xs font-bold transition-colors w-full sm:w-auto"
                    >
                      <span className="material-symbols-outlined text-[16px]">home</span>
                      Resident Portal
                    </button>
                  </div>
                </div>

              </div>
              
              <div className="mt-8 text-center text-[11px] text-gray-400">
                <p>© 2025 Barangay Malinao, Naujan. All Rights Reserved.</p>
              </div>
            </div>
          </div>

        </div>
      </IonContent>
    </IonPage>
  );
};

export default AdminLogin;