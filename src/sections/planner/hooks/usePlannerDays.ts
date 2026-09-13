import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

import type { PlannerItemStateDTO, PlannerDayItemDTO } from '@api/planner';
import {
  getItemsByRange,
  createPlannerDayItem,
  updatePlannerDayItem,
  deletePlannerDayItem,
  reorderPlannerDayItems,
  copyPlannerDayItem,
  snoozePlannerDayItem,
} from '@api/planner';
import { useAuth } from '@common/contexts/auth/useAuth';
import { useToast } from '@common/contexts/toast/useToast';
import { REFRESH_EVENT } from '@common/events';
import { formatDateForAPI, getNextDay } from '@common/utils/date_utils';
import { TtlCache } from '@common/utils/ttl_cache';
import { PLANNER_DAYS_COUNT } from '@planner/const';

const plannerDaysCache = new TtlCache<PlannerDayItemDTO[]>();

export const clearPlannerDaysCache = () => plannerDaysCache.clear();

export const usePlannerDays = (selectedDate: Date) => {
  const { user } = useAuth();
  const selectedDateStr = formatDateForAPI(selectedDate);
  const cacheKey = useMemo(
    () => `${user?.email}:${selectedDateStr}:${PLANNER_DAYS_COUNT}`,
    [selectedDateStr, user?.email],
  );
  const [daysItems, setDaysItems] = useState<PlannerDayItemDTO[]>(
    () => plannerDaysCache.get(cacheKey) ?? [],
  );
  const [isDaysRefreshing, setIsDaysRefreshing] = useState(false);
  const [dragDayItem, setDragDayItem] = useState<PlannerDayItemDTO | null>(null);
  const daysAbortControllerRef = useRef<AbortController | null>(null);

  // Lock to prevent multiple updates for the same item
  const updatingItemsRef = useRef<Set<number>>(new Set());
  const { showError } = useToast();

  // Reorder management refs (for optimistic reorder + single API request)
  const currentItemsOrder = useRef<number[] | null>(null);
  const updatedItemsOrder = useRef<number[] | null>(null);

  const setDaysItemsAndCache = useCallback(
    (
      updater: PlannerDayItemDTO[] | ((currentItems: PlannerDayItemDTO[]) => PlannerDayItemDTO[]),
      invalidateOtherRanges = false,
    ) => {
      setDaysItems((currentItems) => {
        const nextItems = typeof updater === 'function' ? updater(currentItems) : updater;
        if (invalidateOtherRanges) {
          plannerDaysCache.deleteAllExcept(cacheKey);
        }
        plannerDaysCache.set(cacheKey, nextItems);
        return nextItems;
      });
    },
    [cacheKey],
  );

  // Fetch items for PLANNER_DAYS_COUNT days starting from selected date
  const fetchDaysItems = useCallback(async () => {
    daysAbortControllerRef.current?.abort();

    const requestController = new AbortController();
    daysAbortControllerRef.current = requestController;
    setIsDaysRefreshing(true);

    try {
      const response = await getItemsByRange(
        selectedDateStr,
        PLANNER_DAYS_COUNT,
        requestController.signal,
      );

      const combinedItems: PlannerDayItemDTO[] = [];
      Object.values(response.data).forEach((items) => {
        combinedItems.push(...items);
      });

      setDaysItemsAndCache(combinedItems);
    } catch (error) {
      if (!requestController.signal.aborted) {
        console.error('Error fetching all days:', error);
      }
    } finally {
      if (daysAbortControllerRef.current === requestController) {
        setIsDaysRefreshing(false);
      }
    }
  }, [selectedDateStr, setDaysItemsAndCache]);

  const handleAddDayItem = async (date: Date, itemText: string) => {
    if (!itemText.trim()) {
      return;
    }

    try {
      const response = await createPlannerDayItem({
        text: itemText,
        day: formatDateForAPI(date),
      });
      setDaysItemsAndCache((currentItems) => [...currentItems, response.data], true);
    } catch (error) {
      console.error('Error adding day item:', error);
    }
  };

  const handleDeleteDayItem = async (id: number) => {
    try {
      await deletePlannerDayItem(id);
      setDaysItemsAndCache((currentItems) => currentItems.filter((item) => item.id !== id), true);
    } catch (error) {
      console.error('Error deleting day item:', error);
    }
  };

  const handleUpdateDayItem = async (
    itemId: number,
    changes: { text?: string; day?: string; state?: PlannerItemStateDTO },
  ) => {
    // prevent multiple execution for the same item and empty text
    if (updatingItemsRef.current.has(itemId) || changes.text?.trim() === '') {
      return;
    }
    updatingItemsRef.current.add(itemId);

    // use optimistic update for better ui interactivity
    const prev = [...daysItems];
    const prevItem = prev.find((item) => item.id === itemId);
    const optimisticItem = { ...prevItem, ...changes } as PlannerDayItemDTO;
    setDaysItemsAndCache(
      (currentItems) => currentItems.map((item) => (item.id === itemId ? optimisticItem : item)),
      true,
    );

    try {
      const response = await updatePlannerDayItem(itemId, changes);
      setDaysItemsAndCache(
        (currentItems) => currentItems.map((item) => (item.id === itemId ? response.data : item)),
        true,
      );
    } catch (error) {
      console.error('Error updating day item:', error);
      setDaysItemsAndCache(prev, true); // restoring previous state
      showError('Failed to update item, please try again');
    } finally {
      updatingItemsRef.current.delete(itemId);
    }
  };

  const handleCopyDayItem = async (itemId: number, day: Date) => {
    try {
      const response = await copyPlannerDayItem(itemId, formatDateForAPI(day));

      // Add the new item to the current state if its date is currently shown
      const isDateVisible = Array.from({ length: PLANNER_DAYS_COUNT }).some((_, index) => {
        const plannerDay = new Date(selectedDate);
        plannerDay.setDate(plannerDay.getDate() + index);
        return formatDateForAPI(plannerDay) === response.data.day;
      });

      if (isDateVisible) {
        setDaysItemsAndCache((currentItems) => [...currentItems, response.data], true);
      } else {
        setDaysItemsAndCache((currentItems) => currentItems, true);
      }
    } catch (error) {
      console.error('Error copying day item:', error);
    }
  };

  const handleSnoozeDayItem = async (itemId: number, day: Date) => {
    try {
      const response = await snoozePlannerDayItem(itemId, formatDateForAPI(day));

      // Update the original item's state to 'snoozed'
      const updatedItems = daysItems.map((item) =>
        item.id === itemId ? { ...item, state: 'snoozed' as PlannerItemStateDTO } : item,
      );

      // Add the new item to the current state if its date is currently shown
      const isDateVisible = Array.from({ length: 7 }).some((_, index) => {
        const plannerDay = new Date(selectedDate);
        plannerDay.setDate(plannerDay.getDate() + index);
        return formatDateForAPI(plannerDay) === response.data.day;
      });

      if (isDateVisible) {
        setDaysItemsAndCache([...updatedItems, response.data], true);
      } else {
        setDaysItemsAndCache(updatedItems, true);
      }
    } catch (error) {
      console.error('Error snoozing day item:', error);
    }
  };

  const handleDayItemDragStart = (item: PlannerDayItemDTO) => {
    setDragDayItem(item);
  };

  const handleDayItemDragEnd = () => {
    if (!dragDayItem) {
      return;
    }

    setDragDayItem(null);
    void applyUpdatedItemsOrder();
  };

  // Optimistic reorder that is called frequently during item drag
  // Update state without API request and save it to ref
  const handleReorderDayItems = (items: PlannerDayItemDTO[]) => {
    currentItemsOrder.current = daysItems.map((item) => item.id);
    setDaysItemsAndCache(items, true);
    updatedItemsOrder.current = items.map((item) => item.id);
  };

  const applyUpdatedItemsOrder = async () => {
    const updatedOrder = updatedItemsOrder.current;
    if (!updatedOrder) {
      return;
    }

    // Skip if items order hasn't changed
    const currentOrder = currentItemsOrder.current;
    if (
      currentOrder &&
      currentOrder.length === updatedOrder.length &&
      currentOrder.every((id, index) => id === updatedOrder[index])
    ) {
      return;
    }

    try {
      await reorderPlannerDayItems(updatedOrder);
      currentItemsOrder.current = updatedOrder;
    } catch (error) {
      console.error('Error reordering items:', error);
      showError('Failed to save new order, restoring…');
      await fetchDaysItems();
    }
  };

  const getItemsForDate = (date: Date) => {
    const dateStr = formatDateForAPI(date);
    const items = daysItems.filter((item) => item.day === dateStr);

    if (user?.merge_weekends && date.getDay() === 6) {
      // If Saturday and merge_weekends is true, also include Sunday's items
      const sunday = getNextDay(date);
      const sundayStr = formatDateForAPI(sunday);
      const sundayItems = daysItems.filter((item) => item.day === sundayStr);
      return [...items, ...sundayItems];
    }

    return items;
  };

  // Fetch items when selected date changes
  useEffect(() => {
    setDaysItems(plannerDaysCache.get(cacheKey) ?? []);
    void fetchDaysItems();
  }, [cacheKey, fetchDaysItems]);

  // Abort pending requests on unmount
  useEffect(
    () => () => {
      daysAbortControllerRef.current?.abort();
    },
    [],
  );

  // Refresh listener
  useEffect(() => {
    const handler = () => {
      void fetchDaysItems();
    };
    window.addEventListener(REFRESH_EVENT, handler);
    return () => {
      window.removeEventListener(REFRESH_EVENT, handler);
    };
  }, [fetchDaysItems]);

  return {
    daysItems,
    isDaysRefreshing,
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
  };
};
