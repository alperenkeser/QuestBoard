import { app, safeStorage } from "electron";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { AzureSprintBoardRepository } from "./repositories/AzureSprintBoardRepository";
import { SettingsRepository } from "./repositories/SettingsRepository";
import { generateId } from "./utils/id";

export interface StoredConnection {
  sprintUrl: string;
  wiqlUrl: string;
  workItemsBatchUrl: string;
  username: string;
  password: string;
}

export interface AzureDevOpsConnectionDto {
  sprintUrl: string;
  wiqlUrl: string;
  workItemsBatchUrl: string;
  username: string;
  hasSavedCredentials: boolean;
}

export interface AzureDevOpsSprintDto {
  id: string;
  name: string;
  path: string;
  startDate: string | null;
  finishDate: string | null;
  timeFrame: "past" | "current" | "future" | "unknown";
}

export interface AzureDevOpsTaskDto {
  id: number;
  title: string;
  state: string;
  assignedTo: string;
  iterationPath: string;
  description: string;
  originalEstimate: number | null;
  remainingWork: number | null;
  completedWork: number | null;
  url: string;
}

export interface AzureDevOpsTestResultDto {
  connection: AzureDevOpsConnectionDto;
  sprints: AzureDevOpsSprintDto[];
  activeSprintId: string | null;
}

export interface AzureDevOpsSyncResultDto {
  connection: AzureDevOpsConnectionDto;
  previewId: string;
  sprints: AzureDevOpsSprintDto[];
  activeSprintId: string | null;
  sprint: AzureDevOpsSprintDto;
  tasks: AzureDevOpsTaskDto[];
  fetchedAt: string;
}

export interface AzureDevOpsImportResultDto {
  board: {
    id: string;
    remoteId: string;
    name: string;
    path: string;
    startDate: string | null;
    finishDate: string | null;
    timeFrame: "past" | "current" | "future" | "unknown";
    lastSyncedDate: string | null;
  };
  importedCount: number;
  boards: ReturnType<typeof getAzureSprintBoards>;
}

const API_VERSION = "6.0";
const MAX_BATCH_SIZE = 200;
const PREVIEW_TTL_MS = 10 * 60 * 1000;
const previews = new Map<
  string,
  { sourceKey: string; sprint: AzureDevOpsSprintDto; tasks: AzureDevOpsTaskDto[]; expiresAt: number }
>();

function sourceKeyFor(connection: StoredConnection): string {
  return createHash("sha256")
    .update(
      [
        connection.sprintUrl,
        connection.wiqlUrl,
        connection.workItemsBatchUrl,
        connection.username,
      ].join("|")
    )
    .digest("hex");
}

function credentialsPath(): string {
  return path.join(app.getPath("userData"), "azure-devops-credentials.bin");
}

function requireEncryption(): void {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error("Secure credential storage is unavailable on this device.");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeApiUrl(value: string, label: string): string {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error(`Enter a valid ${label}.`);
  }
  if (
    url.protocol !== "https:" ||
    !url.hostname ||
    url.username ||
    url.password ||
    url.hash ||
    !url.pathname.toLowerCase().includes("/_apis/")
  ) {
    throw new Error(`${label} must be an HTTPS Azure DevOps API URL without embedded credentials.`);
  }
  if (!url.searchParams.has("api-version")) {
    url.searchParams.set("api-version", API_VERSION);
  }
  return url.toString();
}

function readStoredConnection(): StoredConnection | null {
  const filePath = credentialsPath();
  if (!fs.existsSync(filePath)) return null;
  requireEncryption();

  const encrypted = fs.readFileSync(filePath);
  const parsed: unknown = JSON.parse(safeStorage.decryptString(encrypted));
  if (
    isRecord(parsed) &&
    typeof parsed.sprintUrl === "string" &&
    typeof parsed.wiqlUrl === "string" &&
    typeof parsed.workItemsBatchUrl === "string" &&
    typeof parsed.username === "string" &&
    typeof parsed.password === "string"
  ) {
    return {
      sprintUrl: parsed.sprintUrl,
      wiqlUrl: parsed.wiqlUrl,
      workItemsBatchUrl: parsed.workItemsBatchUrl,
      username: parsed.username,
      password: parsed.password,
    };
  }

  if (
    isRecord(parsed) &&
    typeof parsed.organizationUrl === "string" &&
    typeof parsed.project === "string" &&
    typeof parsed.username === "string" &&
    typeof parsed.password === "string"
  ) {
    let organizationUrl: URL;
    try {
      organizationUrl = new URL(parsed.organizationUrl);
    } catch {
      throw new Error("Saved Azure DevOps credentials are invalid. Forget and reconnect.");
    }
    if (
      organizationUrl.protocol !== "https:" ||
      organizationUrl.username ||
      organizationUrl.password
    ) {
      throw new Error("Saved Azure DevOps credentials are invalid. Forget and reconnect.");
    }
    const projectUrl = `${organizationUrl.toString().replace(/\/+$/, "")}/${encodeURIComponent(parsed.project)}`;
    const migrated: StoredConnection = {
      sprintUrl: normalizeApiUrl(
        `${projectUrl}/_apis/work/teamsettings/iterations?$timeframe=current`,
        "the saved sprint URL"
      ),
      wiqlUrl: normalizeApiUrl(
        `${projectUrl}/_apis/wit/wiql`,
        "the saved WIQL URL"
      ),
      workItemsBatchUrl: normalizeApiUrl(
        `${projectUrl}/_apis/wit/workitemsbatch`,
        "the saved work items batch URL"
      ),
      username: parsed.username,
      password: parsed.password,
    };
    saveConnection(migrated);
    return migrated;
  }

  throw new Error("Saved Azure DevOps credentials are invalid. Forget and reconnect.");
}

function saveConnection(connection: StoredConnection): void {
  requireEncryption();
  const filePath = credentialsPath();
  const temporaryPath = `${filePath}.tmp`;
  fs.writeFileSync(temporaryPath, safeStorage.encryptString(JSON.stringify(connection)));
  fs.renameSync(temporaryPath, filePath);
}

function removeStoredConnection(): void {
  try {
    fs.unlinkSync(credentialsPath());
  } catch (error) {
    if (!isRecord(error) || error.code !== "ENOENT") throw error;
  }
}

function toConnectionDto(connection: StoredConnection | null): AzureDevOpsConnectionDto {
  return connection
    ? {
        sprintUrl: connection.sprintUrl,
        wiqlUrl: connection.wiqlUrl,
        workItemsBatchUrl: connection.workItemsBatchUrl,
        username: connection.username,
        hasSavedCredentials: true,
      }
    : {
        sprintUrl: "",
        wiqlUrl: "",
        workItemsBatchUrl: "",
        username: "",
        hasSavedCredentials: false,
      };
}

export function getAzureDevOpsConnection(): AzureDevOpsConnectionDto {
  return toConnectionDto(readStoredConnection());
}

function readRequest(input: unknown): Omit<StoredConnection, "password"> & { password: string } {
  if (!isRecord(input)) throw new Error("Invalid Azure DevOps connection settings.");
  const sprintUrl =
    typeof input.sprintUrl === "string" ? normalizeApiUrl(input.sprintUrl, "the sprint URL") : "";
  const wiqlUrl =
    typeof input.wiqlUrl === "string" ? normalizeApiUrl(input.wiqlUrl, "the WIQL URL") : "";
  const workItemsBatchUrl =
    typeof input.workItemsBatchUrl === "string"
      ? normalizeApiUrl(input.workItemsBatchUrl, "the work items batch URL")
      : "";
  const origins = new Set(
    [sprintUrl, wiqlUrl, workItemsBatchUrl].map((value) => new URL(value).origin)
  );
  if (origins.size !== 1) {
    throw new Error("All Azure DevOps API URLs must use the same HTTPS host.");
  }
  const username = typeof input.username === "string" ? input.username.trim() : "";
  const password = typeof input.password === "string" ? input.password : "";

  if (sprintUrl.length > 2048 || wiqlUrl.length > 2048 || workItemsBatchUrl.length > 2048) {
    throw new Error("Azure DevOps URLs must be no longer than 2048 characters.");
  }
  if (username.length > 256) throw new Error("The username is too long.");
  if (username.includes(":")) throw new Error("The Basic Auth username cannot contain a colon.");
  if (password.length > 4096) throw new Error("The PAT/password is too long.");

  return { sprintUrl, wiqlUrl, workItemsBatchUrl, username, password };
}

function apiUrl(value: string): URL {
  const url = new URL(value);
  if (!url.searchParams.has("api-version")) {
    url.searchParams.set("api-version", API_VERSION);
  }
  return url;
}

async function requestJson(
  url: URL,
  authorization: string,
  body?: unknown
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        Authorization: authorization,
        Accept: "application/json",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      redirect: "error",
      signal: AbortSignal.timeout(30_000),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Network request failed.";
    throw new Error(`Could not reach Azure DevOps: ${message}`);
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("Azure DevOps rejected the credentials or the account lacks permission.");
    }
    throw new Error(`Azure DevOps returned HTTP ${response.status} ${response.statusText}.`);
  }

  try {
    return await response.json();
  } catch {
    throw new Error("Azure DevOps returned an invalid JSON response.");
  }
}

export function readSprints(value: unknown): AzureDevOpsSprintDto[] {
  if (!isRecord(value) || !Array.isArray(value.value)) {
    throw new Error("Azure DevOps did not return sprint data.");
  }
  return value.value.flatMap((iteration): AzureDevOpsSprintDto[] => {
    if (!isRecord(iteration)) return [];
    const attributes = isRecord(iteration.attributes) ? iteration.attributes : {};
    const name = typeof iteration.name === "string" ? iteration.name : "";
    const sprintPath = typeof iteration.path === "string" ? iteration.path : name;
    const id =
      typeof iteration.id === "string" || typeof iteration.id === "number"
        ? String(iteration.id)
        : sprintPath;
    if (!id || !sprintPath) return [];
    const rawTimeFrame = String(attributes.timeFrame ?? "unknown").toLowerCase();
    const timeFrame = ["past", "current", "future"].includes(rawTimeFrame)
      ? (rawTimeFrame as AzureDevOpsSprintDto["timeFrame"])
      : "unknown";
    const pathSegments = sprintPath.split("\\");

    return [{
      id,
      name: name || pathSegments[pathSegments.length - 1] || sprintPath,
      path: sprintPath,
      startDate: typeof attributes.startDate === "string" ? attributes.startDate : null,
      finishDate: typeof attributes.finishDate === "string" ? attributes.finishDate : null,
      timeFrame,
    }];
  });
}

function readWorkItemIds(value: unknown): number[] {
  if (!isRecord(value) || !Array.isArray(value.workItems)) {
    throw new Error("Azure DevOps did not return work item query results.");
  }
  return [...new Set(
    value.workItems
      .filter(isRecord)
      .map((item) => item.id)
      .filter((id): id is number => typeof id === "number" && Number.isSafeInteger(id) && id > 0)
  )];
}

function readFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function mapWorkItem(value: unknown): AzureDevOpsTaskDto | null {
  if (!isRecord(value) || !isRecord(value.fields)) return null;
  const fields = value.fields;
  const id = typeof value.id === "number" ? value.id : fields["System.Id"];
  if (typeof id !== "number" || !Number.isSafeInteger(id)) return null;
  const assignedTo = fields["System.AssignedTo"];

  return {
    id,
    title: typeof fields["System.Title"] === "string" ? fields["System.Title"] : `Task ${id}`,
    state: typeof fields["System.State"] === "string" ? fields["System.State"] : "Unknown",
    assignedTo: isRecord(assignedTo)
      ? (typeof assignedTo.displayName === "string" ? assignedTo.displayName : "")
      : typeof assignedTo === "string"
        ? assignedTo
        : "",
    iterationPath:
      typeof fields["System.IterationPath"] === "string" ? fields["System.IterationPath"] : "",
    description: typeof fields["System.Description"] === "string" ? fields["System.Description"] : "",
    originalEstimate: readFiniteNumber(fields["Microsoft.VSTS.Scheduling.OriginalEstimate"]),
    remainingWork: readFiniteNumber(fields["Microsoft.VSTS.Scheduling.RemainingWork"]),
    completedWork: readFiniteNumber(fields["Microsoft.VSTS.Scheduling.CompletedWork"]),
    url: typeof value.url === "string" ? value.url : "",
  };
}

async function fetchTasks(
  connection: StoredConnection,
  sprintPath: string,
  authorization: string
): Promise<AzureDevOpsTaskDto[]> {
  const queryUrl = apiUrl(connection.wiqlUrl);
  const escapedSprintPath = sprintPath.replace(/'/g, "''");
  const query = [
    "SELECT [System.Id] FROM WorkItems",
    "WHERE [System.TeamProject] = @Project",
    "AND [System.WorkItemType] = 'Task'",
    `AND [System.IterationPath] = '${escapedSprintPath}'`,
    "AND [System.AssignedTo] = @Me",
    "ORDER BY [System.Id]",
  ].join(" ");
  const ids = readWorkItemIds(await requestJson(queryUrl, authorization, { query }));
  if (ids.length === 0) return [];

  const fields = [
    "System.Id",
    "System.Title",
    "System.State",
    "System.AssignedTo",
    "System.IterationPath",
    "System.Description",
    "Microsoft.VSTS.Scheduling.OriginalEstimate",
    "Microsoft.VSTS.Scheduling.RemainingWork",
    "Microsoft.VSTS.Scheduling.CompletedWork",
  ];
  const tasksById = new Map<number, AzureDevOpsTaskDto>();

  for (let offset = 0; offset < ids.length; offset += MAX_BATCH_SIZE) {
    const batchUrl = apiUrl(connection.workItemsBatchUrl);
    const result = await requestJson(batchUrl, authorization, {
      ids: ids.slice(offset, offset + MAX_BATCH_SIZE),
      fields,
      errorPolicy: "Fail",
    });
    if (!isRecord(result) || !Array.isArray(result.value)) {
      throw new Error("Azure DevOps did not return work item details.");
    }
    for (const item of result.value) {
      const task = mapWorkItem(item);
      if (task) tasksById.set(task.id, task);
    }
  }

  return ids.flatMap((id) => {
    const task = tasksById.get(id);
    return task ? [task] : [];
  });
}

function resolveConnection(input: unknown): StoredConnection {
  const request = readRequest(input);
  requireEncryption();
  const stored = readStoredConnection();
  const matchesSavedConnection =
    stored?.sprintUrl === request.sprintUrl &&
    stored.wiqlUrl === request.wiqlUrl &&
    stored.workItemsBatchUrl === request.workItemsBatchUrl &&
    stored.username === request.username;
  const password = request.password || (matchesSavedConnection ? stored.password : "");
  if (!password) throw new Error("Enter a PAT/password to connect.");

  return { ...request, password };
}

function authorizationFor(connection: StoredConnection): string {
  return `Basic ${Buffer.from(`${connection.username}:${connection.password}`, "utf8").toString("base64")}`;
}

async function fetchSprints(
  connection: StoredConnection,
  authorization: string
): Promise<AzureDevOpsSprintDto[]> {
  const sprintUrl = apiUrl(connection.sprintUrl);
  sprintUrl.searchParams.delete("$timeframe");
  return readSprints(await requestJson(sprintUrl, authorization));
}

export async function testAzureDevOpsConnection(
  input: unknown
): Promise<AzureDevOpsTestResultDto> {
  const connection = resolveConnection(input);
  const sprints = await fetchSprints(connection, authorizationFor(connection));
  saveConnection(connection);
  return {
    connection: toConnectionDto(connection),
    sprints,
    activeSprintId: sprints.find((sprint) => sprint.timeFrame === "current")?.id ?? null,
  };
}

export async function previewAzureDevOpsSprint(
  input: unknown,
  selectedSprintId: unknown
): Promise<AzureDevOpsSyncResultDto> {
  const connection = resolveConnection(input);
  const authorization = authorizationFor(connection);
  if (typeof selectedSprintId !== "string" || !selectedSprintId.trim()) {
    throw new Error("Select a sprint before synchronizing.");
  }
  const sprints = await fetchSprints(connection, authorization);
  const sprint = sprints.find((candidate) => candidate.id === selectedSprintId);
  if (!sprint) throw new Error("The selected sprint is no longer available in Azure DevOps.");
  const tasks = await fetchTasks(connection, sprint.path, authorization);
  saveConnection(connection);
  const now = Date.now();
  for (const [id, preview] of previews) {
    if (preview.expiresAt <= now) previews.delete(id);
  }
  const previewId = randomUUID();
  previews.set(previewId, {
    sourceKey: sourceKeyFor(connection),
    sprint,
    tasks,
    expiresAt: now + PREVIEW_TTL_MS,
  });
  return {
    connection: toConnectionDto(connection),
    previewId,
    sprints,
    activeSprintId: sprints.find((candidate) => candidate.timeFrame === "current")?.id ?? null,
    sprint,
    tasks,
    fetchedAt: new Date(now).toISOString(),
  };
}

export function importAzureDevOpsTasks(previewId: unknown, selectedTaskIds: unknown): AzureDevOpsImportResultDto {
  if (typeof previewId !== "string" || !Array.isArray(selectedTaskIds)) {
    throw new Error("Invalid Azure DevOps import selection.");
  }
  const preview = previews.get(previewId);
  if (!preview || preview.expiresAt <= Date.now()) {
    previews.delete(previewId);
    throw new Error("This Azure task preview has expired. Refresh the sprint before importing.");
  }
  if (
    selectedTaskIds.length === 0 ||
    selectedTaskIds.length > preview.tasks.length ||
    selectedTaskIds.some((id) => typeof id !== "number" || !Number.isSafeInteger(id))
  ) {
    throw new Error("Select at least one valid Azure task to import.");
  }
  const selectedIds = new Set(selectedTaskIds as number[]);
  if (selectedIds.size !== selectedTaskIds.length) {
    throw new Error("The Azure task selection contains duplicates.");
  }
  const tasks = preview.tasks.filter((task) => selectedIds.has(task.id));
  if (tasks.length !== selectedIds.size) {
    throw new Error("The Azure task selection does not match the fetched sprint.");
  }

  const fetchedAt = new Date().toISOString();
  const board = AzureSprintBoardRepository.synchronize({
    sourceKey: preview.sourceKey,
    sprint: preview.sprint,
    tasks,
    columns: SettingsRepository.getBoardColumns(),
    syncedAt: fetchedAt,
    createId: () => generateId("azure-sprint"),
  });
  return {
    board: {
      id: board.id,
      remoteId: board.remoteId,
      name: board.name,
      path: board.path,
      startDate: board.startDate,
      finishDate: board.finishDate,
      timeFrame: board.timeFrame as AzureDevOpsSprintDto["timeFrame"],
      lastSyncedDate: board.lastSyncedDate,
    },
    importedCount: tasks.length,
    boards: getAzureSprintBoards(),
  };
}

export function getAzureSprintBoards() {
  return AzureSprintBoardRepository.getAll().map((board) => ({
    id: board.id,
    remoteId: board.remoteId,
    name: board.name,
    path: board.path,
    startDate: board.startDate,
    finishDate: board.finishDate,
    timeFrame: board.timeFrame as AzureDevOpsSprintDto["timeFrame"],
    lastSyncedDate: board.lastSyncedDate,
  }));
}

export function disconnectAzureDevOps(): void {
  removeStoredConnection();
}
