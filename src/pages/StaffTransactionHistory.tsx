import React, { useState, useEffect } from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { collection, onSnapshot, doc, writeBatch, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { db, logAction } from '../firebase'; // 👈 Idinagdag ang logAction
import logoImage from '../assets/logo.png';

const StaffTransactionHistory: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [docFilter, setDocFilter] = useState('All');
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // --- FIREBASE STATES ---
  const [transactions, setTransactions] = useState<any[]>([]);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // --- RESPONSIVE STATES ---
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 1024;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);

    // 1. Fetch Requests (For Transaction History)
    const unsubscribeRequests = onSnapshot(collection(db, "requests"), async (snapshot) => {
      let pending = 0;
      const allRequests: any[] = [];
      const releasedRequestsToSync: any[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.status === 'Pending') pending++;

        // Kukunin lang natin dito yung mga tapos na (Released or Rejected)
        if (data.status === 'Released' || data.status === 'Rejected') {
          allRequests.push({
            id: doc.id,
            refNo: data.refNo || 'N/A',
            residentName: data.residentName || 'Unknown',
            documentType: data.documentType || 'Unknown Document',
            dateFiled: data.dateFiled || '—',
            dateReleased: data.dateReleased || '—',
            fee: data.fee || '₱0.00',
            amountPaid: data.amountPaid || 0,
            status: data.status,
            processedBy: data.processedBy || 'N/A'
          });

          // I-check kung Released at kailangan i-sync sa transactions collection
          if (data.status === 'Released') {
            releasedRequestsToSync.push(data);
          }
        }
      });

      // 🔄 AUTOMATIC SYNC SA TRANSACTIONS COLLECTION
      // Ito ang magpapa-update ng Revenue sa Admin Dashboard
      if (releasedRequestsToSync.length > 0) {
        try {
          const batch = writeBatch(db);
          for (const req of releasedRequestsToSync) {
            // Check kung existing na sa transactions para hindi ma-doble
            const txnQuery = query(collection(db, "transactions"), where("referenceNo", "==", req.refNo));
            const txnSnap = await getDocs(txnQuery);
            
            if (txnSnap.empty) {
              // Kung wala pa, gawa tayo ng bagong transaction record
              const newTxnRef = doc(collection(db, "transactions"));
              batch.set(newTxnRef, {
                amount: Number(req.fee?.replace('₱', '').replace(',', '') || 0),
                documentType: req.documentType,
                residentName: req.residentName,
                referenceNo: req.refNo,
                createdAt: serverTimestamp(),
                processedBy: req.processedBy || "Secretary"
              });

              // Mag-log din para sa Audit Logs ng Admin
              await logAction(
                "Payment Recorded", 
                `Collected ${req.fee} for ${req.documentType} from ${req.residentName}`, 
                "info"
              );
            }
          }
          await batch.commit();
        } catch (error) {
          console.error("Error syncing to transactions:", error);
        }
      }

      // Sort by newest first
      allRequests.sort((a, b) => {
        const dateA = new Date(a.dateReleased !== '—' ? a.dateReleased : a.dateFiled).getTime() || 0;
        const dateB = new Date(b.dateReleased !== '—' ? b.dateReleased : b.dateFiled).getTime() || 0;
        return dateB - dateA;
      });

      setTransactions(allRequests);
      setPendingRequestsCount(pending);
      setIsLoading(false);
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      unsubscribeRequests();
    };
  }, []);

  // ✅ INAYOS NA LOGOUT PARA MAG-MATCH SA STAFF LOGIN (localStorage)
  const handleLogout = () => {
    localStorage.removeItem('isStaffLoggedIn');
    localStorage.removeItem('staffName');
    window.location.href = '/staff-login';
  };

  const navigateTo = (path: string) => {
    window.location.href = path;
  };

  // --- DYNAMIC CALCULATIONS PARA SA STATS ---
  const totalTxns = transactions.length;
  const today = new Date().toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  const completedToday = transactions.filter(t => t.status === 'Released' && t.dateReleased === today).length;

  // --- FILTER LOGIC ---
  const filteredData = transactions.filter((txn) => {
    const matchesSearch = 
      (txn.refNo || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
      (txn.residentName || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || txn.status === statusFilter;
    const matchesDoc = docFilter === 'All' || txn.documentType === docFilter;
    return matchesSearch && matchesStatus && matchesDoc;
  });

  return (
    <IonPage>
      <IonContent className="bg-surface">
        <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8f9ff', fontFamily: "'Public Sans', sans-serif", color: '#0b1c30', overflow: 'hidden' }}>

          {/* ================= SIDEBAR ================= */}
          <aside style={{ width: '260px', position: 'fixed', top: 0, left: isMobile ? (sidebarOpen ? 0 : '-260px') : 0, height: '100vh', backgroundColor: '#ffffff', zIndex: 100, borderRight: '1px solid #e5eeff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', transition: 'left 0.3s ease-in-out', boxShadow: isMobile && sidebarOpen ? '4px 0 15px rgba(0,0,0,0.1)' : 'none' }}>
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
                    <span style={{ backgroundColor: '#ffdcc3', color: '#2f1500', fontSize: '11px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '12px' }}>{pendingRequestsCount}</span>
                  )}
                </div>
                <div onClick={() => { navigateTo('/staff-residents'); setSidebarOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', borderRadius: '8px', color: '#444651', cursor: 'pointer' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>badge</span>
                  <span style={{ fontSize: '14px' }}>Residents</span>
                </div>
                <div onClick={() => { navigateTo('/staff-document-types'); setSidebarOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', borderRadius: '8px', color: '#444651', cursor: 'pointer' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>folder_copy</span>
                  <span style={{ fontSize: '14px' }}>Document Types</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', borderRadius: '8px', backgroundColor: '#1e3a8a', color: '#ffffff', cursor: 'pointer' }}>
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
                {!isMobile && <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#0b1c30' }}>Transaction History</span>}
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

                {/* TITLE SECTION NA MAY CARD DESIGN */}
                <section style={{ backgroundColor: '#ffffff', borderLeft: '6px solid #1e3a8a', borderRadius: '12px', padding: isMobile ? '20px 16px' : '24px 32px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 600, color: '#757682', textTransform: 'uppercase', letterSpacing: '0.05em', flexWrap: 'wrap' }}>
                    <span>BARANGAY STAFF</span>
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>chevron_right</span>
                    <span style={{ color: '#0b1c30' }}>TRANSACTION LEDGER</span>
                  </div>
                  <h1 style={{ fontSize: isMobile ? '22px' : '26px', fontWeight: 'bold', color: '#0b1c30', margin: 0 }}>Transaction History</h1>
                  <p style={{ fontSize: '14px', color: '#444651', margin: 0 }}>View, track, and audit all processed document transactions.</p>
                </section>

                {/* DYNAMIC STATS */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '16px' }}>
                  <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#757682', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Transactions</span>
                    <div style={{ fontSize: isMobile ? '24px' : '28px', fontWeight: 'bold', color: '#0b1c30', marginTop: '4px' }}>{totalTxns}</div>
                  </div>
                  <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#757682', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Completed Today</span>
                    <div style={{ fontSize: isMobile ? '24px' : '28px', fontWeight: 'bold', color: '#15803d', marginTop: '4px' }}>{completedToday}</div>
                  </div>
                  <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#757682', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pending Requests</span>
                    <div style={{ fontSize: isMobile ? '24px' : '28px', fontWeight: 'bold', color: '#2563eb', marginTop: '4px' }}>{pendingRequestsCount}</div>
                  </div>
                </div>

                {/* FUNCTIONAL FILTERS */}
                <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <span className="material-symbols-outlined" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: '18px' }}>search</span>
                    <input
                      style={{ width: '100%', padding: '10px 16px 10px 36px', borderRadius: '8px', backgroundColor: '#f8f9ff', border: '1px solid #e5eeff', outline: 'none', fontSize: '13px' }}
                      placeholder="Search by reference no. or resident name..."
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: '#f8f9ff', border: '1px solid #e5eeff', fontSize: '13px', outline: 'none', cursor: 'pointer' }}>
                    <option value="All">All Statuses</option>
                    <option value="Released">Released / Completed</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                  <select value={docFilter} onChange={(e) => setDocFilter(e.target.value)} style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: '#f8f9ff', border: '1px solid #e5eeff', fontSize: '13px', outline: 'none', cursor: 'pointer' }}>
                    <option value="All">All Document Types</option>
                    <option value="Barangay Clearance">Barangay Clearance</option>
                    <option value="Certificate of Indigency">Certificate of Indigency</option>
                    <option value="Certificate of Residency">Certificate of Residency</option>
                    <option value="Barangay Business Clearance">Barangay Business Clearance</option>
                  </select>
                </div>

                {/* DYNAMIC TABLE */}
                <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', minWidth: '800px', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f8f9ff', color: '#757682', textTransform: 'uppercase', fontSize: '11px', fontWeight: 600 }}>
                          <th style={{ padding: '12px 16px' }}>Reference No.</th>
                          <th style={{ padding: '12px 16px' }}>Resident</th>
                          <th style={{ padding: '12px 16px' }}>Document Type</th>
                          <th style={{ padding: '12px 16px' }}>Date Released</th>
                          <th style={{ padding: '12px 16px' }}>Amount</th>
                          <th style={{ padding: '12px 16px' }}>Status</th>
                          <th style={{ padding: '12px 16px', textAlign: 'right' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody style={{ fontSize: '13px', color: '#0b1c30' }}>
                        {isLoading ? (
                          <tr><td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#757682' }}>Loading transactions...</td></tr>
                        ) : filteredData.length === 0 ? (
                          <tr><td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#757682' }}>No transactions found.</td></tr>
                        ) : (
                          filteredData.map((txn) => (
                            <tr key={txn.id} style={{ borderBottom: '1px solid #eff4ff' }}>
                              <td style={{ padding: '12px 16px', fontWeight: 'bold', fontFamily: 'monospace', color: '#1e3a8a' }}>{txn.refNo}</td>
                              <td style={{ padding: '12px 16px' }}>{txn.residentName}</td>
                              <td style={{ padding: '12px 16px' }}>{txn.documentType}</td>
                              <td style={{ padding: '12px 16px' }}>{txn.dateReleased !== '—' ? txn.dateReleased : txn.dateFiled}</td>
                              <td style={{ padding: '12px 16px', fontFamily: 'monospace' }}>{txn.fee}</td>
                              <td style={{ padding: '12px 16px' }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, backgroundColor: txn.status === 'Released' ? '#dcfce7' : '#fee2e2', color: txn.status === 'Released' ? '#15803d' : '#dc2626' }}>
                                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: txn.status === 'Released' ? '#4ade80' : '#f87171' }}></span> 
                                  {txn.status === 'Released' ? 'Completed' : 'Rejected'}
                                </span>
                              </td>
                              <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                <button style={{ padding: '6px 12px', borderRadius: '6px', backgroundColor: '#eff4ff', color: '#1e3a8a', fontWeight: 'bold', fontSize: '12px', border: 'none', cursor: 'pointer' }}>View</button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ padding: '12px 16px', backgroundColor: '#f8f9ff', display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', gap: '12px', fontSize: '12px', color: '#757682' }}>
                    <span>Showing <strong>{filteredData.length}</strong> records</span>
                  </div>
                </div>

              </div>
            </main>
          </div>
        </div>

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
                <button onClick={() => setShowLogoutModal(false)} style={{ flex: 1, padding: '12px', borderRadius: '10px', backgroundColor: '#f3f4f6', color: '#374151', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '14px', transition: 'background-color 0.2s' }}>
                  Cancel
                </button>
                <button onClick={handleLogout} style={{ flex: 1, padding: '12px', borderRadius: '10px', backgroundColor: '#ef4444', color: '#ffffff', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '14px', transition: 'background-color 0.2s', boxShadow: '0 2px 4px rgba(239, 68, 68, 0.2)' }}>
                  Yes, Log Out
                </button>
              </div>

            </div>
          </div>
        )}

      </IonContent>
    </IonPage>
  );
};

export default StaffTransactionHistory;