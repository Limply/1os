import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Login from './pages/Login'
import ClockIn from './pages/ClockIn'
import CameraTest from './pages/CameraTest'
import Schedules from './pages/Schedules'
import Dashboard from './pages/Dashboard'
import Placeholder from './pages/Placeholder'
import Files from './pages/Files'
import Projects from './pages/Projects'
import HR from './pages/HR'
import Finance from './pages/Finance'
import OrgChart from './pages/OrgChart'
import Calendar from './pages/Calendar'
import Settings from './pages/Settings'
import CRM from './pages/CRM'
import Personal from './pages/Personal'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/clock-in" element={<ClockIn />} />
        <Route path="/camera-test" element={<CameraTest />} />
        <Route element={<Layout />}>
          <Route path="/"           element={<Dashboard />} />
          <Route path="/my"         element={<Personal />} />
          <Route path="/projects"   element={<Projects />} />
          <Route path="/hr"         element={<HR />} />
          <Route path="/schedules"  element={<Schedules />} />
          <Route path="/orgchart"   element={<OrgChart />} />
          <Route path="/crm"        element={<CRM />} />
          <Route path="/operations" element={<Placeholder title="Operations" />} />
          <Route path="/finance"    element={<Finance />} />
          <Route path="/compliance" element={<Placeholder title="Compliance" />} />
          <Route path="/files"      element={<Files />} />
          <Route path="/calendar"   element={<Calendar />} />
          <Route path="/settings"   element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
