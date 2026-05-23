import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { DataProvider } from './context/DataContext'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout/Layout'

// Public pages
import LandingPage       from './pages/LandingPage'
import LoginPage         from './pages/LoginPage'
import SignupPage        from './pages/SignupPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'

// Protected pages
import UploadPage    from './pages/UploadPage'
import DashboardPage from './pages/DashboardPage'
import EDAPage       from './pages/EDAPage'
import InsightsPage  from './pages/InsightsPage'
import ChatbotPage   from './pages/ChatbotPage'
import ReportPage    from './pages/ReportPage'
import HistoryPage   from './pages/HistoryPage'
import PredictivePage from './pages/PredictivePage'

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <ThemeProvider>
          <BrowserRouter>
            <Routes>
              {/* Public */}
              <Route path="/"               element={<LandingPage />} />
              <Route path="/login"          element={<LoginPage />} />
              <Route path="/signup"         element={<SignupPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />

              {/* Protected */}
              <Route element={<Layout />}>
                <Route path="/upload"    element={<ProtectedRoute><UploadPage /></ProtectedRoute>} />
                <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
                <Route path="/eda"       element={<ProtectedRoute><EDAPage /></ProtectedRoute>} />
                <Route path="/insights"  element={<ProtectedRoute><InsightsPage /></ProtectedRoute>} />
                <Route path="/chat"      element={<ProtectedRoute><ChatbotPage /></ProtectedRoute>} />
                <Route path="/report"    element={<ProtectedRoute><ReportPage /></ProtectedRoute>} />
                <Route path="/history"   element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
                <Route path="/predictive" element={<ProtectedRoute><PredictivePage /></ProtectedRoute>} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </ThemeProvider>
      </DataProvider>
    </AuthProvider>
  )
}
