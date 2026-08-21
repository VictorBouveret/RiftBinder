import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/Layout'
import { useLanguageSync } from './hooks/useLanguageSync'
import { Home } from './pages/Home'
import { CardDetail } from './pages/CardDetail'
import { CardList } from './pages/CardList'
import { Collection } from './pages/Collection'
import { Wishlist } from './pages/Wishlist'
import { Settings } from './pages/Settings'
import { Login } from './pages/Login'
import { Signup } from './pages/Signup'

function LanguageSync() {
  useLanguageSync()
  return null
}

function App() {
  return (
    <AuthProvider>
      <LanguageSync />
      <Routes>
        {/* Login/Signup restent des écrans autonomes, sans le header/nav du
            site (convention courante : pas de distraction sur les écrans
            d'authentification). */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/cards" element={<CardList />} />
          <Route path="/cards/:cardId" element={<CardDetail />} />

          <Route
            path="/collection"
            element={
              <ProtectedRoute>
                <Collection />
              </ProtectedRoute>
            }
          />
          <Route
            path="/wishlist"
            element={
              <ProtectedRoute>
                <Wishlist />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
        </Route>
      </Routes>
    </AuthProvider>
  )
}

export default App