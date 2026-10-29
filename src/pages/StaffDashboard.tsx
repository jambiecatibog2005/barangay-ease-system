import React, { useState, useEffect } from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { collection, onSnapshot, doc, updateDoc, query, where } from "firebase/firestore"; 
import { db } from '../firebase'; 
import logoImage from '../assets/logo.png'; 

const StaffDashboard: React.FC = () => {
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  // ✅ State para sa Dynamic Name
  const [staffName, setStaffName] = useState(localStorage.getItem('staffName') || 'Secretary');

  const [pendingCount, setPendingCount] = useState(0);
  const [readyCount, setReadyCount] = useState(0);
  const [approvedCount, setApprovedCount] = useState(0);
  const [releasedCount, setReleasedCount] = useState(0); 
  const [recentRequests, setRecentRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ✅ FORCE LOGOUT STATES
  const [showForceLogout, setShowForceLogout] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [hasTriggeredLogout, setHasTriggeredLogout] = useState(false);

  // ✅ LISTENER PARA SA SECRETARY ACCOUNT
  useEffect(() => {
    const q = query(collection(db, "users"), where("role", "==", "secretary"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const secretaryDoc = snapshot.docs[0];
        const secretaryData = secretaryDoc.data();

        // ✅ DYNAMIC NAME
        if (secretaryData.fullName) {
          let displayName = secretaryData.fullName;
          if (displayName.toLowerCase().startsWith('officer')) {
            displayName = displayName.replace(/^officer\s+/i, 'Secretary ');
          } else if (!displayName.toLowerCase().startsWith('secretary')) {
             displayName = `Secretary ${displayName}`;
          }
          setStaffName(displayName);
          localStorage.setItem('staffName', displayName);
        }

        // ✅ TRIGGER FORCE LOGOUT
        if (secretaryData.forceLogout === true && !hasTriggeredLogout) {
          setHasTriggeredLogout(true); // I-lock para hindi mag-doble ang timer
          setShowForceLogout(true);
          setCountdown(5);

          // Simulan ang 5-second countdown
          let timeLeft = 5;
          const timer = setInterval(() => {
            timeLeft -= 1;
            setCountdown(timeLeft);

            if (timeLeft <= 0) {
              clearInterval(timer);
              
              // ✅ Reset forceLogout sa Firestore
              updateDoc(doc(db, "users", secretaryDoc.id), { forceLogout: false }).then(() => {
                // Linisin ang localStorage ng staff
                localStorage.removeItem('isStaffLoggedIn');
                localStorage.removeItem('staffName');
                localStorage.removeItem('staffUid');
                
                // ✅ I-redirect sa login page
                window.location.href = '/staff-login';
              });
            }
          }, 1000);
        }
      }
    });

    return () => unsubscribe();
  }, [hasTriggeredLogout]);

  // ✅ REQUESTS & DATE LISTENER
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 1024;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);

    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    const unsubscribeRequests = onSnapshot(collection(db, "requests"), (snapshot) => {
      let pending = 0;
      let ready = 0;
      let approved = 0;
      let released = 0; 
      
      const allRequests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      allRequests.forEach((req: any) => {
        if (req.status === 'Pending') pending++;
        if (req.status === 'Ready' || req.status === 'Ready for Release') ready++;
        if (req.status === 'Approved') approved++;
        if (req.status === 'Released') released++; 
      });

      setPendingCount(pending);
      setReadyCount(ready);
      setApprovedCount(approved);
      setReleasedCount(released); 
      
      setRecentRequests(allRequests.slice(0, 5));
      setIsLoading(false);
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      clearInterval(timer);
      unsubscribeRequests();
    };
  }, []);

  const formatDateTime = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Manila' };
    const dateString = date.toLocaleDateString('en-PH', options);
    const timeString = date.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Manila' });
    return `${dateString} • ${timeString}`;
  };

  const handleLogout = () => {
    localStorage.removeItem('isStaffLoggedIn');
    localStorage.removeItem('staffName');
    localStorage.removeItem('staffUid');
    window.location.href = '/staff-login';
  };

  const navigateTo = (path: string) => {
    window.location.href = path;
  };

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
                <div onClick={() => { navigateTo('/staff-dashboard'); setSidebarOpen(false); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px', borderRadius: '8px', backgroundColor: '#1e3a8a', color: '#ffffff', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>dashboard</span>
                    <span style={{ fontSize: '14px' }}>Dashboard</span>
                  </div>
                </div>

                <div onClick={() => { navigateTo('/staff-requests'); setSidebarOpen(false); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px', borderRadius: '8px', color: '#444651', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>description</span>
                    <span style={{ fontSize: '14px' }}>Document Requests</span>
                  </div>
                  {pendingCount > 0 && (
                    <span style={{ backgroundColor: '#ffdcc3', color: '#2f1500', fontSize: '11px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '12px' }}>{pendingCount} pending</span>
                  )}
                </div>

                <div onClick={() => { navigateTo('/staff-residents'); setSidebarOpen(false); }} style={{ display: 'flex', alignItems: 'center', padding: '8px', borderRadius: '8px', color: '#444651', cursor: 'pointer' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px', marginRight: '8px' }}>badge</span>
                  <span style={{ fontSize: '14px' }}>Residents</span>
                </div>

                <div onClick={() => { navigateTo('/staff-document-types'); setSidebarOpen(false); }} style={{ display: 'flex', alignItems: 'center', padding: '8px', borderRadius: '8px', color: '#444651', cursor: 'pointer' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px', marginRight: '8px' }}>folder_copy</span>
                  <span style={{ fontSize: '14px' }}>Document Types</span>
                </div>

                <div onClick={() => { navigateTo('/staff-transactions'); setSidebarOpen(false); }} style={{ display: 'flex', alignItems: 'center', padding: '8px', borderRadius: '8px', color: '#444651', cursor: 'pointer' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px', marginRight: '8px' }}>receipt_long</span>
                  <span style={{ fontSize: '14px' }}>Transaction History</span>
                </div>

                <div onClick={() => { navigateTo('/staff-reports'); setSidebarOpen(false); }} style={{ display: 'flex', alignItems: 'center', padding: '8px', borderRadius: '8px', color: '#444651', cursor: 'pointer' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px', marginRight: '8px' }}>monitoring</span>
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

          <div style={{ marginLeft: isMobile ? 0 : '260px', display: 'flex', flexDirection: 'column', height: '100vh', width: isMobile ? '100%' : 'calc(100% - 260px)', overflowY: 'auto', transition: 'margin-left 0.3s' }}>
            
            <header style={{ position: 'sticky', top: 0, zIndex: 40, backgroundColor: '#ffffff', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? '0 16px' : '0 32px', boxShadow: '0 1px 8px rgba(0,0,0,0.04)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {isMobile && (
                  <button onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#0b1c30' }}>menu</span>
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#1e3a8a', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>
                  {staffName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                </div>
                {!isMobile && (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#0b1c30' }}>{staffName}</span>
                    <span style={{ fontSize: '11px', color: '#444651' }}>Barangay Secretary</span>
                  </div>
                )}
              </div>
            </header>

            <main style={{ padding: isMobile ? '16px' : '32px', flex: 1, backgroundColor: '#f8f9ff' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1400px', margin: '0 auto' }}>
                
                <section style={{ backgroundColor: '#ffffff', borderLeft: pendingCount > 0 ? '6px solid #1e3a8a' : '6px solid #68dba9', borderRadius: '12px', padding: isMobile ? '20px 16px' : '24px 32px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                  <div>
                    <div style={{ marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', color: '#757682', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {formatDateTime(currentDateTime)}
                      </span>
                    </div>
                    <h1 style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: 'bold', color: '#00236f', margin: 0 }}>
                      Welcome back, {staffName}
                    </h1>
                    
                    <p style={{ fontSize: '14px', color: pendingCount > 0 ? '#ea580c' : '#15803d', marginTop: '6px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {pendingCount > 0 ? (
                        <>
                          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#ea580c' }}>notifications_active</span>
                          {pendingCount} document applications need your attention today.
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#15803d' }}>check_circle</span>
                          You have no pending documents today. Good job!
                        </>
                      )}
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', width: isMobile ? '100%' : 'auto' }}>
                    <button onClick={() => navigateTo('/staff-transactions')} style={{ flex: isMobile ? 1 : 'none', padding: '10px 16px', borderRadius: '8px', backgroundColor: '#eff4ff', color: '#00236f', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 'bold', fontSize: '14px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>receipt_long</span> Transactions
                    </button>
                    <button onClick={() => navigateTo('/staff-requests')} style={{ flex: isMobile ? 1 : 'none', padding: '10px 16px', borderRadius: '8px', backgroundColor: '#fe932c', color: '#ffffff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 'bold', fontSize: '14px', boxShadow: '0 2px 4px rgba(254, 147, 44, 0.3)' }}>
                      Review ({pendingCount})
                    </button>
                  </div>
                </section>

                <section style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '16px' }}>
                  <div onClick={() => navigateTo('/staff-requests')} style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', borderLeft: '4px solid #fe932c', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', cursor: 'pointer' }}>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#904d00', textTransform: 'uppercase' }}>Pending</div>
                    <div style={{ fontSize: isMobile ? '24px' : '32px', fontWeight: 'bold', color: '#0b1c30', marginTop: '4px' }}>{pendingCount}</div>
                  </div>
                  <div onClick={() => navigateTo('/staff-requests')} style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', borderLeft: '4px solid #68dba9', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', cursor: 'pointer' }}>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#003120', textTransform: 'uppercase' }}>Ready</div>
                    <div style={{ fontSize: isMobile ? '24px' : '32px', fontWeight: 'bold', color: '#0b1c30', marginTop: '4px' }}>{readyCount}</div>
                  </div>
                  <div onClick={() => navigateTo('/staff-requests')} style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', borderLeft: '4px solid #dce1ff', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', cursor: 'pointer' }}>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#444651', textTransform: 'uppercase' }}>Approved</div>
                    <div style={{ fontSize: isMobile ? '24px' : '32px', fontWeight: 'bold', color: '#0b1c30', marginTop: '4px' }}>{approvedCount}</div>
                  </div>
                  <div onClick={() => navigateTo('/staff-transactions')} style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', borderLeft: '4px solid #10b981', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', cursor: 'pointer' }}>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#065f46', textTransform: 'uppercase' }}>Released</div>
                    <div style={{ fontSize: isMobile ? '24px' : '32px', fontWeight: 'bold', color: '#0b1c30', marginTop: '4px' }}>{releasedCount}</div>
                  </div>
                </section>

                <section style={{ backgroundColor: '#ffffff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                  <div style={{ padding: '16px', backgroundColor: '#eff4ff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#0b1c30', margin: 0 }}>Recent Requests</h2>
                    <button onClick={() => navigateTo('/staff-requests')} style={{ fontSize: '12px', fontWeight: 'bold', color: '#00236f', background: 'none', border: 'none', cursor: 'pointer' }}>View All →</button>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead style={{ backgroundColor: '#e5eeff', fontSize: '11px', textTransform: 'uppercase', color: '#444651' }}>
                        <tr>
                          <th style={{ padding: '12px 16px' }}>Reference</th>
                          <th style={{ padding: '12px 16px' }}>Resident</th>
                          <th style={{ padding: '12px 16px' }}>Document</th>
                          <th style={{ padding: '12px 16px' }}>Status</th>
                          <th style={{ padding: '12px 16px', textAlign: 'right' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody style={{ fontSize: '13px' }}>
                        {isLoading ? (
                          <tr><td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#757682' }}>Loading requests...</td></tr>
                        ) : recentRequests.length === 0 ? (
                          <tr><td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#757682' }}>No recent requests found.</td></tr>
                        ) : (
                          recentRequests.map((req) => (
                            <tr key={req.id} style={{ borderBottom: '1px solid #eff4ff' }}>
                              <td style={{ padding: '12px 16px', fontWeight: 'bold', color: '#00236f' }}>{req.refNo}</td>
                              <td style={{ padding: '12px 16px' }}>{req.residentName}</td>
                              <td style={{ padding: '12px 16px' }}>{req.documentType}</td>
                              <td style={{ padding: '12px 16px' }}>
                                <span style={{ 
                                  backgroundColor: req.status === 'Pending' ? '#ffdcc3' : req.status === 'Approved' ? '#dcfce7' : req.status === 'Released' ? '#e0f2fe' : '#eff4ff', 
                                  color: req.status === 'Pending' ? '#2f1500' : req.status === 'Approved' ? '#15803d' : req.status === 'Released' ? '#0369a1' : '#00236f', 
                                  padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' 
                                }}>
                                  {req.status}
                                </span>
                              </td>
                              <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                <button onClick={() => navigateTo('/staff-requests')} style={{ padding: '6px 12px', borderRadius: '8px', backgroundColor: req.status === 'Pending' ? '#1e3a8a' : '#eff4ff', color: req.status === 'Pending' ? '#ffffff' : '#0b1c30', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>Review</button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                  <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#0b1c30', marginBottom: '20px' }}>Today's Activity</h2>
                  
                  <div style={{ borderLeft: '2px solid #e5eeff', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    {recentRequests.length === 0 ? (
                      <div style={{ position: 'relative' }}>
                        <div style={{ position: 'absolute', left: '-26px', top: '4px', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#9ca3af', border: '2px solid #ffffff' }}></div>
                        <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#0b1c30' }}>No Activity</div>
                        <div style={{ fontSize: '13px', color: '#444651', marginTop: '2px' }}>No new requests have been submitted today.</div>
                      </div>
                    ) : (
                      recentRequests.slice(0, 3).map((req: any) => {
                        let displayDate = req.dateFiled || 'Just now'; 
                        
                        if (req.status === 'Ready for Release' && req.dateReadyForRelease) {
                          displayDate = req.dateReadyForRelease;
                        } else if (req.status === 'Released' && req.dateReleased) {
                          displayDate = req.dateReleased;
                        } else if (req.status === 'Rejected' && req.dateRejected) {
                          displayDate = req.dateRejected;
                        }

                        let dotColor = '#1e3a8a'; 
                        if (req.status === 'Ready for Release' || req.status === 'Ready') dotColor = '#f59e0b'; 
                        if (req.status === 'Released') dotColor = '#10b981'; 
                        if (req.status === 'Rejected') dotColor = '#ef4444'; 

                        return (
                          <div key={`activity-${req.id}`} style={{ position: 'relative' }}>
                            <div style={{ position: 'absolute', left: '-26px', top: '4px', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: dotColor, border: '2px solid #ffffff' }}></div>
                            
                            <div style={{ fontSize: '14px', fontWeight: 'bold', color: dotColor, marginBottom: '4px' }}>
                              {req.status === 'Pending' ? 'New Request' : 
                               req.status === 'Ready for Release' || req.status === 'Ready' ? 'Request Ready for Release' : 
                               req.status === 'Released' ? 'Request Released' : 
                               req.status === 'Rejected' ? 'Request Rejected' : 
                               `Request ${req.status}`}
                            </div>
                            
                            <div style={{ fontSize: '13px', color: '#0b1c30', marginBottom: '6px' }}>
                              <strong>{req.residentName}</strong> requested a <strong>{req.documentType}</strong>.
                            </div>
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                              <span style={{ fontSize: '12px', color: '#757682', fontFamily: 'monospace' }}>
                                Ref No: {req.refNo}
                              </span>
                              
                              <span style={{ fontSize: '11px', color: '#757682', display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#f3f4f6', padding: '4px 8px', borderRadius: '4px' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>schedule</span>
                                {displayDate}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}

                  </div>
                </section>
              </div>
            </main>
          </div>
        </div>

        {/* ================= FORCE LOGOUT WARNING MODAL ================= */}
        {showForceLogout && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(11, 28, 48, 0.85)', backdropFilter: 'blur(8px)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
            <div style={{ backgroundColor: '#ffffff', borderRadius: '20px', padding: '32px 24px', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
              
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#fef2f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', animation: 'pulse 1.5s infinite' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>gpp_maybe</span>
              </div>
              
              <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#111827', margin: '0 0 8px 0' }}>Security Alert!</h2>
              
              <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 16px 0', lineHeight: 1.5 }}>
                Your account password was recently changed by the Administrator. For security reasons, you will be logged out automatically in:
              </p>

              {/* ✅ MALAKING COUNTDOWN NUMBER */}
              <div style={{ fontSize: '64px', fontWeight: 'bold', color: '#ef4444', margin: '10px 0 20px 0' }}>
                {countdown}
              </div>
              
            </div>
          </div>
        )}

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
                <button onClick={() => setShowLogoutModal(false)} style={{ flex: 1, padding: '12px', borderRadius: '10px', backgroundColor: '#f3f4f6', color: '#374151', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>Cancel</button>
                <button onClick={handleLogout} style={{ flex: 1, padding: '12px', borderRadius: '10px', backgroundColor: '#ef4444', color: '#ffffff', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>Yes, Log Out</button>
              </div>
            </div>
          </div>
        )}

        <style>
          {`
            @keyframes pulse {
              0%, 100% { transform: scale(1); opacity: 1; }
              50% { transform: scale(1.1); opacity: 0.7; }
            }
          `}
        </style>

      </IonContent>
    </IonPage>
  );
};

export default StaffDashboard;