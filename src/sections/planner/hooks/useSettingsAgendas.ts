import { useState, useEffect, useCallback, useRef } from 'react';

import type { PlannerAgendaDTO, PlannerAgendaUpdateDTO } from '@api/planner';
import {
  getPlannerAgendas,
  createPlannerAgenda,
  updatePlannerAgenda,
  deletePlannerAgenda,
  reorderPlannerAgendas,
} from '@api/planner';
import { REFRESH_EVENT } from '@common/events';
import { useToast } from '@common/contexts/toast/useToast';
import { invalidatePlannerAgendasCache } from '@planner/hooks/usePlannerAgendas';

export const useSettingsAgendas = () => {
  const [settingsAgendas, setSettingsAgendas] = useState<PlannerAgendaDTO[]>([]);

  const updatingItemsRef = useRef<Set<number>>(new Set());
  const { showError } = useToast();

  const fetchSettingsAgendas = useCallback(async () => {
    try {
      const response = await getPlannerAgendas(['custom', 'archived'], null, true);
      const agendas = response.data;
      setSettingsAgendas(agendas);
    } catch (error) {
      console.error('Error fetching planner agendas:', error);
    }
  }, []);

  const handleCreateAgenda = async (name: string) => {
    if (!name) {
      return;
    }

    try {
      const response = await createPlannerAgenda({
        name,
        agenda_type: 'custom',
      });
      const newAgenda = response.data;
      setSettingsAgendas((prev) => [...prev, newAgenda]);
      invalidatePlannerAgendasCache();
    } catch (error) {
      console.error('Error creating planner agenda:', error);
      showError('Failed to create agenda');
    }
  };

  const handleUpdateAgenda = async (agendaId: number, changes: PlannerAgendaUpdateDTO) => {
    // prevent multiple execution for the same item and empty name (when provided)
    if (
      updatingItemsRef.current.has(agendaId) ||
      (changes.name !== undefined && !changes.name.trim())
    ) {
      return;
    }
    updatingItemsRef.current.add(agendaId);

    // use optimistic update for better ui interactivity
    const prev = settingsAgendas;
    const prevAgenda = prev.find((agenda) => agenda.id === agendaId);
    if (!prevAgenda) {
      return;
    }
    const optimisticAgenda = { ...prevAgenda, ...changes } as PlannerAgendaDTO;
    setSettingsAgendas((currentAgendas) =>
      currentAgendas.map((agenda) => (agenda.id === agendaId ? optimisticAgenda : agenda)),
    );

    try {
      const response = await updatePlannerAgenda(agendaId, changes);
      const updated = response.data;

      setSettingsAgendas((prev) =>
        prev.map((agenda) => (agenda.id === agendaId ? updated : agenda)),
      );
      invalidatePlannerAgendasCache();
      return updated;
    } catch (error) {
      console.error('Error updating planner agenda:', error);
      setSettingsAgendas(prev);
      showError('Failed to update agenda');
    } finally {
      updatingItemsRef.current.delete(agendaId);
    }
  };

  const handleDeleteAgenda = async (agendaId: number) => {
    const prevAgendas = [...settingsAgendas];
    setSettingsAgendas((prev) => prev.filter((agenda) => agenda.id !== agendaId));
    try {
      await deletePlannerAgenda(agendaId);
      invalidatePlannerAgendasCache();
    } catch (error) {
      console.error('Error deleting planner agenda:', error);
      showError('Failed to delete agenda');
      // rollback
      setSettingsAgendas(prevAgendas);
    }
  };

  useEffect(() => {
    void fetchSettingsAgendas();
  }, [fetchSettingsAgendas]);

  // Refresh listener
  useEffect(() => {
    const handler = () => {
      void fetchSettingsAgendas();
    };
    window.addEventListener(REFRESH_EVENT, handler);
    return () => {
      window.removeEventListener(REFRESH_EVENT, handler);
    };
  }, [fetchSettingsAgendas]);

  const handleReorderAgendas = async (agendas: PlannerAgendaDTO[]) => {
    const prev = [...settingsAgendas];
    setSettingsAgendas(agendas);
    try {
      await reorderPlannerAgendas(agendas.map((agenda) => agenda.id));
      invalidatePlannerAgendasCache();
    } catch (error) {
      console.error('Error reordering agendas:', error);
      showError('Failed to save new order, restoring…');
      setSettingsAgendas(prev);
    }
  };

  return {
    settingsAgendas,
    handleCreateAgenda,
    handleUpdateAgenda,
    handleDeleteAgenda,
    handleReorderAgendas,
  };
};
