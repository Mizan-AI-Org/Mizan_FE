import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Shift } from '@/types/schedule';
import {
  CalendarConfig,
  CalendarShift,
  getUserTimezone,
  getResponsiveConfig,
  calculateShiftPosition,
  getOverlapGroup,
  isOvernightShift,
  getDayBoundaryCrossings,
  formatShiftTime,
  getShiftDurationText
} from '@/utils/calendarUtils';

export interface CalendarState {
  config: CalendarConfig;
  timezone: string;
  containerWidth: number;
  selectedShift: CalendarShift | null;
  hoveredShift: CalendarShift | null;
  showTimezoneInfo: boolean;
}

export interface CalendarActions {
  setSelectedShift: (shift: CalendarShift | null) => void;
  setHoveredShift: (shift: CalendarShift | null) => void;
  setShowTimezoneInfo: (show: boolean) => void;
  updateConfig: (updates: Partial<CalendarConfig>) => void;
  handleShiftClick: (shift: CalendarShift) => void;
  handleShiftHover: (shift: CalendarShift | null) => void;
}

export interface UseCalendarOptions {
  initialTimezone?: string;
  onShiftClick?: (shift: CalendarShift) => void;
  onShiftHover?: (shift: CalendarShift | null) => void;
  enableResponsive?: boolean;
}

export const useCalendar = (
  shifts: Shift[],
  baseDate: Date,
  options: UseCalendarOptions = {}
): {
  state: CalendarState;
  actions: CalendarActions;
  processedShifts: CalendarShift[];
  calendarShifts: CalendarShift[][];
  overnightShifts: CalendarShift[];
  containerRef: React.RefObject<HTMLDivElement>;
} => {
  const {
    initialTimezone,
    onShiftClick,
    onShiftHover,
    enableResponsive = true
  } = options;

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(1024);
  const [selectedShift, setSelectedShift] = useState<CalendarShift | null>(null);
  const [hoveredShift, setHoveredShift] = useState<CalendarShift | null>(null);
  const [showTimezoneInfo, setShowTimezoneInfo] = useState(false);

  // Initialize timezone
  const userTimezone = useMemo(() => {
    const tz = getUserTimezone();
    return initialTimezone || tz.timezone;
  }, [initialTimezone]);

  // Responsive configuration
  const config = useMemo(() => {
    const baseConfig = enableResponsive 
      ? getResponsiveConfig(containerWidth)
      : {
          hourHeight: 80,
          startHour: 0,
          endHour: 24,
          timezone: userTimezone,
          responsive: false
        };
    
    return {
      ...baseConfig,
      timezone: userTimezone
    };
  }, [containerWidth, userTimezone, enableResponsive]);

  // Process shifts with enhanced calculations
  const processedShifts = useMemo(() => {
    const validShifts = shifts.filter(s => {
      const startValid = typeof s.start === 'string' && /^\d{2}:\d{2}$/.test(s.start);
      const endValid = typeof s.end === 'string' && /^\d{2}:\d{2}$/.test(s.end);
      return startValid && endValid;
    });
    return validShifts.map(shift => 
      calculateShiftPosition(shift, baseDate, config, validShifts)
    );
  }, [shifts, baseDate, config]);

  // Group shifts by day for calendar view
  const calendarShifts = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => i);
    return days.map(dayIndex => 
      processedShifts.filter(shift => shift.day === dayIndex)
    );
  }, [processedShifts]);

  // Identify overnight shifts
  const overnightShifts = useMemo(() => {
    return processedShifts.filter(shift => 
      isOvernightShift(shift, baseDate, config.timezone)
    );
  }, [processedShifts, baseDate, config.timezone]);

  // Handle container resize
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Handle shift interactions
  const handleShiftClick = useCallback((shift: CalendarShift) => {
    setSelectedShift(shift);
    onShiftClick?.(shift);
  }, [onShiftClick]);

  const handleShiftHover = useCallback((shift: CalendarShift | null) => {
    setHoveredShift(shift);
    onShiftHover?.(shift);
  }, [onShiftHover]);

  // Update configuration
  const updateConfig = useCallback((updates: Partial<CalendarConfig>) => {
    // This would typically update state, but we're using derived config
    console.log('Config update requested:', updates);
  }, []);

  const state: CalendarState = {
    config,
    timezone: userTimezone,
    containerWidth,
    selectedShift,
    hoveredShift,
    showTimezoneInfo
  };

  const actions: CalendarActions = {
    setSelectedShift,
    setHoveredShift,
    setShowTimezoneInfo,
    updateConfig,
    handleShiftClick,
    handleShiftHover
  };

  return {
    state,
    actions,
    processedShifts,
    calendarShifts,
    overnightShifts,
    containerRef
  };
};

// Utility hooks for specific calendar features
export const useShiftOverlap = (shifts: CalendarShift[]) => {
  return useMemo(() => {
    const overlapMap = new Map<string, number>();
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    shifts.forEach(shift => {
      if (shift.overlapsWith.length > 0) {
        const group = getOverlapGroup(shift, shifts, new Date(), timezone);
        overlapMap.set(shift.id, group.length);
      }
    });
    
    return overlapMap;
  }, [shifts]);
};

export const useShiftTimezone = (shift: CalendarShift) => {
  return useMemo(() => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const startTime = formatShiftTime(shift.displayStart, timezone);
    const endTime = formatShiftTime(shift.displayEnd, timezone);
    const duration = getShiftDurationText(shift.durationHours);
    const isOvernight = isOvernightShift(shift, new Date(), timezone);
    
    return {
      startTime,
      endTime,
      duration,
      isOvernight,
      timezone
    };
  }, [shift]);
};

export const useCalendarKeyboard = (actions: CalendarActions) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Escape':
          actions.setSelectedShift(null);
          actions.setHoveredShift(null);
          break;
        case 'Enter':
          if (actions.setSelectedShift) {
            // Handle enter key on selected shift
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [actions]);
};