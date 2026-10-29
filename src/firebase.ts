import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCCCinDeuaMlfEH_KAvjg4uJ-fwdkagpJQ",
  authDomain: "barangayeaseapp.firebaseapp.com",
  projectId: "barangayeaseapp",
  storageBucket: "barangayeaseapp.firebasestorage.app",
  messagingSenderId: "374520385926",
  appId: "1:374520385926:web:76e28aebfe3cabbee61c07",
  measurementId: "G-W19JQ5NBW7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth at Firestore
export const auth = getAuth(app);
export const db = getFirestore(app);

// ==========================================
// 🛡️ HELPER FUNCTION PARA SA AUDIT LOGS
// ==========================================
/**
 * Nag-sasave ng action sa audit logs.
 */
export const logAction = async (
  action: string, 
  details: string, 
  type: string = "info",
  userName?: string,
  role?: string
) => {
  try {
    const user = auth.currentUser;
    
    const finalUserName = userName || user?.email || "System";
    const finalRole = role || (user ? "User" : "System");

    // ✅ PINALITAN NG "audit_logs" PARA MAGTUGMA SA DATABASE MO
    await addDoc(collection(db, "audit_logs"), { 
      action: action,
      details: details,
      type: type, 
      timestamp: serverTimestamp(), 
      userName: finalUserName,
      role: finalRole,
      performedBy: user?.email || "System" 
    });
    console.log(`✅ Log saved: ${action} by ${finalUserName}`);
  } catch (error) {
    console.error("❌ Error saving log:", error);
  }
};