import React, { useState } from 'react';
import './LoginForm.css';
import { FaUser, FaLock } from "react-icons/fa";
import { useNavigate } from 'react-router-dom';

const LoginForm = () => {
    const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  
  // New state to toggle Forgot Password view
  const [isForgotPassword, setIsForgotPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isForgotPassword) {
        // --- FORGOT PASSWORD LOGIC ---
        try {
            const response = await fetch('http://localhost:5001/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            
            const data = await response.json();
            
            if (response.ok) {
                alert("Password reset link sent to your email!");
                setIsForgotPassword(false); // Return to login view
            } else {
                alert("Error: " + data.message);
            }
        } catch (error) {
            console.error("Connection error:", error);
            alert("Failed to connect to the server.");
        }
    } else if (isRegistering) {
        // --- REGISTER LOGIC ---
        try {
            const response = await fetch('http://localhost:5001/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (response.ok) {
                alert("Registration successful! You can now login.");
                setIsRegistering(false); 
                setPassword(''); 
            } else {
                alert("Error: " + data.message);
            }
        } catch (error) {
            console.error("Connection error:", error);
            alert("Failed to connect to the server.");
        }
    } else {
        // --- LOGIN LOGIC ---
        try {
            const response = await fetch('http://localhost:5001/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, rememberMe }),
            });

            const data = await response.json();

            if (response.ok) {
                alert("Login successful!");
                console.log("JWT Token:", data.token);

                if (rememberMe) {
                    localStorage.setItem('token', data.token);
                } else {
                    sessionStorage.setItem('token', data.token);
                }
                navigate('/main-menu');
            } else {
                alert("Error: " + data.message);
            }
        } catch (error) {
            console.error("Connection error:", error);
            alert("Failed to connect to the server.");
        }
    }
  };

  return (
    <div className='wrapper'> 
      <form onSubmit={handleSubmit}>
        {/* Dynamic Header */}
        <h1>
            {isForgotPassword ? "Reset Password" : isRegistering ? "Register" : "Login"}
        </h1>
        
        <div className="input-box">
            <input 
              type="email" 
              placeholder='E-Mail' 
              required 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
            />
            <FaUser className='icon' />
        </div>
        
        {/* Hide password input if user is recovering password */}
        {!isForgotPassword && (
            <div className="input-box">
                <input 
                  type="password" 
                  placeholder='Password' 
                  required 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                />
                <FaLock className='icon' />
            </div>
        )}

        {/* Show Remember Me & Forgot Password only in Login mode */}
        {!isRegistering && !isForgotPassword && (
            <div className="remember-forgot">
                <label>
                    <input 
                        type="checkbox" 
                        checked={rememberMe} 
                        onChange={(e) => setRememberMe(e.target.checked)} 
                    />
                    Remember me
                </label>
                <a href="#" onClick={(e) => {
                    e.preventDefault();
                    setIsForgotPassword(true);
                }}>Forgot Password?</a>
            </div>
        )}

        <button type="submit">
            {isForgotPassword ? "SEND RESET LINK" : isRegistering ? "REGISTER" : "LOGIN"}
        </button>
        
        <div className="register-link">
            <p>
                {/* Dynamic Footer Links */}
                {isForgotPassword ? (
                    <a href="#" onClick={(e) => {
                        e.preventDefault();
                        setIsForgotPassword(false);
                    }}>Back to Login</a>
                ) : isRegistering ? (
                    <>Already have an account? <a href="#" onClick={(e) => {
                        e.preventDefault();
                        setIsRegistering(false);
                    }}>Login</a></>
                ) : (
                    <>Don't Have an Account? <a href="#" onClick={(e) => {
                        e.preventDefault();
                        setIsRegistering(true);
                    }}>Register</a></>
                )}
            </p>
        </div>
      </form>
    </div>
  );
};

export default LoginForm;