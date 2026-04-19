import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { auth, db } from '../firebase';
import { ref, onValue } from 'firebase/database';
import { onAuthStateChanged } from 'firebase/auth';

export default function Admin() {
  const [isAdmin, setIsAdmin] = useState(null);
  const [withdrawals, setWithdrawals] = useState([]); // <--- Ini yang bikin blank tadi ngab!
  const [fee, setFee] = useState(1000);
  const [feeType, setFeeType] = useState('flat');
  const [wdFee, setWdFee] = useState(1500);
  const [wdFeeType, setWdFeeType] = useState('flat');
  const [loadingWD, setLoadingWD] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        const userRef = ref(db, `users/${currentUser.uid}/role`);
        
        const timeout = setTimeout(() => {
            if (isAdmin === null) {
                setIsAdmin(false);
                navigate('/dashboard');
            }
        }, 5000);

        onValue(userRef, (snapshot) => {
          clearTimeout(timeout);
          if (snapshot.exists() && snapshot.val() === 'admin') {
            setIsAdmin(true);
            
            // Ambil data Fee Global
            onValue(ref(db, 'settings/fee'), (s) => {
                if (s.exists()) {
                    const val = s.val();
                    if (typeof val === 'object') {
                        setFee(val.value);
                        setFeeType(val.type);
                    } else {
                        setFee(val);
                        setFeeType('flat');
                    }
                }
            });
            onValue(ref(db, 'settings/wd_fee'), (s) => {
                if (s.exists()) {
                    const val = s.val();
                    if (typeof val === 'object') {
                        setWdFee(val.value);
                        setWdFeeType(val.type);
                    } else {
                        setWdFee(val);
                        setWdFeeType('flat');
                    }
                }
            });

            // Ambil data Withdrawals
            onValue(ref(db, 'withdrawals'), (s) => {
                if (s.exists()) {
                    const data = s.val();
                    setWithdrawals(Object.keys(data).map(id => ({ id, ...data[id] })).reverse());
                }
                setLoadingWD(false);
            });

          } else {
            setIsAdmin(false);
            navigate('/dashboard'); 
          }
        }, (err) => {
          clearTimeout(timeout);
          setIsAdmin(false);
          navigate('/dashboard');
        });
      } else {
        navigate('/login');
      }
    });

    return () => unsubAuth();
  }, [navigate, isAdmin]);

  const handleSaveSettings = async () => {
      try {
          const { update } = await import('firebase/database');
          await update(ref(db), {
              'settings/fee': { value: parseFloat(fee), type: feeType },
              'settings/wd_fee': { value: parseFloat(wdFee), type: wdFeeType }
          });
          alert("Pengaturan Berhasil Disimpan! ✅");
      } catch (e) { alert("Gagal update pengaturan"); }
  };

  const handleApprove = async (wd) => {
      if (wd.status !== 'PENDING') return;
      if (!confirm(`Setujui penarikan Rp ${wd.amount.toLocaleString()} untuk ${wd.email}?`)) return;

      try {
          const { get, update } = await import('firebase/database');
          
          // 1. Ambil saldo user terbaru
          const userSnap = await get(ref(db, `users/${wd.uid}`));
          if (!userSnap.exists()) return alert("User tidak ditemukan");
          
          const userData = userSnap.val();
          if (userData.balance < wd.amount) return alert("Saldo user tidak mencukupi (mungkin sudah berkurang)");

          // 2. Eksekusi: Potong saldo & Update status WD
          const updates = {};
          updates[`users/${wd.uid}/balance`] = userData.balance - wd.amount;
          updates[`withdrawals/${wd.id}/status`] = 'SUCCESS';
          updates[`withdrawals/${wd.id}/processedAt`] = new Date().toISOString();
          
          // 3. Catat di transaksi (Mutasi)
          const trxKey = `TRX-OUT-${Date.now()}`;
          updates[`transactions/${trxKey}`] = {
              uid: wd.uid,
              amount: wd.amount,
              type: 'Penarikan Saldo',
              status: 'PAID',
              createdAt: new Date().toISOString()
          };

          await update(ref(db), updates);
          alert("Penarikan berhasil disetujui & saldo user telah dipotong!");
      } catch (e) {
          alert("Eror: " + e.message);
      }
  };

  if (isAdmin === null) return (
    <div style={{padding:'4rem', textAlign:'center'}}>
        <h2 style={{fontFamily:'Space Grotesk'}}>MEMERIKSA OTORITAS...</h2>
        <p>Pastikan koneksi internet lu stabil dan database URL udah bener.</p>
    </div>
  );
  if (!isAdmin) return null;

  return (
    <div id="dashboard-layout" className="page">
      <Sidebar />
      <main>
        <section className="view active">
          <div className="header">
            <div>
              <h2>Panel Penguasa (Admin) 😎</h2>
              <p>Kelola ekosistem Vennpay lu di sini.</p>
            </div>
          </div>
          
          <div className="card" style={{ marginTop: '2rem' }}>
              <h3>🔧 Pengaturan Sistem</h3>
              <p>Atur potongan biaya tiap transaksi dan penarikan saldo.</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '2rem' }}>
                <div>
                    <label style={{ fontWeight: 'bold' }}>Fee QRIS (Profit Lu)</label><br />
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.5rem' }}>
                        <select 
                            value={feeType} 
                            onChange={(e) => setFeeType(e.target.value)}
                            style={{ width: 'auto', minWidth: '120px', padding: '0.8rem', borderRadius: '0', border: '3px solid black', fontWeight: 'bold', cursor: 'pointer', background: '#e2e8f0' }}
                        >
                            <option value="flat">Rp (Flat)</option>
                            <option value="percent">% (Percent)</option>
                        </select>
                        <input 
                            type="number" 
                            step="0.01"
                            value={fee} 
                            onChange={(e) => setFee(e.target.value)} 
                            style={{ flex: 1, padding: '0.8rem' }}
                        />
                    </div>
                </div>

                <div>
                    <label style={{ fontWeight: 'bold' }}>Fee Withdraw (Per WD)</label><br />
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.5rem' }}>
                        <select 
                            value={wdFeeType} 
                            onChange={(e) => setWdFeeType(e.target.value)}
                            style={{ width: 'auto', minWidth: '120px', padding: '0.8rem', borderRadius: '0', border: '3px solid black', fontWeight: 'bold', cursor: 'pointer', background: '#e2e8f0' }}
                        >
                            <option value="flat">Rp (Flat)</option>
                            <option value="percent">% (Percent)</option>
                        </select>
                        <input 
                            type="number" 
                            step="0.01"
                            value={wdFee} 
                            onChange={(e) => setWdFee(e.target.value)} 
                            style={{ flex: 1, padding: '0.8rem' }}
                        />
                    </div>
                </div>
              </div>

              <br />
              <button className="btn-brutal btn-primary" onClick={handleSaveSettings}>Simpan Semua Pengaturan</button>
          </div>
          
          <div className="card" style={{ marginTop: '2rem' }}>
              <h3>Daftar Withdraw (User)</h3>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Email User</th>
                      <th>Nominal</th>
                      <th>Tujuan</th>
                      <th>Status</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {withdrawals.length === 0 ? (
                        <tr><td colSpan="5" style={{textAlign:'center'}}>Belum ada permintaan penarikan.</td></tr>
                    ) : null}
                    {withdrawals.map(wd => (
                      <tr key={wd.id}>
                        <td>{wd.email}</td>
                        <td>Rp {wd.amount.toLocaleString('id-ID')}</td>
                        <td>{wd.target}</td>
                        <td>
                            <span className={`badge ${wd.status === 'SUCCESS' ? 'paid' : 'pending'}`}>{wd.status}</span>
                        </td>
                        <td>
                            {wd.status === 'PENDING' ? (
                                <button className="badge paid" onClick={() => handleApprove(wd)} style={{ cursor: 'pointer' }}>Setujui</button>
                            ) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
          </div>
        </section>
      </main>
    </div>
  );
}
