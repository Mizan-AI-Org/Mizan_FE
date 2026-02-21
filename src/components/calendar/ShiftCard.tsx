import React from 'react';
import { CalendarShift } from '@/utils/calendarUtils';
import { formatShiftTime, getShiftDurationText, isOvernightShift } from '@/utils/calendarUtils';
import { Badge } from '@/components/ui/badge';
import { Clock, User, MapPin, Calendar } from 'lucide-react';
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
  return {
    top: `${shift.position.top}px`,
    height: `${shift.position.height}px`,
    left: `0%`,
    width: `100%`,
    zIndex: shift.position.zIndex,
    backgroundColor: `${color}18`,
    borderLeftColor: color,
    borderLeftWidth: '4px',
    borderLeftStyle: 'solid',
  };
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

  // Add error handling for invalid dates
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
  const hasTasks = hasProcessTasks || hasCustomTasks;

  const cardClasses = `
    shift-card
    ${isSelected ? 'selected' : ''}
    ${isHovered ? 'hovered' : ''}
    ${compact ? 'compact' : 'standard'}
    ${isSelected ? 'ring-2 ring-blue-500 shadow-lg' : ''}
    ${isHovered ? 'shadow-md transform scale-[1.02]' : ''}
    hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500
  `;

  if (compact) {
    return (
      <div
        className={cardClasses}
        style={getPositionStyles(shift)}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        role="button"
        tabIndex={0}
        aria-label={`Shift from ${startTime} to ${endTime}`}
      >
        <div className="flex items-center justify-between gap-1">
          <div className="font-medium truncate">
            {shift.title || 'Unnamed Shift'}
          </div>
          {isOvernight && (
            <Badge variant="outline" className="text-[10px] flex-shrink-0">
              Overnight
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-600 flex-wrap">
          <span>{startTime} - {endTime}</span>
          {hasProcessTasks && (
            <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-700">
              {processCount} process & tasks
            </span>
          )}
          {hasCustomTasks && (
            <span className="rounded-full bg-sky-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-700">
              {customCount} custom tasks
            </span>
          )}
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
      <div className="flex items-start justify-between mb-1">
        <div className="font-medium text-gray-900 truncate flex-1">
          {shift.title || 'Unnamed Shift'}
        </div>
        {isOvernight && (
          <Badge variant="outline" className="text-[10px] ml-1 flex-shrink-0">
            <Calendar className="w-3 h-3 mr-1" />
            Overnight
          </Badge>
        )}
      </div>

      <div className="space-y-1">
        <div className="flex items-center text-xs text-gray-600">
          <Clock className="w-3 h-3 mr-1 flex-shrink-0" />
          <span className="truncate">
            {startTime} - {endTime}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {hasProcessTasks && (
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-gray-700">
              {processCount} process & task{processCount !== 1 ? 's' : ''}
            </span>
          )}
          {hasCustomTasks && (
            <span className="inline-flex items-center rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-medium text-gray-700">
              {customCount} custom task{customCount !== 1 ? 's' : ''}
            </span>
          )}
          {shift.staff_members_details && shift.staff_members_details.length > 0 && (
            <div className="flex items-center gap-0.5 overflow-hidden">
              {shift.staff_members_details.slice(0, 3).map((staff) => (
                <div
                  key={staff.id}
                  className="h-5 w-5 rounded-full bg-[#0d5c3e] flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0 ring-1 ring-white"
                  title={`${staff.first_name} ${staff.last_name}`}
                >
                  {(staff.first_name?.[0] ?? '') + (staff.last_name?.[0] ?? '') || '?'}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showDetails && (
        <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500">
          <div>Timezone: {timezone}</div>
          <div>Day: {shift.day}</div>
          <div>Date: {shift.date}</div>
          {shift.color && <div>Color: {shift.color}</div>}
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

      <div className="shift-tooltip-footer">
        Timezone: {timezone}
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