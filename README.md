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

Open **Quest Manager → Sprint boards → Connect Azure** to enter the sprint, WIQL, and work-item batch API URLs plus the Basic Auth username and PAT/password in a popup. The connection previews available sprints and tasks, selecting the current sprint by default. Choose individual tasks or transfer all fetched tasks into that sprint's separate board. Selecting another sprint previews its tasks; Sprint Boards stay separate from regular quests.

Transferred sprint and task data are stored in SQLite. Repeated imports match work items by Azure ID, update Azure-owned title/description/date/status fields, and preserve local subtasks and quest settings. Imports do not award or remove XP. Credentials are encrypted with Electron `safeStorage` and kept locally on this device; Basic Auth requests run in Electron's main process over HTTPS. Use **Forget credentials** to remove them.

Run `npm run test:azure-sprints` to execute the mock API and SQLite synchronization tests.

## Roadmap

1. ✅ Electron + React + TypeScript scaffold
2. Overlay HUD with glassmorphism
3. Quest Manager page
4. SQLite database
5. XP and leveling system
6. Animations
7. Settings page
