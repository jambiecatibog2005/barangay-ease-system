import React, { useState, useEffect } from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { collection, onSnapshot, query, where, doc, updateDoc } from "firebase/firestore";
import { db, logAction } from '../firebase'; 
import logoImage from '../assets/logo.png'; 

const AdminStaff: React.FC = () => {
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState(''); 
  const [showPassword, setShowPassword] = useState(false); 
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const [secretary, setSecretary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const adminName = localStorage.getItem('adminName') || 'Admin';
  const initials = adminName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
  };

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 1024;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);

    const q = query(collection(db, "users"), where("role", "==", "secretary"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        setSecretary({ id: doc.id, ...doc.data() });
      } else {
        setSecretary(null);
      }
      setIsLoading(false);
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      unsubscribe();
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('isAdminLoggedIn');
    localStorage.removeItem('adminName');
    window.location.href = '/admin-login';
  };

  const navigateTo = (path: string) => {
    window.location.href = path;
  };

  const handleToggleStatus = async () => {
    if (!secretary) return;
    setIsProcessing(true);
    const newStatus = secretary.status === 'Active' || !secretary.status ? 'Inactive' : 'Active';
    
    try {
      const updates: any = { 
        status: newStatus,
      };

      if (newStatus === 'Inactive') {
        updates.forceLogout = true; 
      }

      await updateDoc(doc(db, "users", secretary.id), updates);
      
      // ✅ IDINAGDAG: I-LOG ANG STATUS UPDATE (with userName and role)
      await logAction(
        newStatus === 'Active' ? "Secretary Reactivated" : "Secretary Deactivated", 
        `${secretary.fullName}'s account has been set to ${newStatus}.`, 
        newStatus === 'Active' ? "success" : "warning", // Ginawang success kapag Active
        adminName,  // ✅ Pangalan ng Admin
        "Admin"     // ✅ Role
      );
      showNotification(`Account successfully ${newStatus === 'Active' ? 'reactivated' : 'deactivated'}.`, "success");
    } catch (error) {
      console.error("Error updating status: ", error);
      showNotification("Failed to update status.", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenEditModal = () => {
    if (!secretary) return;
    setEditName(secretary.fullName || '');
    setEditEmail(secretary.email || '');
    setEditPassword(''); 
    setShowEditModal(true);
  };

  const handleSaveProfile = async () => {
    if (!secretary || !editName || !editEmail) {
      showNotification("Please fill in the Name and Email fields.", "error");
      return;
    }
    
    if (editPassword && editPassword.length < 6) {
      showNotification("Password must be at least 6 characters long.", "error");
      return;
    }
    
    setIsProcessing(true);
    try {
      const updates: any = {
        fullName: editName,
        email: editEmail
      };

      if (editPassword) {
        updates.temporaryPassword = editPassword; 
        updates.forceLogout = true; 
        updates.passwordLastUpdated = new Date().toISOString(); 
      }

      await updateDoc(doc(db, "users", secretary.id), updates);
      
      const logDetails = editPassword 
        ? `Updated profile for ${editName} and changed password. Forced logout initiated.` 
        : `Updated profile info for ${editName}.`;
        
      // ✅ IDINAGDAG: I-LOG ANG PROFILE UPDATE (with userName and role)
      await logAction(
        "Secretary Profile Updated", 
        logDetails, 
        "info",
        adminName, // ✅ Pangalan ng Admin
        "Admin"    // ✅ Role
      );
      
      showNotification(`Secretary profile ${editPassword ? 'and password ' : ''}updated successfully!`, "success");
      setShowEditModal(false);
    } catch (error) {
      console.error("Error updating profile: ", error);
      showNotification("Failed to update profile.", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <IonPage>
        <IonContent>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f8f9ff', flexDirection: 'column', gap: '16px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#00236f', animation: 'spin 1s linear infinite' }}>sync</span>
            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#444651' }}>Loading Secretary Data...</span>
            <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonContent className="bg-surface">
        <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8f9ff', fontFamily: "'Public Sans', sans-serif", color: '#0b1c30', overflow: 'hidden' }}>
          
          <aside style={{ width: '260px', position: 'fixed', top: 0, left: isMobile ? (sidebarOpen ? 0 : '-260px') : 0, height: '100vh', backgroundColor: '#ffffff', zIndex: 100, borderRight: '1px solid #e5eeff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', transition: 'left 0.3s ease-in-out', boxShadow: isMobile && sidebarOpen ? '4px 0 15px rgba(0,0,0,0.1)' : 'none' }}>
            <div>
              <div style={{ height: '64px', padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #eff4ff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff', border: '1px solid #e5eeff', flexShrink: 0 }}>
                    <img src={logoImage} alt="BarangayEase Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#00236f', lineHeight: 1.2 }}>BarangayEase</span>
                    <span style={{ fontSize: '11px', color: '#444651', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>Admin Portal</span>
                  </div>
                </div>
                {isMobile && (
                  <button onClick={() => setSidebarOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    <span className="material-symbols-outlined" style={{ color: '#757682' }}>close</span>
                  </button>
                )}
              </div>

              <div style={{ padding: '8px 16px', marginTop: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#757682', textTransform: 'uppercase', letterSpacing: '0.05em' }}>System Administration</span>
              </div>

              <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '0 8px' }}>
                <div onClick={() => { navigateTo('/admin-dashboard'); setSidebarOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', borderRadius: '8px', color: '#444651', cursor: 'pointer' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>dashboard</span>
                  <span style={{ fontSize: '14px' }}>Dashboard</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', borderRadius: '8px', backgroundColor: '#1e3a8a', color: '#ffffff', cursor: 'pointer' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>manage_accounts</span>
                  <span style={{ fontSize: '14px' }}>Secretary Account</span>
                </div>
                <div onClick={() => { navigateTo('/admin-catalog'); setSidebarOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', borderRadius: '8px', color: '#444651', cursor: 'pointer' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>folder_copy</span>
                  <span style={{ fontSize: '14px' }}>Document Catalog</span>
                </div>
                <div onClick={() => { navigateTo('/admin-audit-logs'); setSidebarOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', borderRadius: '8px', color: '#444651', cursor: 'pointer' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>history</span>
                  <span style={{ fontSize: '14px' }}>Audit Logs</span>
                </div>
                <div onClick={() => { navigateTo('/admin-settings'); setSidebarOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', borderRadius: '8px', color: '#444651', cursor: 'pointer' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>settings</span>
                  <span style={{ fontSize: '14px' }}>Settings</span>
                </div>
              </nav>
            </div>

            <div style={{ padding: '16px', backgroundColor: '#eff4ff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#68dba9' }}></div>
                <span style={{ fontSize: '11px', color: '#444651' }}>System Online v2.4</span>
              </div>
              <button onClick={() => setShowLogoutModal(true)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '8px', borderRadius: '8px', backgroundColor: '#ffffff', color: '#444651', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', border: 'none' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>logout</span>
                <span>Log Out Session</span>
              </button>
            </div>
          </aside>

          {isMobile && sidebarOpen && (
            <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(11, 28, 48, 0.4)', zIndex: 90, backdropFilter: 'blur(2px)' }}></div>
          )}

          <div style={{ marginLeft: isMobile ? 0 : '260px', display: 'flex', flexDirection: 'column', height: '100vh', width: isMobile ? '100%' : 'calc(100% - 260px)', overflowY: 'auto', transition: 'margin-left 0.3s' }}>
            
            <header style={{ position: 'sticky', top: 0, zIndex: 40, backgroundColor: '#ffffff', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? '0 16px' : '0 32px', boxShadow: '0 1px 8px rgba(0,0,0,0.04)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {isMobile && (
                  <button onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#0b1c30' }}>menu</span>
                  </button>
                )}
                {!isMobile && <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#0b1c30' }}>Secretary Account</span>}
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#1e3a8a', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>{initials}</div>
                {!isMobile && (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#0b1c30' }}>{adminName}</span>
                    <span style={{ fontSize: '11px', color: '#444651' }}>Punong Barangay</span>
                  </div>
                )}
              </div>
            </header>

            <main style={{ padding: isMobile ? '16px' : '32px', flex: 1, backgroundColor: '#f8f9ff' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '800px', margin: '0 auto' }}>
                
                <div style={{
                  backgroundColor: '#ffffff',
                  borderLeft: '6px solid #1e3a8a',
                  borderRadius: '12px',
                  padding: isMobile ? '20px 16px' : '24px 32px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px'
                }}>
                  <div style={{ 
                    width: '56px', 
                    height: '56px', 
                    borderRadius: '50%', 
                    backgroundColor: '#eff4ff', 
                    color: '#1e3a8a', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>manage_accounts</span>
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 600, color: '#757682', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                      <span>BARANGAY CAPTAIN</span>
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>chevron_right</span>
                      <span style={{ color: '#0b1c30' }}>MANAGE SECRETARY</span>
                    </div>
                    <h1 style={{ fontSize: isMobile ? '22px' : '26px', fontWeight: 'bold', color: '#0b1c30', margin: 0 }}>
                      Manage Secretary
                    </h1>
                    <p style={{ fontSize: '14px', color: '#444651', marginTop: '4px', margin: 0 }}>
                      Control access and manage the primary user profile.
                    </p>
                  </div>
                </div>

                {secretary ? (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6 flex flex-col gap-6">
                    
                    <div className={`flex ${isMobile ? 'flex-col items-start' : 'items-center justify-between'} border-b border-gray-100 pb-6 gap-4`}>
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-blue-900 text-white flex items-center justify-center text-2xl font-bold shrink-0">
                          {secretary.fullName ? secretary.fullName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : 'S'}
                        </div>
                        <div>
                          <h2 className="text-lg md:text-xl font-bold text-gray-900">{secretary.fullName || 'Secretary'}</h2>
                          <p className="text-xs md:text-sm text-gray-500">{secretary.email || 'No Email'}</p>
                          <span className="inline-block mt-2 px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 text-[10px] md:text-xs font-bold uppercase tracking-wider">Barangay Secretary</span>
                        </div>
                      </div>
                      <div className={`flex flex-col ${isMobile ? 'items-start mt-2' : 'items-end'} gap-2`}>
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${secretary.status !== 'Inactive' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                          <span className={`text-xs md:text-sm font-bold ${secretary.status !== 'Inactive' ? 'text-green-700' : 'text-red-700'}`}>
                            {secretary.status !== 'Inactive' ? 'Active' : 'Deactivated'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      <h3 className="text-xs md:text-sm font-bold text-gray-700 uppercase tracking-wider">Account Controls</h3>
                      <div className="flex flex-col md:flex-row gap-3">
                        
                        <button 
                          onClick={handleOpenEditModal} 
                          disabled={isProcessing}
                          className="w-full md:w-auto px-4 py-2.5 md:py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs md:text-sm font-semibold transition-colors flex items-center justify-center md:justify-start gap-2 disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined text-lg">edit</span> Edit Profile & Password
                        </button>
                        
                        {secretary.status !== 'Inactive' ? (
                          <button 
                            onClick={handleToggleStatus} 
                            disabled={isProcessing}
                            className="w-full md:w-auto px-4 py-2.5 md:py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs md:text-sm font-semibold transition-colors flex items-center justify-center md:justify-start gap-2 disabled:opacity-50"
                          >
                            <span className="material-symbols-outlined text-lg">block</span> Deactivate Account
                          </button>
                        ) : (
                          <button 
                            onClick={handleToggleStatus} 
                            disabled={isProcessing}
                            className="w-full md:w-auto px-4 py-2.5 md:py-2 rounded-lg bg-green-50 hover:bg-green-100 text-green-600 text-xs md:text-sm font-semibold transition-colors flex items-center justify-center md:justify-start gap-2 disabled:opacity-50"
                          >
                            <span className="material-symbols-outlined text-lg">check_circle</span> Reactivate Account
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-500">
                    <span className="material-symbols-outlined text-5xl mb-2 text-gray-400">person_off</span>
                    <p>No Secretary account found in the database.</p>
                  </div>
                )}
              </div>
            </main>
          </div>
        </div>

        {/* ================= EDIT PROFILE & PASSWORD MODAL ================= */}
        {showEditModal && secretary && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(11, 28, 48, 0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '450px', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#eff4ff', color: '#1e3a8a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined">edit_document</span>
                </div>
                <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>Edit Secretary Info</h2>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#444651' }}>Full Name</label>
                <input 
                  type="text" 
                  value={editName} 
                  onChange={(e) => setEditName(e.target.value)} 
                  className="w-full px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-600" 
                  style={{ fontSize: '13px', padding: '10px 12px' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#444651' }}>Email Address</label>
                <input 
                  type="email" 
                  value={editEmail} 
                  onChange={(e) => setEditEmail(e.target.value)} 
                  className="w-full px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-600" 
                  style={{ fontSize: '13px', padding: '10px 12px' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#444651' }}>New Password <span style={{color: '#9ca3af', fontWeight: 'normal'}}>(Optional)</span></label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={editPassword} 
                    onChange={(e) => setEditPassword(e.target.value)} 
                    placeholder="Leave blank to keep current password"
                    className="w-full px-3 py-2 pr-10 rounded-lg bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-600" 
                    style={{ fontSize: '13px', padding: '10px 12px' }}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#757682' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
                <p style={{ fontSize: '10px', color: '#757682', marginTop: '2px' }}>Must be at least 6 characters long.</p>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 mt-2">
                <button onClick={() => setShowEditModal(false)} disabled={isProcessing} className="px-4 py-2.5 rounded-lg bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50" style={{ fontSize: '13px' }}>Cancel</button>
                <button onClick={handleSaveProfile} disabled={isProcessing} className="px-4 py-2.5 rounded-lg bg-blue-900 text-white font-semibold hover:bg-blue-800 transition-colors disabled:opacity-50" style={{ fontSize: '13px' }}>
                  {isProcessing ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}

        {toast.show && (
          <div style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 10000, backgroundColor: toast.type === 'success' ? '#0b1c30' : '#dc2626', color: '#ffffff', padding: '14px 20px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', animation: 'slideIn 0.3s ease-out' }}>
            <span className="material-symbols-outlined" style={{ color: toast.type === 'success' ? '#68dba9' : '#ffffff', fontSize: '22px' }}>
              {toast.type === 'success' ? 'check_circle' : 'error'}
            </span>
            <span style={{ fontSize: '14px', fontWeight: 600 }}>{toast.message}</span>
          </div>
        )}

        {showLogoutModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(11, 28, 48, 0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#ffdad6', color: '#ba1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>logout</span>
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0b1c30', margin: '0 0 8px 0' }}>End Admin Session?</h2>
              <p style={{ fontSize: '13px', color: '#444651', margin: '0 0 24px 0', lineHeight: 1.5 }}>
                Sigurado ka bang gusto mong mag-log out? Kailangan mong mag-login muli para ma-access ang admin controls.
              </p>
              <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                <button onClick={() => setShowLogoutModal(false)} style={{ flex: 1, padding: '12px', borderRadius: '8px', backgroundColor: '#eff4ff', color: '#00236f', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>Cancel</button>
                <button onClick={handleLogout} style={{ flex: 1, padding: '12px', borderRadius: '8px', backgroundColor: '#ba1a1a', color: '#ffffff', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>Yes, Log Out</button>
              </div>
            </div>
          </div>
        )}

        <style>{`@keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>

      </IonContent>
    </IonPage>
  );
};
export default AdminStaff;