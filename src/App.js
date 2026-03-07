import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginForm from './Components/LoginForm/LoginForm.jsx';
import ResetPasswordForm from './Components/LoginForm/ResetPasswordForm'; // We will create this next
import MainMenu from './Components/MainMenu/MainMenu.jsx';
import CharacterManager from './Components/CharacterManager/CharacterManager.jsx';

function App() {
  return (
    <Router>
      <Routes>
        {/* Default route shows the Login/Register form */}
        <Route path="/" element={<LoginForm />} />
        
        {/* Dynamic route to capture the reset token from the URL */}
        <Route path="/reset-password/:token" element={<ResetPasswordForm />} />
        <Route path="/main-menu" element={<MainMenu />} />
        <Route path="/character-manager" element={<CharacterManager />} />
      </Routes>
    </Router>
  );
}

export default App;