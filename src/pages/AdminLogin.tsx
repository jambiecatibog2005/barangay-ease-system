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
      <IonContent className="bg-surface">
        {/* ✅ Pinalitan ko ng bahagyang light blue ang background para maging moderno */}
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f0f4f8', fontFamily: "'Public Sans', sans-serif", color: '#0b1c30' }}>
          
          {/* HEADER (Hindi ito ginagalaw, kung ano ang dati, yun pa rin) */}
          <header style={{ width: '100%', backgroundColor: '#ffffff', borderBottom: '1px solid #e5eeff', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', zIndex: 10, flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', overflow: 'hidden', backgroundColor: '#ffffff' }}>
                <img src={logoImage} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 'bold', fontSize: '18px', color: '#00236f' }}>BarangayEase</span>
                <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>Barangay Malinao Local Government Portal</span>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* STAFF PORTAL BUTTON */}
              <button 
                onClick={() => window.location.href = '/staff-login'}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#ffffff', color: '#00236f', border: '1px solid #e5eeff', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8f9ff'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>badge</span>
                <span>Staff Portal</span>
              </button>

              {/* HOME BUTTON */}
              <button 
                onClick={() => window.location.href = '/'}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#00236f', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 6px rgba(0,35,111,0.2)' }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#00174d'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#00236f'}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>home</span>
                <span>Home</span>
              </button>
            </div>
          </header>

          {/* MAIN CONTENT */}
          <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }}>
            <div style={{ width: '100%', maxWidth: '450px', backgroundColor: '#ffffff', borderRadius: '16px', boxShadow: '0 10px 40px rgba(0,0,0,0.08)', overflow: 'hidden', border: '1px solid #eff4ff' }}>
              
              {/* Tricolor Top Bar */}
              <div style={{ height: '6px', width: '100%', display: 'flex' }}>
                <div style={{ width: '33.33%', backgroundColor: '#b32424' }}></div>
                <div style={{ width: '33.33%', backgroundColor: '#00236f' }}></div>
                <div style={{ width: '33.33%', backgroundColor: '#fe932c' }}></div>
              </div>

              <div style={{ padding: '40px 32px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '32px' }}>
                  <div style={{ width: '100px', height: '100px', marginBottom: '16px', borderRadius: '50%', backgroundColor: '#f8f9ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src={logoImage} alt="Logo" style={{ width: '80%', height: '80%', objectFit: 'contain', borderRadius: '50%' }} />
                  </div>
                  
                  <span style={{ color: '#b32424', fontSize: '10px', fontWeight: 'bold', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '4px' }}>Restricted Access</span>
                  <span style={{ color: '#6b7280', fontSize: '12px', fontWeight: '500', marginBottom: '8px' }}>Municipality of Naujan • Barangay Malinao</span>
                  <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#00236f', margin: '0 0 4px 0' }}>Admin Portal</h1>
                  <p style={{ color: '#9ca3af', fontSize: '13px', margin: 0 }}>Authorized Punong Barangay Login</p>
                </div>

                <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '12px', padding: '16px', marginBottom: '32px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <span className="material-symbols-outlined" style={{ color: '#dc2626', fontSize: '24px' }}>gpp_maybe</span>
                  <div>
                    <span style={{ color: '#991b1b', fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>SECURITY WARNING</span>
                    <p style={{ fontSize: '12px', color: '#b91c1c', lineHeight: 1.5, margin: 0 }}>
                      This area is for the Punong Barangay only. Unauthorized access attempts are logged and reported.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                      Admin Email <span style={{ color: '#b32424' }}>*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <span className="material-symbols-outlined" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: '20px' }}>admin_panel_settings</span>
                      <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. captain@malinao.gov.ph"
                        style={{ width: '100%', padding: '12px 16px 12px 40px', backgroundColor: '#f8f9ff', border: '1px solid #e5eeff', borderRadius: '10px', fontSize: '14px', color: '#0b1c30', outline: 'none', transition: 'border 0.2s' }}
                        onFocus={(e) => e.target.style.border = '1px solid #00236f'}
                        onBlur={(e) => e.target.style.border = '1px solid #e5eeff'}
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                      Admin Password <span style={{ color: '#b32424' }}>*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <span className="material-symbols-outlined" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: '20px' }}>lock</span>
                      <input 
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••"
                        style={{ width: '100%', padding: '12px 40px 12px 40px', backgroundColor: '#f8f9ff', border: '1px solid #e5eeff', borderRadius: '10px', fontSize: '14px', color: '#0b1c30', outline: 'none', transition: 'border 0.2s', fontFamily: 'monospace' }}
                        onFocus={(e) => e.target.style.border = '1px solid #00236f'}
                        onBlur={(e) => e.target.style.border = '1px solid #e5eeff'}
                        required
                        disabled={isLoading}
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{showPassword ? 'visibility_off' : 'visibility'}</span>
                      </button>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={isLoading}
                    style={{ width: '100%', backgroundColor: isLoading ? '#9ca3af' : '#00236f', color: '#ffffff', fontWeight: 'bold', padding: '14px', borderRadius: '10px', border: 'none', cursor: isLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '12px', fontSize: '15px', transition: 'background 0.2s', boxShadow: isLoading ? 'none' : '0 4px 12px rgba(0,35,111,0.2)' }}
                    onMouseOver={(e) => { if(!isLoading) e.currentTarget.style.backgroundColor = '#00174d' }}
                    onMouseOut={(e) => { if(!isLoading) e.currentTarget.style.backgroundColor = '#00236f' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                      {isLoading ? 'sync' : 'login'}
                    </span>
                    {isLoading ? 'Signing In...' : 'Sign In as Admin'}
                  </button>
                </form>

                <div style={{ marginTop: '32px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: '#9ca3af', fontWeight: '500' }}>
                  <p style={{ margin: 0 }}>Authorized Personnel Only • Barangay Malinao Administrative District</p>
                  <p style={{ margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>lock</span>
                    System Secured via 256-Bit Encryption
                  </p>
                </div>

              </div>
            </div>
          </main>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default AdminLogin;