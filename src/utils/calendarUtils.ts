import { format, parseISO, isSameDay, addDays, subDays } from 'date-fns';
import { Shift } from '@/types/schedule';

export interface TimezoneInfo {
  timezone: string;
  offset: number;
  isDST: boolean;
}

export interface CalendarShift extends Shift {
  displayStart: Date;
  displayEnd: Date;
  durationHours: number;
  overlapsWith: string[];
  position: {
    top: number;
    height: number;
    left: number;
    width: number;
    zIndex: number;
  };
}

export interface CalendarConfig {
  hourHeight: number;
  startHour: number;
  endHour: number;
  timezone: string;
  responsive: boolean;
}

export const getUserTimezone = (): TimezoneInfo => {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const now = new Date();
  const offset = -now.getTimezoneOffset() / 60;
  const jan = new Date(now.getFullYear(), 0, 1);
  const jul = new Date(now.getFullYear(), 6, 1);
  const isDST = now.getTimezoneOffset() < Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());

  return { timezone, offset, isDST };
};

export const convertToTimezone = (date: Date | string, timezone: string): Date => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const utc = dateObj.getTime() + (dateObj.getTimezoneOffset() * 60000);
  const targetOffset = getTimezoneOffset(timezone, dateObj);
  return new Date(utc + (targetOffset * 60 * 60000));
};

export const getTimezoneOffset = (timezone: string, date: Date): number => {
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  const targetDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
  return (targetDate.getTime() - utcDate.getTime()) / (1000 * 60 * 60);
};

export const parseShiftTime = (shift: Shift, baseDate: Date, timezone: string): { start: Date; end: Date } => {
  // Validate input
  if (!shift.start || !shift.end) {
    throw new Error(`Invalid shift times: start="${shift.start}", end="${shift.end}"`);
  }

  const startParts = shift.start.split(':');
  const endParts = shift.end.split(':');

  if (startParts.length < 2 || endParts.length < 2) {
    throw new Error(`Invalid time format: start="${shift.start}", end="${shift.end}". Expected HH:mm format.`);
  }

  const [startHour, startMinute] = startParts.map(Number);
  const [endHour, endMinute] = endParts.map(Number);

  // Validate parsed values
  if (isNaN(startHour) || isNaN(startMinute) || isNaN(endHour) || isNaN(endMinute)) {
    throw new Error(`Invalid time values: start="${shift.start}", end="${shift.end}"`);
  }

  if (startHour < 0 || startHour > 23 || startMinute < 0 || startMinute > 59 ||
    endHour < 0 || endHour > 23 || endMinute < 0 || endMinute > 59) {
    throw new Error(`Time out of range: start="${shift.start}", end="${shift.end}"`);
  }

  const startDate = new Date(baseDate);
  startDate.setHours(startHour, startMinute, 0, 0);

  let endDate = new Date(baseDate);
  endDate.setHours(endHour, endMinute, 0, 0);

  // Handle overnight shifts
  if (endDate <= startDate) {
    endDate = addDays(endDate, 1);
  }

  // Convert to target timezone
  const displayStart = convertToTimezone(startDate, timezone);
  const displayEnd = convertToTimezone(endDate, timezone);

  return { start: displayStart, end: displayEnd };
};

export const calculateShiftPosition = (
  shift: Shift,
  baseDate: Date,
  config: CalendarConfig,
  allShifts: Shift[]
): CalendarShift => {
  try {
    const { start: displayStart, end: displayEnd } = parseShiftTime(shift, baseDate, config.timezone);
    const durationHours = (displayEnd.getTime() - displayStart.getTime()) / (1000 * 60 * 60);

    // Calculate position within the calendar grid
    const startHour = displayStart.getHours() + displayStart.getMinutes() / 60;
    const endHour = displayEnd.getHours() + displayEnd.getMinutes() / 60;

    const top = (startHour - config.startHour) * config.hourHeight;
    const height = Math.max((durationHours * config.hourHeight), 20); // Minimum 20px height

    // Find overlapping shifts
    const overlapsWith = allShifts
      .filter(other => other.id !== shift.id && shiftsOverlap(shift, other, baseDate, config.timezone))
      .map(other => other.id);

    // Calculate position within overlapping group
    const overlapGroup = getOverlapGroup(shift, allShifts, baseDate, config.timezone);
    const positionInGroup = overlapGroup.findIndex(s => s.id === shift.id);
    const totalInGroup = overlapGroup.length;

    const left = 4 + (positionInGroup * (100 / totalInGroup));
    const width = Math.max(90 / totalInGroup, 30); // Minimum 30px width
    const zIndex = 10 + positionInGroup;

    return {
      ...shift,
      displayStart,
      displayEnd,
      durationHours,
      overlapsWith,
      position: {
        top: Math.max(top, 0),
        height: Math.min(height, (config.endHour - config.startHour) * config.hourHeight - top),
        left,
        width,
        zIndex
      }
    };
  } catch (error) {
    console.error('Error calculating shift position:', error, shift);
    // Return a fallback shift with default values
    return {
      ...shift,
      displayStart: new Date(),
      displayEnd: new Date(),
      durationHours: 0,
      overlapsWith: [],
      position: {
        top: 0,
        height: 20,
        left: 4,
        width: 90,
        zIndex: 1
      }
    };
  }
};

export const shiftsOverlap = (
  shift1: Shift,
  shift2: Shift,
  baseDate: Date,
  timezone: string
): boolean => {
  const { start: start1, end: end1 } = parseShiftTime(shift1, baseDate, timezone);
  const { start: start2, end: end2 } = parseShiftTime(shift2, baseDate, timezone);

  return start1 < end2 && start2 < end1;
};

export const getOverlapGroup = (
  targetShift: Shift,
  allShifts: Shift[],
  baseDate: Date,
  timezone: string
): Shift[] => {
  const group: Shift[] = [targetShift];

  for (const shift of allShifts) {
    if (shift.id === targetShift.id) continue;

    const overlapsWithGroup = group.some(groupShift =>
      shiftsOverlap(shift, groupShift, baseDate, timezone)
    );

    if (overlapsWithGroup) {
      group.push(shift);
    }
  }

  // Sort by start time
  return group.sort((a, b) => {
    const { start: startA } = parseShiftTime(a, baseDate, timezone);
    const { start: startB } = parseShiftTime(b, baseDate, timezone);
    return startA.getTime() - startB.getTime();
  });
};

export const getResponsiveConfig = (containerWidth: number): CalendarConfig => {
  if (containerWidth < 640) {
    return {
      hourHeight: 60,
      startHour: 6,
      endHour: 22,
      timezone: getUserTimezone().timezone,
      responsive: true
    };
  } else if (containerWidth < 1024) {
    return {
      hourHeight: 70,
      startHour: 0,
      endHour: 24,
      timezone: getUserTimezone().timezone,
      responsive: true
    };
  } else {
    return {
      hourHeight: 80,
      startHour: 0,
      endHour: 24,
      timezone: getUserTimezone().timezone,
      responsive: true
    };
  }
};

export const formatShiftTime = (date: Date, timezone: string): string => {
  // Use Intl.DateTimeFormat for timezone-aware formatting
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: timezone
  }).format(date);
};

export const parseShiftToCalendar = (
  shift: Shift,
  baseDate: Date,
  timezone: string,
  config?: CalendarConfig,
  allShifts?: Shift[]
): CalendarShift => {
  const { start, end } = parseShiftTime(shift, baseDate, timezone);
  const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

  // Find overlapping shifts if allShifts is provided
  const overlapsWith = allShifts
    ? allShifts
      .filter(other => other.id !== shift.id && shiftsOverlap(shift, other, baseDate, timezone))
      .map(other => other.id)
    : [];

  // Calculate position if config is provided
  const position = {
    top: 0,
    height: 0,
    left: 0,
    width: 100,
    zIndex: 1
  };

  if (config) {
    const startHour = start.getHours() + start.getMinutes() / 60;
    const endHour = end.getHours() + end.getMinutes() / 60;

    position.top = (startHour - config.startHour) * config.hourHeight;
    position.height = Math.max((durationHours * config.hourHeight), 20);

    // Handle overlapping positioning
    if (allShifts && overlapsWith.length > 0) {
      const overlapGroup = getOverlapGroup(shift, allShifts, baseDate, timezone);
      const groupIndex = overlapGroup.findIndex(s => s.id === shift.id);
      const groupSize = overlapGroup.length;

      position.left = (groupIndex / groupSize) * 80; // 80% max width for overlaps
      position.width = 80 / groupSize;
      position.zIndex = groupIndex + 1;
    }
  }

  return {
    ...shift,
    displayStart: start,
    displayEnd: end,
    durationHours,
    overlapsWith,
    position
  };
};

export const getShiftDurationText = (hours: number): string => {
  if (hours < 1) {
    const minutes = Math.round(hours * 60);
    return `${minutes}m`;
  } else if (hours === 1) {
    return '1h';
  } else if (hours % 1 === 0) {
    return `${hours}h`;
  } else {
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return `${wholeHours}h ${minutes}m`;
  }
};

export const isOvernightShift = (
  shift: Shift | CalendarShift,
  baseDate: Date,
  timezone: string
): boolean => {
  try {
    const maybeCalendar = shift as CalendarShift;
    if (maybeCalendar.displayStart && maybeCalendar.displayEnd) {
      return !isSameDay(maybeCalendar.displayStart, maybeCalendar.displayEnd);
    }
    const { start, end } = parseShiftTime(shift as Shift, baseDate, timezone);
    return !isSameDay(start, end);
  } catch {
    return false;
  }
};

export const getDayBoundaryCrossings = (shift: Shift, baseDate: Date, timezone: string) => {
  const { start, end } = parseShiftTime(shift, baseDate, timezone);
  const crossings = [];

  if (!isSameDay(start, end)) {
    let currentDay = new Date(start);
    currentDay.setHours(0, 0, 0, 0);
    currentDay = addDays(currentDay, 1);

    while (currentDay < end) {
      crossings.push(new Date(currentDay));
      currentDay = addDays(currentDay, 1);
    }
  }

  return crossings;
};