type ChromeStorageValue = string | boolean;

declare const chrome: {
  runtime: {
    getURL(path: string): string;
  };
  storage: {
    local: {
      get(
        defaults: Record<string, ChromeStorageValue>
      ): Promise<Record<string, ChromeStorageValue>>;
      set(values: Record<string, ChromeStorageValue>): Promise<void>;
    };
    onChanged: {
      addListener(
        callback: (
          changes: Record<
            string,
            { oldValue?: ChromeStorageValue; newValue?: ChromeStorageValue }
          >,
          areaName: string
        ) => void
      ): void;
    };
  };
};
