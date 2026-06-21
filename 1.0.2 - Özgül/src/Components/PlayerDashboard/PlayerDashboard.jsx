import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import socket from '../../socket';
import HexMapBoard from '../HexMap/HexMapBoard';
import { applyMapJson, mapPixelRect } from '../HexMap/hexUtils';
import './PlayerDashboard.css';

const statConfig = {
    Strength:     ['Saving Throw', 'Athletics'],
    Dexterity:    ['Saving Throw', 'Acrobatics', 'Sleight of Hand', 'Stealth'],
    Constitution: ['Saving Throw'],
    Intelligence: ['Saving Throw', 'Arcana', 'History', 'Investigation', 'Nature', 'Religion'],
    Wisdom:       ['Saving Throw', 'Animal Handling', 'Insight', 'Medicine', 'Perception', 'Survival'],
    Charisma:     ['Saving Throw', 'Deception', 'Intimidation', 'Performance', 'Persuasion']
};

const calcMod  = (score) => Math.floor((score - 10) / 2);
const fmtMod   = (mod)   => (mod >= 0 ? `+${mod}` : `${mod}`);

// ─────────────────────────────────────────────
const PlayerDashboard = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const logRef   = useRef(null);
    const lastAlertedTurnRef = useRef({ round: -1, turnIndex: -1 });

    // ── Panel state (GMDashboard ile birebir) ──
    const [isTopOpen,    setIsTopOpen]    = useState(true);
    const [isBottomOpen, setIsBottomOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isHudOpen,    setIsHudOpen]    = useState(true);

    // Üst menü sekmeleri (stats & skills artık üst menüde)
    const [bottomTab, setBottomTab] = useState('stats'); // 'stats' | 'skills'

    // ── Karakter & Oyun ─────────────────────
    const [character,    setCharacter]    = useState(() => {
        if (location.state?.character) {
            localStorage.setItem('dnd_character', JSON.stringify(location.state.character));
            return location.state.character;
        }
        const saved = localStorage.getItem('dnd_character');
        return saved ? JSON.parse(saved) : null;
    });
    
    const [gameCode] = useState(() => {
        if (location.state?.gameCode) {
            localStorage.setItem('dnd_gameCode', location.state.gameCode);
            return location.state.gameCode;
        }
        return localStorage.getItem('dnd_gameCode') || 'UNKNOWN';
    });

    const [selectedStat, setSelectedStat] = useState('Dexterity');
    const [isConnected,  setIsConnected]  = useState(false);

    // ── Zar ─────────────────────────────────
    const [diceQty,      setDiceQty]      = useState(1);
    const [diceType,     setDiceType]     = useState(20);
    const [isHiddenRoll, setIsHiddenRoll] = useState(false);

    // ── Loglar ───────────────────────────────
    const [logs, setLogs] = useState(() => {
        const activeCode = location.state?.gameCode || localStorage.getItem('dnd_gameCode') || 'UNKNOWN';
        const saved = localStorage.getItem(`player_logs_${activeCode}`);
        return saved ? JSON.parse(saved) : [
            { id: 1, text: 'Oturuma katıldınız. GM bekleniyor...', isHidden: false }
        ];
    });

    // ── GM'den gelen veriler ─────────────────
    const [activeMapUrl, setActiveMapUrl] = useState(() => {
        const activeCode = location.state?.gameCode || localStorage.getItem('dnd_gameCode') || 'UNKNOWN';
        return localStorage.getItem(`player_activeMapUrl_${activeCode}`) || null;
    });
    const [tokens,       setTokens]       = useState(() => {
        const activeCode = location.state?.gameCode || localStorage.getItem('dnd_gameCode') || 'UNKNOWN';
        const saved = localStorage.getItem(`player_tokens_${activeCode}`);
        return saved ? JSON.parse(saved) : [];
    });
    const [combatState,  setCombatState]  = useState(() => {
        const activeCode = location.state?.gameCode || localStorage.getItem('dnd_gameCode') || 'UNKNOWN';
        const saved = localStorage.getItem(`player_combatState_${activeCode}`);
        return saved ? JSON.parse(saved) : { isActive: false, round: 1, currentTurnIndex: 0, secondsPassed: 0 };
    });
    
    // Diğer oyuncular (GM socket'ten gelecek; şimdilik mock)
    const [partyMembers, setPartyMembers] = useState([]);

    const [onScreenMedia, setOnScreenMedia] = useState(() => {
        const activeCode = location.state?.gameCode || localStorage.getItem('dnd_gameCode') || 'UNKNOWN';
        const saved = localStorage.getItem(`player_onScreenMedia_${activeCode}`);
        return saved ? JSON.parse(saved) : [];
    });
    const [board, setBoard] = useState(() => {
        const activeCode = location.state?.gameCode || localStorage.getItem('dnd_gameCode') || 'UNKNOWN';
        const saved = localStorage.getItem(`player_board_${activeCode}`);
        return saved ? JSON.parse(saved) : { x: 0, y: 0, scale: 1, rotation: 0 };
    });
    // GM marker/eraser çizimleri (kept)
    const [drawingSnapshot, setDrawingSnapshot] = useState(() => {
        const activeCode = location.state?.gameCode || localStorage.getItem('dnd_gameCode') || 'UNKNOWN';
        return localStorage.getItem(`player_drawingSnapshot_${activeCode}`) || null;
    });
    // Hex harita — oyuncuya özel FİLTRELİ görünüm (GM'den gelir)
    const [playerMap, setPlayerMap] = useState(() => {
        const activeCode = location.state?.gameCode || localStorage.getItem('dnd_gameCode') || 'UNKNOWN';
        const saved = localStorage.getItem(`player_hexmap_${activeCode}`);
        try { return applyMapJson(saved ? JSON.parse(saved) : {}); } catch (e) { return applyMapJson({}); }
    });
    const [playerTool, setPlayerTool] = useState('cursor'); // 'cursor' | 'laser'
    const [drawingColor, setDrawingColor] = useState('#ffd24d');
    const canvasSize = { w: 4000, h: 4000 };
    const overlayCanvasRef = useRef(null);
    const isDrawingRef = useRef(false);
    const laserPointsRef = useRef([]);
    const clearLaserTimeoutRef = useRef(null);

    const [showTurnAlert, setShowTurnAlert] = useState(false);

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
                    const others = gameData.players.filter(p => p.characterId?._id !== character?._id);
                    const mapped = others.map(p => {
                        const char = p.characterId || {};
                        return {
                            id: char._id || p.characterId || p._id,
                            name: char.name || p.characterName,
                            charClass: char.charClass || '',
                            level: char.level || 1,
                            currentHp: char.currentHp || 10,
                            maxHp: char.maxHp || 10
                        };
                    });
                    setPartyMembers(mapped);
                }
            }
        } catch (error) {
            console.error("Error fetching game details:", error);
        }
    };

    // ── Yardımcı ─────────────────────────────
    const addLog = (text, isHidden = false) => {
        setLogs(prev => {
            const updated = [...prev, { id: Date.now() + Math.random(), text, isHidden }];
            localStorage.setItem(`player_logs_${gameCode}`, JSON.stringify(updated));
            return updated;
        });
    };

    // Mount olunca veritabanından en güncel karakter verisini çekip eşitle
    useEffect(() => {
        const syncLatestCharacter = async () => {
            if (!character?._id) return;
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            if (!token) return;
            try {
                const response = await fetch('http://localhost:5001/api/characters', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    const current = data.find(c => c._id === character._id);
                    if (current) {
                        setCharacter(current);
                        localStorage.setItem('dnd_character', JSON.stringify(current));
                    }
                }
            } catch (err) {
                console.error("Failed to sync latest character from DB:", err);
            }
        };
        syncLatestCharacter();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Guard & Socket Setup ─────────────────
    useEffect(() => {
        if (!character) { navigate('/join-game'); return; }

        socket.connect();
        socket.emit('join_room', { gameCode, playerName: character.name });
        setIsConnected(true);
        addLog(`✅ "${gameCode}" odasına bağlanıldı!`);

        fetchGameDetails();

        socket.on('log_update',     ({ text, isHidden }) => addLog(text, isHidden));
        socket.on('player_joined',  ({ playerName })     => {
            addLog(`👤 ${playerName} katıldı.`);
            fetchGameDetails();
        });
        socket.on('player_left',    ({ playerName })     => {
            addLog(`👤 ${playerName} ayrıldı.`);
            fetchGameDetails();
        });
        socket.on('map_changed',    ({ mapUrl, onScreenMedia: osm, board: b }) => {
            if (osm) {
                setOnScreenMedia(osm);
                localStorage.setItem(`player_onScreenMedia_${gameCode}`, JSON.stringify(osm));
            }
            if (b) {
                setBoard(b);
                localStorage.setItem(`player_board_${gameCode}`, JSON.stringify(b));
            }
            setActiveMapUrl(mapUrl);
            if (mapUrl) {
                localStorage.setItem(`player_activeMapUrl_${gameCode}`, mapUrl);
            } else {
                localStorage.removeItem(`player_activeMapUrl_${gameCode}`);
            }
            addLog('🗺️ GM yeni harita paylaştı.');
        });
        // Hex harita (GM'den filtrelenmiş görünüm)
        socket.on('hexmap_updated', ({ map }) => {
            if (!map) return;
            setPlayerMap(applyMapJson(map));
            localStorage.setItem(`player_hexmap_${gameCode}`, JSON.stringify(map));
        });
        // Lazer işaretçisi (GM / diğer oyuncular) — geçici
        socket.on('laser_pointed', ({ points, color }) => drawRemoteLaser(points, color));
        socket.on('tokens_updated', ({ tokens: t })      => {
            setTokens(t);
            localStorage.setItem(`player_tokens_${gameCode}`, JSON.stringify(t));
        });
        socket.on('combat_updated', ({ combatState: cs, tokens: t }) => {
            setCombatState(cs);
            setTokens(t);
            localStorage.setItem(`player_combatState_${gameCode}`, JSON.stringify(cs));
            localStorage.setItem(`player_tokens_${gameCode}`, JSON.stringify(t));
            addLog(cs.isActive ? '⚔️ SAVAŞ BAŞLADI!' : '🛡️ Savaş sona erdi.');
            if (cs.isActive) setIsSidebarOpen(true);
        });
        socket.on('hp_changed', ({ playerId, currentHp }) => {
            // Karakter kendi ID'sine sahipse direkt güncelle ve veritabanına kaydet!
            if (character && (character._id === playerId || character.id === playerId)) {
                setCharacter(prev => {
                    const updated = { ...prev, currentHp: typeof currentHp === 'number' ? currentHp : prev.currentHp };
                    localStorage.setItem('dnd_character', JSON.stringify(updated));

                    // GM'in can değişikliğini DB'ye otomatik kaydet
                    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
                    if (token && prev._id) {
                        fetch(`http://localhost:5001/api/characters/${prev._id}`, {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({ currentHp })
                        }).catch(err => console.error("Error saving character HP change from GM to DB:", err));
                    }
                    return updated;
                });
            }
            // Party member HP'si de güncelle
            setPartyMembers(prev => prev.map(p =>
                (p.id === playerId || p._id === playerId) ? { ...p, currentHp } : p
            ));
        });
        // GM marker/eraser çizimleri (kept)
        socket.on('drawing_updated', ({ drawingSnapshot: ds }) => {
            if (ds !== undefined) {
                setDrawingSnapshot(ds);
                if (ds) {
                    localStorage.setItem(`player_drawingSnapshot_${gameCode}`, ds);
                } else {
                    localStorage.removeItem(`player_drawingSnapshot_${gameCode}`);
                }
            }
        });
        // GM veya diğer oyunculardan gelen anlık karakter güncellemeleri
        socket.on('character_updated', ({ playerId, character: updatedChar }) => {
            if (character && (character._id === playerId || character.id === playerId)) {
                setCharacter(prev => {
                    const updated = { ...prev, ...updatedChar };
                    localStorage.setItem('dnd_character', JSON.stringify(updated));
                    return updated;
                });
            }
            setPartyMembers(prev => prev.map(p =>
                (p.id === playerId || p._id === playerId) ? { 
                    ...p, 
                    name: updatedChar.name,
                    charClass: updatedChar.charClass,
                    level: updatedChar.level,
                    currentHp: updatedChar.currentHp,
                    maxHp: updatedChar.maxHp 
                } : p
            ));
        });

        return () => {
            socket.emit('leave_room', { gameCode, playerName: character.name });
            ['log_update','player_joined','player_left','map_changed','tokens_updated','combat_updated','hp_changed','hexmap_updated','laser_pointed','drawing_updated','character_updated']
                .forEach(ev => socket.off(ev));
            socket.disconnect();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gameCode]);

    // ── Log auto-scroll ───────────────────────
    useEffect(() => {
        if (isHudOpen && logRef.current)
            logRef.current.scrollTop = logRef.current.scrollHeight;
    }, [logs, isHudOpen]);

    // Combat: bu oyuncunun sırası mı?
    const myIdx    = tokens.findIndex(t => t.playerId === character?._id || t.playerId === character?.id);
    const isMyTurn = combatState.isActive && myIdx !== -1 && combatState.currentTurnIndex === myIdx;

    // ── Turn Alert Effect ────────────────────
    useEffect(() => {
        if (isMyTurn) {
            const currentTurnKey = { round: combatState.round, turnIndex: combatState.currentTurnIndex };
            if (
                lastAlertedTurnRef.current.round !== currentTurnKey.round ||
                lastAlertedTurnRef.current.turnIndex !== currentTurnKey.turnIndex
            ) {
                lastAlertedTurnRef.current = currentTurnKey;
                setShowTurnAlert(true);
                const timer = setTimeout(() => {
                    setShowTurnAlert(false);
                }, 3000); // 3 saniye sonra ekrandan kaybolur
                return () => clearTimeout(timer);
            }
        } else {
            setShowTurnAlert(false);
        }
    }, [isMyTurn, combatState.round, combatState.currentTurnIndex]);

    if (!character) return null;

    // ── Hesaplamalar ─────────────────────────
    const profBonus = Math.ceil(character.level / 4) + 1;

    const getSkillBonus = (stat, skill) => {
        const mod  = calcMod(character.stats[stat]);
        const prof = character.proficiencies?.[`${stat}-${skill}`] ? profBonus : 0;
        return mod + prof;
    };

    // ── Handlers ────────────────────────────
    const handleStatChange = (field, val) => {
        setCharacter(prev => {
            if (!prev) return prev;
            const updated = { ...prev, [field]: val };
            localStorage.setItem('dnd_character', JSON.stringify(updated));
            
            // GM'e ve odaya anlık stat güncellemesini bildir
            socket.emit('player_stat_update', {
                gameCode,
                playerId: prev._id || prev.id,
                character: updated
            });

            // Veritabanına kaydet
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const characterId = prev._id || prev.id;
            if (token && characterId) {
                fetch(`http://localhost:5001/api/characters/${characterId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ [field]: val })
                }).catch(err => console.error("Error saving character stat to DB:", err));
            }

            return updated;
        });
    };

    const handleRollDice = () => {
        let total = 0, rolls = [];
        for (let i = 0; i < diceQty; i++) { const r = Math.floor(Math.random() * diceType) + 1; rolls.push(r); total += r; }
        const rollText = `${character.name} – ${diceQty}d${diceType} 🎲 [${rolls.join(', ')}] = ${total}`;
        addLog(rollText, isHiddenRoll);
        socket.emit('dice_roll', { gameCode, playerName: character.name, rollText, isHidden: isHiddenRoll });
        if (!isHudOpen) setIsHudOpen(true);
    };

    const rollSkill = (name, bonus) => {
        const roll = Math.floor(Math.random() * 20) + 1;
        const total = roll + bonus;
        const rollText = `${character.name} – ${name}: d20(${roll}) ${fmtMod(bonus)} = ${total}`;
        addLog(rollText, false);
        socket.emit('dice_roll', { gameCode, playerName: character.name, rollText, isHidden: false });
        if (!isHudOpen) setIsHudOpen(true);
    };

    // ── Hex harita: oyuncu etkileşimleri ──────
    const myCharId = character?._id || character?.id;

    const handlePlayerTokenMove = (tokenId, q, r) => {
        setTokens(prev => prev.map(t => t.id === tokenId ? { ...t, q, r } : t)); // optimistic
        socket.emit('player_token_move', { gameCode, tokenId, q, r, playerName: character?.name });
    };
    const handlePlayerPickup = (obj) => {
        setPlayerMap(prev => ({ ...prev, mapObjects: prev.mapObjects.filter(o => o.id !== obj.id) })); // optimistic
        socket.emit('player_object_pickup', { gameCode, objectId: obj.id, playerName: character?.name });
        addLog(`🫳 ${obj.name || obj.type} alındı.`, false);
    };

    // ── Player laser (geçici / kaybolan) ──────
    const drawRemoteLaser = (points, color) => {
        const canvas = overlayCanvasRef.current;
        if (!canvas || !points || points.length === 0) return;
        const ctx = canvas.getContext('2d');
        ctx.beginPath();
        ctx.strokeStyle = color || '#ffd24d';
        ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.moveTo(points[0].x, points[0].y);
        points.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.stroke();
        if (clearLaserTimeoutRef.current) clearTimeout(clearLaserTimeoutRef.current);
        clearLaserTimeoutRef.current = setTimeout(() => {
            if (overlayCanvasRef.current) overlayCanvasRef.current.getContext('2d').clearRect(0, 0, canvasSize.w, canvasSize.h);
            clearLaserTimeoutRef.current = null;
        }, 1500);
    };
    const handleLaserDown = (e) => {
        if (playerTool !== 'laser') return;
        e.stopPropagation();
        isDrawingRef.current = true;
        const pos = { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY };
        const ctx = overlayCanvasRef.current.getContext('2d');
        ctx.beginPath(); ctx.moveTo(pos.x, pos.y);
        ctx.strokeStyle = drawingColor; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        laserPointsRef.current = [pos];
    };
    const handleLaserMove = (e) => {
        if (!isDrawingRef.current || playerTool !== 'laser') return;
        const pos = { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY };
        const ctx = overlayCanvasRef.current.getContext('2d');
        ctx.lineTo(pos.x, pos.y); ctx.stroke();
        laserPointsRef.current.push(pos);
    };
    const handleLaserUp = () => {
        if (!isDrawingRef.current) return;
        isDrawingRef.current = false;
        if (laserPointsRef.current.length > 1) {
            socket.emit('laser_point', { gameCode, points: laserPointsRef.current, color: drawingColor });
        }
        laserPointsRef.current = [];
        if (clearLaserTimeoutRef.current) clearTimeout(clearLaserTimeoutRef.current);
        clearLaserTimeoutRef.current = setTimeout(() => {
            if (overlayCanvasRef.current) overlayCanvasRef.current.getContext('2d').clearRect(0, 0, canvasSize.w, canvasSize.h);
            clearLaserTimeoutRef.current = null;
        }, 1500);
    };

    const bgRect = playerMap.backgroundImageUrl ? mapPixelRect(playerMap.mapMeta.width, playerMap.mapMeta.height, playerMap.hexConfig.size) : null;

    // ─────────────────────────────────────────
    return (
        <div className="player-dashboard-wrapper">

            {/* ── SENİN SIRAN UYARISI ──────────────── */}
            {showTurnAlert && <div className="my-turn-alert">⚔️ SENİN SIRAN!</div>}

            {/* ── OYUNCU ARAÇLARI: cursor / lazer ──── */}
            <div className="player-laser-toggle">
                <button type="button" className={`tool-btn ${playerTool === 'cursor' ? 'active' : ''}`} onClick={() => setPlayerTool('cursor')} title="Cursor / move your token">👆</button>
                <button type="button" className={`tool-btn ${playerTool === 'laser' ? 'active' : ''}`} onClick={() => setPlayerTool('laser')} title="Laser pointer (fades)">⚡</button>
                <input type="color" className="color-picker-tool" value={drawingColor} onChange={(e) => setDrawingColor(e.target.value)} title="Laser color" />
            </div>

            {/* ================= LAYER 0: MAP, ÇİZİM & TOKENS ================= */}
            <div className="layer-map">
                <div className="canvas-view-area">
                    <div 
                        className="canvas-transform-group"
                        style={{
                            width: 4000, height: 4000,
                            transform: `translate(${board.x}px, ${board.y}px) scale(${board.scale}) rotate(${board.rotation}deg)`,
                        }}
                    >
                        {/* Hex haritası arka plan görseli (en altta) */}
                        {bgRect && (
                            <img className="hexmap-bg" src={playerMap.backgroundImageUrl} alt="" draggable={false}
                                style={{ position: 'absolute', left: bgRect.left, top: bgRect.top, width: bgRect.width, height: bgRect.height, objectFit: 'cover', pointerEvents: 'none' }} />
                        )}

                        {/* GM'in paylaştığı resimler/haritalar (kept) */}
                        {onScreenMedia.map(media => (
                            <div key={media.id} style={{ position: 'absolute', left: media.x, top: media.y, pointerEvents: 'none' }}>
                                <img src={media.url} alt="Media" draggable="false" style={{maxWidth: '800px', maxHeight: '800px', display: 'block'}} />
                            </div>
                        ))}

                        {/* HEX TERRAIN (oyuncuya görünür alan) */}
                        <HexMapBoard
                            layer="terrain" role="player"
                            hexes={playerMap.hexes} hexConfig={playerMap.hexConfig} mapMeta={playerMap.mapMeta}
                            activeTool={playerTool}
                        />

                        {/* GM MARKER/ERASER ÇİZİMLERİ (snapshot olarak göster) */}
                        {drawingSnapshot && (
                            <img
                                src={drawingSnapshot}
                                alt="gm-drawing"
                                style={{
                                    position: 'absolute',
                                    top: 0, left: 0,
                                    width: 4000, height: 4000,
                                    pointerEvents: 'none',
                                    imageRendering: 'pixelated',
                                }}
                                draggable={false}
                            />
                        )}

                        {/* Oyuncu lazeri (geçici) — sadece 'laser' aracı seçiliyken event yakalar */}
                        <canvas
                            ref={overlayCanvasRef} width={canvasSize.w} height={canvasSize.h} className="drawing-canvas overlay-canvas"
                            onMouseDown={handleLaserDown} onMouseMove={handleLaserMove} onMouseUp={handleLaserUp} onMouseOut={handleLaserUp}
                            style={{ pointerEvents: playerTool === 'laser' ? 'auto' : 'none' }}
                        />

                        {/* HEX OBJELERİ & TOKENLAR — kendi tokenını sürükle, pickable nesneleri al */}
                        <HexMapBoard
                            layer="tokens" role="player"
                            hexes={playerMap.hexes} mapObjects={playerMap.mapObjects} tokens={tokens}
                            hexConfig={playerMap.hexConfig} mapMeta={playerMap.mapMeta}
                            activeTool={playerTool} combatState={combatState}
                            myCharId={myCharId}
                            onTokenMove={handlePlayerTokenMove}
                            onObjectClick={handlePlayerPickup}
                        />
                    </div>
                </div>

                {Object.keys(playerMap.hexes).length === 0 && onScreenMedia.length === 0 && (
                    <div className="board-placeholder">
                        <span className="board-placeholder-icon">🗺️</span>
                        <h3>OYUN TAHTASI</h3>
                        <p>GM harita paylaşmayı bekliyor...</p>
                    </div>
                )}
            </div>

            {/* ═══════════════════════════════════════
                LAYER 1 — SOL SIDEBAR
                Normal: Party Members
                Savaş:  Combat Order  (z-index: 6)
            ═══════════════════════════════════════ */}
            <div className={`layer-sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
                <button type="button" className="sidebar-toggle-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                    {isSidebarOpen ? '◀' : '▶'}
                </button>
                <div className="sidebar-content">
                    {combatState.isActive ? (
                        /* ── SAVAŞ SIRASI ─────────────── */
                        <>
                            <h3 className="sidebar-title" style={{ color: '#ff4d4d' }}>⚔️ COMBAT ORDER</h3>
                            <div className="combat-stats-header">
                                <span>Round {combatState.round}</span>
                                <span>⏱️ {combatState.secondsPassed}s</span>
                            </div>
                            <div className="player-list combat-list">
                                {tokens.map((t, idx) => (
                                    <div
                                        key={t.id}
                                        className={`player-card combat-card ${idx === combatState.currentTurnIndex ? 'active-turn' : ''}`}
                                    >
                                        <div className="p-card-header">
                                            <strong>{idx === combatState.currentTurnIndex ? '▶ ' : ''}{t.name || 'Unknown'}</strong>
                                            <span className="p-init-tag">Init: {t.initiativeRoll ?? '?'}</span>
                                        </div>
                                        <div className="p-card-sub" style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span>HP: {t.hp ?? '?'}/{t.maxHp ?? '?'}</span>
                                            <span>AC: {t.ac ?? '?'}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        /* ── PARTY LİSTESİ ────────────── */
                        <>
                            <h3 className="sidebar-title">PARTY MEMBERS</h3>
                            <div className="player-list">
                                {/* Kendi kartı */}
                                <div className="player-card active">
                                    <div className="p-card-header">
                                        <strong>{character.name} (Sen)</strong>
                                        <span className="p-hp-tag">HP: {character.currentHp}/{character.maxHp}</span>
                                    </div>
                                    <div className="p-card-sub">Lv.{character.level} {character.charClass}</div>
                                </div>
                                {/* Diğer oyuncular (socket'ten) */}
                                {partyMembers.map(p => (
                                    <div key={p.id} className="player-card">
                                        <div className="p-card-header">
                                            <strong>{p.name}</strong>
                                            <span className="p-hp-tag">HP: {p.currentHp}/{p.maxHp}</span>
                                        </div>
                                        <div className="p-card-sub">Lv.{p.level} {p.charClass}</div>
                                    </div>
                                ))}
                                {partyMembers.length === 0 && (
                                    <p className="empty-msg">Diğer oyuncular bekleniyor...</p>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* ═══════════════════════════════════════
                LAYER 3 — ÜST MENÜ (z-index: 10)
                Character Info + stats & skills (Moved from bottom)
            ═══════════════════════════════════════ */}
            <div className={`layer-top-menu ${isTopOpen ? 'open' : 'closed'}`}>
                <div className="top-menu-content">
                    <div className="top-left">
                        <button type="button" className="exit-btn" onClick={() => navigate('/main-menu')}>🚪 ÇIKIŞ</button>

                        <div className="char-info">
                            <span className="char-name">{character.name}</span>
                            <span className="char-sub">Lv.{character.level} {character.charClass} • {character.species}</span>
                        </div>

                        {/* Combat Stats */}
                        <div className="top-combat-stats">
                            <div className="top-stat">
                                <label>AC</label>
                                <input type="number" value={character.armorClass} onChange={e => handleStatChange('armorClass', parseInt(e.target.value) || 0)} />
                            </div>
                            <div className="top-stat">
                                <label>HIZ</label>
                                <input type="number" value={character.speed} onChange={e => handleStatChange('speed', parseInt(e.target.value) || 0)} />
                            </div>
                            <div className="top-stat">
                                <label>HP</label>
                                <div className="hp-inputs">
                                    <input type="number" className="hp-current" value={character.currentHp} onChange={e => handleStatChange('currentHp', parseInt(e.target.value) || 0)} />
                                    <span className="hp-divider">/</span>
                                    <input type="number" value={character.maxHp} onChange={e => handleStatChange('maxHp', parseInt(e.target.value) || 0)} />
                                </div>
                            </div>
                            <div className="top-stat">
                                <label>PB</label>
                                <span className="prof-val">+{profBonus}</span>
                            </div>
                            <button
                                type="button"
                                className={`insp-btn ${character.inspiration ? 'active' : ''}`}
                                onClick={() => setCharacter(prev => ({ ...prev, inspiration: !prev.inspiration }))}
                            >
                                {character.inspiration ? '🌟 İLHAM' : '⭐ İLHAM'}
                            </button>
                        </div>

                        {/* COMPACT STATS & SKILLS WIDGET */}
                        <div className="compact-character-sheets">
                            {/* Left side: Skills list for selectedStat */}
                            {selectedStat && (
                                <div className="compact-skills-panel">
                                    <div className="csp-header">
                                        <span>{selectedStat.toUpperCase()}</span>
                                    </div>
                                    <div className="csp-list">
                                        {/* Genel Zar (Raw Ability Check) */}
                                        <button
                                            type="button"
                                            className="csp-roll-btn ability-check"
                                            title={`${selectedStat} Kontrolü Zar At`}
                                            onClick={() => rollSkill(`${selectedStat} Kontrolü`, calcMod(character.stats[selectedStat]))}
                                        >
                                            <span className="csp-roll-name">Genel Zar</span>
                                            <span className="csp-roll-bonus">{fmtMod(calcMod(character.stats[selectedStat]))}</span>
                                        </button>

                                        {/* Nitelik Yetenekleri */}
                                        {statConfig[selectedStat].map(skill => {
                                            const bonus = getSkillBonus(selectedStat, skill);
                                            const isProf = character.proficiencies?.[`${selectedStat}-${skill}`];
                                            return (
                                                <button
                                                    key={skill}
                                                    type="button"
                                                    className={`csp-roll-btn ${isProf ? 'proficient' : ''}`}
                                                    title={`${skill} Zar At`}
                                                    onClick={() => rollSkill(skill, bonus)}
                                                >
                                                    <span className="csp-roll-name">
                                                        <span className={`prof-dot ${isProf ? 'active' : ''}`} />
                                                        {skill}
                                                    </span>
                                                    <span className="csp-roll-bonus">{fmtMod(bonus)}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Right side: 2 columns x 3 rows grid */}
                            <div className="compact-stats-grid">
                                {Object.keys(statConfig).map(stat => {
                                    const score = character.stats[stat];
                                    const mod = calcMod(score);
                                    const isSelected = selectedStat === stat;
                                    return (
                                        <button
                                            key={stat}
                                            type="button"
                                            className={`compact-stat-card ${isSelected ? 'selected' : ''}`}
                                            onClick={() => setSelectedStat(stat)}
                                            title={`${stat}: ${score} (Yetenekleri Göster)`}
                                        >
                                            <span className="csc-abbr">{stat.substring(0, 3).toUpperCase()}</span>
                                            <span className="csc-mod">{fmtMod(mod)}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="top-right">
                        {/* Bağlantı */}
                        <div className={`connection-badge ${isConnected ? 'connected' : 'disconnected'}`}>
                            ● {isConnected ? 'ONLINE' : 'OFFLINE'}
                        </div>
                        {/* Savaş göstergesi */}
                        {combatState.isActive && (
                            <div className="combat-active-badge">
                                ⚔️ TUR {combatState.round}
                            </div>
                        )}
                    </div>
                </div>

                <div className="menu-handle top-handle" onClick={() => setIsTopOpen(!isTopOpen)}>
                    {isTopOpen ? '▲ KARAKTER' : '▼ KARAKTER'}
                </div>
            </div>

            {/* ═══════════════════════════════════════
                LAYER 3 — ALT MENÜ: (Boş bırakıldı, farklı içerikler eklenecek) (z-index: 10)
            ═══════════════════════════════════════ */}
            <div className={`layer-bottom-menu ${isBottomOpen ? 'open' : 'closed'}`}>
                <div
                    className="menu-handle bottom-handle"
                    onClick={e => { e.stopPropagation(); setIsBottomOpen(!isBottomOpen); }}
                >
                    {isBottomOpen ? '▼ ENVENTER & GÖREVLER' : '▲ ENVENTER & GÖREVLER'}
                </div>

                <div className="bottom-menu-content" style={{ justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ color: 'rgba(255,255,255,0.22)', fontStyle: 'italic', letterSpacing: '1px', fontSize: '11px', fontFamily: 'Cinzel, serif' }}>
                        🛡️ Alt panel içeriği yakında eklenecektir...
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════
                LAYER 4 — HUD: Zar & Log  (z-index: 20)
                GMDashboard'daki layer-hud ile birebir aynı
            ═══════════════════════════════════════ */}
            <button
                type="button"
                className={`hud-fab-btn ${!isHudOpen ? 'visible' : 'hidden'} ${isBottomOpen ? 'shifted' : ''}`}
                onClick={e => { e.stopPropagation(); setIsHudOpen(true); }}
            >
                🎲 ZAR & LOGLAR
            </button>

            <div className={`layer-hud ${isHudOpen ? 'visible' : 'hidden'} ${isBottomOpen ? 'shifted' : ''}`}>
                <div className="hud-header-bar">
                    <span>ZAR & LOGLAR</span>
                    <button type="button" className="hud-close-btn" onClick={e => { e.stopPropagation(); setIsHudOpen(false); }}>✕</button>
                </div>

                <div className="hud-content">
                    {/* Zar Paneli */}
                    <div className="dice-panel">
                        <div className="dice-controls">
                            <input type="number" min="1" max="99" value={diceQty} onChange={e => setDiceQty(parseInt(e.target.value) || 1)} />
                            <span>d</span>
                            <select value={diceType} onChange={e => setDiceType(parseInt(e.target.value))}>
                                <option value={4}>4</option>
                                <option value={6}>6</option>
                                <option value={8}>8</option>
                                <option value={10}>10</option>
                                <option value={12}>12</option>
                                <option value={20}>20</option>
                                <option value={100}>100</option>
                            </select>
                        </div>
                        <div className="dice-actions">
                            <label className="hidden-roll-toggle">
                                <input type="checkbox" checked={isHiddenRoll} onChange={e => setIsHiddenRoll(e.target.checked)} />
                                <span className="toggle-label">Gizli</span>
                            </label>
                            <button type="button" className="roll-btn" onClick={handleRollDice}>ROLL 🎲</button>
                        </div>
                    </div>

                    {/* Log Paneli */}
                    <div className="log-panel">
                        <div className="log-header">COMBAT & EVENT LOG</div>
                        <div className="log-messages" ref={logRef}>
                            {logs.map(log => (
                                <div key={log.id} className={`log-entry ${log.isHidden ? 'hidden-log' : 'public-log'}`}>
                                    {log.isHidden && <span className="hidden-icon">👁️‍🗨️ </span>}
                                    {log.text}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default PlayerDashboard;
