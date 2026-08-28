export const VALID_FREQUENCIES = ['daily', 'weekly'] as const
export type MonitorFrequency = (typeof VALID_FREQUENCIES)[number]

const FREQUENCY_MS: Record<MonitorFrequency, number> = {
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
}

export function computeNextRunAt(frequency: string, from: Date = new Date()): Date {
  const interval = FREQUENCY_MS[frequency as MonitorFrequency] ?? FREQUENCY_MS.daily
  return new Date(from.getTime() + interval)
}
