import React, { useState, useEffect, useMemo } from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { collection, onSnapshot, doc, updateDoc, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore"; 
import { db, logAction } from '../firebase'; // ✅ IDINAGDAG ANG logAction
import logoImage from '../assets/logo.png'; 

const StaffDocRequest: React.FC = () => {
  // --- SEARCH (debounced) ---
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // --- FILTERS ---
  const [activeTab, setActiveTab] = useState('All');
  const [dateFilter, setDateFilter] = useState('All Time');
  const [sortBy, setSortBy] = useState('Newest');

  // --- PAGINATION ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // --- DATA ---
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // --- RESPONSIVE ---
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // --- DEBOUNCE SEARCH ---
  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // --- RESET PAGE kapag nagbago ang filter/search ---
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab, dateFilter, sortBy]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 1024;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);

    const unsubscribe = onSnapshot(collection(db, "requests"), (snapshot) => {
      const reqData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRequests(reqData);
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      unsubscribe();
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

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedRequest) return;
    try {
      const reqRef = doc(db, "requests", selectedRequest.id);
      
      const timestampNow = new Date().toLocaleString('en-PH', { 
        month: 'short', day: 'numeric', year: 'numeric', 
        hour: 'numeric', minute: 'numeric', hour12: true 
      });

      // ✅ KUNIN ANG PANGALAN NG NAKA-LOGIN NA STAFF
      const staffName = localStorage.getItem('staffName') || 'Staff Member';

      const updates: any = { 
        status: newStatus,
        processedBy: staffName // Ginawang dynamic
      };
      
      if (newStatus === 'Under Review') updates.dateUnderReview = timestampNow;
      if (newStatus === 'Approved') updates.dateApproved = timestampNow;
      if (newStatus === 'Ready for Release') updates.dateReadyForRelease = timestampNow;
      if (newStatus === 'Rejected') updates.dateRejected = timestampNow;
      
      if (newStatus === 'Released') {
        updates.dateReleased = timestampNow;
        
        let finalAmount = selectedRequest.numericFee;
        
        if (!finalAmount || isNaN(finalAmount) || finalAmount === 0) {
          const cleanFee = String(selectedRequest.fee).replace(/[^0-9.-]+/g, "");
          finalAmount = Number(cleanFee) || 0;
        }

        updates.amountPaid = finalAmount; 
        updates.numericFee = finalAmount;

        const txnQuery = query(collection(db, "transactions"), where("referenceNo", "==", selectedRequest.refNo));
        const txnSnap = await getDocs(txnQuery);

        if (txnSnap.empty) {
          await addDoc(collection(db, "transactions"), {
            amount: finalAmount,
            documentType: selectedRequest.documentType,
            residentName: selectedRequest.residentName,
            referenceNo: selectedRequest.refNo,
            createdAt: serverTimestamp(), 
            processedBy: staffName
          });
        }
      }

      await updateDoc(reqRef, updates);

      // ✅ IDINAGDAG: I-LOG ANG STATUS UPDATE SA AUDIT LOGS
      // Dynamic na type base sa status
      let logType = "info";
      if (newStatus === 'Approved' || newStatus === 'Released' || newStatus === 'Ready for Release') logType = "success";
      if (newStatus === 'Rejected') logType = "danger";
      if (newStatus === 'Under Review') logType = "warning";

      await logAction(
        `${newStatus} Request`,
        `Request ${selectedRequest.refNo} (${selectedRequest.documentType}) for ${selectedRequest.residentName} marked as ${newStatus}.`,
        logType,
        staffName,
        "Secretary"
      );

      setSelectedRequest(null);
    } catch (error) {
      console.error("Error updating status: ", error);
      alert("Failed to update status.");
    }
  };

  // --- Helper: i-parse ang dateFiled string tulad ng "Oct 28, 2026, 2:30 PM" ---
  const parseDate = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    const native = new Date(dateStr);
    if (!isNaN(native.getTime())) return native;
    const match = dateStr.match(/(\w+)\s+(\d+),\s+(\d+),\s+(\d+):(\d+)\s+(AM|PM)/i);
    if (match) {
      const [, mon, day, year, hour, min, ampm] = match;
      const months: any = { Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5, Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11 };
      let h = parseInt(hour);
      if (ampm.toUpperCase() === 'PM' && h !== 12) h += 12;
      if (ampm.toUpperCase() === 'AM' && h === 12) h = 0;
      return new Date(parseInt(year), months[mon], parseInt(day), h, parseInt(min));
    }
    return null;
  };

  // --- Date filter logic ---
  const isWithinDateFilter = (dateStr: string): boolean => {
    if (dateFilter === 'All Time') return true;
    const d = parseDate(dateStr);
    if (!d) return false;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (dateFilter === 'Today') {
      return d >= today;
    }
    if (dateFilter === 'This Week') {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      return d >= startOfWeek;
    }
    if (dateFilter === 'This Month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return d >= startOfMonth;
    }
    return true;
  };

  // --- Filtered + Sorted data ---
  const filteredData = useMemo(() => {
    let result = requests.filter((row) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = 
        (row.residentName || '').toLowerCase().includes(q) ||
        (row.refNo || '').toLowerCase().includes(q) ||
        (row.documentType || '').toLowerCase().includes(q);
      const matchesTab = activeTab === 'All' ? true : row.status === activeTab;
      const matchesDate = isWithinDateFilter(row.dateFiled || '');
      return matchesSearch && matchesTab && matchesDate;
    });

    result.sort((a, b) => {
      if (sortBy === 'Name A-Z') return (a.residentName || '').localeCompare(b.residentName || '');
      if (sortBy === 'Name Z-A') return (b.residentName || '').localeCompare(a.residentName || '');
      const da = parseDate(a.dateFiled || '')?.getTime() || 0;
      const db_ = parseDate(b.dateFiled || '')?.getTime() || 0;
      if (sortBy === 'Oldest') return da - db_;
      return db_ - da;
    });

    return result;
  }, [requests, searchQuery, activeTab, dateFilter, sortBy]);

  // --- Pagination slice ---
  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  // --- Counts ---
  const pendingCount = requests.filter(r => r.status === 'Pending').length;
  const readyCount = requests.filter(r => r.status === 'Ready for Release').length;

  // --- CSV Export ---
  const handleExportCSV = () => {
    if (filteredData.length === 0) {
      alert("Walang data na i-export.");
      return;
    }
    const headers = ['Reference No.', 'Resident Name', 'Document Type', 'Purpose', 'Date Filed', 'Status', 'Processed By'];
    const rows = filteredData.map(r => [
      r.refNo || '',
      r.residentName || '',
      r.documentType || '',
      r.purpose || '',
      r.dateFiled || '',
      r.status || '',
      r.processedBy || ''
    ]);
    const escapeCell = (cell: string) => `"${String(cell).replace(/"/g, '""')}"`;
    const csv = [headers, ...rows].map(row => row.map(escapeCell).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `requests_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <IonPage>
      <IonContent className="bg-surface">
        <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8f9ff', fontFamily: "'Public Sans', sans-serif", color: '#0b1c30', overflow: 'hidden' }}>
          
          {/* SIDEBAR */}
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px', borderRadius: '8px', backgroundColor: '#1e3a8a', color: '#ffffff', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>description</span>
                    <span style={{ fontSize: '14px' }}>Document Requests</span>
                  </div>
                  {pendingCount > 0 && (
                    <span style={{ backgroundColor: '#ffdcc3', color: '#2f1500', fontSize: '11px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '12px' }}>
                      {pendingCount} pending
                    </span>
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

          {/* MAIN CONTENT */}
          <div style={{ marginLeft: isMobile ? 0 : '260px', display: 'flex', flexDirection: 'column', height: '100vh', width: isMobile ? '100%' : 'calc(100% - 260px)', overflowY: 'auto', transition: 'margin-left 0.3s' }}>
            
            <header style={{ position: 'sticky', top: 0, zIndex: 40, backgroundColor: '#ffffff', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? '0 16px' : '0 32px', boxShadow: '0 1px 8px rgba(0,0,0,0.04)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {isMobile && (
                  <button onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#0b1c30' }}>menu</span>
                  </button>
                )}
                {!isMobile && <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#0b1c30' }}>Document Requests</span>}
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1400px', margin: '0 auto' }}>
                
                <section style={{
                  backgroundColor: '#ffffff',
                  borderLeft: '6px solid #1e3a8a',
                  borderRadius: '12px',
                  padding: isMobile ? '20px 16px' : '24px 32px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 600, color: '#757682', textTransform: 'uppercase', letterSpacing: '0.05em', flexWrap: 'wrap' }}>
                    <span>BARANGAY STAFF</span>
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>chevron_right</span>
                    <span style={{ color: '#0b1c30' }}>DOCUMENT PROCESSING</span>
                  </div>
                  <h1 style={{ fontSize: isMobile ? '22px' : '26px', fontWeight: 'bold', color: '#0b1c30', margin: 0 }}>Manage Requests</h1>
                  <p style={{ fontSize: '14px', color: '#444651', margin: 0 }}>Monitor and process all certificate applications.</p>
                </section>

                {/* ============ FILTERS + SEARCH BAR ============ */}
                <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                  
                  {/* Search + Export */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#eff4ff', borderRadius: '8px', padding: '8px 16px', flex: '1 1 260px' }}>
                      <span className="material-symbols-outlined" style={{ color: '#757682', fontSize: '20px' }}>search</span>
                      <input 
                        style={{ width: '100%', backgroundColor: 'transparent', border: 'none', outline: 'none', fontSize: '14px' }} 
                        placeholder="Search Reference No., Name, or Document Type..." 
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                      />
                    </div>
                    <button 
                      onClick={handleExportCSV}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px', backgroundColor: '#15803d', color: '#ffffff', border: 'none', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>download</span>
                      Export CSV
                    </button>
                  </div>

                  {/* Status Tabs */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                    {[
                      { key: 'All', label: `All (${requests.length})` },
                      { key: 'Pending', label: `Pending (${pendingCount})` },
                      { key: 'Under Review', label: 'Under Review' },
                      { key: 'Approved', label: 'Approved' },
                      { key: 'Ready for Release', label: `Ready (${readyCount})` },
                      { key: 'Released', label: 'Released' },
                      { key: 'Rejected', label: 'Rejected' }
                    ].map(tab => (
                      <button 
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)} 
                        style={{ padding: '6px 12px', borderRadius: '8px', backgroundColor: activeTab === tab.key ? '#1e3a8a' : '#eff4ff', color: activeTab === tab.key ? '#ffffff' : '#0b1c30', border: 'none', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Date Filter + Sort */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', borderTop: '1px solid #e5eeff', paddingTop: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#757682' }}>calendar_month</span>
                      <select 
                        value={dateFilter} 
                        onChange={(e) => setDateFilter(e.target.value)}
                        style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #e5eeff', backgroundColor: '#ffffff', fontSize: '13px', color: '#0b1c30', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        <option>All Time</option>
                        <option>Today</option>
                        <option>This Week</option>
                        <option>This Month</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#757682' }}>sort</span>
                      <select 
                        value={sortBy} 
                        onChange={(e) => setSortBy(e.target.value)}
                        style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #e5eeff', backgroundColor: '#ffffff', fontSize: '13px', color: '#0b1c30', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        <option>Newest</option>
                        <option>Oldest</option>
                        <option>Name A-Z</option>
                        <option>Name Z-A</option>
                      </select>
                    </div>

                    <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#757682' }}>
                      {filteredData.length} result{filteredData.length !== 1 ? 's' : ''} found
                    </span>
                  </div>
                </div>

                {/* ============ TABLE ============ */}
                <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', minWidth: '800px', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead style={{ backgroundColor: '#e5eeff', fontSize: '11px', textTransform: 'uppercase', color: '#444651' }}>
                        <tr>
                          <th style={{ padding: '12px 16px' }}>Reference No.</th>
                          <th style={{ padding: '12px 16px' }}>Resident Name</th>
                          <th style={{ padding: '12px 16px' }}>Document Type</th>
                          <th style={{ padding: '12px 16px' }}>Date Filed</th>
                          <th style={{ padding: '12px 16px' }}>Status</th>
                          <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody style={{ fontSize: '13px' }}>
                        {paginatedData.length === 0 ? (
                          <tr><td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#757682' }}>No requests found.</td></tr>
                        ) : (
                          paginatedData.map((row) => (
                            <tr key={row.id} style={{ borderBottom: '1px solid #eff4ff' }}>
                              <td style={{ padding: '12px 16px', fontWeight: 'bold', color: '#00236f' }}>{row.refNo}</td>
                              <td style={{ padding: '12px 16px', fontWeight: 'bold' }}>{row.residentName}</td>
                              <td style={{ padding: '12px 16px' }}>{row.documentType}</td>
                              <td style={{ padding: '12px 16px', color: '#444651' }}>{row.dateFiled || 'N/A'}</td>
                              <td style={{ padding: '12px 16px' }}>
                                <span style={{ 
                                  backgroundColor: row.status === 'Pending' ? '#fef3c7' : row.status === 'Ready for Release' ? '#dcfce7' : row.status === 'Rejected' ? '#fee2e2' : '#eff4ff', 
                                  color: row.status === 'Pending' ? '#d97706' : row.status === 'Ready for Release' ? '#15803d' : row.status === 'Rejected' ? '#dc2626' : '#00236f', 
                                  padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' 
                                }}>
                                  {row.status}
                                </span>
                              </td>
                              <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                <button 
                                  onClick={() => setSelectedRequest(row)}
                                  style={{ padding: '6px 12px', borderRadius: '8px', backgroundColor: row.status === 'Pending' ? '#1e3a8a' : '#eff4ff', color: row.status === 'Pending' ? '#ffffff' : '#0b1c30', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}
                                >
                                  Review
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* ============ PAGINATION ============ */}
                  {filteredData.length > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid #eff4ff', flexWrap: 'wrap', gap: '8px', backgroundColor: '#fafbff' }}>
                      <span style={{ fontSize: '12px', color: '#757682' }}>
                        Showing {startIndex + 1}–{Math.min(startIndex + itemsPerPage, filteredData.length)} of {filteredData.length}
                      </span>
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        <button 
                          disabled={safePage === 1}
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          style={{ 
                            padding: '6px 12px', borderRadius: '6px', border: '1px solid #e5eeff', 
                            backgroundColor: safePage === 1 ? '#f8f9ff' : '#ffffff', 
                            color: safePage === 1 ? '#c0c4cc' : '#0b1c30', 
                            cursor: safePage === 1 ? 'not-allowed' : 'pointer', 
                            fontSize: '12px', fontWeight: 'bold' 
                          }}
                        >
                          Prev
                        </button>
                        <span style={{ fontSize: '12px', color: '#444651', padding: '0 8px', fontWeight: 'bold' }}>
                          Page {safePage} of {totalPages}
                        </span>
                        <button 
                          disabled={safePage === totalPages}
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          style={{ 
                            padding: '6px 12px', borderRadius: '6px', border: '1px solid #e5eeff', 
                            backgroundColor: safePage === totalPages ? '#f8f9ff' : '#ffffff', 
                            color: safePage === totalPages ? '#c0c4cc' : '#0b1c30', 
                            cursor: safePage === totalPages ? 'not-allowed' : 'pointer', 
                            fontSize: '12px', fontWeight: 'bold' 
                          }}
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

        {/* ================= REVIEW MODAL ================= */}
        {selectedRequest && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(11, 28, 48, 0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '500px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', maxHeight: '90vh', overflowY: 'auto' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eff4ff', paddingBottom: '12px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0b1c30', margin: 0 }}>Review Request</h2>
                <button onClick={() => setSelectedRequest(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#757682', display: 'flex', alignItems: 'center' }}>
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#757682' }}>Reference No.</span>
                  <span style={{ fontWeight: 'bold', color: '#00236f' }}>{selectedRequest.refNo}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#757682' }}>Resident</span>
                  <span style={{ fontWeight: 'bold' }}>{selectedRequest.residentName}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#757682' }}>Purpose</span>
                  <span style={{ fontWeight: 'bold' }}>{selectedRequest.purpose}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#757682' }}>Document Type</span>
                  <span style={{ fontWeight: 'bold' }}>{selectedRequest.documentType}</span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#757682' }}>Fee to Collect:</span>
                  <span style={{ fontWeight: 'bold', color: '#15803d' }}>{selectedRequest.fee}</span>
                </div>

                {selectedRequest.requirementImage && (
                  <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#757682' }}>Uploaded Valid ID:</span>
                    <img 
                      src={selectedRequest.requirementImage} 
                      alt="Uploaded ID" 
                      style={{ width: '100%', borderRadius: '8px', border: '1px solid #e5eeff', maxHeight: '250px', objectFit: 'contain', backgroundColor: '#f8f9ff' }} 
                    />
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                {selectedRequest.status === 'Pending' && (
                  <>
                    <button onClick={() => setSelectedRequest(null)} style={{ flex: 1, padding: '10px', borderRadius: '8px', backgroundColor: '#eff4ff', color: '#00236f', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>Cancel</button>
                    <button onClick={() => handleUpdateStatus('Rejected')} style={{ flex: 1, padding: '10px', borderRadius: '8px', backgroundColor: '#ef4444', color: '#ffffff', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>Reject</button>
                    <button onClick={() => handleUpdateStatus('Under Review')} style={{ flex: 1, padding: '10px', borderRadius: '8px', backgroundColor: '#f59e0b', color: '#ffffff', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>Start Review</button>
                  </>
                )}

                {selectedRequest.status === 'Under Review' && (
                  <>
                    <button onClick={() => setSelectedRequest(null)} style={{ flex: 1, padding: '10px', borderRadius: '8px', backgroundColor: '#eff4ff', color: '#00236f', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>Cancel</button>
                    <button onClick={() => handleUpdateStatus('Rejected')} style={{ flex: 1, padding: '10px', borderRadius: '8px', backgroundColor: '#ef4444', color: '#ffffff', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>Reject</button>
                    <button onClick={() => handleUpdateStatus('Approved')} style={{ flex: 1, padding: '10px', borderRadius: '8px', backgroundColor: '#2563eb', color: '#ffffff', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>Approve</button>
                  </>
                )}

                {selectedRequest.status === 'Approved' && (
                  <>
                    <button onClick={() => setSelectedRequest(null)} style={{ flex: 1, padding: '10px', borderRadius: '8px', backgroundColor: '#eff4ff', color: '#00236f', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>Cancel</button>
                    <button onClick={() => handleUpdateStatus('Ready for Release')} style={{ flex: 1, padding: '10px', borderRadius: '8px', backgroundColor: '#15803d', color: '#ffffff', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>Mark as Ready</button>
                  </>
                )}

                {selectedRequest.status === 'Ready for Release' && (
                  <>
                    <button onClick={() => setSelectedRequest(null)} style={{ flex: 1, padding: '10px', borderRadius: '8px', backgroundColor: '#eff4ff', color: '#00236f', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>Close</button>
                    <button onClick={() => handleUpdateStatus('Released')} style={{ flex: 1, padding: '10px', borderRadius: '8px', backgroundColor: '#0b1c30', color: '#ffffff', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>Mark as Released</button>
                  </>
                )}

                {(selectedRequest.status === 'Released' || selectedRequest.status === 'Rejected') && (
                  <button onClick={() => setSelectedRequest(null)} style={{ flex: 1, padding: '10px', borderRadius: '8px', backgroundColor: '#eff4ff', color: '#00236f', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>Close</button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= LOGOUT MODAL ================= */}
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
      </IonContent>
    </IonPage>
  );
};

export default StaffDocRequest;