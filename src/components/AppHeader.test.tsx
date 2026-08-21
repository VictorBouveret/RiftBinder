import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { AuthProvider } from '../contexts/AuthContext'
import { AppHeader } from './AppHeader'

function renderHeader() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <AppHeader />
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('AppHeader', () => {
  it('affiche le nom du site et les boutons de connexion quand personne n’est connecté', async () => {
    renderHeader()
    expect(await screen.findByText('RiftBinder')).toBeInTheDocument()
    expect(await screen.findByText('Se connecter')).toBeInTheDocument()
    expect(await screen.findByText('Créer un compte')).toBeInTheDocument()
  })
})