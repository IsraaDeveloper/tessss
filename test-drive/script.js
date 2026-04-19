document.addEventListener('DOMContentLoaded', () => {
    const payBtn = document.getElementById('pay-btn');
    const modal = document.getElementById('payment-modal');
    const closeBtn = document.querySelector('.close-btn');
    const qrImage = document.getElementById('qr-image');
    const loadingQr = document.getElementById('loading-qr');
    const BASE_URL = 'http://localhost:3000'; // Ganti ke URL Vercel lu nanti pas udah deploy
    
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
                // Tampilkan Modal
                modal.classList.remove('hidden');
                document.getElementById('display-merchant-amount').innerText = `Rp ${data.merchantAmount.toLocaleString('id-ID')}`;
                document.getElementById('display-fee').innerText = `Rp ${data.adminFee.toLocaleString('id-ID')}`;
                document.getElementById('display-amount').innerText = `Rp ${data.totalAmount.toLocaleString('id-ID')}`;
                document.getElementById('display-trxid').innerText = data.transactionId;

                // Generate QRIS Image via Public API
                const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(data.qrContent)}`;
                qrImage.src = qrUrl;
                qrImage.onload = () => {
                    loadingQr.style.display = 'none';
                };
            } else {
                alert("Eror: " + (data.message || 'Gagal generate QRIS'));
            }
        } catch (err) {
            console.error(err);
            alert("Gagal konek ke backend! Pastiin server lu di localhost:3000 udah nyala.");
        } finally {
            payBtn.innerText = "BAYAR SEKARANG 💳";
            payBtn.disabled = false;
        }
    });

    closeBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
        qrImage.src = "";
        loadingQr.style.display = 'block';
    });
});
