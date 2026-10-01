# QuestBoard

A gamified quest/task overlay HUD desktop app built with Electron, React, and TypeScript.

## Phase 1 — Project Scaffold

- Electron main process (`electron/main.ts`) + preload (`electron/preload.ts`), compiled separately to `dist-electron/`.
- React + TypeScript renderer bundled with Vite (`src/`), output to `dist/`.

### Scripts

- `npm install` — install dependencies.
- `npm run electron:dev` — run Vite dev server + Electron together with hot reload.
- `npm run build` — type-check and build both renderer and Electron main process.
- `npm start` — launch the built Electron app (run `build` first).

## Roadmap

1. ✅ Electron + React + TypeScript scaffold
2. Overlay HUD with glassmorphism
3. Quest Manager page
4. SQLite database
5. XP and leveling system
6. Animations
7. Settings page
