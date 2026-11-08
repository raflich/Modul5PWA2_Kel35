# Bore & Barrel — PWA Armory Storefront

A firearm storefront built as a high-performance **Progressive Web App (PWA)** for Praktikum Pemrograman Perangkat Bergerak (PPB) Modul 5.

Runs completely offline-first with an App Shell architecture, Web App Manifest, Service Worker caching strategies, Stale-While-Revalidate query caching, component/image lazy loading, and Web Share API deep-linking.

---

## Features

- **App Shell & PWA Support**: Installable on Android, iOS, Windows, and macOS with service worker precaching and offline status banner.
- **Lazy Loading (Code Splitting)**:
  - Route and page level code-splitting via `React.lazy()` and `<Suspense>` for all secondary views (`CreateGunPage`, `EditGunPage`, `GunDetail`, `FavoritesPage`, `ProfilePage`, `About`, `Contact`).
  - Image lazy loading with `loading="lazy"` and `decoding="async"`.
- **Query Caching (Multi-tier & SWR)**:
  - In-memory synchronous cache for instantaneous 0ms tab switching and navigation.
  - Persistent `localStorage` fallback enabling complete offline-first access.
  - In-flight request deduplication preventing redundant parallel requests.
  - Background revalidation with reactive cache invalidations across mutations.
- **Workbox Runtime Caching**:
  - `NetworkFirst` strategy for REST API endpoints (`/api/v1/` and `/rest/v1/`) with a 4-second timeout falling back to `api-query-cache`.
  - `CacheFirst` strategy for images (`images-cache`).
- **Share Link (Web Share API & Deep Linking)**:
  - Native share dialog on mobile browsers (`navigator.share`).
  - Automatic fallback to clipboard copy with tooltip visual feedback.
  - Deep linking support (`/?gun=<id>`) to immediately open specified hardware pieces with back/forward history navigation.

---

## Setup & Running

```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm run dev

# 3. Production build
npm run build

# 4. Preview production build
npm run preview

# 5. Lint code
npm run lint
```

---

## Environment Variables

Copy `.env.example` to `.env`:

```env
VITE_API_BASE_URL=https://modlima.fuadfakhruz.id
```

---

## Project Structure

```
.
├── index.html                        # Application HTML shell
├── vite.config.js                    # Vite + vite-plugin-pwa (manifest & workbox runtimeCaching)
├── public/                           # Static assets served at root
│   ├── icon-192.png / icon-512.png   # PWA manifest icons
│   └── guns/                         # Static weapon SVGs
└── src/
    ├── main.jsx                      # App entry point
    ├── App.jsx                       # App shell, route state, deep linking, lazy suspense
    ├── App.css                       # Shell and component styles
    ├── components/
    │   ├── Header.jsx                # Header brand & navigation
    │   ├── Footer.jsx                # App footer
    │   ├── PWABadge.jsx              # PWA install prompt & offline banner
    │   ├── common/
    │   │   ├── ShareButton.jsx       # Web Share API & clipboard copy button
    │   │   ├── FavoriteButton.jsx    # Toggleable favorite heart
    │   │   ├── AdvancedFilter.jsx    # Search, filter, and sort bar
    │   │   └── SplashScreen.jsx      # Animated armory splash screen
    │   ├── gun/
    │   │   ├── GunCard.jsx           # Hardware piece card (lazy images + share button)
    │   │   └── GunDetail.jsx         # Full-screen hardware specification view
    │   └── modals/
    │       └── ConfirmModal.jsx      # Delete confirmation dialog
    ├── config/
    │   └── api.js                    # Axios instance & interceptors
    ├── hooks/
    │   ├── useQuery.js               # Reactive query caching hook (SWR)
    │   ├── useGuns.js                # Product listing & detail query hooks
    │   ├── useReviews.js             # Review listing & submission hooks
    │   └── useFavorites.js           # Server & offline favorites hooks
    ├── services/
    │   ├── gunService.js             # Product CRUD & cache invalidation
    │   ├── favoriteService.js        # Favorites service
    │   ├── reviewService.js          # Review service
    │   └── userService.js            # Operator profile storage
    ├── utils/
    │   ├── queryCache.js             # Core Query Cache Engine
    │   ├── draftStorage.js           # Offline form drafts manager
    │   └── helpers.js                # Currency, rating, formatting helpers
    └── pages/                        # Lazy-loaded views
        ├── Catalog.jsx               # Main hardware catalog
        ├── CreateGunPage.jsx         # New hardware addition form
        ├── EditGunPage.jsx           # Hardware editing form
        ├── FavoritesPage.jsx         # Saved armory shortlist
        ├── ProfilePage.jsx           # Armorer identity & cache purge
        ├── About.jsx                 # About armory
        └── Contact.jsx               # Contact armory
```
