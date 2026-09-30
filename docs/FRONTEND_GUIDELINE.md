# Frontend Guideline

## Stack

- React
- Vite
- JavaScript/JSX and existing TypeScript component files
- CSS currently centralized in `frontend/src/styles.css`

Do not migrate to another frontend framework without explicit approval.

## Logical Structure

Converge gradually toward:

```text
src/
  assets/
  pages/
  components/
    base/
    features/
  routes/
  layouts/
  lib/
  hooks/
  store/
  types/
  styles/
  providers/
  schemas/
  services/
  utils/
  constants/
```

Current components may remain in `src/components` until touched. When editing a
module, improve local placement only when it reduces risk and does not cause a
large unrelated diff.

## UI Principles

- Build operational screens, not marketing pages.
- Prioritize scanning, forms, tables, clear state, and repeated workflows.
- Keep core workflows usable in Vietnamese.
- Use clear loading, empty, no-data, stale, unavailable, validation, and error
  states.
- Do not show fake success for login, booking, payment, notification, telemetry,
  or resource operations.
- Do not let static/demo content appear as verified runtime data.

## Authorization

- Frontend visibility is UX only.
- Backend remains authority for every sensitive action.
- Use canonical uppercase roles.
- Handle `401` by clearing local session state and requiring re-authentication.

## Data Access

- Use the live API for core workflows.
- Avoid importing `mockData.js` into production-core flows.
- Preserve optional/research simulations behind explicit flags or isolated
  surfaces.

## Forms And Tables

- Keep labels connected to inputs.
- Preserve user input when API mutation fails.
- Focus error summary or first invalid field on submit failure.
- Avoid success toasts before the backend confirms persistence.
- Tables should have captions or equivalent accessible names.

## Accessibility

- Support keyboard navigation.
- Keep visible focus states.
- Do not communicate status by color alone.
- Icon-only controls need accessible names and tooltips.
- Modals should manage focus on open and restore focus on close.

## Design References

Materio and Untitled UI references can inform component organization, spacing,
dashboard patterns, and accessibility. Do not copy framework architecture
blindly and do not migrate React/Vite to Next.js because a reference uses it.

## Verification

Use at least:

```text
cd frontend
npm run build
```

When touching auth or resource workflows, also consider:

```text
npm run test:e2e:auth
npm run test:e2e:resources
```


## Shared locale contract

Use `useLocale().t(key, params)` with canonical IDs in `src/locales/catalog`.
Add matching VI/EN entries and run `npm run i18n:sync`; CI runs `test:i18n`.
Do not resolve messages at module initialization or add inline bilingual pairs.
Keep parameterized notices as `LocaleMessage` descriptors until render. Preserve
form state during locale changes and original user/resource content. Calendar
labels and assistant tool summaries carry keys; business codes and Vietnam time
remain unchanged. See `BILINGUAL_ASSISTANT_FOUNDATION_20260930.md` for the verified
boundary and examples of recovery tests.
