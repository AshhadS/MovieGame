# Movie Game

Movie Game is a small React app that generates wordplay ideas from a movie title. Enter a title and the app asks the configured clue-word provider for alternatives to each title word.

## Stack

- React 19
- Vite
- Node.js 24
- GitHub Pages static hosting

## Local development

```bash
npm install
npm run dev
```

The app runs through Vite. GitHub Actions deploys the built static app from `dist` to GitHub Pages.

## Synonym provider

Copy `.env.example` to `.env.local` and set `VITE_SYNONYM_PROVIDER`:

```text
VITE_SYNONYM_PROVIDER=related
```

Available values:

- `related` (default) preserves the existing behavior by taking Datamuse `ml` results in API order.
- `datamuse` uses the recommended integration: ranked `rel_syn` results first, followed by an unbiased `ml` fallback when strict synonyms do not provide enough clues.
- `merriam-webster` uses Merriam-Webster's Collegiate Thesaurus synonym lists and requires `VITE_MERRIAM_WEBSTER_API_KEY`.

Merriam-Webster results are cached in the browser for 30 days (up to 250 words). Repeated or simultaneous lookups for the same word reuse the cached result instead of spending another API request.

To use Merriam-Webster locally, add this to `.env.local`:

```text
VITE_SYNONYM_PROVIDER=merriam-webster
VITE_MERRIAM_WEBSTER_API_KEY=<your Collegiate Thesaurus API key>
```

For GitHub Pages, add the repository variables `VITE_SYNONYM_PROVIDER=merriam-webster` and `VITE_MERRIAM_WEBSTER_API_KEY=<your key>` under **Settings → Secrets and variables → Actions → Variables**. The workflow passes those exact variable names to Vite and stops the build with an explicit error if Merriam-Webster is selected without a key.

Like every `VITE_*` value, the Merriam-Webster key is compiled into the static browser bundle and can be inspected by visitors. Keeping it private requires a server-side proxy. Also review Merriam-Webster's non-commercial usage, daily-query, attribution, and branding requirements before deployment.

Restart the Vite development server after changing the value. For a deployed build, set `VITE_SYNONYM_PROVIDER` in the hosting environment before `npm run build`. Because this is a Vite build variable, switching providers requires rebuilding the static site.

## Latest movies from TMDB

The **Random latest** button loads a random title from TMDB's current `movie/now_playing` feed. If TMDB is not configured or cannot be reached, the app automatically uses its built-in movie list.

For local development, add these values to `.env.local`:

```text
VITE_TMDB_API_TOKEN=<your TMDB API Read Access Token>
VITE_TMDB_LANGUAGE=en-US
VITE_TMDB_REGION=US
```

For GitHub Pages, add `VITE_TMDB_API_TOKEN` as a repository variable. Optionally add `VITE_TMDB_LANGUAGE` and `VITE_TMDB_REGION`. The Pages workflow passes these values to the Vite build automatically.

GitHub Pages is a static host, so the TMDB read token is compiled into the browser bundle and can be inspected by visitors even when it is stored as a GitHub Actions secret. Use only TMDB's application-level read token here; protecting a credential completely requires routing requests through a server-side function or proxy.

## Build

```bash
npm run build
```

## Tests

```bash
npm test
```

## GitHub Pages

This project is configured for GitHub Pages with the workflow at `.github/workflows/deploy-pages.yml`.

The workflow:

- runs on pushes to `main` or by manual dispatch
- uses Node.js 24 and `npm ci`
- builds with `BASE_PATH=/${GITHUB_REPOSITORY_NAME}/` so Vite assets resolve under the repository path
- uploads `dist` and deploys it with GitHub Pages Actions

### Repository configuration required

In GitHub, open **Settings → Pages** and set **Build and deployment → Source** to **GitHub Actions**. After the next successful workflow run, the app will be available at:

```text
https://<your-github-username>.github.io/<repository-name>/
```

For this repository name, the default project URL will be:

```text
https://<your-github-username>.github.io/MovieGame/
```

If you deploy with a custom domain at the site root, set `BASE_PATH=/` in the workflow build step before running `npm run build`.

> Note: GitHub Pages only hosts static files. Both provider modes call the public Datamuse API directly, so they work on Pages, but the existing `netlify/functions` examples are not deployed by GitHub Pages.
