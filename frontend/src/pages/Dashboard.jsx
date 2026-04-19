import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { auth, db } from '../firebase';
import { ref, onValue } from 'firebase/database';
import { onAuthStateChanged } from 'firebase/auth';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [merchantData, setMerchantData] = useState({ balance: 0 });
  const [recentTrx, setRecentTrx] = useState([]);
  const [showWdModal, setShowWdModal] = useState(false);
  const [wdFee, setWdFee] = useState(0);
  const [wdForm, setWdForm] = useState({
      amount: '',
      name: '',
      number: '',
      method: 'DANA'
  });
  const navigate = useNavigate();

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Listen to balance
        const userRef = ref(db, `users/${currentUser.uid}`);
        onValue(userRef, (snapshot) => {
          if (snapshot.exists()) {
            setMerchantData(snapshot.val());
          }
        });

        // Listen to WD Fee
        onValue(ref(db, 'settings/wd_fee'), (s) => {
            if (s.exists()) setWdFee(s.val());
        });

        // Listen to recent TRX
        const trxRef = ref(db, `transactions`);
        onValue(trxRef, (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.val();
            const arr = Object.keys(data)
              .map(id => ({ id, ...data[id] }))
              .filter(t => t.uid === currentUser.uid)
              .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))
              .slice(0, 5); 
            setRecentTrx(arr);
          }
        });

      } else {
        navigate('/login');
      }
    });

    return () => unsubAuth();
  }, [navigate]);

  const handleSubmitWithdraw = async (e) => {
      e.preventDefault();
      const amountNum = parseInt(wdForm.amount);
      
      if (amountNum < 50000) return alert("Minimal penarikan Rp 50.000");
      if (amountNum > merchantData.balance) return alert("Saldo lu kagak cukup bos!");
      if (!wdForm.name || !wdForm.number) return alert("Isi semua data dulu ngab!");

      try {
          const { push, set, ref: dbRef } = await import('firebase/database');
          const wdKey = `WD-${Date.now()}`;
          const newWdRef = dbRef(db, `withdrawals/${wdKey}`);
          
          await set(newWdRef, {
              uid: user.uid,
              email: user.email,
              amount: amountNum,
              fee: wdFee,
              name: wdForm.name,
              number: wdForm.number,
              method: wdForm.method,
              target: `${wdForm.method} - ${wdForm.number} (${wdForm.name})`,
              status: 'PENDING',
              createdAt: new Date().toISOString()
          });
          
          alert("Permintaan Tarik Saldo Berhasil Dikirim! ✅");
          setShowWdModal(false);
          setWdForm({ amount: '', name: '', number: '', method: 'DANA' });
      } catch (err) {
          alert("Gagal kirim permintaan: " + err.message);
      }
  };

  if (!user) return <div style={{padding:'2rem'}}>Loading...</div>;

  return (
    <div id="dashboard-layout" className="page">
      <Sidebar />
      <main>
        <section className="view active">
          <div className="header">
            <div>
              <h2>Halo, <span>{user.email}</span>! 👋</h2>
              <p>Selamat datang di dashboard Vennpay kamu.</p>
            </div>
          </div>

          <div className="card stat-box" style={{ marginBottom: '3rem' }}>
            <span className="title">Total Saldo Aktif</span>
            <span className="value">Rp {merchantData.balance.toLocaleString('id-ID')}</span>
            <div style={{ marginTop: '1.5rem' }}>
                <button className="btn-brutal btn-secondary" onClick={() => setShowWdModal(true)}>TARIK SALDO</button>
            </div>
          </div>

          {/* WD MODAL */}
          {showWdModal && (
              <div className="modal-overlay">
                  <div className="modal-content">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3 style={{ margin: 0 }}>Tarik Saldo 💸</h3>
                        <button onClick={() => setShowWdModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', fontWeight: 'bold' }}>&times;</button>
                      </div>
                      
                      <form onSubmit={handleSubmitWithdraw}>
                          <div className="form-group">
                              <label>Nominal (Min Rp 50.000)</label>
                              <input type="number" value={wdForm.amount} onChange={(e) => setWdForm({...wdForm, amount: e.target.value})} placeholder="Contoh: 100000" required />
                          </div>

                          <div className="form-group">
                              <label>Metode E-Money</label>
                              <select value={wdForm.method} onChange={(e) => setWdForm({...wdForm, method: e.target.value})}>
                                  <option value="DANA">DANA</option>
                                  <option value="OVO">OVO</option>
                                  <option value="GOPAY">GOPAY</option>
                              </select>
                          </div>

                          <div className="form-group">
                              <label>Nama Sesuai Aplikasi</label>
                              <input type="text" value={wdForm.name} onChange={(e) => setWdForm({...wdForm, name: e.target.value})} placeholder="Nama lu di DANA/OVO/GOPAY" required />
                          </div>

                          <div className="form-group">
                              <label>Nomor HP / Akun</label>
                              <input type="text" value={wdForm.number} onChange={(e) => setWdForm({...wdForm, number: e.target.value})} placeholder="Contoh: 0812xxxxxx" required />
                          </div>

                          <div style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '1.5rem' }}>
                              *Biaya admin penarikan: <strong>Rp {wdFee.toLocaleString('id-ID')}</strong> (otomatis potong saldo)
                          </div>

                          <button type="submit" className="btn-brutal btn-primary" style={{ width: '100%' }}>Kirim Permintaan WD</button>
                      </form>
                  </div>
              </div>
          )}

          <h3 style={{ marginBottom: '1.5rem' }}>Transaksi Terbaru (QRIS)</h3>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Kode TRX</th>
                  <th>Tipe</th>
                  <th>Nominal</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentTrx.length === 0 ? (
                  <tr><td colSpan="4" style={{textAlign: 'center'}}>Belum ada transaksi</td></tr>
                ) : null}
                {recentTrx.map(trx => (
                  <tr key={trx.id}>
                    <td>{trx.id}</td>
                    <td>{trx.type}</td>
                    <td>Rp {(trx.merchantAmount || trx.amount || 0).toLocaleString('id-ID')}</td>
                    <td><span className={`badge ${trx.status === 'PAID' ? 'paid' : 'pending'}`}>{trx.status}</span></td>
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
