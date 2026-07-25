import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { Icon } from '@common/components/Icon';
import { useAuth } from '@common/contexts/auth/useAuth';
import { triggerRefresh } from '@common/events';
import { NotesSearchModal } from '@notes/components/NotesSearchModal/NotesSearchModal';

export const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [isSpinning, setIsSpinning] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const spinTimeoutRef = useRef<number | null>(null);

  const handleRefreshClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    triggerRefresh();
    e.currentTarget.blur();

    setIsSpinning(true);
    if (spinTimeoutRef.current) {
      window.clearTimeout(spinTimeoutRef.current);
    }
    spinTimeoutRef.current = window.setTimeout(() => {
      setIsSpinning(false);
      spinTimeoutRef.current = null;
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (spinTimeoutRef.current) {
        window.clearTimeout(spinTimeoutRef.current);
      }
    };
  }, []);

  const navItems = [
    {
      path: '/planner/',
      label: 'Planner',
      icon: <Icon name="planner" size="20" fill="white" className="h-8 w-8" />,
    },
    {
      path: '/notes/',
      label: 'Notes',
      icon: <Icon name="note" size="20" fill="white" className="h-8 w-8" />,
    },
  ];

  const handleLogout = () => {
    logout();
    navigate('/signin/');
  };

  return (
    <div className="h-screen bg-bg-sidebar flex flex-col transition-all duration-300 fixed w-14 md:w-20 pt-16 md:pt-0">
      <nav className="flex-grow">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            arial-label={item.label}
            title={item.label}
            className={`flex flex-col items-center py-4 hover:bg-bg-sidebar-hover focus:bg-bg-sidebar-hover text-text-sidebar 
                          hover:text-text-sidebar-hover focus:text-text-sidebar-hover transition-colors 
                            ${location.pathname === item.path ? 'bg-bg-sidebar-hover text-text-sidebar-hover' : ''}`}
          >
            <div>{item.icon}</div>
            <div className="text-sm hidden md:block">{item.label}</div>
          </Link>
        ))}
      </nav>

      <div className="mt-auto">
        <button
          onClick={() => setIsSearchOpen(true)}
          aria-label="Search notes"
          title="Search notes"
          className="flex flex-col items-center py-4 w-full hover:bg-bg-sidebar-hover focus:bg-bg-sidebar-hover
                         text-text-sidebar hover:text-text-sidebar-hover focus:text-text-sidebar-hover transition-colors"
        >
          <div>
            <Icon name="search" size="20" className="w-8 h-8" />
          </div>
          <div className="text-sm hidden md:block">Search</div>
        </button>

        <button
          onClick={handleRefreshClick}
          aria-label="Refresh data"
          title="Refresh data"
          className="flex flex-col items-center py-4 w-full hover:bg-bg-sidebar-hover focus:bg-bg-sidebar-hover
                         text-text-sidebar hover:text-text-sidebar-hover focus:text-text-sidebar-hover transition-colors"
        >
          <div>
            <Icon
              name="refresh"
              size="20"
              className={`w-6 h-6 ${isSpinning ? 'motion-safe:animate-spin' : ''}`}
            />
          </div>
          <div className="text-sm hidden md:block">Refresh</div>
        </button>

        <Link
          to="/settings/general/"
          aria-label="Settings"
          title="Settings"
          className={`flex flex-col items-center py-4 hover:bg-bg-sidebar-hover focus:bg-bg-sidebar-hover text-text-sidebar 
                        hover:text-text-sidebar-hover focus:text-text-sidebar-hover transition-colors 
                          ${location.pathname.startsWith('/settings') ? 'bg-bg-sidebar-hover text-text-sidebar-hover' : ''}`}
        >
          <div>
            <Icon name="settings" size="20" className="w-8 h-8" />
          </div>
          <div className="text-sm hidden md:block">Settings</div>
        </Link>

        <button
          onClick={handleLogout}
          aria-label="Logout"
          title="Logout"
          className="flex flex-col items-center py-4 w-full hover:bg-bg-sidebar-hover focus:bg-bg-sidebar-hover
                         text-text-sidebar hover:text-text-sidebar-hover focus:text-text-sidebar-hover transition-colors"
        >
          <div>
            <Icon name="logout" size="20" className="w-8 h-8" />
          </div>
          <div className="text-sm hidden md:block">Logout</div>
        </button>
      </div>

      <NotesSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </div>
  );
};
