import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaLock } from "react-icons/fa";
import './LoginForm.css'; 

const ResetPasswordForm = () => {
    const [newPassword, setNewPassword] = useState('');
    
    // Extract the token from the URL (e.g., /reset-password/12345abcde)
    const { token } = useParams(); 
    
    // Hook to redirect the user after a successful password reset
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        try {
            const response = await fetch(`http://localhost:5001/api/auth/reset-password/${token}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: newPassword }),
            });

            const data = await response.json();

            if (response.ok) {
                alert("Password successfully reset! You can now login.");
                navigate('/'); // Send user back to the login page
            } else {
                alert("Error: " + data.message);
            }
        } catch (error) {
            console.error("Connection error:", error);
            alert("Failed to connect to the server.");
        }
    };

    return (
        <div className='wrapper'>
            <form onSubmit={handleSubmit}>
                <h1>Set New Password</h1>
                <div className="input-box">
                    <input 
                        type="password" 
                        placeholder='Enter new password' 
                        required 
                        value={newPassword} 
                        onChange={(e) => setNewPassword(e.target.value)} 
                    />
                    <FaLock className='icon' />
                </div>
                <button type="submit">UPDATE PASSWORD</button>
            </form>
        </div>
    );
};

export default ResetPasswordForm;