import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './JoinGame.css';

const JoinGame = () => {
    const navigate = useNavigate();
    const [joinCode, setJoinCode] = useState('');
    const [selectedCharId, setSelectedCharId] = useState('');

    // MOCK DATA for user's characters
    const myCharacters = [
        { 
            id: 'char_1', name: 'Valerius', charClass: 'Paladin', level: 5, species: 'Human', 
            stats: { Strength: 16, Dexterity: 10, Constitution: 14, Intelligence: 8, Wisdom: 12, Charisma: 16 },
            proficiencies: { 'Strength-Athletics': true, 'Charisma-Persuasion': true },
            armorClass: 18, currentHp: 45, maxHp: 45, speed: 30, inspiration: false 
        },
        { 
            id: 'char_2', name: 'Lyra', charClass: 'Rogue', level: 4, species: 'Elf', 
            stats: { Strength: 8, Dexterity: 18, Constitution: 12, Intelligence: 14, Wisdom: 10, Charisma: 14 },
            proficiencies: { 'Dexterity-Stealth': true, 'Dexterity-Acrobatics': true },
            armorClass: 15, currentHp: 28, maxHp: 32, speed: 35, inspiration: true 
        }
    ];

    const handleJoin = () => {
        if (!joinCode.trim()) {
            alert("Please enter a Join Code.");
            return;
        }
        if (!selectedCharId) {
            alert("Please select a character.");
            return;
        }

        const selectedCharacter = myCharacters.find(c => c.id === selectedCharId);
        
        // Navigate to player dashboard with state
        navigate('/player-dashboard', { state: { character: selectedCharacter, gameCode: joinCode } });
    };

    return (
        <div className="join-game-bg">
            <div className="wrapper join-game-wrapper fade-in">
                <h1>Join Game</h1>
                
                <div className="input-group">
                    <label>Game Code</label>
                    <input 
                        type="text" 
                        placeholder="e.g. EPIC2026" 
                        value={joinCode} 
                        onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    />
                </div>

                <div className="input-group">
                    <label>Select Character</label>
                    <div className="char-list">
                        {myCharacters.map(char => (
                            <div 
                                key={char.id} 
                                className={`char-card ${selectedCharId === char.id ? 'selected' : ''}`}
                                onClick={() => setSelectedCharId(char.id)}
                            >
                                <span className="char-name">{char.name}</span>
                                <span className="char-sub">Lvl {char.level} {char.charClass}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="action-buttons">
                    <button className="cancel-btn" onClick={() => navigate('/main-menu')}>CANCEL</button>
                    <button className="join-btn" onClick={handleJoin}>JOIN GAME ➔</button>
                </div>
            </div>
        </div>
    );
};

export default JoinGame;
