declare const chrome: {
  runtime: {
    getURL(path: string): string;
  };
  storage: {
    local: {
      get(defaults: Record<string, string>): Promise<Record<string, string>>;
      set(values: Record<string, string>): Promise<void>;
    };
    onChanged: {
      addListener(
        callback: (changes: Record<string, { oldValue?: string; newValue?: string }>, areaName: string) => void
      ): void;
    };
  };
};
