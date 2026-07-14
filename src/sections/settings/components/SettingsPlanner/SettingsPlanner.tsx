import React, { useEffect, useMemo, useRef, useState } from 'react';

import type { UserUpdateDTO, WeekStartDayDTO } from '@api/auth';
import { updateUser } from '@api/auth';
import type { PlannerAgendaDTO } from '@api/planner';
import { Icon } from '@common/components/Icon';
import { Toggle, ToggleOption } from '@common/components/Toggle';
import { useAuth } from '@common/contexts/auth/useAuth';
import { useToast } from '@common/contexts/toast/useToast';
import { useIsMobile } from '@common/hooks/useIsMobile';
import { useSettingsAgendas } from '@planner/hooks/useSettingsAgendas';
import AgendaLine from '@settings/components/SettingsPlanner/AgendaLine/AgendaLine';

export const SettingsPlanner: React.FC = () => {
  const isMobile = useIsMobile();
  const { user, fetchUser } = useAuth();
  const { showToast, showError } = useToast();
  const {
    settingsAgendas,
    handleCreateAgenda,
    handleUpdateAgenda,
    handleDeleteAgenda,
    handleReorderAgendas,
  } = useSettingsAgendas();

  const [weekStartDay, setWeekStartDay] = useState<WeekStartDayDTO>('monday');
  const [mergeWeekends, setMergeWeekends] = useState(false);
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (user) {
      setWeekStartDay(user.week_start_day);
      setMergeWeekends(user.merge_weekends);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      const hasFieldChanges =
        weekStartDay !== user.week_start_day || mergeWeekends !== user.merge_weekends;

      setHasChanges(hasFieldChanges);
    }
  }, [user, weekStartDay, mergeWeekends]);

  const handlePlannerSettingsUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsUpdatingSettings(true);

      const settingsData: UserUpdateDTO = {
        week_start_day: weekStartDay !== user?.week_start_day ? weekStartDay : undefined,
        merge_weekends: mergeWeekends !== user?.merge_weekends ? mergeWeekends : undefined,
      };

      if (Object.values(settingsData).some((value) => value !== undefined)) {
        await updateUser(settingsData);
        showToast('Planner settings updated successfully', 'success');
        fetchUser();
      } else {
        showError('No changes to update.');
      }
    } catch (err) {
      showError('Failed to update planner settings. Please try again.');
      console.error('Error updating planner settings:', err);
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const weekStartDayOptions = useMemo<ToggleOption<WeekStartDayDTO>[]>(
    () => [
      { value: 'sunday', label: 'Sunday' },
      { value: 'monday', label: 'Monday' },
    ],
    [],
  );

  const [showArchived, setShowArchived] = useState(false);

  const emptyAgendaLine: PlannerAgendaDTO = {
    id: -1,
    name: '',
    agenda_type: 'custom',
    index: -1,
    todo_items_cnt: 0,
    completed_items_cnt: 0,
  };

  const handleEmptyAgendaLineEdit = (_agendaId: number, changes: { name?: string }) => {
    if (changes.name?.trim()) {
      void handleCreateAgenda(changes.name);
    }
  };

  const confirmAndDelete = (agendaId: number) => {
    if (window.confirm('Delete this agenda? This cannot be undone.')) {
      void handleDeleteAgenda(agendaId);
    }
  };

  // Local view state for optimistic drag-and-drop reorder without spamming API
  const [agendasView, setAgendasView] = useState<PlannerAgendaDTO[]>(settingsAgendas);
  const draggingAgendaRef = useRef<PlannerAgendaDTO | null>(null);
  const initialOrderRef = useRef<number[] | null>(null);

  // Keep local view in sync with server when not dragging
  useEffect(() => {
    if (!draggingAgendaRef.current) {
      setAgendasView(settingsAgendas);
      initialOrderRef.current = settingsAgendas.map((agenda) => agenda.id);
    }
  }, [settingsAgendas]);

  const handleDragStart = (agenda: PlannerAgendaDTO) => {
    draggingAgendaRef.current = agenda;
    initialOrderRef.current = agendasView.map((agenda) => agenda.id);
  };

  const handleDragOverAgenda = (target: PlannerAgendaDTO) => {
    const dragging = draggingAgendaRef.current;
    if (!dragging || dragging.id === target.id) {
      return;
    }

    setAgendasView((prev) => {
      const current = [...prev];
      const fromIndex = current.findIndex((agenda) => agenda.id === dragging.id);
      const toIndex = current.findIndex((agenda) => agenda.id === target.id);
      if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
        return prev;
      }

      const updated = [...current];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return updated;
    });
  };

  const handleDragEnd = () => {
    const updatedOrder = agendasView.map((agenda) => agenda.id);
    const initialOrder = initialOrderRef.current;
    draggingAgendaRef.current = null;

    if (
      initialOrder &&
      (initialOrder.length !== updatedOrder.length ||
        !initialOrder.every((id, idx) => id === updatedOrder[idx]))
    ) {
      void handleReorderAgendas(agendasView);
    } else {
      // ensure we reflect latest server order
      setAgendasView(settingsAgendas);
    }
  };

  return (
    <div className="flex flex-col gap-10 w-full md:max-w-2/5">
      <form onSubmit={handlePlannerSettingsUpdate}>
        <fieldset className="border border-gray-400 rounded p-8">
          <legend className="px-2 text-text-main">Preferences</legend>

          <div className="flex flex-col md:flex-row md:items-center justify-between mt-4 mb-6 gap-4">
            <h4 className="text-text-main text-sm font-medium">Week Starts On</h4>

            <Toggle
              options={weekStartDayOptions}
              value={weekStartDay}
              onChange={setWeekStartDay}
              orientation={isMobile ? 'vertical' : 'horizontal'}
            />
          </div>

          <div className="flex items-center justify-between mt-8 mb-6">
            <label htmlFor="mergeWeekends" className="text-text-main text-sm font-medium">
              Merge Weekends
            </label>

            <input
              id="mergeWeekends"
              type="checkbox"
              checked={mergeWeekends}
              onChange={(event) => setMergeWeekends(event.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
          </div>

          <div className="flex">
            <button
              type="submit"
              disabled={isUpdatingSettings || !hasChanges}
              className={`${hasChanges ? 'bg-blue-500 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'}
                              text-white font-medium py-1.5 px-8 rounded focus:outline-none focus:shadow-outline 
                                text-sm`}
            >
              {isUpdatingSettings ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </fieldset>
      </form>

      <fieldset className="border border-gray-400 rounded p-8">
        <legend className="px-2 text-text-main">Agendas</legend>

        <p className="text-sm text-text-muted mb-10">
          Create and manage custom agendas to organize your tasks. A&nbsp;monthly agenda is created
          automatically for each month.
        </p>

        <div className="flex items-center justify-end mb-3">
          <button
            type="button"
            onClick={() => setShowArchived((prev) => !prev)}
            className="text-sm text-text-main hover:underline focus:outline-none focus-visible:ring-2
                           focus-visible:ring-gray-400"
          >
            <span className="inline-flex items-center gap-1">
              <Icon name="filter" size={16} className="h-4 w-4" />
              <span className="grid">
                <span
                  className={`col-start-1 row-start-1 ${showArchived ? 'opacity-0' : 'opacity-100'}`}
                  aria-hidden={showArchived}
                >
                  Show archived
                </span>
                <span
                  className={`col-start-1 row-start-1 ${showArchived ? 'opacity-100' : 'opacity-0'}`}
                  aria-hidden={!showArchived}
                >
                  Hide archived
                </span>
              </span>
            </span>
          </button>
        </div>

        <div className="space-y-1">
          {agendasView
            .filter((agenda) => agenda.agenda_type === 'custom')
            .map((agenda: PlannerAgendaDTO) => (
              <div key={agenda.id}>
                <AgendaLine
                  agenda={agenda}
                  onUpdateAgenda={handleUpdateAgenda}
                  onDeleteAgenda={confirmAndDelete}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onDragOverAgenda={handleDragOverAgenda}
                />
              </div>
            ))}
          {showArchived &&
            agendasView
              .filter((agenda) => agenda.agenda_type === 'archived')
              .map((agenda: PlannerAgendaDTO) => (
                <div key={agenda.id}>
                  <AgendaLine
                    agenda={agenda}
                    onUpdateAgenda={handleUpdateAgenda}
                    onDeleteAgenda={confirmAndDelete}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDragOverAgenda={handleDragOverAgenda}
                  />
                </div>
              ))}

          <AgendaLine agenda={emptyAgendaLine} onUpdateAgenda={handleEmptyAgendaLineEdit} />
        </div>
      </fieldset>
    </div>
  );
};
