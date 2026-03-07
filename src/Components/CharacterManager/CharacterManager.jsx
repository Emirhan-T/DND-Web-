import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './CharacterManager.css';

const CharacterManager = () => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');

    // Mock data to visualize the design. We will fetch this from MongoDB later!
    const [characters, setCharacters] = useState([
        {
            id: 1,
            name: 'Doğan Çalıkoğlu',
            level: 6,
            species: 'Human',
            charClass: 'Wizard/Evoker',
            image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=100&q=80' // Placeholder avatar
        },
        {
            id: 2,
            name: 'Kaelen Swift',
            level: 3,
            species: 'Elf',
            charClass: 'Rogue',
            image: 'https://images.unsplash.com/photo-1551269901-5c5e14c25df7?auto=format&fit=crop&w=100&q=80'
        }
    ]);

    const maxSlots = 6;
    const usedSlots = characters.length;

    return (
        <div className="manager-bg">
            <div className="manager-wrapper">
                
                {/* Header Section */}
                <div className="manager-header">
                    <div className="header-left">
                        <h1>My Characters</h1>
                        <p className="slots-info">Slots: <span className="highlight">{usedSlots}/{maxSlots} Used</span></p>
                    </div>
                    <div className="header-right">
                        <button className="create-btn" onClick={() => alert('Character creation page coming soon!')}>
                            CREATE A CHARACTER
                        </button>
                        <a href="#" className="download-link">↓ Download a blank character sheet</a>
                    </div>
                </div>

                {/* Toolbar Section (Search & Sort) */}
                <div className="manager-toolbar">
                    <div className="search-box">
                        <input 
                            type="text" 
                            placeholder="🔍 Search by Name, Level, Class, Species..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="sort-box">
                        <select>
                            <option value="oldest">Created: Oldest</option>
                            <option value="newest">Created: Newest</option>
                            <option value="level">Level: High to Low</option>
                        </select>
                    </div>
                </div>

                {/* Character List Grid */}
                <div className="character-grid">
                    {characters.map(char => (
                        <div className="character-card" key={char.id}>
                            <div className="card-top">
                                <img src={char.image} alt={char.name} className="char-avatar" />
                                <div className="char-info">
                                    <h2>{char.name}</h2>
                                    <p>Level {char.level} | {char.species} | {char.charClass}</p>
                                </div>
                            </div>
                            <div className="card-actions">
                                <button className="action-btn">VIEW</button>
                                <button className="action-btn">EDIT</button>
                                <button className="action-btn">COPY</button>
                                <button className="action-btn delete-btn">DELETE</button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Back to Menu */}
                <div className="back-to-menu">
                    <button className="back-btn" onClick={() => navigate('/main-menu')}>
                        ← Back to Main Menu
                    </button>
                </div>

            </div>
        </div>
    );
};

export default CharacterManager;