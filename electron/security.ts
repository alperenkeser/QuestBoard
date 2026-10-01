import type { IpcMainInvokeEvent } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";

function isTrustedRendererUrl(value: string): boolean {
  let candidate: URL;
  try {
    candidate = new URL(value);
  } catch {
    return false;
  }

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    let trustedDevUrl: URL;
    try {
      trustedDevUrl = new URL(devServerUrl);
    } catch {
      return false;
    }
    return (
      candidate.origin === trustedDevUrl.origin &&
      candidate.pathname === (trustedDevUrl.pathname || "/") &&
      candidate.hash === ""
    );
  }

  if (candidate.protocol !== "file:" || candidate.hash !== "") return false;
  try {
    return path.resolve(fileURLToPath(candidate)) === path.resolve(__dirname, "../dist/index.html");
  } catch {
    return false;
  }
}

export function assertTrustedIpcSender(event: IpcMainInvokeEvent): void {
  const frame = event.senderFrame;
  if (
    !frame ||
    frame !== event.sender.mainFrame ||
    !isTrustedRendererUrl(frame.url)
  ) {
    console.warn(`Rejected IPC request from untrusted renderer: ${frame?.url ?? "unknown"}`);
    throw new Error("IPC requests are only accepted from the QuestBoard renderer.");
  }
}

export function secureRendererNavigation(win: Electron.BrowserWindow): void {
  const rejectUntrustedNavigation = (event: Electron.Event, url: string) => {
    if (isTrustedRendererUrl(url)) return;
    event.preventDefault();
    console.warn(`Blocked navigation from QuestBoard to untrusted URL: ${url}`);
  };

  win.webContents.on("will-navigate", rejectUntrustedNavigation);
  win.webContents.on("will-redirect", rejectUntrustedNavigation);
  win.webContents.setWindowOpenHandler(({ url }) => {
    console.warn(`Blocked popup from QuestBoard to URL: ${url}`);
    return { action: "deny" };
  });
}
