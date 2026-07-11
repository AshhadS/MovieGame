# Movie Game

Movie Game is a small React app that generates wordplay ideas from a movie title. Enter a title, blur the input, and the app asks the Datamuse API for related words for each title word.

## Stack

- React 19
- Vite
- Node.js 24
- Netlify static hosting with Netlify Functions

## Local development

```bash
npm install
npm run dev
```

The app runs through Vite. Netlify deploys the built static app from `dist`.

## Build

```bash
npm run build
```

## Tests

```bash
npm test
```

## Netlify

Netlify is configured in `netlify.toml` to:

- use Node.js 24
- run `npm run build`
- publish `dist`
- load functions from `netlify/functions`

Available functions:

- `/.netlify/functions/hello`
- `/.netlify/functions/async-dadjoke`
