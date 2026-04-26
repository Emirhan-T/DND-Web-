import React from 'react';
import './StatsStep.css';
const statConfig = {
    Strength: ['Saving Throw', 'Athletics'],
    Dexterity: ['Saving Throw', 'Acrobatics', 'Sleight of Hand', 'Stealth'],
    Constitution: ['Saving Throw'],
    Intelligence: ['Saving Throw', 'Arcana', 'History', 'Investigation', 'Nature', 'Religion'],
    Wisdom: ['Saving Throw', 'Animal Handling', 'Insight', 'Medicine', 'Perception', 'Survival'],
    Charisma: ['Saving Throw', 'Deception', 'Intimidation', 'Performance', 'Persuasion']
};

const StatsStep = ({ 
    character, setCharacter, calculateModifier, profBonus, 
    getCalculatedSkillBonus, handleStatDecrease, handleStatIncrease, 
    toggleProficiency, handleSkillOverride, displayInitiative,
    passivePerception, passiveInsight 
}) => {
    return (
        <div className="step-content fade-in">
            {/* COMBAT BAR (AC, HP, Speed) */}
            {/* COMBAT BAR (AC, HP, Speed) */}

                            <header className="sheet-header">
                    <div className="char-name-container">
                        <input type="text" placeholder="Character Name" value={character.name} onChange={(e) => setCharacter({...character, name: e.target.value})} />
                    </div>
                    <div className="char-details-grid">
                        <div className="detail-box">
                            <input type="text" value={character.charClass} onChange={(e) => setCharacter({...character, charClass: e.target.value})} />
                            <label>Class</label>
                        </div>
                        <div className="detail-box">
                            <div className="number-controls">
                                <button type="button" className="spin-btn" onClick={() => setCharacter({...character, level: Math.max(1, character.level - 1)})}>−</button>
                                <input 
                                    type="number" 
                                    min="1" max="20" 
                                    value={character.level} 
                                    onChange={(e) => setCharacter({...character, level: Math.max(1, parseInt(e.target.value) || 1)})} 
                                    style={{ width: '40px', textAlign: 'center', padding: '0' }} 
                                />
                                <button type="button" className="spin-btn" onClick={() => setCharacter({...character, level: Math.min(20, character.level + 1)})}>+</button>
                            </div>
                            <label>Level</label>
                        </div>
                        <div className="detail-box"><input type="text" value={character.species} onChange={(e) => setCharacter({...character, species: e.target.value})} /><label>Race</label></div>
                        <div className="detail-box"><input type="text" value={character.playerName} onChange={(e) => setCharacter({...character, playerName: e.target.value})} /><label>Player</label></div>
                        <div className="detail-box"><input type="number" value={character.expPoints} onChange={(e) => setCharacter({...character, expPoints: e.target.value})} /><label>XP</label></div>
                        <div className="detail-box prof-bonus-display"><div className="bonus-value">+{profBonus}</div><label>Proficiency</label></div>
                    </div>
                </header>

            
<div className="combat-bar">
    <div className="combat-stat-box shield-box">
        <div className="number-controls">
            <button type="button" className="spin-btn" onClick={() => setCharacter({...character, armorClass: Math.max(0, (parseInt(character.armorClass) || 0) - 1)})}>−</button>
            <input type="number" value={character.armorClass} onChange={(e) => setCharacter({...character, armorClass: e.target.value})} />
            <button type="button" className="spin-btn" onClick={() => setCharacter({...character, armorClass: (parseInt(character.armorClass) || 0) + 1})}>+</button>
        </div>
        <label>Armor Class</label>
    </div>
    
    <div className="combat-stat-box hp-box">
        <div className="hp-inputs">
            <div className="hp-control">
                <button type="button" className="spin-btn" onClick={() => setCharacter({...character, currentHp: Math.max(0, (parseInt(character.currentHp) || 0) - 1)})}>−</button>
                <input type="number" className="hp-current" value={character.currentHp} onChange={(e) => setCharacter({...character, currentHp: e.target.value})} />
                <button type="button" className="spin-btn" onClick={() => setCharacter({...character, currentHp: (parseInt(character.currentHp) || 0) + 1})}>+</button>
            </div>
            <span className="hp-divider">/</span>
            <div className="hp-control">
                <button type="button" className="spin-btn" onClick={() => setCharacter({...character, maxHp: Math.max(1, (parseInt(character.maxHp) || 0) - 1)})}>−</button>
                <input type="number" className="hp-max" value={character.maxHp} onChange={(e) => setCharacter({...character, maxHp: e.target.value})} />
                <button type="button" className="spin-btn" onClick={() => setCharacter({...character, maxHp: (parseInt(character.maxHp) || 0) + 1})}>+</button>
            </div>
        </div>
        <label>Hit Points (Current / Max)</label>
    </div>
    
    <div className="combat-stat-box speed-box">
        <div className="number-controls">
            <button type="button" className="spin-btn" onClick={() => setCharacter({...character, speed: Math.max(0, (parseInt(character.speed) || 0) - 5)})}>−</button>
            <input type="number" value={character.speed} onChange={(e) => setCharacter({...character, speed: e.target.value})} />
            <button type="button" className="spin-btn" onClick={() => setCharacter({...character, speed: (parseInt(character.speed) || 0) + 5})}>+</button>
        </div>
        <label>Speed (ft)</label>
    </div>
</div>

            {/* PASSIVES BAR */}
            <div className="passives-bar">
                <div className="passive-box initiative-box">
                    <div className="passive-val">{displayInitiative >= 0 ? `+${displayInitiative}` : displayInitiative}</div>
                    <label>Initiative</label>
                </div>
                <div className="passive-box"><div className="passive-val">{passivePerception}</div><label>Passive Perception</label></div>
                <div className="passive-box"><div className="passive-val">{passiveInsight}</div><label>Passive Insight</label></div>
            </div>

            {/* STATS GRID */}
            <div className="stats-grid">
                {Object.keys(statConfig).map((stat) => {
                    const modifier = calculateModifier(character.stats[stat]);
                    return (
                        <div className="stat-group" key={stat}>
                            <div className="stat-box">
                                <label>{stat}</label>
                                <div className="stat-modifier">{modifier >= 0 ? `+${modifier}` : modifier}</div>
                                <div className="stat-control-pill">
                                    <button type="button" className="stat-btn minus" onClick={() => handleStatDecrease(stat)}>−</button>
                                    <div className="stat-score-display">{character.stats[stat]}</div>
                                    <button type="button" className="stat-btn plus" onClick={() => handleStatIncrease(stat)}>+</button>
                                </div>
                            </div>
                            <div className="skills-list">
                                {statConfig[stat].map(skill => (
                                    <div className={`skill-row ${character.proficiencies[`${stat}-${skill}`] ? 'proficient' : ''}`} key={skill}>
                                        <div className={`custom-prof-toggle ${character.proficiencies[`${stat}-${skill}`] ? 'active' : ''}`} onClick={() => toggleProficiency(stat, skill)}></div>
                                        <input type="text" className="skill-bonus-input" placeholder={getCalculatedSkillBonus(stat, skill)} value={character.skillOverrides[`${stat}-${skill}`] || ''} onChange={(e) => handleSkillOverride(stat, skill, e.target.value)}/>
                                        <span className="skill-name">{skill}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default StatsStep;