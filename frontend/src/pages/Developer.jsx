import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { auth, db } from '../firebase';
import { ref, onValue } from 'firebase/database';
import { onAuthStateChanged } from 'firebase/auth';

export default function Developer() {
  const [user, setUser] = useState(null);
  const [apiKey, setApiKey] = useState('Memuat...');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [savingMsg, setSavingMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const userRef = ref(db, `users/${currentUser.uid}`);
        onValue(userRef, (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.val();
            setApiKey(data.apiKey || 'Belum ada API Key');
            setWebhookUrl(data.webhookUrl || '');
          }
        });
      } else {
        navigate('/login');
      }
    });
    return () => unsubAuth();
  }, [navigate]);

  const handleSaveWebhook = async () => {
    setSavingMsg('Menyimpan...');
    setIsSaving(true);
    const token = await user.getIdToken();
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      await fetch(`${API_URL}/api/user/webhook`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ webhookUrl })
      });
      setSavingMsg('Tersimpan! ✅');
      setTimeout(() => setSavingMsg(''), 3000);
    } catch (e) {
      setSavingMsg('Gagal nyimpen!');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRefreshKey = async () => {
    setIsRefreshing(true);
    try {
      const user = auth.currentUser;
      if (!user) return alert("Sesi abis, login ulang bos!");
      const token = await user.getIdToken();
      
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${API_URL}/api/user/refresh_api`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}` 
        }
      });
      
      if (!res.ok) throw new Error("Server Backend Vennpay lu mati atau eror ngab!");
      
      setSavingMsg('API Key diperbarui! ✨');
      setTimeout(() => setSavingMsg(''), 3000);
    } catch (e) {
      alert("Gagal refresh key: " + e.message + "\n\nPastikan lu udah ngetik 'npm run dev' di folder backend ya!");
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!user) return <div style={{padding:'2rem'}}>Loading...</div>;

  return (
    <div id="dashboard-layout" className="page">
      <Sidebar />
      <main>
        <section className="view active">
          <h2>Pengaturan Developer</h2>
          <div className="card" style={{ marginTop: '2rem' }}>
              <h3>API Key Vennpay Lu</h3>
              <p>Gunakan API Key ini di backend lu buat nge-hit layanan Sanpay via Vennpay.</p>
              <div style={{ background: '#000', color: '#0f0', padding: '1rem', fontFamily: 'monospace', margin: '1rem 0', fontWeight: 'bold', letterSpacing: '2px', wordBreak: 'break-all' }}>
                  {apiKey}
              </div>
              <button className="btn-brutal" onClick={handleRefreshKey} disabled={isRefreshing} style={{ opacity: isRefreshing ? 0.7 : 1, cursor: isRefreshing ? 'not-allowed' : 'pointer' }}>
                {isRefreshing ? '🔄 MEMROSES...' : '🔄 Generate Baru'}
              </button>

              <h3 style={{ marginTop: '2rem' }}>URL Webhook (Callback)</h3>
              <p>URL backend lu yang bakal di hit sama Vennpay pas pembayarannya lunas.</p>
              <br />
              <input 
                type="text" 
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://serverlu.com/callback"
                style={{ width: '100%', padding: '0.75rem', border: '4px solid #101010', fontSize: '1rem', fontFamily: "'Space Grotesk'" }} 
              />
              <br /><br />
              <button className="btn-brutal btn-primary" onClick={handleSaveWebhook} disabled={isSaving} style={{ opacity: isSaving ? 0.7 : 1, cursor: isSaving ? 'not-allowed' : 'pointer' }}>
                {isSaving ? 'YANG SABAR...' : 'Simpan Webhook'}
              </button>
              {savingMsg && <span style={{marginLeft: '1rem', fontWeight: 'bold'}}>{savingMsg}</span>}
          </div>
        </section>
      </main>
    </div>
  );
}
