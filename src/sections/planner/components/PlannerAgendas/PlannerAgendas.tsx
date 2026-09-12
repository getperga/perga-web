import React, { useEffect } from 'react';

import type {
  PlannerItemStateDTO,
  PlannerAgendaDTO,
  PlannerAgendaItemDTO,
  PlannerAgendaActionDTO,
} from '@api/planner';
import { actionPlannerAgenda } from '@api/planner';
import { Dropdown, DropdownItem } from '@common/components/Dropdown';
import { Icon } from '@common/components/Icon';
import { formatDateMonthName } from '@common/utils/date_utils';
import { useToast } from '@common/contexts/toast/useToast';
import AgendaItem from '@planner/components/PlannerAgendas/PlannerAgendaItem/PlannerAgendaItem';
import { AGENDA_ACTION_LABELS } from '@planner/const';
import { useCollapsedAgendas } from '@planner/hooks/useCollapsedAgendas';

interface AgendasProps {
  plannerAgendas: PlannerAgendaDTO[];
  plannerAgendaItems: Record<number, PlannerAgendaItemDTO[]>;
  dragAgendaItem: PlannerAgendaItemDTO | null;
  onDragStartAgendaItem: (item: PlannerAgendaItemDTO) => void;
  onDragEndAgendaItem: () => void;
  onReorderAgendaItems: (agendaId: number, items: PlannerAgendaItemDTO[]) => void;
  onAddAgendaItem: (agendaId: number, text: string) => void;
  onUpdateAgendaItem: (
    itemId: number,
    agendaId: number,
    changes: { text?: string; state?: PlannerItemStateDTO },
  ) => void;
  onDeleteAgendaItem: (itemId: number, agendaId: number) => void;
  onCopyAgendaItem: (itemId: number, toAgendaId: number) => void;
  onMoveAgendaItem: (itemId: number, fromAgendaId: number, toAgendaId: number) => void;
  onCopyAgendaItemToDay?: (date: Date, text: string) => void;
  selectedDate: Date;
  copyAgendasMap: {
    currentMonth: PlannerAgendaDTO;
    nextMonth: PlannerAgendaDTO;
    customAgendas: PlannerAgendaDTO[];
  };
  fetchAgendasBySelectedDate: () => Promise<void> | void;
}

const PlannerAgendas: React.FC<AgendasProps> = ({
  plannerAgendas,
  plannerAgendaItems,
  dragAgendaItem,
  onDragStartAgendaItem,
  onDragEndAgendaItem,
  onReorderAgendaItems,
  onAddAgendaItem,
  onUpdateAgendaItem,
  onDeleteAgendaItem,
  onCopyAgendaItem,
  onMoveAgendaItem,
  onCopyAgendaItemToDay,
  selectedDate,
  copyAgendasMap,
  fetchAgendasBySelectedDate,
}: AgendasProps) => {
  const { collapsedAgendas, setCollapsedAgendas } = useCollapsedAgendas();

  // Ensure that newly created custom agendas are collapsed by default
  useEffect(() => {
    if (!plannerAgendas?.length) {
      return;
    }

    const updates: Record<number, boolean> = {};
    for (const agenda of plannerAgendas) {
      if (agenda.agenda_type === 'custom' && collapsedAgendas[agenda.id] === undefined) {
        updates[agenda.id] = true;
      }
    }

    if (Object.keys(updates).length > 0) {
      setCollapsedAgendas({ ...collapsedAgendas, ...updates });
    }
  }, [plannerAgendas, collapsedAgendas, setCollapsedAgendas]);

  const toggleAgendaCollapse = (agendaId: number) => {
    setCollapsedAgendas({
      ...collapsedAgendas,
      [agendaId]: !collapsedAgendas[agendaId],
    });
  };

  const selectedMonthName = formatDateMonthName(selectedDate);

  const { showError } = useToast();

  const handleAction = async (agenda: PlannerAgendaDTO, action: PlannerAgendaActionDTO) => {
    try {
      await actionPlannerAgenda(agenda.id, action);
      await fetchAgendasBySelectedDate();
    } catch (error) {
      console.error('Agenda action failed', error);
      showError('Failed to perform action');
    }
  };

  return (
    <div className="space-y-4 px-8 py-5">
      {plannerAgendas
        .filter((agenda) => agenda.agenda_type === 'custom' || agenda.name === selectedMonthName)
        .map((agenda) => (
          <div key={agenda.id}>
            <div className="flex items-center mb-3 group hover:bg-bg-hover rounded text-text-main">
              <button
                type="button"
                className="flex flex-grow items-center cursor-pointer focus:outline-none p-2"
                onClick={() => toggleAgendaCollapse(agenda.id)}
                aria-expanded={!collapsedAgendas[agenda.id]}
                aria-controls={`agenda-${agenda.id}`}
              >
                <div
                  className={`mr-2 transform transition-transform ${collapsedAgendas[agenda.id] ? '' : 'rotate-90'}`}
                >
                  <Icon name="rightChevron" size="24" className="h-4 w-4" />
                </div>
                <h3>{agenda.name}</h3>
              </button>

              <Dropdown
                buttonIcon={<Icon name="dots" size={20} className="h-6 w-6" />}
                buttonTitle="Agenda actions"
                buttonClassName="p-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                className="inline-flex"
                dropdownClassName="w-64 mt-8"
              >
                {(Object.keys(AGENDA_ACTION_LABELS) as PlannerAgendaActionDTO[]).map((action) => (
                  <DropdownItem
                    key={action}
                    onClick={() => handleAction(agenda, action)}
                    className="py-3"
                  >
                    {action === 'delete_finished_items' && (
                      <Icon name="trash" size={48} className="h-4 w-4 mr-2" />
                    )}
                    {action === 'sort_items_by_state' && (
                      <Icon name="refresh" size={48} className="h-4 w-4 mr-2" />
                    )}
                    {AGENDA_ACTION_LABELS[action]}
                  </DropdownItem>
                ))}
              </Dropdown>
            </div>

            {!collapsedAgendas[agenda.id] && (
              <div id={`agenda-${agenda.id}`}>
                <div className="space-y-0">
                  {plannerAgendaItems[agenda.id]?.map((item, index) => (
                    <div
                      key={item.id}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (!dragAgendaItem || dragAgendaItem.agenda_id !== agenda.id) {
                          return;
                        }

                        const draggingItemIndex = plannerAgendaItems[agenda.id].findIndex(
                          (agendaItem) => agendaItem.id === dragAgendaItem.id,
                        );
                        if (draggingItemIndex === index) {
                          return;
                        }

                        const newItems = [...plannerAgendaItems[agenda.id]];
                        const [removed] = newItems.splice(draggingItemIndex, 1);
                        newItems.splice(index, 0, removed);

                        onReorderAgendaItems(agenda.id, newItems);
                      }}
                    >
                      <AgendaItem
                        item={item}
                        onUpdateItem={(itemId, changes) => {
                          onUpdateAgendaItem(itemId, agenda.id, changes);
                        }}
                        onDeleteItem={() => onDeleteAgendaItem(item.id, agenda.id)}
                        onDragStartItem={() => onDragStartAgendaItem(item)}
                        onDragEndItem={() => {
                          onDragEndAgendaItem();
                          onReorderAgendaItems(agenda.id, plannerAgendaItems[agenda.id]);
                        }}
                        onCopyItem={(itemId, toAgendaId) => onCopyAgendaItem(itemId, toAgendaId)}
                        onMoveItem={(itemId, fromAgendaId, toAgendaId) =>
                          onMoveAgendaItem(itemId, fromAgendaId, toAgendaId)
                        }
                        onCopyToDay={onCopyAgendaItemToDay}
                        selectedDate={selectedDate}
                        copyAgendasMap={copyAgendasMap}
                      />
                    </div>
                  ))}

                  <div>
                    <AgendaItem
                      item={{
                        id: -1,
                        agenda_id: agenda.id,
                        text: '',
                        state: 'todo',
                        index: -1,
                      }}
                      onUpdateItem={(_, changes) => {
                        if (changes.text?.trim()) {
                          onAddAgendaItem(agenda.id, changes.text);
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
    </div>
  );
};

export default PlannerAgendas;
