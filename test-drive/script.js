document.addEventListener('DOMContentLoaded', () => {
    const payBtn = document.getElementById('pay-btn');
    const modal = document.getElementById('payment-modal');
    const closeBtn = document.querySelector('.close-btn');
    const qrImage = document.getElementById('qr-image');
    const loadingQr = document.getElementById('loading-qr');
    const BASE_URL = 'http://localhost:3000'; // Ganti ke URL Vercel lu nanti pas udah deploy
    // Initialize Firebase for Real-time listener
    const firebaseConfig = {
      apiKey: "AIzaSyBTcZ2FUbQSErIZ_uOY9Ctt04WCTi3Pnlk",
      authDomain: "pgcla1.firebaseapp.com",
      projectId: "pgcla1",
      databaseURL: "https://pgcla1-default-rtdb.asia-southeast1.firebasedatabase.app"
    };
    firebase.initializeApp(firebaseConfig);
    const database = firebase.database();
    let statusUnsub = null;

    payBtn.addEventListener('click', async () => {
        const apiKey = document.getElementById('apiKey').value;
        const amount = document.getElementById('amount').value;

        if (!apiKey) return alert("Masukin API Key lu dulu, bos!");
        if (!amount || amount < 100) return alert("Minimal nominal Rp 100 ya.");

        payBtn.innerText = "NEMBAK API...";
        payBtn.disabled = true;
        
        try {
            const response = await fetch(`${BASE_URL}/api/v1/payment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': apiKey
                },
                body: JSON.stringify({
                    amount: parseInt(amount),
                    referenceNo: 'TEST-' + Date.now()
                })
            });

            const data = await response.json();

            if (data.status === 'success') {
                const trxId = data.transactionId;

                // Tampilkan Modal
                modal.classList.remove('hidden');
                document.getElementById('display-merchant-amount').innerText = `Rp ${data.merchantAmount.toLocaleString('id-ID')}`;
                document.getElementById('display-fee').innerText = `Rp ${data.adminFee.toLocaleString('id-ID')}`;
                document.getElementById('display-amount').innerText = `Rp ${data.totalAmount.toLocaleString('id-ID')}`;
                document.getElementById('display-trxid').innerText = trxId;

                // Reset Status Text
                const statusTitle = document.querySelector('.modal-content h3');
                const statusText = document.querySelector('.status-text');
                statusTitle.innerText = "Scan buat Bayar QRIS 📱";
                statusText.innerText = "MENUNGGU PEMBAYARAN...";
                statusText.style.color = "inherit";

                // Generate QRIS Image via Public API
                const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(data.qrContent)}`;
                qrImage.src = qrUrl;
                qrImage.onload = () => {
                    loadingQr.style.display = 'none';
                };

                // 🔥 REAL-TIME LISTENER (LISTEN FOR PAID STATUS)
                if (statusUnsub) statusUnsub(); // Cleanup previous listener
                const trxRef = database.ref(`transactions/${trxId}/status`);
                statusUnsub = trxRef.on('value', (snapshot) => {
                    if (snapshot.val() === 'PAID') {
                        statusTitle.innerText = "PEMBAYARAN SUKSES! ✅";
                        statusText.innerText = "SIPE! Saldo Merchant Lu Udah Nambah.";
                        statusText.style.color = "var(--secondary-color)";
                        statusText.style.fontWeight = "bold";
                        qrImage.style.filter = "grayscale(100%) opacity(0.3)";
                    }
                });

            } else {
                alert("Eror: " + (data.message || 'Gagal generate QRIS'));
            }
        } catch (err) {
            console.error(err);
            alert("Gagal konek ke backend! Pastiin backend lu udah live atau local nyala.");
        } finally {
            payBtn.innerText = "BAYAR SEKARANG 💳";
            payBtn.disabled = false;
        }
    });

    closeBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
        qrImage.src = "";
        qrImage.style.filter = "none";
        loadingQr.style.display = 'block';
        if (statusUnsub) {
            database.ref().off(); // Stop listening
            statusUnsub = null;
        }
    });
});
