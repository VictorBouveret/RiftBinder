import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { AuthProvider } from '../contexts/AuthContext'
import { CardDetail } from './CardDetail'

function renderCardDetail(cardId: string) {
  return render(
    <MemoryRouter initialEntries={[`/cards/${cardId}`]}>
      <AuthProvider>
        <Routes>
          <Route path="/cards/:cardId" element={<CardDetail />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('CardDetail', () => {
  it('affiche un état de chargement avant que les données arrivent', () => {
    renderCardDetail('ogn-001')
    expect(screen.getByText('Chargement...')).toBeInTheDocument()
  })
})