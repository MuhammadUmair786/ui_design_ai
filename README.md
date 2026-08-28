# GUIDE

Frontend-only multi-agent UI design generator. Enter a prompt and get three self-contained, interactive HTML designs in parallel. Each column runs its own Planner → Generator → Critic → optional Fix pipeline on a model you pick. One [OpenRouter](https://openrouter.ai) API key unlocks the full model catalog (BYOK; no backend).

## Prerequisites

- **Node.js** 18+ (recommended: 20.19+)
- **npm**
- An [OpenRouter](https://openrouter.ai) API key (required to generate designs)

## Quick start

1. Install dependencies:

```bash
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

## Other commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run ESLint |

## Troubleshooting

### `vite: command not found`

Run `npm install` first — dependencies are not installed yet.

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

- **Frontend-only** — no backend server and no `.env` file. Your API key is stored in the browser's `localStorage` and sent directly to OpenRouter.
- **Optional deploy** — after `npm run build`, the app can be deployed to Firebase Hosting (see `firebase.json`).

## Stack

- React + TypeScript + Vite
- Tailwind CSS (app chrome only)
- Monaco Editor for HTML editing
- JSZip + file-saver for downloads
- OpenAI SDK pointed at `https://openrouter.ai/api/v1` (browser BYOK)

## Project layout

```
src/
  agents/       planner, generator, critic, pipeline, sanitize
  providers/    OpenRouter client + live/fallback model catalog
  components/   SettingsPanel, DesignColumn, ModelSelect, EditorView, …
  types/        DesignSpec, SlotResult, AppSettings, …
  hooks/        useSettings, useSlotModels, useOpenRouterModels, usePipeline
  utils/        localStorage keys, download helpers
```

## Security notes

Your OpenRouter key lives in `localStorage` and is sent only to OpenRouter from the browser (`dangerouslyAllowBrowser: true`). Generated HTML is shown only via `<iframe srcdoc>` with `sandbox="allow-scripts"` — never `dangerouslySetInnerHTML` or `eval`.
