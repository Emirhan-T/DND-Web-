import { io } from 'socket.io-client';

// Backend sunucu adresi
const SOCKET_URL = 'http://localhost:5001';

// Singleton socket bağlantısı (tüm uygulama bu tek bağlantıyı kullanır)
const socket = io(SOCKET_URL, {
    autoConnect: false, // Manuel olarak bağlanacağız (oyuna katıldığında)
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
});

export default socket;
