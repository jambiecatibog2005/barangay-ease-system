import React, { useState, useEffect } from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { collection, onSnapshot, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase'; 
import logoImage from '../assets/logo.png';

// ✅ IMPORT PARA SA CHART
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface StaffMember {
  id: string;
  fullName: string;
  role: string;
  status?: string;
}

interface AuditLog {
  id: string;
  action: string;
  details: string;
  timestamp: any;
  type?: string;
}

// ✅ TYPE PARA SA CHART DATA
interface ChartDataPoint {
  name: string;
  revenue: number;
}

const AdminDashboard: React.FC = () => {
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  
  // --- RESPONSIVE STATES ---
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // --- DYNAMIC DATA STATES ---
  const [stats, setStats] = useState({
    revenue: 0,
    docsProcessed: 0,
    pendingRequests: 0,
    residents: 0
  });
  const [staffOnDuty, setStaffOnDuty] = useState<StaffMember[]>([]);
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);

  // ✅ STATES PARA SA CHART
  const [allRequests, setAllRequests] = useState<any[]>([]);
  const [chartFilter, setChartFilter] = useState('days'); 
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);

  const adminName = localStorage.getItem('adminName') || 'Admin';
  const initials = adminName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();

  const getRevenueAmount = (req: any) => {
    if (req.amountPaid && !isNaN(Number(req.amountPaid))) {
      return Number(req.amountPaid);
    }
    if (req.fee) {
      const cleanFee = String(req.fee).replace(/[^0-9.-]+/g, "");
      return Number(cleanFee) || 0;
    }
    return 0;
  };

  // 📊 REALTIME LISTENERS
  useEffect(() => {
    const residentsQuery = query(collection(db, "users"), where("role", "==", "resident"));
    const unsubscribeResidents = onSnapshot(residentsQuery, (snapshot) => {
      setStats(prev => ({ ...prev, residents: snapshot.size }));
    });

    const requestsQuery = query(collection(db, "requests"));
    const unsubscribeRequests = onSnapshot(requestsQuery, (snapshot) => {
      let pending = 0;
      let processed = 0;
      let totalRevenue = 0;
      const reqsData: any[] = [];

      snapshot.forEach(doc => {
        const data = doc.data();
        reqsData.push(data);
        
        if (data.status === 'Pending') pending++;
        if (data.status === 'Approved' || data.status === 'Released') processed++;
        if (data.status === 'Released') totalRevenue += getRevenueAmount(data);
      });

      setAllRequests(reqsData);

      setStats(prev => ({ 
        ...prev, 
        pendingRequests: pending, 
        docsProcessed: processed,
        revenue: totalRevenue 
      }));
      setIsDataLoading(false);
    });

    // ✅ FIX: Kinukuha lahat, tapos javascript filter ang gagawa
    const staffQuery = query(collection(db, "users"), where("role", "in", ["staff", "secretary"]));
    const unsubscribeStaff = onSnapshot(staffQuery, (snapshot) => {
      const staffList: StaffMember[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        // I-filter dito: kung ang status ay 'Inactive', wag isama. Kung 'Active' o wala, isama.
        if (data.status !== 'Inactive') {
          staffList.push({ id: doc.id, ...data } as StaffMember);
        }
      });
      setStaffOnDuty(staffList);
    });

    const logsQuery = query(collection(db, "audit_logs"), orderBy("timestamp", "desc"), limit(3));
    const unsubscribeLogs = onSnapshot(logsQuery, (snapshot) => {
      const logsList: AuditLog[] = [];
      snapshot.forEach(doc => {
        logsList.push({ id: doc.id, ...doc.data() } as AuditLog);
      });
      setRecentLogs(logsList);
    });

    return () => {
      unsubscribeResidents();
      unsubscribeRequests();
      unsubscribeStaff();
      unsubscribeLogs();
    };
  }, []);

  // ✅ COMPUTE CHART DATA
  useEffect(() => {
    if (allRequests.length === 0) return;

    const releasedReqs = allRequests.filter(r => r.status === 'Released');
    const today = new Date();
    let groupedData: Record<string, number> = {};
    let result: ChartDataPoint[] = [];

    if (chartFilter === 'days') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        groupedData[label] = 0; 
      }

      releasedReqs.forEach(req => {
        const dateStr = req.dateReleased || req.timestamp?.toDate?.().toLocaleDateString() || '';
        if (dateStr) {
          const d = new Date(dateStr);
          const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          if (groupedData[label] !== undefined) {
            groupedData[label] += getRevenueAmount(req);
          }
        }
      });
      result = Object.keys(groupedData).map(key => ({ name: key, revenue: groupedData[key] }));

    } else if (chartFilter === 'months') {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      months.forEach(m => groupedData[m] = 0);

      releasedReqs.forEach(req => {
        const dateStr = req.dateReleased || req.timestamp?.toDate?.().toLocaleDateString() || '';
        if (dateStr) {
          const d = new Date(dateStr);
          if (d.getFullYear() === today.getFullYear()) {
            const label = months[d.getMonth()];
            groupedData[label] += getRevenueAmount(req);
          }
        }
      });
      result = months.map(m => ({ name: m, revenue: groupedData[m] }));

    } else if (chartFilter === 'years') {
      for (let i = 4; i >= 0; i--) {
        groupedData[(today.getFullYear() - i).toString()] = 0;
      }

      releasedReqs.forEach(req => {
        const dateStr = req.dateReleased || req.timestamp?.toDate?.().toLocaleDateString() || '';
        if (dateStr) {
          const d = new Date(dateStr);
          const label = d.getFullYear().toString();
          if (groupedData[label] !== undefined) {
            groupedData[label] += getRevenueAmount(req);
          }
        }
      });
      result = Object.keys(groupedData).map(key => ({ name: key, revenue: groupedData[key] }));
    }

    setChartData(result);
  }, [allRequests, chartFilter]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 1024;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = async () => {
    localStorage.removeItem('isAdminLoggedIn');
    localStorage.removeItem('adminName');
    window.location.href = '/admin-login';
  };

  const navigateTo = (path: string) => {
    window.location.href = path;
  };

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

              <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '0 8px', overflowY: 'auto' }}>
                <div onClick={() => { navigateTo('/admin-dashboard'); setSidebarOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', borderRadius: '8px', backgroundColor: '#1e3a8a', color: '#ffffff', cursor: 'pointer' }}>
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
                {!isMobile && <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#0b1c30' }}>Admin Dashboard</span>}
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#1e3a8a', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>
                  {initials}
                </div>
                {!isMobile && (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#0b1c30' }}>{adminName}</span>
                    <span style={{ fontSize: '11px', color: '#444651' }}>Punong Barangay</span>
                  </div>
                )}
              </div>
            </header>

            <main style={{ padding: isMobile ? '16px' : '32px', flex: 1, backgroundColor: '#f8f9ff' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1400px', margin: '0 auto' }}>
                
                {/* ✅ 1. GREETING BANNER */}
                <section style={{ 
                  backgroundColor: '#ffffff', 
                  borderRadius: '16px', 
                  padding: isMobile ? '24px 20px' : '32px', 
                  boxShadow: '0 4px 20px rgba(0,0,0,0.05)', 
                  border: '1px solid #eff4ff',
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex', 
                  flexDirection: isMobile ? 'column' : 'row', 
                  justifyContent: 'space-between', 
                  alignItems: isMobile ? 'flex-start' : 'center', 
                  gap: '24px' 
                }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '6px', backgroundColor: '#1e3a8a' }}></div>
                  <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: '60%', background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(239, 244, 255, 0.7) 100%)', pointerEvents: 'none' }}></div>

                  <div style={{ zIndex: 1, display: 'flex', alignItems: 'flex-start', gap: isMobile ? '16px' : '24px' }}>
                    <div style={{ width: isMobile ? '48px' : '64px', height: isMobile ? '48px' : '64px', borderRadius: '50%', backgroundColor: '#eff4ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '4px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: isMobile ? '28px' : '36px', color: '#1e3a8a' }}>wb_sunny</span>
                    </div>
                    <div>
                      <h1 style={{ fontSize: isMobile ? '22px' : '32px', fontWeight: '800', color: '#00236f', margin: 0, letterSpacing: '-0.5px', lineHeight: 1.2 }}>
                        Welcome back, {adminName}
                      </h1>
                      <p style={{ fontSize: isMobile ? '13px' : '15px', color: '#444651', marginTop: '8px', margin: 0, fontWeight: '500' }}>
                        Here is the overall status of your barangay today.
                      </p>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '12px', width: isMobile ? '100%' : 'auto', zIndex: 1 }}>
                    <button onClick={() => navigateTo('/admin-catalog')} style={{ flex: isMobile ? 1 : 'none', padding: '12px 24px', borderRadius: '8px', backgroundColor: '#ffffff', border: '1px solid #1e3a8a', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 'bold', fontSize: '14px', color: '#1e3a8a', transition: 'all 0.2s' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>folder_copy</span> Document
                    </button>
                    <button onClick={() => navigateTo('/admin-audit-logs')} style={{ flex: isMobile ? 1 : 'none', padding: '12px 24px', borderRadius: '8px', backgroundColor: '#1e3a8a', color: '#ffffff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 'bold', fontSize: '14px', transition: 'all 0.2s', boxShadow: '0 4px 10px rgba(30, 58, 138, 0.2)' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>shield</span> Logs
                    </button>
                  </div>
                </section>

                {/* 2. Top-Level Metrics */}
                <section style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(1, 1fr)' : 'repeat(4, 1fr)', gap: '16px' }}>
                  <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', borderTop: '4px solid #1e3a8a', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#757682', textTransform: 'uppercase' }}>Total Revenue</div>
                    <div style={{ fontSize: isMobile ? '24px' : '32px', fontWeight: 'bold', color: '#0b1c30', marginTop: '8px' }}>
                      {isDataLoading ? '...' : `₱${stats.revenue.toLocaleString()}`}
                    </div>
                    <div style={{ fontSize: '12px', color: '#15803d', fontWeight: 'bold', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span className="material-symbols-outlined text-sm">trending_up</span> All-time collection
                    </div>
                  </div>
                  <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', borderTop: '4px solid #68dba9', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#757682', textTransform: 'uppercase' }}>Docs Processed</div>
                    <div style={{ fontSize: isMobile ? '24px' : '32px', fontWeight: 'bold', color: '#0b1c30', marginTop: '8px' }}>
                      {isDataLoading ? '...' : stats.docsProcessed}
                    </div>
                    <div style={{ fontSize: '12px', color: '#757682', marginTop: '8px' }}>Approved or Released</div>
                  </div>
                  <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', borderTop: '4px solid #fe932c', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#757682', textTransform: 'uppercase' }}>Pending Requests</div>
                    <div style={{ fontSize: isMobile ? '24px' : '32px', fontWeight: 'bold', color: '#ba1a1a', marginTop: '8px' }}>
                      {isDataLoading ? '...' : stats.pendingRequests}
                    </div>
                    <div style={{ fontSize: '12px', color: '#ba1a1a', marginTop: '8px' }}>Needs action</div>
                  </div>
                  <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', borderTop: '4px solid #eff4ff', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#757682', textTransform: 'uppercase' }}>Registered Residents</div>
                    <div style={{ fontSize: isMobile ? '24px' : '32px', fontWeight: 'bold', color: '#0b1c30', marginTop: '8px' }}>
                      {isDataLoading ? '...' : stats.residents.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '12px', color: '#757682', marginTop: '8px' }}>Active in Masterlist</div>
                  </div>
                </section>

                {/* ✅ 3. REVENUE ANALYTICS CHART */}
                <section style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', marginBottom: '24px', gap: '16px' }}>
                    <div>
                      <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0b1c30', margin: 0 }}>Revenue Analytics</h2>
                      <p style={{ fontSize: '13px', color: '#757682', marginTop: '4px' }}>Track your barangay's income from released documents.</p>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px', backgroundColor: '#f8f9ff', padding: '4px', borderRadius: '8px', border: '1px solid #e5eeff' }}>
                      <button onClick={() => setChartFilter('days')} style={{ padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', border: 'none', cursor: 'pointer', backgroundColor: chartFilter === 'days' ? '#ffffff' : 'transparent', color: chartFilter === 'days' ? '#1e3a8a' : '#757682', boxShadow: chartFilter === 'days' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.2s' }}>Days</button>
                      <button onClick={() => setChartFilter('months')} style={{ padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', border: 'none', cursor: 'pointer', backgroundColor: chartFilter === 'months' ? '#ffffff' : 'transparent', color: chartFilter === 'months' ? '#1e3a8a' : '#757682', boxShadow: chartFilter === 'months' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.2s' }}>Months</button>
                      <button onClick={() => setChartFilter('years')} style={{ padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', border: 'none', cursor: 'pointer', backgroundColor: chartFilter === 'years' ? '#ffffff' : 'transparent', color: chartFilter === 'years' ? '#1e3a8a' : '#757682', boxShadow: chartFilter === 'years' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.2s' }}>Years</button>
                    </div>
                  </div>

                  <div style={{ width: '100%', height: isMobile ? '250px' : '300px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: isMobile ? 0 : 20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#1e3a8a" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#1e3a8a" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5eeff" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#757682' }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#757682' }} tickFormatter={(value) => `₱${value}`} width={isMobile ? 60 : 80} />
                        <Tooltip 
                          formatter={(value: any) => {
                            const num = typeof value === 'number' ? value : Number(value);
                            if (isNaN(num)) return ['₱0', 'Revenue'];
                            return [`₱${num.toLocaleString()}`, 'Revenue'];
                          }}
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        />
                        <Area type="monotone" dataKey="revenue" stroke="#1e3a8a" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </section>

                {/* 4. Secondary Details */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
                  
                  <section style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#0b1c30', margin: 0 }}>Staff on Duty</h2>
                      <button onClick={() => navigateTo('/admin-staff')} style={{ fontSize: '13px', fontWeight: 'bold', color: '#00236f', background: 'none', border: 'none', cursor: 'pointer' }}>Manage →</button>
                    </div>
                    {isDataLoading ? (
                      <div style={{ fontSize: '13px', color: '#757682' }}>Loading staff...</div>
                    ) : staffOnDuty.length > 0 ? (
                      staffOnDuty.slice(0, 2).map(staff => (
                        <div key={staff.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', backgroundColor: '#f8f9ff', borderRadius: '8px', border: '1px solid #e5eeff', marginBottom: '8px' }}>
                          <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#1e3a8a', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 'bold' }}>
                            {staff.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#0b1c30' }}>{staff.fullName}</div>
                            <div style={{ fontSize: '12px', color: '#757682' }}>{staff.role === 'secretary' ? 'Barangay Secretary' : 'Staff Member'}</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#15803d' }}></span>
                            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#15803d' }}>Online</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={{ fontSize: '13px', color: '#757682' }}>No staff on duty right now.</div>
                    )}
                  </section>

                  <section style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#0b1c30', margin: 0 }}>Recent Logs</h2>
                      <span className="material-symbols-outlined" style={{ color: '#ba1a1a', fontSize: '20px' }}>shield</span>
                    </div>
                    <div style={{ borderLeft: '2px solid #e5eeff', paddingLeft: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {isDataLoading ? (
                         <div style={{ fontSize: '13px', color: '#757682' }}>Loading logs...</div>
                      ) : recentLogs.length > 0 ? (
                        recentLogs.map(log => (
                          <div key={log.id}>
                            <div style={{ fontSize: '13px', fontWeight: 'bold', color: log.type === 'warning' ? '#ba1a1a' : '#00236f' }}>{log.action}</div>
                            <div style={{ fontSize: '13px', color: '#444651' }}>{log.details}</div>
                          </div>
                        ))
                      ) : (
                        <div style={{ fontSize: '13px', color: '#757682' }}>No recent logs.</div>
                      )}
                    </div>
                  </section>
                </div>
              </div>
            </main>
          </div>
        </div>

        {/* ================= LOGOUT CONFIRMATION MODAL ================= */}
        {showLogoutModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(11, 28, 48, 0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#ffdad6', color: '#ba1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>logout</span>
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0b1c30', margin: '0 0 8px 0' }}>End Admin Session?</h2>
              <p style={{ fontSize: '13px', color: '#444651', margin: '0 0 24px 0', lineHeight: 1.5 }}>
                Are you sure you want to log out? You will need to log in again to access admin controls.
              </p>
              <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                <button onClick={() => setShowLogoutModal(false)} style={{ flex: 1, padding: '12px', borderRadius: '8px', backgroundColor: '#eff4ff', color: '#00236f', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>Cancel</button>
                <button onClick={handleLogout} style={{ flex: 1, padding: '12px', borderRadius: '8px', backgroundColor: '#ba1a1a', color: '#ffffff', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>Yes, Log Out</button>
              </div>
            </div>
          </div>
        )}

      </IonContent>
    </IonPage>
  );
};

export default AdminDashboard;