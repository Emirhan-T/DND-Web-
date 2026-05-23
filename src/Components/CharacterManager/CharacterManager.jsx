import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './CharacterManager.css';

const CharacterManager = () => {
    const navigate = useNavigate();
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

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this character?")) return;
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        try {
            const response = await fetch(`http://localhost:5001/api/characters/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                alert("Character deleted successfully!");
                fetchCharacters();
            } else {
                alert("Error: " + data.message);
            }
        } catch (error) {
            console.error("Connection error:", error);
        }
    };

    const handleCopy = async (char) => {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const cloned = { ...char };
        delete cloned._id;
        delete cloned.createdAt;
        delete cloned.updatedAt;
        cloned.name = `Copy of ${cloned.name}`;

        try {
            const response = await fetch('http://localhost:5001/api/characters', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(cloned)
            });
            if (response.ok) {
                alert("Character cloned successfully!");
                fetchCharacters();
            } else {
                const data = await response.json();
                alert("Error copying character: " + data.message);
            }
        } catch (error) {
            console.error("Connection error:", error);
        }
    };

    const handleEdit = (char) => {
        navigate('/character-sheet', { state: { character: char } });
    };

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
                        <button className="create-btn" onClick={() => navigate('/character-sheet')}
                            disabled={usedSlots >= maxSlots}
                            >
                            CREATE A CHARACTER
                        </button>
                    </div>
                </div>


                {/* Character List Grid */}
                {isLoading ? (
                    <div style={{ textAlign: 'center', color: '#fff', fontSize: '18px', margin: '40px 0' }}>Loading characters...</div>
                ) : (
                    <div className="character-grid">
                        {characters.map(char => (
                            <div className="character-card" key={char._id}>
                                <div className="card-top">
                                    <img src={char.imageUrl || char.portrait} alt={char.name} className="char-avatar" />
                                    <div className="char-info">
                                        <h2>{char.name}</h2>
                                        <p>Level {char.level} | {char.species} | {char.charClass}</p>
                                    </div>
                                </div>
                                <div className="card-actions">
                                    <button className="action-btn" onClick={() => handleEdit(char)}>VIEW</button>
                                    <button className="action-btn" onClick={() => handleEdit(char)}>EDIT</button>
                                    <button className="action-btn" onClick={() => handleCopy(char)}>COPY</button>
                                    <button className="action-btn delete-btn" onClick={() => handleDelete(char._id)}>DELETE</button>
                                </div>
                            </div>
                        ))}
                        {characters.length === 0 && (
                            <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'rgba(255,255,255,0.4)', margin: '40px 0' }}>
                                You don't have any characters yet. Start by creating one!
                            </div>
                        )}
                    </div>
                )}

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