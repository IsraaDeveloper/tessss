import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { ref, onValue } from 'firebase/database';
import { onAuthStateChanged } from 'firebase/auth';

export default function Sidebar() {
  const location = useLocation();
  const path = location.pathname;
  const [role, setRole] = useState('merchant');

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        console.log("Checking role for UID:", currentUser.uid);
        const userRef = ref(db, `users/${currentUser.uid}/role`);
        onValue(userRef, (snapshot) => {
          if (snapshot.exists()) {
            console.log("Role detected:", snapshot.val());
            setRole(snapshot.val());
          } else {
            console.warn("Role path not found in DB.");
            setRole('merchant'); // fallback
          }
        }, (err) => {
          console.error("Firebase Read Error (Sidebar):", err.message);
        });
      }
    });
    return () => unsubAuth();
  }, []);

  return (
    <aside>
      <h1>VENNPAY</h1>
      <nav id="nav-container">
        <Link to="/dashboard" className={`nav-link ${path === '/dashboard' ? 'active' : ''}`}>
          <span>🏠</span> Dashboard
        </Link>
        <Link to="/mutasi" className={`nav-link ${path === '/mutasi' ? 'active' : ''}`}>
          <span>📊</span> Mutasi
        </Link>
        <Link to="/developer" className={`nav-link ${path === '/developer' ? 'active' : ''}`}>
          <span>🛠️</span> Developer (API)
        </Link>
        <Link to="/docs" className={`nav-link ${path === '/docs' ? 'active' : ''}`}>
          <span>📚</span> Dokumentasi
        </Link>
        
        {/* Hanya muncul kalau role-nya ADMIN */}
        {role === 'admin' && (
          <Link to="/admin" className={`nav-link ${path === '/admin' ? 'active' : ''}`} style={{ borderLeftColor: '#ef4444' }}>
            <span>🔑</span> Panel Admin
          </Link>
        )}
      </nav>

      <div style={{ marginTop: 'auto' }}>
        <Link to="/" onClick={() => auth.signOut()} className="btn-brutal" style={{ width: '100%', textDecoration: 'none', textAlign: 'center', display: 'inline-block', backgroundColor: '#e2e8f0', color: '#0f172a' }}>
          Logout
        </Link>
      </div>
    </aside>
  );
}
