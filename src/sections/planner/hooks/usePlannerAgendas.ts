import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

import type { PlannerItemStateDTO, PlannerAgendaDTO, PlannerAgendaItemDTO } from '@api/planner';
import {
  getPlannerAgendas,
  getItemsByAgendas,
  createPlannerAgendaItem,
  updatePlannerAgendaItem,
  deletePlannerAgendaItem,
  reorderPlannerAgendaItems,
  copyPlannerAgendaItem,
  movePlannerAgendaItem,
} from '@api/planner';
import { REFRESH_EVENT } from '@common/events';
import { formatDateForAPI, formatDateMonthName } from '@common/utils/date_utils';
import { useToast } from '@common/contexts/toast/useToast';

export const usePlannerAgendas = (selectedDate: Date) => {
  const [plannerAgendas, setPlannerAgendas] = useState<PlannerAgendaDTO[]>([]);
  const [plannerAgendaItems, setPlannerAgendaItems] = useState<
    Record<number, PlannerAgendaItemDTO[]>
  >({});

  const [dragAgendaItem, setDragAgendaItem] = useState<PlannerAgendaItemDTO | null>(null);
  const agendasAbortControllerRef = useRef<AbortController | null>(null);
  const agendaItemsAbortControllerRef = useRef<AbortController | null>(null);

  // Lock to prevent multiple updates for the same item
  const updatingItemsRef = useRef<Set<number>>(new Set());
  const { showError } = useToast();

  // Reorder management refs (per-agenda) for optimistic reorder + single commit
  const currentItemsOrder = useRef<Map<number, number[]>>(new Map());
  const updatedItemsOrder = useRef<Map<number, number[]>>(new Map());

  // Fetch items only for specific agendas
  const fetchAgendaItems = useCallback(async (agendaIds: number[]) => {
    if (!agendaIds?.length) {
      return;
    }

    agendaItemsAbortControllerRef.current?.abort();
    const requestController = new AbortController();
    agendaItemsAbortControllerRef.current = requestController;

    try {
      const itemsResponse = await getItemsByAgendas(agendaIds, requestController.signal);
      const itemsByAgenda = itemsResponse.data;

      setPlannerAgendaItems((prev) => ({
        ...prev,
        ...itemsByAgenda,
      }));
    } catch (error) {
      if (!requestController.signal.aborted) {
        console.error('Error fetching agenda items:', error);
      }
    }
  }, []);

  // Fetch planner agendas and their items
  const fetchAgendasWithItems = useCallback(
    async (date: Date) => {
      agendasAbortControllerRef.current?.abort();
      agendaItemsAbortControllerRef.current?.abort();

      const requestController = new AbortController();
      agendasAbortControllerRef.current = requestController;

      try {
        const response = await getPlannerAgendas(
          ['monthly', 'custom'],
          formatDateForAPI(date),
          false,
          requestController.signal,
        );
        const agendas = response.data;
        setPlannerAgendas(agendas);

        if (agendas.length > 0) {
          const agendaIds = agendas.map((agenda) => agenda.id);
          await fetchAgendaItems(agendaIds);
        }
      } catch (error) {
        if (!requestController.signal.aborted) {
          console.error('Error fetching planner agendas:', error);
        }
      }
    },
    [fetchAgendaItems],
  );

  const handleAddAgendaItem = async (agendaId: number, text: string) => {
    if (!text.trim()) {
      return;
    }

    try {
      const response = await createPlannerAgendaItem({
        agenda_id: agendaId,
        text,
      });
      setPlannerAgendaItems({
        ...plannerAgendaItems,
        [agendaId]: [...(plannerAgendaItems[agendaId] || []), response.data],
      });
    } catch (error) {
      console.error('Error adding planner agenda item:', error);
    }
  };

  const handleUpdateAgendaItem = async (
    itemId: number,
    agendaId: number,
    changes: { text?: string; state?: PlannerItemStateDTO },
  ) => {
    // prevent multiple execution for the same item and empty text
    if (updatingItemsRef.current.has(itemId) || changes.text?.trim() === '') {
      return;
    }
    updatingItemsRef.current.add(itemId);

    // use optimistic update for better ui interactivity
    const prev = { ...plannerAgendaItems };
    const prevItems = plannerAgendaItems[agendaId];
    const prevItem = prevItems.find((item) => item.id === itemId);
    const optimisticItem = { ...prevItem, ...changes } as PlannerAgendaItemDTO;
    setPlannerAgendaItems({
      ...plannerAgendaItems,
      [agendaId]: prevItems.map((item) => (item.id === itemId ? optimisticItem : item)),
    });

    try {
      const response = await updatePlannerAgendaItem(itemId, { agenda_id: agendaId, ...changes });
      setPlannerAgendaItems({
        ...plannerAgendaItems,
        [agendaId]: plannerAgendaItems[agendaId].map((item) =>
          item.id === itemId ? response.data : item,
        ),
      });
    } catch (error) {
      console.error('Error updating planner agenda item:', error);
      setPlannerAgendaItems(prev); // restoring previous state
      showError('Failed to update item, please try again');
    } finally {
      updatingItemsRef.current.delete(itemId);
    }
  };

  const handleDeleteAgendaItem = async (itemId: number, agendaId: number) => {
    try {
      await deletePlannerAgendaItem(itemId);
      setPlannerAgendaItems({
        ...plannerAgendaItems,
        [agendaId]: plannerAgendaItems[agendaId].filter((item) => item.id !== itemId),
      });
    } catch (error) {
      console.error('Error deleting planner agenda item:', error);
    }
  };

  const handleDragStartAgendaItem = (item: PlannerAgendaItemDTO) => {
    setDragAgendaItem(item);
  };

  const handleDragEndAgendaItem = () => {
    if (!dragAgendaItem) {
      return;
    }

    setDragAgendaItem(null);
    void applyUpdatedItemsOrder(dragAgendaItem.agenda_id);
  };

  // Optimistic reorder that is called frequently during item drag
  // Update state without API request and save it to ref
  const handleReorderAgendaItems = (agendaId: number, items: PlannerAgendaItemDTO[]) => {
    currentItemsOrder.current.set(
      agendaId,
      (plannerAgendaItems[agendaId] || []).map((item) => item.id),
    );
    setPlannerAgendaItems({
      ...plannerAgendaItems,
      [agendaId]: items,
    });
    updatedItemsOrder.current.set(
      agendaId,
      items.map((item) => item.id),
    );
  };

  const applyUpdatedItemsOrder = async (agendaId: number) => {
    const updatedOrder = updatedItemsOrder.current.get(agendaId);
    if (!updatedOrder) {
      return;
    }

    // Skip if items order hasn't changed
    const currentOrder = currentItemsOrder.current.get(agendaId);
    if (
      currentOrder &&
      currentOrder.length === updatedOrder.length &&
      currentOrder.every((id, index) => id === updatedOrder[index])
    ) {
      return;
    }

    try {
      await reorderPlannerAgendaItems(agendaId, updatedOrder);
      currentItemsOrder.current.set(agendaId, updatedOrder);
    } catch (error) {
      console.error('Error reordering planner agenda items:', error);
      showError('Failed to save agenda order, restoring…');
      await fetchAgendasWithItems(selectedDate);
    }
  };

  const selectedYear = selectedDate.getFullYear();
  const selectedMonth = selectedDate.getMonth();
  const selectedMonthDate = useMemo(
    () => new Date(selectedYear, selectedMonth, 1),
    [selectedYear, selectedMonth],
  );

  useEffect(() => {
    void fetchAgendasWithItems(selectedMonthDate);

    return () => {
      agendasAbortControllerRef.current?.abort();
      agendaItemsAbortControllerRef.current?.abort();
    };
  }, [selectedMonthDate, fetchAgendasWithItems]);

  // Refresh listener
  useEffect(() => {
    const handler = () => {
      void fetchAgendasWithItems(selectedDate);
    };
    window.addEventListener(REFRESH_EVENT, handler);
    return () => {
      window.removeEventListener(REFRESH_EVENT, handler);
    };
  }, [selectedDate, fetchAgendasWithItems]);

  const handleCopyAgendaItem = async (itemId: number, toAgendaId: number) => {
    try {
      const response = await copyPlannerAgendaItem(itemId, toAgendaId);
      const newItem = response.data;

      setPlannerAgendaItems((prev) => ({
        ...prev,
        [newItem.agenda_id]: [...(prev[newItem.agenda_id] || []), newItem],
      }));
    } catch (error) {
      console.error('Error copying agenda item:', error);
    }
  };

  const handleMoveAgendaItem = async (itemId: number, fromAgendaId: number, toAgendaId: number) => {
    try {
      const response = await movePlannerAgendaItem(itemId, toAgendaId);
      const newItem = response.data;

      setPlannerAgendaItems((prev) => ({
        ...prev,

        // remove original agenda item
        [fromAgendaId]: (prev[fromAgendaId] || []).filter((item) => item.id !== itemId),

        [newItem.agenda_id]: [...(prev[newItem.agenda_id] || []), newItem],
      }));
    } catch (error) {
      console.error('Error moving agenda item:', error);
    }
  };

  const currentMonthName = formatDateMonthName(selectedDate);
  const nextMonthDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1);
  const nextMonthName = formatDateMonthName(nextMonthDate);

  const monthlyAgendas = plannerAgendas.filter((agenda) => agenda.agenda_type === 'monthly');
  const currentMonthAgenda =
    monthlyAgendas.find((agenda) =>
      agenda.name.toLowerCase().includes(currentMonthName.toLowerCase()),
    ) || monthlyAgendas[0];
  const nextMonthAgenda =
    monthlyAgendas.find((agenda) =>
      agenda.name.toLowerCase().includes(nextMonthName.toLowerCase()),
    ) ||
    monthlyAgendas[1] ||
    monthlyAgendas[0];

  const customAgendas = plannerAgendas.filter((agenda) => agenda.agenda_type === 'custom');
  const copyAgendasMap = {
    today: currentMonthAgenda,
    tomorrow: nextMonthAgenda,
    currentMonth: currentMonthAgenda,
    nextMonth: nextMonthAgenda,
    customAgendas: customAgendas,
  };

  return {
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
    fetchAgendaItems,
  };
};
