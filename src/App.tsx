import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { CustomerProvider } from './context/CustomerContext'
import Homepage from './pages/Homepage'
import PatientDashboard from './pages/PatientDashboard'
import Analytics from './pages/Analytics'
import UploadPage from './pages/UploadPage'

function App() {
  return (
    <Router>
      <CustomerProvider>
        <Routes>
          <Route path="/" element={<Homepage />} />
          <Route path="/patient/:customerId" element={<PatientDashboard />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/upload" element={<UploadPage />} />
        </Routes>
      </CustomerProvider>
    </Router>
  )
}

export default App
