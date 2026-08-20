import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { AuthProvider } from '../contexts/AuthContext'
import { CardList } from './CardList'

function renderCardList(path = '/cards') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <Routes>
          <Route path="/cards" element={<CardList />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('CardList', () => {
  it('affiche le titre par défaut', async () => {
    renderCardList()
    expect(await screen.findByText('Toutes les cartes')).toBeInTheDocument()
  })

  it('affiche le filtre de recherche pré-rempli depuis les query params', async () => {
    renderCardList('/cards?name=Ahri')
    const input = await screen.findByPlaceholderText('Rechercher une carte')
    expect(input).toHaveValue('Ahri')
  })
})