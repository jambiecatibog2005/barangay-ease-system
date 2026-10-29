import React, { useState } from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db, logAction } from '../firebase'; 
import logoImage from '../assets/logo.png';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    try {
      // 1. Mag-login sa Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Kunin ang detalye niya sa Firestore
      const userDocRef = doc(db, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        const userStatus = userData.status?.toLowerCase();

        // ✅ 3. CHECK KUNG ACTIVE ANG STATUS
        if (userStatus === "active") {
          // I-save sa localStorage
          localStorage.setItem('residentUid', user.uid); 
          localStorage.setItem('residentName', userData.fullName || 'Resident'); 
          localStorage.setItem('isResidentLoggedIn', 'true');
          localStorage.setItem('userRole', 'Resident'); 

          // I-log ang successful login
          await logAction(
            "Resident Login", 
            `Resident logged in to the portal.`, 
            "info", 
            userData.fullName || 'Resident', 
            "Resident"
          );
          
          window.location.href = '/dashboard';
        } else if (userStatus === "pending") {
          await signOut(auth); // ✅ I-logout agad
          setErrorMessage("Your account is still pending. Please wait for the Barangay Staff to verify your residency before you can login.");
        } else if (userStatus === "rejected") {
          await signOut(auth);
          setErrorMessage("Your registration was rejected. You are not recognized as a resident of Brgy. Malinao.");
        } else if (userStatus === "suspended") {
          await signOut(auth);
          setErrorMessage("Your account has been suspended. Please visit the Barangay Hall for assistance.");
        } else {
          await signOut(auth);
          setErrorMessage("Account status unknown. Please contact the Barangay Staff.");
        }
      } else {
        await signOut(auth);
        setErrorMessage("User record not found in the database.");
      }
    } catch (error: any) {
      setErrorMessage("Invalid email or password.");
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
              <button 
                onClick={() => window.location.href = '/'}
                className="flex items-center gap-1.5 bg-[#00236f] text-white border border-[#00236f] hover:bg-[#00174d] active:bg-[#000d29] active:scale-95 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all shadow-md hover:shadow-lg"
              >
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
                  <div className="w-24 h-24 flex items-center justify-center mb-4">
                    <img src={logoImage} alt="BarangayEase Logo" className="w-full h-full object-contain rounded-full" />
                  </div>
                  <span className="text-[#b32424] text-[10px] font-bold tracking-[0.2em] uppercase mb-1">Republic of the Philippines</span>
                  <span className="text-gray-600 text-xs font-medium mb-2">Municipality of Naujan • Barangay Malinao</span>
                  <h1 className="text-2xl font-bold text-[#00236f] mb-1">Resident Login</h1>
                  <p className="text-gray-500 text-sm">Login to your BarangayEase account.</p>
                </div>

                {/* ✅ ERROR MESSAGE DISPLAY */}
                {errorMessage && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
                    <span className="material-symbols-outlined text-red-500 text-xl">error</span>
                    <p className="text-xs text-red-700 leading-relaxed font-medium">
                      {errorMessage}
                    </p>
                  </div>
                )}

                <form onSubmit={handleLogin} className="flex flex-col gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Email Address <span className="text-[#b32424]">*</span>
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">mail</span>
                      <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. juan@gmail.com"
                        className="w-full pl-10 pr-4 py-3 bg-[#eff4ff] border border-transparent rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#00236f] focus:bg-white transition-all placeholder:text-gray-400"
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Password <span className="text-[#b32424]">*</span>
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">lock</span>
                      <input 
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="w-full pl-10 pr-12 py-3 bg-[#eff4ff] border border-transparent rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#00236f] focus:bg-white transition-all placeholder:text-gray-400 font-mono"
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
                    {isLoading ? 'Logging in...' : 'Login'}
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <span className="text-sm text-gray-500">Don't have an account? </span>
                  <button onClick={() => window.location.href = '/signup'} className="text-sm font-bold text-[#00236f] hover:underline">
                    Sign up here
                  </button>
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
      </IonContent>
    </IonPage>
  );
};

export default LoginPage;