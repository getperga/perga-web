import React, { useMemo } from 'react';

import { Dropdown } from '@common/components/Dropdown';
import { Icon } from '@common/components/Icon';
import { useAuth } from '@common/contexts/auth/useAuth';
import {
  formatDateForDisplay,
  formatDateWeekDayShort,
  getNextDay,
  getPrevDay,
  isSameDay,
  getStartOfWeek,
  getEndOfWeek,
  getNextWeek,
  getPrevWeek,
  formatWeekRange,
} from '@common/utils/date_utils';
import PlannerCalendar from '@planner/components/PlannerCalendar/PlannerCalendar';
import { DATE_SELECTOR_DAYS_COUNT } from '@planner/const';
import { PlannerViewMode } from '@planner/types';

interface DateSelectorProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  viewMode: PlannerViewMode;
}

const PlannerDateSelector: React.FC<DateSelectorProps> = ({
  selectedDate,
  onDateChange,
  viewMode,
}) => {
  const { user } = useAuth();
  const weekStartDay = user?.week_start_day || 'monday';

  const datesList = useMemo(() => {
    const count = Math.max(1, DATE_SELECTOR_DAYS_COUNT);
    const dates: Date[] = [];

    const start = new Date(selectedDate);
    start.setDate(start.getDate() - 1);
    for (let i = 0; i < count; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, [selectedDate]);

  const handlePickDate = (date: Date) => {
    let newDate = date;
    if (user?.merge_weekends && date.getDay() === 0) {
      newDate = new Date(date);
      newDate.setDate(date.getDate() - 1);
    }
    onDateChange(newDate);
  };

  const handlePrevClick = () => {
    if (viewMode === 'daily') {
      onDateChange(getPrevDay(selectedDate));
    } else {
      const prevWeek = getPrevWeek(selectedDate);
      onDateChange(getStartOfWeek(prevWeek, weekStartDay));
    }
  };
  const handleNextClick = () => {
    if (viewMode === 'daily') {
      onDateChange(getNextDay(selectedDate));
    } else {
      const nextWeek = getNextWeek(selectedDate);
      onDateChange(getStartOfWeek(nextWeek, weekStartDay));
    }
  };

  const weekRangeTitle = useMemo(() => {
    const start = getStartOfWeek(selectedDate, weekStartDay);
    const end = getEndOfWeek(selectedDate, weekStartDay);
    return formatWeekRange(start, end);
  }, [selectedDate, weekStartDay]);

  return (
    <>
      {/* Left arrow */}
      <button
        onClick={handlePrevClick}
        className="mt-1 text-text-muted hover:text-text-main transition-colors"
        aria-label={viewMode === 'daily' ? 'Previous day' : 'Previous week'}
        title={viewMode === 'daily' ? 'Previous day' : 'Previous week'}
      >
        <div className="transform rotate-180">
          <Icon name="rightChevron" size={20} />
        </div>
      </button>

      {/* Dates or Week Title */}
      {viewMode === 'daily' ? (
        <div className="flex items-center justify-center gap-2">
          {datesList.map((date) => {
            const isSelected = isSameDay(date, selectedDate);
            const dayLabel = formatDateWeekDayShort(date);
            const dateLabel = date.getDate();
            const selectedColor = isSelected ? 'text-text-main' : 'text-text-muted';

            return (
              <button
                key={date.toLocaleDateString()}
                onClick={() => {
                  let dateToSet = date;
                  if (user?.merge_weekends && date.getDay() === 0) {
                    // show saturday items as weekend items
                    dateToSet = new Date(date);
                    dateToSet.setDate(date.getDate() - 1);
                  }

                  if (!isSameDay(dateToSet, selectedDate)) {
                    onDateChange(dateToSet);
                  }
                }}
                className={`flex flex-col items-center justify-center h-12 w-10
                     ${selectedColor} hover:text-text-main transition-colors`}
                aria-current={isSelected ? 'date' : undefined}
                title={formatDateForDisplay(date)}
              >
                <span className={`text-2xs md:text-xs ${isSelected ? 'font-semibold' : ''}`}>
                  {dayLabel}
                </span>
                <div className="flex items-center gap-1">
                  <span
                    className={`text-base md:text-lg leading-none ${isSelected ? 'font-semibold' : ''}`}
                  >
                    {dateLabel}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex items-center justify-center py-2">
          <span className="text-base md:text-lg text-text-main mt-1">{weekRangeTitle}</span>
        </div>
      )}

      <Dropdown
        buttonIcon={<Icon name="planner" size={20} fill="currentColor" />}
        buttonTitle="Open calendar"
        className="mt-2 mx-1 text-text-muted hover:text-text-main transition-colors"
      >
        <PlannerCalendar
          selectedDate={selectedDate}
          onDateChange={handlePickDate}
          predefinedDates={[{ label: 'Today', date: new Date() }]}
        />
      </Dropdown>

      <button
        onClick={handleNextClick}
        className="mt-1 text-text-muted hover:text-text-main transition-colors"
        aria-label={viewMode === 'daily' ? 'Next day' : 'Next week'}
        title={viewMode === 'daily' ? 'Next day' : 'Next week'}
      >
        <Icon name="rightChevron" size={20} />
      </button>
    </>
  );
};

export default PlannerDateSelector;
