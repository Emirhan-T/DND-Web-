const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); // 1. CORS'U İÇERİ ALDIK
require('dotenv').config();

const app = express();
const PORT = 5001;

// Middleware'ler
app.use(cors()); // 2. REACT'TEN GELEN İSTEKLERE İZİN VERDİK
app.use(express.json());

// Veritabanı bağlantısı
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("Kral, MongoDB bağlantısı başarılı!"))
  .catch((err) => console.log("MongoDB bağlantı hatası:", err));

// 3. ROTALARI BAĞLIYORUZ
const authRoutes = require('./routes/auth');
// Eğer frontend '/api/auth' ile başlayan bir istek atarsa, authRoutes dosyasına git diyoruz
app.use('/api/auth', authRoutes);

app.get('/', (req, res) => {
    res.send("Backend sunucusu tıkır tıkır çalışıyor!");
});

app.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda ayaklandı!`);
});