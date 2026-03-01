const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs'); // Şifreleme paketimiz
const User = require('../models/User'); // Az önce oluşturduğumuz Kiler/Veritabanı şablonu
const jwt = require('jsonwebtoken'); // 1. BİLEKLİK ÜRETİCİSİNİ İÇERİ ALDIK
const crypto = require('crypto'); // Node.js'in kendi içindedir, npm install gerektirmez
const nodemailer = require('nodemailer'); // 1. MAİL PAKETİNİ ÇAĞIRDIK
// KAYIT OL (REGISTER) API'si
// Buraya istek atıldığında çalışacak adres: http://localhost:5000/api/auth/register
router.post('/register', async (req, res) => {
    try {
        // 1. React'ten (Kullanıcıdan) gelen bilgileri alıyoruz
        const { email, password } = req.body;

        // 2. Boş alan var mı diye kontrol ediyoruz
        if (!email || !password) {
            return res.status(400).json({ message: "Please fill areas" });
        }

        // 3. Bu e-posta ile daha önce kayıt olunmuş mu? (Veritabanında arıyoruz)
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "This email already used" });
        }

        // 4. Şifreyi Hash'le (Kriptola)
        // salt: Şifrelemeyi daha karmaşık hale getiren rastgele bir ektir (10 seviyesi idealdir)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 5. Yeni kullanıcıyı şablonumuza göre oluşturuyoruz
        const newUser = new User({
            email,
            password: hashedPassword // Açık şifreyi değil, şifrelenmiş halini kaydediyoruz!
        });

        // 6. Veritabanına kaydediyoruz
        await newUser.save();

        // 7. React'e (Frontend'e) başarı mesajı gönderiyoruz
        res.status(201).json({ message: "User succesfuly created" });

    } catch (error) {
        console.error("Kayıt hatası:", error);
        res.status(500).json({ message: "Error" });
    }
});
// GİRİŞ YAP (LOGIN) API'si
router.post('/login', async (req, res) => {
    try {
        // 1. React'ten gelen bilgileri alıyoruz (Beni hatırla seçeneği dahil)
        const { email, password, rememberMe } = req.body;

        // 2. Kullanıcıyı e-postasından buluyoruz
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "Bu e-posta ile kayıtlı kullanıcı bulunamadı." });
        }

        // 3. Şifreler eşleşiyor mu kontrol ediyoruz
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Hatalı şifre girdiniz." });
        }

        // 4. BİLEKLİK (TOKEN) OLUŞTURMA VE BENİ HATIRLA MANTIĞI
        // Beni hatırla seçildiyse 30 gün (30d), seçilmediyse 1 saat (1h) geçerli olsun
        const expireTime = rememberMe ? '30d' : '1h'; 

        const token = jwt.sign(
            { id: user._id }, // Bilekliğin içine kullanıcının kimliğini gizliyoruz
            process.env.JWT_SECRET, // Mührümüzü basıyoruz
            { expiresIn: expireTime } // Süresini ayarlıyoruz
        );

        // 5. Başarı mesajı ve token'ı React'e gönderiyoruz
        res.status(200).json({ 
            message: "Giriş başarılı kral!", 
            token: token 
        });

    } catch (error) {
        console.error("Giriş hatası:", error);
        res.status(500).json({ message: "Sunucuda bir hata oluştu." });
    }
});
// ŞİFREMİ UNUTTUM (FORGOT PASSWORD) API'si
router.post('/forgot-password', async (req, res) => {
    try {
        // 1. Kullanıcıyı bul
        const user = await User.findOne({ email: req.body.email });
        if (!user) {
            return res.status(404).json({ message: "Bu e-posta sistemde kayıtlı değil." });
        }

        // 2. Rastgele, eşsiz bir şifre sıfırlama kodu (token) üret
        const resetToken = crypto.randomBytes(20).toString('hex');

        // 3. Bu kodu ve 10 dakikalık geçerlilik süresini veritabanına kaydet
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // Şu an + 10 dakika
        await user.save();

        // 4. Mail Gönderici (Nodemailer) Ayarları
        const transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        // 5. Kullanıcıya gidecek olan tıklanabilir link (React'te bu sayfayı oluşturacağız)
        const resetUrl = `http://localhost:3000/reset-password/${resetToken}`;

        // 6. Mailin içeriği
        const mailOptions = {
            to: user.email,
            from: process.env.EMAIL_USER,
            subject: 'DND WEB - Şifre Sıfırlama Talebi',
            text: `Şifrenizi sıfırlamak için lütfen aşağıdaki bağlantıya tıklayın: \n\n ${resetUrl} \n\n Bu bağlantı 10 dakika sonra geçersiz olacaktır.`
        };

        // 7. Maili Gönder!
        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: "Şifre sıfırlama linki e-postanıza gönderildi!" });

    } catch (error) {
        console.error("Şifre sıfırlama hatası:", error);
        
        // Eğer mail gönderirken bir hata olursa, veritabanına yazdığımız token'ı geri siliyoruz ki güvenlik açığı olmasın
        const user = await User.findOne({ email: req.body.email });
        if (user) {
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;
            await user.save();
        }

        res.status(500).json({ message: "Mail gönderilemedi. Lütfen daha sonra tekrar deneyin." });
    }
});
// RESET PASSWORD API
router.put('/reset-password/:token', async (req, res) => {
    try {
        // 1. Find user by token AND ensure the token has not expired
        const user = await User.findOne({
            resetPasswordToken: req.params.token,
            resetPasswordExpire: { $gt: Date.now() } // Checks if expiration time is strictly greater than current time
        });

        if (!user) {
            return res.status(400).json({ message: "Invalid or expired reset token." });
        }

        // 2. Hash the new password securely
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(req.body.password, salt);

        // 3. Clear the reset token fields from the database since they are no longer needed
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;

        await user.save();

        res.status(200).json({ message: "Password updated successfully." });
    } catch (error) {
        console.error("Password reset error:", error);
        res.status(500).json({ message: "Server error occurred." });
    }
});
module.exports = router;