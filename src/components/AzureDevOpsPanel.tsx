import { useEffect, useState } from "react";
import type {
  AzureDevOpsConnectRequestDto,
  AzureDevOpsSyncResultDto,
  AzureDevOpsConnectionDto,
} from "../types/bridge";
import { useSettingsStore } from "../store/settingsStore";

const EMPTY_CONNECTION: AzureDevOpsConnectionDto = {
  sprintUrl: "",
  wiqlUrl: "",
  workItemsBatchUrl: "",
  username: "",
  hasSavedCredentials: false,
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "An unexpected error occurred.";
}

function formatDate(value: string | null, locale: string): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(locale);
}

export function AzureDevOpsPanel(): JSX.Element {
  const language = useSettingsStore((state) => state.settings?.language ?? "en");
  const isTurkish = language === "tr";
  const [form, setForm] = useState<AzureDevOpsConnectRequestDto>({
    sprintUrl: "",
    wiqlUrl: "",
    workItemsBatchUrl: "",
    username: "",
    password: "",
  });
  const [connection, setConnection] = useState(EMPTY_CONNECTION);
  const [result, setResult] = useState<AzureDevOpsSyncResultDto | null>(null);
  const [phase, setPhase] = useState<"idle" | "testing" | "fetching" | "disconnecting">("idle");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    window.questboard.db.azureDevOps
      .getConnection()
      .then((savedConnection) => {
        if (!active) return;
        setConnection(savedConnection);
        setForm((current) => ({
          ...current,
          sprintUrl: savedConnection.sprintUrl,
          wiqlUrl: savedConnection.wiqlUrl,
          workItemsBatchUrl: savedConnection.workItemsBatchUrl,
          username: savedConnection.username,
        }));
      })
      .catch((loadError: unknown) => {
        if (active) setError(errorMessage(loadError));
      });
    return () => {
      active = false;
    };
  }, []);

  const text = isTurkish
    ? {
        title: "Azure DevOps",
        hint: "Sprint, WIQL ve iş öğesi API adreslerini girerek bağlantıyı yapılandırın.",
        sprintUrl: "Sprint API URL'si",
        sprintPlaceholder:
          "https://dev.azure.com/org/proje/_apis/work/teamsettings/iterations?$timeframe=current&api-version=6.0",
        wiqlUrl: "WIQL API URL'si",
        wiqlPlaceholder: "https://dev.azure.com/org/proje/_apis/wit/wiql?api-version=6.0",
        batchUrl: "Work Items Batch API URL'si",
        batchPlaceholder:
          "https://dev.azure.com/org/proje/_apis/wit/workitemsbatch?api-version=6.0",
        username: "Kullanıcı adı",
        usernamePlaceholder: "Basic Auth kullanıcı adı",
        token: "PAT / Parola",
        tokenSavedPlaceholder: "Kayıtlı kimlik bilgisi kullanılacak",
        tokenPlaceholder: "Personal Access Token veya parola",
        secureHint: "Kimlik bilgileri bu cihazda işletim sistemi şifrelemesiyle saklanır.",
        testConnection: "Bağlantıyı Dene",
        testing: "Bağlantı deneniyor...",
        fetching: "Görevler alınıyor...",
        connectionSucceeded: "Bağlantı başarılı. Görevler alınıyor...",
        synchronize: "Senkronize Et",
        disconnect: "Kimlik bilgilerini sil",
        disconnecting: "Siliniyor...",
        saved: "Kimlik bilgileri güvenli olarak kayıtlı.",
        currentSprint: "Güncel sprint",
        tasks: "Size atanmış görevler",
        noTasks: "Bu sprintte size atanmış görev bulunamadı.",
        updated: "Son güncelleme",
        estimate: "Tamamlanan / tahmin",
        remaining: "Kalan",
        hours: "sa",
      }
    : {
        title: "Azure DevOps",
        hint: "Configure the sprint, WIQL, and work item API URLs to connect.",
        sprintUrl: "Sprint API URL",
        sprintPlaceholder:
          "https://dev.azure.com/org/project/_apis/work/teamsettings/iterations?$timeframe=current&api-version=6.0",
        wiqlUrl: "WIQL API URL",
        wiqlPlaceholder: "https://dev.azure.com/org/project/_apis/wit/wiql?api-version=6.0",
        batchUrl: "Work Items Batch API URL",
        batchPlaceholder:
          "https://dev.azure.com/org/project/_apis/wit/workitemsbatch?api-version=6.0",
        username: "Username",
        usernamePlaceholder: "Basic Auth username",
        token: "PAT / Password",
        tokenSavedPlaceholder: "Saved credential will be used",
        tokenPlaceholder: "Personal Access Token or password",
        secureHint: "Credentials are encrypted with the operating system and stored on this device.",
        testConnection: "Test connection",
        testing: "Testing connection...",
        fetching: "Fetching tasks...",
        connectionSucceeded: "Connection successful. Fetching tasks...",
        synchronize: "Synchronize",
        disconnect: "Forget credentials",
        disconnecting: "Removing...",
        saved: "Credentials are securely saved.",
        currentSprint: "Current sprint",
        tasks: "Tasks assigned to you",
        noTasks: "No tasks assigned to you in this sprint.",
        updated: "Last updated",
        estimate: "Completed / estimate",
        remaining: "Remaining",
        hours: "h",
      };
  const canUseSavedCredentials =
    connection.hasSavedCredentials &&
    form.sprintUrl.trim() === connection.sprintUrl &&
    form.wiqlUrl.trim() === connection.wiqlUrl &&
    form.workItemsBatchUrl.trim() === connection.workItemsBatchUrl &&
    form.username.trim() === connection.username;

  const updateField = (field: keyof AzureDevOpsConnectRequestDto, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const testConnection = async () => {
    setPhase("testing");
    setError("");
    setNotice("");
    setResult(null);
    try {
      const tested = await window.questboard.db.azureDevOps.testConnection(form);
      setConnection(tested.connection);
      const savedProfile = {
        sprintUrl: tested.connection.sprintUrl,
        wiqlUrl: tested.connection.wiqlUrl,
        workItemsBatchUrl: tested.connection.workItemsBatchUrl,
        username: tested.connection.username,
        password: "",
      };
      setForm((current) => ({ ...current, ...savedProfile }));
      setPhase("fetching");
      setNotice(text.connectionSucceeded);
      const data = await window.questboard.db.azureDevOps.synchronize(savedProfile);
      setConnection(data.connection);
      setResult(data);
      setNotice("");
      setForm((current) => ({ ...current, password: "" }));
    } catch (connectError) {
      setError(errorMessage(connectError));
    } finally {
      setPhase("idle");
    }
  };

  const synchronize = async () => {
    setPhase("fetching");
    setError("");
    setNotice("");
    setResult(null);
    try {
      const data = await window.questboard.db.azureDevOps.synchronize(form);
      setConnection(data.connection);
      setResult(data);
      setForm((current) => ({ ...current, password: "" }));
    } catch (syncError) {
      setError(errorMessage(syncError));
    } finally {
      setPhase("idle");
    }
  };

  const disconnect = async () => {
    setPhase("disconnecting");
    setError("");
    setNotice("");
    try {
      await window.questboard.db.azureDevOps.disconnect();
      setConnection({ ...EMPTY_CONNECTION });
      setResult(null);
      setForm((current) => ({ ...current, password: "" }));
    } catch (disconnectError) {
      setError(errorMessage(disconnectError));
    } finally {
      setPhase("idle");
    }
  };

  const loading = phase !== "idle";
  const inputClassName =
    "w-full rounded-lg border border-hud-border bg-hud-bg px-3 py-2 text-sm text-white placeholder:text-white/35 outline-none focus:border-sky-400/60";

  return (
    <section className="rounded-xl border border-hud-border bg-hud-bg p-4 backdrop-blur-hud">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-sky-300/25 bg-sky-400/10 text-sm font-black text-sky-200">
          A
        </div>
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-white/85">{text.title}</h2>
          <p className="mt-1 text-xs text-white/50">{text.hint}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="text-xs font-medium text-white/65">
          {text.sprintUrl}
          <input
            type="url"
            value={form.sprintUrl}
            onChange={(event) => updateField("sprintUrl", event.target.value)}
            placeholder={text.sprintPlaceholder}
            autoComplete="off"
            disabled={loading}
            className={`${inputClassName} mt-1`}
          />
        </label>
        <label className="text-xs font-medium text-white/65">
          {text.wiqlUrl}
          <input
            type="url"
            value={form.wiqlUrl}
            onChange={(event) => updateField("wiqlUrl", event.target.value)}
            placeholder={text.wiqlPlaceholder}
            autoComplete="off"
            disabled={loading}
            className={`${inputClassName} mt-1`}
          />
        </label>
        <label className="text-xs font-medium text-white/65 md:col-span-2">
          {text.batchUrl}
          <input
            type="url"
            value={form.workItemsBatchUrl}
            onChange={(event) => updateField("workItemsBatchUrl", event.target.value)}
            placeholder={text.batchPlaceholder}
            autoComplete="off"
            disabled={loading}
            className={`${inputClassName} mt-1`}
          />
        </label>
        <label className="text-xs font-medium text-white/65">
          {text.username}
          <input
            value={form.username}
            onChange={(event) => updateField("username", event.target.value)}
            placeholder={text.usernamePlaceholder}
            autoComplete="username"
            disabled={loading}
            className={`${inputClassName} mt-1`}
          />
        </label>
        <label className="text-xs font-medium text-white/65">
          {text.token}
          <input
            type="password"
            value={form.password}
            onChange={(event) => updateField("password", event.target.value)}
            placeholder={
              canUseSavedCredentials ? text.tokenSavedPlaceholder : text.tokenPlaceholder
            }
            autoComplete="new-password"
            disabled={loading}
            className={`${inputClassName} mt-1`}
          />
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void testConnection()}
          disabled={
            loading ||
            !form.sprintUrl.trim() ||
            !form.wiqlUrl.trim() ||
            !form.workItemsBatchUrl.trim()
          }
          className="rounded-lg bg-sky-400/90 px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {phase === "testing"
            ? text.testing
            : phase === "fetching"
              ? text.fetching
              : phase === "disconnecting"
                ? text.disconnecting
                : text.testConnection}
        </button>
        {connection.hasSavedCredentials && (
          <button
            type="button"
            onClick={() => void synchronize()}
            disabled={loading || !canUseSavedCredentials}
            className="rounded-lg border border-sky-300/25 bg-sky-400/10 px-4 py-2 text-sm font-semibold text-sky-100 hover:bg-sky-400/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {phase === "fetching" ? text.fetching : text.synchronize}
          </button>
        )}
        {(connection.hasSavedCredentials || error) && (
          <button
            type="button"
            onClick={() => void disconnect()}
            disabled={loading}
            className="rounded-lg border border-hud-border px-3 py-2 text-xs font-semibold text-white/70 hover:bg-white/10 disabled:opacity-50"
          >
            {text.disconnect}
          </button>
        )}
        <span className="text-[11px] text-white/45">{text.secureHint}</span>
      </div>

      {notice && (
        <p role="status" className="mt-3 text-xs text-emerald-200/80">
          {notice}
        </p>
      )}
      {connection.hasSavedCredentials && !result && !notice && (
        <p className="mt-3 text-xs text-emerald-200/80">{text.saved}</p>
      )}
      {error && (
        <p role="alert" className="mt-3 rounded-lg border border-rose-300/20 bg-rose-400/10 px-3 py-2 text-xs text-rose-200">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-4 border-t border-hud-border pt-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-200/75">
                {text.currentSprint}
              </p>
              <h3 className="mt-1 text-base font-semibold text-white">{result.sprint.name}</h3>
              <p className="mt-1 break-all text-xs text-white/45">{result.sprint.path}</p>
              <p className="mt-1 text-xs text-white/55">
                {formatDate(result.sprint.startDate, isTurkish ? "tr-TR" : "en-US")} –{" "}
                {formatDate(result.sprint.finishDate, isTurkish ? "tr-TR" : "en-US")}
              </p>
            </div>
            <div className="rounded-lg border border-sky-300/20 bg-sky-400/10 px-3 py-2 text-sm font-semibold text-sky-100">
              {result.tasks.length} {text.tasks.toLocaleLowerCase(isTurkish ? "tr-TR" : "en-US")}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-white/65">
              {text.tasks}
            </h3>
            <span className="text-[11px] text-white/40">
              {text.updated}: {new Date(result.fetchedAt).toLocaleTimeString(isTurkish ? "tr-TR" : "en-US")}
            </span>
          </div>

          {result.tasks.length === 0 ? (
            <p className="mt-2 rounded-lg border border-hud-border bg-white/[0.03] p-3 text-sm text-white/45">
              {text.noTasks}
            </p>
          ) : (
            <div className="mt-2 flex max-h-80 flex-col gap-2 overflow-y-auto pr-1">
              {result.tasks.map((task) => (
                <article
                  key={task.id}
                  className="rounded-lg border border-hud-border bg-white/[0.035] p-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] text-white/40">#{task.id}</p>
                      <h4 className="mt-0.5 break-words text-sm font-medium text-white/90">
                        {task.title}
                      </h4>
                      {task.assignedTo && (
                        <p className="mt-1 text-xs text-white/45">{task.assignedTo}</p>
                      )}
                    </div>
                    <span className="shrink-0 rounded-full border border-sky-300/20 bg-sky-400/10 px-2 py-0.5 text-[11px] text-sky-100">
                      {task.state}
                    </span>
                  </div>
                  {(task.originalEstimate !== null ||
                    task.remainingWork !== null ||
                    task.completedWork !== null) && (
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-white/50">
                      {task.originalEstimate !== null && (
                        <span>
                          {text.estimate}: {task.completedWork ?? "—"} / {task.originalEstimate} {text.hours}
                        </span>
                      )}
                      {task.remainingWork !== null && (
                        <span>
                          {text.remaining}: {task.remainingWork} {text.hours}
                        </span>
                      )}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
