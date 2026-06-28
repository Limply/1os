import { useTenantInfo, isModulePaid } from '../utils/tenant'
import ComingSoon from '../pages/ComingSoon'

// Route guard: renders the wrapped feature only if the tenant has paid for
// `module`; otherwise shows the ComingSoon lock page. Blocks direct URL access
// even when the sidebar link is hidden/locked. Tenant-wide (admins included).
export default function ModuleGate({ module, title, children }) {
  const { info, loading } = useTenantInfo()
  if (loading) return null
  if (!isModulePaid(module, info.modules)) return <ComingSoon title={title} />
  return children
}
