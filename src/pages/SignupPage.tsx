import React, { useState } from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db, logAction } from '../firebase'; // ✅ IDINAGDAG ANG logAction
import logoImage from '../assets/logo.png';

const SignupPage: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [purok, setPurok] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // State para sa Custom Success Modal
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // 1. Gumawa ng account sa Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. I-save ang detalye sa Firestore (users collection)
      await setDoc(doc(db, "users", user.uid), {
        fullName: fullName,
        email: email,
        purok: purok,
        role: "resident", 
        status: "pending", // 👈 MAHALAGA: Ito ang maglalagay ng "Pending" sa Staff Side
        createdAt: new Date()
      });

      // ✅ IDINAGDAG: I-LOG ANG BAGONG RESIDENTE SA AUDIT LOGS
      await logAction(
        "New Resident Registered", 
        `New account created for ${fullName} (${email}) - ${purok}`, 
        "success", 
        fullName, 
        "Resident"
      );

      // Ipakita ang success modal
      setShowSuccess(true);

      // Pagkatapos ng 6 na segundo, ilipat sa login page
      setTimeout(() => {
        window.location.href = '/login';
      }, 6000);

    } catch (error: any) {
      alert("Signup Error: " + error.message);
      setIsLoading(false);
    }
  };

  return (
    <IonPage>
      <IonContent className="bg-[#f0f4f8]">
        <div className="min-h-screen flex flex-col font-sans text-gray-800 relative">
          
          {/* ================= CUSTOM VERIFICATION MODAL ================= */}
          {showSuccess && (
            <div style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
              backgroundColor: 'rgba(11, 28, 48, 0.7)', backdropFilter: 'blur(4px)', 
              zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
            }}>
              <div style={{
                backgroundColor: '#ffffff', borderRadius: '24px', padding: '40px 32px', 
                width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', 
                alignItems: 'center', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
              }}>
                {/* Icon na may kaunting animation */}
                <div style={{
                  width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#fef3c7', 
                  color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                  marginBottom: '20px', animation: 'pop 0.4s ease-out'
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '48px' }}>pending_actions</span>
                </div>
                
                <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#0b1c30', margin: '0 0 8px 0' }}>
                  Account Created!
                </h2>
                <p style={{ fontSize: '14px', color: '#444651', margin: '0 0 16px 0', lineHeight: 1.5 }}>
                  Maligayang pagdating! Ang iyong account ay kasalukuyang <strong>naka-pending</strong>.
                </p>
                
                {/* PAALALA */}
                <div style={{ backgroundColor: '#eff4ff', border: '1px solid #dce9ff', borderRadius: '12px', padding: '16px', width: '100%', marginBottom: '24px' }}>
                  <p style={{ fontSize: '12px', color: '#00236f', margin: 0, textAlign: 'left', lineHeight: 1.5 }}>
                    <strong>Paalala:</strong> Kailangan munang i-verify ng Barangay Staff (Secretary) kung ikaw ay isang tunay na residente ng Brgy. Malinao bago ka makapag-request ng dokumento.
                  </p>
                </div>

                <div style={{ width: '100%', height: '4px', backgroundColor: '#e5eeff', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', backgroundColor: '#d97706', width: '100%', animation: 'load 6s linear forwards' }}></div>
                </div>
                <span style={{ fontSize: '11px', color: '#757682', marginTop: '8px' }}>Iri-redirect ka sa login page...</span>
              </div>
            </div>
          )}

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
                className="flex items-center gap-1.5 bg-[#00236f] text-white border border-[#00236f] hover:bg-[#00174d] px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all shadow-md hover:shadow-lg"
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
                  <h1 className="text-2xl font-bold text-[#00236f] mb-1">Resident Signup</h1>
                  <p className="text-gray-500 text-sm">Create an account to request documents online.</p>
                </div>

                <form onSubmit={handleSignup} className="flex flex-col gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Full Name <span className="text-[#b32424]">*</span>
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">person</span>
                      <input 
                        type="text" 
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Juan Dela Cruz"
                        className="w-full pl-10 pr-4 py-3 bg-[#eff4ff] border border-transparent rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#00236f] focus:bg-white transition-all placeholder:text-gray-400"
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>

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
                      Purok <span className="text-[#b32424]">*</span>
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">location_on</span>
                      <select 
                        value={purok}
                        onChange={(e) => setPurok(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-[#eff4ff] border border-transparent rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#00236f] focus:bg-white transition-all appearance-none cursor-pointer"
                        required
                        disabled={isLoading}
                      >
                        <option value="" disabled>Select your Purok</option>
                        <option value="Purok 1 Centro">Purok 1 Centro</option>
                        <option value="Purok 2 Riverside">Purok 2 Riverside</option>
                        <option value="Purok 3 Ilaya">Purok 3 Ilaya</option>
                        <option value="Purok 4 Pag-asa">Purok 4 Pag-asa</option>
                        <option value="Purok 5 Maharlika">Purok 5 Maharlika</option>
                        <option value="Purok 6 Bukid">Purok 6 Bukid</option>
                        <option value="Purok 7 Silangan">Purok 7 Silangan</option>
                      </select>
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
                        placeholder="Create a strong password"
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
                    disabled={isLoading || showSuccess}
                    className={`w-full ${isLoading || showSuccess ? 'bg-gray-400' : 'bg-[#00236f] hover:bg-[#00174d]'} text-white font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-md mt-4`}
                  >
                    <span className="material-symbols-outlined text-xl">
                      {isLoading ? 'sync' : 'person_add'}
                    </span>
                    {isLoading ? 'Creating Account...' : 'Sign Up'}
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <span className="text-sm text-gray-500">Already have an account? </span>
                  <button onClick={() => window.location.href = '/login'} className="text-sm font-bold text-[#00236f] hover:underline">
                    Login here
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

          {/* CSS Animation */}
          <style>
            {`
              @keyframes pop {
                0% { transform: scale(0.5); opacity: 0; }
                80% { transform: scale(1.1); }
                100% { transform: scale(1); opacity: 1; }
              }
              @keyframes load {
                0% { width: 0%; }
                100% { width: 100%; }
              }
            `}
          </style>

        </div>
      </IonContent>
    </IonPage>
  );
};

export default SignupPage;