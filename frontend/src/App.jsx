import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Placeholder from './pages/Placeholder'
import Files from './pages/Files'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<Layout />}>
          <Route path="/"           element={<Dashboard />} />
          <Route path="/projects"   element={<Placeholder title="Projects" />} />
          <Route path="/hr"         element={<Placeholder title="HR" />} />
          <Route path="/operations" element={<Placeholder title="Operations" />} />
          <Route path="/finance"    element={<Placeholder title="Finance" />} />
          <Route path="/compliance" element={<Placeholder title="Compliance" />} />
          <Route path="/files"      element={<Files />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
