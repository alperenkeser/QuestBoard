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

## Azure DevOps

Open **Settings → Azure DevOps**, enter the sprint, WIQL, and work-item batch API URLs plus the Basic Auth username and PAT/password. **Test connection** checks the sprint endpoint and, on success, loads the current sprint and tasks assigned to the authenticated user. **Synchronize** reconnects and fetches the latest data. Credentials are encrypted with Electron `safeStorage` and kept locally on this device; use **Forget credentials** to remove them.

## Roadmap

1. ✅ Electron + React + TypeScript scaffold
2. Overlay HUD with glassmorphism
3. Quest Manager page
4. SQLite database
5. XP and leveling system
6. Animations
7. Settings page
