import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div id="landing-page" className="page" style={{ display: 'flex', flexDirection: 'column', width: '100vw' }}>
      <nav className="lp-nav" style={{ width: '100%' }}>
        <div className="logo">VENNPAY</div>
        <div>
          <Link to="/login" className="btn-brutal" style={{ textDecoration: 'none' }}>Login</Link>
        </div>
      </nav>
      
      <header className="hero" style={{ width: '100%', flexGrow: 1 }}>
        <h1 className="hero-title">Terima Pembayaran Nggak Pake Ribet.</h1>
        <p className="hero-subtitle">Vennpay bikin urusan terima bayaran lewat QRIS buat warung, game, atau website lu jadi segampang mabar.</p>
        <Link to="/login" className="btn-brutal btn-primary" style={{ fontSize: '1.5rem', padding: '1rem 2rem', textDecoration: 'none' }}>Mulai Sekarang 🚀</Link>
      </header>
    </div>
  );
}
