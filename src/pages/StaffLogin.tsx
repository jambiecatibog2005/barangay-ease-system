import React, { useState } from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { signInWithEmailAndPassword, signOut } from "firebase/auth"; 
import { doc, getDoc, query, collection, where, getDocs, updateDoc } from "firebase/firestore"; 
import { auth, db, logAction } from '../firebase'; // ✅ IDINAGDAG ANG logAction
import logoImage from '../assets/logo.png';

const StaffLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // ✅ STATE PARA SA CUSTOM ALERT MODAL
  const [alertModal, setAlertModal] = useState({ show: false, title: '', message: '' });

  const showAlert = (title: string, message: string) => {
    setAlertModal({ show: true, title, message });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // 1. Subukan ang Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userDocRef = doc(db, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        
        if (userData.role === "staff" || userData.role === "secretary") {
          
          // ✅ CHECK KUNG NAKA-DEACTIVATE
          if (userData.status === 'Inactive') {
            await signOut(auth);
            showAlert("Account Deactivated", "Access Denied. Your account has been deactivated by the Administrator. Please contact the Barangay Hall.");
            return; 
          }

          // ✅ I-reset ang forceLogout kapag nag-login
          await updateDoc(userDocRef, { forceLogout: false });

          localStorage.setItem('isStaffLoggedIn', 'true'); 
          localStorage.setItem('staffName', userData.fullName || 'Staff Member'); 
          localStorage.setItem('staffUid', user.uid);

          // ✅ IDINAGDAG: I-LOG ANG STAFF LOGIN SA AUDIT LOGS
          await logAction(
            "Staff Login", 
            `Secretary logged in to the portal.`, 
            "info", 
            userData.fullName || 'Staff Member', 
            "Secretary"
          );

          window.location.href = '/staff-dashboard';
          return;
        } else {
          await signOut(auth); 
          showAlert("Access Denied", "You are not authorized to access the Staff Portal.");
        }
      } else {
        await signOut(auth);
        showAlert("User Not Found", "User record not found in the database.");
      }
    } catch (error: any) {
      // 2. Fallback: Temporary Password
      try {
        const q = query(collection(db, "users"), where("email", "==", email));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const userDoc = querySnapshot.docs[0];
          const userData = userDoc.data();
          
          if (userData.temporaryPassword === password && (userData.role === "staff" || userData.role === "secretary")) {
            
            // ✅ CHECK KUNG NAKA-DEACTIVATE (Fallback)
            if (userData.status === 'Inactive') {
              showAlert("Account Deactivated", "Access Denied. Your account has been deactivated by the Administrator. Please contact the Barangay Hall.");
              return; 
            }

            // ✅ I-RESET ANG FORCE LOGOUT
            await updateDoc(doc(db, "users", userDoc.id), { forceLogout: false });
            
            localStorage.setItem('isStaffLoggedIn', 'true'); 
            localStorage.setItem('staffName', userData.fullName || 'Staff Member'); 
            localStorage.setItem('staffUid', userDoc.id);

            // ✅ IDINAGDAG: I-LOG ANG STAFF LOGIN (GAMIT ANG TEMP PASSWORD)
            await logAction(
              "Staff Login", 
              `Secretary logged in using temporary password.`, 
              "info", 
              userData.fullName || 'Staff Member', 
              "Secretary"
            );

            window.location.href = '/staff-dashboard';
            return; 
          } else {
            showAlert("Invalid Credentials", "Invalid password. Please check your credentials.");
          }
        } else {
          showAlert("User Not Found", "No user found with this email.");
        }
      } catch (firestoreError: any) {
        console.error("Firestore Error:", firestoreError);
        showAlert("System Error", "Database Error. Please try again later.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <IonPage>
      <IonContent className="bg-[#f0f4f8]">
        <div className="min-h-screen flex flex-col font-sans text-gray-800">
          
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
              <button onClick={() => window.location.href = '/admin-login'} className="flex items-center gap-1.5 bg-[#00236f] text-white border border-[#00236f] hover:bg-[#00174d] active:bg-[#000d29] active:scale-95 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all shadow-md hover:shadow-lg">
                <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
                <span>Admin Portal</span>
              </button>
              <button onClick={() => window.location.href = '/'} className="flex items-center gap-1.5 bg-white text-[#00236f] border border-gray-200 hover:bg-gray-50 active:bg-gray-200 active:scale-95 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all shadow-sm">
                <span className="material-symbols-outlined text-[18px]">home</span>
                <span>Home</span>
              </button>
            </div>
          </header>

          <main className="flex-1 flex items-center justify-center p-4 md:p-8">
            <div className="bg-white border border-gray-200 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] w-full max-w-[500px] overflow-hidden relative z-10">
              
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
                  
                  <span className="text-[#b32424] text-[10px] font-bold tracking-[0.2em] uppercase mb-1">Republic of the Philippines</span>
                  <span className="text-gray-600 text-xs font-medium mb-2">Municipality of Naujan • Barangay Malinao</span>
                  <h1 className="text-2xl font-bold text-[#00236f] mb-1">Secretary Portal Access</h1>
                  <p className="text-gray-500 text-sm">Authorized Barangay Secretary Login</p>
                </div>

                <div className="bg-[#eff4ff] border border-[#dce9ff] rounded-xl p-4 mb-8 flex items-start gap-3">
                  <span className="material-symbols-outlined text-[#fe932c] text-xl">campaign</span>
                  <div>
                    <span className="text-[#b32424] text-xs font-bold block mb-1">STATUTORY COMPLIANCE ADVISORY</span>
                    <p className="text-xs text-gray-700 leading-relaxed">
                      Notice: This system is for authorized staff only. Actions made here are logged and subject to audit by the Barangay Secretary.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleLogin} className="flex flex-col gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Staff Email or Employee ID <span className="text-[#b32424]">*</span>
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">badge</span>
                      <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. staff@malinao.gov.ph"
                        className="w-full pl-10 pr-4 py-3 bg-[#eff4ff] border border-transparent rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#00236f] focus:bg-white transition-all placeholder:text-gray-400"
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Staff Password <span className="text-[#b32424]">*</span>
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
                    className={`w-full ${isLoading ? 'bg-gray-400' : 'bg-[#fe932c] hover:bg-[#e07f1d] active:bg-[#c96d13] active:scale-[0.98]'} text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-md mt-4`}
                  >
                    <span className="material-symbols-outlined text-xl">
                      {isLoading ? 'sync' : 'login'}
                    </span>
                    {isLoading ? 'Signing In...' : 'Sign In as Secretary'}
                  </button>
                </form>

                <div className="mt-8 text-center flex flex-col gap-1 text-[11px] text-gray-500 font-medium">
                  <p>Barangay Hall Desk: (045) 961-2840 &nbsp;•&nbsp; Office Hours: Mon–Fri 8:00 AM – 5:00 PM</p>
                  <p className="flex items-center justify-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">mail</span>
                    BarangayEase v2.4.1 (Stable LGU Build) • Node: MNL-PS-04
                  </p>
                </div>

              </div>
            </div>
          </main>

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

        {/* ================= CUSTOM ALERT MODAL ================= */}
        {alertModal.show && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(11, 28, 48, 0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
              
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#fee2e2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>gpp_maybe</span>
              </div>
              
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827', margin: '0 0 8px 0' }}>
                {alertModal.title}
              </h2>
              
              <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 24px 0', lineHeight: 1.5 }}>
                {alertModal.message}
              </p>
              
              <button 
                onClick={() => setAlertModal({ show: false, title: '', message: '' })} 
                style={{ width: '100%', padding: '12px', borderRadius: '10px', backgroundColor: '#1e3a8a', color: '#ffffff', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', transition: 'background-color 0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#00236f'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#1e3a8a'}
              >
                OK, I Understand
              </button>
            </div>
          </div>
        )}

      </IonContent>
    </IonPage>
  );
};

export default StaffLogin;