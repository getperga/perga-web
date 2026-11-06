import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { REFRESH_EVENT } from '@common/events';
import { useRefreshOnVisible } from './useRefreshOnVisible';

const setVisibility = (state: DocumentVisibilityState) => {
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue(state);
  act(() => document.dispatchEvent(new Event('visibilitychange')));
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('useRefreshOnVisible', () => {
  const listenForRefresh = () => {
    const listener = vi.fn();
    window.addEventListener(REFRESH_EVENT, listener);
    return {
      listener,
      dispose: () => window.removeEventListener(REFRESH_EVENT, listener),
    };
  };

  it('refreshes once per return, without refreshing on mount or when hidden', () => {
    setVisibility('visible');
    const { listener, dispose } = listenForRefresh();
    renderHook(useRefreshOnVisible);
    expect(listener).not.toHaveBeenCalled();

    setVisibility('hidden');
    expect(listener).not.toHaveBeenCalled();
    setVisibility('visible');
    expect(listener).toHaveBeenCalledTimes(1);
    setVisibility('visible');
    expect(listener).toHaveBeenCalledTimes(1);
    setVisibility('hidden');
    setVisibility('visible');
    expect(listener).toHaveBeenCalledTimes(2);
    dispose();
  });

  it('refreshes when a tab mounted in the background becomes visible', () => {
    setVisibility('hidden');
    const { listener, dispose } = listenForRefresh();
    renderHook(useRefreshOnVisible);
    expect(listener).not.toHaveBeenCalled();
    setVisibility('visible');
    expect(listener).toHaveBeenCalledTimes(1);
    dispose();
  });

  it('stops refreshing after the authenticated layout unmounts', () => {
    setVisibility('visible');
    const { listener, dispose } = listenForRefresh();
    const { unmount } = renderHook(useRefreshOnVisible);
    setVisibility('hidden');
    unmount();
    setVisibility('visible');
    expect(listener).not.toHaveBeenCalled();
    dispose();
  });
});
