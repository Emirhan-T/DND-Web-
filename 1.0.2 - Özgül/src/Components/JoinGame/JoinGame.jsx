import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './JoinGame.css';

const JoinGame = () => {
    const navigate = useNavigate();
    const [joinCode, setJoinCode] = useState('');
    const [selectedCharId, setSelectedCharId] = useState('');
    const [characters, setCharacters] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchCharacters = async () => {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (!token) {
            navigate('/');
            return;
        }
        try {
            const response = await fetch('http://localhost:5001/api/characters', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setCharacters(data);
            } else {
                alert("Error fetching characters: " + data.message);
            }
        } catch (error) {
            console.error("Connection error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCharacters();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleJoin = async () => {
        if (!joinCode.trim()) {
            alert("Please enter a Game Code.");
            return;
        }
        if (!selectedCharId) {
            alert("Please select a character.");
            return;
        }

        const selectedCharacter = characters.find(c => c._id === selectedCharId);
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');

        try {
            // 1. Verify the game exists first
            const verifyRes = await fetch(`http://localhost:5001/api/games/join/${joinCode.toUpperCase()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const verifyData = await verifyRes.json();

            if (!verifyRes.ok) {
                alert("Error joining game: " + verifyData.message);
                return;
            }

            // 2. Join the game in the DB
            const joinRes = await fetch(`http://localhost:5001/api/games/join/${joinCode.toUpperCase()}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    characterId: selectedCharacter._id,
                    playerName: selectedCharacter.playerName || selectedCharacter.name,
                    characterName: selectedCharacter.name
                })
            });
            const joinData = await joinRes.json();

            if (joinRes.ok) {
                alert("Joined game successfully!");
                navigate('/player-dashboard', { state: { character: selectedCharacter, gameCode: joinCode.toUpperCase() } });
            } else {
                alert("Error: " + joinData.message);
            }
        } catch (error) {
            console.error("Connection error:", error);
            alert("Connection error. Failed to join game.");
        }
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
                    {isLoading ? (
                        <div style={{ color: '#fff', fontSize: '14px', margin: '15px 0' }}>Loading characters...</div>
                    ) : (
                        <div className="char-list">
                            {characters.map(char => (
                                <div 
                                    key={char._id} 
                                    className={`char-card ${selectedCharId === char._id ? 'selected' : ''}`}
                                    onClick={() => setSelectedCharId(char._id)}
                                >
                                    <span className="char-name">{char.name}</span>
                                    <span className="char-sub">Lvl {char.level} {char.charClass}</span>
                                </div>
                            ))}
                            {characters.length === 0 && (
                                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', margin: '15px 0' }}>
                                    No characters found. Create one first!
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="action-buttons">
                    <button className="cancel-btn" onClick={() => navigate('/main-menu')}>CANCEL</button>
                    <button className="join-btn" onClick={handleJoin} disabled={characters.length === 0}>JOIN GAME ➔</button>
                </div>
            </div>
        </div>
    );
};

export default JoinGame;
