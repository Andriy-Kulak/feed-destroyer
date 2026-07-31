export {};

const ACTIVITY_MESSAGE_TYPE = "feed-destroyer:activity-pulse";
const ACTIVITY_TOTALS_KEY = "activityByDay";
const ACTIVITY_SESSION_KEY = "activitySession";
const IDLE_DETECTION_SECONDS = 60;
const MAX_PULSE_GAP_MS = 30_000;
const RETENTION_DAYS = 7;

type TrackedSite = "x" | "youtube";

type DailyActivity = Record<TrackedSite, number>;
type ActivityByDay = Record<string, DailyActivity>;

type ActivityPulse = {
  type: typeof ACTIVITY_MESSAGE_TYPE;
  site: TrackedSite;
  active: boolean;
  occurredAt: number;
};

type ActivitySession = {
  tabId: number;
  site: TrackedSite;
  occurredAt: number;
};

let processing = Promise.resolve();

function isActivityPulse(value: unknown): value is ActivityPulse {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<ActivityPulse>;
  return (
    candidate.type === ACTIVITY_MESSAGE_TYPE &&
    (candidate.site === "x" || candidate.site === "youtube") &&
    typeof candidate.active === "boolean" &&
    typeof candidate.occurredAt === "number" &&
    Number.isFinite(candidate.occurredAt)
  );
}

function isActivitySession(value: unknown): value is ActivitySession {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<ActivitySession>;
  return (
    typeof candidate.tabId === "number" &&
    (candidate.site === "x" || candidate.site === "youtube") &&
    typeof candidate.occurredAt === "number" &&
    Number.isFinite(candidate.occurredAt)
  );
}

function normalizeActivityByDay(value: unknown): ActivityByDay {
  if (!value || typeof value !== "object") return {};

  const normalized: ActivityByDay = {};
  for (const [day, totals] of Object.entries(value)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !totals || typeof totals !== "object") {
      continue;
    }

    const candidate = totals as Partial<DailyActivity>;
    normalized[day] = {
      x:
        typeof candidate.x === "number" && Number.isFinite(candidate.x)
          ? Math.max(0, candidate.x)
          : 0,
      youtube:
        typeof candidate.youtube === "number" && Number.isFinite(candidate.youtube)
          ? Math.max(0, candidate.youtube)
          : 0
    };
  }

  return normalized;
}

function toLocalDayKey(timestamp: number): string {
  const date = new Date(timestamp);
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function nextLocalMidnight(timestamp: number): number {
  const date = new Date(timestamp);
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + 1
  ).getTime();
}

function addDuration(
  activityByDay: ActivityByDay,
  site: TrackedSite,
  startedAt: number,
  endedAt: number
): void {
  let cursor = startedAt;

  while (cursor < endedAt) {
    const segmentEnd = Math.min(endedAt, nextLocalMidnight(cursor));
    const day = toLocalDayKey(cursor);
    const totals = activityByDay[day] ?? { x: 0, youtube: 0 };
    totals[site] += segmentEnd - cursor;
    activityByDay[day] = totals;
    cursor = segmentEnd;
  }
}

function retainRecentDays(activityByDay: ActivityByDay): ActivityByDay {
  const recentDays = Object.keys(activityByDay).sort().slice(-RETENTION_DAYS);
  return Object.fromEntries(recentDays.map((day) => [day, activityByDay[day]]));
}

async function readSession(): Promise<ActivitySession | null> {
  const values = await chrome.storage.session.get({ [ACTIVITY_SESSION_KEY]: null });
  const session = values[ACTIVITY_SESSION_KEY];
  return isActivitySession(session) ? session : null;
}

async function saveElapsed(
  session: ActivitySession,
  endedAt: number
): Promise<void> {
  const elapsed = Math.min(
    Math.max(0, endedAt - session.occurredAt),
    MAX_PULSE_GAP_MS
  );
  if (elapsed === 0) return;

  const values = await chrome.storage.local.get({ [ACTIVITY_TOTALS_KEY]: {} });
  const activityByDay = normalizeActivityByDay(values[ACTIVITY_TOTALS_KEY]);
  addDuration(activityByDay, session.site, session.occurredAt, session.occurredAt + elapsed);

  await chrome.storage.local.set({
    [ACTIVITY_TOTALS_KEY]: retainRecentDays(activityByDay)
  });
}

async function stopSession(occurredAt: number): Promise<void> {
  const session = await readSession();
  if (!session) return;

  await saveElapsed(session, occurredAt);
  await chrome.storage.session.remove(ACTIVITY_SESSION_KEY);
}

async function handleActivityPulse(
  pulse: ActivityPulse,
  tabId: number
): Promise<void> {
  const now = Date.now();
  const occurredAt = Math.min(Math.max(pulse.occurredAt, now - MAX_PULSE_GAP_MS), now);
  const machineState = pulse.active
    ? await chrome.idle.queryState(IDLE_DETECTION_SECONDS)
    : "idle";
  const active = pulse.active && machineState === "active";
  const session = await readSession();

  if (session && occurredAt >= session.occurredAt) {
    if (session.tabId === tabId || active) {
      await saveElapsed(session, occurredAt);
    }

    if (session.tabId === tabId || active) {
      await chrome.storage.session.remove(ACTIVITY_SESSION_KEY);
    }
  }

  if (active) {
    await chrome.storage.session.set({
      [ACTIVITY_SESSION_KEY]: {
        tabId,
        site: pulse.site,
        occurredAt
      } satisfies ActivitySession
    });
  }
}

function enqueue(task: () => Promise<void>): Promise<void> {
  processing = processing.then(task, task);
  return processing;
}

chrome.idle.setDetectionInterval(IDLE_DETECTION_SECONDS);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!isActivityPulse(message) || typeof sender.tab?.id !== "number") return;

  void enqueue(() => handleActivityPulse(message, sender.tab!.id!)).then(
    () => sendResponse({ ok: true }),
    () => sendResponse({ ok: false })
  );
  return true;
});

chrome.idle.onStateChanged.addListener((state) => {
  if (state === "active") return;
  void enqueue(() => stopSession(Date.now()));
});
