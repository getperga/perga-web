import { useMemo } from 'react';

import { TwoPaneLayout } from '@common/components/TwoPaneLayout';
import { useAuth } from '@common/contexts/auth/useAuth';
import { useIsMobile } from '@common/hooks/useIsMobile';
import { getStartOfWeek } from '@common/utils/date_utils';
import { StorageKeys } from '@common/utils/storage_keys';
import PlannerAgendas from '@planner/components/PlannerAgendas/PlannerAgendas';
import PlannerConfig from '@planner/components/PlannerConfig/PlannerConfig';
import PlannerDateSelector from '@planner/components/PlannerDateSelector/PlannerDateSelector';
import PlannerView from '@planner/components/PlannerView/PlannerView';
import { usePlannerAgendas } from '@planner/hooks/usePlannerAgendas';
import { usePlannerDays } from '@planner/hooks/usePlannerDays';
import { usePlannerViewMode } from '@planner/hooks/usePlannerViewMode';
import { useSelectedDate } from '@planner/hooks/useSelectedDate';

const DEFAULT_LEFT_PANE_WIDTH_PERCENT = 66.6667; // w-2/3
const MIN_LEFT_PANE_WIDTH_PERCENT = 30;
const MAX_LEFT_PANE_WIDTH_PERCENT = 70;

const Planner = () => {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const weekStartDay = user?.week_start_day || 'monday';
  const { viewMode, setViewMode } = usePlannerViewMode();
  const { selectedDate, setSelectedDate } = useSelectedDate();

  const {
    plannerAgendas,
    plannerAgendaItems,
    dragAgendaItem,
    handleDragStartAgendaItem,
    handleDragEndAgendaItem,
    handleReorderAgendaItems,
    handleAddAgendaItem,
    handleUpdateAgendaItem,
    handleDeleteAgendaItem,
    handleCopyAgendaItem,
    handleMoveAgendaItem,
    copyAgendasMap,
    fetchAgendasBySelectedDate,
  } = usePlannerAgendas(selectedDate);

  const startDate = useMemo(
    () => (viewMode === 'daily' ? selectedDate : getStartOfWeek(selectedDate, weekStartDay)),
    [viewMode, selectedDate, weekStartDay],
  );
  const {
    daysItems,
    dragDayItem,
    handleDayItemDragStart,
    handleDayItemDragEnd,
    getItemsForDate,
    handleReorderDayItems,
    handleAddDayItem,
    handleUpdateDayItem,
    handleDeleteDayItem,
    handleCopyDayItem,
    handleSnoozeDayItem,
  } = usePlannerDays(startDate);

  return (
    <TwoPaneLayout
      storageKey={StorageKeys.PlannerLeftPaneWidth}
      defaultLeftWidthPercent={DEFAULT_LEFT_PANE_WIDTH_PERCENT}
      minLeftWidthPercent={MIN_LEFT_PANE_WIDTH_PERCENT}
      maxLeftWidthPercent={MAX_LEFT_PANE_WIDTH_PERCENT}
      leftPane={
        <>
          <div className="flex items-center justify-center relative z-10">
            <div className="p-5 flex items-center gap-3 text-text-main justify-center">
              <PlannerDateSelector
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
                viewMode={viewMode}
              />
            </div>
            <div className="absolute right-5 top-1/2 -translate-y-1/2">
              {!isMobile && <PlannerConfig viewMode={viewMode} onViewModeChange={setViewMode} />}
            </div>
          </div>

          <PlannerView
            viewMode={viewMode}
            selectedDate={selectedDate}
            user={user}
            daysItems={daysItems}
            dragDayItem={dragDayItem}
            handleDayItemDragStart={handleDayItemDragStart}
            handleDayItemDragEnd={handleDayItemDragEnd}
            getItemsForDate={getItemsForDate}
            handleReorderDayItems={handleReorderDayItems}
            handleAddDayItem={handleAddDayItem}
            handleUpdateDayItem={handleUpdateDayItem}
            handleDeleteDayItem={handleDeleteDayItem}
            handleCopyDayItem={handleCopyDayItem}
            handleSnoozeDayItem={handleSnoozeDayItem}
            useCompactActions={isMobile}
          />
        </>
      }
      rightPane={
        <PlannerAgendas
          plannerAgendas={plannerAgendas}
          plannerAgendaItems={plannerAgendaItems}
          dragAgendaItem={dragAgendaItem}
          onDragStartAgendaItem={handleDragStartAgendaItem}
          onDragEndAgendaItem={handleDragEndAgendaItem}
          onReorderAgendaItems={handleReorderAgendaItems}
          onAddAgendaItem={handleAddAgendaItem}
          onUpdateAgendaItem={handleUpdateAgendaItem}
          onDeleteAgendaItem={handleDeleteAgendaItem}
          onCopyAgendaItem={handleCopyAgendaItem}
          onMoveAgendaItem={handleMoveAgendaItem}
          onCopyAgendaItemToDay={(date: Date, text: string) => handleAddDayItem(date, text)}
          selectedDate={selectedDate}
          copyAgendasMap={copyAgendasMap}
          fetchAgendasBySelectedDate={fetchAgendasBySelectedDate}
        />
      }
    />
  );
};

export default Planner;
