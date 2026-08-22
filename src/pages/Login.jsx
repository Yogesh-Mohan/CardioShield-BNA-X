import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import LoginBackground3D from './LoginBackground3D';
import './Login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError('Failed to login. Please check your credentials.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="landing-container">
      <LoginBackground3D />
      <div className="cyber-grid"></div>
      <div className="particles">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="particle"></div>
        ))}
      </div>

      <div className="landing-content">
        <div className="hero-section">
          <div className="hero-content">
            <div className="pulse-circle"></div>
            <h1 className="glitch" data-text="CardioShield BNA-X">CardioShield BNA-X</h1>
            <p className="subtitle">Next-Generation Biometric Security & Health Monitoring</p>
            
            <div className="features-list">
              <div className="feature-item">
                <span className="icon">🧬</span>
                <div className="feature-text">
                  <h3>Digital BNA Construct</h3>
                  <p>Real-time multidimensional feature synthesis</p>
                </div>
              </div>
              <div className="feature-item">
                <span className="icon">🧠</span>
                <div className="feature-text">
                  <h3>Neural Schema Engine</h3>
                  <p>Adaptive baseline modeling & anomaly detection</p>
                </div>
              </div>
              <div className="feature-item">
                <span className="icon">⚡</span>
                <div className="feature-text">
                  <h3>Automated Intervention</h3>
                  <p>Simulated pacing & defibrillation workflows</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="login-section">
          <div className="login-glass-card">
            <div className="login-header">
              <h2>SECURE ACCESS</h2>
              <div className="scanner-line"></div>
            </div>

            {error && <div className="error-msg">{error}</div>}

            <form onSubmit={handleLogin} className="login-form">
              <div className="input-group">
                <label>OPERATIVE ID (EMAIL)</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter authorized email"
                  required
                />
              </div>

              <div className="input-group">
                <label>CLEARANCE CODE (PASSWORD)</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter clearance code"
                  required
                />
              </div>

              <button 
                type="submit" 
                className="login-btn"
                disabled={loading}
              >
                {loading ? 'AUTHENTICATING...' : 'INITIALIZE UPLINK'}
                {!loading && <span className="btn-icon">➔</span>}
              </button>
            </form>

            <div className="system-status">
              <span>NODE: ALPHA-7</span>
              <span className="status-good">● ONLINE</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
