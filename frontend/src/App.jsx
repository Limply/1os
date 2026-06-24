import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { getUser } from './api/auth'
import { can, P } from './utils/permissions'
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
import ProfitLoss from './pages/ProfitLoss'
import OrgChart from './pages/OrgChart'
import Calendar from './pages/Calendar'
import Settings from './pages/Settings'
import CRM from './pages/CRM'
import Operations from './pages/Operations'
import Personal from './pages/Personal'
import SupervisorLayout from './supervisor/SupervisorLayout'
import SupervisorHome from './supervisor/pages/SupervisorHome'
import SupervisorTasks from './supervisor/pages/SupervisorTasks'
import SupervisorTaskDetail from './supervisor/pages/SupervisorTaskDetail'
import SupervisorDailyReport from './supervisor/pages/SupervisorDailyReport'
import SupervisorWSHPhoto from './supervisor/pages/SupervisorWSHPhoto'
import SupervisorReports from './supervisor/pages/SupervisorReports'
import SupervisorProblemReport from './supervisor/pages/SupervisorProblemReport'
import SupervisorTeam from './supervisor/pages/SupervisorTeam'
import SupervisorSettings from './supervisor/pages/SupervisorSettings'

function RootRedirect() {
  if (can(P.SUPERVISOR_APP) && !can(P.DASHBOARD_VIEW)) return <Navigate to="/supervisor" replace />
  return <Dashboard />
}

export default function App() {
  useEffect(() => {
    fetch('/api/auth/tenant-info/')
      .then(r => r.json())
      .then(data => {
        if (data.project_prefix) document.title = `${data.project_prefix} 1OS`
      })
      .catch(() => {})
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/clock-in" element={<ClockIn />} />
        <Route path="/camera-test" element={<CameraTest />} />
        <Route path="/supervisor" element={<SupervisorLayout />}>
          <Route index element={<SupervisorHome />} />
          <Route path="tasks"           element={<SupervisorTasks />} />
          <Route path="tasks/:taskId"   element={<SupervisorTaskDetail />} />
          <Route path="daily-report"    element={<SupervisorDailyReport />} />
          <Route path="wsh-photo"       element={<SupervisorWSHPhoto />} />
          <Route path="reports"          element={<SupervisorReports />} />
          <Route path="problem-report"   element={<SupervisorProblemReport />} />
          <Route path="team"          element={<SupervisorTeam />} />
          <Route path="clock-in" element={<ClockIn />} />
          <Route path="settings" element={<SupervisorSettings />} />
        </Route>
        <Route element={<Layout />}>
          <Route path="/"           element={<RootRedirect />} />
          <Route path="/my"         element={<Personal />} />
          <Route path="/projects"   element={<Projects />} />
          <Route path="/hr"         element={<HR />} />
          <Route path="/schedules"  element={<Schedules />} />
          <Route path="/orgchart"   element={<OrgChart />} />
          <Route path="/crm"        element={<CRM />} />
          <Route path="/operations" element={<Operations />} />
          <Route path="/finance"    element={<Finance />} />
          <Route path="/finance/pl" element={<ProfitLoss />} />
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
