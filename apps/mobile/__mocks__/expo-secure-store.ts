const store: Record<string, string> = {};

export const isAvailableAsync = jest.fn(async () => true);

export const getItemAsync = jest.fn(async (key: string): Promise<string | null> => {
  return store[key] ?? null;
});

export const setItemAsync = jest.fn(async (key: string, value: string): Promise<void> => {
  store[key] = value;
});

export const deleteItemAsync = jest.fn(async (key: string): Promise<void> => {
  delete store[key];
});

export function __clearStore(): void {
  for (const k of Object.keys(store)) delete store[k];
}
