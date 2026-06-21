# -*- coding: utf-8 -*-
"""
GrupAdiAPI.pdf üretici — DnD Web Back-End API Dokümantasyonu (OpenAPI tarzı, Türkçe)
reportlab ile oluşturulur. Türkçe karakterler için Windows Arial fontu kaydedilir.
"""
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
                                PageBreak, HRFlowable)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily

FONT_DIR = r'C:\Windows\Fonts'


def reg(name, fname):
    pdfmetrics.registerFont(TTFont(name, os.path.join(FONT_DIR, fname)))


reg('Arial', 'arial.ttf')
reg('Arial-Bold', 'arialbd.ttf')
reg('Arial-Italic', 'ariali.ttf')
try:
    reg('Mono', 'consola.ttf')
except Exception:
    pdfmetrics.registerFont(TTFont('Mono', os.path.join(FONT_DIR, 'cour.ttf')))
registerFontFamily('Arial', normal='Arial', bold='Arial-Bold', italic='Arial-Italic', boldItalic='Arial-Bold')

GOLD = colors.HexColor('#8a6d1a')
DARK = colors.HexColor('#222222')
LIGHT = colors.HexColor('#f2f2f2')
BLUE = colors.HexColor('#2f5d8a')

styles = getSampleStyleSheet()
S = {}
S['title'] = ParagraphStyle('t', fontName='Arial-Bold', fontSize=26, textColor=GOLD, leading=30, spaceAfter=8)
S['subtitle'] = ParagraphStyle('st', fontName='Arial', fontSize=13, textColor=DARK, leading=18)
S['h1'] = ParagraphStyle('h1', fontName='Arial-Bold', fontSize=16, textColor=GOLD, spaceBefore=14, spaceAfter=6)
S['h2'] = ParagraphStyle('h2', fontName='Arial-Bold', fontSize=12.5, textColor=DARK, spaceBefore=10, spaceAfter=4)
S['ep'] = ParagraphStyle('ep', fontName='Mono', fontSize=11, textColor=colors.white, leading=15)
S['body'] = ParagraphStyle('b', fontName='Arial', fontSize=10, textColor=DARK, leading=14, spaceAfter=4)
S['small'] = ParagraphStyle('sm', fontName='Arial', fontSize=8.5, textColor=DARK, leading=11)
S['smallb'] = ParagraphStyle('smb', fontName='Arial-Bold', fontSize=8.5, textColor=DARK, leading=11)
S['smallw'] = ParagraphStyle('smw', fontName='Arial-Bold', fontSize=8.5, textColor=colors.white, leading=11)
S['code'] = ParagraphStyle('c', fontName='Mono', fontSize=8.5, textColor=DARK, leading=12, backColor=LIGHT,
                           borderPadding=5, spaceAfter=6, leftIndent=2)

flow = []


def P(text, st='body'):
    flow.append(Paragraph(text, S[st]))


def sp(h=6):
    flow.append(Spacer(1, h))


def hr():
    flow.append(HRFlowable(width='100%', thickness=0.6, color=colors.HexColor('#cccccc'), spaceBefore=4, spaceAfter=6))


def endpoint_banner(method, path):
    mcolor = {'GET': '#2f8a4e', 'POST': '#2f5d8a', 'PUT': '#8a6d1a', 'DELETE': '#a33'}.get(method, '#444')
    data = [[Paragraph(f'{method}', S['ep']), Paragraph(path, S['ep'])]]
    t = Table(data, colWidths=[60, 435])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, 0), colors.HexColor(mcolor)),
        ('BACKGROUND', (1, 0), (1, 0), colors.HexColor('#333333')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 8), ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 6), ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    flow.append(t)
    sp(4)


def param_table(rows):
    head = [Paragraph(h, S['smallw']) for h in ('Parametre', 'Konum', 'Tip', 'Zorunlu', 'Açıklama')]
    data = [head]
    for r in rows:
        data.append([Paragraph(str(c), S['small']) for c in r])
    t = Table(data, colWidths=[95, 55, 55, 55, 235])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), GOLD),
        ('GRID', (0, 0), (-1, -1), 0.4, colors.HexColor('#bbbbbb')),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f7f7f7')]),
        ('LEFTPADDING', (0, 0), (-1, -1), 5), ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ('TOPPADDING', (0, 0), (-1, -1), 3), ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    flow.append(t)
    sp(5)


def resp_table(rows):
    head = [Paragraph(h, S['smallw']) for h in ('Kod', 'Anlam', 'Gövde (örnek)')]
    data = [head]
    for r in rows:
        data.append([Paragraph(str(r[0]), S['smallb']), Paragraph(str(r[1]), S['small']),
                     Paragraph(f'<font name="Mono">{r[2]}</font>', S['small'])])
    t = Table(data, colWidths=[45, 130, 320])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), BLUE),
        ('GRID', (0, 0), (-1, -1), 0.4, colors.HexColor('#bbbbbb')),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f7f7f7')]),
        ('LEFTPADDING', (0, 0), (-1, -1), 5), ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ('TOPPADDING', (0, 0), (-1, -1), 3), ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    flow.append(t)
    sp(8)


def endpoint(method, path, desc, auth, params, body, responses, frontend):
    endpoint_banner(method, path)
    P('<b>Açıklama:</b> ' + desc)
    P('<b>Kimlik doğrulama:</b> ' + ('Gerekli (JWT Bearer)' if auth else 'Gerekli değil'))
    if params:
        P('<b>Parametreler:</b>')
        param_table(params)
    else:
        P('<b>Parametreler:</b> Yok')
    if body:
        P('<b>İstek gövdesi (JSON):</b>')
        flow.append(Paragraph(body.replace('<', '&lt;').replace('>', '&gt;').replace('\n', '<br/>'), S['code']))
    P('<b>Yanıtlar:</b>')
    resp_table(responses)
    P('<b>Front-end kullanımı:</b> ' + frontend)
    hr()


# ===================== KAPAK =====================
flow.append(Spacer(1, 120))
P('DnD Web — Back-End API Dokümantasyonu', 'title')
P('OpenAPI 3.0 tarzı uç nokta dokümantasyonu (Türkçe)', 'subtitle')
sp(40)
P('Ders: Web Geliştirme', 'subtitle')
P('Grup Adı: [GRUP ADINIZ]', 'subtitle')
P('Grup Üyeleri: [Ad Soyad 1], [Ad Soyad 2], [Ad Soyad 3], [Ad Soyad 4]', 'subtitle')
P('Ankara Üniversitesi', 'subtitle')
flow.append(PageBreak())

# ===================== GENEL BİLGİLER =====================
P('1. Genel Bilgiler', 'h1')
P('Bu doküman, DnD Web uygulamasının Express tabanlı REST API uç noktalarını OpenAPI 3.0 '
  'yaklaşımıyla belgelemektedir. Her uç nokta için HTTP method, URL, açıklama, parametreler, '
  'yanıt yapısı ve front-end kullanım bilgisi verilmiştir.')
sp(2)
info = [
    ['Temel URL (Base URL)', 'http://localhost:5001/api'],
    ['İçerik tipi', 'application/json'],
    ['Kimlik doğrulama', 'JWT — HTTP başlığı: Authorization: Bearer <token>'],
    ['Token üretimi', 'POST /api/auth/login yanıtındaki "token" alanı'],
    ['Statik görseller', 'GET /maps/<dosya>.png (AI ile üretilen arka planlar)'],
    ['Hata biçimi', '{ "message": "..." } veya { "ok": false, "message": "..." }'],
]
t = Table([[Paragraph(a, S['smallb']), Paragraph(b, S['small'])] for a, b in info], colWidths=[150, 345])
t.setStyle(TableStyle([
    ('GRID', (0, 0), (-1, -1), 0.4, colors.HexColor('#bbbbbb')),
    ('ROWBACKGROUNDS', (0, 0), (-1, -1), [colors.white, colors.HexColor('#f7f7f7')]),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('LEFTPADDING', (0, 0), (-1, -1), 5), ('TOPPADDING', (0, 0), (-1, -1), 3), ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
]))
flow.append(t)
sp(6)
P('Not: verifyToken ara katmanı, geçerli bir Bearer token bulunmayan korumalı isteklere 401 '
  '(token yok) veya 400 (geçersiz token) döndürür.', 'small')

# ===================== 2. AUTH =====================
flow.append(PageBreak())
P('2. Kimlik Doğrulama (Auth) Uçları', 'h1')

endpoint('POST', '/api/auth/register',
         'Yeni bir kullanıcı hesabı oluşturur. Şifre bcrypt ile hash’lenerek saklanır.',
         False, None,
         '{\n  "email": "ornek@mail.com",\n  "password": "gizliSifre"\n}',
         [['201', 'Kullanıcı oluşturuldu', '{ "message": "User succesfuly created" }'],
          ['400', 'Eksik alan / e-posta kullanımda', '{ "message": "This email already used" }'],
          ['500', 'Sunucu hatası', '{ "message": "Error" }']],
         'Kayıt formu (LoginForm/Register bileşeni) — “Kayıt Ol” isteği.')

endpoint('POST', '/api/auth/login',
         'Kullanıcıyı doğrular ve bir JWT döndürür. rememberMe true ise token 30 gün, değilse 1 saat geçerlidir.',
         False, None,
         '{\n  "email": "ornek@mail.com",\n  "password": "gizliSifre",\n  "rememberMe": true\n}',
         [['200', 'Giriş başarılı', '{ "message": "...", "token": "<JWT>" }'],
          ['400', 'Kullanıcı yok / hatalı şifre', '{ "message": "Hatalı şifre girdiniz." }']],
         'Giriş formu — dönen token localStorage/sessionStorage’a yazılır ve sonraki isteklerde kullanılır.')

endpoint('POST', '/api/auth/forgot-password',
         'Verilen e-postaya 10 dakika geçerli bir şifre sıfırlama bağlantısı gönderir (Nodemailer/Gmail).',
         False, None,
         '{\n  "email": "ornek@mail.com"\n}',
         [['200', 'Sıfırlama maili gönderildi', '{ "message": "Şifre sıfırlama linki ... gönderildi!" }'],
          ['404', 'E-posta kayıtlı değil', '{ "message": "Bu e-posta sistemde kayıtlı değil." }']],
         '“Şifremi Unuttum” ekranı.')

endpoint('PUT', '/api/auth/reset-password/:token',
         'Geçerli ve süresi dolmamış sıfırlama token’ı ile yeni şifre belirler.',
         False,
         [['token', 'path', 'String', 'Evet', 'E-posta ile gönderilen sıfırlama kodu.']],
         '{\n  "password": "yeniSifre"\n}',
         [['200', 'Şifre güncellendi', '{ "message": "Password updated successfully." }'],
          ['400', 'Geçersiz/süresi dolmuş token', '{ "message": "Invalid or expired reset token." }']],
         '“Şifre Sıfırla” ekranı (URL’deki token ile).')

# ===================== 3. CHARACTERS =====================
flow.append(PageBreak())
P('3. Karakter (Characters) Uçları', 'h1')
P('Tüm uçlar JWT gerektirir. Kullanıcı yalnızca kendi karakterlerine erişebilir (userId eşleşmesi).', 'small')
sp(4)

endpoint('POST', '/api/characters',
         'Giriş yapan kullanıcı için yeni bir D&D karakteri oluşturur. Gövde, Character şemasındaki alanları içerir.',
         True, None,
         '{\n  "name": "Aragorn", "species": "Human", "charClass": "Ranger",\n'
         '  "level": 3, "stats": { "Strength": 16, ... },\n'
         '  "maxHp": 28, "currentHp": 28, "armorClass": 15, ...\n}',
         [['201', 'Karakter oluşturuldu', '<oluşturulan karakter belgesi>'],
          ['500', 'Sunucu hatası', '{ "message": "Failed to create character." }']],
         'Karakter oluşturma sihirbazı (CharacterSheet) — “Kaydet”.')

endpoint('GET', '/api/characters',
         'Giriş yapan kullanıcının tüm karakterlerini listeler.',
         True, None, None,
         [['200', 'Karakter listesi', '[ { <karakter> }, { <karakter> } ]']],
         'Karakter seçim/listeleme ekranı; oyuna katılırken karakter seçimi.')

endpoint('PUT', '/api/characters/:id',
         'Kullanıcıya ait bir karakteri günceller.',
         True,
         [['id', 'path', 'ObjectId', 'Evet', 'Güncellenecek karakterin kimliği.']],
         '{ "currentHp": 20, "level": 4, ... }  (değişen alanlar)',
         [['200', 'Güncellendi', '<güncel karakter belgesi>'],
          ['404', 'Bulunamadı / erişim reddedildi', '{ "message": "Character not found or access denied." }']],
         'Karakter sayfasında düzenleme; oyun sırasında HP/seviye güncelleme.')

endpoint('DELETE', '/api/characters/:id',
         'Kullanıcıya ait bir karakteri siler.',
         True,
         [['id', 'path', 'ObjectId', 'Evet', 'Silinecek karakterin kimliği.']],
         None,
         [['200', 'Silindi', '{ "message": "Character deleted successfully." }'],
          ['404', 'Bulunamadı', '{ "message": "Character not found or access denied." }']],
         'Karakter listesinde “Sil” düğmesi.')

# ===================== 4. GAMES =====================
flow.append(PageBreak())
P('4. Oyun / Kampanya (Games) Uçları', 'h1')
P('Tüm uçlar JWT gerektirir.', 'small')
sp(4)

endpoint('POST', '/api/games/host',
         'GM yeni bir oyun (kampanya) oluşturur ve benzersiz 8 karakterli bir oyun kodu üretilir.',
         True, None,
         '{\n  "name": "Kayıp Maden", "description": "..."\n}',
         [['201', 'Oyun oluşturuldu', '{ "gameCode": "ABCD2345", "gameId": "<id>" }'],
          ['500', 'Hata', '{ "message": "Failed to create game." }']],
         'GM paneli “Oyun Kur”; üretilen kod oyunculara paylaşılır.')

endpoint('GET', '/api/games/join/:gameCode',
         'Bir oyun koduna katılmadan önce kodun geçerli/aktif olduğunu doğrular ve özet bilgi döner.',
         True,
         [['gameCode', 'path', 'String', 'Evet', '8 karakterli oyun kodu (büyük harfe çevrilir).']],
         None,
         [['200', 'Geçerli oyun', '{ "gameCode": "...", "gameName": "...", "playerCount": 2 }'],
          ['404', 'Bulunamadı/pasif', '{ "message": "Game not found or is no longer active." }']],
         'Oyuna katılma ekranı — kod doğrulama.')

endpoint('POST', '/api/games/join/:gameCode',
         'Oyuncuyu seçtiği karakter ile oyuna resmi olarak ekler (zaten ekliyse tekrar eklemez).',
         True,
         [['gameCode', 'path', 'String', 'Evet', 'Oyun kodu.']],
         '{\n  "characterId": "<id>",\n  "playerName": "Burak",\n  "characterName": "Aragorn"\n}',
         [['200', 'Katılım başarılı', '{ "message": "Joined successfully.", "gameCode": "..." }'],
          ['404', 'Oyun bulunamadı', '{ "message": "Game not found." }']],
         'Oyuncu paneli (PlayerDashboard) — oyuna giriş.')

endpoint('GET', '/api/games/code/:gameCode',
         'Oyun ayrıntılarını, oyuncuların karakter belgeleri populate edilmiş halde döndürür.',
         True,
         [['gameCode', 'path', 'String', 'Evet', 'Oyun kodu.']],
         None,
         [['200', 'Oyun belgesi', '{ gameCode, gmId, players:[{ characterId:{...} }], map, ... }'],
          ['404', 'Bulunamadı', '{ "message": "Game not found." }']],
         'GM ve oyuncu panelleri açılışta oyunu/oyuncuları yükler.')

endpoint('GET', '/api/games/:gameCode/map',
         'Oyunun kalıcı hex harita JSON’ını getirir (yoksa null).',
         True,
         [['gameCode', 'path', 'String', 'Evet', 'Oyun kodu.']],
         None,
         [['200', 'Harita', '{ "map": { hexes:[...], objects:[...], tokens:[...] } | null }'],
          ['404', 'Oyun bulunamadı', '{ "message": "Game not found." }']],
         'GM paneli açılışta haritayı yükler (yoksa boş harita oluşturur).')

endpoint('PUT', '/api/games/:gameCode/map',
         'Hex haritayı kaydeder. Yalnızca oyunu kuran GM değiştirebilir (sunucuda gmId kontrolü).',
         True,
         [['gameCode', 'path', 'String', 'Evet', 'Oyun kodu.']],
         '{\n  "map": { "hexes": [...], "objects": [...], "tokens": [...],\n'
         '           "backgroundImageUrl": "...", "hexConfig": {...} }\n}',
         [['200', 'Kaydedildi', '{ "message": "Map saved." }'],
          ['403', 'GM değil', '{ "message": "Only the GM can modify the map." }'],
          ['404', 'Oyun bulunamadı', '{ "message": "Game not found." }']],
         'GM panelinde harita değişiklikleri ~1,5 sn debounce ile kaydedilir.')

endpoint('GET', '/api/games/my-games',
         'Giriş yapan GM’in oluşturduğu tüm oyunları (yeniden eskiye) listeler.',
         True, None, None,
         [['200', 'Oyun listesi', '[ { gameCode, name, createdAt, ... } ]']],
         'GM’in kampanya listesi ekranı.')

endpoint('DELETE', '/api/games/:id',
         'GM’e ait bir kampanyayı siler.',
         True,
         [['id', 'path', 'ObjectId', 'Evet', 'Silinecek oyunun kimliği (_id).']],
         None,
         [['200', 'Silindi', '{ "message": "Campaign deleted successfully." }'],
          ['404', 'Bulunamadı', '{ "message": "Campaign not found or access denied." }']],
         'Kampanya listesinde “Sil”.')

# ===================== 5. AI =====================
flow.append(PageBreak())
P('5. Yapay Zekâ (AI) Uçları', 'h1')
P('Tüm uçlar JWT gerektirir. Görsel üretimi OpenAI Images API’si ile yapılır; anahtar sunucuda '
  'OPENAI_API_KEY ortam değişkeninden okunur.', 'small')
sp(4)

endpoint('POST', '/api/ai/generate-background',
         'Verilen prompttan yukarıdan görünümlü bir savaş haritası görseli üretir, sunucuya PNG '
         'olarak kaydeder ve kalıcı bir URL döndürür. Stil/ışık seçenekleri sabit prompt şablonuna eklenir.',
         True, None,
         '{\n  "prompt": "bir nehir içeren orman açıklığı",\n'
         '  "style": "painterly",   // ops: painterly|realistic|gritty|vibrant\n'
         '  "lighting": "dusk",     // ops: day|dusk|night|torchlit\n'
         '  "size": "1536x1024"     // ops\n}',
         [['200', 'Üretildi', '{ "ok": true, "url": "http://localhost:5001/maps/bg_xxx.png" }'],
          ['400', 'Prompt yok', '{ "ok": false, "message": "A prompt is required." }'],
          ['501', 'Yapılandırılmamış', '{ "ok": false, "message": "... Set OPENAI_API_KEY ..." }'],
          ['502', 'Sağlayıcı/iletişim hatası', '{ "ok": false, "message": "... failed: ..." }']],
         'GM panelinde “AI Arka Plan” kutusu (aiMapService.js → generateBackgroundImage). '
         'Dönen URL arka plan olarak ayarlanır ve galeride saklanır.')

endpoint('POST', '/api/ai/generate-map',
         'Prompttan harita VERİSİ üretimi — şu an bağlı değil (work in progress). İleride bir API '
         'eklenecektir.',
         True, None,
         '{ "prompt": "...", "width": 16, "height": 12 }',
         [['501', 'Uygulanmadı', '{ "ok": false, "message": "Map-data generation ... not implemented." }']],
         'GM panelinde gelecekteki kullanım için ayrılmış iskele uç noktası.')

# ===================== 6. STATİK =====================
P('6. Statik Dosya Sunumu', 'h1')
endpoint('GET', '/maps/:dosya',
         'AI ile üretilen arka plan görsellerini statik olarak sunar (Express express.static).',
         False,
         [['dosya', 'path', 'String', 'Evet', 'Üretilen PNG dosya adı (örn. bg_xxx.png).']],
         None,
         [['200', 'PNG görseli', '<image/png ikili veri>'],
          ['404', 'Dosya yok', '—']],
         '&lt;img&gt; etiketi ve hex harita arka planı; backgroundImageUrl olarak saklanır.')

# ===================== 7. SOCKET.IO (EK) =====================
flow.append(PageBreak())
P('7. Ek: Gerçek Zamanlı Olaylar (Socket.IO)', 'h1')
P('REST dışında, gerçek zamanlı senkronizasyon Socket.IO ile sağlanır. Her oyun bir “oda” '
  '(gameCode) ile temsil edilir. Aşağıdaki tablo, istemcinin GÖNDERDİĞİ olayları ve sunucunun '
  'odaya YAYINLADIĞI karşılık olaylarını listeler.', 'body')
sp(2)
events = [
    ('join_room', '{ gameCode, playerName }', 'player_joined', 'Odaya katılma.'),
    ('leave_room', '{ gameCode, playerName }', 'player_left', 'Odadan ayrılma.'),
    ('dice_roll', '{ gameCode, playerName, rollText, isHidden }', 'log_update', 'Zar atışı (gizli ise yalnızca özet).'),
    ('gm_map_update', '{ gameCode, mapUrl, onScreenMedia, board }', 'map_changed', 'GM klasik harita/medya güncellemesi.'),
    ('gm_grid_update', '{ gameCode, grid }', 'grid_updated', 'Izgara ayarları.'),
    ('gm_token_update', '{ gameCode, tokens }', 'tokens_updated', 'Token listesi.'),
    ('gm_combat_update', '{ gameCode, combatState, tokens }', 'combat_updated', 'Savaş durumu.'),
    ('gm_hp_update', '{ gameCode, playerId, currentHp }', 'hp_changed', 'Can senkronizasyonu (herkese).'),
    ('player_stat_update', '{ gameCode, playerId, character }', 'character_updated', 'Oyuncu karakter güncellemesi.'),
    ('gm_drawing_update', '{ gameCode, paintedCells, drawingSnapshot }', 'drawing_updated', 'Serbest çizim/boyama.'),
    ('gm_hexmap_update', '{ gameCode, map }', 'hexmap_updated', 'Hex harita (oyunculara FİLTRELİ görünüm).'),
    ('player_token_move', '{ gameCode, tokenId, q, r, playerName }', 'token_moved', 'Oyuncu kendi token’ını taşır.'),
    ('player_object_pickup', '{ gameCode, objectId, tokenId, playerName }', 'object_pickedup', 'Nesne toplama.'),
    ('laser_point', '{ gameCode, points, color }', 'laser_pointed', 'Geçici lazer işaretçisi.'),
    ('send_log', '{ gameCode, text, type }', 'log_update', 'Genel günlük mesajı.'),
]
head = [Paragraph(h, S['smallw']) for h in ('Gönderilen olay', 'Veri (payload)', 'Yayınlanan olay', 'Açıklama')]
data = [head] + [[Paragraph(f'<font name="Mono">{e[0]}</font>', S['small']),
                  Paragraph(f'<font name="Mono">{e[1]}</font>', S['small']),
                  Paragraph(f'<font name="Mono">{e[2]}</font>', S['small']),
                  Paragraph(e[3], S['small'])] for e in events]
t = Table(data, colWidths=[105, 150, 105, 135])
t.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), GOLD),
    ('GRID', (0, 0), (-1, -1), 0.4, colors.HexColor('#bbbbbb')),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f7f7f7')]),
    ('LEFTPADDING', (0, 0), (-1, -1), 4), ('RIGHTPADDING', (0, 0), (-1, -1), 4),
    ('TOPPADDING', (0, 0), (-1, -1), 3), ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
]))
flow.append(t)


def footer(canvas, docu):
    canvas.saveState()
    canvas.setFont('Arial', 8)
    canvas.setFillColor(colors.HexColor('#888888'))
    canvas.drawString(50, 25, 'DnD Web — Back-End API Dokümantasyonu')
    canvas.drawRightString(545, 25, 'Sayfa %d' % docu.page)
    canvas.restoreState()


out = r'c:\Projects\D&D\docs\GrupAdiAPI.pdf'
docpdf = SimpleDocTemplate(out, pagesize=A4, leftMargin=50, rightMargin=50, topMargin=45, bottomMargin=45,
                           title='DnD Web API Dokümantasyonu')
docpdf.build(flow, onFirstPage=footer, onLaterPages=footer)
print('OK ->', out)
