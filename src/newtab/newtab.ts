export {};

const NEW_TAB_FOCUS_TARGET_KEY = "focusTarget";
const NEW_TAB_ACTIVITY_TOTALS_KEY = "activityByDay";
const NEW_TAB_DEFAULT_FOCUS_TARGET = "10K MRR for my apps";

type TrackedSite = "x" | "youtube";
type DailyActivity = Record<TrackedSite, number>;
type ActivityByDay = Record<string, DailyActivity>;

const dateElement = document.querySelector<HTMLElement>("#todayDate");
const goalInput = document.querySelector<HTMLTextAreaElement>("#goal");
const xTime = document.querySelector<HTMLOutputElement>("#xTime");
const youtubeTime = document.querySelector<HTMLOutputElement>("#youtubeTime");

function toLocalDayKey(date = new Date()): string {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeDailyActivity(value: unknown): DailyActivity {
  if (!value || typeof value !== "object") return { x: 0, youtube: 0 };

  const candidate = value as Partial<DailyActivity>;
  return {
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

function getTodayActivity(value: unknown): DailyActivity {
  if (!value || typeof value !== "object") return { x: 0, youtube: 0 };
  const activityByDay = value as ActivityByDay;
  return normalizeDailyActivity(activityByDay[toLocalDayKey()]);
}

function formatDuration(milliseconds: number): string {
  if (milliseconds <= 0) return "0m";

  const totalMinutes = Math.max(1, Math.floor(milliseconds / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${totalMinutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
}

function renderDate(): void {
  if (!dateElement) return;

  dateElement.textContent = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric"
  }).format(new Date());
}

function renderActivity(value: unknown): void {
  const today = getTodayActivity(value);
  if (xTime) xTime.textContent = formatDuration(today.x);
  if (youtubeTime) youtubeTime.textContent = formatDuration(today.youtube);
}

function resizeGoal(): void {
  if (!goalInput) return;
  goalInput.style.height = "auto";
  goalInput.style.height = `${goalInput.scrollHeight}px`;
}

async function loadNewTab(): Promise<void> {
  const values = await chrome.storage.local.get({
    [NEW_TAB_FOCUS_TARGET_KEY]: NEW_TAB_DEFAULT_FOCUS_TARGET,
    [NEW_TAB_ACTIVITY_TOTALS_KEY]: {}
  });

  if (goalInput) {
    const storedGoal = values[NEW_TAB_FOCUS_TARGET_KEY];
    goalInput.value =
      typeof storedGoal === "string" && storedGoal
        ? storedGoal
        : NEW_TAB_DEFAULT_FOCUS_TARGET;
    resizeGoal();
  }

  renderActivity(values[NEW_TAB_ACTIVITY_TOTALS_KEY]);
}

goalInput?.addEventListener("input", () => {
  resizeGoal();
  void chrome.storage.local.set({
    [NEW_TAB_FOCUS_TARGET_KEY]: goalInput.value.trim()
  });
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") return;

  if (changes[NEW_TAB_ACTIVITY_TOTALS_KEY]) {
    renderActivity(changes[NEW_TAB_ACTIVITY_TOTALS_KEY].newValue);
  }

  if (changes[NEW_TAB_FOCUS_TARGET_KEY] && goalInput !== document.activeElement) {
    const nextGoal = changes[NEW_TAB_FOCUS_TARGET_KEY].newValue;
    goalInput!.value =
      typeof nextGoal === "string" && nextGoal
        ? nextGoal
        : NEW_TAB_DEFAULT_FOCUS_TARGET;
    resizeGoal();
  }
});

renderDate();
window.setInterval(renderDate, 60_000);
void loadNewTab();
