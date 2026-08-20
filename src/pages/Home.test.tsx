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

  it('affiche les boutons de connexion quand personne n’est connecté', async () => {
    renderHome()
    expect(await screen.findByText('Se connecter')).toBeInTheDocument()
    expect(await screen.findByText('Créer un compte')).toBeInTheDocument()
  })
})