import React, { useState, useEffect } from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { collection, onSnapshot } from "firebase/firestore";
import { db } from '../firebase'; 
import logoImage from '../assets/logo.png';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Reports: React.FC = () => {
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // --- RESPONSIVE STATES ---
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // --- FIREBASE STATES ---
  const [allRequests, setAllRequests] = useState<any[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 1024;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);

    const unsubscribe = onSnapshot(collection(db, "requests"), (snapshot) => {
      let pending = 0;
      const requestsData: any[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.status === 'Pending') pending++;
        requestsData.push({ id: doc.id, ...data });
      });

      requestsData.sort((a, b) => {
        const dateA = new Date(a.dateFiled).getTime() || 0;
        const dateB = new Date(b.dateFiled).getTime() || 0;
        return dateB - dateA;
      });

      setAllRequests(requestsData);
      setPendingCount(pending);
      setIsLoading(false);
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      unsubscribe();
    };
  }, []);

  // ✅ INAYOS ANG LOGOUT (localStorage)
  const handleLogout = () => {
    localStorage.removeItem('isStaffLoggedIn');
    localStorage.removeItem('staffName');
    window.location.href = '/staff-login';
  };

  const navigateTo = (path: string) => {
    window.location.href = path;
  };

  // ==========================================
  // 🛠️ HELPER FUNCTION PARA SA REVENUE COMPUTATION
  // Kinukuha ang amountPaid, kung wala, kukunin ang fee string at iconvert sa number
  // ==========================================
  const getRevenueAmount = (req: any) => {
    // 1. Kung may amountPaid (number), gamitin ito
    if (req.amountPaid && !isNaN(Number(req.amountPaid))) {
      return Number(req.amountPaid);
    }
    // 2. Kung wala, kunin ang fee string (e.g. "₱150.00"), alisin ang ₱ at comma, at i-convert
    if (req.fee) {
      const cleanFee = String(req.fee).replace(/[^0-9.-]+/g, "");
      return Number(cleanFee) || 0;
    }
    return 0;
  };

  // ==========================================
  // ACCURATE CALCULATIONS
  // ==========================================
  const totalRequests = allRequests.length;
  let totalRevenue = 0;

  allRequests.forEach(req => {
    // ✅ Automatic na mabibilang basta 'Released' (bayad na)
    if (req.status === 'Released') {
      totalRevenue += getRevenueAmount(req);
    }
  });

  const completedCount = allRequests.filter(r => r.status === 'Released').length;
  const processingCount = allRequests.filter(r => r.status === 'Under Review' || r.status === 'Approved').length;
  const readyCount = allRequests.filter(r => r.status === 'Ready for Release').length;
  const rejectedCount = allRequests.filter(r => r.status === 'Rejected').length;

  const completedPercent = totalRequests > 0 ? Math.round((completedCount / totalRequests) * 100) : 0;
  const processingPercent = totalRequests > 0 ? Math.round((processingCount / totalRequests) * 100) : 0;
  const readyPercent = totalRequests > 0 ? Math.round((readyCount / totalRequests) * 100) : 0;

  const docTypes: Record<string, { total: number, approved: number, rejected: number, revenue: number }> = {};
  allRequests.forEach(req => {
    const docName = req.documentType || 'Unknown';
    if (!docTypes[docName]) {
      docTypes[docName] = { total: 0, approved: 0, rejected: 0, revenue: 0 };
    }
    docTypes[docName].total++;
    if (req.status === 'Released') {
      docTypes[docName].approved++;
      // ✅ Same logic para sa per-document type na revenue
      docTypes[docName].revenue += getRevenueAmount(req);
    } else if (req.status === 'Rejected') {
      docTypes[docName].rejected++;
    }
  });

  const docTypeData = Object.keys(docTypes).map(key => ({
    name: key,
    ...docTypes[key]
  })).sort((a, b) => b.total - a.total);

  // ==========================================
  // DOWNLOAD / EXPORT / PRINT HANDLERS
  // ==========================================

  const handleExportCSV = () => {
    if (allRequests.length === 0) {
      alert("Wala pang data na pwedeng i-export.");
      return;
    }

    const headers = ["Reference No", "Resident Name", "Document Type", "Date Filed", "Amount Paid", "Status"];
    
    const rows = allRequests.map(req => [
      req.refNo || '',
      `"${req.residentName || ''}"`,
      req.documentType || '',
      req.dateFiled || '',
      getRevenueAmount(req), // 👈 Ginamit ang helper para accurate ang lalabas
      req.status || ''
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Transaction_Report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPDF = () => {
    if (allRequests.length === 0) {
      alert("Wala pang data na pwedeng i-download.");
      return;
    }

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Barangay Malinao', pageWidth / 2, 15, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Official Transaction Report', pageWidth / 2, 22, { align: 'center' });
    
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth / 2, 28, { align: 'center' });

    doc.setTextColor(0);
    doc.setFontSize(10);
    doc.text(`Total Requests: ${totalRequests}`, 14, 38);
    doc.text(`Completed: ${completedCount}`, 80, 38);
    doc.text(`Total Revenue: PHP ${totalRevenue.toLocaleString()}`, 140, 38);

    autoTable(doc, {
      startY: 44,
      head: [['Ref No.', 'Resident Name', 'Document Type', 'Date Filed', 'Amount', 'Status']],
      body: allRequests.map(req => [
        req.refNo || '',
        req.residentName || '',
        req.documentType || '',
        req.dateFiled || '',
        `PHP ${getRevenueAmount(req)}`, // 👈 Accurate na value sa PDF
        req.status || ''
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 249, 255] },
      margin: { left: 14, right: 14 }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 20;
    if (finalY < doc.internal.pageSize.getHeight() - 20) {
      doc.setFontSize(10);
      doc.text('_________________________', pageWidth - 80, finalY);
      doc.text('Authorized Signature', pageWidth - 80, finalY + 6);
    }

    doc.save(`Transaction_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handlePrint = () => {
    if (allRequests.length === 0) {
      alert("Wala pang data na pwedeng i-print.");
      return;
    }
    window.print();
  };

  return (
    <IonPage>
      <IonContent className="bg-surface">
        
        <style>
          {`
            @media print {
              body, html { background-color: #ffffff !important; }
              .no-print { display: none !important; }
              .print-area { 
                display: block !important; 
                width: 100% !important; 
                margin: 0 !important; 
                padding: 0 !important; 
              }
              @page { margin: 15mm; }
            }
          `}
        </style>

        {/* ================= UI (HINDI IPI-PRINT) ================= */}
        <div className="no-print" style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8f9ff', fontFamily: "'Public Sans', sans-serif", color: '#0b1c30', overflow: 'hidden' }}>

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
                <div onClick={() => { navigateTo('/staff-requests'); setSidebarOpen(false); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px', borderRadius: '8px', color: '#444651', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>description</span>
                    <span style={{ fontSize: '14px' }}>Document Requests</span>
                  </div>
                  {pendingCount > 0 && (
                    <span style={{ backgroundColor: '#ffdcc3', color: '#2f1500', fontSize: '11px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '12px' }}>{pendingCount}</span>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', borderRadius: '8px', backgroundColor: '#1e3a8a', color: '#ffffff', cursor: 'pointer' }}>
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
              <button
                onClick={() => setShowLogoutModal(true)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '8px', borderRadius: '8px', backgroundColor: '#ffffff', color: '#444651', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', border: 'none' }}
              >
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
                {!isMobile && <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#0b1c30' }}>Reports & Analytics</span>}
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

                {/* TITLE SECTION NA MAY TATLONG BUTTONS */}
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
                    <span style={{ color: '#0b1c30' }}>ANALYTICS</span>
                  </div>
                  <h1 style={{ fontSize: isMobile ? '22px' : '26px', fontWeight: 'bold', color: '#0b1c30', margin: 0 }}>Reports & Analytics</h1>
                  <p style={{ fontSize: '14px', color: '#444651', margin: 0 }}>Statistical reporting, issuance metrics, and revenue reconciliation.</p>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: isMobile ? '100%' : 'auto', marginTop: '12px', flexWrap: 'wrap' }}>
                    
                    <button onClick={handleDownloadPDF} style={{ flex: isMobile ? 1 : 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px 16px', borderRadius: '8px', backgroundColor: '#ffffff', border: '1px solid #e5eeff', color: '#444651', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px', minWidth: isMobile ? 'auto' : '140px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#dc2626' }}>picture_as_pdf</span>
                      <span>Download PDF</span>
                    </button>

                    <button onClick={handleExportCSV} style={{ flex: isMobile ? 1 : 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px 16px', borderRadius: '8px', backgroundColor: '#1e3a8a', color: '#ffffff', fontWeight: 'bold', border: 'none', cursor: 'pointer', fontSize: '13px', minWidth: isMobile ? 'auto' : '140px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>download</span>
                      <span>Export CSV</span>
                    </button>

                    <button onClick={handlePrint} style={{ flex: isMobile ? 1 : 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px 16px', borderRadius: '8px', backgroundColor: '#ffffff', border: '1px solid #e5eeff', color: '#444651', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px', minWidth: isMobile ? 'auto' : '120px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#1e3a8a' }}>print</span>
                      <span>Print</span>
                    </button>

                  </div>
                </section>

                {/* KPI Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: '16px' }}>
                  <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', border: '1px solid #eff4ff' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#757682', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Requests</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                      <span style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: 'bold', color: '#1e3a8a' }}>{isLoading ? '...' : totalRequests}</span>
                    </div>
                  </div>
                  <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', border: '1px solid #eff4ff' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#757682', textTransform: 'uppercase', letterSpacing: '0.05em' }}>SLA Rate (Completed)</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                      <span style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: 'bold', color: '#15803d' }}>{isLoading ? '...' : `${completedPercent}%`}</span>
                    </div>
                  </div>
                  <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', border: '1px solid #eff4ff' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#757682', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Revenue</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                      {/* ✅ ACCURATE NA ANG TOTAL REVENUE DITO */}
                      <span style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: 'bold', color: '#1e3a8a' }}>₱{isLoading ? '...' : totalRevenue.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Status Distribution */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '24px' }}>
                  
                  <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', border: '1px solid #eff4ff' }}>
                    <div style={{ marginBottom: '16px' }}>
                      <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#0b1c30', margin: 0 }}>Requests by Status</h2>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 600 }}>Completed (Released)</span>
                          <span style={{ fontWeight: 'bold' }}>{completedPercent}% ({completedCount})</span>
                        </div>
                        <div style={{ width: '100%', backgroundColor: '#f3f4f6', borderRadius: '4px', height: '8px' }}>
                          <div style={{ width: `${completedPercent}%`, backgroundColor: '#22c55e', height: '100%', borderRadius: '4px' }}></div>
                        </div>
                      </div>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 600 }}>Processing</span>
                          <span style={{ fontWeight: 'bold' }}>{processingPercent}% ({processingCount})</span>
                        </div>
                        <div style={{ width: '100%', backgroundColor: '#f3f4f6', borderRadius: '4px', height: '8px' }}>
                          <div style={{ width: `${processingPercent}%`, backgroundColor: '#60a5fa', height: '100%', borderRadius: '4px' }}></div>
                        </div>
                      </div>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 600 }}>Ready for Release</span>
                          <span style={{ fontWeight: 'bold' }}>{readyPercent}% ({readyCount})</span>
                        </div>
                        <div style={{ width: '100%', backgroundColor: '#f3f4f6', borderRadius: '4px', height: '8px' }}>
                          <div style={{ width: `${readyPercent}%`, backgroundColor: '#facc15', height: '100%', borderRadius: '4px' }}></div>
                        </div>
                      </div>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 600 }}>Rejected</span>
                          <span style={{ fontWeight: 'bold' }}>{rejectedCount} ({totalRequests > 0 ? Math.round((rejectedCount/totalRequests)*100) : 0}%)</span>
                        </div>
                        <div style={{ width: '100%', backgroundColor: '#f3f4f6', borderRadius: '4px', height: '8px' }}>
                          <div style={{ width: `${totalRequests > 0 ? (rejectedCount/totalRequests)*100 : 0}%`, backgroundColor: '#ef4444', height: '100%', borderRadius: '4px' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Purok Distribution */}
                  <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', border: '1px solid #eff4ff' }}>
                    <div style={{ marginBottom: '16px' }}>
                      <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#0b1c30', margin: 0 }}>Purok Distribution</h2>
                      <p style={{ fontSize: '11px', color: '#757682', margin: '2px 0 0 0' }}>(Top Puroks)</p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ width: '80px', fontSize: '12px', fontWeight: 600 }}>Purok 1</span>
                        <div style={{ flex: 1, backgroundColor: '#f3f4f6', borderRadius: '4px', height: '8px' }}>
                          <div style={{ width: '50%', backgroundColor: '#1e3a8a', height: '100%', borderRadius: '4px' }}></div>
                        </div>
                        <span style={{ fontSize: '11px', fontFamily: 'monospace' }}>Data Soon</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ width: '80px', fontSize: '12px', fontWeight: 600 }}>Purok 2</span>
                        <div style={{ flex: 1, backgroundColor: '#f3f4f6', borderRadius: '4px', height: '8px' }}>
                          <div style={{ width: '30%', backgroundColor: '#1e3a8a', height: '100%', borderRadius: '4px' }}></div>
                        </div>
                        <span style={{ fontSize: '11px', fontFamily: 'monospace' }}>Data Soon</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Summary Ledger Table */}
                <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden', border: '1px solid #eff4ff' }}>
                  <div style={{ padding: '16px', backgroundColor: '#f8f9ff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#0b1c30', margin: 0 }}>Summary Ledger</h3>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', minWidth: '800px', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f8f9ff', color: '#757682', textTransform: 'uppercase', fontSize: '11px', fontWeight: 600 }}>
                          <th style={{ padding: '12px 16px' }}>Document Type</th>
                          <th style={{ padding: '12px 16px', textAlign: 'center' }}>Total</th>
                          <th style={{ padding: '12px 16px', textAlign: 'center' }}>Approved</th>
                          <th style={{ padding: '12px 16px', textAlign: 'center' }}>Rejected</th>
                          <th style={{ padding: '12px 16px', textAlign: 'right' }}>Revenue Generated</th>
                        </tr>
                      </thead>
                      <tbody style={{ fontSize: '13px', color: '#0b1c30' }}>
                        {isLoading ? (
                          <tr><td colSpan={5} style={{ padding: '24px', textAlign: 'center' }}>Loading data...</td></tr>
                        ) : docTypeData.length === 0 ? (
                          <tr><td colSpan={5} style={{ padding: '24px', textAlign: 'center' }}>No data available.</td></tr>
                        ) : (
                          docTypeData.map((doc, index) => (
                            <tr key={index} style={{ borderBottom: '1px solid #eff4ff' }}>
                              <td style={{ padding: '12px 16px', fontWeight: 'bold', color: '#1e3a8a' }}>{doc.name}</td>
                              <td style={{ padding: '12px 16px', textAlign: 'center', fontFamily: 'monospace' }}>{doc.total}</td>
                              <td style={{ padding: '12px 16px', textAlign: 'center', fontFamily: 'monospace', color: '#15803d', fontWeight: 'bold' }}>{doc.approved}</td>
                              <td style={{ padding: '12px 16px', textAlign: 'center', fontFamily: 'monospace', color: '#dc2626' }}>{doc.rejected}</td>
                              {/* ✅ ACCURATE NA RIN DITO */}
                              <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold' }}>₱{doc.revenue.toLocaleString()}</td>
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

        {/* ================= PRINT-ONLY AREA ================= */}
        <div className="print-area" style={{ display: 'none', fontFamily: "'Public Sans', sans-serif", color: '#000', backgroundColor: '#fff', padding: '20px' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '30px', borderBottom: '2px solid #000', paddingBottom: '10px' }}>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>Barangay Malinao</h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px' }}>Official Transaction Report</p>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#555' }}>Generated on: {new Date().toLocaleString()}</p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', fontSize: '14px' }}>
            <div><strong>Total Requests:</strong> {totalRequests}</div>
            <div><strong>Completed:</strong> {completedCount}</div>
            <div><strong>Total Revenue:</strong> ₱{totalRevenue.toLocaleString()}</div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '1px solid #000', textAlign: 'left' }}>
                <th style={{ padding: '8px', border: '1px solid #ccc' }}>Ref No.</th>
                <th style={{ padding: '8px', border: '1px solid #ccc' }}>Resident Name</th>
                <th style={{ padding: '8px', border: '1px solid #ccc' }}>Document Type</th>
                <th style={{ padding: '8px', border: '1px solid #ccc' }}>Date Filed</th>
                <th style={{ padding: '8px', border: '1px solid #ccc' }}>Amount</th>
                <th style={{ padding: '8px', border: '1px solid #ccc' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {allRequests.map((req, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #ccc' }}>
                  <td style={{ padding: '8px', border: '1px solid #ccc' }}>{req.refNo}</td>
                  <td style={{ padding: '8px', border: '1px solid #ccc' }}>{req.residentName}</td>
                  <td style={{ padding: '8px', border: '1px solid #ccc' }}>{req.documentType}</td>
                  <td style={{ padding: '8px', border: '1px solid #ccc' }}>{req.dateFiled}</td>
                  {/* ✅ ACCURATE NA RIN SA PRINT */}
                  <td style={{ padding: '8px', border: '1px solid #ccc' }}>₱{getRevenueAmount(req)}</td>
                  <td style={{ padding: '8px', border: '1px solid #ccc' }}>{req.status}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: '40px', textAlign: 'right', fontSize: '12px' }}>
            <p>_________________________</p>
            <p style={{ marginTop: '5px' }}>Authorized Signature</p>
          </div>
        </div>

        {/* LOGOUT MODAL */}
        {showLogoutModal && (
          <div className="no-print" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(11, 28, 48, 0.5)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
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

export default Reports;