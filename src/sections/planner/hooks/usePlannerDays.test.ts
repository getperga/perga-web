import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { usePlannerDays } from './usePlannerDays';

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
});
