// utils/recurrence.ts
export function isoToDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
export function dateToIso(date: Date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addIntervalIso(
  dateIso: string,
  repeating: string,
  interval = 1
) {
  const d = isoToDate(dateIso);
  let next: Date;
  switch (repeating) {
    case "Weekly":
      next = new Date(d.getTime() + 7 * 24 * 60 * 60 * 1000 * interval);
      break;
    case "BiWeekly":
      next = new Date(d.getTime() + 14 * 24 * 60 * 60 * 1000 * interval);
      break;
    case "Monthly": {
      const year = d.getUTCFullYear();
      const month = d.getUTCMonth();
      const day = d.getUTCDate();
      const targetMonth = month + interval;
      const tentative = new Date(Date.UTC(year, targetMonth, day));
      // if tentative wrapped into next month, fallback to last day of target month
      if (tentative.getUTCMonth() !== ((targetMonth % 12) + 12) % 12) {
        const lastDay = new Date(Date.UTC(year, targetMonth + 1, 0));
        next = new Date(
          Date.UTC(
            lastDay.getUTCFullYear(),
            lastDay.getUTCMonth(),
            lastDay.getUTCDate()
          )
        );
      } else {
        next = tentative;
      }
      break;
    }
    case "Yearly":
      next = new Date(
        Date.UTC(d.getUTCFullYear() + interval, d.getUTCMonth(), d.getUTCDate())
      );
      break;
    default:
      throw new Error("Unknown repeating type");
  }
  return dateToIso(next);
}

export function generateOccurrencesIso({
  startDateIso,
  repeating,
  interval = 1,
  maxCount = 12,
  untilIso,
}: {
  startDateIso: string;
  repeating: string;
  interval?: number;
  maxCount?: number;
  untilIso?: string;
}) {
  const occurrences: string[] = [];
  let cursor = startDateIso;
  for (let i = 0; i < maxCount; i++) {
    if (untilIso && cursor > untilIso) break;
    occurrences.push(cursor);
    cursor = addIntervalIso(cursor, repeating, interval);
  }
  return occurrences;
}
