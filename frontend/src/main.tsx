import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './features/auth/AuthContext.tsx'
import ClubProfilePreview from './ClubProfilePreview.tsx'

const isClubProfilePreview =
  import.meta.env.DEV &&
  window.location.pathname === '/club-profile-preview'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isClubProfilePreview ? (
      <ClubProfilePreview />
    ) : (
      <AuthProvider>
        <App />
      </AuthProvider>
    )}
  </StrictMode>,
)