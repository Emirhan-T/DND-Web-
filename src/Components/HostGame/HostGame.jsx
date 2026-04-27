import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './HostGame.css';

const HostGame = () => {
    const navigate = useNavigate();

    // Mevcut Oyunlar (İleride DB'den gelecek)
    const [campaigns, setCampaigns] = useState([
        { id: 1, name: "Lost Mine of Phandelver", joinCode: "LMP2026", players: 4, lastPlayed: "2 days ago", description: "A classic adventure for beginners. Goblins, magic, and a lost mine." },
        { id: 2, name: "Curse of Strahd", joinCode: "VAMP99", players: 6, lastPlayed: "1 week ago", description: "Gothic horror in the dark and cursed land of Barovia." }
    ]);

    // Modal ve Form State'leri
    const [activeModal, setActiveModal] = useState(null); // 'new', 'info', 'delete'
    const [selectedCampaign, setSelectedCampaign] = useState(null);
    const [newGameData, setNewGameData] = useState({ name: '', joinCode: '', description: '' });

    // --- HANDLERS ---
    const openModal = (type, campaign = null) => {
        setSelectedCampaign(campaign);
        setActiveModal(type);
    };

    const closeModal = () => {
        setActiveModal(null);
        setSelectedCampaign(null);
        setNewGameData({ name: '', joinCode: '', description: '' });
    };

    const handleDeleteConfirm = () => {
        setCampaigns(campaigns.filter(c => c.id !== selectedCampaign.id));
        closeModal();
    };

    const handleCreateGame = () => {
        if (!newGameData.name) return;
        const newCamp = {
            id: Date.now(),
            name: newGameData.name,
            joinCode: newGameData.joinCode || "RANDOM123",
            players: 0,
            lastPlayed: "Just now",
            description: newGameData.description
        };
        setCampaigns([...campaigns, newCamp]);
        closeModal();
    };

    return (
        <div className="sheet-bg">
            <div className="sheet-container host-dashboard fade-in">
                
                {/* --- HEADER (Title Left, Button Right) --- */}
                <div className="host-top-bar">
                    <div className="host-title-area">
                        <h1>Game Master's Table</h1>
                    </div>
                    <button className="new-game-btn" onClick={() => openModal('new')}>
                        + NEW GAME
                    </button>
                </div>

                {/* --- CENTER AREA: CAMPAIGN LIST --- */}
                <div className="campaign-list-container">
                    {campaigns.length > 0 ? (
                        campaigns.map(camp => (
                            <div className="campaign-row" key={camp.id}>
                                <div className="camp-main-info">
                                    <h3>{camp.name}</h3>
                                    <span>Last Played: {camp.lastPlayed} | Players: {camp.players}</span>
                                </div>
                                <div className="camp-actions">
                                    <button className="info-btn" onClick={() => openModal('info', camp)}>INFO</button>
                                    <button className="delete-btn" onClick={() => openModal('delete', camp)}>DELETE</button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="empty-state">No active campaigns found. Start a new journey!</div>
                    )}
                    
                </div>

                                {/* Back to Menu */}
                <div className="back-to-menu">
                    <button className="back-btn" onClick={() => navigate('/main-menu')}>
                        ← Back to Main Menu
                    </button>
                </div>

            </div>

            {/* ==========================================
                MODALS (Pop-ups over the page)
                ========================================== */}
            
            {/* 1. NEW GAME MODAL */}
            {activeModal === 'new' && (
                <div className="modal-overlay fade-in">
                    <div className="modal-content">
                        <h2>Create New Campaign</h2>
                        <div className="host-input-group">
                            <label>Campaign Name</label>
                            <input type="text" placeholder="e.g. Dragons of Icespire Peak" value={newGameData.name} onChange={(e) => setNewGameData({...newGameData, name: e.target.value})} />
                        </div>
                        <div className="host-input-group">
                            <label>Join Code</label>
                            <input type="text" placeholder="e.g. EPIC2026" value={newGameData.joinCode} onChange={(e) => setNewGameData({...newGameData, joinCode: e.target.value})} />
                        </div>
                        <div className="host-input-group">
                            <label>Description</label>
                            <textarea placeholder="Write a short intro for your players..." value={newGameData.description} onChange={(e) => setNewGameData({...newGameData, description: e.target.value})} />
                        </div>
                        <div className="modal-actions">
                            <button className="modal-cancel-btn" onClick={closeModal}>CANCEL</button>
                            <button className="modal-confirm-btn" onClick={handleCreateGame}>CREATE</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 2. INFO MODAL */}
            {activeModal === 'info' && selectedCampaign && (
                <div className="modal-overlay fade-in">
                    <div className="modal-content info-modal">
                        <h2>Campaign Info</h2>
                        <div className="info-detail"><strong>Name:</strong> {selectedCampaign.name}</div>
                        <div className="info-detail"><strong>Join Code:</strong> <span className="highlight-code">{selectedCampaign.joinCode}</span></div>
                        <div className="info-detail"><strong>Players:</strong> {selectedCampaign.players}</div>
                        <div className="info-detail"><strong>Last Played:</strong> {selectedCampaign.lastPlayed}</div>
                        <div className="info-detail desc-box"><strong>Description:</strong><p>{selectedCampaign.description}</p></div>
                        <div className="modal-actions center-action">
                            <button className="modal-cancel-btn" onClick={closeModal}>CLOSE</button>
                            <button className="modal-confirm-btn launch-btn" onClick={() => {
    closeModal(); // Modalı kapat
    navigate('/gm-dashboard'); // Zindan Ustası paneline ışınla
}}>
    LAUNCH GAME
</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 3. DELETE CONFIRMATION MODAL */}
            {activeModal === 'delete' && selectedCampaign && (
                <div className="modal-overlay fade-in">
                    <div className="modal-content warning-modal">
                        <h2>Are you sure?</h2>
                        <p>You are about to delete <strong>{selectedCampaign.name}</strong>.</p>
                        <p className="warning-text">This action cannot be undone. All player data and session history will be lost.</p>
                        <div className="modal-actions">
                            <button className="modal-cancel-btn" onClick={closeModal}>CANCEL</button>
                            <button className="modal-delete-btn" onClick={handleDeleteConfirm}>YES, DELETE IT</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default HostGame;