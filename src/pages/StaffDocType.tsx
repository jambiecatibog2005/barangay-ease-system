import React, { useState, useEffect } from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { collection, onSnapshot, addDoc, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { db } from '../firebase'; 
import logoImage from '../assets/logo.png';

// ✅ LISTAHAN NG MGA POSIBLENG REQUIREMENTS
const AVAILABLE_REQUIREMENTS = [
  "Valid ID (Government Issued)",
  "Proof of Billing / Residency",
  "Cedula / Community Tax Cert.",
  "Barangay ID",
  "2x2 Picture",
  "Certificate of Indigency",
  "Authorization Letter"
];

const StaffDocType: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  // ✅ CUSTOM TOAST STATE
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // ✅ STATES PARA SA DELETE
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // --- FORM STATES ---
  const [editId, setEditId] = useState<string | null>(null); 
  const [docTitle, setDocTitle] = useState('');
  const [docCode, setDocCode] = useState('');
  const [docFee, setDocFee] = useState('');
  const [docProcessingDays, setDocProcessingDays] = useState('1'); 
  
  const [selectedRequirements, setSelectedRequirements] = useState<string[]>([]);

  // --- FIREBASE STATES ---
  const [documentTypes, setDocumentTypes] = useState<any[]>([]);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // --- RESPONSIVE STATES ---
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ✅ HELPER PARA SA TOAST
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

    const unsubscribeDocs = onSnapshot(collection(db, "documentTypes"), (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setDocumentTypes(docs);
      setIsLoading(false);
    });

    const unsubscribeRequests = onSnapshot(collection(db, "requests"), (snapshot) => {
      let pending = 0;
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.status === 'Pending') pending++;
      });
      setPendingRequestsCount(pending);
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      unsubscribeDocs();
      unsubscribeRequests();
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('isStaffLoggedIn');
    localStorage.removeItem('staffName');
    window.location.href = '/staff-login';
  };

  const navigateTo = (path: string) => {
    window.location.href = path;
  };

  const openDrawer = (docData?: any) => {
    if (docData) {
      setEditId(docData.id);
      setDocTitle(docData.title || '');
      setDocCode(docData.code || '');
      setDocFee(docData.fee ? docData.fee.replace('₱', '') : '');
      setDocProcessingDays(docData.processingDays?.toString() || '1');
      setSelectedRequirements(docData.requirements || []);
    } else {
      setEditId(null);
      setDocTitle('');
      setDocCode('');
      setDocFee('');
      setDocProcessingDays('1');
      setSelectedRequirements([]);
    }
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => setIsDrawerOpen(false);

  const handleRequirementToggle = (req: string) => {
    if (selectedRequirements.includes(req)) {
      setSelectedRequirements(selectedRequirements.filter(r => r !== req));
    } else {
      setSelectedRequirements([...selectedRequirements, req]);
    }
  };

  const saveConfiguration = async () => {
    if (!docTitle || !docCode || !docFee || !docProcessingDays) {
      showNotification("Please fill in all fields.", "error");
      return;
    }

    setIsSaving(true);
    try {
      const daysNum = parseInt(docProcessingDays);
      const displayTime = daysNum === 1 ? '1 Day' : `${daysNum} Days`;

      const payload = {
        title: docTitle,
        code: docCode,
        fee: `₱${parseFloat(docFee).toFixed(2)}`,
        numericFee: parseFloat(docFee),
        processingDays: daysNum,
        processingTime: displayTime,
        requirements: selectedRequirements, 
        status: 'Active'
      };

      if (editId) {
        await updateDoc(doc(db, "documentTypes", editId), payload);
      } else {
        await addDoc(collection(db, "documentTypes"), payload);
      }

      setIsDrawerOpen(false);
      showNotification("Document type saved successfully!", "success");
    } catch (error) {
      console.error("Error saving document type: ", error);
      showNotification("Failed to save document type.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteDocument = async () => {
    if (!docToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, "documentTypes", docToDelete.id));
      setDeleteModalOpen(false);
      setDocToDelete(null);
      
      showNotification("Document type deleted successfully!", "success");
    } catch (error) {
      console.error("Error deleting document: ", error);
      showNotification("Failed to delete document type.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredData = documentTypes.filter((doc) => {
    return (
      (doc.title || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
      (doc.code || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

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
                    <span style={{ fontSize: '11px', color: '#444651', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>Brgy. Malinao Staff</span>
                  </div>
                </div>
                {isMobile && (
                  <button onClick={() => setSidebarOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    <span className="material-symbols-outlined" style={{ color: '#757682' }}>close</span>
                  </button>
                )}
              </div>

              <div style={{ padding: '8px 16px', marginTop: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#757682', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Main Navigation</span>
              </div>

              <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '0 8px' }}>
                <div onClick={() => { navigateTo('/staff-dashboard'); setSidebarOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', borderRadius: '8px', color: '#444651', cursor: 'pointer' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>dashboard</span>
                  <span style={{ fontSize: '14px' }}>Dashboard</span>
                </div>
                
                <div onClick={() => { navigateTo('/staff-requests'); setSidebarOpen(false); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px', borderRadius: '8px', color: '#444651', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>description</span>
                    <span style={{ fontSize: '14px' }}>Document Requests</span>
                  </div>
                  {pendingRequestsCount > 0 && (
                    <span style={{ backgroundColor: '#ffdcc3', color: '#2f1500', fontSize: '11px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '12px' }}>
                      {pendingRequestsCount}
                    </span>
                  )}
                </div>

                <div onClick={() => { navigateTo('/staff-residents'); setSidebarOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', borderRadius: '8px', color: '#444651', cursor: 'pointer' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>badge</span>
                  <span style={{ fontSize: '14px' }}>Residents</span>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', borderRadius: '8px', backgroundColor: '#1e3a8a', color: '#ffffff', cursor: 'pointer' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>folder_copy</span>
                  <span style={{ fontSize: '14px' }}>Document Types</span>
                </div>

                <div onClick={() => { navigateTo('/staff-transactions'); setSidebarOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', borderRadius: '8px', color: '#444651', cursor: 'pointer' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>receipt_long</span>
                  <span style={{ fontSize: '14px' }}>Transaction History</span>
                </div>
                <div onClick={() => { navigateTo('/staff-reports'); setSidebarOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', borderRadius: '8px', color: '#444651', cursor: 'pointer' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>monitoring</span>
                  <span style={{ fontSize: '14px' }}>Reports</span>
                </div>
              </nav>
            </div>

            <div style={{ padding: '16px', backgroundColor: '#eff4ff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#68dba9' }}></div>
                <span style={{ fontSize: '11px', color: '#444651' }}>Operational v2.4</span>
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
                {!isMobile && <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#0b1c30' }}>Document Types</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#1e3a8a', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>MR</div>
                {!isMobile && (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#0b1c30' }}>Officer Maria Reyes</span>
                    <span style={{ fontSize: '11px', color: '#444651' }}>Barangay Secretary</span>
                  </div>
                )}
              </div>
            </header>

            <main style={{ padding: isMobile ? '16px' : '32px', flex: 1, backgroundColor: '#f8f9ff' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1200px', margin: '0 auto' }}>

                <section style={{
                  backgroundColor: '#ffffff',
                  borderLeft: '6px solid #1e3a8a',
                  borderRadius: '12px',
                  padding: isMobile ? '20px 16px' : '24px 32px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  display: 'flex',
                  flexDirection: isMobile ? 'column' : 'row',
                  alignItems: isMobile ? 'flex-start' : 'center',
                  justifyContent: 'space-between',
                  gap: '16px'
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 600, color: '#757682', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', flexWrap: 'wrap' }}>
                      <span>BARANGAY STAFF</span>
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>chevron_right</span>
                      <span style={{ color: '#0b1c30' }}>DOCUMENT TYPES</span>
                    </div>
                    <h1 style={{ fontSize: isMobile ? '22px' : '26px', fontWeight: 'bold', color: '#0b1c30', margin: 0 }}>Document Types</h1>
                    <p style={{ fontSize: '14px', color: '#444651', marginTop: '4px', margin: 0 }}>Configure issuance guidelines, fees, and turnaround times.</p>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px', width: isMobile ? '100%' : 'auto', flexDirection: isMobile ? 'column' : 'row' }}>
                    <button
                      onClick={() => openDrawer()}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px 16px', borderRadius: '8px', backgroundColor: '#1e3a8a', color: '#ffffff', fontWeight: 'bold', border: 'none', cursor: 'pointer', fontSize: '13px' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
                      <span>Add Document Type</span>
                    </button>
                  </div>
                </section>

                <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                  <div style={{ position: 'relative' }}>
                    <span className="material-symbols-outlined" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: '18px' }}>search</span>
                    <input
                      style={{ width: '100%', padding: '10px 16px 10px 36px', borderRadius: '8px', backgroundColor: '#f8f9ff', border: '1px solid #e5eeff', outline: 'none', fontSize: '13px' }}
                      placeholder="Search document name or code..."
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', minWidth: '700px', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f8f9ff', color: '#757682', textTransform: 'uppercase', fontSize: '11px', fontWeight: 600 }}>
                          <th style={{ padding: '12px 16px' }}>Code</th>
                          <th style={{ padding: '12px 16px' }}>Document Name</th>
                          <th style={{ padding: '12px 16px' }}>Fee</th>
                          <th style={{ padding: '12px 16px' }}>Processing Time</th>
                          <th style={{ padding: '12px 16px' }}>Status</th>
                          <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody style={{ fontSize: '13px', color: '#0b1c30' }}>
                        {isLoading ? (
                          <tr><td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#757682' }}>Loading document types...</td></tr>
                        ) : filteredData.length === 0 ? (
                          <tr><td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#757682' }}>No document types found. Click "Add Document Type" to create one.</td></tr>
                        ) : (
                          filteredData.map((doc) => (
                            <tr key={doc.id} style={{ borderBottom: '1px solid #eff4ff' }}>
                              <td style={{ padding: '12px 16px', fontWeight: 'bold', fontFamily: 'monospace', color: '#1e3a8a' }}>{doc.code}</td>
                              <td style={{ padding: '12px 16px', fontWeight: 'bold' }}>{doc.title}</td>
                              <td style={{ padding: '12px 16px', fontFamily: 'monospace' }}>{doc.fee}</td>
                              <td style={{ padding: '12px 16px' }}>{doc.processingTime}</td>
                              <td style={{ padding: '12px 16px' }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 8px', borderRadius: '12px', backgroundColor: '#dcfce7', color: '#15803d', fontSize: '11px', fontWeight: 600 }}>
                                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#4ade80' }}></span> Active
                                </span>
                              </td>
                              <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                  <button onClick={() => openDrawer(doc)} style={{ padding: '6px 12px', borderRadius: '6px', backgroundColor: '#eff4ff', color: '#1e3a8a', fontWeight: 'bold', fontSize: '12px', border: 'none', cursor: 'pointer' }}>Edit</button>
                                  <button onClick={() => { setDocToDelete(doc); setDeleteModalOpen(true); }} style={{ padding: '6px 12px', borderRadius: '6px', backgroundColor: '#fee2e2', color: '#dc2626', fontWeight: 'bold', fontSize: '12px', border: 'none', cursor: 'pointer' }}>Delete</button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </main>
          </div>
        </div>

        {/* ================= DRAWER (Add/Edit) ================= */}
        {isDrawerOpen && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(11, 28, 48, 0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
            
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '520px', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', maxHeight: '90vh', overflowY: 'auto' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0b1c30', margin: 0 }}>
                  {editId ? 'Edit Document' : 'Add Document'}
                </h2>
                <button onClick={closeDrawer} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                  <span className="material-symbols-outlined" style={{ color: '#757682' }}>close</span>
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#444651' }}>Document Name</label>
                <input
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', backgroundColor: '#f8f9ff', border: '1px solid #e5eeff', outline: 'none', fontSize: '13px' }}
                  type="text"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="e.g. Barangay Clearance"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#444651' }}>Code</label>
                  <input
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', backgroundColor: '#f8f9ff', border: '1px solid #e5eeff', outline: 'none', fontSize: '13px', fontFamily: 'monospace' }}
                    type="text"
                    value={docCode}
                    onChange={(e) => setDocCode(e.target.value)}
                    placeholder="BRGY-XXX-01"
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#444651' }}>Fee (₱)</label>
                  <input
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', backgroundColor: '#f8f9ff', border: '1px solid #e5eeff', outline: 'none', fontSize: '13px', fontFamily: 'monospace' }}
                    type="number"
                    value={docFee}
                    onChange={(e) => setDocFee(e.target.value)}
                    placeholder="50.00"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#444651' }}>Processing Days</label>
                <select
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', backgroundColor: '#f8f9ff', border: '1px solid #e5eeff', outline: 'none', fontSize: '13px', cursor: 'pointer' }}
                  value={docProcessingDays}
                  onChange={(e) => setDocProcessingDays(e.target.value)}
                >
                  <option value="1">1 Day (Same Day / Next Day)</option>
                  <option value="2">2 Days</option>
                  <option value="3">3 Days</option>
                  <option value="4">4 Days</option>
                  <option value="5">5 Days</option>
                  <option value="7">1 Week (7 Days)</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: '#f8f9ff', padding: '16px', borderRadius: '12px', border: '1px solid #e5eeff' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#0b1c30', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#1e3a8a' }}>fact_check</span>
                    Required Documents / Valid IDs
                  </label>
                  <p style={{ fontSize: '11px', color: '#757682', margin: '2px 0 0 24px' }}>Select all requirements the resident must submit.</p>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '8px' }}>
                  {AVAILABLE_REQUIREMENTS.map((req) => {
                    const isSelected = selectedRequirements.includes(req);
                    return (
                      <div 
                        key={req} 
                        onClick={() => handleRequirementToggle(req)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          backgroundColor: isSelected ? '#eff4ff' : '#ffffff',
                          border: isSelected ? '1.5px solid #1e3a8a' : '1px solid #e5eeff',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          boxShadow: isSelected ? '0 2px 4px rgba(30, 58, 138, 0.1)' : 'none'
                        }}
                      >
                        <span 
                          className="material-symbols-outlined" 
                          style={{ 
                            fontSize: '20px', 
                            color: isSelected ? '#1e3a8a' : '#cbd5e1',
                            fontVariationSettings: isSelected ? "'FILL' 1" : "'FILL' 0"
                          }}
                        >
                          {isSelected ? 'check_box' : 'check_box_outline_blank'}
                        </span>
                        
                        <span style={{ 
                          fontSize: '12px', 
                          fontWeight: isSelected ? 'bold' : 'normal', 
                          color: isSelected ? '#1e3a8a' : '#444651' 
                        }}>
                          {req}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '8px' }}>
                <button onClick={closeDrawer} style={{ padding: '10px 16px', borderRadius: '8px', backgroundColor: '#f3f4f6', color: '#444651', fontWeight: 'semibold', border: 'none', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
                <button onClick={saveConfiguration} disabled={isSaving} style={{ padding: '10px 16px', borderRadius: '8px', backgroundColor: '#1e3a8a', color: '#ffffff', fontWeight: 'bold', border: 'none', cursor: isSaving ? 'not-allowed' : 'pointer', fontSize: '13px', opacity: isSaving ? 0.7 : 1 }}>
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= DELETE CONFIRMATION MODAL ================= */}
        {deleteModalOpen && docToDelete && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(11, 28, 48, 0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>delete_forever</span>
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0b1c30', margin: '0 0 8px 0' }}>Delete Document Type?</h2>
              <p style={{ fontSize: '13px', color: '#444651', margin: '0 0 24px 0', lineHeight: 1.5 }}>
                Are you sure you want to delete <strong>{docToDelete.title}</strong>? <br/><span style={{color: '#dc2626', fontSize: '12px'}}>Warning: This action cannot be undone and it will be removed from the resident catalog.</span>
              </p>
              <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                <button onClick={() => { setDeleteModalOpen(false); setDocToDelete(null); }} disabled={isDeleting} style={{ flex: 1, padding: '12px', borderRadius: '8px', backgroundColor: '#f3f4f6', color: '#444651', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>Cancel</button>
                <button onClick={handleDeleteDocument} disabled={isDeleting} style={{ flex: 1, padding: '12px', borderRadius: '8px', backgroundColor: '#dc2626', color: '#ffffff', border: 'none', cursor: isDeleting ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
                  {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= CUSTOM TOAST NOTIFICATION ================= */}
        {toast.show && (
          <div style={{ 
            position: 'fixed', 
            top: '24px', 
            right: '24px', 
            zIndex: 10000, 
            backgroundColor: toast.type === 'success' ? '#0b1c30' : '#dc2626', 
            color: '#ffffff', 
            padding: '14px 20px', 
            borderRadius: '8px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px', 
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            animation: 'slideIn 0.3s ease-out'
          }}>
            <span className="material-symbols-outlined" style={{ color: toast.type === 'success' ? '#68dba9' : '#ffffff', fontSize: '22px' }}>
              {toast.type === 'success' ? 'check_circle' : 'error'}
            </span>
            <span style={{ fontSize: '14px', fontWeight: 600 }}>{toast.message}</span>
          </div>
        )}

        {/* ================= LOGOUT CONFIRMATION MODAL ================= */}
        {showLogoutModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(11, 28, 48, 0.5)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
            <div style={{ backgroundColor: '#ffffff', borderRadius: '20px', padding: '32px 24px', width: '100%', maxWidth: '380px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
              
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#fef2f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>logout</span>
              </div>
              
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827', margin: '0 0 8px 0' }}>End Session?</h2>
              
              <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 24px 0', lineHeight: 1.5 }}>
                Are you sure you want to log out? You will need to log in again to access your staff portal.
              </p>
              
              <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                <button 
                  onClick={() => setShowLogoutModal(false)} 
                  style={{ flex: 1, padding: '12px', borderRadius: '10px', backgroundColor: '#f3f4f6', color: '#374151', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '14px', transition: 'background-color 0.2s' }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e5e7eb'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleLogout} 
                  style={{ flex: 1, padding: '12px', borderRadius: '10px', backgroundColor: '#ef4444', color: '#ffffff', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '14px', transition: 'background-color 0.2s', boxShadow: '0 2px 4px rgba(239, 68, 68, 0.2)' }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ef4444'}
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

export default StaffDocType;