# GUIDE

Frontend-only multi-agent UI design generator. Enter a prompt and get three self-contained, interactive HTML designs in parallel. Each column runs its own Planner → Generator → Critic → optional Fix pipeline on a model you pick. One [OpenRouter](https://openrouter.ai) API key unlocks the full model catalog (BYOK; no backend).

## Quick start

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`), add your OpenRouter key in **Settings**, choose a model per column, then generate.

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
