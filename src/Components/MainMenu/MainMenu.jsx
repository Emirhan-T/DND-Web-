import React from 'react';
import { useNavigate } from 'react-router-dom';
import './MainMenu.css'; 

const MainMenu = () => {
    const navigate = useNavigate();

    // Modüler yapı: Menü elemanlarını bir dizi içinde tutuyoruz
    const menuItems = [
        { id: 1, label: 'Create / Edit Character', path: '/character-manager' },
        { id: 2, label: 'Host Game', path: '/host-game' },
        { id: 3, label: 'Join Game', path: '/join-game' },
        { id: 4, label: 'Settings', path: '/settings' }
    ];

    const handleLogout = () => {
        // Tarayıcıdaki VIP bilekliklerini (token) silip çıkış yapıyoruz
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
        navigate('/'); // Login sayfasına geri şutla
    };

    return (
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
    );
};

export default MainMenu;