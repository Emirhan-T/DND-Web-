import React from 'react';
import { useNavigate } from 'react-router-dom';
import './MainMenu.css'; 

const MainMenu = () => {
    const navigate = useNavigate();

    const menuItems = [
        { id: 1, label: 'Create / Edit Character', path: '/character-manager' },
        { id: 2, label: 'Host Game', path: '/host-game' },
        { id: 3, label: 'Join Game', path: '/join-game' },
        { id: 4, label: 'Settings', path: '/settings' }
    ];

    const handleLogout = () => {
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
        navigate('/'); 
    };

    return (
        /* Added a full-screen background container here */
        <div className="main-menu-bg">
            <div className='wrapper main-menu-wrapper'>
                <h1>Main Menu</h1>
                
                <div className="menu-buttons-container">
                    {menuItems.map((item) => (
                        <button 
                            key={item.id} 
                            className="menu-btn"
                            onClick={() => navigate(item.path)}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>

                <div className="logout-container">
                    <button className="logout-btn" onClick={handleLogout}>
                        LOGOUT
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MainMenu;