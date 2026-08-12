# ShopKart frontend

React 19 + TypeScript storefront and admin console. See the [project README](../README.md) for
setup, demo accounts and the API reference.

## Scripts

| Command             | What it does                                      |
| ------------------- | ------------------------------------------------- |
| `npm run dev`       | Dev server on <http://localhost:5173>              |
| `npm run build`     | Typecheck, then build to `dist/`                   |
| `npm run typecheck` | Typecheck only                                     |
| `npm run lint`      | Oxlint                                             |
| `npm run preview`   | Serve the production build                         |

The dev server proxies `/api` to `http://localhost:5000`, so the backend must be running.
To point at a different API, set `VITE_API_URL` in a `.env` file.

## Where things live

- `src/app` — Redux store and typed `useAppDispatch` / `useAppSelector` hooks
- `src/api/client.ts` — axios instance, token storage, error normalisation
- `src/features/*` — one slice per resource (auth, catalog, products, cart, wishlist, address)
- `src/components` — `layout/`, `routing/` guards, `product/`, `ui/` primitives
- `src/pages` — storefront pages, with the admin console under `pages/admin/`
- `src/types` — shared API types
