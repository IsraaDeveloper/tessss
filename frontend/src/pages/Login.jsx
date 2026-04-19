import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      if (isRegister) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      
      // Jika berhasil login/register, getToken dan Sync ke backend
      const user = auth.currentUser;
      const token = await user.getIdToken();
      
      // Sync ke backend
      const syncUser = async (idToken) => {
        try {
          const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
          await fetch(`${API_URL}/api/user/sync`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${idToken}`
            }
          });
        } catch (e) {
          console.error('User sync failed:', e);
        }
      };
      await syncUser(token);

      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page" style={{ alignItems: 'center', justifyContent: 'center', width: '100vw' }}>
      <form onSubmit={handleSubmit} className="card" style={{ width: '400px', textAlign: 'center' }}>
        <h2 style={{
          fontSize: '2.5rem', fontWeight: 900, background: 'var(--text-dark)', 
          color: 'var(--primary-color)', display: 'inline-block', padding: '0.5rem 1rem', 
          transform: 'rotate(-2deg)', marginBottom: '2rem'
        }}>{isRegister ? 'DAFTAR' : 'LOGIN'}</h2>
        
        <p style={{ marginBottom: '2rem', fontWeight: 600 }}>
          {isRegister ? 'Bikin akun merchant baru' : 'Masuk untuk mulai nrima duit'}
        </p>
        
        {error && <div style={{ background: 'red', color: 'white', padding: '0.5rem', marginBottom: '1rem', fontWeight: 'bold' }}>{error}</div>}

        <div style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
          <label style={{ fontWeight: 'bold' }}>Email</label>
          <input 
            type="email" 
            placeholder="merchant@email.com" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: '100%', padding: '0.75rem', fontFamily: "'Space Grotesk'", border: '4px solid var(--text-dark)', fontSize: '1rem', marginTop: '0.25rem' }} 
            required 
          />
        </div>
        
        <div style={{ textAlign: 'left', marginBottom: '2rem' }}>
          <label style={{ fontWeight: 'bold' }}>Password</label>
          <input 
            type="password" 
            placeholder="RahasisaAja" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', padding: '0.75rem', fontFamily: "'Space Grotesk'", border: '4px solid var(--text-dark)', fontSize: '1rem', marginTop: '0.25rem' }} 
            required
          />
        </div>
        
        <button type="submit" disabled={isLoading} className="btn-brutal btn-primary" style={{ width: '100%', marginBottom: '1rem', opacity: isLoading ? 0.7 : 1, cursor: isLoading ? 'not-allowed' : 'pointer' }}>
          {isLoading ? 'LOADING...' : (isRegister ? 'BUAT AKUN' : 'MASUK')}
        </button>
        
        <p>
          {isRegister ? 'Udah punya akun? ' : 'Belum punya akun? '}
          <button type="button" onClick={() => setIsRegister(!isRegister)} style={{ color: 'var(--text-dark)', fontWeight: 'bold', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Space Grotesk'", textDecoration: 'underline' }}>
            {isRegister ? 'Login sini bos' : 'Daftar sini bos'}
          </button>
        </p>
      </form>
    </div>
  );
}
