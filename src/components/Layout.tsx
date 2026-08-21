import { Outlet } from 'react-router-dom'
import { AppHeader } from './AppHeader'

export function Layout() {
  return (
    <div className="min-h-screen bg-zinc-950">
      <AppHeader />
      <Outlet />
    </div>
  )
}