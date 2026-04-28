import React from 'react';
import './SummaryStep.css';

const SummaryStep = ({ character, calculateModifier }) => {
    // Sadece uzman (true) olunan yetenekleri filtreleyip isimlerini alıyoruz (Örn: "Dexterity-Stealth" -> "Stealth")
    const proficientSkills = Object.keys(character.proficiencies)
        .filter(key => character.proficiencies[key])
        .map(key => key.split('-')[1]);

    // İnsiyatif hesaplama (Dexterity modifier)
    const initMod = calculateModifier(character.stats.Dexterity);
    const initiative = initMod >= 0 ? `+${initMod}` : initMod;

    // Sadece max değeri 0'dan büyük olan büyü hanelerini göster
    const activeSpellSlots = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(lvl => character.spellSlots[lvl]?.max > 0);

    return (
        <div className="summary-container fade-in">
            {/* --- ÜST BÖLÜM: KİMLİK VE SAVAŞ BİLGİLERİ --- */}
            <div className="summary-header-card">
                <div className="summary-portrait">
                    {character.portrait ? (
                        <img src={character.portrait} alt="Portrait" />
                    ) : (
                        <div className="no-portrait-placeholder">NO IMAGE</div>
                    )}
                </div>
                <div className="summary-main-info">
                    <h1 className="summary-char-name">{character.name || "İsimsiz Kahraman"}</h1>
                    <div className="summary-char-subtitle">
                        <span>Level {character.level} {character.species} {character.charClass}</span>
                        <span className="player-name-tag">Player: {character.playerName || "Bilinmiyor"}</span>
                    </div>
                    
                    <div className="summary-combat-ribbon">
                        <div className="ribbon-item"><span>ZIRH (AC)</span><strong>{character.armorClass}</strong></div>
                        <div className="ribbon-item"><span>CAN (HP)</span><strong>{character.currentHp} / {character.maxHp}</strong></div>
                        <div className="ribbon-item"><span>İNSİYATİF</span><strong>{initiative}</strong></div>
                        <div className="ribbon-item"><span>HIZ</span><strong>{character.speed} ft</strong></div>
                    </div>
                </div>
            </div>

            {/* --- ORTA BÖLÜM: STATLAR VE DETAYLAR --- */}
            <div className="summary-grid">
                
                {/* SOL KOLON: Temel İstatistikler */}
                <div className="summary-column">
                    <div className="summary-section stats-mini-grid">
                        {Object.entries(character.stats).map(([stat, value]) => {
                            const mod = calculateModifier(value);
                            return (
                                <div className="stat-pill" key={stat}>
                                    <label>{stat.substring(0, 3).toUpperCase()}</label>
                                    <strong>{value}</strong>
                                    <span>({mod >= 0 ? '+' : ''}{mod})</span>
                                </div>
                            );
                        })}
                    </div>

                    <div className="summary-section">
                        <h3 className="summary-title">Uzman Olunan Yetenekler</h3>
                        <div className="tags-container">
                            {proficientSkills.length > 0 ? (
                                proficientSkills.map(skill => <span className="gold-tag" key={skill}>{skill}</span>)
                            ) : (<span className="empty-text">Uzmanlık seçilmedi.</span>)}
                        </div>
                    </div>

                    <div className="summary-section">
                        <h3 className="summary-title">Kişilik Özellikleri & Diller</h3>
                        <p className="summary-text-block"><em>"{character.traits.personality || "Kişilik özelliği girilmedi."}"</em></p>
                        <div className="tags-container" style={{ marginTop: '10px' }}>
                            {character.languages?.map(lang => (
                                lang.name && <span className="blue-tag" key={lang.id}>{lang.name}</span>
                            ))}
                        </div>
                    </div>

                    <div className="summary-section">
                        <h3 className="summary-title">Irk ve Sınıf Özellikleri</h3>
                        <ul className="simple-list">
                            {character.racialFeatures?.map(f => f.name && <li key={f.id}>{f.name} <span className="feature-type">(Irk)</span></li>)}
                            {character.classFeatures?.map(f => f.name && <li key={f.id}>{f.name} <span className="feature-type">(Sınıf)</span></li>)}
                            {(!character.racialFeatures?.length && !character.classFeatures?.length) && <span className="empty-text">Özellik eklenmedi.</span>}
                        </ul>
                    </div>
                </div>

                {/* SAĞ KOLON: Savaş, Büyü ve Envanter */}
                <div className="summary-column">
                    
                    <div className="summary-section">
                        <h3 className="summary-title">Silahlar ve Saldırılar</h3>
                        {character.weapons?.length > 0 ? (
                            character.weapons.map(w => (
                                <div className="weapon-mini-row" key={w.id}>
                                    <strong>{w.name || "İsimsiz Silah"}</strong>
                                    <span className="damage-text">{w.damageDice || "Hasar Yok"}</span>
                                </div>
                            ))
                        ) : (<span className="empty-text">Silah eklenmedi.</span>)}
                    </div>

                    <div className="summary-section">
                        <h3 className="summary-title">Büyü Kitabı</h3>
                        
                        {/* Büyü Haneleri Özet */}
                        {activeSpellSlots.length > 0 && (
                            <div className="spell-slots-summary">
                                {activeSpellSlots.map(lvl => (
                                    <span key={lvl} className="slot-badge">
                                        Lvl {lvl}: <strong>{character.spellSlots[lvl].used}/{character.spellSlots[lvl].max}</strong>
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Büyü İsimleri ve Konsantrasyon */}
                        <ul className="simple-list spell-list">
                            {character.spells?.length > 0 ? (
                                character.spells.map(s => (
                                    <li key={s.id}>
                                        <span className="spell-lvl-badge">{s.level === 'Cantrip' ? 'C' : `L${s.level}`}</span>
                                        {s.name || "İsimsiz Büyü"} 
                                        {s.isConcentration && <span className="con-icon" title="Konsantrasyon Gerektirir">🧿</span>}
                                    </li>
                                ))
                            ) : (<span className="empty-text">Büyü eklenmedi.</span>)}
                        </ul>
                    </div>

                    <div className="summary-section">
                        <h3 className="summary-title">Envanter & Cüzdan</h3>
                        <div className="currency-summary">
                            <span>{character.currency.cp} CP</span>
                            <span>{character.currency.sp} SP</span>
                            <span>{character.currency.ep} EP</span>
                            <span className="gold-text">{character.currency.gp} GP</span>
                            <span>{character.currency.pp} PP</span>
                        </div>
                        <div className="inventory-summary-list">
                            {character.inventory?.length > 0 ? (
                                character.inventory.map(item => (
                                    item.name && <div className="inv-mini-item" key={item.id}>
                                        <span>{item.name}</span>
                                        <span className="qty-text">x{item.quantity}</span>
                                    </div>
                                ))
                            ) : (<span className="empty-text">Çanta boş.</span>)}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default SummaryStep;