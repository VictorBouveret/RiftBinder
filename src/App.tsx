import { Routes, Route } from 'react-router-dom'
import { Home } from './pages/Home'
import { CardDetail } from './pages/CardDetail'
import { CardList } from './pages/CardList'
import { Collection } from './pages/Collection'
import { Wishlist } from './pages/Wishlist'
import { Settings } from './pages/Settings'
import { Login } from './pages/Login'
import { Signup } from './pages/Signup'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/cards" element={<CardList />} />
      <Route path="/cards/:cardId" element={<CardDetail />} />
      <Route path="/collection" element={<Collection />} />
      <Route path="/wishlist" element={<Wishlist />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
    </Routes>
  )
}

export default App
