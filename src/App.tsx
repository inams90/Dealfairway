import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './lib/auth'
import { AppShell } from './components/AppShell'
import { PublicOnly, RequireAuth } from './components/RouteGuards'
import { HomePage } from './pages/HomePage'
import { ClientsPage } from './pages/ClientsPage'
import { TasksPage } from './pages/TasksPage'
import { InquiriesPage } from './pages/InquiriesPage'
import { MorePage } from './pages/MorePage'
import { ProfilePage } from './pages/ProfilePage'
import { LoginPage } from './pages/auth/LoginPage'
import { SignUpPage } from './pages/auth/SignUpPage'
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicOnly />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route index element={<HomePage />} />
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/inquiries" element={<InquiriesPage />} />
          <Route path="/more" element={<MorePage />} />
          <Route path="/more/profile" element={<ProfilePage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
