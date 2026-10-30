// Where saved data lives. Passed into createTeamBuilder so tests use memory and the app uses the browser.
export interface StorageAdapter {
  load(key: string): string | null;
  save(key: string, value: string): void;
}

export class InMemoryStorage implements StorageAdapter {
  private readonly items = new Map<string, string>();
  load(key: string): string | null {
    return this.items.get(key) ?? null;
  }
  save(key: string, value: string): void {
    this.items.set(key, value);
  }
}

export class LocalStorageAdapter implements StorageAdapter {
  constructor(private readonly storage: Storage = window.localStorage) {}
  load(key: string): string | null {
    return this.storage.getItem(key);
  }
  save(key: string, value: string): void {
    this.storage.setItem(key, value);
  }
}
