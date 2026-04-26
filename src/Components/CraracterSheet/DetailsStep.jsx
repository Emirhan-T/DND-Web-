import React from 'react';
import './DetailsStep.css';

const DetailsStep = ({ 
    character, handleWeaponChange, handleRemoveWeapon, handleAddWeapon, 
    handleSpellChange, handleRemoveSpell, handleAddSpell, handleSlotChange,
    handleFeatureChange, handleAddFeature, handleRemoveFeature,
    handleInventoryChange, handleAddItem, handleRemoveItem, handleCurrencyChange,
    calculateModifier, profBonus 
}) => {

    const totalWeight = character.inventory.reduce((sum, item) => sum + (parseFloat(item.weight) || 0) * (parseInt(item.quantity) || 1), 0);

    const handleAddDice = (weaponId, currentStr, die) => {
        let str = (currentStr || '').trim();
        const regex = new RegExp(`(\\d+)${die}\\b`);
        const match = str.match(regex);
        if (match) {
            const count = parseInt(match[1]) + 1;
            str = str.replace(regex, `${count}${die}`);
        } else {
            str = str ? `${str} + 1${die}` : `1${die}`;
        }
        handleWeaponChange(weaponId, 'damageDice', str);
    };

    return (
        <div className="step-content fade-in">
            {/* --- WEAPONS SECTION --- */}
            <div className="weapons-section">
                <div className="section-header">
                    <h2>Attacks & Weapons</h2>
                    <button type="button" className="add-weapon-btn" onClick={handleAddWeapon}>+ NEW WEAPON</button>
                </div>
                <div className="weapons-list">
                    {character.weapons.map((weapon) => {
                        const statMod = calculateModifier(character.stats[weapon.stat || 'Strength']);
                        const totalAtk = statMod + (weapon.isProficient ? profBonus : 0) + (parseInt(weapon.atkBonus) || 0);
                        return (
                            <div className="weapon-card" key={weapon.id}>
                                <div className="weapon-main-row">
                                    <select className="weapon-type-select" value={weapon.type} onChange={(e) => handleWeaponChange(weapon.id, 'type', e.target.value)}>
                                        <option value="Melee">⚔️ Melee</option>
                                        <option value="Ranged">🏹 Ranged</option>
                                    </select>
                                    <input type="text" className="weapon-name" placeholder="Weapon Name..." value={weapon.name} onChange={(e) => handleWeaponChange(weapon.id, 'name', e.target.value)} />
                                    <button type="button" className="remove-weapon-btn" onClick={() => handleRemoveWeapon(weapon.id)}>✕</button>
                                </div>
                                <div className="weapon-stats-row">
                                    <div className="weapon-input-group">
                                        <label>Ability</label>
                                        <select value={weapon.stat} onChange={(e) => handleWeaponChange(weapon.id, 'stat', e.target.value)}>
                                            <option value="Strength">STR</option><option value="Dexterity">DEX</option><option value="Constitution">CON</option>
                                            <option value="Intelligence">INT</option><option value="Wisdom">WIS</option><option value="Charisma">CHA</option>
                                        </select>
                                    </div>
                                    <div className="weapon-input-group"><label>Atk Bonus</label><input type="number" value={weapon.atkBonus} onChange={(e) => handleWeaponChange(weapon.id, 'atkBonus', e.target.value)} /></div>
                                    <div className="weapon-input-group damage-dice-group">
                                        <label>Damage Dice</label>
                                        <div className="dice-input-wrapper">
                                            <input type="text" value={weapon.damageDice} onChange={(e) => handleWeaponChange(weapon.id, 'damageDice', e.target.value)} />
                                            <button type="button" className="clear-dice-btn" onClick={() => handleWeaponChange(weapon.id, 'damageDice', '')}>✕</button>
                                        </div>
                                        <div className="dice-buttons">
                                            {['d4', 'd6', 'd8', 'd10', 'd12', 'd20'].map(die => (
                                                <button key={die} type="button" className="dice-btn" onClick={() => handleAddDice(weapon.id, weapon.damageDice, die)}>{die}</button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="weapon-input-group prof-toggle-group">
                                        <label>Prof.</label>
                                        <div className={`custom-prof-toggle ${weapon.isProficient ? 'active' : ''}`} onClick={() => handleWeaponChange(weapon.id, 'isProficient', !weapon.isProficient)}></div>
                                    </div>
                                </div>
                                <div className="weapon-description-row"><textarea placeholder="Properties..." value={weapon.description} onChange={(e) => handleWeaponChange(weapon.id, 'description', e.target.value)} /></div>
                                <div className="weapon-summary-bar">
                                    <div className="summary-item">HIT: <span>+{totalAtk}</span></div>
                                    <div className="summary-item">DMG: <span>{weapon.damageDice || '--'} {statMod >= 0 ? `+${statMod}` : statMod}</span></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            {/* 3. RACIAL & CLASS FEATURES */}
            <div className="features-grid">
                <div className="details-section">
                    <div className="section-header">
                        <h2>Racial Traits</h2>
                        <button type="button" className="add-btn" onClick={() => handleAddFeature('racialFeatures')}>+ ADD TRAIT</button>
                    </div>
                    <div className="features-list">
                        {character.racialFeatures?.map(f => (
                            <div className="feature-card" key={f.id}>
                                <div className="feature-card-header">
                                    <input placeholder="Trait Name" value={f.name} onChange={(e) => handleFeatureChange('racialFeatures', f.id, 'name', e.target.value)} />
                                    <button className="remove-btn-small" onClick={() => handleRemoveFeature('racialFeatures', f.id)}>✕</button>
                                </div>
                                <textarea placeholder="Description..." value={f.description} onChange={(e) => handleFeatureChange('racialFeatures', f.id, 'description', e.target.value)} />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="details-section">
                    <div className="section-header">
                        <h2>Class Features</h2>
                        <button type="button" className="add-btn" onClick={() => handleAddFeature('classFeatures')}>+ ADD FEATURE</button>
                    </div>
                    <div className="features-list">
                        {character.classFeatures?.map(f => (
                            <div className="feature-card" key={f.id}>
                                <div className="feature-card-header">
                                    <input placeholder="Feature Name" value={f.name} onChange={(e) => handleFeatureChange('classFeatures', f.id, 'name', e.target.value)} />
                                    <button className="remove-btn-small" onClick={() => handleRemoveFeature('classFeatures', f.id)}>✕</button>
                                </div>
                                <textarea placeholder="Description..." value={f.description} onChange={(e) => handleFeatureChange('classFeatures', f.id, 'description', e.target.value)} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* 4. INVENTORY & WEIGHT */}
            <div className="details-section inventory-section">
                <div className="section-header">
                    <h2>Inventory & Equipment</h2>
                    <div className="weight-display">Weight: <span>{totalWeight.toFixed(1)} lbs</span></div>
                    <button type="button" className="add-btn" onClick={handleAddItem}>+ ADD ITEM</button>
                </div>

                <div className="currency-bar">
                    {['cp', 'sp', 'ep', 'gp', 'pp'].map(coin => (
                        <div className="coin-box" key={coin}>
                            <label>{coin.toUpperCase()}</label>
                            <input type="number" value={character.currency[coin]} onChange={(e) => handleCurrencyChange(coin, e.target.value)} />
                        </div>
                    ))}
                </div>

                <div className="inventory-list">
                    <div className="inv-header-row">
                        <span>Item Name</span>
                        <span>Qty</span>
                        <span>Weight</span>
                        <span></span>
                    </div>
                    {character.inventory?.map(item => (
                        <div className="inv-item-row" key={item.id}>
                            <input className="inv-name" value={item.name} onChange={(e) => handleInventoryChange(item.id, 'name', e.target.value)} />
                            <input type="number" className="inv-qty" value={item.quantity} onChange={(e) => handleInventoryChange(item.id, 'quantity', e.target.value)} />
                            <input type="number" className="inv-weight" value={item.weight} onChange={(e) => handleInventoryChange(item.id, 'weight', e.target.value)} />
                            <button className="remove-btn-small" onClick={() => handleRemoveItem(item.id)}>✕</button>
                        </div>
                    ))}
                </div>
            </div>

            {/* --- SPELL SLOT TRACKER (Click-to-Fill) --- */}
            <div className="spell-slots-container">
                <h3>Spell Slots</h3>
                <div className="spell-slots-grid">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(lvl => (
                        <div className="slot-column" key={lvl}>
                            <div className="slot-header">
                                <button className="slot-adjust-btn" onClick={() => handleSlotChange(lvl, 'max', Math.max(0, (character.spellSlots[lvl].max || 0) - 1))}>−</button>
                                <span className="slot-lvl-label">{lvl}</span>
                                <button 
                                    className="slot-adjust-btn" 
                                    onClick={() => handleSlotChange(lvl, 'max', (character.spellSlots[lvl].max || 0) + 1)}
                                >+</button>
                            </div>
                            <div className="bubbles-container">
                                {[...Array(Math.max(0, character.spellSlots[lvl].max))].map((_, i) => (
                                    <div 
                                        key={i}
                                        className={`slot-bubble ${i < character.spellSlots[lvl].used ? 'filled' : ''}`}
                                        onClick={() => {
                                            const newUsed = i < character.spellSlots[lvl].used ? i : i + 1;
                                            handleSlotChange(lvl, 'used', newUsed);
                                        }}
                                        onContextMenu={(e) => {
                                            e.preventDefault();
                                            handleSlotChange(lvl, 'max', Math.max(0, character.spellSlots[lvl].max - 1));
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            
            

            {/* --- SPELLBOOK --- */}
            <div className="spells-section">
                <div className="section-header">
                    <h2>Spellbook</h2>
                    <button type="button" className="add-spell-btn" onClick={handleAddSpell}>+ LEARN SPELL</button>
                </div>
                <div className="spells-list">
                    {character.spells?.map((spell) => (
                        <div className={`spell-card-premium ${spell.isConcentration ? 'concentrating' : ''}`} key={spell.id}>
                            <div className="spell-card-header">
                                <div className="spell-header-left">
                                    <select className="spell-lvl-select" value={spell.level} onChange={(e) => handleSpellChange(spell.id, 'level', e.target.value)}>
                                        <option value="Cantrip">C</option>
                                        {[1,2,3,4,5,6,7,8,9].map(n => <option key={n} value={n}>{n}</option>)}
                                    </select>
                                    <input className="spell-name-gold" value={spell.name} onChange={(e) => handleSpellChange(spell.id, 'name', e.target.value)} placeholder="SPELL NAME" />
                                    
                                    {/* CONCENTRATION TOGGLE (Hollow Circle) */}
                                    <div className="con-wrapper" title="Concentration">
                                        <div 
                                            className={`con-selector ${spell.isConcentration ? 'active' : ''}`}
                                            onClick={() => handleSpellChange(spell.id, 'isConcentration', !spell.isConcentration)}
                                        ></div>
                                        <label className="con-label">CON</label>
                                    </div>
                                </div>
                                <button type="button" className="spell-del-btn" onClick={() => handleRemoveSpell(spell.id)}>✕</button>
                            </div>
                            <div className="spell-card-body">
                                <ul className="spell-stats-list">
                                    <li><strong>Casting Time:</strong> <input value={spell.castingTime} onChange={(e) => handleSpellChange(spell.id, 'castingTime', e.target.value)} placeholder="1 Action" /></li>
                                    <li><strong>Range:</strong> <input value={spell.range} onChange={(e) => handleSpellChange(spell.id, 'range', e.target.value)} placeholder="60 ft" /></li>
                                    <li><strong>Components:</strong> <input value={spell.components} onChange={(e) => handleSpellChange(spell.id, 'components', e.target.value)} placeholder="V, S, M" /></li>
                                    <li><strong>Duration:</strong> <input value={spell.duration} onChange={(e) => handleSpellChange(spell.id, 'duration', e.target.value)} placeholder="Instantaneous" /></li>
                                </ul>
                                <div className="spell-desc-box">
                                    <textarea value={spell.description} onChange={(e) => handleSpellChange(spell.id, 'description', e.target.value)} placeholder="Spell effects..." />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default DetailsStep;