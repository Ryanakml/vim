import { vi } from "vitest";

export const DEFAULT_TEST_TIME = new Date("2025-01-01T00:00:00.000Z");

export function useFixedTime(value: Date | number = DEFAULT_TEST_TIME) {
  vi.useFakeTimers();
  vi.setSystemTime(value);
}

export function useRealTime() {
  vi.useRealTimers();
}
