import type { Insemination } from '../types/insemination';

/**
 * Parses and splits insemination records into historical reproductive cycles.
 * A new cycle begins if the gap between two chronological inseminations is greater than 243 days (8 months).
 */
export function calculateReproductiveCycles(inseminations: Insemination[]): Insemination[][] {
  if (!inseminations || inseminations.length === 0) {
    return [];
  }

  // 1. Sort records by date in ascending order (chronological order)
  const sorted = [...inseminations].sort((a, b) => a.date.seconds - b.date.seconds);

  const cycles: Insemination[][] = [];
  let currentCycle: Insemination[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const current = sorted[i];

    // Gap in seconds between previous and current insemination
    const gapSeconds = current.date.seconds - prev.date.seconds;
    const gapDays = gapSeconds / (24 * 3600);

    if (gapDays > 243) {
      // Gap > 8 months -> Assume cow has calved and a new cycle is started
      cycles.push(currentCycle);
      currentCycle = [current];
    } else {
      // Gap <= 8 months -> Same reproductive cycle, previous failed
      currentCycle.push(current);
    }
  }

  if (currentCycle.length > 0) {
    cycles.push(currentCycle);
  }

  return cycles;
}

/**
 * Calculates dynamic 1-indexed order numbers for all inseminations.
 * Order resets to 1 whenever a new cycle starts.
 * Returns a map of inseminationId -> orderNumber
 */
export function calculateDynamicOrderNumbers(inseminations: Insemination[]): Record<string, number> {
  const cycles = calculateReproductiveCycles(inseminations);
  const orderMap: Record<string, number> = {};

  cycles.forEach((cycle) => {
    // Within each cycle, inseminations are sorted chronologically
    // Assign order 1, 2, 3, etc.
    cycle.forEach((record, index) => {
      orderMap[record.id] = index + 1;
    });
  });

  return orderMap;
}

/**
 * Returns the latest reproductive cycle for a cow.
 */
export function getLatestActiveCycle(inseminations: Insemination[]): Insemination[] {
  const cycles = calculateReproductiveCycles(inseminations);
  if (cycles.length === 0) return [];
  // Since sorted was ascending, the last cycle is the latest active one
  return cycles[cycles.length - 1];
}

/**
 * Given the latest insemination of the active cycle, calculates expected calving date
 * and remaining days relative to the current local date.
 */
export interface CalvingDetails {
  expectedCalvingDate: Date;
  daysRemaining: number;
}

export function calculateCalvingDetails(
  latestInsemination: Insemination | undefined,
  currentDate: Date = new Date()
): CalvingDetails | null {
  if (!latestInsemination) {
    return null;
  }

  // Expected pregnancy duration: 280 days
  const inseminationDate = latestInsemination.date.toDate();
  
  const expectedCalvingDate = new Date(inseminationDate.getTime());
  expectedCalvingDate.setDate(expectedCalvingDate.getDate() + 280);

  // Compute days remaining
  // Clear time components of both dates to focus purely on days count
  const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
  const end = new Date(expectedCalvingDate.getFullYear(), expectedCalvingDate.getMonth(), expectedCalvingDate.getDate());
  
  const diffTime = end.getTime() - start.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return {
    expectedCalvingDate,
    daysRemaining
  };
}
