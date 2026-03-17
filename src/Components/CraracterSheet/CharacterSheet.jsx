import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './CharacterSheet.css';

const statConfig = {
    Strength: ['Saving Throw', 'Athletics'],
    Dexterity: ['Saving Throw', 'Acrobatics', 'Sleight of Hand', 'Stealth'],
    Constitution: ['Saving Throw'],
    Intelligence: ['Saving Throw', 'Arcana', 'History', 'Investigation', 'Nature', 'Religion'],
    Wisdom: ['Saving Throw', 'Animal Handling', 'Insight', 'Medicine', 'Perception', 'Survival'],
    Charisma: ['Saving Throw', 'Deception', 'Intimidation', 'Performance', 'Persuasion']
};

const CharacterSheet = () => {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(1);

    const [character, setCharacter] = useState({
        name: '',
        charClass: '',
        level: 1,
        species: '',
        playerName: '',
        expPoints: 0,
        stats: {
            Strength: 10,
            Dexterity: 10,
            Constitution: 10,
            Intelligence: 10,
            Wisdom: 10,
            Charisma: 10
        },
        proficiencies: {}, 
        skillOverrides: {}, 
        
        armorClass: 10,
        currentHp: 10,
        maxHp: 10,
        speed: 30,
        
        equippedArmor: '',
        armorType: 'None',
        hasShield: false,
        stealthDisadvantage: false,
        initiativeOverride: ''
    });

    const calculateModifier = (score) => Math.floor((score - 10) / 2);

    const getProficiencyBonus = (level) => {
        const lvl = parseInt(level) || 1;
        if (lvl >= 17) return 6;
        if (lvl >= 13) return 5;
        if (lvl >= 9) return 4;
        if (lvl >= 5) return 3;
        return 2;
    };

    const profBonus = getProficiencyBonus(character.level);

    const getSkillBonusValue = (statName, skillName) => {
        const key = `${statName}-${skillName}`;
        const modifier = calculateModifier(character.stats[statName]);
        const isProficient = character.proficiencies[key];
        const override = character.skillOverrides[key];

        if (override !== undefined && override !== '') {
            return parseInt(override) || 0;
        }
        return modifier + (isProficient ? profBonus : 0);
    };

    const getCalculatedSkillBonus = (statName, skillName) => {
        const total = getSkillBonusValue(statName, skillName);
        return total >= 0 ? `+${total}` : total.toString();
    };

    const handleStatChange = (statName, value) => {
        setCharacter(prev => ({
            ...prev,
            stats: { ...prev.stats, [statName]: value }
        }));
    };

    const handleStatIncrease = (statName) => {
        setCharacter(prev => ({
            ...prev,
            stats: { ...prev.stats, [statName]: Math.min(30, prev.stats[statName] + 1) }
        }));
    };

    const handleStatDecrease = (statName) => {
        setCharacter(prev => ({
            ...prev,
            stats: { ...prev.stats, [statName]: Math.max(1, prev.stats[statName] - 1) }
        }));
    };

    const handleSkillOverride = (statName, skillName, value) => {
        const key = `${statName}-${skillName}`;
        setCharacter(prev => ({
            ...prev,
            skillOverrides: { ...prev.skillOverrides, [key]: value }
        }));
    };

    const toggleProficiency = (statName, skillName) => {
        const key = `${statName}-${skillName}`;
        setCharacter(prev => ({
            ...prev,
            proficiencies: { ...prev.proficiencies, [key]: !prev.proficiencies[key] }
        }));
    };

    const handleSaveToDatabase = async (e) => {
        e.preventDefault();
        console.log("FINAL CHARACTER DATA READY FOR DB:", character);
        alert("Saving to MongoDB... (Backend connection next!)");
    };

    const passivePerception = 10 + getSkillBonusValue('Wisdom', 'Perception');
    const passiveInsight = 10 + getSkillBonusValue('Wisdom', 'Insight');
    const baseInitiative = calculateModifier(character.stats.Dexterity);
    const displayInitiative = character.initiativeOverride !== '' ? character.initiativeOverride : baseInitiative;

    return (
        <div className="sheet-bg">
            <div className="sheet-container">
                
                {/* --- HEADER --- */}
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
                            <input type="number" min="1" max="20" value={character.level} onChange={(e) => setCharacter({...character, level: e.target.value})} />
                            <label>Level</label>
                        </div>
                        <div className="detail-box">
                            <input type="text" value={character.species} onChange={(e) => setCharacter({...character, species: e.target.value})} />
                            <label>Species / Race</label>
                        </div>
                        <div className="detail-box">
                            <input type="text" value={character.playerName} onChange={(e) => setCharacter({...character, playerName: e.target.value})} />
                            <label>Player Name</label>
                        </div>
                        <div className="detail-box">
                            <input type="number" value={character.expPoints} onChange={(e) => setCharacter({...character, expPoints: e.target.value})} />
                            <label>Experience Points</label>
                        </div>
                        <div className="detail-box prof-bonus-display">
                            <div className="bonus-value">+{profBonus}</div>
                            <label>Proficiency Bonus</label>
                        </div>
                    </div>
                </header>

                {/* --- STEP 1: MECHANICS --- */}
                {currentStep === 1 && (
                    <div className="step-content fade-in">
                        
                        <div className="combat-bar">
                            <div className="combat-stat-box shield-box">
                                <input type="number" value={character.armorClass} onChange={(e) => setCharacter({...character, armorClass: e.target.value})} />
                                <label>Armor Class</label>
                            </div>
                            
                            <div className="combat-stat-box hp-box">
                                <div className="hp-inputs">
                                    <input type="number" className="hp-current" value={character.currentHp} onChange={(e) => setCharacter({...character, currentHp: e.target.value})} />
                                    <span className="hp-divider">/</span>
                                    <input type="number" className="hp-max" value={character.maxHp} onChange={(e) => setCharacter({...character, maxHp: e.target.value})} />
                                </div>
                                <label>Hit Points (Current / Max)</label>
                            </div>

                            <div className="combat-stat-box speed-box">
                                <input type="number" value={character.speed} onChange={(e) => setCharacter({...character, speed: e.target.value})} />
                                <label>Speed (ft)</label>
                            </div>

                            <div className="combat-stat-box armor-equip-box">
                                <input 
                                    type="text" 
                                    placeholder="e.g. Leather Armor" 
                                    value={character.equippedArmor} 
                                    onChange={(e) => setCharacter({...character, equippedArmor: e.target.value})} 
                                    className="armor-name-input"
                                />
                                <div className="armor-options">
                                    <select className="armor-type-select" value={character.armorType} onChange={(e) => setCharacter({...character, armorType: e.target.value})}>
                                        <option value="None">No Armor</option>
                                        <option value="Light">Light Armor</option>
                                        <option value="Medium">Medium Armor</option>
                                        <option value="Heavy">Heavy Armor</option>
                                    </select>
                                    <div className="armor-checkboxes">
                                        <label className="checkbox-label">
                                            <input type="checkbox" checked={character.hasShield} onChange={(e) => setCharacter({...character, hasShield: e.target.checked})} /> Shield
                                        </label>
                                        <label className={`checkbox-label ${character.stealthDisadvantage ? 'text-red' : ''}`}>
                                            <input type="checkbox" checked={character.stealthDisadvantage} onChange={(e) => setCharacter({...character, stealthDisadvantage: e.target.checked})} /> Stealth Disadv.
                                        </label>
                                    </div>
                                </div>
                                <label>Armor Details</label>
                            </div>
                        </div>

                        <div className="passives-bar">
                            <div className="passive-box initiative-box">
                                <div className="passive-val">{displayInitiative >= 0 ? `+${displayInitiative}` : displayInitiative}</div>
                                <label>Initiative</label>
                                <input type="text" className="initiative-override" placeholder="Override" value={character.initiativeOverride} onChange={(e) => setCharacter({...character, initiativeOverride: e.target.value})} />
                            </div>
                            <div className="passive-box">
                                <div className="passive-val">{passivePerception}</div>
                                <label>Passive Perception</label>
                            </div>
                            <div className="passive-box">
                                <div className="passive-val">{passiveInsight}</div>
                                <label>Passive Insight</label>
                            </div>
                        </div>

                        <div className="stats-grid">
                            {Object.keys(statConfig).map((stat) => {
                                const modifier = calculateModifier(character.stats[stat]);
                                const displayMod = modifier >= 0 ? `+${modifier}` : modifier;

                                return (
                                    <div className="stat-group" key={stat}>
                                        <div className="stat-box">
                                            <label>{stat}</label>
                                            <div className="stat-modifier">{displayMod}</div>
                                            
                                            {/* Original Stylish Stat Controls */}
                                            <div className="stat-control-pill">
                                                <button type="button" className="stat-btn minus" onClick={() => handleStatDecrease(stat)}>−</button>
                                                <div className="stat-score-display">{character.stats[stat]}</div>
                                                <button type="button" className="stat-btn plus" onClick={() => handleStatIncrease(stat)}>+</button>
                                            </div>
                                        </div>

                                        <div className="skills-list">
                                            {statConfig[stat].map(skill => {
                                                const key = `${stat}-${skill}`;
                                                const isProf = character.proficiencies[key] || false;
                                                const autoCalc = getCalculatedSkillBonus(stat, skill);
                                                const displayBonus = character.skillOverrides[key] !== undefined ? character.skillOverrides[key] : autoCalc;

                                                return (
                                                    <div className={`skill-row ${isProf ? 'proficient' : ''}`} key={skill}>
                                                        <div className={`custom-prof-toggle ${isProf ? 'active' : ''}`} onClick={() => toggleProficiency(stat, skill)}></div>
                                                        <input type="text" className="skill-bonus-input" value={displayBonus} onChange={(e) => handleSkillOverride(stat, skill, e.target.value)} placeholder={autoCalc}/>
                                                        <span className={`skill-name ${skill === 'Stealth' && character.stealthDisadvantage ? 'text-red line-through' : ''}`}>{skill}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="sheet-actions">
                            <button type="button" className="cancel-btn" onClick={() => navigate('/character-manager')}>BACK TO ROSTER</button>
                            <button type="button" className="save-btn next-btn" onClick={() => setCurrentStep(2)}>NEXT: DETAILS & INVENTORY ➔</button>
                        </div>
                    </div>
                )}

                {/* --- STEP 2: DETAILS --- */}
                {currentStep === 2 && (
                    <div className="step-content fade-in">
                        <div className="step-2-placeholder">
                            <h2>Character Details & Inventory</h2>
                            <p>This is Page 2! We will add Backpack, Spells, Weapons, Personality Traits, and Backstory here.</p>
                        </div>

                        <div className="sheet-actions">
                            <button type="button" className="cancel-btn" onClick={() => setCurrentStep(1)}>← BACK TO STATS</button>
                            <button type="button" className="save-btn final-save-btn" onClick={handleSaveToDatabase}>FINISH & SAVE TO MONGODB</button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default CharacterSheet;