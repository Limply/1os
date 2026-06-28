import { useState, useEffect } from 'react'

// Modules every tenant always has, regardless of what they paid for.
export const CORE_MODULES = ['dashboard']

// Top-level feature modules that can be switched on/off per tenant (the Settings
// "Modules" toggles). Keys must match the `module` keys used in the sidebar and
// the <ModuleGate> route guards.
export const FEATURE_MODULES = [
  { key: 'projects',   label: 'Projects' },
  { key: 'hr',         label: 'HR' },
  { key: 'crm',        label: 'CRM' },
  { key: 'operations', label: 'Operations' },
  { key: 'finance',    label: 'Finance' },
  { key: 'compliance', label: 'Compliance' },
  { key: 'files',      label: 'Files' },
]

// Single fetch of /api/auth/tenant-info/ shared across the app (logo, modules,
// title, etc.). Cached for the app's lifetime so we don't refetch per component.
let _cache = null
export function fetchTenantInfo() {
  if (!_cache) {
    _cache = fetch('/api/auth/tenant-info/')
      .then(r => r.json())
      .catch(() => ({}))
  }
  return _cache
}

export function useTenantInfo() {
  const [info, setInfo] = useState(null)
  useEffect(() => {
    let alive = true
    fetchTenantInfo().then(d => { if (alive) setInfo(d || {}) })
    return () => { alive = false }
  }, [])
  return { info: info || {}, loading: info === null }
}

// A top-level module is "paid for" if it's core, OR the tenant has no module
// list configured (unconfigured = everything enabled — keeps existing installs
// working), OR the module key is in the tenant's list. Gating is tenant-wide:
// it applies to everyone in the tenant, admins included.
export function isModulePaid(moduleKey, tenantModules) {
  if (CORE_MODULES.includes(moduleKey)) return true
  if (!Array.isArray(tenantModules) || tenantModules.length === 0) return true
  return tenantModules.includes(moduleKey)
}
