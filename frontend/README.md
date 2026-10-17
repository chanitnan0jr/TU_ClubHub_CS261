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
`@tailwindcss/postcss` plugin configured in `postcss.config.js`.

While the backend is unavailable, open `http://localhost:5173/club-profile-preview`
in development to try the club profile form without authentication or API
requests. Saves on this page update local component state only.

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

Reusable client-side validators are exported from `src/utils/validation.ts`:
`isRequired`, `isValidUrl`, `isValidFacebookUrl`, `isValidInstagramUrl`,
`isValidDomeTuEmail`, and `isValidClubContactEmail`. The profile editor uses
the API's HTTPS and social-host restrictions and accepts contact emails at the
`@dome.tu.ac.th`, `@tu.ac.th`, or `@gmail.com` domains.

The profile form uses the `ClubResponseDto` and emits a
`ClubUpdateRequestDto` containing only fields writable through
`PUT /api/v1/clubs/{clubId}`. Category and tags are displayed as read-only;
blank optional values are sent as `null` to clear them. The local preview
doesn't send this payload to the backend.
