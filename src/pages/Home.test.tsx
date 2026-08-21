import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { AuthProvider } from '../contexts/AuthContext'
import { Home } from './Home'

function renderHome() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <Home />
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('Home', () => {
  it('affiche le titre Accueil', async () => {
    renderHome()
    expect(await screen.findByText('Accueil')).toBeInTheDocument()
  })

  it('affiche la barre de recherche', async () => {
    renderHome()
    expect(await screen.findByPlaceholderText('Rechercher une carte')).toBeInTheDocument()
  })
})