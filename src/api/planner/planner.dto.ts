export type PlannerItemStateDTO = 'todo' | 'completed' | 'snoozed' | 'dropped';

export interface BasePlannerItemDTO {
  id: number;
  text: string;
  state: PlannerItemStateDTO;
  index: number;
}

export interface PlannerDayItemDTO extends BasePlannerItemDTO {
  day: string;
}

export interface PlannerDayItemCreateDTO {
  day: string;
  text: string;
}

export interface PlannerDayItemUpdateDTO {
  day?: string;
  text?: string;
  index?: number;
  state?: PlannerItemStateDTO;
}

export type PlannerAgendaTypeDTO = 'monthly' | 'custom' | 'archived';

export interface PlannerAgendaDTO {
  id: number;
  name: string;
  agenda_type: PlannerAgendaTypeDTO;
  index: number;
  todo_items_cnt: number;
  completed_items_cnt: number;
}

export interface PlannerAgendaCreateDTO {
  name: string;
  agenda_type: PlannerAgendaTypeDTO;
  index?: number;
}

export interface PlannerAgendaUpdateDTO {
  name?: string;
  index?: number;
  agenda_type?: PlannerAgendaTypeDTO;
}

export interface PlannerAgendaItemDTO extends BasePlannerItemDTO {
  agenda_id: number;
}

export interface PlannerAgendasWithItemsDTO {
  agendas: PlannerAgendaDTO[];
  items: Record<number, PlannerAgendaItemDTO[]>;
}

export interface PlannerAgendaItemCreateDTO {
  agenda_id: number;
  text: string;
}

export interface PlannerAgendaItemUpdateDTO {
  text?: string;
  agenda_id?: number;
  index?: number;
  state?: PlannerItemStateDTO;
}

export type PlannerAgendaActionDTO = 'delete_finished_items' | 'sort_items_by_state';
