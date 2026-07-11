# Movie Game

Movie Game is a small React app that generates wordplay ideas from a movie title. Enter a title, blur the input, and the app asks the Datamuse API for related words for each title word.

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

> Note: GitHub Pages only hosts static files. The React app calls the public Datamuse API directly, so it works on Pages, but the existing `netlify/functions` examples are not deployed by GitHub Pages.
