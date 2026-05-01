import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SummaryStep from '../CharacterSheet/SummaryStep';
import socket from '../../socket';
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
    const gameCode = "EPIC2026"; // TODO: Backend'den dinamik olarak alınacak

    // Socket bağlantısı: GM odayı başlatır
    useEffect(() => {
        socket.connect();
        socket.emit('join_room', { gameCode, playerName: 'GM' });
        return () => {
            socket.emit('leave_room', { gameCode, playerName: 'GM' });
            socket.disconnect();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
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
    const clearDrawingsTimeoutRef = useRef(null);
    const animationFrameRef = useRef(null);
    const lastMousePos = useRef({ x: 0, y: 0 });

    useEffect(() => {
        // Tool değişirse varolan zamanlayıcıları temizle
        if (clearDrawingsTimeoutRef.current) {
            clearTimeout(clearDrawingsTimeoutRef.current);
            clearDrawingsTimeoutRef.current = null;
        }
    }, [activeTool]);

    // --- BESTIARY STATE'LERİ ---
    const DEFAULT_BESTIARY = [
        { id: 'def_1', name: 'Goblin', color: 'green', size: 1, hp: 7, maxHp: 7, ac: 15, speed: 30, init: 2, statuses: [] },
        { id: 'def_2', name: 'Orc', color: 'red', size: 1, hp: 15, maxHp: 15, ac: 13, speed: 30, init: 1, statuses: [] },
        { id: 'def_3', name: 'Skeleton', color: 'dark', size: 1, hp: 13, maxHp: 13, ac: 13, speed: 30, init: 2, statuses: [] },
        { id: 'def_4', name: 'Bandit', color: 'yellow', size: 1, hp: 11, maxHp: 11, ac: 12, speed: 30, init: 1, statuses: [] },
        { id: 'def_5', name: 'Young Dragon', color: 'red', size: 2, hp: 130, maxHp: 130, ac: 18, speed: 40, init: 4, statuses: [] },
    ];
    const [bestiaryModalOpen, setBestiaryModalOpen] = useState(false);
    const [bestiarySearch, setBestiarySearch] = useState('');
    const [bestiaryTab, setBestiaryTab] = useState('default');
    const [customMonsters, setCustomMonsters] = useState(() => {
        const saved = localStorage.getItem('gm_custom_monsters');
        return saved ? JSON.parse(saved) : [];
    });

    // --- GRID & TOKEN STATE'LERİ ---
    const [grid, setGrid] = useState({ isVisible: false, type: 'square', size: 60, rotation: 0, opacity: 0.5 });
    const [tokens, setTokens] = useState([]);
    const [draggedToken, setDraggedToken] = useState(null);
    const [tokenModal, setTokenModal] = useState({ isOpen: false, mode: 'create', data: { id: null, name: '', color: 'blue', size: 1, hp: '', maxHp: '', ac: '', speed: '', init: '', statuses: [], isHidden: false }, statusDurationInput: '' });

    // --- SAVAŞ (COMBAT) STATE'LERİ ---
    const [combatState, setCombatState] = useState({ isActive: false, round: 1, currentTurnIndex: 0, secondsPassed: 0 });

    // --- OYUNCU (MOCK DATA) ---
    const [players, setPlayers] = useState([
        { id: 'p1', name: 'Elandor', charClass: 'Rogue', level: 4, species: 'Elf', playerName: 'Ahmet', stats: { Strength: 10, Dexterity: 18, Constitution: 12, Intelligence: 14, Wisdom: 10, Charisma: 14 }, proficiencies: { 'Dexterity-Stealth': true }, armorClass: 15, currentHp: 28, maxHp: 32, speed: 30, weapons: [{ id: 1, name: 'Rapier', damageDice: '1d8' }], spellSlots: { 1: { max: 0, used: 0 } }, spells: [], currency: { cp: 0, sp: 5, ep: 0, gp: 120, pp: 0 }, inventory: [], traits: { personality: 'Shadows are friends.' }, portrait: null },
        { id: 'p2', name: 'Thorgal', charClass: 'Barbarian', level: 4, species: 'Orc', playerName: 'Can', stats: { Strength: 20, Dexterity: 14, Constitution: 16, Intelligence: 8, Wisdom: 10, Charisma: 10 }, proficiencies: { 'Strength-Athletics': true }, armorClass: 16, currentHp: 45, maxHp: 45, speed: 40, weapons: [{ id: 1, name: 'Greataxe', damageDice: '1d12' }], spellSlots: { 1: { max: 0, used: 0 } }, spells: [], currency: { cp: 0, sp: 0, ep: 0, gp: 10, pp: 0 }, inventory: [], traits: { personality: 'SMASH!' }, portrait: null }
    ]);
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const [selectedNPC, setSelectedNPC] = useState(null);
    const calculateModifier = (score) => Math.floor((score - 10) / 2);

    useEffect(() => {
        if (isHudOpen && logContainerRef.current) logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }, [logs, isHudOpen]);

    // --- EVRENSEL SÜRÜKLEME (PAN & TOKEN) ---
    const handleGlobalMouseMove = (e) => {
        if (!draggedToken && !draggedMedia && !isDragging) return;
        
        lastMousePos.current = { x: e.clientX, y: e.clientY };
        
        if (!animationFrameRef.current) {
            animationFrameRef.current = requestAnimationFrame(() => {
                const clientX = lastMousePos.current.x;
                const clientY = lastMousePos.current.y;
                
                if (draggedToken) {
                    setTokens(prev => prev.map(t => t.id === draggedToken.id ? { ...t, x: clientX - draggedToken.offsetX, y: clientY - draggedToken.offsetY } : t));
                } else if (draggedMedia) {
                    setDraggedMedia(prev => {
                        if (!prev) return prev;
                        const dx = (clientX - prev.lastX) / board.scale;
                        const dy = (clientY - prev.lastY) / board.scale;
                        setOnScreenMedia(prevMedia => prevMedia.map(m => m.id === prev.id ? { ...m, x: m.x + dx, y: m.y + dy } : m));
                        return { ...prev, lastX: clientX, lastY: clientY };
                    });
                } else if (isDragging && !isCanvasLocked && activeTool === 'cursor') {
                    setBoard(prev => ({ ...prev, x: clientX - dragStart.x, y: clientY - dragStart.y }));
                }
                animationFrameRef.current = null;
            });
        }
    };

    const handleGlobalMouseUp = () => { 
        setIsDragging(false); 
        setDraggedToken(null); 
        setDraggedMedia(null); 
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
    };

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
            if (clearDrawingsTimeoutRef.current) clearTimeout(clearDrawingsTimeoutRef.current);
            clearDrawingsTimeoutRef.current = setTimeout(() => {
                if (overlayCanvasRef.current) overlayCanvasRef.current.getContext('2d').clearRect(0, 0, canvasSize.w, canvasSize.h);
                clearDrawingsTimeoutRef.current = null;
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
        setTokenModal({ isOpen: true, mode, data: tokenData ? { ...tokenData } : { id: null, name: '', color: 'blue', size: 1, hp: '', maxHp: '', ac: '', speed: '', init: '', statuses: [], isHidden: false } });
    };
    const closeTokenModal = () => setTokenModal({ isOpen: false, mode: 'create', data: {} });

    const saveToken = () => {
        if (tokenModal.mode === 'create') setTokens(prev => [...prev, { ...tokenModal.data, id: Date.now(), statuses: tokenModal.data.statuses || [], x: window.innerWidth / 2, y: window.innerHeight / 2 }]);
        else setTokens(prev => prev.map(t => t.id === tokenModal.data.id ? { ...t, ...tokenModal.data } : t));
        closeTokenModal();
    };
    const removeToken = () => { 
        const tokenId = tokenModal.data.id;
        const indexToRemove = tokens.findIndex(t => t.id === tokenId);
        
        setTokens(prev => prev.filter(t => t.id !== tokenId)); 
        
        if (combatState.isActive && indexToRemove !== -1) {
            setCombatState(prevCombat => {
                let newIndex = prevCombat.currentTurnIndex;
                if (indexToRemove < prevCombat.currentTurnIndex) {
                    newIndex -= 1;
                } else if (indexToRemove === prevCombat.currentTurnIndex) {
                    if (newIndex >= tokens.length - 1) { 
                        newIndex = 0;
                    }
                }
                return { ...prevCombat, currentTurnIndex: Math.max(0, newIndex) };
            });
        }
        
        closeTokenModal(); 
    };
    
    // --- BESTIARY HANDLERS ---
    const saveToBestiary = () => {
        if (!tokenModal.data.name) {
            alert("Lütfen kaydetmeden önce yaratığa bir isim verin!");
            return;
        }
        const newMonster = { ...tokenModal.data, id: 'cust_' + Date.now() };
        const updated = [...customMonsters, newMonster];
        setCustomMonsters(updated);
        localStorage.setItem('gm_custom_monsters', JSON.stringify(updated));
        alert(`${newMonster.name} kütüphaneye kaydedildi!`);
    };

    const spawnFromBestiary = (monster) => {
        setTokens(prev => [...prev, { ...monster, id: Date.now() + Math.random(), x: window.innerWidth / 2, y: window.innerHeight / 2 }]);
        setBestiaryModalOpen(false);
    };

    const deleteCustomMonster = (id, e) => {
        e.stopPropagation();
        if(!window.confirm("Bu yaratığı kütüphaneden silmek istediğinize emin misiniz?")) return;
        const updated = customMonsters.filter(m => m.id !== id);
        setCustomMonsters(updated);
        localStorage.setItem('gm_custom_monsters', JSON.stringify(updated));
    };

    const handleAddQuickToken = (color) => { setTokens(prev => [...prev, { id: Date.now(), color, size: 1, name: '', hp: '', maxHp: '', ac: '', speed: '', init: '', statuses: [], x: window.innerWidth / 2, y: window.innerHeight / 2 }]); };
    const handleClearTokens = () => { setTokens([]); };
    const handleAddPlayerToken = (p) => {
        setTokens(prev => [...prev, { id: Date.now() + Math.random(), playerId: p.id, color: 'blue', size: 1, name: p.name, hp: p.currentHp, maxHp: p.maxHp, ac: p.armorClass, speed: p.speed, init: calculateModifier(p.stats.Dexterity), statuses: [], x: window.innerWidth / 2, y: window.innerHeight / 2 }]);
    };

    // --- COMBAT HANDLERS ---
    const handleStartCombat = () => {
        if (tokens.length === 0) {
            addLog("No tokens on board to start combat.", true);
            return;
        }
        
        let newTokens = [...tokens].map(t => {
            const initBonus = parseInt(t.init) || 0;
            const roll = Math.floor(Math.random() * 20) + 1;
            return { ...t, initiativeRoll: roll + initBonus };
        });
        
        newTokens.sort((a, b) => b.initiativeRoll - a.initiativeRoll);
        
        setTokens(newTokens);
        const newCombatState = { isActive: true, round: 1, currentTurnIndex: 0, secondsPassed: 0 };
        setCombatState(newCombatState);
        setIsSidebarOpen(true);
        addLog("⚔️ COMBAT INITIATED!", false);
        // Savaşı oyunculara bildir
        socket.emit('gm_combat_update', { gameCode, combatState: newCombatState, tokens: newTokens });
    };

    const handleEndCombat = () => {
        const endedCombat = { isActive: false, round: 1, currentTurnIndex: 0, secondsPassed: 0 };
        setCombatState(endedCombat);
        addLog("🛡️ COMBAT ENDED.", false);
        socket.emit('gm_combat_update', { gameCode, combatState: endedCombat, tokens });
    };

    const handleNextTurn = () => {
        // Sırası biten tokenin süreli durumlarını azalt
        const endingToken = tokens[combatState.currentTurnIndex];
        if (endingToken && endingToken.statuses && endingToken.statuses.length > 0) {
            setTokens(prev => prev.map((t, idx) => {
                if (idx !== combatState.currentTurnIndex) return t;
                const updatedStatuses = t.statuses
                    .map(st => {
                        if (typeof st === 'string') return st;
                        return { ...st, duration: st.duration - 1 };
                    })
                    .filter(st => {
                        if (typeof st === 'string') return true;
                        if (st.duration <= 0) {
                            addLog(`⏳ ${t.name}: ${st.name} has expired.`, false);
                            return false;
                        }
                        return true;
                    });
                return { ...t, statuses: updatedStatuses };
            }));
        }

        setCombatState(prev => {
            let nextIndex = prev.currentTurnIndex + 1;
            let nextRound = prev.round;
            let nextSeconds = prev.secondsPassed;
            
            if (nextIndex >= tokens.length) {
                nextIndex = 0;
                nextRound += 1;
                nextSeconds += 6;
                addLog(`End of Round ${prev.round}. Starting Round ${nextRound}.`, false);
            }
            
            return { ...prev, currentTurnIndex: nextIndex, round: nextRound, secondsPassed: nextSeconds };
        });
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
        // Haritayı oyunculara paylaş
        socket.emit('gm_map_update', { gameCode, mapUrl: item.url });
        addLog('🗺️ Harita oyunculara paylaşıldı.', false);
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
        const rollText = `GM Rolled ${diceQty}d${diceType} 🎲 [${rolls.join(', ')}] = ${total}`;
        addLog(rollText, isHiddenRoll);
        // Oyuncuların log paneline gönder
        socket.emit('dice_roll', { gameCode, playerName: 'GM', rollText, isHidden: isHiddenRoll });
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
                {tokens.map((token, idx) => (
                    <div 
                        key={token.id} className={`map-token color-${token.color} ${draggedToken?.id === token.id ? 'dragging' : ''} ${combatState.isActive && combatState.currentTurnIndex === idx ? 'active-turn-token' : ''} ${token.isHidden ? 'token-hidden' : ''}`}
                        style={{ 
                            left: token.x, top: token.y, 
                            width: grid.size * token.size * 0.85, height: grid.size * token.size * 0.85,
                            pointerEvents: activeTool !== 'cursor' ? 'none' : 'auto'
                        }}
                        onMouseDown={(e) => handleTokenMouseDown(e, token)} onDoubleClick={() => openTokenModal('edit', token)} title="Double-click to edit"
                    >
                        {token.isHidden && <span className="token-hidden-icon" title="Hidden from Players">👁️‍🗨️</span>}
                        {token.maxHp && (<div className="token-hp-bar"><div className="token-hp-fill" style={{ width: `${Math.min(100, Math.max(0, (token.hp / token.maxHp) * 100))}%` }}></div></div>)}
                        {token.name && <span className="token-name-tag">{token.name}</span>}
                        {token.statuses && token.statuses.length > 0 && (
                            <div className="token-statuses-container">
                                {token.statuses.slice(0, 3).map(st => {
                                    const stName = typeof st === 'string' ? st : st.name;
                                    const stDuration = typeof st === 'string' ? null : st.duration;
                                    let extraClass = '';
                                    if (stName === 'Concentration') extraClass = 'st-conc';
                                    if (stName === 'Invisible') extraClass = 'st-inv';
                                    return (
                                        <span key={stName} className={`token-status-icon ${extraClass}`} title={stName} style={{position: 'relative'}}>
                                            {stDuration && <span className="status-duration-badge">{stDuration}</span>}
                                        </span>
                                    );
                                })}
                                {token.statuses.length > 3 && <span className="token-status-more">+{token.statuses.length - 3}</span>}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* ================= LAYER 1: CHARACTER SHEET ================= */}
            {selectedPlayer && (
                <div className="layer-character-sheet fade-in">
                    <div className="sheet-overlay-header"><h2>{selectedPlayer.name}'s Sheet</h2><button type="button" className="close-sheet-btn" onClick={() => setSelectedPlayer(null)}>✕ CLOSE</button></div>
                    <div className="sheet-scroll-area">
                        <SummaryStep character={selectedPlayer} calculateModifier={calculateModifier} />
                        
                        {/* GM QUICK ACTIONS PANEL */}
                        <div className="gm-quick-actions-panel">
                            <h4>⚡ GM Quick Actions</h4>
                            <div className="gm-qa-row">
                                <label>HP:</label>
                                <input type="number" id="gm-hp-input" placeholder="Amount" style={{width:'70px'}} />
                                <button type="button" className="gm-qa-btn heal" onClick={() => {
                                    const val = parseInt(document.getElementById('gm-hp-input').value) || 0;
                                    if (val <= 0) return;
                                    setPlayers(prev => prev.map(p => p.id === selectedPlayer.id ? { ...p, currentHp: Math.min(p.maxHp, p.currentHp + val) } : p));
                                    setSelectedPlayer(prev => ({ ...prev, currentHp: Math.min(prev.maxHp, prev.currentHp + val) }));
                                    addLog(`💚 GM healed ${selectedPlayer.name} for ${val} HP.`, true);
                                    document.getElementById('gm-hp-input').value = '';
                                }}>Heal</button>
                                <button type="button" className="gm-qa-btn damage" onClick={() => {
                                    const val = parseInt(document.getElementById('gm-hp-input').value) || 0;
                                    if (val <= 0) return;
                                    setPlayers(prev => prev.map(p => p.id === selectedPlayer.id ? { ...p, currentHp: Math.max(0, p.currentHp - val) } : p));
                                    setSelectedPlayer(prev => ({ ...prev, currentHp: Math.max(0, prev.currentHp - val) }));
                                    addLog(`💔 GM dealt ${val} damage to ${selectedPlayer.name}.`, true);
                                    document.getElementById('gm-hp-input').value = '';
                                }}>Damage</button>
                                <button type="button" className="gm-qa-btn set" onClick={() => {
                                    const val = parseInt(document.getElementById('gm-hp-input').value);
                                    if (isNaN(val)) return;
                                    setPlayers(prev => prev.map(p => p.id === selectedPlayer.id ? { ...p, currentHp: val } : p));
                                    setSelectedPlayer(prev => ({ ...prev, currentHp: val }));
                                    addLog(`🔧 GM set ${selectedPlayer.name}'s HP to ${val}.`, true);
                                    document.getElementById('gm-hp-input').value = '';
                                }}>Set</button>
                            </div>
                            <div className="gm-qa-row">
                                <label>Gold:</label>
                                <input type="number" id="gm-gold-input" placeholder="Amount" style={{width:'70px'}} />
                                <button type="button" className="gm-qa-btn give" onClick={() => {
                                    const val = parseInt(document.getElementById('gm-gold-input').value) || 0;
                                    if (val <= 0) return;
                                    setPlayers(prev => prev.map(p => p.id === selectedPlayer.id ? { ...p, currency: { ...p.currency, gp: (p.currency?.gp || 0) + val } } : p));
                                    setSelectedPlayer(prev => ({ ...prev, currency: { ...prev.currency, gp: (prev.currency?.gp || 0) + val } }));
                                    addLog(`💰 GM gave ${val} gp to ${selectedPlayer.name}.`, true);
                                    document.getElementById('gm-gold-input').value = '';
                                }}>Give</button>
                                <button type="button" className="gm-qa-btn take" onClick={() => {
                                    const val = parseInt(document.getElementById('gm-gold-input').value) || 0;
                                    if (val <= 0) return;
                                    setPlayers(prev => prev.map(p => p.id === selectedPlayer.id ? { ...p, currency: { ...p.currency, gp: Math.max(0, (p.currency?.gp || 0) - val) } } : p));
                                    setSelectedPlayer(prev => ({ ...prev, currency: { ...prev.currency, gp: Math.max(0, (prev.currency?.gp || 0) - val) } }));
                                    addLog(`💸 GM took ${val} gp from ${selectedPlayer.name}.`, true);
                                    document.getElementById('gm-gold-input').value = '';
                                }}>Take</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {selectedNPC && !selectedPlayer && (
                <div className="layer-character-sheet fade-in npc-sheet-container">
                    <div className="sheet-overlay-header" style={{borderBottomColor: 'rgba(255, 77, 77, 0.3)'}}>
                        <h2 style={{color: '#ff4d4d'}}>{selectedNPC.name || 'Unknown NPC'} (NPC)</h2>
                        <button type="button" className="close-sheet-btn" onClick={() => setSelectedNPC(null)}>✕ CLOSE</button>
                    </div>
                    <div className="sheet-scroll-area npc-sheet-body">
                        <div className="npc-stat-grid">
                            <div className="npc-stat-box"><strong>HP</strong><span>{selectedNPC.hp || '?'}/{selectedNPC.maxHp || '?'}</span></div>
                            <div className="npc-stat-box"><strong>AC</strong><span>{selectedNPC.ac || '?'}</span></div>
                            <div className="npc-stat-box"><strong>SPEED</strong><span>{selectedNPC.speed || '?'} ft</span></div>
                            <div className="npc-stat-box"><strong>INIT</strong><span>+{selectedNPC.init || '0'}</span></div>
                        </div>
                        {selectedNPC.statuses && selectedNPC.statuses.length > 0 && (
                            <div className="npc-statuses-box">
                                <h4>Active Statuses</h4>
                                <div className="npc-status-list">
                                    {selectedNPC.statuses.map(st => {
                                        const stName = typeof st === 'string' ? st : st.name;
                                        const stDuration = typeof st === 'string' ? null : st.duration;
                                        let extraClass = '';
                                        if (stName === 'Concentration') extraClass = 'st-conc';
                                        if (stName === 'Invisible') extraClass = 'st-inv';
                                        return <span key={stName} className={`status-badge ${extraClass}`}>{stName}{stDuration ? ` (${stDuration}t)` : ''}</span>;
                                    })}
                                </div>
                            </div>
                        )}
                        <p style={{color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: '30px', fontStyle: 'italic'}}>No detailed character sheet available for this entity.</p>
                    </div>
                </div>
            )}

            {/* ================= LAYER 2: SOL MENÜ (Oyuncular & Savaş) ================= */}
            <div className={`layer-sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
                <button type="button" className="sidebar-toggle-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>{isSidebarOpen ? '◀' : '▶'}</button>
                <div className="sidebar-content">
                    {combatState.isActive ? (
                        <>
                            <h3 className="sidebar-title" style={{color: '#ff4d4d'}}>⚔️ COMBAT ORDER</h3>
                            <div className="combat-stats-header">
                                <span>Round {combatState.round}</span>
                                <span>⏱️ {combatState.secondsPassed}s</span>
                            </div>
                            <div className="player-list combat-list">
                                {tokens.map((t, idx) => (
                                    <div 
                                        key={t.id} 
                                        className={`player-card combat-card ${idx === combatState.currentTurnIndex ? 'active-turn' : ''}`} 
                                        onClick={() => {
                                            if (t.playerId) {
                                                const p = players.find(player => player.id === t.playerId);
                                                if (p) { setSelectedPlayer(p); setSelectedNPC(null); }
                                            } else {
                                                setSelectedNPC(t);
                                                setSelectedPlayer(null);
                                            }
                                        }}
                                    >
                                        <div className="p-card-header">
                                            <strong>{idx === combatState.currentTurnIndex ? '▶ ' : ''}{t.name || 'Unknown'}</strong>
                                            <span className="p-init-tag">Init: {t.initiativeRoll}</span>
                                        </div>
                                        <div className="p-card-sub" style={{display: 'flex', justifyContent: 'space-between'}}>
                                            <span>HP: {t.hp || '?'}/{t.maxHp || '?'}</span>
                                            <span>AC: {t.ac || '?'}</span>
                                        </div>
                                        {t.statuses && t.statuses.length > 0 && (
                                            <div className="combat-card-statuses">
                                                {t.statuses.map(st => {
                                                    const stName = typeof st === 'string' ? st : st.name;
                                                    const stDuration = typeof st === 'string' ? null : st.duration;
                                                    let extraClass = '';
                                                    if (stName === 'Concentration') extraClass = 'st-conc';
                                                    if (stName === 'Invisible') extraClass = 'st-inv';
                                                    return <span key={stName} className={`status-badge-small ${extraClass}`}>{stName}{stDuration ? ` (${stDuration}t)` : ''}</span>;
                                                })}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <button type="button" className="action-btn combat-next-btn" onClick={handleNextTurn}>⏭️ NEXT TURN</button>
                        </>
                    ) : (
                        <>
                            <h3 className="sidebar-title">PARTY MEMBERS</h3>
                            <div className="player-list">
                                {players.map(p => (
                                    <div key={p.id} className={`player-card ${selectedPlayer?.id === p.id ? 'active' : ''}`} onClick={() => { setSelectedPlayer(p); setSelectedNPC(null); }}>
                                        <div className="p-card-header"><strong>{p.name}</strong><span className="p-hp-tag">HP: {p.currentHp}/{p.maxHp}</span></div>
                                        <div className="p-card-sub">Lvl {p.level} {p.charClass}</div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
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
                        {combatState.isActive ? (
                            <button type="button" className="action-btn combat-btn" style={{background: '#ff4d4d', color: '#fff'}} onClick={handleEndCombat}>END COMBAT</button>
                        ) : (
                            <button type="button" className="action-btn combat-btn" onClick={handleStartCombat}>START COMBAT</button>
                        )}
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
                                        <button type="button" className="custom-token-btn bestiary-open-btn" onClick={() => setBestiaryModalOpen(true)}>📖 BESTIARY</button>
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
                        
                        <div className="grid-controls-row" style={{marginBottom: '15px'}}>
                            <label>Initiative Bonus: <input type="number" value={tokenModal.data.init} onChange={(e) => setTokenModal({...tokenModal, data: {...tokenModal.data, init: e.target.value}})} /></label>
                            <label style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: 'rgba(255,255,255,0.05)', padding: '5px 10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)'}}>
                                <input type="checkbox" checked={!!tokenModal.data.isHidden} onChange={(e) => setTokenModal({...tokenModal, data: {...tokenModal.data, isHidden: e.target.checked}})} style={{width: 'auto', margin: 0}} />
                                <span style={{fontSize: '13px', color: '#ccc'}}>Hidden (GM Only)</span>
                            </label>
                        </div>

                        <div className="host-input-group" style={{marginBottom: '20px'}}>
                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                                <label style={{margin: 0}}>Status Effects</label>
                                <label style={{fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px'}}>
                                    Duration (Rounds): 
                                    <input 
                                        type="number" 
                                        value={tokenModal.statusDurationInput || ''} 
                                        placeholder="∞" 
                                        onChange={(e) => setTokenModal({...tokenModal, statusDurationInput: e.target.value ? parseInt(e.target.value) : ''})} 
                                        style={{width: '50px', padding: '2px 5px'}} 
                                    />
                                </label>
                            </div>
                            <div className="status-grid">
                                {['Concentration', 'Unconscious', 'Exhaustion', 'Charmed', 'Incapacitated', 'Paralyzed', 'Invisible', 'Frightened', 'Blinded', 'Restrained', 'Deafened', 'Stunned', 'Petrified', 'Grappled', 'Prone', 'Poisoned'].map(st => {
                                    const statusObj = (tokenModal.data.statuses || []).find(s => (typeof s === 'string' ? s === st : s.name === st));
                                    const isSelected = !!statusObj;
                                    let extraClass = '';
                                    if (st === 'Concentration') extraClass = 'st-conc';
                                    if (st === 'Invisible') extraClass = 'st-inv';
                                    return (
                                        <button 
                                            key={st} type="button" 
                                            className={`status-toggle-btn ${extraClass} ${isSelected ? 'active' : ''}`}
                                            onClick={() => {
                                                if (isSelected) {
                                                    const newStatuses = tokenModal.data.statuses.filter(s => (typeof s === 'string' ? s !== st : s.name !== st));
                                                    setTokenModal({...tokenModal, data: {...tokenModal.data, statuses: newStatuses}});
                                                } else {
                                                    const duration = tokenModal.statusDurationInput ? parseInt(tokenModal.statusDurationInput) : null;
                                                    const newStatus = duration ? { name: st, duration } : st;
                                                    const newStatuses = [...(tokenModal.data.statuses || []), newStatus];
                                                    setTokenModal({...tokenModal, data: {...tokenModal.data, statuses: newStatuses}});
                                                }
                                            }}
                                        >
                                            {st} {statusObj?.duration ? `(${statusObj.duration}t)` : ''}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="modal-actions">
                            {tokenModal.mode === 'edit' && <button type="button" className="modal-delete-btn" style={{marginRight: 'auto'}} onClick={removeToken}>DELETE</button>}
                            {tokenModal.mode === 'create' && <button type="button" className="modal-bestiary-btn" style={{marginRight: 'auto', background: 'transparent', border: '1px solid #d4af37', color: '#d4af37'}} onClick={saveToBestiary}>SAVE TO BESTIARY</button>}
                            <button type="button" className="modal-cancel-btn" onClick={closeTokenModal}>CANCEL</button>
                            <button type="button" className="modal-confirm-btn" onClick={saveToken}>SAVE TOKEN</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ================= BESTIARY MODAL ================= */}
            {bestiaryModalOpen && (
                <div className="modal-overlay fade-in" style={{zIndex: 1000}}>
                    <div className="modal-content bestiary-modal" style={{maxWidth: '600px', width: '90%'}}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(212,175,55,0.3)', paddingBottom: '10px', marginBottom: '20px'}}>
                            <h2 style={{margin: 0, color: '#d4af37'}}>📖 Monster Bestiary</h2>
                            <button type="button" onClick={() => setBestiaryModalOpen(false)} style={{background: 'transparent', border: 'none', color: '#ff4d4d', fontSize: '20px', cursor: 'pointer'}}>✕</button>
                        </div>
                        
                        <div className="bestiary-tabs">
                            <button type="button" className={`b-tab-btn ${bestiaryTab === 'default' ? 'active' : ''}`} onClick={() => setBestiaryTab('default')}>Default Monsters</button>
                            <button type="button" className={`b-tab-btn ${bestiaryTab === 'custom' ? 'active' : ''}`} onClick={() => setBestiaryTab('custom')}>Custom Library ({customMonsters.length})</button>
                        </div>

                        <div className="host-input-group" style={{marginTop: '15px'}}>
                            <input 
                                type="text" 
                                placeholder="Search monsters by name..." 
                                value={bestiarySearch} 
                                onChange={(e) => setBestiarySearch(e.target.value)} 
                                style={{width: '100%', boxSizing: 'border-box'}}
                            />
                        </div>

                        <div className="bestiary-list">
                            {(bestiaryTab === 'default' ? DEFAULT_BESTIARY : customMonsters)
                                .filter(m => m.name.toLowerCase().includes(bestiarySearch.toLowerCase()))
                                .map(m => (
                                    <div key={m.id} className="bestiary-card">
                                        <div className="b-card-info">
                                            <h4>{m.name}</h4>
                                            <div className="b-card-stats">
                                                <span>HP: {m.hp}/{m.maxHp}</span>
                                                <span>AC: {m.ac}</span>
                                                <span>Init: +{m.init}</span>
                                            </div>
                                        </div>
                                        <div className="b-card-actions">
                                            {bestiaryTab === 'custom' && (
                                                <button type="button" className="b-delete-btn" onClick={(e) => deleteCustomMonster(m.id, e)}>🗑️</button>
                                            )}
                                            <button type="button" className="b-spawn-btn" onClick={() => spawnFromBestiary(m)}>SPAWN</button>
                                        </div>
                                    </div>
                                ))}
                            {bestiaryTab === 'custom' && customMonsters.length === 0 && (
                                <p style={{textAlign: 'center', color: 'rgba(255,255,255,0.4)', marginTop: '30px'}}>
                                    No custom monsters saved yet.<br/><br/>
                                    Use the <b>+ CUSTOM</b> token menu to create one, and click <b>SAVE TO BESTIARY</b>.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default GMDashboard;