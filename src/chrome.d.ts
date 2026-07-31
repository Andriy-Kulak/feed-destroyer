type ChromeStorageValue = unknown;

type ChromeStorageChanges = Record<
  string,
  { oldValue?: ChromeStorageValue; newValue?: ChromeStorageValue }
>;

type ChromeMessageSender = {
  tab?: {
    id?: number;
  };
};

declare const chrome: {
  runtime: {
    getURL(path: string): string;
    sendMessage(message: unknown): Promise<unknown>;
    onMessage: {
      addListener(
        callback: (
          message: unknown,
          sender: ChromeMessageSender,
          sendResponse: (response?: unknown) => void
        ) => boolean | void
      ): void;
    };
  };
  storage: {
    local: {
      get(
        defaults: Record<string, ChromeStorageValue>
      ): Promise<Record<string, ChromeStorageValue>>;
      set(values: Record<string, ChromeStorageValue>): Promise<void>;
    };
    session: {
      get(
        defaults: Record<string, ChromeStorageValue>
      ): Promise<Record<string, ChromeStorageValue>>;
      set(values: Record<string, ChromeStorageValue>): Promise<void>;
      remove(key: string): Promise<void>;
    };
    onChanged: {
      addListener(
        callback: (
          changes: ChromeStorageChanges,
          areaName: string
        ) => void
      ): void;
    };
  };
  idle: {
    queryState(detectionIntervalInSeconds: number): Promise<"active" | "idle" | "locked">;
    setDetectionInterval(detectionIntervalInSeconds: number): void;
    onStateChanged: {
      addListener(callback: (state: "active" | "idle" | "locked") => void): void;
    };
  };
};
