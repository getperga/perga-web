import { useEffect } from 'react';

import { triggerRefresh } from '@common/events';

/** Refresh loaded sections when the user returns to a previously hidden taи */
export const useRefreshOnVisible = () => {
  useEffect(() => {
    let wasHidden = document.visibilityState === 'hidden';

    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === 'visible';
      if (wasHidden && isVisible) {
        triggerRefresh();
      }
      wasHidden = document.visibilityState === 'hidden';
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);
};
