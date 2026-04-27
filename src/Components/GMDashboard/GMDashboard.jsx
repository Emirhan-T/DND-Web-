import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SummaryStep from '../CraracterSheet/SummaryStep'; 
import './GMDashboard.css';

const GMDashboard = () => {
    const navigate = useNavigate();
    
    // YENİ: Sadece log kutusunu hedef alacak referans
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

    // --- OYUNCU (MOCK DATA) ---
    const [players, setPlayers] = useState([
        {
            id: 'p1', name: 'Elandor', charClass: 'Rogue', level: 4, species: 'Elf', playerName: 'Ahmet',
            stats: { Strength: 10, Dexterity: 18, Constitution: 12, Intelligence: 14, Wisdom: 10, Charisma: 14 },
            proficiencies: { 'Dexterity-Stealth': true, 'Dexterity-Acrobatics': true },
            armorClass: 15, currentHp: 28, maxHp: 32, speed: 30,
            weapons: [{ id: 1, name: 'Rapier', damageDice: '1d8' }],
            spellSlots: { 1: { max: 0, used: 0 } }, spells: [], currency: { cp: 0, sp: 5, ep: 0, gp: 120, pp: 0 }, inventory: [],
            traits: { personality: 'Always hides in shadows.' }, portrait: null
        },
        {
            id: 'p2', name: 'Thorgal', charClass: 'Barbarian', level: 4, species: 'Orc', playerName: 'Can',
            stats: { Strength: 20, Dexterity: 14, Constitution: 16, Intelligence: 8, Wisdom: 10, Charisma: 10 },
            proficiencies: { 'Strength-Athletics': true },
            armorClass: 16, currentHp: 45, maxHp: 45, speed: 40,
            weapons: [{ id: 1, name: 'Greataxe', damageDice: '1d12' }],
            spellSlots: { 1: { max: 0, used: 0 } }, spells: [], currency: { cp: 0, sp: 0, ep: 0, gp: 10, pp: 0 }, inventory: [],
            traits: { personality: 'SMASH!' }, portrait: null
        }
    ]);

    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const calculateModifier = (score) => Math.floor((score - 10) / 2);

    // YENİ: Agresif kaydırma yerine, sadece kutunun içini kaydıran güvenli kod
    useEffect(() => {
        if (isHudOpen && logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [logs, isHudOpen]);

    // --- HANDLERS ---
    const handleCopyCode = () => {
        navigator.clipboard.writeText(gameCode);
        addLog(`Game Code '${gameCode}' copied to clipboard.`, true);
    };

    const addLog = (text, isHidden = false) => {
        setLogs(prev => [...prev, { id: Date.now(), text, isHidden }]);
    };

    const handleLongRest = () => {
        if(window.confirm("Are you sure? This will restore all HP and Spell Slots for ALL players!")) {
            addLog("The party takes a Long Rest. HP & Spells restored.", false);
        }
    };

    const handleRollDice = () => {
        let total = 0; let rolls = [];
        for(let i = 0; i < diceQty; i++) {
            let roll = Math.floor(Math.random() * diceType) + 1;
            rolls.push(roll); total += roll;
        }
        addLog(`GM Rolled ${diceQty}d${diceType} 🎲 [${rolls.join(', ')}] = Total: ${total}`, isHiddenRoll);
        if(!isHudOpen) setIsHudOpen(true);
    };

    return (
        <div className="gm-dashboard-wrapper">
            
            {/* ================= LAYER 0: EN ALT KATMAN (SABİT HARİTA ALANI) ================= */}
            <div className="layer-map">
                <div className="canvas-placeholder-text">
                    <span>🗺️ MAP & IMAGE CANVAS</span><br/>(Sabit Arka Plan)
                </div>
            </div>

            {/* ================= LAYER 1: KARAKTER KAĞIDI (Açılırsa haritanın üstünde durur) ================= */}
            {selectedPlayer && (
                <div className="layer-character-sheet fade-in">
                    <div className="sheet-overlay-header">
                        <h2>{selectedPlayer.name}'s Sheet</h2>
                        <button type="button" className="close-sheet-btn" onClick={() => setSelectedPlayer(null)}>✕ CLOSE</button>
                    </div>
                    <div className="sheet-scroll-area">
                        <SummaryStep character={selectedPlayer} calculateModifier={calculateModifier} />
                    </div>
                </div>
            )}

            {/* ================= LAYER 2: SOL MENÜ (Oyuncular) ================= */}
            <div className={`layer-sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
                <button type="button" className="sidebar-toggle-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                    {isSidebarOpen ? '◀' : '▶'}
                </button>
                <div className="sidebar-content">
                    <h3 className="sidebar-title">PARTY MEMBERS</h3>
                    <div className="player-list">
                        {players.map(p => (
                            <div key={p.id} className={`player-card ${selectedPlayer?.id === p.id ? 'active' : ''}`} onClick={() => setSelectedPlayer(p)}>
                                <div className="p-card-header">
                                    <strong>{p.name}</strong>
                                    <span className="p-hp-tag">HP: {p.currentHp}/{p.maxHp}</span>
                                </div>
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
                        <div className="game-code-box" onClick={handleCopyCode} title="Click to Copy">
                            JOIN CODE: <span className="highlight-code">{gameCode}</span>
                        </div>
                        <div className="player-count-badge">👥 Players: {players.length}</div>
                    </div>
                    <div className="top-right">
                        <button type="button" className="action-btn combat-btn" onClick={() => addLog("⚔️ COMBAT INITIATED!", false)}>START COMBAT</button>
                        <button type="button" className="action-btn rest-btn" onClick={handleLongRest}>🏕️ LONG REST</button>
                    </div>
                </div>
                <div className="menu-handle top-handle" onClick={() => setIsTopOpen(!isTopOpen)}>{isTopOpen ? '▲' : '▼'}</div>
            </div>

            {/* ================= LAYER 3: ALT MENÜ ================= */}
            <div className={`layer-bottom-menu ${isBottomOpen ? 'open' : 'closed'}`}>
                <div 
                    className="menu-handle bottom-handle" 
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsBottomOpen(!isBottomOpen);
                    }}
                >
                    {isBottomOpen ? '▼' : '▲'} MENU
                </div>
                <div className="bottom-menu-content">
                    <h3 style={{color: '#d4af37', margin: 0}}>Expanded Tools Coming Soon...</h3>
                </div>
            </div>

            {/* ================= LAYER 4: EN ÜST KATMAN (HUD: Log & Zar) ================= */}
            
            <button 
                type="button"
                className={`hud-fab-btn ${!isHudOpen ? 'visible' : 'hidden'} ${isBottomOpen ? 'shifted' : ''}`} 
                onClick={(e) => {
                    e.stopPropagation();
                    setIsHudOpen(true);
                }}
            >
                🎲 DICE & LOGS
            </button>

            <div className={`layer-hud ${isHudOpen ? 'visible' : 'hidden'} ${isBottomOpen ? 'shifted' : ''}`}>
                <div className="hud-header-bar">
                    <span>ACTION CENTER</span>
                    <button 
                        type="button"
                        className="hud-close-btn" 
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsHudOpen(false);
                        }}
                    >
                        ✕
                    </button>
                </div>
                
                <div className="hud-content">
                    <div className="dice-panel">
                        <div className="dice-controls">
                            <input type="number" min="1" max="99" value={diceQty} onChange={(e) => setDiceQty(e.target.value)} />
                            <span>d</span>
                            <select value={diceType} onChange={(e) => setDiceType(e.target.value)}>
                                <option value={4}>4</option><option value={6}>6</option><option value={8}>8</option>
                                <option value={10}>10</option><option value={12}>12</option><option value={20}>20</option><option value={100}>100</option>
                            </select>
                        </div>
                        <div className="dice-actions">
                            <label className="hidden-roll-toggle">
                                <input type="checkbox" checked={isHiddenRoll} onChange={(e) => setIsHiddenRoll(e.target.checked)} />
                                <span className="toggle-label">Hidden</span>
                            </label>
                            <button type="button" className="roll-btn" onClick={handleRollDice}>ROLL 🎲</button>
                        </div>
                    </div>

                    <div className="log-panel">
                        <div className="log-header">COMBAT & EVENT LOG</div>
                        {/* YENİ: ref artık direkt olarak bu kutuya bağlandı */}
                        <div className="log-messages" ref={logContainerRef}>
                            {logs.map(log => (
                                <div key={log.id} className={`log-entry ${log.isHidden ? 'hidden-log' : 'public-log'}`}>
                                    {log.isHidden && <span className="hidden-icon">👁️‍🗨️</span>}
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

export default GMDashboard;