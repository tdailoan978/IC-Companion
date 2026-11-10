# IC Companion

A personal study app for iPad that turns the lesson files in `content/` into interactive lessons that
follow *Integrated Chinese* (4th ed.), starting with Volume 2 (Lessons 11-20). It is a static web app
(React + Vite + TypeScript) hosted on GitHub Pages and added to the iPad Home Screen from Safari.
Single user, no accounts, no backend: all progress stays on the device (IndexedDB).

The full plan is in [PLAN.md](PLAN.md); the lesson file contract is in [CONTENT_FORMAT.md](CONTENT_FORMAT.md).

## Scripts

Needs Node 22.18 or later.

| Command | What it does |
|---|---|
| `npm install` | Install dependencies |
| `npm run dev` | Build the lesson JSON, then start the dev server (http://localhost:5173/ic-companion/) |
| `npm run build:content` | Parse `content/**/*.md` into `src/generated/lessons.json` (fails with file and line on bad content) |
| `npm run typecheck` | TypeScript check, no output |
| `npm test` | Run the Vitest tests once |
| `npm run build` | Content build, typecheck, tests, then the production build into `dist/` |
| `npm run preview` | Serve `dist/` locally to check a production build |
| `npm run icons` | Redraw the app icons into `public/icons/` (only needed if the icon design changes) |

## Deploying to GitHub Pages (one-time setup)

1. On GitHub, create an **empty** repository named `ic-companion` (no README, licence or .gitignore).
2. Push this repo to it:
   ```sh
   git remote add origin https://github.com/<your-user>/ic-companion.git
   git push -u origin main
   ```
3. In the repository, open **Settings → Pages** and set **Source** to **GitHub Actions**.
4. Every push to `main` now runs `.github/workflows/deploy.yml` (or run it by hand from the Actions tab).
   The site is published at `https://<your-user>.github.io/ic-companion/`.

If you rename the repository, change `base` in `vite.config.ts` to match.

## Installing on the iPad

Open the Pages URL in Safari, tap **Share → Add to Home Screen**. The footer of the lesson list shows the
build time (and commit) so you can tell when a new deploy has arrived; if it looks stale, close the app
from the app switcher and open it again.
