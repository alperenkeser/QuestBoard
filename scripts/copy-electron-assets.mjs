// Copies non-TypeScript runtime assets (SQL migrations) into dist-electron/
// after tsc compiles electron/**/*.ts. Runs on every `build:electron`.
import { cpSync, copyFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const src = path.join(root, "electron", "database", "migrations");
const dest = path.join(root, "dist-electron", "database", "migrations");
const iconSource = path.join(root, "assets", "questboard-icon.png");
const iconDestDir = path.join(root, "dist-electron", "assets");

mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });
mkdirSync(iconDestDir, { recursive: true });
copyFileSync(iconSource, path.join(iconDestDir, "questboard-icon.png"));

console.log(`Copied migrations: ${src} -> ${dest}`);
