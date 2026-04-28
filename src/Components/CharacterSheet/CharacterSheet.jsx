import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StatsStep from './StatsStep';
import DetailsStep from './DetailsStep';
import BioStep from './BioStep'; // YENİ: 3. Sayfayı buraya import ettik
import './CharacterSheet.css';
import SummaryStep from './SummaryStep';

const CharacterSheet = () => {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(1);

    const [character, setCharacter] = useState({
        name: '', charClass: '', level: 1, species: '', playerName: '', expPoints: 0,
        stats: { Strength: 10, Dexterity: 10, Constitution: 10, Intelligence: 10, Wisdom: 10, Charisma: 10 },
        proficiencies: {}, skillOverrides: {},
        armorClass: 10, currentHp: 10, maxHp: 10, speed: 30,
        initiativeOverride: '', weapons: [], spells: [],

        spellSlots: {
            1: { max: 0, used: 0 }, 2: { max: 0, used: 0 }, 3: { max: 0, used: 0 },
            4: { max: 0, used: 0 }, 5: { max: 0, used: 0 }, 6: { max: 0, used: 0 },
            7: { max: 0, used: 0 }, 8: { max: 0, used: 0 }, 9: { max: 0, used: 0 },
        },
        racialFeatures: [], 
        classFeatures: [], 
        currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
        inventory: [],
        
        // 3. SAYFA BİLGİLERİ:
        portrait: null,
        languages: [],
        appearance: { age: '', height: '', weight: '', eyes: '', skin: '', hair: '' },
        traits: { personality: '', ideals: '', bonds: '', flaws: '' },
        backstory: ''
    });

    // --- HESAPLAMA MANTIKLARI ---
    const calculateModifier = (score) => Math.floor((score - 10) / 2);
    const profBonus = Math.ceil(character.level / 4) + 1;

    const getSkillBonusValue = (statName, skillName) => {
        const key = `${statName}-${skillName}`;
        const modifier = calculateModifier(character.stats[statName]);
        const isProficient = character.proficiencies[key];
        const override = character.skillOverrides[key];
        if (override !== undefined && override !== '') return parseInt(override) || 0;
        return modifier + (isProficient ? profBonus : 0);
    };

    // --- HANDLERS (Stats) ---
    const handleStatIncrease = (statName) => {
        setCharacter(prev => ({...prev, stats: { ...prev.stats, [statName]: Math.min(30, prev.stats[statName] + 1) }}));
    };
    const handleStatDecrease = (statName) => {
        setCharacter(prev => ({...prev, stats: { ...prev.stats, [statName]: Math.max(1, prev.stats[statName] - 1) }}));
    };
    const toggleProficiency = (statName, skillName) => {
        const key = `${statName}-${skillName}`;
        setCharacter(prev => ({...prev, proficiencies: { ...prev.proficiencies, [key]: !prev.proficiencies[key] }}));
    };
    const handleSkillOverride = (statName, skillName, value) => {
        const key = `${statName}-${skillName}`;
        setCharacter(prev => ({...prev, skillOverrides: { ...prev.skillOverrides, [key]: value }}));
    };
    
    // --- HANDLERS (Weapons) ---
    const handleAddWeapon = () => {
        setCharacter(prev => ({
            ...prev, 
            weapons: [...prev.weapons, { id: Date.now(), name: '', stat: 'Strength', isProficient: false, atkBonus: 0, damageDice: '', description: '', type: 'Melee' }]
        }));
    };
    const handleWeaponChange = (id, field, value) => {
        setCharacter(prev => ({...prev, weapons: prev.weapons.map(w => w.id === id ? { ...w, [field]: value } : w)}));
    };
    const handleRemoveWeapon = (id) => {
        setCharacter(prev => ({...prev, weapons: prev.weapons.filter(w => w.id !== id)}));
    };

    // --- HANDLERS (Spells) ---
    const handleAddSpell = () => {
        setCharacter(prev => ({
            ...prev,
            spells: [...prev.spells, { 
                id: Date.now(), name: '', level: 'Cantrip', castingTime: '1 Action', 
                range: '', components: '', duration: '', description: '', higherLevel: '' 
            }]
        }));
    };
    const handleSpellChange = (id, field, value) => {
        setCharacter(prev => ({...prev, spells: prev.spells.map(s => s.id === id ? { ...s, [field]: value } : s)}));
    };
    const handleRemoveSpell = (id) => {
        setCharacter(prev => ({...prev, spells: prev.spells.filter(s => s.id !== id)}));
    };
    const handleSlotChange = (lvl, field, value) => {
        setCharacter(prev => ({
            ...prev,
            spellSlots: {
                ...prev.spellSlots,
                [lvl]: { ...prev.spellSlots[lvl], [field]: Math.max(0, parseInt(value) || 0) }
            }
        }));
    };

    // --- HANDLERS (Details) ---
    const handleAddFeature = (type) => { 
        setCharacter(prev => ({ ...prev, [type]: [...prev[type], { id: Date.now(), name: '', description: '' }] }));
    };
    const handleFeatureChange = (type, id, field, value) => {
        setCharacter(prev => ({ ...prev, [type]: prev[type].map(f => f.id === id ? { ...f, [field]: value } : f) }));
    };
    const handleRemoveFeature = (type, id) => {
        setCharacter(prev => ({ ...prev, [type]: prev[type].filter(f => f.id !== id) }));
    };
    const handleAddItem = () => {
        setCharacter(prev => ({ ...prev, inventory: [...prev.inventory, { id: Date.now(), name: '', weight: 0, quantity: 1 }] }));
    };
    const handleInventoryChange = (id, field, value) => {
        setCharacter(prev => ({ ...prev, inventory: prev.inventory.map(item => item.id === id ? { ...item, [field]: value } : item) }));
    };
    const handleRemoveItem = (id) => {
        setCharacter(prev => ({ ...prev, inventory: prev.inventory.filter(item => item.id !== id) }));
    };
    const handleCurrencyChange = (field, value) => {
        setCharacter(prev => ({ ...prev, currency: { ...prev.currency, [field]: parseInt(value) || 0 } }));
    };

    // --- HANDLERS (BioStep İçin YENİ) ---
    const handleAddLanguage = () => {
        setCharacter(prev => ({ ...prev, languages: [...prev.languages, { id: Date.now(), name: '' }] }));
    };
    const handleLanguageChange = (id, value) => {
        setCharacter(prev => ({ ...prev, languages: prev.languages.map(lang => lang.id === id ? { ...lang, name: value } : lang) }));
    };
    const handleRemoveLanguage = (id) => {
        setCharacter(prev => ({ ...prev, languages: prev.languages.filter(lang => lang.id !== id) }));
    };
    const handleBioChange = (category, field, value) => {
        if (category) {
            setCharacter(prev => ({ ...prev, [category]: { ...prev[category], [field]: value } }));
        } else {
            setCharacter(prev => ({ ...prev, [field]: value }));
        }
    };
    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const imageUrl = URL.createObjectURL(file);
            setCharacter(prev => ({ ...prev, portrait: imageUrl }));
        }
    };

    return (
        <div className="sheet-bg">
            <div className="sheet-container">

                {/* --- 3 SAYFALI GEÇİŞ SİSTEMİ BURADA --- */}
                {currentStep === 1 && (
                    <StatsStep 
                        character={character}
                        setCharacter={setCharacter}
                        calculateModifier={calculateModifier}
                        profBonus={profBonus}
                        handleStatIncrease={handleStatIncrease}
                        handleStatDecrease={handleStatDecrease}
                        toggleProficiency={toggleProficiency}
                        handleSkillOverride={handleSkillOverride}
                        getCalculatedSkillBonus={(stat, skill) => {
                            const val = getSkillBonusValue(stat, skill);
                            return val >= 0 ? `+${val}` : val.toString();
                        }}
                        displayInitiative={calculateModifier(character.stats.Dexterity)}
                        passivePerception={10 + getSkillBonusValue('Wisdom', 'Perception')}
                        passiveInsight={10 + getSkillBonusValue('Wisdom', 'Insight')}
                    />
                )}

                {currentStep === 2 && (
                    <DetailsStep 
                        character={character}
                        handleWeaponChange={handleWeaponChange}
                        handleRemoveWeapon={handleRemoveWeapon}
                        handleAddWeapon={handleAddWeapon}
                        handleSpellChange={handleSpellChange}   
                        handleRemoveSpell={handleRemoveSpell}   
                        handleSlotChange={handleSlotChange}
                        handleAddSpell={handleAddSpell}         
                        handleFeatureChange={handleFeatureChange}
                        handleAddFeature={handleAddFeature}
                        handleRemoveFeature={handleRemoveFeature}
                        handleInventoryChange={handleInventoryChange}
                        handleAddItem={handleAddItem}
                        handleRemoveItem={handleRemoveItem}
                        handleCurrencyChange={handleCurrencyChange}
                        calculateModifier={calculateModifier}
                        profBonus={profBonus}
                    />
                )}

                {currentStep === 3 && (
                    <BioStep 
                        character={character}
                        handleBioChange={handleBioChange}
                        handleAddLanguage={handleAddLanguage}
                        handleLanguageChange={handleLanguageChange}
                        handleRemoveLanguage={handleRemoveLanguage}
                        handleImageUpload={handleImageUpload}
                    />
                )}
                {currentStep === 4 && <SummaryStep character={character} calculateModifier={calculateModifier} />}

                {/* --- SAYFA ALTINDAKİ BUTONLAR --- */}
                <div className="sheet-actions">
                    {currentStep === 1 && (
                        <>
                            <button type="button" className="cancel-btn" onClick={() => navigate('/character-manager')}>BACK</button>
                            <button type="button" className="save-btn next-btn" onClick={() => setCurrentStep(2)}>DETAILS ➔</button>
                        </>
                    )}
                    {currentStep === 2 && (
                        <>
                            <button type="button" className="cancel-btn" onClick={() => setCurrentStep(1)}>← STATS</button>
                            <button type="button" className="save-btn next-btn" onClick={() => setCurrentStep(3)}>BIO & LORE ➔</button>
                        </>
                    )}
                    {currentStep === 3 && (
                        <>
                            <button type="button" className="cancel-btn" onClick={() => setCurrentStep(2)}>← DETAILS</button>
                            <button type="button" className="save-btn next-btn" onClick={() => setCurrentStep(4)}>PREVIEW ➔</button>
                        </>
                    )}
                    {currentStep === 4 && (
                        <>
                            <button type="button" className="cancel-btn" onClick={() => setCurrentStep(3)}>← BIO</button>
                            <button type="button" className="save-btn final-save-btn" onClick={() => console.log("DATABASE SAVING...", character)}>FINISH & SAVE</button>
                        </>
                    )}
                    
                </div>
                
            </div>
        </div>
    );
};

export default CharacterSheet;