import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SummaryStep from '../CharacterSheet/SummaryStep';
import './GMDashboard.css';

const GMDashboard = () => {
    const navigate = useNavigate();
    const logContainerRef = useRef(null);

    // --- PANEL STATE'LERİ ---
    const [isTopOpen, setIsTopOpen] = useState(true);
    const [isBottomOpen, setIsBottomOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isHudOpen, setIsHudOpen] = useState(true);
    const [isDrawingMenuOpen, setIsDrawingMenuOpen] = useState(true);

    // --- OYUN & ZAR STATE'LERİ ---
    const gameCode = "EPIC2026";
    const [logs, setLogs] = useState([{ id: 1, text: "Campaign Started. Waiting for players...", isHidden: false }]);
    const [diceQty, setDiceQty] = useState(1);
    const [diceType, setDiceType] = useState(20);
    const [isHiddenRoll, setIsHiddenRoll] = useState(false);

    // --- MEDYA & HARİTA STATE'LERİ ---
    const [bottomTab, setBottomTab] = useState('maps'); 
    const [maps, setMaps] = useState([]);
    const [images, setImages] = useState([]);
    
    const [board, setBoard] = useState({ x: 0, y: 0, scale: 1, rotation: 0 });
    const [onScreenMedia, setOnScreenMedia] = useState([]); 
    const [draggedMedia, setDraggedMedia] = useState(null);
    const fileInputRef = useRef(null);

    // --- HARİTA KİLİDİ VE SÜRÜKLEME ---
    const [isCanvasLocked, setIsCanvasLocked] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    // --- ÇİZİM ARAÇLARI (YENİ) ---
    const [activeTool, setActiveTool] = useState('cursor'); // cursor, marker, eraser, laser, line, circle, cone
    const [drawingColor, setDrawingColor] = useState('#ff4d4d');
    const [canvasSize, setCanvasSize] = useState({ w: 4000, h: 4000 }); // Varsayılan büyük çizim alanı
    
    const mainCanvasRef = useRef(null); // Kalıcı çizimler (Marker, Silgi)
    const overlayCanvasRef = useRef(null); // Geçici çizimler (Lazer, Koniler)
    const isDrawingRef = useRef(false);
    const startPosRef = useRef({ x: 0, y: 0 });

    // --- GRID & TOKEN STATE'LERİ ---
    const [grid, setGrid] = useState({ isVisible: false, type: 'square', size: 60, rotation: 0, opacity: 0.5 });
    const [tokens, setTokens] = useState([]);
    const [draggedToken, setDraggedToken] = useState(null);
    const [tokenModal, setTokenModal] = useState({ isOpen: false, mode: 'create', data: { id: null, name: '', color: 'blue', size: 1, hp: '', maxHp: '', ac: '', speed: '', init: '' } });

    // --- OYUNCU (MOCK DATA) ---
    const [players, setPlayers] = useState([
        { id: 'p1', name: 'Elandor', charClass: 'Rogue', level: 4, species: 'Elf', playerName: 'Ahmet', stats: { Strength: 10, Dexterity: 18, Constitution: 12, Intelligence: 14, Wisdom: 10, Charisma: 14 }, proficiencies: { 'Dexterity-Stealth': true }, armorClass: 15, currentHp: 28, maxHp: 32, speed: 30, weapons: [{ id: 1, name: 'Rapier', damageDice: '1d8' }], spellSlots: { 1: { max: 0, used: 0 } }, spells: [], currency: { cp: 0, sp: 5, ep: 0, gp: 120, pp: 0 }, inventory: [], traits: { personality: 'Shadows are friends.' }, portrait: null },
        { id: 'p2', name: 'Thorgal', charClass: 'Barbarian', level: 4, species: 'Orc', playerName: 'Can', stats: { Strength: 20, Dexterity: 14, Constitution: 16, Intelligence: 8, Wisdom: 10, Charisma: 10 }, proficiencies: { 'Strength-Athletics': true }, armorClass: 16, currentHp: 45, maxHp: 45, speed: 40, weapons: [{ id: 1, name: 'Greataxe', damageDice: '1d12' }], spellSlots: { 1: { max: 0, used: 0 } }, spells: [], currency: { cp: 0, sp: 0, ep: 0, gp: 10, pp: 0 }, inventory: [], traits: { personality: 'SMASH!' }, portrait: null }
    ]);
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const calculateModifier = (score) => Math.floor((score - 10) / 2);

    useEffect(() => {
        if (isHudOpen && logContainerRef.current) logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }, [logs, isHudOpen]);

    // --- EVRENSEL SÜRÜKLEME (PAN & TOKEN) ---
    const handleGlobalMouseMove = (e) => {
        if (draggedToken) {
            setTokens(prev => prev.map(t => t.id === draggedToken.id ? { ...t, x: e.clientX - draggedToken.offsetX, y: e.clientY - draggedToken.offsetY } : t));
        } else if (draggedMedia) {
            const dx = (e.clientX - draggedMedia.lastX) / board.scale;
            const dy = (e.clientY - draggedMedia.lastY) / board.scale;
            setOnScreenMedia(prev => prev.map(m => m.id === draggedMedia.id ? { ...m, x: m.x + dx, y: m.y + dy } : m));
            setDraggedMedia(prev => ({ ...prev, lastX: e.clientX, lastY: e.clientY }));
        } else if (isDragging && !isCanvasLocked && activeTool === 'cursor') {
            setBoard(prev => ({ ...prev, x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }));
        }
    };
    const handleGlobalMouseUp = () => { setIsDragging(false); setDraggedToken(null); setDraggedMedia(null); };

    const handleMediaMouseDown = (e, media) => {
        if (activeTool !== 'cursor') return;
        e.stopPropagation();
        setDraggedMedia({ id: media.id, lastX: e.clientX, lastY: e.clientY });
    };

    // --- ÇİZİM MOTORU HANDLERS ---
    const handleCanvasMouseDown = (e) => {
    e.stopPropagation(); // Artık sadece çizim araçları seçiliyken tetiklenecek
    isDrawingRef.current = true;
    const pos = { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY };
    startPosRef.current = pos;

    if (['marker', 'eraser', 'laser'].includes(activeTool)) {
        const ctx = activeTool === 'laser' ? overlayCanvasRef.current.getContext('2d') : mainCanvasRef.current.getContext('2d');
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        ctx.strokeStyle = activeTool === 'eraser' ? 'rgba(0,0,0,1)' : drawingColor;
        ctx.lineWidth = activeTool === 'eraser' ? 40 : 6;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        // Silgi mantığı burada context üzerinden harika çalışır
        ctx.globalCompositeOperation = activeTool === 'eraser' ? 'destination-out' : 'source-over';
    }
};

    const handleCanvasMouseMove = (e) => {
        if (!isDrawingRef.current || activeTool === 'cursor') return;
        e.stopPropagation();

        const pos = { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY };
        const ctxMain = mainCanvasRef.current?.getContext('2d');
        const ctxOverlay = overlayCanvasRef.current?.getContext('2d');
        if (!ctxMain || !ctxOverlay) return;

        if (['marker', 'eraser'].includes(activeTool)) {
            ctxMain.lineTo(pos.x, pos.y);
            ctxMain.stroke();
        } else if (activeTool === 'laser') {
            ctxOverlay.lineTo(pos.x, pos.y);
            ctxOverlay.stroke();
        } else if (['line', 'circle', 'cone'].includes(activeTool)) {
            // Ölçüm: Her harekette temizle ve yeniden çiz
            ctxOverlay.clearRect(0, 0, canvasSize.w, canvasSize.h);
            ctxOverlay.beginPath();
            ctxOverlay.strokeStyle = drawingColor;
            ctxOverlay.lineWidth = 4;
            ctxOverlay.fillStyle = drawingColor + '40'; // Hafif saydam dolgu

            const dx = pos.x - startPosRef.current.x;
            const dy = pos.y - startPosRef.current.y;
            const distancePx = Math.sqrt(dx*dx + dy*dy);
            const distanceFt = ((distancePx / grid.size) * 5).toFixed(0); // D&D Ölçüsü (1 kare = 5ft)

            if (activeTool === 'line') {
                ctxOverlay.moveTo(startPosRef.current.x, startPosRef.current.y);
                ctxOverlay.lineTo(pos.x, pos.y);
                ctxOverlay.stroke();
                ctxOverlay.fillStyle = '#fff'; ctxOverlay.font = 'bold 24px Arial';
                ctxOverlay.fillText(`${distanceFt} ft`, pos.x + 15, pos.y + 15);
            } else if (activeTool === 'circle') {
                ctxOverlay.arc(startPosRef.current.x, startPosRef.current.y, distancePx, 0, Math.PI * 2);
                ctxOverlay.stroke(); ctxOverlay.fill();
                ctxOverlay.fillStyle = '#fff'; ctxOverlay.font = 'bold 24px Arial';
                ctxOverlay.fillText(`Rad: ${distanceFt} ft`, pos.x + 15, pos.y + 15);
            } else if (activeTool === 'cone') {
                const angle = Math.atan2(dy, dx);
                const coneAngle = Math.PI / 6; // 30 derece koni genişliği
                ctxOverlay.moveTo(startPosRef.current.x, startPosRef.current.y);
                ctxOverlay.lineTo(startPosRef.current.x + Math.cos(angle - coneAngle) * distancePx, startPosRef.current.y + Math.sin(angle - coneAngle) * distancePx);
                ctxOverlay.arc(startPosRef.current.x, startPosRef.current.y, distancePx, angle - coneAngle, angle + coneAngle);
                ctxOverlay.lineTo(startPosRef.current.x, startPosRef.current.y);
                ctxOverlay.stroke(); ctxOverlay.fill();
                ctxOverlay.fillStyle = '#fff'; ctxOverlay.font = 'bold 24px Arial';
                ctxOverlay.fillText(`${distanceFt} ft`, pos.x + 15, pos.y + 15);
            }
        }
    };

    const handleCanvasMouseUp = () => {
        if (!isDrawingRef.current) return;
        isDrawingRef.current = false;
        
        // Geçici araçlarsa (Lazer ve Ölçümler) 1.5 saniye sonra ekranı temizle
        if (['laser', 'line', 'circle', 'cone'].includes(activeTool)) {
            setTimeout(() => {
                if (overlayCanvasRef.current) overlayCanvasRef.current.getContext('2d').clearRect(0, 0, canvasSize.w, canvasSize.h);
            }, 1500);
        }
    };

    const handleClearDrawings = () => {
        if(mainCanvasRef.current) mainCanvasRef.current.getContext('2d').clearRect(0, 0, canvasSize.w, canvasSize.h);
        if(overlayCanvasRef.current) overlayCanvasRef.current.getContext('2d').clearRect(0, 0, canvasSize.w, canvasSize.h);
        addLog("Map drawings cleared.", true);
    };

    // --- GELİŞMİŞ TOKEN HANDLERS ---
    const handleTokenMouseDown = (e, token) => {
        e.stopPropagation();
        setDraggedToken({ id: token.id, offsetX: e.clientX - token.x, offsetY: e.clientY - token.y });
    };

    const openTokenModal = (mode, tokenData = null) => {
        setTokenModal({ isOpen: true, mode, data: tokenData ? { ...tokenData } : { id: null, name: '', color: 'blue', size: 1, hp: '', maxHp: '', ac: '', speed: '', init: '' } });
    };
    const closeTokenModal = () => setTokenModal({ isOpen: false, mode: 'create', data: {} });

    const saveToken = () => {
        if (tokenModal.mode === 'create') setTokens(prev => [...prev, { ...tokenModal.data, id: Date.now(), x: window.innerWidth / 2, y: window.innerHeight / 2 }]);
        else setTokens(prev => prev.map(t => t.id === tokenModal.data.id ? { ...tokenModal.data, x: t.x, y: t.y } : t));
        closeTokenModal();
    };
    const removeToken = () => { setTokens(prev => prev.filter(t => t.id !== tokenModal.data.id)); closeTokenModal(); };
    const handleAddQuickToken = (color) => { setTokens(prev => [...prev, { id: Date.now(), color, size: 1, name: '', hp: '', maxHp: '', ac: '', speed: '', init: '', x: window.innerWidth / 2, y: window.innerHeight / 2 }]); };
    const handleClearTokens = () => { setTokens([]); };
    const handleAddPlayerToken = (p) => {
        setTokens(prev => [...prev, { id: Date.now() + Math.random(), color: 'blue', size: 1, name: p.name, hp: p.currentHp, maxHp: p.maxHp, ac: p.armorClass, speed: p.speed, init: calculateModifier(p.stats.Dexterity), x: window.innerWidth / 2, y: window.innerHeight / 2 }]);
    };

    // --- MEDYA HANDLERS ---
    const handleFileUpload = (e) => {
        const file = e.target.files[0]; if (!file) return;
        const url = URL.createObjectURL(file); const newItem = { id: Date.now(), name: file.name, url };
        if (bottomTab === 'maps') setMaps(prev => [...prev, newItem]); else setImages(prev => [...prev, newItem]);
        e.target.value = null; 
    };

    const handleMediaDelete = (id, e) => {
    e.stopPropagation();
    if(!window.confirm("Silmek istediğine emin misin?")) return;
    
    // Bellek temizliği (Memory Leak Fix)
    const itemToDelete = bottomTab === 'maps' ? maps.find(m => m.id === id) : images.find(img => img.id === id);
    if (itemToDelete) URL.revokeObjectURL(itemToDelete.url);

    if (bottomTab === 'maps') setMaps(prev => prev.filter(m => m.id !== id)); 
    else setImages(prev => prev.filter(img => img.id !== id));
    
    setOnScreenMedia(prev => prev.filter(m => m.mediaId !== id));
};

    const handleShowOnCanvas = (item, type) => { 
        setOnScreenMedia(prev => [...prev, {
            id: Date.now() + Math.random(),
            mediaId: item.id,
            url: item.url,
            x: 2000 - 300, 
            y: 2000 - 300
        }]);
        setIsCanvasLocked(false);
        setActiveTool('cursor');
    };

    const handleCanvasTransform = (action) => {
        if (isCanvasLocked) return;
        setBoard(prev => {
            let { scale, rotation, x, y } = prev;
            if (action === 'zoomIn') scale = Math.min(10, scale + 0.1);
            if (action === 'zoomOut') scale = Math.max(0.1, scale - 0.1);
            if (action === 'rotateLeft') rotation -= 15;
            if (action === 'rotateRight') rotation += 15;
            if (action === 'reset') { scale = 1; rotation = 0; x = 0; y = 0; }
            return { ...prev, scale, rotation, x, y };
        });
    };

    // --- ZAR LOG HANDLERS ---
    const handleCopyCode = () => { navigator.clipboard.writeText(gameCode); addLog(`Game Code copied.`, true); };
    const addLog = (text, isHidden = false) => { setLogs(prev => [...prev, { id: Date.now(), text, isHidden }]); };
    const handleLongRest = () => { if(window.confirm("Restore all HP?")) addLog("Party took a Long Rest.", false); };
    const handleRollDice = () => {
        let total = 0; let rolls = [];
        for(let i = 0; i < diceQty; i++) { let r = Math.floor(Math.random() * diceType) + 1; rolls.push(r); total += r; }
        addLog(`GM Rolled ${diceQty}d${diceType} 🎲 [${rolls.join(', ')}] = ${total}`, isHiddenRoll);
        if(!isHudOpen) setIsHudOpen(true);
    };

    return (
        <div className="gm-dashboard-wrapper" onMouseMove={handleGlobalMouseMove} onMouseUp={handleGlobalMouseUp} onMouseLeave={handleGlobalMouseUp}>
            
            {/* ================= ÇİZİM ARAÇLARI MENÜSÜ ================= */}
            <div className={`drawing-tools-menu ${isTopOpen ? 'top-open' : 'top-closed'} ${isDrawingMenuOpen ? 'expanded' : 'collapsed'}`}>
                <button type="button" className="tool-btn" style={{background: 'transparent', color: '#d4af37', padding: 0, margin: 0, border: 'none', width: '20px'}} onClick={() => setIsDrawingMenuOpen(!isDrawingMenuOpen)} title="Toggle Drawing Tools">
                    {isDrawingMenuOpen ? '▶' : '◀'}
                </button>
                {isDrawingMenuOpen && (
                    <>
                        <div className="tool-divider"></div>
                        <button type="button" className={`tool-btn ${activeTool === 'cursor' ? 'active' : ''}`} onClick={() => setActiveTool('cursor')} title="Move Map (Cursor)">👆</button>
                        <div className="tool-divider"></div>
                        <button type="button" className={`tool-btn ${activeTool === 'marker' ? 'active' : ''}`} onClick={() => setActiveTool('marker')} title="Draw (Marker)">🖍️</button>
                        <button type="button" className={`tool-btn ${activeTool === 'laser' ? 'active' : ''}`} onClick={() => setActiveTool('laser')} title="Laser Pointer (Fades)">⚡</button>
                        <button type="button" className={`tool-btn ${activeTool === 'line' ? 'active' : ''}`} onClick={() => setActiveTool('line')} title="Measure Line">📏</button>
                        <button type="button" className={`tool-btn ${activeTool === 'circle' ? 'active' : ''}`} onClick={() => setActiveTool('circle')} title="Measure Circle">⭕</button>
                        <button type="button" className={`tool-btn ${activeTool === 'cone' ? 'active' : ''}`} onClick={() => setActiveTool('cone')} title="Measure Cone">📐</button>
                        <button type="button" className={`tool-btn ${activeTool === 'eraser' ? 'active' : ''}`} onClick={() => setActiveTool('eraser')} title="Eraser">🧽</button>
                        <div className="tool-divider"></div>
                        <input type="color" className="color-picker-tool" value={drawingColor} onChange={(e) => setDrawingColor(e.target.value)} title="Color" />
                        <button type="button" className="tool-btn danger" onClick={handleClearDrawings} title="Clear All Drawings">🗑️</button>
                    </>
                )}
            </div>

            {/* ================= LAYER 0: MAP, ÇİZİM & TOKENS ================= */}
            <div className="layer-map">
                <div className="canvas-view-area">
                    {/* KRAL: Resim ve Çizimler aynı grupta beraber hareket eder */}
                    <div 
                        className="canvas-transform-group"
                        style={{
                            width: canvasSize.w, height: canvasSize.h,
                            transform: `translate(${board.x}px, ${board.y}px) scale(${board.scale}) rotate(${board.rotation}deg)`,
                            cursor: activeTool === 'cursor' ? (isDragging ? 'grabbing' : 'grab') : 'crosshair'
                        }}
                    >
                        {/* Haritalar ve Resimler */}
                        {onScreenMedia.map(media => (
                            <div key={media.id} style={{ position: 'absolute', left: media.x, top: media.y, cursor: activeTool === 'cursor' ? 'grab' : 'inherit' }}>
                                <button type="button" className="close-media-btn" onClick={(e) => { e.stopPropagation(); setOnScreenMedia(prev => prev.filter(m => m.id !== media.id)); }} title="Remove from board" style={{position:'absolute', top:-15, right:-15, background:'rgba(255,77,77,0.8)', color:'#fff', border:'none', borderRadius:'50%', width:'30px', height:'30px', cursor:'pointer', zIndex:10}}>✕</button>
                                <img src={media.url} alt="Media" draggable="false" style={{maxWidth: '800px', maxHeight: '800px', display: 'block'}} onMouseDown={(e) => handleMediaMouseDown(e, media)} />
                            </div>
                        ))}
                        
                        {/* Kalıcı Çizimler (Fırça, Silgi) */}
                        <canvas ref={mainCanvasRef} width={canvasSize.w} height={canvasSize.h} className="drawing-canvas main-canvas" />
                        
                        {/* Geçici Çizimler (Lazer, Koni vs.) & Event Dinleyici */}
                        <canvas 
                            ref={overlayCanvasRef} width={canvasSize.w} height={canvasSize.h} className="drawing-canvas overlay-canvas"
                            onMouseDown={(e) => {
                                if (activeTool === 'cursor' && !isCanvasLocked) {
                                    setIsDragging(true);
                                    setDragStart({ x: e.clientX - board.x, y: e.clientY - board.y });
                                } else {
                                    handleCanvasMouseDown(e);
                                }
                            }} 
                            onMouseMove={handleCanvasMouseMove} onMouseUp={handleCanvasMouseUp} onMouseOut={handleCanvasMouseUp}
                        />
                    </div>

                    {/* Harita Kontrolleri ve Kilit Sistemi */}
                    {onScreenMedia.length > 0 && (
                        <div className="canvas-controls">
                            <button type="button" className={`lock-canvas-btn ${isCanvasLocked ? 'locked' : 'unlocked'}`} onClick={() => setIsCanvasLocked(!isCanvasLocked)} title="Lock/Unlock Map">
                                {isCanvasLocked ? '🔒 LOCKED' : '🔓 UNLOCKED'}
                            </button>
                            
                            {!isCanvasLocked && (
                                <>
                                    <div className="zoom-ctrls"><button type="button" onClick={() => handleCanvasTransform('zoomOut')}>[-]</button><span>Zoom: {board.scale.toFixed(1)}x</span><button type="button" onClick={() => handleCanvasTransform('zoomIn')}>[+]</button></div>
                                    <div className="rotate-ctrls"><button type="button" onClick={() => handleCanvasTransform('rotateLeft')}>↺</button><span>Free Rotate</span><button type="button" onClick={() => handleCanvasTransform('rotateRight')}>↻</button></div>
                                    <button type="button" className="reset-canvas-btn" onClick={() => handleCanvasTransform('reset')}>↩ RESET</button>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* GRID */}
                {grid.isVisible && (
                    <div className="grid-overlay" style={{ opacity: grid.opacity, transform: `rotate(${grid.rotation}deg)`, pointerEvents: 'none' }}>
                        <svg width="100%" height="100%">
                            <defs>
                                <pattern id="squareGrid" width={grid.size} height={grid.size} patternUnits="userSpaceOnUse"><path d={`M ${grid.size} 0 L 0 0 0 ${grid.size}`} fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1"/></pattern>
                                <pattern id="hexGrid" width={grid.size * Math.sqrt(3)} height={grid.size * 1.5} patternUnits="userSpaceOnUse"><path d={`M ${grid.size * Math.sqrt(3)/2} ${grid.size * 0.5} l ${grid.size * Math.sqrt(3)/2} ${-grid.size * 0.25} l 0 ${-grid.size * 0.5} l ${-grid.size * Math.sqrt(3)/2} ${-grid.size * 0.25} l ${-grid.size * Math.sqrt(3)/2} ${grid.size * 0.25} l 0 ${grid.size * 0.5} z`} fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1"/></pattern>
                            </defs>
                            <rect width="200%" height="200%" x="-50%" y="-50%" fill={`url(#${grid.type === 'square' ? 'squareGrid' : 'hexGrid'})`} />
                        </svg>
                    </div>
                )}

                {/* TOKENLER */}
                {tokens.map(token => (
                    <div 
                        key={token.id} className={`map-token color-${token.color} ${draggedToken?.id === token.id ? 'dragging' : ''}`}
                        style={{ 
                            left: token.x, top: token.y, 
                            width: grid.size * token.size * 0.85, height: grid.size * token.size * 0.85,
                            pointerEvents: activeTool !== 'cursor' ? 'none' : 'auto'
                        }}
                        onMouseDown={(e) => handleTokenMouseDown(e, token)} onDoubleClick={() => openTokenModal('edit', token)} title="Double-click to edit"
                    >
                        {token.maxHp && (<div className="token-hp-bar"><div className="token-hp-fill" style={{ width: `${Math.min(100, Math.max(0, (token.hp / token.maxHp) * 100))}%` }}></div></div>)}
                        {token.name && <span className="token-name-tag">{token.name}</span>}
                    </div>
                ))}
            </div>

            {/* ================= LAYER 1: CHARACTER SHEET ================= */}
            {selectedPlayer && (
                <div className="layer-character-sheet fade-in">
                    <div className="sheet-overlay-header"><h2>{selectedPlayer.name}'s Sheet</h2><button type="button" className="close-sheet-btn" onClick={() => setSelectedPlayer(null)}>✕ CLOSE</button></div>
                    <div className="sheet-scroll-area"><SummaryStep character={selectedPlayer} calculateModifier={calculateModifier} /></div>
                </div>
            )}

            {/* ================= LAYER 2: SOL MENÜ (Oyuncular) ================= */}
            <div className={`layer-sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
                <button type="button" className="sidebar-toggle-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>{isSidebarOpen ? '◀' : '▶'}</button>
                <div className="sidebar-content">
                    <h3 className="sidebar-title">PARTY MEMBERS</h3>
                    <div className="player-list">
                        {players.map(p => (
                            <div key={p.id} className={`player-card ${selectedPlayer?.id === p.id ? 'active' : ''}`} onClick={() => setSelectedPlayer(p)}>
                                <div className="p-card-header"><strong>{p.name}</strong><span className="p-hp-tag">HP: {p.currentHp}/{p.maxHp}</span></div>
                                <div className="p-card-sub">Lvl {p.level} {p.charClass}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ================= LAYER 3: ÜST MENÜ ================= */}
            <div className={`layer-top-menu ${isTopOpen ? 'open' : 'closed'}`}>
                <div className="top-menu-content">
                    <div className="top-left">
                        <button type="button" className="exit-btn" onClick={() => navigate('/host-game')}>🚪 EXIT</button>
                        <div className="game-code-box" onClick={handleCopyCode} title="Click to Copy">JOIN CODE: <span className="highlight-code">{gameCode}</span></div>
                        <div className="player-count-badge">👥 Players: {players.length}</div>
                    </div>
                    <div className="top-right">
                        <button type="button" className="action-btn combat-btn" onClick={() => addLog("⚔️ COMBAT INITIATED!", false)}>START COMBAT</button>
                        <button type="button" className="action-btn rest-btn" onClick={handleLongRest}>🏕️ LONG REST</button>
                    </div>
                </div>
                <div className="menu-handle top-handle" onClick={() => setIsTopOpen(!isTopOpen)}>{isTopOpen ? '▲' : '▼'}</div>
            </div>

            {/* ================= LAYER 3: ALT MENÜ (Medya & Grid) ================= */}
            <div className={`layer-bottom-menu ${isBottomOpen ? 'open' : 'closed'}`}>
                <div className="menu-handle bottom-handle" onClick={(e) => { e.stopPropagation(); setIsBottomOpen(!isBottomOpen); }}>
                    {isBottomOpen ? '▼' : '▲'} MEDIA & GRID
                </div>
                <div className="bottom-menu-content">
                    <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} />
                    <div className="media-tabs-column">
                        <div className="tab-buttons">
                            <button type="button" className={`tab-btn ${bottomTab === 'maps' ? 'active' : ''}`} onClick={() => setBottomTab('maps')}>🗺️ MAPS</button>
                            <button type="button" className={`tab-btn ${bottomTab === 'images' ? 'active' : ''}`} onClick={() => setBottomTab('images')}>🖼️ IMAGES</button>
                        </div>
                        <button type="button" className={`tab-btn ${bottomTab === 'grid' ? 'active' : ''}`} onClick={() => setBottomTab('grid')} style={{borderColor: '#7ec8ff', color: '#7ec8ff'}}>📐 GRID & TOKENS</button>
                        {(bottomTab === 'maps' || bottomTab === 'images') && (<button type="button" className="upload-media-btn" onClick={() => fileInputRef.current?.click()}>+ UPLOAD {bottomTab === 'maps' ? 'MAP' : 'IMAGE'}</button>)}
                    </div>
                    <div className="media-gallery">
                        {bottomTab === 'grid' ? (
                            <div className="grid-token-panel">
                                <div className="grid-settings-box">
                                    <h4>GRID SETTINGS</h4>
                                    <div className="grid-controls-row">
                                        <label>Show: <input type="checkbox" checked={grid.isVisible} onChange={(e) => setGrid({...grid, isVisible: e.target.checked})} /></label>
                                        <label>Type: <select value={grid.type} onChange={(e) => setGrid({...grid, type: e.target.value})}><option value="square">Square</option><option value="hex">Hexagon</option></select></label>
                                        <label>Size: <input type="range" min="20" max="150" value={grid.size} onChange={(e) => setGrid({...grid, size: parseInt(e.target.value)})} /></label>
                                        <label>Rotate: <input type="range" min="-180" max="180" value={grid.rotation} onChange={(e) => setGrid({...grid, rotation: parseInt(e.target.value)})} /></label>
                                    </div>
                                </div>
                                <div className="token-spawner-box">
                                    <h4>SPAWN TOKENS</h4>
                                    <div className="token-buttons-row">
                                        <button type="button" className="token-btn blue" onClick={() => handleAddQuickToken('blue')}></button>
                                        <button type="button" className="token-btn red" onClick={() => handleAddQuickToken('red')}></button>
                                        <button type="button" className="token-btn green" onClick={() => handleAddQuickToken('green')}></button>
                                        <button type="button" className="token-btn yellow" onClick={() => handleAddQuickToken('yellow')}></button>
                                        <button type="button" className="token-btn purple" onClick={() => handleAddQuickToken('purple')}></button>
                                        <button type="button" className="token-btn dark" onClick={() => handleAddQuickToken('dark')}></button>
                                        <button type="button" className="custom-token-btn" onClick={() => openTokenModal('create')}>+ CUSTOM</button>
                                        <button type="button" className="clear-tokens-btn" onClick={handleClearTokens}>CLEAR</button>
                                    </div>
                                    <h4 style={{marginTop: '15px', color: '#d4af37', fontFamily: 'Cinzel', fontSize: '13px', borderBottom: '1px solid rgba(212,175,55,0.2)', paddingBottom: '5px'}}>PLAYER TOKENS</h4>
                                    <div className="token-buttons-row">
                                        {players.map(p => (
                                            <button key={p.id} type="button" className="custom-token-btn" style={{padding: '4px 10px'}} onClick={() => handleAddPlayerToken(p)}>{p.name}</button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <>
                                {bottomTab === 'maps' && maps.length === 0 && <div className="empty-media">No maps uploaded yet.</div>}
                                {bottomTab === 'images' && images.length === 0 && <div className="empty-media">No images uploaded yet.</div>}
                                {(bottomTab === 'maps' ? maps : images).map(item => (
                                    <div className="media-card" key={item.id}>
                                        <button type="button" className="delete-media-btn" onClick={(e) => handleMediaDelete(item.id, e)}>🗑️</button>
                                        <img src={item.url} alt={item.name} />
                                        <div className="media-card-overlay"><span className="media-name">{item.name}</span><button type="button" className="show-canvas-btn" onClick={() => handleShowOnCanvas(item, bottomTab)}>DISPLAY</button></div>
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* ================= LAYER 4: EN ÜST KATMAN (HUD: Log & Zar) ================= */}
            <button type="button" className={`hud-fab-btn ${!isHudOpen ? 'visible' : 'hidden'} ${isBottomOpen ? 'shifted' : ''}`} onClick={(e) => { e.stopPropagation(); setIsHudOpen(true); }}>🎲 DICE & LOGS</button>
            <div className={`layer-hud ${isHudOpen ? 'visible' : 'hidden'} ${isBottomOpen ? 'shifted' : ''}`}>
                <div className="hud-header-bar"><span>ACTION CENTER</span><button type="button" className="hud-close-btn" onClick={(e) => { e.stopPropagation(); setIsHudOpen(false); }}>✕</button></div>
                <div className="hud-content">
                    <div className="dice-panel">
                        <div className="dice-controls">
                            <input type="number" min="1" max="99" value={diceQty} onChange={(e) => setDiceQty(e.target.value)} /><span>d</span>
                            <select value={diceType} onChange={(e) => setDiceType(e.target.value)}><option value={4}>4</option><option value={6}>6</option><option value={8}>8</option><option value={10}>10</option><option value={12}>12</option><option value={20}>20</option><option value={100}>100</option></select>
                        </div>
                        <div className="dice-actions"><label className="hidden-roll-toggle"><input type="checkbox" checked={isHiddenRoll} onChange={(e) => setIsHiddenRoll(e.target.checked)} /><span className="toggle-label">Hidden</span></label><button type="button" className="roll-btn" onClick={handleRollDice}>ROLL 🎲</button></div>
                    </div>
                    <div className="log-panel">
                        <div className="log-header">COMBAT & EVENT LOG</div>
                        <div className="log-messages" ref={logContainerRef}>{logs.map(log => (<div key={log.id} className={`log-entry ${log.isHidden ? 'hidden-log' : 'public-log'}`}>{log.isHidden && <span className="hidden-icon">👁️‍🗨️</span>}{log.text}</div>))}</div>
                    </div>
                </div>
            </div>

            {/* ================= TOKEN EDITOR MODAL (En Üst Katman) ================= */}
            {tokenModal.isOpen && (
                <div className="modal-overlay fade-in" style={{zIndex: 1000}}>
                    <div className="modal-content" style={{maxWidth: '400px'}}>
                        <h2>{tokenModal.mode === 'create' ? 'Create Custom Token' : 'Edit Token'}</h2>
                        
                        <div className="host-input-group"><label>Token Name</label><input type="text" placeholder="e.g. Goblin Boss" value={tokenModal.data.name} onChange={(e) => setTokenModal({...tokenModal, data: {...tokenModal.data, name: e.target.value}})} /></div>
                        
                        <div className="grid-controls-row" style={{marginBottom: '15px'}}>
                            <label>Size: <select value={tokenModal.data.size} onChange={(e) => setTokenModal({...tokenModal, data: {...tokenModal.data, size: parseFloat(e.target.value)}})}><option value={1}>1x1 (Medium/Small)</option><option value={2}>2x2 (Large)</option><option value={3}>3x3 (Huge)</option><option value={4}>4x4 (Gargantuan)</option></select></label>
                            <label>Color: <select value={tokenModal.data.color} onChange={(e) => setTokenModal({...tokenModal, data: {...tokenModal.data, color: e.target.value}})}><option value="blue">Blue (Player)</option><option value="red">Red (Enemy)</option><option value="dark">Dark (Boss)</option><option value="green">Green (Ally)</option><option value="yellow">Yellow</option><option value="purple">Purple</option></select></label>
                        </div>

                        <div className="grid-controls-row" style={{marginBottom: '15px'}}>
                            <label>HP: <input type="number" placeholder="Current" value={tokenModal.data.hp} onChange={(e) => setTokenModal({...tokenModal, data: {...tokenModal.data, hp: e.target.value}})} /></label>
                            <label>Max HP: <input type="number" placeholder="Max" value={tokenModal.data.maxHp} onChange={(e) => setTokenModal({...tokenModal, data: {...tokenModal.data, maxHp: e.target.value}})} /></label>
                        </div>

                        <div className="grid-controls-row" style={{marginBottom: '15px'}}>
                            <label>Armor Class (AC): <input type="number" value={tokenModal.data.ac} onChange={(e) => setTokenModal({...tokenModal, data: {...tokenModal.data, ac: e.target.value}})} /></label>
                            <label>Speed: <input type="number" value={tokenModal.data.speed} onChange={(e) => setTokenModal({...tokenModal, data: {...tokenModal.data, speed: e.target.value}})} /></label>
                        </div>
                        
                        <div className="grid-controls-row"><label>Initiative Bonus: <input type="number" value={tokenModal.data.init} onChange={(e) => setTokenModal({...tokenModal, data: {...tokenModal.data, init: e.target.value}})} /></label></div>

                        <div className="modal-actions">
                            {tokenModal.mode === 'edit' && <button type="button" className="modal-delete-btn" style={{marginRight: 'auto'}} onClick={removeToken}>DELETE</button>}
                            <button type="button" className="modal-cancel-btn" onClick={closeTokenModal}>CANCEL</button>
                            <button type="button" className="modal-confirm-btn" onClick={saveToken}>SAVE TOKEN</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default GMDashboard;