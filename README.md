# GUIDE

Two sites in one repo: a multi-agent HTML generator, and a live gallery of screens for designer evaluation.

| Folder | What it is | Firebase Hosting site |
|---|---|---|
| [`guide-app`](guide-app) | Frontend-only generator. Enter a prompt and get three self-contained HTML designs in parallel (Planner → Generator → Critic → optional Fix) via [OpenRouter](https://openrouter.ai). | `guide-246aa` |
| [`guide-designs`](guide-designs) | Static gallery of generated screens. Designers preview variants and open the full HTML. | `guide-designs` |

Firebase project: `guide-246aa`.

## Prerequisites

- **Node.js** 18+ (recommended: 20.19+)
- **npm**
- An [OpenRouter](https://openrouter.ai) API key (required to generate designs)
- Firebase CLI via `npx -y firebase-tools@latest` (for deploy)

## Generator (`guide-app`)

1. Install dependencies:

```bash
cd guide-app
npm install
```

2. Start the dev server:

```bash
npm run dev
```

3. Open the URL Vite prints (usually `http://localhost:5173`).

4. In the app:
   - Open **Settings**
   - Paste your OpenRouter API key
   - Choose a model per column
   - Enter a prompt and generate

### Other commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Production build → `guide-app/dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run ESLint |

## Design gallery (`guide-designs`)

Screens live in `guide-designs/designs/` as self-contained HTML files.

- Open [`guide-designs/index.html`](guide-designs/index.html) in a browser, or
- Emulate Hosting from the repo root:

```bash
npx -y firebase-tools@latest emulators:start --only hosting --project guide-246aa
```

### Add a new screen

1. Save a self-contained `.html` file into `guide-designs/designs/` using a numbered slug, for example `19-product-screen-name.html`.
2. Append an entry to the `DESIGNS` array in `guide-designs/index.html` (`file`, `title`, `product`, `frame`: `phone` or `wide`).
3. Deploy the gallery (see below).

## Deploy

From the repo root, after `cd guide-app && npm run build` if you are shipping the generator:

```bash
# Gallery only (designers)
npx -y firebase-tools@latest deploy --only hosting:guide-designs --project guide-246aa

# Generator only
npx -y firebase-tools@latest deploy --only hosting:guide-246aa --project guide-246aa
```

Live gallery: `https://guide-designs.web.app`

## Troubleshooting

### `vite: command not found`

Run `npm install` inside `guide-app` first.

### `EACCES` / npm cache permission error

If `npm install` fails with a cache permission error, fix ownership of your npm cache:

```bash
sudo chown -R $(whoami) ~/.npm
```

Then run `npm install` again. As a one-off workaround without `sudo`:

```bash
npm install --cache /tmp/npm-cache
```

### `EBADENGINE` warning

A warning about Node version (e.g. `eslint-visitor-keys` wanting Node 20.19+) is safe to ignore. Upgrade Node to 20.19+ or 22+ to silence it.

## Notes

- **Frontend-only generator** — no backend server and no `.env` file. Your API key is stored in the browser's `localStorage` and sent directly to OpenRouter.
- Generated HTML is shown in the generator via `<iframe srcdoc>` with `sandbox="allow-scripts"` — never `dangerouslySetInnerHTML` or `eval`.

## Stack

- React + TypeScript + Vite (`guide-app`)
- Tailwind CSS (app chrome only)
- Monaco Editor for HTML editing
- JSZip + file-saver for downloads
- OpenAI SDK pointed at `https://openrouter.ai/api/v1` (browser BYOK)
- Static HTML/CSS/JS gallery (`guide-designs`)
- Firebase Hosting (two sites)

## Generator layout

```
guide-app/src/
  agents/       planner, generator, critic, pipeline, sanitize
  providers/    OpenRouter client + live/fallback model catalog
  components/   SettingsPanel, DesignColumn, ModelSelect, EditorView, …
  types/        DesignSpec, SlotResult, AppSettings, …
  hooks/        useSettings, useSlotModels, useOpenRouterModels, usePipeline
  utils/        localStorage keys, download helpers
```

## Security notes

Your OpenRouter key lives in `localStorage` and is sent only to OpenRouter from the browser (`dangerouslyAllowBrowser: true`).
