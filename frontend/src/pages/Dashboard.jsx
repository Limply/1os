import { useEffect, useState } from 'react'
import api from '../api/axios'
import StatCard from '../components/StatCard'

export default function Dashboard() {
  const [stats, setStats] = useState({
    activeJobs: null,
    openProjects: null,
    pendingTasks: null,
    employees: null,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const [jobs, projects, tasks, employees] = await Promise.allSettled([
          api.get('/ops/jobs/?status=active'),
          api.get('/projects/projects/?status=active'),
          api.get('/projects/tasks/?status=todo'),
          api.get('/hr/employees/'),
        ])

        setStats({
          activeJobs:   jobs.status      === 'fulfilled' ? jobs.value.data.count      : '—',
          openProjects: projects.status  === 'fulfilled' ? projects.value.data.count  : '—',
          pendingTasks: tasks.status     === 'fulfilled' ? tasks.value.data.count     : '—',
          employees:    employees.status === 'fulfilled' ? employees.value.data.count : '—',
        })
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  const today = new Date().toLocaleDateString('en-SG', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">{today}</p>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Active Jobs"    value={stats.activeJobs}   sub="Operations"    color="blue"   />
          <StatCard label="Open Projects"  value={stats.openProjects}  sub="All types"     color="purple" />
          <StatCard label="Pending Tasks"  value={stats.pendingTasks}  sub="To do"         color="yellow" />
          <StatCard label="Employees"      value={stats.employees}     sub="Active staff"  color="green"  />
        </div>
      )}
    </div>
  )
}
