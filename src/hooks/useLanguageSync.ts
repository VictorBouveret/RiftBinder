import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// Applique la langue enregistrée dans le profil de l'utilisateur à i18next
// au chargement / à la connexion. Settings.tsx appelle i18n.changeLanguage
// directement pour un retour instantané ; ce hook couvre le cas où l'app
// démarre déjà connectée (rechargement de page, nouvel onglet...).
export function useLanguageSync() {
  const { user } = useAuth()
  const { i18n } = useTranslation()

  useEffect(() => {
    if (!user) return

    supabase
      .from('profiles')
      .select('language')
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.error(error)
          return
        }
        if (data?.language) {
          i18n.changeLanguage(data.language)
        }
      })
  }, [user, i18n])
}