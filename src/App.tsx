import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './App.css'
import LandingView from './LandingView'
import ChatView from './ChatView'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingView />} />
        <Route path="/chat" element={<ChatView />} />
      </Routes>
    </Router>
  )
}

export default App
