import React, { useState, useEffect } from 'react';
import { IonApp } from '@ionic/react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase'; 

// --- RESIDENT PAGES ---
import LandingPage from './pages/LandingPage';
import SignupPage from './pages/SignupPage';
import LoginPage from './pages/LoginPage';
import ResidentDashboard from './pages/ResidentDashboard';
import DocumentCatalog from './pages/DocumentCatalog';
import TrackStatus from './pages/TrackStatus';
import TransactionHistory from './pages/TransactionHistory';

// --- ADMIN/STAFF PAGES ---
import AdminLogin from './pages/AdminLogin'; 
import StaffLogin from './pages/StaffLogin';

// --- STAFF PAGES ---
import StaffDashboard from './pages/StaffDashboard'; 
import StaffDocRequest from './pages/StaffDocRequest'; 
import StaffDocType from './pages/StaffDocType'; 
import StaffResident from './pages/StaffResident'; 
import StaffReports from './pages/StaffReports'; 
import StaffTransactionHistory from './pages/StaffTransactionHistory'; 

// --- ADMIN PAGES ---
import AdminDashboard from './pages/AdminDashboard';
import AdminCatalog from './pages/AdminCatalog';
import AdminAuditLogs from './pages/AdminAuditLogs';
import AdminStaff from './pages/AdminStaff';
import AdminSettings from './pages/AdminSettings';

const App: React.FC = () => {
  const [currentPath, setCurrentPath] = useState(window.location.pathname || '/');
  
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [isStaffLoggedIn, setIsStaffLoggedIn] = useState(false);
  
  const [isAuthLoading, setIsAuthLoading] = useState(true); 

  // ✅ VERSION BUSTER PARA MAWALA ANG LUMANG CACHE (SETTINGS)
  useEffect(() => {
    const APP_VERSION = "v1.0.5"; // Binago ko ang version number para mag-trigger
    const savedVersion = localStorage.getItem('appVersion');
    
    if (savedVersion !== APP_VERSION) {
      localStorage.setItem('appVersion', APP_VERSION);
      
      // I-unregister ang lumang Service Worker kung meron
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(function(registrations) {
          for(let registration of registrations) {
            registration.unregister();
          } 
        });
      }
      
      // I-refresh ang page isang beses lang para makuha ang bago
      window.location.reload(); 
    }
  }, []);

  useEffect(() => {
    const handlePopState = () => setCurrentPath(window.location.pathname || '/');
    window.addEventListener('popstate', handlePopState);
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      const storedAdmin = localStorage.getItem('isAdminLoggedIn') === 'true';
      const storedStaff = localStorage.getItem('isStaffLoggedIn') === 'true';
      const storedStaffUid = localStorage.getItem('staffUid');

      if (storedAdmin) {
        setIsAdminLoggedIn(true);
      } else {
        setIsAdminLoggedIn(false);
      }

      if (storedStaff && storedStaffUid) {
        setIsStaffLoggedIn(true);
      } else if (user && storedStaff) {
        setIsStaffLoggedIn(true);
      } else {
        setIsStaffLoggedIn(false);
      }

      setIsAuthLoading(false); 
    });

    return () => {
      window.removeEventListener('popstate', handlePopState);
      unsubscribe(); 
    };
  }, [currentPath]);

  if (isAuthLoading) {
    return (
      <IonApp>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f8f9ff', flexDirection: 'column', gap: '16px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#00236f', animation: 'spin 1s linear infinite' }}>sync</span>
          <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#444651' }}>Checking system security...</span>
          <style>
            {`@keyframes spin { 100% { transform: rotate(360deg); } }`}
          </style>
        </div>
      </IonApp>
    );
  }

  return (
    <IonApp>
      {currentPath === '/signup' ? (
        <SignupPage />
      ) : currentPath === '/login' ? (
        <LoginPage />
      ) : currentPath === '/dashboard' ? (
        <ResidentDashboard />
      ) : currentPath === '/documents' ? (
        <DocumentCatalog />
      ) : currentPath === '/track-status' ? (
        <TrackStatus />
      ) : currentPath === '/history' ? (
        <TransactionHistory />
      
      ) : currentPath === '/admin-login' ? (
        <AdminLogin />
      ) : currentPath === '/staff-login' ? (
        <StaffLogin />
      
      ) : currentPath === '/staff-dashboard' ? (
        isStaffLoggedIn ? <StaffDashboard /> : <StaffLogin />
      ) : currentPath === '/staff-requests' ? (
        isStaffLoggedIn ? <StaffDocRequest /> : <StaffLogin />
      ) : currentPath === '/staff-document-types' ? ( 
        isStaffLoggedIn ? <StaffDocType /> : <StaffLogin />
      ) : currentPath === '/staff-residents' ? ( 
        isStaffLoggedIn ? <StaffResident /> : <StaffLogin />
      ) : currentPath === '/staff-reports' ? ( 
        isStaffLoggedIn ? <StaffReports /> : <StaffLogin />
      ) : currentPath === '/staff-transactions' ? ( 
        isStaffLoggedIn ? <StaffTransactionHistory /> : <StaffLogin />
      
      ) : currentPath === '/admin-dashboard' ? (
        isAdminLoggedIn ? <AdminDashboard /> : <AdminLogin />
      ) : currentPath === '/admin-catalog' ? (
        isAdminLoggedIn ? <AdminCatalog /> : <AdminLogin />
      ) : currentPath === '/admin-audit-logs' ? (
        isAdminLoggedIn ? <AdminAuditLogs /> : <AdminLogin />
      ) : currentPath === '/admin-staff' ? (
        isAdminLoggedIn ? <AdminStaff /> : <AdminLogin />
      ) : currentPath === '/admin-settings' ? (
        isAdminLoggedIn ? <AdminSettings /> : <AdminLogin />
      
      ) : currentPath.startsWith('/staff-') ? (
        isStaffLoggedIn ? <StaffDashboard /> : <StaffLogin />
      ) : currentPath.startsWith('/admin-') ? (
        isAdminLoggedIn ? <AdminDashboard /> : <AdminLogin />
      
      ) : (
        <LandingPage />
      )}
    </IonApp>
  );
};

export default App;