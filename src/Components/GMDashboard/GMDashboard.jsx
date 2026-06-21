import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import SummaryStep from '../CharacterSheet/SummaryStep';
import socket from '../../socket';
import HexMapBoard from '../HexMap/HexMapBoard';
import {
    createBlankMap, applyMapJson, buildMapJson, toPlayerView,
    TERRAINS, TERRAIN_LIST, OBJECT_CATALOG, OBJECT_LIST,
    makeObject, nextFreeHex, axialKey, mapPixelRect,
} from '../HexMap/hexUtils';
import { generateBackgroundImage, importMapJson } from '../HexMap/aiMapService';
import './GMDashboard.css';

const GMDashboard = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const logContainerRef = useRef(null);

    // --- PANEL STATE'LERİ ---
    const [isTopOpen, setIsTopOpen] = useState(true);
    const [isBottomOpen, setIsBottomOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isHudOpen, setIsHudOpen] = useState(true);
    const [isDrawingMenuOpen, setIsDrawingMenuOpen] = useState(true);

    // --- OYUN & ZAR STATE'LERİ ---
    const [gameCode] = useState(() => {
        if (location.state?.gameCode) {
            localStorage.setItem('dnd_gm_gameCode', location.state.gameCode);
            return location.state.gameCode;
        }
        return localStorage.getItem('dnd_gm_gameCode') || "EPIC2026";
    });

    const fetchGameDetails = async () => {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (!token) return;
        try {
            const response = await fetch(`http://localhost:5001/api/games/code/${gameCode}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const gameData = await response.json();
                if (gameData && gameData.players) {
                    const mapped = gameData.players.map(p => {
                        const char = p.characterId || {};
                        return {
                            id: char._id || p.characterId || p._id,
                            name: char.name || p.characterName,
                            charClass: char.charClass || '',
                            level: char.level || 1,
                            species: char.species || '',
                            playerName: p.playerName,
                            userId: p.userId,
                            stats: char.stats || { Strength: 10, Dexterity: 10, Constitution: 10, Intelligence: 10, Wisdom: 10, Charisma: 10 },
                            proficiencies: char.proficiencies || {},
                            armorClass: char.armorClass || 10,
                            currentHp: char.currentHp || 10,
                            maxHp: char.maxHp || 10,
                            speed: char.speed || 30,
                            weapons: char.weapons || [],
                            spellSlots: char.spellSlots || {},
                            spells: char.spells || [],
                            currency: char.currency || {},
                            inventory: char.inventory || [],
                            traits: char.traits || {},
                            portrait: char.portrait || char.imageUrl || null
                        };
                    });
                    setPlayers(mapped);
                }
            }
        } catch (error) {
            console.error("Error fetching game details:", error);
        }
    };

    // Socket bağlantısı: GM odayı başlatır
    useEffect(() => {
        socket.connect();
        socket.emit('join_room', { gameCode, playerName: 'GM' });

        fetchGameDetails();

        socket.on('log_update', ({ text, isHidden }) => {
            setLogs(prev => {
                const updated = [...prev, { id: Date.now() + Math.random(), text, isHidden }];
                localStorage.setItem(`gm_logs_${gameCode}`, JSON.stringify(updated));
                return updated;
            });
        });

        socket.on('player_joined', ({ playerName }) => {
            setLogs(prev => {
                const updated = [...prev, { id: Date.now() + Math.random(), text: `👤 ${playerName} odaya katıldı.`, isHidden: false }];
                localStorage.setItem(`gm_logs_${gameCode}`, JSON.stringify(updated));
                return updated;
            });
            fetchGameDetails();

            // Sync current state to newly joined player
            if (playerName !== 'GM') {
                const activeMapUrl = onScreenMedia[onScreenMedia.length - 1]?.url || null;
                socket.emit('gm_map_update', { gameCode, mapUrl: activeMapUrl, onScreenMedia, board });
                socket.emit('gm_token_update', { gameCode, tokens });
                socket.emit('gm_drawing_update', { gameCode, drawingSnapshot });
                socket.emit('gm_combat_update', { gameCode, combatState, tokens });
                // Hex harita (filtrelenmiş, en güncel) — ref üzerinden
                const liveMap = liveMapRef.current || buildMapJson({ hexes, mapObjects, tokens: [], mapMeta, backgroundImageUrl, hexConfig });
                socket.emit('gm_hexmap_update', { gameCode, map: toPlayerView(liveMap) });
            }
        });

        socket.on('player_left', ({ playerName }) => {
            setLogs(prev => {
                const updated = [...prev, { id: Date.now() + Math.random(), text: `👤 ${playerName} odadan ayrıldı.`, isHidden: false }];
                localStorage.setItem(`gm_logs_${gameCode}`, JSON.stringify(updated));
                return updated;
            });
            fetchGameDetails();
        });

        socket.on('hp_changed', ({ playerId, currentHp }) => {
            setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, currentHp } : p));
        });

        socket.on('character_updated', ({ playerId, character: updatedChar }) => {
            setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, ...updatedChar } : p));
            setSelectedPlayer(prev => (prev && prev.id === playerId) ? { ...prev, ...updatedChar } : prev);
        });

        // --- HEX HARİTA: oyuncu olayları (GM yetkili) ---
        // Oyuncu kendi tokenını taşıdı -> GM uygular; mevcut token akışı geri yayınlar
        socket.on('token_moved', ({ tokenId, q, r }) => {
            setTokens(prev => prev.map(t => t.id === tokenId ? { ...t, q, r } : t));
        });
        // Oyuncu toplanabilir nesneyi aldı
        socket.on('object_pickedup', ({ objectId, playerName: pName }) => {
            setMapObjects(prev => prev.filter(o => o.id !== objectId));
            setLogs(prev => {
                const updated = [...prev, { id: Date.now() + Math.random(), text: `🫳 ${pName || 'A player'} picked up an item.`, isHidden: false }];
                localStorage.setItem(`gm_logs_${gameCode}`, JSON.stringify(updated));
                return updated;
            });
        });
        // Lazer işaretçisi (oyuncu/GM) — GM ekranında da göster
        socket.on('laser_pointed', ({ points, color }) => { drawRemoteLaser(points, color); });

        return () => {
            socket.emit('leave_room', { gameCode, playerName: 'GM' });
            socket.off('log_update');
            socket.off('player_joined');
            socket.off('player_left');
            socket.off('hp_changed');
            socket.off('character_updated');
            socket.off('token_moved');
            socket.off('object_pickedup');
            socket.off('laser_pointed');
            socket.disconnect();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gameCode]);


    const [logs, setLogs] = useState(() => {
        const activeCode = location.state?.gameCode || localStorage.getItem('dnd_gm_gameCode') || 'EPIC2026';
        const saved = localStorage.getItem(`gm_logs_${activeCode}`);
        return saved ? JSON.parse(saved) : [{ id: 1, text: "Campaign Started. Waiting for players...", isHidden: false }];
    });
    const [diceQty, setDiceQty] = useState(1);
    const [diceType, setDiceType] = useState(20);
    const [isHiddenRoll, setIsHiddenRoll] = useState(false);

    // --- MEDYA & HARİTA STATE'LERİ ---
    const [bottomTab, setBottomTab] = useState('maps'); 
    const [maps, setMaps] = useState([]);
    const [images, setImages] = useState([]);
    
    const [board, setBoard] = useState(() => {
        const activeCode = location.state?.gameCode || localStorage.getItem('dnd_gm_gameCode') || 'EPIC2026';
        const saved = localStorage.getItem(`gm_board_${activeCode}`);
        return saved ? JSON.parse(saved) : { x: 0, y: 0, scale: 1, rotation: 0 };
    });
    const [onScreenMedia, setOnScreenMedia] = useState(() => {
        const activeCode = location.state?.gameCode || localStorage.getItem('dnd_gm_gameCode') || 'EPIC2026';
        const saved = localStorage.getItem(`gm_onScreenMedia_${activeCode}`);
        return saved ? JSON.parse(saved) : [];
    }); 
    const [draggedMedia, setDraggedMedia] = useState(null);
    const fileInputRef = useRef(null);

    // --- HARİTA KİLİDİ VE SÜRÜKLEME ---
    const [isCanvasLocked, setIsCanvasLocked] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    // --- ÇİZİM ARAÇLARI (YENİ) ---
    const [activeTool, setActiveTool] = useState('cursor'); // cursor, marker, eraser, laser, line, circle, cone, paint
    const [drawingColor, setDrawingColor] = useState('#ff4d4d');
    // eslint-disable-next-line no-unused-vars
    const [canvasSize, setCanvasSize] = useState({ w: 4000, h: 4000 }); // Varsayılan büyük çizim alanı
    
    // --- HEX HARİTA STATE'LERİ (YENİ) ---
    // hexes: { "q,r": { terrain, walkable, movementCost, visibleToPlayers } }
    const [hexes, setHexes] = useState(() => {
        const saved = localStorage.getItem(`gm_hexes_${gameCode}`);
        return saved ? JSON.parse(saved) : {};
    });
    const [mapObjects, setMapObjects] = useState(() => {
        const saved = localStorage.getItem(`gm_mapObjects_${gameCode}`);
        return saved ? JSON.parse(saved) : [];
    });
    const [mapMeta, setMapMeta] = useState(() => {
        const saved = localStorage.getItem(`gm_mapMeta_${gameCode}`);
        return saved ? JSON.parse(saved) : { campaignId: null, mapName: 'New Map', width: 12, height: 12, gmNotes: '', playerDescription: '' };
    });
    const [backgroundImageUrl, setBackgroundImageUrl] = useState(() => localStorage.getItem(`gm_bgUrl_${gameCode}`) || null);
    const [hexConfig, setHexConfig] = useState(() => {
        const saved = localStorage.getItem(`gm_hexConfig_${gameCode}`);
        return saved ? JSON.parse(saved) : { size: 34, visible: true, opacity: 1 };
    });
    const [selectedTerrain, setSelectedTerrain] = useState('grass');
    const [selectedObjectType, setSelectedObjectType] = useState('barrel');
    const [importText, setImportText] = useState('');
    const [aiPrompt, setAiPrompt] = useState('');
    const [bgUrlInput, setBgUrlInput] = useState('');
    const [bgStyle, setBgStyle] = useState('');
    const [bgLighting, setBgLighting] = useState('');
    const [isGeneratingBg, setIsGeneratingBg] = useState(false);
    const [bgHistory, setBgHistory] = useState(() => {
        try { return JSON.parse(localStorage.getItem(`gm_bgHistory_${gameCode}`)) || []; } catch (e) { return []; }
    });
    const mapSaveTimerRef = useRef(null);
    const liveMapRef = useRef(null); // newly-joined players get the current map
    const hasLoadedMapRef = useRef(false); // block DB save until initial load resolves
    // --- GM ÇİZİM SNAPSHOT (oyunculara gönderilir) ---
    const [drawingSnapshot, setDrawingSnapshot] = useState(() => {
        const activeCode = location.state?.gameCode || localStorage.getItem('dnd_gm_gameCode') || 'EPIC2026';
        return localStorage.getItem(`gm_drawingSnapshot_${activeCode}`) || null;
    });

    const mainCanvasRef = useRef(null); // Kalıcı çizimler (Marker, Silgi)
    const overlayCanvasRef = useRef(null); // Geçici çizimler (Lazer, Koniler)
    const isDrawingRef = useRef(false);
    const startPosRef = useRef({ x: 0, y: 0 });
    const clearDrawingsTimeoutRef = useRef(null);
    const animationFrameRef = useRef(null);
    const lastMousePos = useRef({ x: 0, y: 0 });
    const laserPointsRef = useRef([]); // current laser stroke (broadcast to players)

    // GM Çizimini canvas yüklendiğinde geri yükle
    useEffect(() => {
        const timer = setTimeout(() => {
            if (mainCanvasRef.current) {
                const savedSnapshot = localStorage.getItem(`gm_drawingSnapshot_${gameCode}`);
                if (savedSnapshot) {
                    const ctx = mainCanvasRef.current.getContext('2d');
                    const img = new Image();
                    img.onload = () => {
                        ctx.clearRect(0, 0, canvasSize.w, canvasSize.h);
                        ctx.drawImage(img, 0, 0, canvasSize.w, canvasSize.h);
                    };
                    img.src = savedSnapshot;
                }
            }
        }, 100);
        return () => clearTimeout(timer);
    }, [gameCode, canvasSize]);

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

    // --- TOKEN STATE'LERİ ---
    const [tokens, setTokens] = useState(() => {
        const activeCode = location.state?.gameCode || localStorage.getItem('dnd_gm_gameCode') || 'EPIC2026';
        const saved = localStorage.getItem(`gm_tokens_${activeCode}`);
        return saved ? JSON.parse(saved) : [];
    });
    const [draggedToken, setDraggedToken] = useState(null);
    const [tokenModal, setTokenModal] = useState({ isOpen: false, mode: 'create', data: { id: null, name: '', color: 'blue', size: 1, hp: '', maxHp: '', ac: '', speed: '', init: '', statuses: [], isHidden: false }, statusDurationInput: '' });

    // --- SAVAŞ (COMBAT) STATE'LERİ ---
    const [combatState, setCombatState] = useState(() => {
        const activeCode = location.state?.gameCode || localStorage.getItem('dnd_gm_gameCode') || 'EPIC2026';
        const saved = localStorage.getItem(`gm_combatState_${activeCode}`);
        return saved ? JSON.parse(saved) : { isActive: false, round: 1, currentTurnIndex: 0, secondsPassed: 0 };
    });

    // --- OYUNCU (MOCK DATA) ---
    const [players, setPlayers] = useState([]);
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const [selectedNPC, setSelectedNPC] = useState(null);
    const calculateModifier = (score) => Math.floor((score - 10) / 2);

    // Real-time synchronization for tokens
    useEffect(() => {
        socket.emit('gm_token_update', { gameCode, tokens });
        localStorage.setItem(`gm_tokens_${gameCode}`, JSON.stringify(tokens));
    }, [tokens, gameCode]);

    // --- HEX HARİTA: canlı yayın (oyunculara FİLTRELİ görünüm) + localStorage ---
    useEffect(() => {
        const playerView = toPlayerView(buildMapJson({ hexes, mapObjects, tokens: [], mapMeta, backgroundImageUrl, hexConfig }));
        socket.emit('gm_hexmap_update', { gameCode, map: playerView });
        localStorage.setItem(`gm_hexes_${gameCode}`, JSON.stringify(hexes));
        localStorage.setItem(`gm_mapObjects_${gameCode}`, JSON.stringify(mapObjects));
        localStorage.setItem(`gm_mapMeta_${gameCode}`, JSON.stringify(mapMeta));
        localStorage.setItem(`gm_hexConfig_${gameCode}`, JSON.stringify(hexConfig));
        if (backgroundImageUrl) localStorage.setItem(`gm_bgUrl_${gameCode}`, backgroundImageUrl);
        else localStorage.removeItem(`gm_bgUrl_${gameCode}`);
    }, [hexes, mapObjects, mapMeta, backgroundImageUrl, hexConfig, gameCode]);

    // --- AI arka plan galerisi: üretilen görselleri localStorage'da sakla (sahne için önceden üret) ---
    useEffect(() => {
        try { localStorage.setItem(`gm_bgHistory_${gameCode}`, JSON.stringify(bgHistory)); } catch (e) { /* yoksay */ }
    }, [bgHistory, gameCode]);

    // --- HEX HARİTA: tam haritayı ref'te tut + debounce ile DB'ye kaydet (kalıcı) ---
    useEffect(() => {
        const fullMap = buildMapJson({ hexes, mapObjects, tokens, mapMeta, backgroundImageUrl, hexConfig });
        liveMapRef.current = fullMap;
        if (!hasLoadedMapRef.current) return; // ilk yükleme bitene kadar DB'ye yazma
        if (mapSaveTimerRef.current) clearTimeout(mapSaveTimerRef.current);
        mapSaveTimerRef.current = setTimeout(() => {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            if (!token) return;
            fetch(`http://localhost:5001/api/games/${gameCode}/map`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ map: fullMap }),
            }).catch(err => console.error('Error saving map to DB:', err));
        }, 1500);
    }, [hexes, mapObjects, tokens, mapMeta, backgroundImageUrl, hexConfig, gameCode]);

    // --- HEX HARİTA: mount'ta DB'den yükle (yoksa boş harita oluştur) ---
    useEffect(() => {
        const loadMap = async () => {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            try {
                let mapJson = null;
                if (token) {
                    const res = await fetch(`http://localhost:5001/api/games/${gameCode}/map`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.ok) mapJson = (await res.json()).map;
                }
                const haveLocal = Object.keys(hexes).length > 0;
                if (!mapJson && haveLocal) return;      // local state is enough
                if (!mapJson) mapJson = createBlankMap({ campaignId: gameCode, mapName: 'New Map' });
                const applied = applyMapJson(mapJson);
                setHexes(applied.hexes);
                setMapObjects(applied.mapObjects);
                setMapMeta(applied.mapMeta);
                setBackgroundImageUrl(applied.backgroundImageUrl);
                setHexConfig(applied.hexConfig);
                if (applied.tokens && applied.tokens.length) setTokens(applied.tokens);
            } catch (err) {
                console.error('Error loading map:', err);
                if (Object.keys(hexes).length === 0) {
                    const applied = applyMapJson(createBlankMap({ campaignId: gameCode }));
                    setHexes(applied.hexes); setMapMeta(applied.mapMeta); setHexConfig(applied.hexConfig);
                }
            } finally {
                hasLoadedMapRef.current = true; // bundan sonra düzenlemeler DB'ye kaydedilir
            }
        };
        loadMap();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gameCode]);

    // Real-time synchronization for map and pan/zoom/rotation
    useEffect(() => {
        const activeMapUrl = onScreenMedia[onScreenMedia.length - 1]?.url || null;
        socket.emit('gm_map_update', { gameCode, mapUrl: activeMapUrl, onScreenMedia, board });
        localStorage.setItem(`gm_onScreenMedia_${gameCode}`, JSON.stringify(onScreenMedia));
        localStorage.setItem(`gm_board_${gameCode}`, JSON.stringify(board));
    }, [onScreenMedia, board, gameCode]);

    // Real-time synchronization for GM marker/eraser drawings (kept; painting moved to hex terrain)
    useEffect(() => {
        socket.emit('gm_drawing_update', { gameCode, drawingSnapshot });
        if (drawingSnapshot) {
            localStorage.setItem(`gm_drawingSnapshot_${gameCode}`, drawingSnapshot);
        } else {
            localStorage.removeItem(`gm_drawingSnapshot_${gameCode}`);
        }
    }, [drawingSnapshot, gameCode]);

    // Real-time synchronization for combat state
    useEffect(() => {
        socket.emit('gm_combat_update', { gameCode, combatState, tokens });
        localStorage.setItem(`gm_combatState_${gameCode}`, JSON.stringify(combatState));
    }, [combatState, tokens, gameCode]);

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
                    const dx = (clientX - draggedToken.clientX) / board.scale;
                    const dy = (clientY - draggedToken.clientY) / board.scale;
                    let finalDx = dx;
                    let finalDy = dy;
                    if (board.rotation) {
                        const rad = -board.rotation * Math.PI / 180;
                        const cos = Math.cos(rad);
                        const sin = Math.sin(rad);
                        finalDx = dx * cos - dy * sin;
                        finalDy = dx * sin + dy * cos;
                    }
                    setTokens(prev => prev.map(t => t.id === draggedToken.id ? { 
                        ...t, 
                        x: draggedToken.startX + finalDx, 
                        y: draggedToken.startY + finalDy 
                    } : t));
                } else if (draggedMedia) {
                    setDraggedMedia(prev => {
                        if (!prev) return prev;
                        const dx = (clientX - prev.lastX) / board.scale;
                        const dy = (clientY - prev.lastY) / board.scale;
                        let finalDx = dx;
                        let finalDy = dy;
                        if (board.rotation) {
                            const rad = -board.rotation * Math.PI / 180;
                            const cos = Math.cos(rad);
                            const sin = Math.sin(rad);
                            finalDx = dx * cos - dy * sin;
                            finalDy = dx * sin + dy * cos;
                        }
                        setOnScreenMedia(prevMedia => prevMedia.map(m => m.id === prev.id ? { ...m, x: m.x + finalDx, y: m.y + finalDy } : m));
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
            if (activeTool === 'laser') laserPointsRef.current = [pos];
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
            laserPointsRef.current.push(pos);
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
            const distanceFt = ((distancePx / (hexConfig.size * Math.sqrt(3))) * 5).toFixed(0); // 1 hex ≈ 5ft

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
            // Lazer izini oyunculara yayınla (geçici/kaybolan)
            if (activeTool === 'laser' && laserPointsRef.current.length > 1) {
                socket.emit('laser_point', { gameCode, points: laserPointsRef.current, color: drawingColor });
                laserPointsRef.current = [];
            }
            if (clearDrawingsTimeoutRef.current) clearTimeout(clearDrawingsTimeoutRef.current);
            clearDrawingsTimeoutRef.current = setTimeout(() => {
                if (overlayCanvasRef.current) overlayCanvasRef.current.getContext('2d').clearRect(0, 0, canvasSize.w, canvasSize.h);
                clearDrawingsTimeoutRef.current = null;
            }, 1500);
        }
        // Kalıcı çizimler (marker/eraser) bitince snapshot al ve oyunculara gönder
        if (['marker', 'eraser'].includes(activeTool) && mainCanvasRef.current) {
            // Bandwidth tasarrufu: 1000x1000'e küçültülür, oyuncu tarafında 4000x4000'e yayılır
            const tmpCanvas = document.createElement('canvas');
            tmpCanvas.width = 1000;
            tmpCanvas.height = 1000;
            tmpCanvas.getContext('2d').drawImage(mainCanvasRef.current, 0, 0, 1000, 1000);
            setDrawingSnapshot(tmpCanvas.toDataURL('image/png'));
        }
    };

    const handleClearDrawings = () => {
        if(mainCanvasRef.current) mainCanvasRef.current.getContext('2d').clearRect(0, 0, canvasSize.w, canvasSize.h);
        if(overlayCanvasRef.current) overlayCanvasRef.current.getContext('2d').clearRect(0, 0, canvasSize.w, canvasSize.h);
        setDrawingSnapshot(null); // snapshot temizle, oyuncularda da silinir
        addLog("Map drawings cleared.", true);
    };

    // Uzaktan (oyuncu/GM) gelen lazer izini overlay canvas'a çiz ve 1.5sn sonra sil
    const drawRemoteLaser = (points, color) => {
        const canvas = overlayCanvasRef.current;
        if (!canvas || !points || points.length === 0) return;
        const ctx = canvas.getContext('2d');
        ctx.beginPath();
        ctx.strokeStyle = color || '#ff4d4d';
        ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.globalCompositeOperation = 'source-over';
        ctx.moveTo(points[0].x, points[0].y);
        points.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.stroke();
        if (clearDrawingsTimeoutRef.current) clearTimeout(clearDrawingsTimeoutRef.current);
        clearDrawingsTimeoutRef.current = setTimeout(() => {
            if (overlayCanvasRef.current) overlayCanvasRef.current.getContext('2d').clearRect(0, 0, canvasSize.w, canvasSize.h);
            clearDrawingsTimeoutRef.current = null;
        }, 1500);
    };

    // ================= HEX HARİTA HANDLERS =================
    // GM bir hex'e tıkladığında aktif hex aracına göre işlem yap
    const handleHexAction = (q, r) => {
        const key = axialKey(q, r);
        if (activeTool === 'hex-paint') {
            const def = TERRAINS[selectedTerrain] || TERRAINS.grass;
            setHexes(prev => ({ ...prev, [key]: { terrain: selectedTerrain, walkable: def.walkable, movementCost: def.movementCost, visibleToPlayers: prev[key]?.visibleToPlayers !== false } }));
        } else if (activeTool === 'hex-walk') {
            setHexes(prev => {
                const cur = prev[key] || { terrain: 'grass', walkable: true, movementCost: 1, visibleToPlayers: true };
                const nextWalk = !cur.walkable;
                return { ...prev, [key]: { ...cur, walkable: nextWalk, movementCost: nextWalk ? (TERRAINS[cur.terrain]?.movementCost ?? 1) : 99 } };
            });
        } else if (activeTool === 'hex-visibility') {
            const cur = hexes[key];
            const nextVis = cur ? (cur.visibleToPlayers === false) : false; // toggle -> if hidden, show; else hide
            setHexes(prev => {
                const c = prev[key] || { terrain: 'grass', walkable: true, movementCost: 1, visibleToPlayers: true };
                return { ...prev, [key]: { ...c, visibleToPlayers: nextVis } };
            });
            setMapObjects(prev => prev.map(o => (o.q === q && o.r === r) ? { ...o, visibleToPlayers: nextVis } : o));
        } else if (activeTool === 'hex-object') {
            setMapObjects(prev => (prev.some(o => o.q === q && o.r === r) ? prev : [...prev, makeObject(selectedObjectType, q, r)]));
        } else if (activeTool === 'hex-erase') {
            const hadObject = mapObjects.some(o => o.q === q && o.r === r);
            if (hadObject) {
                setMapObjects(prev => prev.filter(o => !(o.q === q && o.r === r)));
            } else {
                setHexes(prev => { const next = { ...prev }; delete next[key]; return next; });
            }
        }
    };

    // Bir hex token konmasına uygun mu? (engelli arazi veya engelleyici nesne yok)
    const isHexBlocked = (q, r) => {
        const hex = hexes[axialKey(q, r)];
        if (hex && hex.walkable === false) return true;                 // wall / water / lava terrain
        if (mapObjects.some(o => o.q === q && o.r === r && o.blocksMovement)) return true; // wall / tree / door ...
        return false;
    };
    const handleTokenMove = (tokenId, q, r) => {
        if (isHexBlocked(q, r)) { addLog('🚫 Blocked hex (wall / object) — token not moved.', true); return; }
        setTokens(prev => prev.map(t => t.id === tokenId ? { ...t, q, r } : t));
    };
    const handleObjectMove = (objectId, q, r) => setMapObjects(prev => prev.map(o => o.id === objectId ? { ...o, q, r } : o));

    // AI/içe aktarılan harita JSON'unu uygula
    const applyImportedMap = (mapJson) => {
        const applied = applyMapJson(mapJson);
        setHexes(applied.hexes);
        setMapObjects(applied.mapObjects);
        setMapMeta(applied.mapMeta);
        setBackgroundImageUrl(applied.backgroundImageUrl);
        setHexConfig(applied.hexConfig);
        if (applied.tokens && applied.tokens.length) setTokens(applied.tokens);
    };
    const handleImportMap = () => {
        const result = importMapJson(importText);
        if (!result.ok) { addLog(`❌ Import failed: ${result.reason}`, true); return; }
        applyImportedMap(result.map);
        setImportText('');
        addLog('🗺️ Map JSON imported.', false);
    };
    // Arka plan görselinin en-boy oranına göre hex ızgarasını ona oturt
    const fitGridToImage = (url) => {
        if (!url) return;
        const img = new Image();
        img.onload = () => {
            const ratio = (img.naturalWidth || 1) / (img.naturalHeight || 1);
            const baseH = 14;
            const w = Math.max(4, Math.min(40, Math.round(baseH * ratio * 0.866)));
            setMapMeta(prev => ({ ...prev, width: w, height: baseH }));
        };
        img.src = url;
    };
    const handleGenerateBackground = async () => {
        if (!aiPrompt.trim() || isGeneratingBg) return;
        setIsGeneratingBg(true);
        addLog('🎨 Generating background image… (~10–20s)', true);
        try {
            const result = await generateBackgroundImage(gameCode, aiPrompt, { style: bgStyle, lighting: bgLighting });
            if (!result.ok) { addLog(`🎨 ${result.reason}`, true); return; }
            setBackgroundImageUrl(result.url);
            setBgHistory(prev => [{ url: result.url, label: aiPrompt.trim() }, ...prev.filter(e => e.url !== result.url)].slice(0, 8));
            addLog('🎨 AI background applied. Use “Fit hex grid to background” if needed.', false);
        } finally {
            setIsGeneratingBg(false);
        }
    };
    const applyBgFromHistory = (url) => {
        setBackgroundImageUrl(url);
        addLog('🖼️ Background switched.', false);
    };
    const removeBgFromHistory = (url) => setBgHistory(prev => prev.filter(e => e.url !== url));
    const handleSetBackground = () => {
        const url = bgUrlInput.trim() || null;
        setBackgroundImageUrl(url);
        addLog(url ? '🖼️ Background set. Use “Fit hex grid to background” to match it.' : '🖼️ Background cleared.', false);
    };
    // TEK fit kontrolü: aktif arka plana (ister AI ister URL) hex ızgarasını oturtur.
    const handleFitToBackground = () => {
        if (!backgroundImageUrl) { addLog('Set or generate a background first.', true); return; }
        fitGridToImage(backgroundImageUrl);
        addLog('⤢ Hex grid fitted to the current background.', false);
    };
    // Geçerli haritayı JSON dosyası olarak dışa aktar (indir)
    const handleExportMap = () => {
        const json = JSON.stringify(buildMapJson({ hexes, mapObjects, tokens, mapMeta, backgroundImageUrl, hexConfig }), null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${(mapMeta.mapName || 'map').replace(/\s+/g, '_')}_${gameCode}.json`;
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
        addLog('💾 Map JSON exported.', false);
    };

    // Token sürükleme artık HexMapBoard içinde (q,r snap) yapılıyor.
    const openTokenModal = (mode, tokenData = null) => {
        setTokenModal({ isOpen: true, mode, data: tokenData ? { ...tokenData } : { id: null, name: '', color: 'blue', size: 1, hp: '', maxHp: '', ac: '', speed: '', init: '', statuses: [], isHidden: false } });
    };
    const closeTokenModal = () => setTokenModal({ isOpen: false, mode: 'create', data: {} });

    const saveToken = () => {
        if (tokenModal.mode === 'create') setTokens(prev => {
            const { q, r } = nextFreeHex(prev, mapObjects, mapMeta.width, mapMeta.height);
            return [...prev, { ...tokenModal.data, id: Date.now(), statuses: tokenModal.data.statuses || [], type: tokenModal.data.type || 'npc', visibleToPlayers: !tokenModal.data.isHidden, q, r }];
        });
        else setTokens(prev => prev.map(t => t.id === tokenModal.data.id ? { ...t, ...tokenModal.data, visibleToPlayers: !tokenModal.data.isHidden } : t));
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
        setTokens(prev => {
            const { q, r } = nextFreeHex(prev, mapObjects, mapMeta.width, mapMeta.height);
            return [...prev, { ...monster, id: Date.now() + Math.random(), type: 'monster', visibleToPlayers: true, q, r }];
        });
        setBestiaryModalOpen(false);
    };

    const deleteCustomMonster = (id, e) => {
        e.stopPropagation();
        if(!window.confirm("Bu yaratığı kütüphaneden silmek istediğinize emin misiniz?")) return;
        const updated = customMonsters.filter(m => m.id !== id);
        setCustomMonsters(updated);
        localStorage.setItem('gm_custom_monsters', JSON.stringify(updated));
    };

    const handleAddQuickToken = (color) => {
        setTokens(prev => {
            const { q, r } = nextFreeHex(prev, mapObjects, mapMeta.width, mapMeta.height);
            return [...prev, { id: Date.now(), color, size: 1, name: '', hp: '', maxHp: '', ac: '', speed: '', init: '', statuses: [], type: 'monster', visibleToPlayers: true, q, r }];
        });
    };
    const handleClearTokens = () => { setTokens([]); };
    const handleAddPlayerToken = (p) => {
        setTokens(prev => {
            const { q, r } = nextFreeHex(prev, mapObjects, mapMeta.width, mapMeta.height);
            return [...prev, { id: Date.now() + Math.random(), playerId: p.id, characterId: p.id, ownerId: p.userId, type: 'pc', color: 'blue', size: 1, name: p.name, hp: p.currentHp, maxHp: p.maxHp, ac: p.armorClass, speed: p.speed, init: calculateModifier(p.stats.Dexterity), statuses: [], visibleToPlayers: true, q, r }];
        });
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

    // Hex haritası arka plan görselinin piksel dikdörtgeni
    const bgRect = backgroundImageUrl ? mapPixelRect(mapMeta.width, mapMeta.height, hexConfig.size) : null;

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
                        {/* HEX HARİTA ARAÇLARI */}
                        <button type="button" className={`tool-btn ${activeTool === 'hex-paint' ? 'active' : ''}`} onClick={() => setActiveTool('hex-paint')} title={`Paint Terrain (${selectedTerrain})`}>🖌️</button>
                        <button type="button" className={`tool-btn ${activeTool === 'hex-walk' ? 'active' : ''}`} onClick={() => setActiveTool('hex-walk')} title="Toggle Walkable / Blocked">🚧</button>
                        <button type="button" className={`tool-btn ${activeTool === 'hex-object' ? 'active' : ''}`} onClick={() => setActiveTool('hex-object')} title={`Place Object (${selectedObjectType})`}>📦</button>
                        <button type="button" className={`tool-btn ${activeTool === 'hex-visibility' ? 'active' : ''}`} onClick={() => setActiveTool('hex-visibility')} title="Toggle Hidden / Visible to Players">👁️</button>
                        <button type="button" className={`tool-btn ${activeTool === 'hex-erase' ? 'active' : ''}`} onClick={() => setActiveTool('hex-erase')} title="Erase Object / Terrain">🚫</button>
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
                        {/* Hex haritası arka plan görseli (en altta — medyanın ve hexlerin altında) */}
                        {bgRect && (
                            <img className="hexmap-bg" src={backgroundImageUrl} alt="" draggable={false}
                                style={{ position: 'absolute', left: bgRect.left, top: bgRect.top, width: bgRect.width, height: bgRect.height, objectFit: 'fill', pointerEvents: 'none' }} />
                        )}

                        {/* Haritalar ve Resimler */}
                        {onScreenMedia.map(media => (
                            <div key={media.id} style={{ position: 'absolute', left: media.x, top: media.y, cursor: activeTool === 'cursor' ? 'grab' : 'inherit' }}>
                                <button type="button" className="close-media-btn" onClick={(e) => { e.stopPropagation(); setOnScreenMedia(prev => prev.filter(m => m.id !== media.id)); }} title="Remove from board" style={{position:'absolute', top:-15, right:-15, background:'rgba(255,77,77,0.8)', color:'#fff', border:'none', borderRadius:'50%', width:'30px', height:'30px', cursor:'pointer', zIndex:10}}>✕</button>
                                <img src={media.url} alt="Media" draggable="false" style={{maxWidth: '800px', maxHeight: '800px', display: 'block'}} onMouseDown={(e) => handleMediaMouseDown(e, media)} />
                            </div>
                        ))}
                        
                        {/* HEX TERRAIN (grid + arazi) — medyanın üstünde, çizim katmanlarının altında */}
                        <HexMapBoard
                            layer="terrain" role="gm"
                            hexes={hexes} hexConfig={hexConfig} mapMeta={mapMeta}
                            activeTool={activeTool}
                            onHexAction={handleHexAction}
                        />

                        {/* Kalıcı Çizimler (Fırça, Silgi) */}
                        <canvas ref={mainCanvasRef} width={canvasSize.w} height={canvasSize.h} className="drawing-canvas main-canvas" />
                        
                        {/* Geçici Çizimler (Lazer, Koni vs.) & Event Dinleyici.
                            Hex araçları aktifken pasif -> alttaki hex SVG tıklamaları alır. */}
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
                            onMouseMove={handleCanvasMouseMove}
                            onMouseUp={handleCanvasMouseUp} onMouseOut={handleCanvasMouseUp}
                            style={{ pointerEvents: (typeof activeTool === 'string' && activeTool.startsWith('hex-')) ? 'none' : 'auto' }}
                        />

                        {/* HEX OBJELERİ & TOKENLAR — çizim katmanlarının üstünde (sürükleme için) */}
                        <HexMapBoard
                            layer="tokens" role="gm"
                            hexes={hexes} mapObjects={mapObjects} tokens={tokens}
                            hexConfig={hexConfig} mapMeta={mapMeta}
                            activeTool={activeTool} combatState={combatState}
                            onTokenMove={handleTokenMove}
                            onObjectMove={handleObjectMove}
                            onTokenDoubleClick={(t) => openTokenModal('edit', t)}
                        />
                        {/* (eski kare-token render kaldırıldı — artık HexMapBoard kullanılıyor) */}
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
                                    const newHp = Math.min(selectedPlayer.maxHp, selectedPlayer.currentHp + val);
                                    setPlayers(prev => prev.map(p => p.id === selectedPlayer.id ? { ...p, currentHp: newHp } : p));
                                    setSelectedPlayer(prev => ({ ...prev, currentHp: newHp }));
                                    socket.emit('gm_hp_update', { gameCode, playerId: selectedPlayer.id, currentHp: newHp });
                                    addLog(`💚 GM healed ${selectedPlayer.name} for ${val} HP.`, true);
                                    document.getElementById('gm-hp-input').value = '';
                                }}>Heal</button>
                                <button type="button" className="gm-qa-btn damage" onClick={() => {
                                    const val = parseInt(document.getElementById('gm-hp-input').value) || 0;
                                    if (val <= 0) return;
                                    const newHp = Math.max(0, selectedPlayer.currentHp - val);
                                    setPlayers(prev => prev.map(p => p.id === selectedPlayer.id ? { ...p, currentHp: newHp } : p));
                                    setSelectedPlayer(prev => ({ ...prev, currentHp: newHp }));
                                    socket.emit('gm_hp_update', { gameCode, playerId: selectedPlayer.id, currentHp: newHp });
                                    addLog(`💔 GM dealt ${val} damage to ${selectedPlayer.name}.`, true);
                                    document.getElementById('gm-hp-input').value = '';
                                }}>Damage</button>
                                <button type="button" className="gm-qa-btn set" onClick={() => {
                                    const val = parseInt(document.getElementById('gm-hp-input').value);
                                    if (isNaN(val)) return;
                                    setPlayers(prev => prev.map(p => p.id === selectedPlayer.id ? { ...p, currentHp: val } : p));
                                    setSelectedPlayer(prev => ({ ...prev, currentHp: val }));
                                    socket.emit('gm_hp_update', { gameCode, playerId: selectedPlayer.id, currentHp: val });
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
                        <button type="button" className={`tab-btn ${bottomTab === 'grid' ? 'active' : ''}`} onClick={() => setBottomTab('grid')} style={{borderColor: '#7ec8ff', color: '#7ec8ff'}}>⬡ HEX MAP</button>
                        {(bottomTab === 'maps' || bottomTab === 'images') && (<button type="button" className="upload-media-btn" onClick={() => fileInputRef.current?.click()}>+ UPLOAD {bottomTab === 'maps' ? 'MAP' : 'IMAGE'}</button>)}
                    </div>
                    <div className="media-gallery">
                        {bottomTab === 'grid' ? (
                            <div className="hexmap-panel">
                                {/* HEX GRID + TERRAIN */}
                                <div className="hexmap-box">
                                    <h4>HEX GRID</h4>
                                    <div className="grid-controls-row">
                                        <label>Show Grid: <input type="checkbox" checked={hexConfig.visible} onChange={(e) => setHexConfig({ ...hexConfig, visible: e.target.checked })} /></label>
                                        <label>Hex Size: <input type="range" min="20" max="60" value={hexConfig.size} onChange={(e) => setHexConfig({ ...hexConfig, size: parseInt(e.target.value) })} /></label>
                                        <label>Terrain Opacity: <input type="range" min="0" max="1" step="0.05" value={hexConfig.opacity} onChange={(e) => setHexConfig({ ...hexConfig, opacity: parseFloat(e.target.value) })} /></label>
                                        <label>Map W×H:
                                            <span style={{ display: 'flex', gap: 4 }}>
                                                <input type="number" min="4" max="30" value={mapMeta.width} onChange={(e) => setMapMeta({ ...mapMeta, width: parseInt(e.target.value) || 12 })} style={{ width: 50 }} />
                                                <input type="number" min="4" max="30" value={mapMeta.height} onChange={(e) => setMapMeta({ ...mapMeta, height: parseInt(e.target.value) || 12 })} style={{ width: 50 }} />
                                            </span>
                                        </label>
                                    </div>
                                    <h5>TERRAIN (click → paint)</h5>
                                    <div className="terrain-palette">
                                        {TERRAIN_LIST.map(t => (
                                            <button key={t} type="button" className={`terrain-swatch ${selectedTerrain === t ? 'active' : ''}`} onClick={() => { setSelectedTerrain(t); setActiveTool('hex-paint'); }}>
                                                <span className="terrain-dot" style={{ background: TERRAINS[t].color }} />{TERRAINS[t].label}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="hexmap-hint">Toolbar: <b>🖌️ paint</b> · <b>🚧 walkable</b> · <b>👁️ hide</b> · <b>🚫 erase</b></p>
                                </div>

                                {/* OBJECTS */}
                                <div className="hexmap-box">
                                    <h4>OBJECTS (click → place)</h4>
                                    <div className="object-palette">
                                        {OBJECT_LIST.map(t => (
                                            <button key={t} type="button" className={`object-chip ${selectedObjectType === t ? 'active' : ''}`} onClick={() => { setSelectedObjectType(t); setActiveTool('hex-object'); }} title={`${t} · ${OBJECT_CATALOG[t].category}`}>
                                                <span className="chip-icon">{OBJECT_CATALOG[t].icon}</span>{t}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="hexmap-hint">Move movable objects with <b>👆 cursor</b>. Players can pick up pickables.</p>
                                </div>

                                {/* TOKENS (kept) */}
                                <div className="hexmap-box">
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
                                    <h5>PLAYER TOKENS (auto-linked)</h5>
                                    <div className="token-buttons-row">
                                        {players.map(p => (
                                            <button key={p.id} type="button" className="custom-token-btn" style={{ padding: '4px 10px' }} onClick={() => handleAddPlayerToken(p)}>{p.name}</button>
                                        ))}
                                        {players.length === 0 && <span className="hexmap-hint">No players joined yet.</span>}
                                    </div>
                                </div>

                                {/* BACKGROUND + AI + IMPORT */}
                                <div className="hexmap-box hexmap-ai-box">
                                    <h4>BACKGROUND & AI</h4>
                                    <div className="hexmap-ai-row">
                                        <input type="text" placeholder="Background image URL…" value={bgUrlInput} onChange={(e) => setBgUrlInput(e.target.value)} />
                                        <button type="button" className="hexmap-ai-btn" onClick={handleSetBackground}>Set</button>
                                        <button type="button" className="hexmap-ai-btn secondary" onClick={() => setBackgroundImageUrl(null)}>Clear</button>
                                    </div>
                                    <div className="hexmap-ai-row">
                                        <button type="button" className="hexmap-ai-btn secondary" onClick={handleFitToBackground} disabled={!backgroundImageUrl}>⤢ Fit hex grid to background</button>
                                    </div>
                                    <h5>AI BACKGROUND IMAGE</h5>
                                    <div className="hexmap-ai-row">
                                        <input type="text" placeholder="Describe the battle map (e.g. 'forest clearing with a river')" value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} disabled={isGeneratingBg} />
                                    </div>
                                    <div className="hexmap-ai-row">
                                        <select value={bgStyle} onChange={(e) => setBgStyle(e.target.value)} disabled={isGeneratingBg}>
                                            <option value="">Style: Default</option>
                                            <option value="painterly">Style: Painterly</option>
                                            <option value="realistic">Style: Realistic</option>
                                            <option value="gritty">Style: Gritty / Dark</option>
                                            <option value="vibrant">Style: Vibrant</option>
                                        </select>
                                        <select value={bgLighting} onChange={(e) => setBgLighting(e.target.value)} disabled={isGeneratingBg}>
                                            <option value="">Lighting: Default</option>
                                            <option value="day">Lighting: Day</option>
                                            <option value="dusk">Lighting: Dusk</option>
                                            <option value="night">Lighting: Night</option>
                                            <option value="torchlit">Lighting: Torchlit</option>
                                        </select>
                                    </div>
                                    <div className="hexmap-ai-row">
                                        <button type="button" className="hexmap-ai-btn" onClick={handleGenerateBackground} disabled={!aiPrompt.trim() || isGeneratingBg}>
                                            {isGeneratingBg ? (<><span className="hexmap-spinner" />Generating…</>) : '🎨 Generate Background (AI)'}
                                        </button>
                                    </div>
                                    <p className="hexmap-ai-note">Generates a top-down battle-map image from your prompt (style &amp; lighting optional) and sets it behind the hex grid. Requires an image API key on the server.</p>
                                    {bgHistory.length > 0 && (
                                        <>
                                            <h5>RECENT BACKGROUNDS <span className="hexmap-ai-subtle">(click to use)</span></h5>
                                            <div className="hexmap-bg-gallery">
                                                {bgHistory.map(e => (
                                                    <div key={e.url} className={`hexmap-bg-thumb ${backgroundImageUrl === e.url ? 'active' : ''}`} title={e.label || 'background'}>
                                                        <img src={e.url} alt={e.label || 'background'} onClick={() => applyBgFromHistory(e.url)} draggable={false} />
                                                        <button type="button" className="hexmap-bg-thumb-x" onClick={() => removeBgFromHistory(e.url)} title="Remove">×</button>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                    <h5>IMPORT MAP JSON</h5>
                                    <textarea placeholder='{"hexes":[...],"objects":[...],"tokens":[...]}' value={importText} onChange={(e) => setImportText(e.target.value)} />
                                    <div className="hexmap-ai-row">
                                        <button type="button" className="hexmap-ai-btn" onClick={handleImportMap}>Import JSON</button>
                                        <button type="button" className="hexmap-ai-btn" onClick={handleExportMap}>⬇ Export JSON</button>
                                        <button type="button" className="hexmap-ai-btn secondary" onClick={() => applyImportedMap(createBlankMap({ campaignId: gameCode, width: mapMeta.width, height: mapMeta.height }))}>🆕 New Blank</button>
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