import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SummaryStep from '../CraracterSheet/SummaryStep'; 
import './GMDashboard.css';

const GMDashboard = () => {
    const navigate = useNavigate();
    const logContainerRef = useRef(null);

    // --- PANEL STATE'LERİ ---
    const [isTopOpen, setIsTopOpen] = useState(true);
    const [isBottomOpen, setIsBottomOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isHudOpen, setIsHudOpen] = useState(true);

    // --- OYUN & ZAR STATE'LERİ ---
    const gameCode = "EPIC2026";
    const [logs, setLogs] = useState([{ id: 1, text: "Campaign Started. Waiting for players...", isHidden: false }]);
    const [diceQty, setDiceQty] = useState(1);
    const [diceType, setDiceType] = useState(20);
    const [isHiddenRoll, setIsHiddenRoll] = useState(false);

    // --- MEDYA & CANVAS STATE'LERİ ---
    const [bottomTab, setBottomTab] = useState('maps'); // 'maps', 'images', 'grid'
    const [maps, setMaps] = useState([]);
    const [images, setImages] = useState([]);
    const [activeCanvas, setActiveCanvas] = useState(null); 
    const fileInputRef = useRef(null);
    const canvasImageRef = useRef(null);

    // --- SÜRÜKLEME (PAN) STATE'LERİ (HARİTA İÇİN) ---
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    // --- GRID & TOKEN STATE'LERİ (YENİ) ---
    const [grid, setGrid] = useState({ isVisible: false, type: 'square', size: 60, rotation: 0, opacity: 0.5 });
    const [tokens, setTokens] = useState([]);
    const [draggedToken, setDraggedToken] = useState(null); // { id, offsetX, offsetY }

    // --- OYUNCU (MOCK DATA) ---
    const [players, setPlayers] = useState([
        { id: 'p1', name: 'Elandor', charClass: 'Rogue', level: 4, species: 'Elf', playerName: 'Ahmet', stats: { Strength: 10, Dexterity: 18, Constitution: 12, Intelligence: 14, Wisdom: 10, Charisma: 14 }, proficiencies: { 'Dexterity-Stealth': true }, armorClass: 15, currentHp: 28, maxHp: 32, speed: 30, weapons: [{ id: 1, name: 'Rapier', damageDice: '1d8' }], spellSlots: { 1: { max: 0, used: 0 } }, spells: [], currency: { cp: 0, sp: 5, ep: 0, gp: 120, pp: 0 }, inventory: [], traits: { personality: 'Shadows are friends.' }, portrait: null },
        { id: 'p2', name: 'Thorgal', charClass: 'Barbarian', level: 4, species: 'Orc', playerName: 'Can', stats: { Strength: 20, Dexterity: 14, Constitution: 16, Intelligence: 8, Wisdom: 10, Charisma: 10 }, proficiencies: { 'Strength-Athletics': true }, armorClass: 16, currentHp: 45, maxHp: 45, speed: 40, weapons: [{ id: 1, name: 'Greataxe', damageDice: '1d12' }], spellSlots: { 1: { max: 0, used: 0 } }, spells: [], currency: { cp: 0, sp: 0, ep: 0, gp: 10, pp: 0 }, inventory: [], traits: { personality: 'SMASH!' }, portrait: null }
    ]);
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const calculateModifier = (score) => Math.floor((score - 10) / 2);

    useEffect(() => {
        if (isHudOpen && logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [logs, isHudOpen]);

    // --- EVRENSEL FARE HAREKETLERİ (Harita ve Token) ---
    const handleMouseMove = (e) => {
        if (draggedToken) {
            // Token Sürükleniyorsa
            setTokens(prev => prev.map(t => 
                t.id === draggedToken.id 
                ? { ...t, x: e.clientX - draggedToken.offsetX, y: e.clientY - draggedToken.offsetY } 
                : t
            ));
        } else if (isDragging && activeCanvas) {
            // Harita Sürükleniyorsa
            setActiveCanvas(prev => ({
                ...prev,
                x: e.clientX - dragStart.x,
                y: e.clientY - dragStart.y
            }));
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        setDraggedToken(null);
    };

    // --- HARİTA FARE OLAYLARI ---
    const handleMapMouseDown = (e) => {
        if (!activeCanvas) return;
        setIsDragging(true);
        setDragStart({ x: e.clientX - activeCanvas.x, y: e.clientY - activeCanvas.y });
    };

    // --- TOKEN FARE OLAYLARI (YENİ) ---
    const handleTokenMouseDown = (e, token) => {
        e.stopPropagation(); // Haritanın sürüklenmesini engelle
        setDraggedToken({ id: token.id, offsetX: e.clientX - token.x, offsetY: e.clientY - token.y });
    };

    const handleAddToken = (color) => {
        const newToken = {
            id: Date.now(),
            color: color,
            x: window.innerWidth / 2, // Ekranın ortasında doğar
            y: window.innerHeight / 2
        };
        setTokens(prev => [...prev, newToken]);
        addLog(`${color.toUpperCase()} Token added to the board.`, true);
    };

    const handleClearTokens = () => {
        setTokens([]);
        addLog(`All tokens cleared.`, true);
    };

    // --- HANDLERS (MEDYA & CANVAS) ---
    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        const newItem = { id: Date.now(), name: file.name, url };
        
        if (bottomTab === 'maps') setMaps(prev => [...prev, newItem]);
        else setImages(prev => [...prev, newItem]);
        e.target.value = null; 
    };

    const handleMediaDelete = (id, e) => {
        e.stopPropagation();
        if(!window.confirm("Silmek istediğine emin misin?")) return;
        if (bottomTab === 'maps') setMaps(prev => prev.filter(m => m.id !== id));
        else setImages(prev => prev.filter(img => img.id !== id));
        if(activeCanvas && (maps.find(m => m.id === id) || images.find(img => img.id === id))) setActiveCanvas(null);
    };

    const handleShowOnCanvas = (item, type) => {
        setActiveCanvas({ url: item.url, scale: 1, rotation: 0, type, x: 0, y: 0 });
    };

    const handleCanvasTransform = (action) => {
        if (!activeCanvas) return;
        setActiveCanvas(prev => {
            let { scale, rotation, x, y } = prev;
            if (action === 'zoomIn') scale = Math.min(10, scale + 0.1);
            if (action === 'zoomOut') scale = Math.max(0.1, scale - 0.1);
            if (action === 'rotateLeft') rotation -= 15;
            if (action === 'rotateRight') rotation += 15;
            if (action === 'reset') { scale = 1; rotation = 0; x = 0; y = 0; }
            return { ...prev, scale, rotation, x, y };
        });
    };

    // --- HANDLERS (ZAR & LOG) ---
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
        <div className="gm-dashboard-wrapper" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
            
            {/* ================= LAYER 0: MAP, GRID & TOKENS ================= */}
            <div className="layer-map">
                
                {/* 1. Harita Oynatıcısı */}
                {activeCanvas ? (
                    <div className="canvas-view-area">
                        <img 
                            src={activeCanvas.url} alt="Active Canvas" className="canvas-image" ref={canvasImageRef}
                            style={{ 
                                transform: `translate(${activeCanvas.x}px, ${activeCanvas.y}px) scale(${activeCanvas.scale}) rotate(${activeCanvas.rotation}deg)`,
                                cursor: isDragging ? 'grabbing' : 'grab' 
                            }} 
                            onMouseDown={handleMapMouseDown} draggable="false" 
                        />
                        <div className="canvas-controls">
                            <div className="zoom-ctrls">
                                <button type="button" onClick={() => handleCanvasTransform('zoomOut')} title="Zoom Out">[-]</button>
                                <span>Zoom: {activeCanvas.scale.toFixed(1)}x</span>
                                <button type="button" onClick={() => handleCanvasTransform('zoomIn')} title="Zoom In">[+]</button>
                            </div>
                            <div className="rotate-ctrls">
                                <button type="button" onClick={() => handleCanvasTransform('rotateLeft')} title="Rotate Left">↺</button>
                                <span>Free Rotate</span>
                                <button type="button" onClick={() => handleCanvasTransform('rotateRight')} title="Rotate Right">↻</button>
                            </div>
                            <button type="button" className="reset-canvas-btn" onClick={() => handleCanvasTransform('reset')}>↩ RESET</button>
                            <button type="button" className="clear-canvas-btn" onClick={() => setActiveCanvas(null)}>✕ CLEAR</button>
                        </div>
                    </div>
                ) : (
                    <div className="canvas-placeholder-text"><span></span><br/></div>
                )}

                {/* 2. Grid Sistemi (Bağımsız Katman) */}
                {grid.isVisible && (
                    <div className="grid-overlay" style={{ opacity: grid.opacity, transform: `rotate(${grid.rotation}deg)` }}>
                        <svg width="100%" height="100%">
                            <defs>
                                <pattern id="squareGrid" width={grid.size} height={grid.size} patternUnits="userSpaceOnUse">
                                    <path d={`M ${grid.size} 0 L 0 0 0 ${grid.size}`} fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1"/>
                                </pattern>
                                {/* Basit Altıgen Deseni Yaklaşımı */}
                                <pattern id="hexGrid" width={grid.size * Math.sqrt(3)} height={grid.size * 1.5} patternUnits="userSpaceOnUse">
                                    <path d={`M ${grid.size * Math.sqrt(3)/2} ${grid.size * 0.5} l ${grid.size * Math.sqrt(3)/2} ${-grid.size * 0.25} l 0 ${-grid.size * 0.5} l ${-grid.size * Math.sqrt(3)/2} ${-grid.size * 0.25} l ${-grid.size * Math.sqrt(3)/2} ${grid.size * 0.25} l 0 ${grid.size * 0.5} z`} fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1"/>
                                </pattern>
                            </defs>
                            <rect width="200%" height="200%" x="-50%" y="-50%" fill={`url(#${grid.type === 'square' ? 'squareGrid' : 'hexGrid'})`} />
                        </svg>
                    </div>
                )}

                {/* 3. Token Sistemi (En üstte, Grid'in üzerinde) */}
                {tokens.map(token => (
                    <div 
                        key={token.id} 
                        className={`map-token color-${token.color} ${draggedToken?.id === token.id ? 'dragging' : ''}`}
                        style={{ 
                            left: token.x, top: token.y, 
                            width: grid.size * 0.8, height: grid.size * 0.8 // Token boyutu gride uyar
                        }}
                        onMouseDown={(e) => handleTokenMouseDown(e, token)}
                    />
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

            {/* ================= LAYER 3: ALT MENÜ (Medya, Grid & Tokenler) ================= */}
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
                        {/* YENİ: Grid Sekmesi */}
                        <button type="button" className={`tab-btn ${bottomTab === 'grid' ? 'active' : ''}`} onClick={() => setBottomTab('grid')} style={{marginTop: '5px', borderColor: '#7ec8ff', color: '#7ec8ff'}}>
                            📐 GRID & TOKENS
                        </button>

                        {(bottomTab === 'maps' || bottomTab === 'images') && (
                            <button type="button" className="upload-media-btn" style={{marginTop: '10px'}} onClick={() => fileInputRef.current?.click()}>
                                + UPLOAD {bottomTab === 'maps' ? 'MAP' : 'IMAGE'}
                            </button>
                        )}
                    </div>

                    {/* GALERİ veya GRID KONTROLLERİ */}
                    <div className="media-gallery">
                        {bottomTab === 'grid' ? (
                            <div className="grid-token-panel">
                                {/* Grid Ayarları */}
                                <div className="grid-settings-box">
                                    <h4>GRID SETTINGS</h4>
                                    <div className="grid-controls-row">
                                        <label>Show: <input type="checkbox" checked={grid.isVisible} onChange={(e) => setGrid({...grid, isVisible: e.target.checked})} /></label>
                                        <label>Type: 
                                            <select value={grid.type} onChange={(e) => setGrid({...grid, type: e.target.value})}>
                                                <option value="square">Square</option>
                                                <option value="hex">Hexagon</option>
                                            </select>
                                        </label>
                                        <label>Size: <input type="range" min="20" max="150" value={grid.size} onChange={(e) => setGrid({...grid, size: parseInt(e.target.value)})} /></label>
                                        <label>Rotate: <input type="range" min="-180" max="180" value={grid.rotation} onChange={(e) => setGrid({...grid, rotation: parseInt(e.target.value)})} /></label>
                                    </div>
                                </div>
                                {/* Token Ayarları */}
                                <div className="token-spawner-box">
                                    <h4>SPAWN TOKENS</h4>
                                    <div className="token-buttons-row">
                                        <button type="button" className="token-btn blue" onClick={() => handleAddToken('blue')}></button>
                                        <button type="button" className="token-btn red" onClick={() => handleAddToken('red')}></button>
                                        <button type="button" className="token-btn green" onClick={() => handleAddToken('green')}></button>
                                        <button type="button" className="token-btn yellow" onClick={() => handleAddToken('yellow')}></button>
                                        <button type="button" className="token-btn purple" onClick={() => handleAddToken('purple')}></button>
                                        <button type="button" className="clear-tokens-btn" onClick={handleClearTokens}>CLEAR ALL</button>
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
                                        <div className="media-card-overlay">
                                            <span className="media-name">{item.name}</span>
                                            <button type="button" className="show-canvas-btn" onClick={() => handleShowOnCanvas(item, bottomTab)}>DISPLAY</button>
                                        </div>
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
                        <div className="dice-actions">
                            <label className="hidden-roll-toggle"><input type="checkbox" checked={isHiddenRoll} onChange={(e) => setIsHiddenRoll(e.target.checked)} /><span className="toggle-label">Hidden</span></label>
                            <button type="button" className="roll-btn" onClick={handleRollDice}>ROLL 🎲</button>
                        </div>
                    </div>
                    <div className="log-panel">
                        <div className="log-header">COMBAT & EVENT LOG</div>
                        <div className="log-messages" ref={logContainerRef}>
                            {logs.map(log => (<div key={log.id} className={`log-entry ${log.isHidden ? 'hidden-log' : 'public-log'}`}>{log.isHidden && <span className="hidden-icon">👁️‍🗨️</span>}{log.text}</div>))}
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default GMDashboard;