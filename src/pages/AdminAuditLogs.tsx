import React, { useState, useEffect } from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  startAfter, 
  getDocs, 
  where 
} from "firebase/firestore";
import { db } from '../firebase'; 
import logoImage from '../assets/logo.png';

const AdminAuditLogs: React.FC = () => {
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // ✅ STATE PARA SA FILTERS
  const [roleFilter, setRoleFilter] = useState('All'); 
  const [dateFilter, setDateFilter] = useState('All Time'); 

  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [lastVisible, setLastVisible] = useState<any>(null); 
  const [pageHistory, setPageHistory] = useState<any[]>([]); 
  const [totalLogs, setTotalLogs] = useState(0);

  // ✅ FIX: Tinanggal ang setIsMobile dahil hindi naman ito ginagamit.
  // Fixed na lang ang isMobile base sa unang window size (walang resize listener).
  const [isMobile] = useState(window.innerWidth <= 1024);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ✅ FETCH LOGS (May Server-Side Search na)
  const fetchLogs = async (isNext: boolean = false) => {
    setIsLoading(true);
    try {
      let q = query(
        collection(db, "audit_logs"), 
        orderBy("timestamp", "desc")
      );

      // 1. DATE FILTER LOGIC
      if (dateFilter !== 'All Time') {
        const now = new Date();
        let startDate = new Date();
        if (dateFilter === 'Today') {
          startDate.setHours(0, 0, 0, 0);
        } else if (dateFilter === 'Last 7 Days') {
          startDate.setDate(now.getDate() - 7);
        } else if (dateFilter === 'Last 30 Days') {
          startDate.setDate(now.getDate() - 30);
        } else if (dateFilter === 'This Month') {
          startDate.setDate(1);
          startDate.setHours(0, 0, 0, 0);
        } else if (dateFilter === 'This Year') {
          startDate.setMonth(0, 1);
          startDate.setHours(0, 0, 0, 0);
        }
        q = query(q, where("timestamp", ">=", startDate));
      }

      // 2. ROLE FILTER LOGIC
      if (roleFilter !== 'All') {
        q = query(q, where("role", "==", roleFilter));
      }

      // 3. SERVER-SIDE SEARCH LOGIC (Naghahanap sa buong database)
      if (searchQuery.trim() !== '') {
        const searchTerm = searchQuery.trim();
        q = query(
          q,
          where("userName", ">=", searchTerm),
          where("userName", "<=", searchTerm + "\uf8ff")
        );
      }

      // 4. PAGINATION LOGIC
      q = query(q, limit(itemsPerPage));

      if (isNext && lastVisible) {
        q = query(q, startAfter(lastVisible));
      } else if (!isNext && pageHistory.length > 0 && currentPage > 1) {
        q = query(q, startAfter(pageHistory[currentPage - 2]));
      }

      const snapshot = await getDocs(q);
      
      const logsData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          parsedDate: data.timestamp?.toDate ? data.timestamp.toDate() : new Date()
        };
      });

      setLogs(logsData);
      setLastVisible(snapshot.docs[snapshot.docs.length - 1]);

      if (isNext && snapshot.docs.length > 0) {
        setPageHistory(prev => {
          const newHistory = [...prev];
          newHistory[currentPage - 1] = lastVisible; 
          return newHistory;
        });
      }

    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ MAG-FETCH KAPAG MAY NAGBAGO SA FILTER O SEARCH
  useEffect(() => {
    setCurrentPage(1);
    setPageHistory([]);
    setLastVisible(null);
    fetchLogs(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsPerPage, dateFilter, roleFilter, searchQuery]);

  // Kunin ang total count (Para sa display)
  useEffect(() => {
    const getTotalCount = async () => {
      try {
        const snap = await getDocs(collection(db, "audit_logs"));
        setTotalLogs(snap.size);
      } catch (e) {
        console.log(e);
      }
    };
    getTotalCount();
  }, [logs]);

  const handleNextPage = () => {
    setCurrentPage(prev => prev + 1);
    fetchLogs(true);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
      fetchLogs(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('isAdminLoggedIn');
    sessionStorage.clear();
    window.location.href = '/admin-login';
  };

  const navigateTo = (path: string) => {
    window.location.href = path;
  };

  const formatLogDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatLogTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const getBadgeStyle = (type: string) => {
    switch(type) {
      case 'danger': return { bg: '#fee2e2', color: '#991b1b' };
      case 'warning': return { bg: '#fef3c7', color: '#92400e' };
      case 'success': return { bg: '#dcfce7', color: '#166534' };
      case 'info': 
      default: return { bg: '#e0f2fe', color: '#075985' };
    }
  };

  const determineRole = (log: any) => {
    if (log.role) return log.role;
    if (log.performedBy?.toLowerCase().includes('admin')) return 'Admin';
    if (log.action?.toLowerCase().includes('admin')) return 'Admin';
    if (log.action?.toLowerCase().includes('resident')) return 'Resident';
    if (
      log.action?.toLowerCase().includes('secretary') || 
      log.action?.toLowerCase().includes('staff') || 
      log.action?.toLowerCase().includes('document') || 
      log.action?.toLowerCase().includes('fee') ||
      log.action?.toLowerCase().includes('request')
    ) {
      return 'Secretary';
    }
    return 'System';
  };

  // Dito natin i-apply ang Client-Side fallback (para sure)
  const filteredLogs = logs.filter(log => {
    const rowRole = determineRole(log);
    const displayName = log.userName || log.performedBy || 'System';

    // Kung may tinype sa search, i-check kung tugma sa Name, Action, o Details
    const matchesSearch = 
      searchQuery.trim() === '' ||
      displayName.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (log.action || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.details || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = 
      roleFilter === 'All' || 
      rowRole.toLowerCase() === roleFilter.toLowerCase();

    return matchesSearch && matchesRole;
  });

  const totalPages = Math.ceil(totalLogs / itemsPerPage);

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
                {/* ACTIVE STATE */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', borderRadius: '8px', backgroundColor: '#1e3a8a', color: '#ffffff', cursor: 'pointer' }}>
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

          {/* ================= MAIN CONTENT ================= */}
          <div style={{ marginLeft: isMobile ? 0 : '260px', display: 'flex', flexDirection: 'column', height: '100vh', width: isMobile ? '100%' : 'calc(100% - 260px)', overflowY: 'auto', transition: 'margin-left 0.3s' }}>
            
            <header style={{ position: 'sticky', top: 0, zIndex: 40, backgroundColor: '#ffffff', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? '0 16px' : '0 32px', boxShadow: '0 1px 8px rgba(0,0,0,0.04)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {isMobile && (
                  <button onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#0b1c30' }}>menu</span>
                  </button>
                )}
                {!isMobile && <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#0b1c30' }}>Audit Logs</span>}
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1200px', margin: '0 auto' }}>
                
                {/* ✅ HEADER DESIGN */}
                <section style={{
                  backgroundColor: '#ffffff',
                  borderLeft: '6px solid #1e3a8a',
                  borderRadius: '12px',
                  padding: isMobile ? '20px 16px' : '24px 32px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  display: 'flex',
                  flexDirection: isMobile ? 'column' : 'row', 
                  alignItems: isMobile ? 'flex-start' : 'center',
                  gap: '20px'
                }}>
                  <div style={{
                    width: isMobile ? '56px' : '72px',
                    height: isMobile ? '56px' : '72px',
                    borderRadius: '50%',
                    backgroundColor: '#eff4ff',
                    color: '#1e3a8a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: isMobile ? '28px' : '36px' }}>history</span>
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 600, color: '#757682', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', flexWrap: 'wrap' }}>
                      <span>BARANGAY CAPTAIN</span>
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>chevron_right</span>
                      <span style={{ color: '#0b1c30' }}>AUDIT LOGS</span>
                    </div>
                    <h1 style={{ fontSize: isMobile ? '22px' : '26px', fontWeight: 'bold', color: '#0b1c30', margin: 0 }}>System Audit Logs</h1>
                    <p style={{ fontSize: '14px', color: '#444651', marginTop: '4px', margin: 0 }}>Immutable record of all actions for security and COA compliance.</p>
                  </div>
                </section>

                {/* ✅ AYOS NA FILTER BAR */}
                <div style={{ 
                  backgroundColor: '#ffffff', 
                  borderRadius: '12px', 
                  padding: '16px', 
                  boxShadow: '0 1px 4px rgba(0,0,0,0.05)', 
                  display: 'flex', 
                  flexDirection: isMobile ? 'column' : 'row', 
                  gap: '12px' 
                }}>
                  {/* Search Bar */}
                  <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                    <span className="material-symbols-outlined" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: '18px' }}>search</span>
                    <input
                      style={{ width: '100%', padding: '10px 16px 10px 36px', borderRadius: '8px', backgroundColor: '#f8f9ff', border: '1px solid #e5eeff', outline: 'none', fontSize: '13px' }}
                      placeholder="Search user, action..."
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  {/* DATE DROPDOWN */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: isMobile ? '100%' : 'auto', flexShrink: 0 }}>
                    <span className="material-symbols-outlined" style={{ color: '#757682', fontSize: '20px' }}>calendar_month</span>
                    <select
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      style={{ flex: 1, padding: '10px 16px', borderRadius: '8px', backgroundColor: '#f8f9ff', border: '1px solid #e5eeff', outline: 'none', fontSize: '13px', cursor: 'pointer', color: '#444651', fontWeight: 600, width: isMobile ? '100%' : '160px' }}
                    >
                      <option value="All Time">All Time</option>
                      <option value="Today">Today</option>
                      <option value="Last 7 Days">Last 7 Days</option>
                      <option value="Last 30 Days">Last 30 Days</option>
                      <option value="This Month">This Month</option>
                      <option value="This Year">This Year</option>
                    </select>
                  </div>

                  {/* ROLE FILTER */}
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    style={{ width: isMobile ? '100%' : '140px', padding: '10px 16px', borderRadius: '8px', backgroundColor: '#f8f9ff', border: '1px solid #e5eeff', outline: 'none', fontSize: '13px', cursor: 'pointer', color: '#444651', fontWeight: 600, flexShrink: 0 }}
                  >
                    <option value="All">All Roles</option>
                    <option value="Resident">Residents</option>
                    <option value="Secretary">Secretary</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>

                {/* TABLE */}
                <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', minWidth: '900px', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f8f9ff', color: '#757682', textTransform: 'uppercase', fontSize: '11px', fontWeight: 600 }}>
                          <th style={{ padding: '14px 16px', width: '15%' }}>Date & Time</th>
                          <th style={{ padding: '14px 16px', width: '18%' }}>User</th>
                          <th style={{ padding: '14px 16px', width: '22%' }}>Action</th>
                          <th style={{ padding: '14px 16px', width: '45%' }}>Details</th>
                        </tr>
                      </thead>
                      <tbody style={{ fontSize: '13px', color: '#0b1c30' }}>
                        {isLoading ? (
                          <tr><td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: '#757682' }}>Loading logs...</td></tr>
                        ) : filteredLogs.length === 0 ? (
                          <tr><td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: '#757682' }}>No audit logs found.</td></tr>
                        ) : (
                          filteredLogs.map((log) => {
                            const badgeStyle = getBadgeStyle(log.type || 'info');
                            const displayRole = determineRole(log);
                            const displayName = log.userName || log.performedBy || 'System';

                            return (
                              <tr key={log.id} style={{ borderBottom: '1px solid #eff4ff' }}>
                                <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                                  <div style={{ fontWeight: 600, color: '#1e3a8a' }}>{formatLogDate(log.parsedDate)}</div>
                                  <div style={{ color: '#757682', fontSize: '11px', marginTop: '2px' }}>{formatLogTime(log.parsedDate)}</div>
                                </td>
                                <td style={{ padding: '14px 16px' }}>
                                  <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={displayName}>
                                    {displayName}
                                  </div>
                                  <div style={{ fontSize: '10px', color: '#757682', fontWeight: 'bold', textTransform: 'uppercase', marginTop: '2px' }}>
                                    {displayRole}
                                  </div>
                                </td>
                                <td style={{ padding: '14px 16px' }}>
                                  <span style={{ 
                                    display: 'inline-block',
                                    padding: '4px 10px', 
                                    borderRadius: '12px', 
                                    fontWeight: 'bold', 
                                    fontSize: '11px', 
                                    backgroundColor: badgeStyle.bg, 
                                    color: badgeStyle.color,
                                    maxWidth: '100%',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }} title={log.action}>
                                    {log.action}
                                  </span>
                                </td>
                                <td style={{ padding: '14px 16px', color: '#4b5563', lineHeight: '1.5' }}>
                                  <div style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }} title={log.details}>
                                    {log.details}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* PAGINATION CONTROLS */}
                  {!isLoading && totalLogs > 0 && (
                    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderTop: '1px solid #eff4ff', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#757682' }}>
                        <span>Show</span>
                        <select 
                          value={itemsPerPage} 
                          onChange={(e) => setItemsPerPage(Number(e.target.value))}
                          style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #e5eeff', outline: 'none' }}
                        >
                          <option value={10}>10</option>
                          <option value={25}>25</option>
                          <option value={50}>50</option>
                          <option value={100}>100</option>
                        </select>
                        <span>entries</span>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                        <span style={{ color: '#757682' }}>
                          Page {currentPage} of {totalPages || 1}
                        </span>
                        <button 
                          disabled={currentPage === 1}
                          onClick={handlePrevPage}
                          style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #e5eeff', backgroundColor: currentPage === 1 ? '#f8f9ff' : '#ffffff', color: currentPage === 1 ? '#c0c4cc' : '#0b1c30', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
                        >
                          Prev
                        </button>
                        <button 
                          disabled={currentPage >= totalPages || filteredLogs.length < itemsPerPage}
                          onClick={handleNextPage}
                          style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #e5eeff', backgroundColor: (currentPage >= totalPages || filteredLogs.length < itemsPerPage) ? '#f8f9ff' : '#ffffff', color: (currentPage >= totalPages || filteredLogs.length < itemsPerPage) ? '#c0c4cc' : '#0b1c30', cursor: (currentPage >= totalPages || filteredLogs.length < itemsPerPage) ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </main>
          </div>
        </div>

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
      </IonContent>
    </IonPage>
  );
};

export default AdminAuditLogs;