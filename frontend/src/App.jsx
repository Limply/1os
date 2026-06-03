import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Login from './pages/Login'
import ClockIn from './pages/ClockIn'
import Dashboard from './pages/Dashboard'
import Placeholder from './pages/Placeholder'
import Files from './pages/Files'
import Projects from './pages/Projects'
import HR from './pages/HR'
import Finance from './pages/Finance'
import OrgChart from './pages/OrgChart'
import Calendar from './pages/Calendar'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/clock-in" element={<ClockIn />} />
        <Route element={<Layout />}>
          <Route path="/"           element={<Dashboard />} />
          <Route path="/projects"   element={<Projects />} />
          <Route path="/hr"         element={<HR />} />
          <Route path="/orgchart"   element={<OrgChart />} />
          <Route path="/operations" element={<Placeholder title="Operations" />} />
          <Route path="/finance"    element={<Finance />} />
          <Route path="/compliance" element={<Placeholder title="Compliance" />} />
          <Route path="/files"      element={<Files />} />
          <Route path="/calendar"   element={<Calendar />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
