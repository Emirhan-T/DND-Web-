const mongoose = require('mongoose');

// Kullanıcı şablonumuzu (Schema) oluşturuyoruz
const userSchema = new mongoose.Schema({
    email: { 
        type: String, 
        required: true, // Zorunlu alan
        unique: true // Aynı e-posta ile ikinci bir kişi kayıt olamasın
    },
    password: { 
        type: String, 
        required: true // Şifre de zorunlu
    },
    // Şifremi unuttum özelliği için ileride kullanacağımız alanlar:
    resetPasswordToken: String,
    resetPasswordExpire: Date
}, { 
    timestamps: true // Bu ayar, kullanıcının ne zaman kayıt olduğunu (createdAt) otomatik kaydeder
});

// Bu şablonu 'User' adıyla dışarı aktarıyoruz ki server.js veya diğer dosyalarda kullanabilelim
module.exports = mongoose.model('User', userSchema);