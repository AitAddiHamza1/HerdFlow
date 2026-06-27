import type { Insemination } from '../types/insemination';
import type { Cow } from '../types/cow';
import { calculateCalvingDetails, getLatestActiveCycle } from './calving';

export interface DynamicReminder {
  cowId: string;
  cowNumber: string;
  cowName?: string;
  message: string;
  daysRemaining: number;
}

/**
 * Scans all user inseminations and cows to generate dynamic warnings for approaching calvings.
 * Generates warning alerts if the remaining days to estimated calving (280 days from latest insemination
 * in the active cycle) is 60, 30, 15, or 7 days.
 */
export function generateNotifications(
  inseminations: Insemination[],
  cows: Cow[],
  currentDate: Date = new Date()
): DynamicReminder[] {
  const reminders: DynamicReminder[] = [];

  // 1. Create a lookup map for cows
  const cowMap = new Map<string, Cow>();
  cows.forEach(cow => cowMap.set(cow.id, cow));

  // 2. Group inseminations by cowId
  const inseminationsByCow: Record<string, Insemination[]> = {};
  inseminations.forEach((rec) => {
    if (!inseminationsByCow[rec.cowId]) {
      inseminationsByCow[rec.cowId] = [];
    }
    inseminationsByCow[rec.cowId].push(rec);
  });

  // 3. For each cow, calculate latest active cycle and calving proximity
  Object.entries(inseminationsByCow).forEach(([cowId, records]) => {
    const cow = cowMap.get(cowId);
    if (!cow) return; // If cow is not loaded yet or deleted

    const activeCycle = getLatestActiveCycle(records);
    if (activeCycle.length === 0) return;

    // Get the latest insemination of this active cycle (sorted chronologically)
    const sortedActive = [...activeCycle].sort((a, b) => a.date.seconds - b.date.seconds);
    const latestInsemination = sortedActive[sortedActive.length - 1];

    const calvingInfo = calculateCalvingDetails(latestInsemination, currentDate);
    if (!calvingInfo) return;

    const { daysRemaining } = calvingInfo;

    // We generate alerts for positive countdowns up to 60 days
    if (daysRemaining >= 0 && daysRemaining <= 60) {
      let level: string;
      if (daysRemaining <= 7) {
        level = '7 days';
      } else if (daysRemaining <= 15) {
        level = '15 days';
      } else if (daysRemaining <= 30) {
        level = '30 days';
      } else {
        level = '60 days';
      }

      const cowDisp = cow.name ? `"${cow.name}" (No. ${cow.number})` : `No. ${cow.number}`;

      reminders.push({
        cowId,
        cowNumber: cow.number,
        cowName: cow.name,
        message: `Cow ${cowDisp} should calve in ${daysRemaining} days (${level} remaining).`,
        daysRemaining
      });
    }
  });

  // 4. Sort by nearest calving date
  return reminders.sort((a, b) => a.daysRemaining - b.daysRemaining);
}
