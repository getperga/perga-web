import axios from 'axios';

import { getConfig } from '@/config';
import type {
  PlannerDayItemDTO,
  PlannerDayItemCreateDTO,
  PlannerDayItemUpdateDTO,
  PlannerAgendaDTO,
  PlannerAgendaCreateDTO,
  PlannerAgendaUpdateDTO,
  PlannerAgendaActionDTO,
  PlannerAgendaItemDTO,
  PlannerAgendasWithItemsDTO,
  PlannerAgendaItemCreateDTO,
  PlannerAgendaItemUpdateDTO,
} from '@api/planner/planner.dto';

// API URLs
const { API_BASE_URL } = getConfig();
const PLANNER_API_BASE_URL = `${API_BASE_URL}/planner`;
const DAYS_API_URL = `${PLANNER_API_BASE_URL}/days/items`;
const AGENDAS_API_URL = `${PLANNER_API_BASE_URL}/agendas/`;

// Planner Days API methods
export const getItemsByDays = (days: string[]) =>
  axios.get<Record<string, PlannerDayItemDTO[]>>(`${DAYS_API_URL}/`, {
    params: { days: days },
    paramsSerializer: {
      indexes: null, // Prevents using square brackets in array params
    },
  });
export const getItemsByRange = (startDate: string, daysCount: number, signal?: AbortSignal) =>
  axios.get<Record<string, PlannerDayItemDTO[]>>(`${DAYS_API_URL}/range/`, {
    params: {
      start_date: startDate,
      days_count: daysCount,
    },
    signal,
  });

export const createPlannerDayItem = (item: PlannerDayItemCreateDTO) =>
  axios.post<PlannerDayItemDTO>(`${DAYS_API_URL}/`, item);

export const updatePlannerDayItem = (itemId: number, item: PlannerDayItemUpdateDTO) =>
  axios.put<PlannerDayItemDTO>(`${DAYS_API_URL}/${itemId}/`, item);

export const deletePlannerDayItem = (itemId: number) => axios.delete(`${DAYS_API_URL}/${itemId}/`);

export const reorderPlannerDayItems = (orderedItemIds: number[]) =>
  axios.post(`${DAYS_API_URL}/reorder/`, { ordered_item_ids: orderedItemIds });

export const copyPlannerDayItem = (itemId: number, day: string) =>
  axios.post<PlannerDayItemDTO>(`${DAYS_API_URL}/${itemId}/copy/`, { day });

export const snoozePlannerDayItem = (itemId: number, day: string) =>
  axios.post<PlannerDayItemDTO>(`${DAYS_API_URL}/${itemId}/snooze/`, { day });

// Planner Agendas API methods
export const getPlannerAgendas = (
  agendaTypes: string[],
  selectedDay: string | null = null,
  withCounts: boolean = false,
  signal?: AbortSignal,
) =>
  axios.get<PlannerAgendaDTO[]>(AGENDAS_API_URL, {
    params: {
      agenda_types: agendaTypes,
      selected_day: selectedDay,
      with_counts: withCounts,
    },
    paramsSerializer: {
      indexes: null, // Prevents using square brackets in array params
    },
    signal,
  });

export const getPlannerAgendasWithItems = (
  agendaTypes: string[],
  selectedDay: string | null = null,
  signal?: AbortSignal,
) =>
  axios.get<PlannerAgendasWithItemsDTO>(AGENDAS_API_URL, {
    params: {
      agenda_types: agendaTypes,
      selected_day: selectedDay,
      with_items: true,
    },
    paramsSerializer: {
      indexes: null,
    },
    signal,
  });

export const createPlannerAgenda = (agenda: PlannerAgendaCreateDTO) =>
  axios.post<PlannerAgendaDTO>(AGENDAS_API_URL, agenda);

export const updatePlannerAgenda = (agendaId: number, changes: PlannerAgendaUpdateDTO) =>
  axios.put<PlannerAgendaDTO>(`${AGENDAS_API_URL}${agendaId}/`, changes);

export const deletePlannerAgenda = (agendaId: number) =>
  axios.delete(`${AGENDAS_API_URL}${agendaId}/`);

export const reorderPlannerAgendas = (orderedAgendaIds: number[]) =>
  axios.post(`${AGENDAS_API_URL}reorder/`, { ordered_agenda_ids: orderedAgendaIds });

export const actionPlannerAgenda = (agendaId: number, action: PlannerAgendaActionDTO) =>
  axios.post(`${AGENDAS_API_URL}${agendaId}/action/`, {
    action,
  });

export const createPlannerAgendaItem = (item: PlannerAgendaItemCreateDTO) =>
  axios.post<PlannerAgendaItemDTO>(`${AGENDAS_API_URL}items/`, item);

export const updatePlannerAgendaItem = (itemId: number, changes: PlannerAgendaItemUpdateDTO) =>
  axios.put<PlannerAgendaItemDTO>(`${AGENDAS_API_URL}items/${itemId}/`, changes);

export const deletePlannerAgendaItem = (itemId: number) =>
  axios.delete(`${AGENDAS_API_URL}items/${itemId}/`);

export const reorderPlannerAgendaItems = (agendaId: number, orderedItemIds: number[]) =>
  axios.post(`${AGENDAS_API_URL}items/reorder/`, {
    agenda_id: agendaId,
    ordered_item_ids: orderedItemIds,
  });

export const copyPlannerAgendaItem = (itemId: number, agendaId: number) =>
  axios.post<PlannerAgendaItemDTO>(`${AGENDAS_API_URL}items/${itemId}/copy/`, {
    agenda_id: agendaId,
  });

export const movePlannerAgendaItem = (itemId: number, agendaId: number) =>
  axios.post<PlannerAgendaItemDTO>(`${AGENDAS_API_URL}items/${itemId}/move/`, {
    agenda_id: agendaId,
  });
