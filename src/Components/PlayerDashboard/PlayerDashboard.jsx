import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import socket from '../../socket';
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

    // ── Panel state (GMDashboard ile birebir) ──
    const [isTopOpen,    setIsTopOpen]    = useState(true);
    const [isBottomOpen, setIsBottomOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isHudOpen,    setIsHudOpen]    = useState(true);

    // Alt menü sekmeleri
    const [bottomTab, setBottomTab] = useState('stats'); // 'stats' | 'skills'

    // ── Karakter & Oyun ─────────────────────
    const [character,    setCharacter]    = useState(location.state?.character || null);
    const [gameCode]                      = useState(location.state?.gameCode  || 'UNKNOWN');
    const [selectedStat, setSelectedStat] = useState('Dexterity');
    const [isConnected,  setIsConnected]  = useState(false);

    // ── Zar ─────────────────────────────────
    const [diceQty,      setDiceQty]      = useState(1);
    const [diceType,     setDiceType]     = useState(20);
    const [isHiddenRoll, setIsHiddenRoll] = useState(false);

    // ── Loglar ───────────────────────────────
    const [logs, setLogs] = useState([
        { id: 1, text: 'Oturuma katıldınız. GM bekleniyor...', isHidden: false }
    ]);

    // ── GM'den gelen veriler ─────────────────
    const [activeMapUrl, setActiveMapUrl] = useState(null);
    const [tokens,       setTokens]       = useState([]);
    const [combatState,  setCombatState]  = useState({ isActive: false, round: 1, currentTurnIndex: 0, secondsPassed: 0 });
    
    // Diğer oyuncular (GM socket'ten gelecek; şimdilik mock)
    const [partyMembers, setPartyMembers] = useState([]);

    // ── Yardımcı ─────────────────────────────
    const addLog = (text, isHidden = false) =>
        setLogs(prev => [...prev, { id: Date.now() + Math.random(), text, isHidden }]);

    // ── Guard & Socket Setup ─────────────────
    useEffect(() => {
        if (!character) { navigate('/join-game'); return; }

        socket.connect();
        socket.emit('join_room', { gameCode, playerName: character.name });
        setIsConnected(true);
        addLog(`✅ "${gameCode}" odasına bağlanıldı!`);

        socket.on('log_update',     ({ text, isHidden }) => addLog(text, isHidden));
        socket.on('player_joined',  ({ playerName })     => addLog(`👤 ${playerName} katıldı.`));
        socket.on('player_left',    ({ playerName })     => addLog(`👤 ${playerName} ayrıldı.`));
        socket.on('map_changed',    ({ mapUrl })         => { setActiveMapUrl(mapUrl); addLog('🗺️ GM yeni harita açtı.'); });
        socket.on('tokens_updated', ({ tokens: t })      => setTokens(t));
        socket.on('combat_updated', ({ combatState: cs, tokens: t }) => {
            setCombatState(cs);
            setTokens(t);
            addLog(cs.isActive ? '⚔️ SAVAŞ BAŞLADI!' : '🛡️ Savaş sona erdi.');
            if (cs.isActive) setIsSidebarOpen(true);
        });
        socket.on('party_update', ({ members }) => setPartyMembers(members));

        return () => {
            socket.emit('leave_room', { gameCode, playerName: character.name });
            ['log_update','player_joined','player_left','map_changed','tokens_updated','combat_updated','party_update']
                .forEach(ev => socket.off(ev));
            socket.disconnect();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Log auto-scroll ───────────────────────
    useEffect(() => {
        if (isHudOpen && logRef.current)
            logRef.current.scrollTop = logRef.current.scrollHeight;
    }, [logs, isHudOpen]);

    if (!character) return null;

    // ── Hesaplamalar ─────────────────────────
    const profBonus = Math.ceil(character.level / 4) + 1;

    const getSkillBonus = (stat, skill) => {
        const mod  = calcMod(character.stats[stat]);
        const prof = character.proficiencies?.[`${stat}-${skill}`] ? profBonus : 0;
        return mod + prof;
    };

    // ── Handlers ────────────────────────────
    const handleStatChange = (field, val) =>
        setCharacter(prev => ({ ...prev, [field]: val }));

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

    // Combat: bu oyuncunun sırası mı?
    const myIdx    = tokens.findIndex(t => t.playerId === character.id);
    const isMyTurn = combatState.isActive && myIdx !== -1 && combatState.currentTurnIndex === myIdx;

    // ─────────────────────────────────────────
    return (
        <div className="pd-wrapper">

            {/* ── SENİN SIRAN ──────────────────────── */}
            {isMyTurn && <div className="pd-my-turn-alert">⚔️ SENİN SIRAN!</div>}

            {/* ═══════════════════════════════════════
                LAYER 0 — MAP (z-index: 1)
            ═══════════════════════════════════════ */}
            <div className="pd-layer-map">
                {activeMapUrl
                    ? <img src={activeMapUrl} alt="Harita" className="pd-game-map" />
                    : (
                        <div className="pd-board-placeholder">
                            <span className="pd-board-icon">🗺️</span>
                            <h3>OYUN TAHTASI</h3>
                            <p>GM harita paylaşmayı bekliyor...</p>
                        </div>
                    )
                }
                {tokens.map((token, idx) => (
                    <div
                        key={token.id}
                        className={`pd-map-token color-${token.color} ${combatState.isActive && combatState.currentTurnIndex === idx ? 'active-turn-token' : ''}`}
                        style={{ left: token.x, top: token.y, width: 50, height: 50 }}
                    >
                        {token.name && <span className="pd-token-name-tag">{token.name}</span>}
                        {token.maxHp && (
                            <div className="pd-token-hp-bar">
                                <div className="pd-token-hp-fill" style={{ width: `${Math.min(100, (token.hp / token.maxHp) * 100)}%` }} />
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* ═══════════════════════════════════════
                LAYER 1 — SOL SIDEBAR
                Normal: Party Members
                Savaş:  Combat Order  (z-index: 6)
            ═══════════════════════════════════════ */}
            <div className={`pd-layer-sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
                <button type="button" className="pd-sidebar-toggle" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                    {isSidebarOpen ? '◀' : '▶'}
                </button>
                <div className="pd-sidebar-content">
                    {combatState.isActive ? (
                        /* ── SAVAŞ SIRASI ─────────────── */
                        <>
                            <h3 className="pd-sidebar-title" style={{ color: '#ff4d4d' }}>⚔️ SAVAŞ SIRASI</h3>
                            <div className="pd-combat-header">
                                <span>Tur {combatState.round}</span>
                                <span>⏱️ {combatState.secondsPassed}s</span>
                            </div>
                            <div className="pd-player-list pd-combat-list">
                                {tokens.map((t, idx) => (
                                    <div
                                        key={t.id}
                                        className={`pd-player-card pd-combat-card ${idx === combatState.currentTurnIndex ? 'active-turn' : ''}`}
                                    >
                                        <div className="pd-p-card-header">
                                            <strong>{idx === combatState.currentTurnIndex ? '▶ ' : ''}{t.name || 'Bilinmeyen'}</strong>
                                            <span className="pd-p-init-tag">Init: {t.initiativeRoll ?? '?'}</span>
                                        </div>
                                        <div className="pd-p-card-sub" style={{ display: 'flex', justifyContent: 'space-between' }}>
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
                            <h3 className="pd-sidebar-title">PARTY</h3>
                            <div className="pd-player-list">
                                {/* Kendi kartı */}
                                <div className="pd-player-card active">
                                    <div className="pd-p-card-header">
                                        <strong>{character.name} (Sen)</strong>
                                        <span className="pd-p-hp-tag">HP: {character.currentHp}/{character.maxHp}</span>
                                    </div>
                                    <div className="pd-p-card-sub">Lv.{character.level} {character.charClass}</div>
                                </div>
                                {/* Diğer oyuncular (socket'ten) */}
                                {partyMembers.map(p => (
                                    <div key={p.id} className="pd-player-card">
                                        <div className="pd-p-card-header">
                                            <strong>{p.name}</strong>
                                            <span className="pd-p-hp-tag">HP: {p.currentHp}/{p.maxHp}</span>
                                        </div>
                                        <div className="pd-p-card-sub">Lv.{p.level} {p.charClass}</div>
                                    </div>
                                ))}
                                {partyMembers.length === 0 && (
                                    <p className="pd-empty-msg">Diğer oyuncular bekleniyor...</p>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* ═══════════════════════════════════════
                LAYER 3 — ÜST MENÜ (z-index: 10)
            ═══════════════════════════════════════ */}
            <div className={`pd-layer-top ${isTopOpen ? 'open' : 'closed'}`}>
                <div className="pd-top-content">
                    <div className="pd-top-left">
                        <button type="button" className="pd-exit-btn" onClick={() => navigate('/main-menu')}>🚪 ÇIKIŞ</button>

                        <div className="pd-char-info">
                            <span className="pd-char-name">{character.name}</span>
                            <span className="pd-char-sub">Lv.{character.level} {character.charClass} • {character.species}</span>
                        </div>

                        {/* Combat Stats */}
                        <div className="pd-top-combat-stats">
                            <div className="pd-top-stat">
                                <label>AC</label>
                                <input type="number" value={character.armorClass} onChange={e => handleStatChange('armorClass', parseInt(e.target.value) || 0)} />
                            </div>
                            <div className="pd-top-stat">
                                <label>HIZ</label>
                                <input type="number" value={character.speed} onChange={e => handleStatChange('speed', parseInt(e.target.value) || 0)} />
                            </div>
                            <div className="pd-top-stat">
                                <label>HP</label>
                                <div className="pd-hp-inputs">
                                    <input type="number" className="pd-hp-current" value={character.currentHp} onChange={e => handleStatChange('currentHp', parseInt(e.target.value) || 0)} />
                                    <span className="pd-hp-divider">/</span>
                                    <input type="number" value={character.maxHp} onChange={e => handleStatChange('maxHp', parseInt(e.target.value) || 0)} />
                                </div>
                            </div>
                            <div className="pd-top-stat">
                                <label>PB</label>
                                <span className="pd-prof-val">+{profBonus}</span>
                            </div>
                            <button
                                type="button"
                                className={`pd-insp-btn ${character.inspiration ? 'active' : ''}`}
                                onClick={() => setCharacter(prev => ({ ...prev, inspiration: !prev.inspiration }))}
                            >
                                {character.inspiration ? '🌟 İLHAM' : '⭐ İLHAM'}
                            </button>
                        </div>
                    </div>

                    <div className="pd-top-right">
                        {/* Bağlantı */}
                        <div className={`pd-connection-badge ${isConnected ? 'connected' : 'disconnected'}`}>
                            ● {isConnected ? 'ONLINE' : 'OFFLINE'}
                        </div>
                        {/* Savaş göstergesi */}
                        {combatState.isActive && (
                            <div className="pd-combat-active-badge">
                                ⚔️ TUR {combatState.round}
                            </div>
                        )}
                    </div>
                </div>
                <div className="pd-top-handle" onClick={() => setIsTopOpen(!isTopOpen)}>
                    {isTopOpen ? '▲' : '▼'}
                </div>
            </div>

            {/* ═══════════════════════════════════════
                LAYER 3 — ALT MENÜ: Stats & Skills (z-index: 10)
            ═══════════════════════════════════════ */}
            <div className={`pd-layer-bottom ${isBottomOpen ? 'open' : 'closed'}`}>
                <div
                    className="pd-bottom-handle"
                    onClick={e => { e.stopPropagation(); setIsBottomOpen(!isBottomOpen); }}
                >
                    {isBottomOpen ? '▼' : '▲'} STATS & SKILLS
                </div>

                <div className="pd-bottom-content">
                    {/* Tab Butonları */}
                    <div className="pd-bottom-tabs">
                        <button type="button" className={`pd-tab-btn ${bottomTab === 'stats' ? 'active' : ''}`} onClick={() => setBottomTab('stats')}>
                            📊 STATS
                        </button>
                        <button type="button" className={`pd-tab-btn ${bottomTab === 'skills' ? 'active' : ''}`} onClick={() => setBottomTab('skills')}>
                            🎯 SKILLS
                        </button>
                    </div>

                    {/* İçerik */}
                    <div className="pd-bottom-gallery">
                        {bottomTab === 'stats' ? (
                            /* ── 6 STAT GRID ── */
                            <div className="pd-stats-bottom-grid">
                                {Object.keys(statConfig).map(stat => {
                                    const mod = calcMod(character.stats[stat]);
                                    return (
                                        <div
                                            key={stat}
                                            className={`pd-stat-bottom-card ${selectedStat === stat ? 'selected' : ''}`}
                                            onClick={() => { setSelectedStat(stat); setBottomTab('skills'); }}
                                        >
                                            <span className="pd-sbc-abbr">{stat.substring(0, 3).toUpperCase()}</span>
                                            <span className="pd-sbc-score">{character.stats[stat]}</span>
                                            <span className="pd-sbc-mod">{fmtMod(mod)}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            /* ── SKILL LİSTESİ ── */
                            <div className="pd-skills-bottom-wrapper">
                                {/* Stat Seçici */}
                                <div className="pd-skill-stat-tabs">
                                    {Object.keys(statConfig).map(stat => (
                                        <button
                                            key={stat}
                                            type="button"
                                            className={`pd-skill-stat-tab ${selectedStat === stat ? 'active' : ''}`}
                                            onClick={() => setSelectedStat(stat)}
                                        >
                                            {stat.substring(0, 3).toUpperCase()}
                                        </button>
                                    ))}
                                </div>

                                {/* Roll Butonu */}
                                <button
                                    type="button"
                                    className="pd-roll-stat-big-btn"
                                    onClick={() => rollSkill(`${selectedStat} Kontrolü`, calcMod(character.stats[selectedStat]))}
                                >
                                    🎲 {selectedStat.toUpperCase()} AT ({fmtMod(calcMod(character.stats[selectedStat]))})
                                </button>

                                {/* Skill Satırları */}
                                <div className="pd-skills-bottom-list">
                                    {statConfig[selectedStat].map(skill => {
                                        const bonus   = getSkillBonus(selectedStat, skill);
                                        const hasProf = !!character.proficiencies?.[`${selectedStat}-${skill}`];
                                        return (
                                            <div
                                                key={skill}
                                                className={`pd-skill-bottom-row ${hasProf ? 'proficient' : ''}`}
                                                onClick={() => rollSkill(skill, bonus)}
                                            >
                                                <div className={`pd-prof-dot ${hasProf ? 'active' : ''}`} />
                                                <span className="pd-skill-bottom-name">{skill}</span>
                                                <span className="pd-skill-bottom-bonus">{fmtMod(bonus)}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════
                LAYER 4 — HUD: Zar & Log  (z-index: 20)
                GMDashboard'daki layer-hud ile birebir aynı
            ═══════════════════════════════════════ */}
            <button
                type="button"
                className={`pd-hud-fab-btn ${!isHudOpen ? 'visible' : 'hidden'} ${isBottomOpen ? 'shifted' : ''}`}
                onClick={e => { e.stopPropagation(); setIsHudOpen(true); }}
            >
                🎲 ZAR & LOGLAR
            </button>

            <div className={`pd-layer-hud ${isHudOpen ? 'visible' : 'hidden'} ${isBottomOpen ? 'shifted' : ''}`}>
                <div className="pd-hud-header">
                    <span>ZAR & LOGLAR</span>
                    <button type="button" className="pd-hud-close-btn" onClick={e => { e.stopPropagation(); setIsHudOpen(false); }}>✕</button>
                </div>

                <div className="pd-hud-content">
                    {/* Zar Paneli */}
                    <div className="pd-dice-panel">
                        <div className="pd-dice-controls">
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
                        <div className="pd-dice-actions">
                            <label className="pd-hidden-roll-toggle">
                                <input type="checkbox" checked={isHiddenRoll} onChange={e => setIsHiddenRoll(e.target.checked)} />
                                <span className="pd-toggle-label">Gizli</span>
                            </label>
                            <button type="button" className="pd-roll-btn" onClick={handleRollDice}>ROLL 🎲</button>
                        </div>
                    </div>

                    {/* Log Paneli */}
                    <div className="pd-log-panel">
                        <div className="pd-log-header">COMBAT & EVENT LOG</div>
                        <div className="pd-log-messages" ref={logRef}>
                            {logs.map(log => (
                                <div key={log.id} className={`pd-log-entry ${log.isHidden ? 'pd-hidden-log' : 'pd-public-log'}`}>
                                    {log.isHidden && <span className="pd-hidden-icon">👁️‍🗨️ </span>}
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
