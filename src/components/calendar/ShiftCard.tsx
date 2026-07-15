import React from 'react';
import { CalendarShift } from '@/utils/calendarUtils';
import { formatShiftTime, getShiftDurationText, isOvernightShift } from '@/utils/calendarUtils';
import { Clock, User, Calendar } from 'lucide-react';
import './ShiftCard.css';

export interface ShiftCardProps {
  shift: CalendarShift;
  isSelected: boolean;
  isHovered: boolean;
  onClick: () => void;
  onMouseEnter: (event: React.MouseEvent) => void;
  onMouseLeave: () => void;
  showDetails?: boolean;
  compact?: boolean;
}

/** One distinct color per day of week (Sun=0 … Sat=6) – clearly different hues. */
const DAY_COLORS: Record<number, string> = {
  0: '#dc2626', // Sunday – red
  1: '#ea580c', // Monday – orange
  2: '#65a30d', // Tuesday – lime
  3: '#059669', // Wednesday – emerald
  4: '#0284c7', // Thursday – sky
  5: '#4f46e5', // Friday – indigo
  6: '#7c3aed', // Saturday – violet
};

function getColorForDayOfWeek(shift: CalendarShift): string {
  const dateStr = shift.date;
  if (!dateStr) return DAY_COLORS[1];
  const day = new Date(dateStr + 'T12:00:00').getDay();
  return DAY_COLORS[day] ?? DAY_COLORS[1];
}

const getPositionStyles = (shift: CalendarShift): React.CSSProperties => {
  const color = getColorForDayOfWeek(shift);

  // Overlap handling: calendarUtils.calculateShiftPosition assigns each shift in
  // an overlap group a column — `position.left` is the starting % within the
  // day column and `position.width` is the % width. If width<=0 (no overlap
  // group recorded), fall back to filling the column so older data still renders.
  const hasOverlapLayout =
    typeof shift.position.width === 'number' &&
    shift.position.width > 0 &&
    shift.position.width < 100;

  const leftPct = hasOverlapLayout ? Math.max(0, shift.position.left) : 0;
  const widthPct = hasOverlapLayout
    ? Math.max(12, shift.position.width - 1) // 1% gutter so cards don't touch
    : 100;

  return {
    top: `${shift.position.top}px`,
    height: `${shift.position.height}px`,
    left: `${leftPct}%`,
    width: `${widthPct}%`,
    zIndex: shift.position.zIndex,
    backgroundColor: `${color}18`,
    borderLeftColor: color,
    borderLeftWidth: '4px',
    borderLeftStyle: 'solid',
    // CSS variable consumed by .dark .shift-card override in ShiftCard.css
    '--shift-color': color,
  } as React.CSSProperties;
};

export const ShiftCard: React.FC<ShiftCardProps> = ({
  shift,
  isSelected,
  isHovered,
  onClick,
  onMouseEnter,
  onMouseLeave,
  showDetails = false,
  compact = false
}) => {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  let startTime = 'Invalid';
  let endTime = 'Invalid';
  let duration = 'Unknown';
  let isOvernight = false;

  try {
    startTime = formatShiftTime(shift.displayStart, timezone);
    endTime = formatShiftTime(shift.displayEnd, timezone);
    duration = getShiftDurationText(shift.durationHours);
    isOvernight = isOvernightShift(shift, new Date(), timezone);
  } catch (error) {
    console.error('Error formatting shift times:', error, shift);
  }

  const processCount =
    shift.task_templates_details?.length ?? shift.task_templates?.length ?? 0;
  const customCount = shift.tasks?.length ?? 0;
  const hasProcessTasks = processCount > 0;
  const hasCustomTasks = customCount > 0;

  // Auto-compact when the card is too narrow/short for full content
  const isNarrow = (shift.position.width ?? 100) < 40;
  const isShort = (shift.position.height ?? 0) < 48;
  const useCompact = compact || isNarrow || isShort;
  const useMinimal = (shift.position.width ?? 100) < 20 || (shift.position.height ?? 0) < 28;

  const cardClasses = [
    'shift-card',
    useMinimal ? 'minimal' : useCompact ? 'compact' : 'standard',
    isSelected ? 'selected' : '',
    isHovered ? 'hovered' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const title = shift.title || 'Unnamed Shift';

  if (useMinimal) {
    return (
      <div
        className={cardClasses}
        style={getPositionStyles(shift)}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        role="button"
        tabIndex={0}
        title={`${title} · ${startTime} – ${endTime}`}
        aria-label={`Shift from ${startTime} to ${endTime}`}
      >
        <div className="shift-card-title">{title}</div>
      </div>
    );
  }

  if (useCompact) {
    return (
      <div
        className={cardClasses}
        style={getPositionStyles(shift)}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        role="button"
        tabIndex={0}
        title={`${title} · ${startTime} – ${endTime}`}
        aria-label={`Shift from ${startTime} to ${endTime}`}
      >
        <div className="shift-card-title">{title}</div>
        <div className="shift-card-time">
          {startTime} – {endTime}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cardClasses}
      style={getPositionStyles(shift)}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      role="button"
      tabIndex={0}
      aria-label={`Shift from ${startTime} to ${endTime}, duration ${duration}`}
    >
      <div className="flex items-start justify-between gap-1 mb-1 min-w-0">
        <div className="shift-card-title">{title}</div>
        {isOvernight && (
          <span className="text-[10px] text-gray-500 dark:text-gray-400 flex-shrink-0">
            Overnight
          </span>
        )}
      </div>

      <div className="space-y-1 min-w-0">
        <div className="shift-card-time flex items-center gap-1">
          <Clock className="w-3 h-3 flex-shrink-0 opacity-70" />
          <span className="truncate">
            {startTime} – {endTime}
          </span>
        </div>

        {(hasProcessTasks || hasCustomTasks) && (
          <div className="flex items-center gap-1.5 mt-1 flex-wrap min-w-0">
            {hasProcessTasks && (
              <span className="truncate rounded-full bg-emerald-100 dark:bg-emerald-900/40 px-1.5 py-0.5 text-[10px] font-medium text-gray-700 dark:text-emerald-300">
                {processCount} process
              </span>
            )}
            {hasCustomTasks && (
              <span className="truncate rounded-full bg-sky-100 dark:bg-sky-900/40 px-1.5 py-0.5 text-[10px] font-medium text-gray-700 dark:text-sky-300">
                {customCount} task{customCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}

        {shift.staff_members_details && shift.staff_members_details.length > 0 && (
          <div className="flex items-center gap-0.5 overflow-hidden mt-1">
            {shift.staff_members_details.slice(0, 3).map((staff) => (
              <div
                key={staff.id}
                className="h-5 w-5 rounded-full bg-[#0d5c3e] flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0 ring-1 ring-white dark:ring-slate-800"
                title={`${staff.first_name} ${staff.last_name}`}
              >
                {(staff.first_name?.[0] ?? '') + (staff.last_name?.[0] ?? '') || '?'}
              </div>
            ))}
            {shift.staff_members_details.length > 3 && (
              <div
                className="h-5 w-5 rounded-full bg-[#0d5c3e]/90 flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0 ring-1 ring-white dark:ring-slate-800"
                title={`${shift.staff_members_details.length - 3} more staff`}
              >
                +{shift.staff_members_details.length - 3}
              </div>
            )}
          </div>
        )}
      </div>

      {showDetails && (
        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-slate-700 text-xs text-gray-500 dark:text-gray-400">
          <div>Timezone: {timezone}</div>
          <div>Day: {shift.day}</div>
          <div>Date: {shift.date}</div>
        </div>
      )}
    </div>
  );
};

export interface ShiftTooltipProps {
  shift: CalendarShift;
  position: { x: number; y: number };
  visible: boolean;
}

export const ShiftTooltip: React.FC<ShiftTooltipProps> = ({ shift, position, visible }) => {
  if (!visible) return null;

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const startTime = formatShiftTime(shift.displayStart, timezone);
  const endTime = formatShiftTime(shift.displayEnd, timezone);
  const duration = getShiftDurationText(shift.durationHours);
  const isOvernight = isOvernightShift(shift, new Date(), timezone);

  return (
    <div
      className="shift-tooltip"
      style={{
        left: `${position.x + 10}px`,
        top: `${position.y - 10}px`,
        zIndex: 1000
      }}
    >
      <div className="shift-tooltip-title">{shift.title || 'Unnamed Shift'}</div>

      <div className="shift-tooltip-content">
        <div className="shift-tooltip-item">
          <Clock className="shift-tooltip-icon" />
          <span>{startTime} - {endTime}</span>
        </div>

        <div className="shift-tooltip-item">
          <Calendar className="shift-tooltip-icon" />
          <span>{duration}</span>
        </div>

        {isOvernight && (
          <div className="shift-tooltip-item text-yellow-300">
            <Calendar className="shift-tooltip-icon" />
            <span>Overnight shift</span>
          </div>
        )}

        {shift.staff_members_details && shift.staff_members_details.length > 0 && (
          <div className="shift-tooltip-item flex flex-wrap gap-1 mt-2">
            {shift.staff_members_details.map((staff) => (
              <div key={staff.id} className="flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-full text-[10px]">
                <User className="w-3 h-3" />
                <span>{staff.first_name} {staff.last_name}</span>
              </div>
            ))}
          </div>
        )}

        {shift.tasks && shift.tasks.length > 0 && (
          <div className="shift-tooltip-item">
            <div className="w-4 h-4 mr-2 rounded-full bg-blue-500 flex items-center justify-center text-xs">
              {shift.tasks.length}
            </div>
            <span>{shift.tasks.length} task{shift.tasks.length !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export interface TimezoneIndicatorProps {
  timezone: string;
  isDST: boolean;
  offset: number;
  className?: string;
}

export const TimezoneIndicator: React.FC<TimezoneIndicatorProps> = ({
  timezone,
  isDST,
  offset,
  className = ''
}) => {
  const offsetText = offset >= 0 ? `UTC+${offset}` : `UTC${offset}`;
  const dstText = isDST ? ' (DST)' : '';

  return (
    <div className={`timezone-indicator ${className}`}>
      <Clock className="timezone-indicator-icon" />
      <span>{timezone} {offsetText}{dstText}</span>
    </div>
  );
};
