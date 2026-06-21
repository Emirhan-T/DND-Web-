import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './HostGame.css';

const HostGame = () => {
    const navigate = useNavigate();
    const [campaigns, setCampaigns] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Modal ve Form State'leri
    const [activeModal, setActiveModal] = useState(null); // 'new', 'info', 'delete'
    const [selectedCampaign, setSelectedCampaign] = useState(null);
    const [newGameData, setNewGameData] = useState({ name: '', description: '' });

    const fetchCampaigns = async () => {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (!token) {
            navigate('/');
            return;
        }
        try {
            const response = await fetch('http://localhost:5001/api/games/my-games', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setCampaigns(data);
            } else {
                alert("Error fetching campaigns: " + data.message);
            }
        } catch (error) {
            console.error("Connection error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCampaigns();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // --- HANDLERS ---
    const openModal = (type, campaign = null) => {
        setSelectedCampaign(campaign);
        setActiveModal(type);
    };

    const closeModal = () => {
        setActiveModal(null);
        setSelectedCampaign(null);
        setNewGameData({ name: '', description: '' });
    };

    const handleDeleteConfirm = async () => {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        try {
            const response = await fetch(`http://localhost:5001/api/games/${selectedCampaign._id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                alert("Campaign deleted successfully!");
                fetchCampaigns();
            } else {
                alert("Error: " + data.message);
            }
        } catch (error) {
            console.error("Connection error:", error);
        } finally {
            closeModal();
        }
    };

    const handleCreateGame = async () => {
        if (!newGameData.name) return;
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        try {
            const response = await fetch('http://localhost:5001/api/games/host', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: newGameData.name,
                    description: newGameData.description
                })
            });
            const data = await response.json();
            if (response.ok) {
                alert("Campaign created successfully! Game Code: " + data.gameCode);
                fetchCampaigns();
                closeModal();
            } else {
                alert("Error: " + data.message);
            }
        } catch (error) {
            console.error("Connection error:", error);
        }
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
                {isLoading ? (
                    <div style={{ textAlign: 'center', color: '#fff', fontSize: '18px', margin: '40px 0' }}>Loading campaigns...</div>
                ) : (
                    <div className="campaign-list-container">
                        {campaigns.length > 0 ? (
                            campaigns.map(camp => (
                                <div className="campaign-row" key={camp._id}>
                                    <div className="camp-main-info">
                                        <h3>{camp.name}</h3>
                                        <span>Join Code: <strong style={{color: '#d4af37'}}>{camp.gameCode}</strong> | Players: {camp.players?.length || 0}</span>
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
                )}

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
                        <div className="info-detail"><strong>Join Code:</strong> <span className="highlight-code">{selectedCampaign.gameCode}</span></div>
                        <div className="info-detail"><strong>Players:</strong> {selectedCampaign.players?.length || 0}</div>
                        <div className="info-detail desc-box"><strong>Description:</strong><p>{selectedCampaign.description || 'No description provided.'}</p></div>
                        <div className="modal-actions center-action">
                            <button className="modal-cancel-btn" onClick={closeModal}>CLOSE</button>
                            <button className="modal-confirm-btn launch-btn" onClick={() => {
                                closeModal(); // Modalı kapat
                                navigate('/gm-dashboard', { state: { gameCode: selectedCampaign.gameCode } }); // Zindan Ustası paneline ışınla
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