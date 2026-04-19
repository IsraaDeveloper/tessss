require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const axios = require('axios');
const admin = require('firebase-admin');

const app = express();
app.use(cors());
// Parse JSON body, but keep rawBody for webhook signature verification
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

// Inisiasi Firebase Admin pake .env credentials
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
  databaseURL: process.env.FIREBASE_DATABASE_URL
});
const db = admin.database();

// --- SISTEM AUTENTIKASI INTERNAL (dari Frontend kita) ---
const verifyFirebaseToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  }
  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    return res.status(401).json({ status: 'error', message: 'Invalid token' });
  }
};


/* ==========================================
   1. ROUTE CLIENT (VENNPAY PUBLIC API)
   Digunakan user pake API Key Vennpay mereka
============================================= */

app.post('/api/v1/payment', async (req, res) => {
  const vennpayApiKey = req.headers['x-api-key'];
  const { amount, referenceNo } = req.body;
  const parseAmount = parseInt(amount);

  if (!vennpayApiKey || isNaN(parseAmount) || parseAmount <= 0 || !referenceNo) {
    return res.status(400).json({ status: 'error', message: 'Invalid or missing parameters' });
  }

  try {
    // 1. Cari user di RTDB yang punya API Key ini
    const snapshot = await db.ref('users').orderByChild('apiKey').equalTo(vennpayApiKey).once('value');
    if (!snapshot.exists()) {
      return res.status(401).json({ status: 'error', message: 'Invalid API Key' });
    }
    
    // Karna API Key unik, ambil child pertamanya (UID)
    const userVal = snapshot.val();
    const uid = Object.keys(userVal)[0];

    // 2. Ambil Global Fee & Hitung Nominal
    const feeSnap = await db.ref('settings/fee').once('value');
    const feeConfig = feeSnap.exists() ? feeSnap.val() : { type: 'flat', value: 0 };
    
    let adminFee = 0;
    if (typeof feeConfig === 'object') {
        if (feeConfig.type === 'percent') {
            adminFee = Math.round(parseAmount * (parseFloat(feeConfig.value) / 100));
        } else {
            adminFee = parseInt(feeConfig.value);
        }
    } else {
        adminFee = parseInt(feeConfig); // Support format lama
    }

    const totalAmount = parseAmount + adminFee;

    // 3. Tembak Sanpay untuk QRIS
    const trxId = `TRX-${Date.now()}`;
    const sanpayPayload = {
      amount: totalAmount, // Menggunakan total (nominal + fee)
      partnerReferenceNo: trxId,
      expirySeconds: 900
    };

    const rawPayload = JSON.stringify(sanpayPayload);
    const signature = crypto.createHmac('sha256', process.env.SANPAY_API_KEY).update(rawPayload).digest('hex');

    const config = {
      method: 'post',
      url: `${process.env.SANPAY_BASE_URL}/topup_qris`,
      headers: { 
        'X-Merchant-Code': process.env.SANPAY_MERCHANT_CODE, 
        'X-Signature': signature,
        'Content-Type': 'application/json'
      },
      data: rawPayload
    };

    const response = await axios(config);
    const sanpayResponse = response.data;

    if (sanpayResponse.status === 'success') {
      // 4. Simpan di Firebase dengan rincian fee
      await db.ref(`transactions/${trxId}`).set({
        uid: uid,
        merchantAmount: parseAmount,      // Nominal bersih buat user
        adminFee: adminFee,               // Keuntungan kita
        totalAmount: totalAmount,         // Yang dibayar pembeli
        type: 'QRIS Dinamis',
        status: 'PENDING',
        clientReferenceNo: referenceNo,
        qrContent: sanpayResponse.qrContent,
        createdAt: new Date().toISOString()
      });

      return res.json({
        status: 'success',
        transactionId: trxId,
        merchantAmount: parseAmount,
        adminFee: adminFee,
        totalAmount: totalAmount,
        qrContent: sanpayResponse.qrContent,
        expiresAt: sanpayResponse.expiresAt
      });
    } else {
      return res.status(400).json({ status: 'error', message: 'Sanpay Error: ' + JSON.stringify(sanpayResponse) });
    }

  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});


/* ==========================================
   2. ROUTE WEBHOOK (DARI SANPAY KE KITA)
============================================= */

app.post('/api/sanpay/callback', async (req, res) => {
  const merchantCode = req.headers['x-merchant-code'];
  const signatureHeader = req.headers['x-signature'];

  if (merchantCode !== process.env.SANPAY_MERCHANT_CODE) {
    return res.status(401).json({ status: 'error', message: 'Invalid Merchant Code' });
  }

  const calculatedSignature = crypto.createHmac('sha256', process.env.SANPAY_API_KEY).update(req.rawBody).digest('hex');
  if (calculatedSignature !== signatureHeader) {
    return res.status(401).json({ status: 'error', message: 'Invalid Signature' });
  }

  const data = req.body;
  if(data.isValidationTest) {
    return res.status(200).json({ status: 'success' }); 
  }

  const trxId = data.referenceNo;
  const trxRef = db.ref(`transactions/${trxId}`);

  try {
    const snapshot = await trxRef.once('value');
    if (snapshot.exists()) {
      const trxData = snapshot.val();
      
      if (trxData.status === 'PENDING') {
        // Gunakan Merchant Amount yang sudah disimpan pas creation
        // Jadi untung kita (adminFee) tetap di kita
        const netMasukKeUser = trxData.merchantAmount;

        // Update TRX Status
        await trxRef.update({ status: 'PAID', paidAt: data.transactionDate });

        // Update Saldo User (Balance) sesuai nominal bersih
        const userRef = db.ref(`users/${trxData.uid}`);
        const userSnap = await userRef.once('value');
        if (userSnap.exists()) {
          const userVal = userSnap.val();
          const currentBalance = userVal.balance || 0;
          await userRef.update({ balance: currentBalance + netMasukKeUser });

          if (userVal.webhookUrl) {
            axios.post(userVal.webhookUrl, {
              status: 'PAID',
              vennpayTrxId: trxId,
              clientReferenceNo: trxData.clientReferenceNo,
              amount: netMasukKeUser // Beritahu merchant nominal yang masuk
            }).catch(e => console.log('Forward webhook error:', e.message));
          }
        }
      }
    }
  } catch (err) {
    console.error(err);
  }

  res.status(200).json({ status: 'success' });
});


/* ==========================================
   3. INTERNAL DASHBOARD ROUTES (AUTH DENGAN FIREBASE)
============================================= */

// Sinkronasi user yang daftar
app.post('/api/user/sync', verifyFirebaseToken, async (req, res) => {
  const uid = req.user.uid;
  const userRef = db.ref(`users/${uid}`);
  const snap = await userRef.once('value');
  
  if (!snap.exists()) {
    // Generate fresh API Key untuk user baru
    const newApiKey = 'VENN-' + crypto.randomUUID();
    await userRef.set({
      email: req.user.email,
      balance: 0,
      apiKey: newApiKey,
      webhookUrl: '',
      role: 'merchant' // bisa di set jadi 'admin' manual via console firebasenya nanti
    });
  }
  
  const finalSnap = await userRef.once('value');
  res.json({ status: 'success', data: finalSnap.val() });
});

// Update Webhook URL di Dashboard
app.post('/api/user/webhook', verifyFirebaseToken, async (req, res) => {
  await db.ref(`users/${req.user.uid}`).update({ webhookUrl: req.body.webhookUrl });
  res.json({ status: 'success' });
});

// Refresh API Key (Generate Baru)
app.post('/api/user/refresh_api', verifyFirebaseToken, async (req, res) => {
  const newApiKey = 'VENN-' + crypto.randomUUID();
  await db.ref(`users/${req.user.uid}`).update({ apiKey: newApiKey });
  res.json({ status: 'success', apiKey: newApiKey });
});

/* --- START SERVER --- */
const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`🚀 Vennpay Backend is running on port ${PORT}`);
    });
}

module.exports = app;
