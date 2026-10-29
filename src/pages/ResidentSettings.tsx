import React, { useState, useEffect } from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { updatePassword, updateEmail, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { auth, db, logAction } from '../firebase'; 
import logoImage from '../assets/logo.png';

const ResidentSettings: React.FC = () => {
  const [userData, setUserData] = useState<any>(null);
  const [fullName, setFullName] = useState('');
  const [purok, setPurok] = useState('');
  
  // Password states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3500);
  };

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 1024;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);

    // Fetch current user data
    const fetchUserData = async () => {
      const uid = localStorage.getItem('residentUid');
      if (uid) {
        const docRef = doc(db, "users", uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setUserData(data);
          setFullName(data.fullName || '');
          setPurok(data.purok || '');
        }
      }
    };

    fetchUserData();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const navigateTo = (path: string) => {
    window.location.href = path;
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

      showNotification("Profile updated successfully!", "success");
    } catch (error: any) {
      showNotification("Failed to update profile: " + error.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    setIsSaving(true);

    try {
      // Re-authenticate muna bago magpalit ng password (Security feature ng Firebase)
      const credential = EmailAuthProvider.credential(auth.currentUser.email!, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);

      // Update password
      await updatePassword(auth.currentUser, newPassword);

      await logAction(
        "Changed Password",
        `Resident changed their account password.`,
        "warning",
        fullName || 'Resident',
        "Resident"
      );

      showNotification("Password updated successfully!", "success");
      setCurrentPassword('');
      setNewPassword('');
    } catch (error: any) {
      if (error.code === 'auth/wrong-password') {
        showNotification("Incorrect current password.", "error");
      } else {
        showNotification("Failed to update password: " + error.message, "error");
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <IonPage>
      <IonContent className="bg-surface">
        <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8f9ff', fontFamily: "'Public Sans', sans-serif", color: '#0b1c30' }}>
          
          {/* SIDEBAR (Kapareho ng nasa Dashboard) */}
          <aside style={{ width: '260px', position: 'fixed', top: 0, left: isMobile ? (sidebarOpen ? 0 : '-260px') : 0, height: '100vh', backgroundColor: '#ffffff', zIndex: 100, borderRight: '1px solid #e5eeff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', transition: 'left 0.3s ease-in-out', boxShadow: isMobile && sidebarOpen ? '4px 0 15px rgba(0,0,0,0.1)' : 'none' }}>
            <div>
              <div style={{ height: '64px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #eff4ff' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', overflow: 'hidden', backgroundColor: '#ffffff', border: '1px solid #e5eeff' }}>
                  <img src={logoImage} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#00236f', lineHeight: 1.2 }}>BarangayEase</span>
                  <span style={{ fontSize: '11px', color: '#444651', textTransform: 'uppercase' }}>Resident Portal</span>
                </div>
              </div>
              <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '16px 8px' }}>
                <div onClick={() => navigateTo('/dashboard')} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', borderRadius: '8px', color: '#444651', cursor: 'pointer' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>dashboard</span>
                  <span style={{ fontSize: '14px' }}>Dashboard</span>
                </div>
                {/* ACTIVE STATE */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', borderRadius: '8px', backgroundColor: '#1e3a8a', color: '#ffffff', cursor: 'pointer' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>settings</span>
                  <span style={{ fontSize: '14px' }}>Settings</span>
                </div>
              </nav>
            </div>
          </aside>

          {isMobile && sidebarOpen && (
            <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(11, 28, 48, 0.4)', zIndex: 90, backdropFilter: 'blur(2px)' }}></div>
          )}

          {/* MAIN CONTENT */}
          <div style={{ marginLeft: isMobile ? 0 : '260px', display: 'flex', flexDirection: 'column', height: '100vh', width: isMobile ? '100%' : 'calc(100% - 260px)', overflowY: 'auto' }}>
            
            <header style={{ position: 'sticky', top: 0, zIndex: 40, backgroundColor: '#ffffff', height: '64px', display: 'flex', alignItems: 'center', padding: isMobile ? '0 16px' : '0 32px', boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
               {isMobile && (
                  <button onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', marginRight: '12px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#0b1c30' }}>menu</span>
                  </button>
                )}
                <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#0b1c30' }}>Account Settings</span>
            </header>

            <main style={{ padding: isMobile ? '16px' : '32px', flex: 1, backgroundColor: '#f8f9ff' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '800px', margin: '0 auto' }}>
                
                {/* PROFILE SECTION */}
                <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', border: '1px solid #eff4ff' }}>
                  <div style={{ borderBottom: '1px solid #eff4ff', paddingBottom: '16px', marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0b1c30', margin: 0 }}>Profile Information</h2>
                    <p style={{ fontSize: '13px', color: '#757682', marginTop: '4px' }}>Update your personal details.</p>
                  </div>
                  
                  <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: '#444651' }}>Full Name</label>
                      <input 
                        type="text" 
                        value={fullName} 
                        onChange={(e) => setFullName(e.target.value)} 
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e5eeff', backgroundColor: '#f8f9ff', fontSize: '14px' }}
                        required
                      />
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: '#444651' }}>Purok</label>
                      <select 
                        value={purok} 
                        onChange={(e) => setPurok(e.target.value)}
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e5eeff', backgroundColor: '#f8f9ff', fontSize: '14px' }}
                      >
                        <option value="Purok 1 Centro">Purok 1 Centro</option>
                        <option value="Purok 2 Riverside">Purok 2 Riverside</option>
                        <option value="Purok 3 Pag-asa">Purok 3 Pag-asa</option>
                        <option value="Purok 4 Pag-asa">Purok 4 Pag-asa</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                      <button 
                        type="submit" 
                        disabled={isSaving}
                        style={{ padding: '10px 24px', borderRadius: '8px', backgroundColor: '#1e3a8a', color: '#ffffff', fontWeight: 'bold', border: 'none', cursor: isSaving ? 'not-allowed' : 'pointer' }}
                      >
                        {isSaving ? 'Saving...' : 'Save Profile'}
                      </button>
                    </div>
                  </form>
                </div>

                {/* SECURITY SECTION */}
                <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', border: '1px solid #eff4ff' }}>
                  <div style={{ borderBottom: '1px solid #eff4ff', paddingBottom: '16px', marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0b1c30', margin: 0 }}>Security</h2>
                    <p style={{ fontSize: '13px', color: '#757682', marginTop: '4px' }}>Change your account password.</p>
                  </div>
                  
                  <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: '#444651' }}>Current Password</label>
                      <input 
                        type="password" 
                        value={currentPassword} 
                        onChange={(e) => setCurrentPassword(e.target.value)} 
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e5eeff', backgroundColor: '#f8f9ff', fontSize: '14px' }}
                        required
                      />
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: '#444651' }}>New Password</label>
                      <div style={{ position: 'relative' }}>
                        <input 
                          type={showPassword ? 'text' : 'password'} 
                          value={newPassword} 
                          onChange={(e) => setNewPassword(e.target.value)} 
                          style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e5eeff', backgroundColor: '#f8f9ff', fontSize: '14px' }}
                          required
                          minLength={6}
                        />
                        <button 
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#757682' }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{showPassword ? 'visibility_off' : 'visibility'}</span>
                        </button>
                      </div>
                      <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>Must be at least 6 characters long.</p>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                      <button 
                        type="submit" 
                        disabled={isSaving}
                        style={{ padding: '10px 24px', borderRadius: '8px', backgroundColor: '#b32424', color: '#ffffff', fontWeight: 'bold', border: 'none', cursor: isSaving ? 'not-allowed' : 'pointer' }}
                      >
                        {isSaving ? 'Updating...' : 'Update Password'}
                      </button>
                    </div>
                  </form>
                </div>

              </div>
            </main>
          </div>
        </div>

        {/* TOAST NOTIFICATION */}
        {toast.show && (
          <div style={{ 
            position: 'fixed', top: '24px', right: '24px', zIndex: 10000, 
            backgroundColor: toast.type === 'success' ? '#0b1c30' : '#dc2626', 
            color: '#ffffff', padding: '14px 20px', borderRadius: '8px', 
            display: 'flex', alignItems: 'center', gap: '10px', 
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)', animation: 'slideIn 0.3s ease-out' 
          }}>
            <span className="material-symbols-outlined" style={{ color: toast.type === 'success' ? '#68dba9' : '#ffffff', fontSize: '22px' }}>
              {toast.type === 'success' ? 'check_circle' : 'error'}
            </span>
            <span style={{ fontSize: '14px', fontWeight: 600 }}>{toast.message}</span>
          </div>
        )}

        <style>
          {`
            @keyframes slideIn {
              from { transform: translateX(100%); opacity: 0; }
              to { transform: translateX(0); opacity: 1; }
            }
          `}
        </style>
      </IonContent>
    </IonPage>
  );
};

export default ResidentSettings;