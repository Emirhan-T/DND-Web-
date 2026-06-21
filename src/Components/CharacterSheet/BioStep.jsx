import React from 'react';
import './BioStep.css';

const BioStep = ({ 
    character, handleBioChange, handleAddLanguage, 
    handleLanguageChange, handleRemoveLanguage, handleImageUpload 
}) => {
    return (
        <div className="step-content fade-in bio-step-container">
            
            <div className="bio-top-row">
                <div className="portrait-section">
                    <div className="portrait-frame">
                        {character.portrait ? (
                            <img src={character.portrait} alt="Character Portrait" className="character-portrait-img" />
                        ) : (
                            <div className="portrait-placeholder">UPLOAD IMAGE</div>
                        )}
                        <input 
                            type="file" 
                            accept="image/*" 
                            className="portrait-upload-input" 
                            onChange={handleImageUpload} 
                        />
                    </div>
                </div>

                <div className="appearance-section details-section">
                    <div className="section-header">
                        <h2>Appearance</h2>
                    </div>
                    <div className="appearance-grid">
                        <div className="weapon-input-group">
                            <label>Age</label>
                            <input type="text" value={character.appearance.age} onChange={(e) => handleBioChange('appearance', 'age', e.target.value)} />
                        </div>
                        <div className="weapon-input-group">
                            <label>Height</label>
                            <input type="text" value={character.appearance.height} onChange={(e) => handleBioChange('appearance', 'height', e.target.value)} />
                        </div>
                        <div className="weapon-input-group">
                            <label>Weight</label>
                            <input type="text" value={character.appearance.weight} onChange={(e) => handleBioChange('appearance', 'weight', e.target.value)} />
                        </div>
                        <div className="weapon-input-group">
                            <label>Eyes</label>
                            <input type="text" value={character.appearance.eyes} onChange={(e) => handleBioChange('appearance', 'eyes', e.target.value)} />
                        </div>
                        <div className="weapon-input-group">
                            <label>Skin</label>
                            <input type="text" value={character.appearance.skin} onChange={(e) => handleBioChange('appearance', 'skin', e.target.value)} />
                        </div>
                        <div className="weapon-input-group">
                            <label>Hair</label>
                            <input type="text" value={character.appearance.hair} onChange={(e) => handleBioChange('appearance', 'hair', e.target.value)} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="bio-middle-row">
                <div className="traits-section details-section">
                    <div className="section-header">
                        <h2>Personality</h2>
                    </div>
                    <div className="traits-grid">
                        <div className="trait-box">
                            <label>Personality Traits</label>
                            <textarea value={character.traits.personality} onChange={(e) => handleBioChange('traits', 'personality', e.target.value)}></textarea>
                        </div>
                        <div className="trait-box">
                            <label>Ideals</label>
                            <textarea value={character.traits.ideals} onChange={(e) => handleBioChange('traits', 'ideals', e.target.value)}></textarea>
                        </div>
                        <div className="trait-box">
                            <label>Bonds</label>
                            <textarea value={character.traits.bonds} onChange={(e) => handleBioChange('traits', 'bonds', e.target.value)}></textarea>
                        </div>
                        <div className="trait-box">
                            <label>Flaws</label>
                            <textarea value={character.traits.flaws} onChange={(e) => handleBioChange('traits', 'flaws', e.target.value)}></textarea>
                        </div>
                    </div>
                </div>

                <div className="languages-section details-section">
                    <div className="section-header">
                        <h2>Languages</h2>
                        <button type="button" className="add-btn" onClick={handleAddLanguage}>+ ADD</button>
                    </div>
                    <div className="languages-list">
                        {character.languages.map(lang => (
                            <div className="language-row" key={lang.id}>
                                <input 
                                    type="text" 
                                    placeholder="e.g. Elvish" 
                                    value={lang.name} 
                                    onChange={(e) => handleLanguageChange(lang.id, e.target.value)} 
                                />
                                <button type="button" className="remove-btn-small" onClick={() => handleRemoveLanguage(lang.id)}>✕</button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="backstory-section details-section">
                <div className="section-header">
                    <h2>Character Backstory</h2>
                </div>
                <textarea 
                    className="backstory-textarea" 
                    placeholder="Write your character's history here..." 
                    value={character.backstory} 
                    onChange={(e) => handleBioChange(null, 'backstory', e.target.value)}
                ></textarea>
            </div>
            
        </div>
    );
};

export default BioStep;