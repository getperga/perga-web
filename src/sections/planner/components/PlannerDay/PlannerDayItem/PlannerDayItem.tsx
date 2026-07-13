import { useState, useRef, KeyboardEvent, DragEvent, useEffect } from 'react';

import type { PlannerItemStateDTO, PlannerDayItemDTO } from '@api/planner';
import { Dropdown, DropdownItem, DropdownSubmenu } from '@common/components/Dropdown';
import { Icon } from '@common/components/Icon';
import { getNextDay, getNextMonth, getNextWeek } from '@common/utils/date_utils';
import PlannerCalendar from '@planner/components/PlannerCalendar/PlannerCalendar';
import { ITEM_TEXT_MAX_LENGTH } from '@planner/const';

interface DayItemProps {
  item: PlannerDayItemDTO;
  onDragStartItem?: () => void;
  onDragEndItem?: () => void;
  onUpdateItem: (
    itemId: number,
    changes: { text?: string; day?: string; state?: PlannerItemStateDTO },
  ) => void;
  onDeleteItem?: (itemId: number) => void;
  onCopyItem?: (itemId: number, date: Date) => void;
  onSnoozeItem?: (itemId: number, date: Date) => void;
  useCompactActions?: boolean;
}

const PlannerDayItem = ({
  item,
  onDragStartItem,
  onDragEndItem,
  onUpdateItem,
  onDeleteItem,
  onCopyItem,
  onSnoozeItem,
  useCompactActions,
}: DayItemProps) => {
  const itemDate = new Date(item.day);
  const isEmptyItem: boolean = item.id === -1;

  const [isEditing, setIsEditing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [value, setValue] = useState(item.text);
  const inputRef = useRef<HTMLInputElement>(null);

  // prevent race condition on keyDown and blur events on mobiles
  const isSavingRef = useRef(false);

  // focus on input when clicking on item
  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus({ preventScroll: true });
      isSavingRef.current = false;
    }
  }, [isEditing]);

  const onToggleCheckbox = () => {
    let newState: PlannerItemStateDTO;

    if (item.state === 'todo') {
      newState = 'completed';
    } else {
      newState = 'todo';
    }

    onUpdateItem(item.id, { state: newState });
  };

  const predefinedDates: Array<{ label: string; date: Date }> = [
    { label: 'Next day', date: getNextDay(itemDate) },
    { label: 'Next week', date: getNextWeek(itemDate) },
    { label: 'Next month', date: getNextMonth(itemDate) },
  ];

  const handleCopyItem = (day: Date) => {
    onCopyItem?.(item.id, day);
  };

  const handleSnoozeItem = (day: Date) => {
    onSnoozeItem?.(item.id, day);
  };

  const onDropActionClick = () => {
    onUpdateItem(item.id, { state: 'dropped' });
  };

  const onDeleteActionClick = () => {
    onDeleteItem?.(item.id);
  };

  // Close dropdowns when clicking outside
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (isSavingRef.current) {
        return;
      }
      isSavingRef.current = true;

      if (item.id >= 0) {
        setIsEditing(false);
        onUpdateItem(item.id, { text: value });
      } else {
        // For empty item, update but stay in editing mode
        onUpdateItem(item.id, { text: value });
        setValue(''); // Clear the input after adding
        isSavingRef.current = false;
      }
    } else if (e.key === 'Escape') {
      if (item.id >= 0) {
        setIsEditing(false);
        setValue(item.text);
      } else {
        // For empty item, just clear the input
        setValue('');
      }
    }
  };

  const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('text/plain', JSON.stringify(item));
    e.dataTransfer.effectAllowed = 'move';
    setIsDragging(true);
    onDragStartItem?.();
  };

  const handleDragEnd = (e: DragEvent) => {
    setIsDragging(false);
    if (e.target instanceof HTMLElement) {
      e.target.style.opacity = '1';
    }
    onDragEndItem?.();
  };

  const canDrag: boolean = !isEmptyItem;
  const showCheckbox: boolean = !isEmptyItem;
  const showActions: boolean = !isEmptyItem;
  const showExtraActions: boolean = !isEmptyItem;

  return (
    <div
      className={`group flex items-center gap-2 min-h-10 transition-opacity duration-200 hover:bg-bg-hover rounded pl-2
                     ${isDragging ? 'opacity-50' : 'opacity-100'}`}
      draggable={canDrag}
      onDragStart={canDrag ? handleDragStart : undefined}
      onDragEnd={canDrag ? handleDragEnd : undefined}
    >
      {showCheckbox && (
        <div
          onClick={onToggleCheckbox}
          className={`flex-none w-5 h-5 rounded flex items-center justify-center cursor-pointer
                         ${
                           item.state === 'todo'
                             ? 'bg-bg-main border border-border-main'
                             : item.state === 'completed'
                               ? 'bg-bg-green border border-border-green'
                               : 'bg-bg-blue border border-border-blue'
                         }`}
          role="checkbox"
          aria-checked={item.state === 'completed'}
          aria-label={item.state[0].toUpperCase() + item.state.slice(1)}
          title={item.state[0].toUpperCase() + item.state.slice(1)}
        >
          {item.state === 'completed' && (
            <Icon name="checkboxCompleted" size={48} className="h-3 w-3 text-white" />
          )}
          {item.state === 'snoozed' && (
            <Icon name="checkboxSnoozed" size={48} className="h-3 w-3 text-white" />
          )}
          {item.state === 'dropped' && (
            <Icon name="checkboxDropped" size={48} className="h-3 w-3 text-white" />
          )}
        </div>
      )}

      {isEditing || isEmptyItem ? (
        <input
          ref={inputRef}
          type="text"
          value={value}
          maxLength={ITEM_TEXT_MAX_LENGTH}
          onKeyDown={handleKeyDown}
          onChange={(e) => {
            setValue(e.target.value);
            isSavingRef.current = false;
          }}
          onBlur={() => {
            if (isSavingRef.current) {
              return;
            }
            isSavingRef.current = true;

            setIsEditing(false);
            onUpdateItem(item.id, { text: value });
          }}
          className={`min-w-0 flex-1 bg-transparent border-none focus:outline-none focus:ring-0
                        ${isEmptyItem ? 'px-9' : 'px-2'}`}
          placeholder={isEmptyItem ? 'Jot something...' : ''}
        />
      ) : (
        <div
          onClick={() => setIsEditing(true)}
          className={`flex-1 px-2 cursor-text break-all
                         ${item.state === 'todo' ? 'text-text-main' : 'line-through text-text-muted'}`}
        >
          {item.text}
        </div>
      )}

      {showActions && (
        <div className="flex-none relative opacity-100 md:opacity-0 md:group-hover:opacity-100 text-text-main p-2 bg-transparent transition-opacity flex">
          {!useCompactActions && (
            <>
              <Dropdown
                buttonIcon={<Icon name="copy" size={48} className="h-6 w-6" />}
                buttonTitle="Copy"
                className="ml-2"
                dropdownClassName="w-64"
              >
                <PlannerCalendar
                  selectedDate={new Date()}
                  onDateChange={handleCopyItem}
                  title="Copy to"
                  predefinedDates={predefinedDates}
                />
              </Dropdown>

              <Dropdown
                buttonIcon={<Icon name="snooze" size={48} className="h-6 w-6" />}
                buttonTitle="Snooze"
                className="ml-2"
                dropdownClassName="w-64"
              >
                <PlannerCalendar
                  selectedDate={new Date()}
                  onDateChange={handleSnoozeItem}
                  title="Snooze to"
                  predefinedDates={predefinedDates}
                />
              </Dropdown>
            </>
          )}

          {showExtraActions && (
            <Dropdown
              buttonIcon={<Icon name="dots" size={48} className="h-6 w-6" />}
              buttonTitle="Extra actions"
              className="ml-2"
              dropdownClassName={useCompactActions ? 'w-64' : 'w-36'}
            >
              {useCompactActions && (
                <>
                  <DropdownSubmenu
                    label={
                      <>
                        <Icon name="copy" size={48} className="h-4 w-4 mr-2" /> Copy
                      </>
                    }
                  >
                    <PlannerCalendar
                      selectedDate={new Date()}
                      onDateChange={handleCopyItem}
                      title={!useCompactActions ? 'Copy to' : ''}
                      predefinedDates={predefinedDates}
                    />
                  </DropdownSubmenu>

                  <DropdownSubmenu
                    label={
                      <>
                        <Icon name="snooze" size={48} className="h-4 w-4 mr-2" /> Snooze
                      </>
                    }
                  >
                    <PlannerCalendar
                      selectedDate={new Date()}
                      onDateChange={handleSnoozeItem}
                      title={!useCompactActions ? 'Snooze to' : ''}
                      predefinedDates={predefinedDates}
                    />
                  </DropdownSubmenu>
                </>
              )}
              <DropdownItem onClick={onDropActionClick} title="Drop">
                <Icon name="drop" size={48} className="h-4 w-4 mr-2" /> Drop
              </DropdownItem>
              <DropdownItem onClick={onDeleteActionClick} title="Delete">
                <Icon name="trash" size={48} className="h-4 w-4 mr-2" /> Delete
              </DropdownItem>
            </Dropdown>
          )}
        </div>
      )}
    </div>
  );
};

export default PlannerDayItem;
