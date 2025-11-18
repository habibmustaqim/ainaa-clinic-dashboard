import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { CustomerProvider } from './context/CustomerContext'
import { SidebarProvider } from './context/SidebarContext'
import { ThemeProvider } from './context/ThemeContext'
import Homepage from './pages/Homepage'
import Customers from './pages/Customers'
import CustomerDashboard from './pages/CustomerDashboard'
import UploadPage from './pages/UploadPage'
import TransactionReport from './pages/TransactionReport'
import CustomerReport from './pages/CustomerReport'
import ComingSoon from './pages/ComingSoon'

function App() {
  return (
    <Router>
      <ThemeProvider>
        <SidebarProvider>
          <CustomerProvider>
          <Routes>
            {/* Main Pages */}
            <Route path="/" element={<Homepage />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/customer/:customerIdentifier" element={<CustomerDashboard />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/report/transaction" element={<TransactionReport />} />
            <Route path="/report/customer" element={<CustomerReport />} />

            {/* Customer Analytics Pages - Coming Soon */}
            <Route path="/customers/profiles" element={<ComingSoon pageName="Customer Profiles" />} />
            <Route path="/customers/segments" element={<ComingSoon pageName="Customer Segmentation" />} />
            <Route path="/customers/loyalty" element={<ComingSoon pageName="Loyalty Program" />} />
            <Route path="/customers/feedback" element={<ComingSoon pageName="Customer Feedback" />} />

            {/* Operations Pages - Coming Soon */}
            <Route path="/operations/appointments" element={<ComingSoon pageName="Appointments" />} />
            <Route path="/operations/inventory" element={<ComingSoon pageName="Inventory Management" />} />
            <Route path="/operations/services" element={<ComingSoon pageName="Services Management" />} />
            <Route path="/operations/staff" element={<ComingSoon pageName="Staff Management" />} />

            {/* Financial Pages - Coming Soon */}
            <Route path="/financial/revenue" element={<ComingSoon pageName="Revenue Analytics" />} />
            <Route path="/financial/payments" element={<ComingSoon pageName="Payment Management" />} />
            <Route path="/financial/reports" element={<ComingSoon pageName="Financial Reports" />} />

            {/* Marketing Pages - Coming Soon */}
            <Route path="/marketing/campaigns" element={<ComingSoon pageName="Marketing Campaigns" />} />
            <Route path="/marketing/performance" element={<ComingSoon pageName="Marketing Performance" />} />
            <Route path="/marketing/automation" element={<ComingSoon pageName="Marketing Automation" />} />

            {/* Other Pages - Coming Soon */}
            <Route path="/notifications" element={<ComingSoon pageName="Notifications" />} />
            <Route path="/settings" element={<ComingSoon pageName="Settings" />} />
            <Route path="/help" element={<ComingSoon pageName="Help & Support" />} />
          </Routes>
          </CustomerProvider>
        </SidebarProvider>
      </ThemeProvider>
    </Router>
  )
}

export default App
