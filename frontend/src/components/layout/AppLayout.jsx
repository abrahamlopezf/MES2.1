import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';

import Header from './Header';
import MainContent from './MainContent';
import MobileBottomNav from './MobileBottomNav';
import Sidebar from './Sidebar';

const AppLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const openSidebar = () => {
    setIsSidebarOpen(true);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  useEffect(() => {
    if (!isSidebarOpen) {
      document.body.classList.remove('body-sidebar-open');
      return;
    }

    document.body.classList.add('body-sidebar-open');

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        closeSidebar();
      }
    };

    window.addEventListener('keydown', handleEscape);

    return () => {
      document.body.classList.remove('body-sidebar-open');
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isSidebarOpen]);

  return (
    <div className={`app-shell ${isSidebarOpen ? 'app-shell-sidebar-open' : ''}`}>
      {isSidebarOpen && (
        <button
          type="button"
          className="sidebar-overlay"
          onClick={closeSidebar}
          aria-label="Cerrar menú"
        />
      )}

      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />

      <div className="app-body">
        <Header onOpenSidebar={openSidebar} />

        <MainContent>
          <Outlet />
        </MainContent>

        <MobileBottomNav />
      </div>
    </div>
  );
};

export default AppLayout;