import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './features/auth/AuthContext.tsx'
import ClubProfilePreview from './ClubProfilePreview.tsx'
import { RecruitmentRoundPreview } from './features/recruitment/components/RecruitmentRoundPreview.tsx'

const isClubProfilePreview =
  import.meta.env.DEV &&
  window.location.pathname === '/club-profile-preview'
const isRecruitmentRoundPreview =
  import.meta.env.DEV &&
  window.location.pathname === '/recruitment-round-preview'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isRecruitmentRoundPreview ? (
      <RecruitmentRoundPreview />
    ) : isClubProfilePreview ? (
      <ClubProfilePreview />
    ) : (
      <AuthProvider>
        <App />
      </AuthProvider>
    )}
  </StrictMode>,
)