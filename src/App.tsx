import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './App.css'
import LandingView from './LandingView'
import ChatView from './ChatView'
import JobsView from './JobsView'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingView />} />
        <Route path="/chat" element={<ChatView />} />
        <Route path="/jobs" element={<JobsView />} />
      </Routes>
    </Router>
  )
}

export default App
