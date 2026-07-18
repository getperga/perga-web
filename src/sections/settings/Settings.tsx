import { NavLink, Outlet } from 'react-router-dom';

export const Settings = () => {
  const sections = [
    { label: 'General', to: '/settings/general/' },
    { label: 'Planner', to: '/settings/planner/' },
    { label: 'Notes', to: '/settings/notes/' },
  ];

  return (
    <div className="container">
      <div className="flex flex-col md:flex-row w-full">
        {/* Settings Sidebar */}
        <aside className="w-full md:w-56 md:min-h-screen bg-bg-settings-sidebar p-6 border-b-1 md:border-b-0 md:border-r-1 border-border-settings-sidebar">
          <nav className="space-y-1" aria-label="Settings sections">
            <h3 className="text-2xl mb-6">Settings</h3>

            {sections.map((section) => (
              <NavLink
                key={section.to}
                to={section.to}
                className={({ isActive }: { isActive: boolean }) =>
                  `block w-full text-left mb-2 px-3 py-2 rounded transition-colors text-sm text-text-main ${
                    isActive
                      ? 'bg-bg-settings-sidebar-active text-text-settings-sidebar-active'
                      : 'bg-bg-settings-sidebar'
                  }`
                }
              >
                {section.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <section className="w-full md:flex-1 px-10 py-6">
          <Outlet />
        </section>
      </div>
    </div>
  );
};
