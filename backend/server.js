const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Socket.io kurulumu - frontend'den gelen bağlantılara izin ver
const io = new Server(server, {
    cors: {
        origin: 'http://localhost:3000',
        methods: ['GET', 'POST']
    },
    maxHttpBufferSize: 5e6  // 5 MB — canvas snapshot için
});

const PORT = 5001;

// ===================== MIDDLEWARE =====================
app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());

// ===================== MONGODB BAĞLANTISI =====================
mongoose.connect(process.env.MONGO_URI, {
    family: 4
})
    .then(() => console.log('✅ MongoDB bağlantısı başarılı!'))
    .catch((err) => console.log('❌ MongoDB bağlantı hatası:', err));

// ===================== HTTP ROUTES =====================
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

const characterRoutes = require('./routes/character');
app.use('/api/characters', characterRoutes);

const gameRoutes = require('./routes/game');
app.use('/api/games', gameRoutes);

app.get('/', (req, res) => {
    res.send('🎲 DnD Backend - Tıkır tıkır çalışıyor!');
});

// ===================== SOCKET.IO GERÇEK ZAMANLI MOTOR =====================
// Her oyun "odası" = gameCode
// Tüm bağlı kullanıcılar aynı odaya (gameCode'a) abone olur

io.on('connection', (socket) => {
    console.log(`🔌 Yeni bağlantı: ${socket.id}`);

    // --- OYUN ODASINA KATIL ---
    socket.on('join_room', ({ gameCode, playerName }) => {
        socket.join(gameCode);
        console.log(`👤 ${playerName} odaya katıldı: ${gameCode}`);
        // Odadaki herkese bildir
        socket.to(gameCode).emit('player_joined', { playerName });
    });

    // --- OYUN ODASINDAN AYRIL ---
    socket.on('leave_room', ({ gameCode, playerName }) => {
        socket.leave(gameCode);
        socket.to(gameCode).emit('player_left', { playerName });
    });

    // --- ZAR ATIŞI (Herkes görsün) ---
    socket.on('dice_roll', ({ gameCode, playerName, rollText, isHidden }) => {
        if (isHidden) {
            // Sadece GM'e gönder (ileride GM socket ID takibi ile)
            socket.to(gameCode).emit('log_update', { text: `[HIDDEN ROLL by ${playerName}]`, type: 'hidden' });
        } else {
            // Odadaki herkese gönder
            io.to(gameCode).emit('log_update', { text: rollText, type: 'dice', playerName });
        }
    });

    // --- GM HARITA/TOKEN GÜNCELLEMESİ ---
    socket.on('gm_map_update', ({ gameCode, mapUrl, onScreenMedia, board }) => {
        // GM'den gelen haritayı tüm oyunculara gönder
        socket.to(gameCode).emit('map_changed', { mapUrl, onScreenMedia, board });
    });

    // --- GM GRID GÜNCELLEMESİ ---
    socket.on('gm_grid_update', ({ gameCode, grid }) => {
        socket.to(gameCode).emit('grid_updated', { grid });
    });

    // --- GM TOKEN GÜNCELLEMESİ ---
    socket.on('gm_token_update', ({ gameCode, tokens }) => {
        socket.to(gameCode).emit('tokens_updated', { tokens });
    });

    // --- GM COMBAT DURUMU ---
    socket.on('gm_combat_update', ({ gameCode, combatState, tokens }) => {
        socket.to(gameCode).emit('combat_updated', { combatState, tokens });
    });

    // --- GM OYUNCU CAN GÜNCELLEMESİ ---
    socket.on('gm_hp_update', ({ gameCode, playerId, currentHp }) => {
        io.to(gameCode).emit('hp_changed', { playerId, currentHp });
    });

    // --- OYUNCU STAT GÜNCELLEMESİ ---
    socket.on('player_stat_update', ({ gameCode, playerId, character }) => {
        socket.to(gameCode).emit('character_updated', { playerId, character });
    });

    // --- GM ÇİZİM & BOYAMA GÜNCELLEMESİ ---
    // paintedCells: boyanmış grid hücreleri  
    // drawingSnapshot: marker/eraser canvas'ının base64 görüntüsü
    socket.on('gm_drawing_update', ({ gameCode, paintedCells, drawingSnapshot }) => {
        socket.to(gameCode).emit('drawing_updated', { paintedCells, drawingSnapshot });
    });

    // --- GENEL LOG MESAJI ---
    socket.on('send_log', ({ gameCode, text, type }) => {
        io.to(gameCode).emit('log_update', { text, type: type || 'info' });
    });

    // --- BAĞLANTI KESİLDİ ---
    socket.on('disconnect', () => {
        console.log(`🔌 Bağlantı kesildi: ${socket.id}`);
    });
});

// ===================== SUNUCUYU BAŞLAT =====================
server.listen(PORT, () => {
    console.log(`🚀 Sunucu ${PORT} portunda ayaklandı!`);
});
