import { Link } from 'react-router-dom';

export default function Documentation() {
  return (
    <div className="page" style={{ flexDirection: 'column', backgroundColor: '#f0f2f5' }}>
      <nav className="lp-nav" style={{ width: '100%' }}>
        <div className="logo">VENNPAY DOCS</div>
        <div>
          <Link to="/" className="btn-brutal" style={{ textDecoration: 'none' }}>Kembali ke Home</Link>
        </div>
      </nav>

      <main style={{ maxWidth: '1000px', margin: '2rem auto', padding: '2rem' }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>Integrasi API Vennpay</h1>
        <p style={{ fontSize: '1.25rem', color: '#64748b', marginBottom: '3rem' }}>
          Gunakan API Vennpay buat nerima pembayaran QRIS Dinamis di aplikasi lu secara otomatis.
        </p>

        <section className="docs-section">
          <h2>1. Autentikasi</h2>
          <p>Setiap request ke API Vennpay wajib menyertakan **X-API-Key** di bagian Headers. Lu bisa dapetin key ini di halaman Developer dashboard.</p>
          <div className="code-block">
            X-API-Key: VENN-xxxx-xxxx-xxxx-xxxx
          </div>
        </section>

        <section className="docs-section">
          <h2>2. Membuat Pembayaran (Generate QRIS)</h2>
          <p>Gunakan endpoint ini buat dapetin string QRIS yang bisa di-scan user.</p>
          <div className="code-block">
            POST {import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/v1/payment
          </div>
          <p><strong>Payload (JSON):</strong></p>
          <pre className="code-block">
{`{
  "amount": 10000,
  "referenceNo": "ORDER-001"
}`}
          </pre>
          <p><strong>Response:</strong></p>
          <pre className="code-block">
{`{
  "status": "success",
  "transactionId": "TRX-171349...",
  "qrContent": "00020101021226660010ID...",
  "expiresAt": "2024-04-19T..."
}`}
          </pre>
        </section>

        <section className="docs-section">
          <h2>3. Webhook Notifikasi</h2>
          <p>Vennpay bakal nembak URL **Webhook lu** kalo pembayaran udah sukses diproses (PAID).</p>
          <p><strong>Payload yang dikirim Vennpay:</strong></p>
          <pre className="code-block">
{`{
  "status": "PAID",
  "vennpayTrxId": "TRX-1713...",
  "clientReferenceNo": "ORDER-001",
  "amount": 10000
}`}
          </pre>
          <p>Lu harus respon balik dengan HTTP 200 OK.</p>
        </section>
      </main>
    </div>
  );
}
