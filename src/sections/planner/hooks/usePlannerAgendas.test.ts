import { act, renderHook, waitFor } from '@testing-library/react';
import { createElement, StrictMode, type PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { invalidatePlannerAgendasCache, usePlannerAgendas } from './usePlannerAgendas';

const apiMocks = vi.hoisted(() => ({
  getPlannerAgendas: vi.fn(),
  getItemsByAgendas: vi.fn(),
}));

vi.mock('@api/planner', () => ({
  getPlannerAgendas: apiMocks.getPlannerAgendas,
  getItemsByAgendas: apiMocks.getItemsByAgendas,
  createPlannerAgendaItem: vi.fn(),
  updatePlannerAgendaItem: vi.fn(),
  deletePlannerAgendaItem: vi.fn(),
  reorderPlannerAgendaItems: vi.fn(),
  copyPlannerAgendaItem: vi.fn(),
  movePlannerAgendaItem: vi.fn(),
}));

vi.mock('@common/contexts/toast/useToast', () => ({
  useToast: () => ({ showError: vi.fn() }),
}));

vi.mock('@common/contexts/auth/useAuth', () => ({
  useAuth: () => ({ user: { email: 'test@example.com' } }),
}));

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
};

const agenda = (id: number, name: string) => ({
  id,
  name,
  agenda_type: 'monthly' as const,
  index: 0,
  todo_items_cnt: 0,
  completed_items_cnt: 0,
});

describe('usePlannerAgendas request ordering', () => {
  beforeEach(() => {
    invalidatePlannerAgendasCache();
    vi.clearAllMocks();
  });

  it('aborts outdated agenda items when the selected month changes', async () => {
    const oldItems = deferred<{ data: Record<number, unknown[]> }>();
    const newAgendas = deferred<{ data: ReturnType<typeof agenda>[] }>();
    const newItems = deferred<{ data: Record<number, unknown[]> }>();

    apiMocks.getPlannerAgendas
      .mockResolvedValueOnce({ data: [agenda(1, 'January 2026')] })
      .mockReturnValueOnce(newAgendas.promise);
    apiMocks.getItemsByAgendas
      .mockReturnValueOnce(oldItems.promise)
      .mockReturnValueOnce(newItems.promise);

    const { result, rerender } = renderHook(({ date }) => usePlannerAgendas(date), {
      initialProps: { date: new Date(2026, 0, 1) },
    });
    await waitFor(() => expect(apiMocks.getItemsByAgendas.mock.calls[0]?.[0]).toEqual([1]));

    rerender({ date: new Date(2026, 1, 1) });
    await waitFor(() => expect(apiMocks.getPlannerAgendas).toHaveBeenCalledTimes(2));
    expect(apiMocks.getItemsByAgendas.mock.calls[0]?.[1].aborted).toBe(true);
    await act(async () => newAgendas.resolve({ data: [agenda(2, 'February 2026')] }));
    await waitFor(() => expect(apiMocks.getItemsByAgendas.mock.calls[1]?.[0]).toEqual([2]));
    await act(async () =>
      newItems.resolve({
        data: { 2: [{ id: 20, agenda_id: 2, text: 'new', state: 'todo', index: 0 }] },
      }),
    );

    expect(result.current.plannerAgendas.map(({ id }) => id)).toEqual([2]);
    expect(result.current.plannerAgendaItems[2]?.map(({ id }) => id)).toEqual([20]);
  });

  it('loads agendas in StrictMode and does not refetch within the same month', async () => {
    apiMocks.getPlannerAgendas.mockResolvedValue({ data: [agenda(1, 'January 2026')] });
    apiMocks.getItemsByAgendas.mockResolvedValue({ data: { 1: [] } });

    const wrapper = ({ children }: PropsWithChildren) => createElement(StrictMode, null, children);
    const { result, rerender } = renderHook(({ date }) => usePlannerAgendas(date), {
      initialProps: { date: new Date(2026, 0, 1) },
      wrapper,
    });

    await waitFor(() => expect(result.current.plannerAgendas.map(({ id }) => id)).toEqual([1]));
    const requestCount = apiMocks.getPlannerAgendas.mock.calls.length;

    rerender({ date: new Date(2026, 0, 15) });
    expect(apiMocks.getPlannerAgendas).toHaveBeenCalledTimes(requestCount);
  });

  it('restores cached agendas and items before background revalidation finishes', async () => {
    const freshAgendas = deferred<{ data: ReturnType<typeof agenda>[] }>();
    apiMocks.getPlannerAgendas
      .mockResolvedValueOnce({ data: [agenda(1, 'January 2026')] })
      .mockReturnValueOnce(freshAgendas.promise);
    apiMocks.getItemsByAgendas.mockResolvedValue({
      data: { 1: [{ id: 10, agenda_id: 1, text: 'cached', state: 'todo', index: 0 }] },
    });

    const firstRender = renderHook(() => usePlannerAgendas(new Date(2026, 0, 1)));
    await waitFor(() => expect(firstRender.result.current.plannerAgendaItems[1]?.[0]?.id).toBe(10));
    firstRender.unmount();

    const secondRender = renderHook(() => usePlannerAgendas(new Date(2026, 0, 1)));
    expect(secondRender.result.current.plannerAgendas[0]?.id).toBe(1);
    expect(secondRender.result.current.plannerAgendaItems[1]?.[0]?.id).toBe(10);
    await waitFor(() => expect(apiMocks.getPlannerAgendas).toHaveBeenCalledTimes(2));
    expect(secondRender.result.current.isAgendasRefreshing).toBe(true);

    await act(async () => freshAgendas.resolve({ data: [] }));
    expect(secondRender.result.current.plannerAgendas).toEqual([]);
    expect(secondRender.result.current.plannerAgendaItems).toEqual({});
    expect(secondRender.result.current.isAgendasRefreshing).toBe(false);
  });
});
