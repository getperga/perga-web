import { useState } from 'react';
import { Outlet } from 'react-router-dom';

import { ToastProvider } from '@common/contexts/toast';
import { NotesProvider } from '@notes/context';
import { MobileHeader } from '@sections/MobileHeader';
import { Sidebar } from '@sections/Sidebar';

export const Layout = () => {
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarVisible(!isSidebarVisible);
  };

  return (
    <ToastProvider>
      <NotesProvider>
        <div className="h-screen max-w-full overflow-x-hidden text-text-main bg-bg-main">
          <div className={`${isSidebarVisible ? 'block' : 'hidden'} md:block z-30 relative`}>
            <Sidebar />
          </div>
          <MobileHeader toggleSidebar={toggleSidebar} />
          <main
            className={`bg-bg-main transition-all duration-300 ${isSidebarVisible ? 'ml-14' : 'ml-0'} md:ml-20
                           text-text-main  overflow-x-hidden pt-16 md:pt-0 relative z-20 min-h-screen`}
          >
            <Outlet />
          </main>
        </div>
      </NotesProvider>
    </ToastProvider>
  );
};
