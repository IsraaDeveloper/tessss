import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { auth, db } from '../firebase';
import { ref, onValue } from 'firebase/database';
import { onAuthStateChanged } from 'firebase/auth';

export default function Mutasi() {
  const [user, setUser] = useState(null);
  const [mutations, setMutations] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Ambil data transaksi
        const trxRef = ref(db, 'transactions');
        onValue(trxRef, (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.val();
            const arr = Object.keys(data)
              .map(id => ({ id, ...data[id] }))
              .filter(t => t.uid === currentUser.uid)
              .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            setMutations(arr);
          }
          setLoading(false);
        });
      } else {
        navigate('/login');
      }
    });
    return () => unsubAuth();
  }, [navigate]);

  if (loading) return <div style={{ padding: '2rem' }}>Memuat Mutasi...</div>;

  return (
    <div id="dashboard-layout" className="page">
      <Sidebar />
      <main>
        <section className="view active">
          <div className="header">
            <h2>Semua Riwayat Mutasi</h2>
            <p>Daftar lengkap uang keluar dan masuk via Vennpay.</p>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th>Kode TRX</th>
                  <th>Nominal</th>
                  <th>Tipe</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {mutations.length === 0 ? (
                  <tr><td colSpan="5" style={{ textAlign: 'center' }}>Belum ada mutasi terdeteksi.</td></tr>
                ) : null}
                {mutations.map(m => (
                  <tr key={m.id}>
                    <td>{new Date(m.createdAt).toLocaleString('id-ID')}</td>
                    <td>{m.id}</td>
                    <td style={{ color: m.status === 'PAID' ? 'var(--secondary-color)' : 'var(--text-dark)', fontWeight: 'bold' }}>
                      {m.status === 'PAID' ? '+' : ''} Rp {(m.merchantAmount || m.amount || 0).toLocaleString('id-ID')}
                    </td>
                    <td>{m.type}</td>
                    <td>
                        <span className={`badge ${m.status === 'PAID' ? 'paid' : 'pending'}`}>{m.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
