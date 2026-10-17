# TU ClubHub frontend

Frontend for TU ClubHub, built with React, TypeScript, Vite, and Tailwind CSS
v4.

## Development

From this directory, install dependencies and start the Vite development
server:

```sh
npm install
npm run dev
```

Run a production build with `npm run build`.

Tailwind is loaded from `src/index.css` and compiled with the
`@tailwindcss/vite` plugin in `vite.config.ts`.

## Club profile editor

`src/ClubProfileForm.tsx` exports the reusable `ClubProfileForm` component and
its `ClubProfile` type. Pass the club profile to edit and an `onSave` callback:

```tsx
<ClubProfileForm profile={club} onSave={saveClubProfile} />
```

The form keeps the profile ID fixed and only edits the profile supplied by its
parent. The current app uses local state as a frontend preview; production
authorization must verify on the server that the signed-in staff member may
edit that club.
