# SlimRoute (v2)

A rebuild of the legacy `eating-plan-tracker` single-file app using Vite + React. Same Firebase project, same Firestore data, clean architecture.

---

## What's in this repo

```
slimroute/
├── index.html            ← Vite entry
├── package.json
├── vite.config.js
├── firebase.json         ← hosting config
├── .firebaserc           ← project alias + target map
├── src/
│   ├── main.jsx          ← React mount + ErrorBoundary
│   ├── App.jsx           ← ~80-line shell: auth, tab routing
│   ├── firebase/
│   │   ├── client.js     ← modular SDK init, auth helpers
│   │   └── sync.js       ← debounced cloud sync
│   ├── hooks/
│   │   ├── useAuth.js
│   │   └── useLocalState.js
│   ├── lib/              ← all business logic, lifted verbatim
│   │   ├── data.js       ← INGS, MI, constraints, GI, fiber
│   │   ├── constants.js  ← tuning values, RDAs, day labels
│   │   ├── units.js      ← kg/lb, ft/cm conversions
│   │   ├── date.js       ← week helpers
│   │   ├── macros.js     ← ci/sm/sa, macroRole, clamp
│   │   ├── tdee.js       ← BMR, TDEE, adaptive TDEE (EWMA)
│   │   ├── meals.js      ← autoRebalance, micro/syn/fiber checks
│   │   ├── time.js       ← meal time parse/sort/shuffle
│   │   └── diary.js      ← diary reducer
│   ├── components/
│   │   ├── Card.jsx  Modal.jsx  TabBar.jsx  Checkbox.jsx  Icons.jsx
│   ├── screens/          ← one file per screen (stubs for now)
│   │   ├── Home.jsx  Diary.jsx  Ingredients.jsx  Meals.jsx
│   │   ├── Stats.jsx  Settings.jsx  Paywall.jsx
│   └── styles/
│       ├── tokens.css    ← design tokens as CSS variables
│       └── global.css    ← base reset + utility classes
└── tests/
    └── parity.test.js    ← regression tests that lock in legacy math
```

**This scaffold is Phase 1 + Phase 2 complete.** The library (`src/lib/`) is fully ported. Screens are stubs — they'll be rebuilt one at a time in follow-up sessions.

---

## One-time setup

```bash
# 1. Clone the repo (after you push it to GitHub)
git clone git@github.com:YOUR_USERNAME/slimroute.git
cd slimroute

# 2. Install dependencies
npm install

# 3. Confirm Node version — requires 18+ (check with)
node -v
```

---

## Day-to-day commands

```bash
npm run dev       # local dev server with hot reload (http://localhost:5173)
npm run build     # production build to dist/
npm run preview   # serve the production build locally
npm test          # run parity tests
npm run deploy    # build + deploy to Firebase (see below)
```

---

## Running the parity tests

```bash
npm test
```

These assert that the ported lib functions produce the same outputs as the legacy app (BMR, TDEE, calorie math, auto-rebalance tolerance, fiber/micro checks, time parsing). **If they break after a refactor, you've unintentionally changed a calculation.**

---

## Deploying to a preview Firebase site (side-by-side with production)

This is the safe rollout path: deploy the new app to a separate preview URL while the old `index.html` version keeps serving your users. When you're confident, swap domains.

```bash
# 1. Install the Firebase CLI if you don't have it
npm install -g firebase-tools

# 2. Log in
firebase login

# 3. Create a new hosting site in the same Firebase project.
#    This gives you a separate *.web.app URL for the new app.
firebase hosting:sites:create slimroute-v2

# 4. Map the "preview" target (declared in .firebaserc) to that site
firebase target:apply hosting preview slimroute-v2

# 5. Build and deploy
npm run build
firebase deploy --only hosting:preview
```

Your new app will be live at `https://slimroute-v2.web.app`. The old app keeps running at its current URL. Both read from the same Firestore database, so you can log in as yourself on the preview and see your real data.

---

## Swapping the domain when you're ready

When the new app has all screens working and you've tested against your own data:

```bash
# 1. Re-target the live/production site to this build
firebase target:apply hosting live eating-plan-a8952
# (or whatever your existing Hosting site name is — check with
#  `firebase hosting:sites:list`)

# 2. Add the live target to firebase.json — see note below.

# 3. Deploy
firebase deploy --only hosting:live
```

> **Editing `firebase.json` for the swap:** change the `"target"` field from `"preview"` to `"live"` (or add a second hosting entry with `"target": "live"`). Both can coexist so you can keep deploying previews after cutover.

To roll back, redeploy the old `index.html` from the legacy repo. Because the new app lives in a different repo, the rollback is always one `firebase deploy` away.

---

## Pushing to GitHub

```bash
cd slimroute
git init
git add .
git commit -m "Initial scaffold — Phase 1 + lib port"
git branch -M main
git remote add origin git@github.com:YOUR_USERNAME/slimroute.git
git push -u origin main
```

---

## Why this is faster than the old app

| | Old (single index.html) | New (this repo) |
|---|---|---|
| Total JS downloaded | ~1.4 MB (React + Firebase CDN + Babel) | ~250 KB (minified, tree-shaken, gzipped) |
| Babel runs in browser | Yes — compiles 5,000 lines on page load | No — pre-compiled at build time |
| Cold-start time | Multi-second | Sub-second on repeat visits (assets cached) |
| Version control diffs | One 5,000-line file | One file per concern |
| Rollback | Restore whole file | Redeploy previous commit |

---

## What's next

**Phase 3 — Screen rebuild.** Each screen becomes its own file, implemented against the ported lib. Suggested order:

1. **Home** (lightest — mostly layout)
2. **Ingredients** (reads INGS, uses macro math)
3. **Meals** (uses meal engine + checks)
4. **Diary** (biggest — uses reducer + engine + sync)
5. **Stats** (uses TDEE + adaptive TDEE)
6. **Settings** (units, profile, sync controls)
7. **Paywall** (access gating — keep last, it's mostly plumbing)

Do one per session with the old `index.html` open as reference. Each should take 30–60 minutes. The lib is done, so screen work is pure UI wiring — the safe, fun kind.

---

## Troubleshooting

- **`npm install` fails on `firebase`** — make sure you're on Node 18+.
- **Preview site shows a 404** — you probably haven't run `firebase target:apply hosting preview slimroute-v2` yet (step 4 above).
- **Auth works on the old app but not the new one** — check that `authDomain` in `src/firebase/client.js` matches what's whitelisted in Firebase Console → Authentication → Settings → Authorized domains. The preview `*.web.app` URL needs to be added there the first time.
- **Sign-in popup is blocked on mobile** — expected; the `googleSignIn` helper falls back to redirect flow automatically.
