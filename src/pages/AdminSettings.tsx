import React, { useState, useEffect } from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { doc, getDoc, setDoc, collection, onSnapshot, addDoc, deleteDoc, updateDoc } from "firebase/firestore";
import { db, logAction } from '../firebase'; 
import logoImage from '../assets/logo.png';

const AdminSettings: React.FC = () => {
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  
  // ✅ 5 Ws STATES PARA SA ANNOUNCEMENT
  const [announcement, setAnnouncement] = useState({
    title: '',
    audience: 'All Residents',
    date: '',
    location: '',
    details: '',
    isActive: true
  });

  // ✅ HOLIDAY STATES
  const [holiday, setHoliday] = useState('');
  const [holidayName, setHolidayName] = useState('');
  const [holidaysList, setHolidaysList] = useState<any[]>([]);
  
  // ✅ EDIT STATE
  const [editingHoliday, setEditingHoliday] = useState<any>(null);
  const [editName, setEditName] = useState('');
  const [editDate, setEditDate] = useState('');
  
  // ✅ DELETE CONFIRMATION STATE
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const adminName = localStorage.getItem('adminName') || 'Admin';

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);

    // 1. Fetch Announcement
    const fetchAnnouncement = async () => {
      try {
        const docRef = doc(db, "system_settings", "announcement");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setAnnouncement({
            title: data.title || '',
            audience: data.audience || 'All Residents',
            date: data.date || '',
            location: data.location || '',
            details: data.details || '',
            isActive: data.isActive !== false
          });
        }
      } catch (error) {
        console.error("Error fetching announcement:", error);
      }
    };

    // 2. Fetch Holidays
    const unsubscribeHolidays = onSnapshot(collection(db, "holidays"), (snapshot) => {
      const holidaysData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      holidaysData.sort((a: any, b: any) => {
        if (!a.date || !b.date) return 0;
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });
      setHolidaysList(holidaysData);
      setIsLoading(false);
    });

    fetchAnnouncement();

    return () => {
      window.removeEventListener('resize', handleResize);
      unsubscribeHolidays();
    };
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem('isAdminLoggedIn');
    sessionStorage.clear();
    window.location.href = '/admin-login';
  };

  const navigateTo = (path: string) => {
    window.location.href = path;
  };

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3500);
  };

  // ✅ SAVE ANNOUNCEMENT
  const saveAnnouncement = async () => {
    if (!announcement.title || !announcement.details) {
      showNotification('Please fill in the Title and Details.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      await setDoc(doc(db, "system_settings", "announcement"), {
        ...announcement,
        updatedAt: new Date(),
        updatedBy: adminName
      });

      await logAction(
        "Updated Announcement", 
        `Posted new announcement: "${announcement.title}" for ${announcement.audience}.`, 
        "info", 
        adminName, 
        "Admin"
      );

      showNotification('Announcement posted successfully!', 'success');
    } catch (error) {
      showNotification('Failed to save announcement.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // ✅ ADD HOLIDAY (with name)
  const addHoliday = async () => {
    if (!holidayName.trim()) {
      showNotification('Please enter the holiday name.', 'error');
      return;
    }
    if (!holiday) {
      showNotification('Please select a date.', 'error');
      return;
    }
    if (holidaysList.some((h: any) => h.date === holiday)) {
      showNotification('A holiday already exists on this date.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      await addDoc(collection(db, "holidays"), {
        name: holidayName.trim(),
        date: holiday,
        createdAt: new Date(),
        createdBy: adminName
      });
      await logAction(
        "Added Holiday", 
        `Added "${holidayName.trim()}" (${formatDateDisplay(holiday)}) as a non-working day.`, 
        "success", adminName, "Admin"
      );
      showNotification(`"${holidayName.trim()}" added successfully!`, 'success');
      setHoliday('');
      setHolidayName('');
    } catch (error) {
      showNotification('Failed to add holiday.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // ✅ START EDIT
  const startEdit = (h: any) => {
    setEditingHoliday(h);
    setEditName(h.name || '');
    setEditDate(h.date || '');
  };

  const cancelEdit = () => {
    setEditingHoliday(null);
    setEditName('');
    setEditDate('');
  };

  // ✅ SAVE EDIT
  const saveEdit = async () => {
    if (!editName.trim() || !editDate) {
      showNotification('Please fill in both name and date.', 'error');
      return;
    }
    if (holidaysList.some((h: any) => h.date === editDate && h.id !== editingHoliday.id)) {
      showNotification('Another holiday already exists on this date.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      await updateDoc(doc(db, "holidays", editingHoliday.id), {
        name: editName.trim(),
        date: editDate,
        updatedAt: new Date(),
        updatedBy: adminName
      });
      await logAction(
        "Updated Holiday",
        `Updated holiday to "${editName.trim()}" (${formatDateDisplay(editDate)}).`,
        "info", adminName, "Admin"
      );
      showNotification('Holiday updated successfully!', 'success');
      cancelEdit();
    } catch (error) {
      showNotification('Failed to update holiday.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // ✅ CONFIRM DELETE
  const confirmDelete = (h: any) => {
    setDeleteTarget(h);
  };

  // ✅ EXECUTE DELETE
  const deleteHoliday = async () => {
    if (!deleteTarget) return;
    const { id, name, date } = deleteTarget;
    setDeletingId(id);
    try {
      await deleteDoc(doc(db, "holidays", id));
      await logAction(
        "Deleted Holiday", 
        `Removed "${name || 'Unnamed'}" (${formatDateDisplay(date)}) from non-working days.`, 
        "danger", adminName, "Admin"
      );
      showNotification(`"${name || 'Holiday'}" removed.`, 'success');
      setDeleteTarget(null);
    } catch (error) {
      showNotification('Failed to delete holiday.', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1; 
      const day = parseInt(parts[2]);
      const dateObj = new Date(year, month, day);
      return dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    }
    return dateStr;
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <IonPage>
      <IonContent className="bg-surface">
        <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8f9ff', fontFamily: "'Public Sans', sans-serif", color: '#0b1c30', overflow: 'hidden' }}>
          
          {/* ================= SIDEBAR ================= */}
          <aside 
            style={{ 
              width: '260px', position: 'fixed', top: 0, left: isMobile ? (sidebarOpen ? 0 : '-260px') : 0, 
              height: '100vh', backgroundColor: '#ffffff', zIndex: 100, borderRight: '1px solid #e5eeff', 
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              transition: 'left 0.3s ease-in-out', boxShadow: isMobile && sidebarOpen ? '4px 0 15px rgba(0,0,0,0.1)' : 'none'
            }}
          >
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
                <div onClick={() => { navigateTo('/admin-staff'); setSidebarOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', borderRadius: '8px', color: '#444651', cursor: 'pointer' }}>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', borderRadius: '8px', backgroundColor: '#1e3a8a', color: '#ffffff', cursor: 'pointer' }}>
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

          {/* ================= MAIN CONTENT ================= */}
          <div style={{ marginLeft: isMobile ? 0 : '260px', display: 'flex', flexDirection: 'column', height: '100vh', width: isMobile ? '100%' : 'calc(100% - 260px)', overflowY: 'auto', transition: 'margin-left 0.3s' }}>
            
            <header style={{ position: 'sticky', top: 0, zIndex: 40, backgroundColor: '#ffffff', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? '0 16px' : '0 32px', boxShadow: '0 1px 8px rgba(0,0,0,0.04)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {isMobile && (
                  <button onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#0b1c30' }}>menu</span>
                  </button>
                )}
                {!isMobile && <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#0b1c30' }}>System Settings</span>}
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#1e3a8a', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>RC</div>
                {!isMobile && (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#0b1c30' }}>Capt. Roberto Cruz</span>
                    <span style={{ fontSize: '11px', color: '#444651' }}>Punong Barangay</span>
                  </div>
                )}
              </div>
            </header>

            <main style={{ padding: isMobile ? '16px' : '32px', flex: 1, backgroundColor: '#f8f9ff' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '900px', margin: '0 auto' }}>
                
                {/* ✅ BAGONG DESIGN: HEADER CARD */}
                <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: isMobile ? '20px' : '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', border: '1px solid #eff4ff', display: 'flex', alignItems: 'center', gap: isMobile ? '16px' : '24px', position: 'relative', overflow: 'hidden' }}>
                  {/* Blue accent border sa kaliwa */}
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '6px', backgroundColor: '#00236f' }}></div>
                  
                  {/* Icon Circle */}
                  <div style={{ width: isMobile ? '56px' : '72px', height: isMobile ? '56px' : '72px', borderRadius: '50%', backgroundColor: '#eff4ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: '8px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: isMobile ? '28px' : '36px', color: '#00236f' }}>settings_suggest</span>
                  </div>

                  {/* Text Content */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', fontWeight: 700, color: '#757682', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      <span>Barangay Captain</span>
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>chevron_right</span>
                      <span style={{ color: '#0b1c30' }}>System Configuration</span>
                    </div>
                    <h1 style={{ fontSize: isMobile ? '20px' : '28px', fontWeight: 'bold', color: '#0b1c30', margin: 0, lineHeight: 1.2 }}>System Settings</h1>
                    <p style={{ fontSize: isMobile ? '12px' : '14px', color: '#444651', margin: 0 }}>Manage holidays, announcements, and system configurations.</p>
                  </div>
                </div>

                {/* ✅ BAGONG ANNOUNCEMENT SECTION (5 Ws Format) */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6 flex flex-col gap-4">
                  <div style={{ borderBottom: '1px solid #eff4ff', paddingBottom: '12px' }}>
                    <h2 className="text-base md:text-lg font-bold text-gray-900">Public Announcement Banner</h2>
                    <p className="text-xs md:text-sm text-gray-500 mt-1">This announcement will appear at the top of the Resident Portal.</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* WHAT (Title) */}
                    <div className="flex flex-col gap-1 col-span-1 md:col-span-2">
                      <label style={{ fontSize: '12px', fontWeight: 600, color: '#444651' }}>Announcement Title (What)</label>
                      <input 
                        type="text" 
                        value={announcement.title} 
                        onChange={(e) => setAnnouncement({...announcement, title: e.target.value})} 
                        className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-600" 
                        placeholder="e.g. Libreng Anti-Rabies Vaccination"
                      />
                    </div>

                    {/* WHO (Audience) */}
                    <div className="flex flex-col gap-1">
                      <label style={{ fontSize: '12px', fontWeight: 600, color: '#444651' }}>Target Audience (Who)</label>
                      <select 
                        value={announcement.audience} 
                        onChange={(e) => setAnnouncement({...announcement, audience: e.target.value})}
                        className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      >
                        <option value="All Residents">All Residents</option>
                        <option value="Senior Citizens">Senior Citizens</option>
                        <option value="PWDs">PWDs</option>
                        <option value="Students">Students</option>
                        <option value="Business Owners">Business Owners</option>
                      </select>
                    </div>

                    {/* WHEN (Date) */}
                    <div className="flex flex-col gap-1">
                      <label style={{ fontSize: '12px', fontWeight: 600, color: '#444651' }}>Date / Deadline (When)</label>
                      <input 
                        type="date" 
                        value={announcement.date} 
                        onChange={(e) => setAnnouncement({...announcement, date: e.target.value})} 
                        className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-600" 
                      />
                    </div>

                    {/* WHERE (Location) */}
                    <div className="flex flex-col gap-1 col-span-1 md:col-span-2">
                      <label style={{ fontSize: '12px', fontWeight: 600, color: '#444651' }}>Location (Where - Optional)</label>
                      <input 
                        type="text" 
                        value={announcement.location} 
                        onChange={(e) => setAnnouncement({...announcement, location: e.target.value})} 
                        className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-600" 
                        placeholder="e.g. Barangay Covered Court"
                      />
                    </div>

                    {/* WHY/HOW (Details) */}
                    <div className="flex flex-col gap-1 col-span-1 md:col-span-2">
                      <label style={{ fontSize: '12px', fontWeight: 600, color: '#444651' }}>Full Details (Why & How)</label>
                      <textarea 
                        value={announcement.details} 
                        onChange={(e) => setAnnouncement({...announcement, details: e.target.value})} 
                        className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-600" 
                        rows={3}
                        placeholder="Describe the announcement, instructions, or reasons..."
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button 
                      onClick={saveAnnouncement} 
                      disabled={isSaving}
                      className={`w-full md:w-auto px-6 py-2.5 rounded-lg ${isSaving ? 'bg-gray-400' : 'bg-blue-900 hover:bg-blue-800'} text-white font-bold transition-colors flex items-center justify-center gap-2`} 
                    >
                      <span className="material-symbols-outlined text-[18px]">campaign</span>
                      {isSaving ? 'Publishing...' : 'Publish Announcement'}
                    </button>
                  </div>
                </div>

                {/* Holidays */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6 flex flex-col gap-4">
                  <div>
                    <h2 className="text-base md:text-lg font-bold text-gray-900">Holidays & Non-Working Days</h2>
                    <p className="text-xs md:text-sm text-gray-500 mt-1">Adding a date here will pause SLA deadlines for pending requests.</p>
                  </div>

                  {/* ✅ FIXED FLEX LAYOUT PARA SA ADD HOLIDAY */}
                  <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center w-full">
                    <input 
                      type="text"
                      value={holidayName}
                      onChange={(e) => setHolidayName(e.target.value)}
                      placeholder="Holiday name (e.g. Christmas Day)"
                      className="flex-1 px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      style={{ fontSize: '13px' }}
                    />
                    <input 
                      type="date" 
                      value={holiday} 
                      min={todayStr}
                      onChange={(e) => setHoliday(e.target.value)} 
                      className="px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-600" 
                      style={{ fontSize: '13px', maxWidth: isMobile ? '100%' : '180px' }} 
                    />
                    <button 
                      onClick={addHoliday} 
                      disabled={isSaving}
                      className={`px-6 py-2.5 rounded-lg ${isSaving ? 'bg-gray-400' : 'bg-blue-900 hover:bg-blue-800'} text-white font-bold transition-colors flex items-center justify-center gap-2`} 
                      style={{ fontSize: '13px', border: 'none', cursor: isSaving ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}
                    >
                      <span className="material-symbols-outlined text-[18px]">add</span>
                      {isSaving ? 'Adding...' : 'Add Holiday'}
                    </button>
                  </div>

                  {/* LIST OF HOLIDAYS */}
                  <ul className="flex flex-col gap-2 mt-2">
                    {isLoading ? (
                      <li className="text-center text-gray-500 text-sm py-4">Loading holidays...</li>
                    ) : holidaysList.length === 0 ? (
                      <li className="text-center text-gray-500 text-sm py-8 border border-dashed rounded-lg flex flex-col items-center gap-2">
                        <span className="material-symbols-outlined text-3xl text-gray-300">event_busy</span>
                        <span>No holidays added yet.</span>
                        <span className="text-[11px] text-gray-400">Add a date above to pause SLA deadlines.</span>
                      </li>
                    ) : (
                      holidaysList.map((h: any) => (
                        <li key={h.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100 gap-2">
                          {editingHoliday?.id === h.id ? (
                            // ✅ INLINE EDIT MODE
                            <div className="flex flex-col md:flex-row gap-2 flex-1 w-full">
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                placeholder="Holiday name"
                                className="flex-1 px-2 py-1.5 rounded-md bg-white border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                style={{ fontSize: '13px' }}
                              />
                              <input
                                type="date"
                                value={editDate}
                                min={todayStr}
                                onChange={(e) => setEditDate(e.target.value)}
                                className="px-2 py-1.5 rounded-md bg-white border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                style={{ fontSize: '13px', maxWidth: '160px' }}
                              />
                              <div className="flex gap-1 justify-end">
                                <button
                                  onClick={saveEdit}
                                  disabled={isSaving}
                                  className="px-3 py-1.5 rounded-md bg-green-600 hover:bg-green-700 text-white text-xs font-bold border-none cursor-pointer flex items-center gap-1"
                                >
                                  <span className="material-symbols-outlined text-sm">check</span>
                                  Save
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  className="px-3 py-1.5 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold border-none cursor-pointer flex items-center gap-1"
                                >
                                  <span className="material-symbols-outlined text-sm">close</span>
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            // ✅ DISPLAY MODE
                            <>
                              <div className="flex flex-col">
                                <span className="text-xs md:text-sm font-semibold">
                                  {h.name || 'Unnamed Holiday'}
                                </span>
                                <span className="text-[11px] text-gray-500">
                                  {formatDateDisplay(h.date)}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => startEdit(h)}
                                  disabled={deletingId === h.id}
                                  className="text-blue-600 hover:text-blue-800 bg-transparent border-none cursor-pointer flex items-center p-1 rounded hover:bg-blue-50"
                                  title="Edit"
                                >
                                  <span className="material-symbols-outlined text-lg">edit</span>
                                </button>
                                <button
                                  onClick={() => confirmDelete(h)}
                                  disabled={deletingId === h.id}
                                  className="text-red-500 hover:text-red-700 bg-transparent border-none cursor-pointer flex items-center p-1 rounded hover:bg-red-50 disabled:opacity-50"
                                  title="Delete"
                                >
                                  <span className="material-symbols-outlined text-lg">
                                    {deletingId === h.id ? 'hourglass_empty' : 'delete'}
                                  </span>
                                </button>
                              </div>
                            </>
                          )}
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              </div>
            </main>
          </div>
        </div>

        {/* CUSTOM TOAST NOTIFICATION */}
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

        {/* ================= DELETE CONFIRMATION MODAL ================= */}
        {deleteTarget && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(11, 28, 48, 0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#ffdad6', color: '#ba1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>delete</span>
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0b1c30', margin: '0 0 8px 0' }}>Delete Holiday?</h2>
              <p style={{ fontSize: '13px', color: '#444651', margin: '0 0 24px 0', lineHeight: 1.5 }}>
                Sigurado ka bang gusto mong i-delete ang <strong>"{deleteTarget.name || 'Unnamed Holiday'}"</strong> ({formatDateDisplay(deleteTarget.date)})? Hindi na ito maibabalik.
              </p>
              <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                <button 
                  onClick={() => setDeleteTarget(null)}
                  disabled={deletingId !== null}
                  style={{ flex: 1, padding: '12px', borderRadius: '8px', backgroundColor: '#eff4ff', color: '#00236f', border: 'none', cursor: deletingId ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '13px' }}
                >
                  Cancel
                </button>
                <button 
                  onClick={deleteHoliday}
                  disabled={deletingId !== null}
                  style={{ flex: 1, padding: '12px', borderRadius: '8px', backgroundColor: deletingId ? '#9ca3af' : '#ba1a1a', color: '#ffffff', border: 'none', cursor: deletingId ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '13px' }}
                >
                  {deletingId ? 'Deleting...' : 'Yes, Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= LOGOUT MODAL ================= */}
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
                <button 
                  onClick={() => setShowLogoutModal(false)}
                  style={{ flex: 1, padding: '12px', borderRadius: '8px', backgroundColor: '#eff4ff', color: '#00236f', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', transition: 'background 0.2s' }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#dce9ff'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#eff4ff'}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleLogout}
                  style={{ flex: 1, padding: '12px', borderRadius: '8px', backgroundColor: '#ba1a1a', color: '#ffffff', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', transition: 'background 0.2s' }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#93000a'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ba1a1a'}
                >
                  Yes, Log Out
                </button>
              </div>

            </div>
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

export default AdminSettings;