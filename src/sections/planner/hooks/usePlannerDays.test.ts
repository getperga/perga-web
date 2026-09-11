import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { clearPlannerDaysCache, usePlannerDays } from './usePlannerDays';

const apiMocks = vi.hoisted(() => ({
  getItemsByRange: vi.fn(),
}));

vi.mock('@api/planner', () => ({
  getItemsByRange: apiMocks.getItemsByRange,
  createPlannerDayItem: vi.fn(),
  updatePlannerDayItem: vi.fn(),
  deletePlannerDayItem: vi.fn(),
  reorderPlannerDayItems: vi.fn(),
  copyPlannerDayItem: vi.fn(),
  snoozePlannerDayItem: vi.fn(),
}));

vi.mock('@common/contexts/auth/useAuth', () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock('@common/contexts/toast/useToast', () => ({
  useToast: () => ({ showError: vi.fn() }),
}));

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
};

describe('usePlannerDays request ordering', () => {
  beforeEach(() => {
    clearPlannerDaysCache();
    vi.clearAllMocks();
  });

  it('aborts the previous request when the selected range changes', async () => {
    const first = deferred<{ data: Record<string, unknown[]> }>();
    const second = deferred<{ data: Record<string, unknown[]> }>();
    apiMocks.getItemsByRange.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);

    const { result, rerender } = renderHook(({ date }) => usePlannerDays(date), {
      initialProps: { date: new Date(2026, 0, 1) },
    });
    await waitFor(() => expect(apiMocks.getItemsByRange).toHaveBeenCalledTimes(1));

    rerender({ date: new Date(2026, 0, 2) });
    await waitFor(() => expect(apiMocks.getItemsByRange).toHaveBeenCalledTimes(2));
    expect(apiMocks.getItemsByRange.mock.calls[0]?.[2].aborted).toBe(true);
    await act(async () =>
      second.resolve({
        data: {
          '2026-01-02': [{ id: 2, day: '2026-01-02', text: 'new', state: 'todo', index: 0 }],
        },
      }),
    );
    expect(result.current.daysItems.map((item) => item.id)).toEqual([2]);
  });

  it('restores cached items immediately and revalidates them in the background', async () => {
    const freshResponse = deferred<{ data: Record<string, unknown[]> }>();
    apiMocks.getItemsByRange
      .mockResolvedValueOnce({
        data: {
          '2026-01-01': [{ id: 1, day: '2026-01-01', text: 'cached', state: 'todo', index: 0 }],
        },
      })
      .mockReturnValueOnce(freshResponse.promise);

    const firstRender = renderHook(() => usePlannerDays(new Date(2026, 0, 1)));
    await waitFor(() => expect(firstRender.result.current.daysItems[0]?.id).toBe(1));
    firstRender.unmount();

    const secondRender = renderHook(() => usePlannerDays(new Date(2026, 0, 1)));
    expect(secondRender.result.current.daysItems[0]?.id).toBe(1);
    await waitFor(() => expect(apiMocks.getItemsByRange).toHaveBeenCalledTimes(2));
    expect(secondRender.result.current.isDaysRefreshing).toBe(true);

    await act(async () =>
      freshResponse.resolve({
        data: {
          '2026-01-01': [{ id: 2, day: '2026-01-01', text: 'fresh', state: 'todo', index: 0 }],
        },
      }),
    );
    expect(secondRender.result.current.daysItems[0]?.id).toBe(2);
    expect(secondRender.result.current.isDaysRefreshing).toBe(false);
  });
});
