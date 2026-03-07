import { Routes, Route, useNavigate } from 'react-router-dom'
import CDButton from './components/CDButton'
import AppLayout from './components/AppLayout'
import './App.css'

function LandingPage() {
  const navigate = useNavigate()

  const handleCDClick = () => {
    navigate('/app')
  }

  return (
    <div className="landing">
      <div className="landing__content">
        <h1 className="landing__title">NAVBEATS</h1>
        <div className="landing__button-wrapper">
          <CDButton
            onClick={handleCDClick}
            size={180}
            ariaLabel="Start NAVBEATS"
          />
        </div>
        <p className="landing__tagline">Your route. Your rhythm.</p>
      </div>
    </div>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/app" element={<AppLayout />} />
    </Routes>
  )
}

export default App

