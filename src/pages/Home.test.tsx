import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Home } from './Home'

describe('Home', () => {
  it('affiche le titre Accueil', () => {
    render(<Home />)
    expect(screen.getByText('Accueil')).toBeInTheDocument()
  })
})
