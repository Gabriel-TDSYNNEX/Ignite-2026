# TD SYNNEX Ignite Navigator 2026

An interactive guide to the [Microsoft Ignite 2026 Book of News](https://news.microsoft.com/events/ignite/2026/book-of-news/).

**Live site:** [Ignite Navigator 2026](https://gabriel-tdsynnex.github.io/Ignite-2026/)

## Explore the portal

- Navigate the interactive map from an area to a product and then to an announcement.
- Search and filter announcements, follow curated journeys, save favorites, or use presentation mode.
- Choose English, Spanish, Brazilian Portuguese, or German in the header. The portal uses your browser's preferred supported language on your first visit and falls back to Spanish.
- Open the original Microsoft sources from each announcement. Favorites, read status, and language preferences are stored in your browser and are not synced across devices.

The portal is an independent editorial resource, not an official Microsoft website. Editorial interpretations are not product commitments. Check the original sources for availability, licensing, and requirements. Translations are machine-assisted and should be reviewed before reuse outside the portal.

## Run locally

Requirements: Node.js 24 and npm.

```powershell
npm ci
npm run dev
```

Open the local address displayed by Vite.

## Validate

```powershell
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

The browser tests build and serve the production artifact under the `/Ignite-2026/` path and require local port 4173. On Linux CI, install Chromium with `npx playwright install --with-deps chromium`.

To preview the production build locally:

```powershell
$env:PAGES_BASE = '/Ignite-2026/'
npm run build
npm run preview
```

## Deployment

The [repository](https://github.com/Gabriel-TDSYNNEX/Ignite-2026) publishes to GitHub Pages through the **Publish GitHub Pages** workflow when changes are pushed to `main`. GitHub Pages must use **GitHub Actions** as its source. The workflow tests and builds the site before deployment; check the Actions run and the live site after a release.

No custom secrets or AI service keys are required. The content update workflow uses GitHub's built-in `GITHUB_TOKEN` and requires permission to create pull requests.

## Update editorial content

The **Review Book of News updates** workflow checks the official source daily at 07:23 UTC and can also be started manually. It creates or updates a pull request for review; it does not automatically publish new or changed announcements.

To review a content proposal:

1. Review `content/changes.json` and `content/pending.json`, then run `npm run content:fetch` to compare against the current official source. If the source has changed since the proposal, refresh the proposal before accepting it.
2. Update the original Spanish summaries, products, profiles, and availability in `content/editorial.json`. Write original summaries rather than copying Microsoft's text. Remove retired entries and review affected journeys and featured items.
3. After reviewing each changed announcement, set its `sourceHash` to the corresponding `hash` in `content/pending.json` and keep `reviewed: true`.
4. Update the corresponding entries, hashes, and product labels in `content/translations.en.json`, `content/translations.pt.json`, and `content/translations.de.json`. Remove retired entries from all catalogs.
5. Run `npm run content:accept`, followed by the validation commands above. Acceptance checks editorial review, hashes, and complete translations before updating the snapshot.
6. Commit the reviewed changes to the pull request and merge it after review. The Pages workflow publishes the accepted version.

`npm run content:check` checks the source manually. `content/snapshot.json` stores the accepted source metadata and hashes; `content/incoming.json` is a local, ignored copy of source text for review. Human commits on the automated proposal branch pause automatic updates to protect editorial work.

## Privacy and publishing

Searches and favorites are not sent to a server. The portal has no analytics, authentication, chat, or model calls. Clearing site data removes locally saved preferences and activity.

Publish only public content and authorized brand assets. Keep customer information, internal plans, reference documents, and secrets out of the repository. The local brand reference folder and source downloads are excluded by `.gitignore`.
