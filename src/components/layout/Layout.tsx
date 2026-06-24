import React, { useState, useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { getActiveSession } from '../../services/db';
import type { SessionUser } from '../../services/db';

export const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [session, setSession] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  // Check auth session
  const checkAuth = () => {
    const activeSession = getActiveSession();
    setSession(activeSession);
    setLoading(false);
    return activeSession;
  };

  useEffect(() => {
    checkAuth();
  }, [location.pathname]); // re-verify on route shifts

  const handleLogout = () => {
    setSession(null);
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm font-semibold text-muted-foreground">Loading ERP Nexus...</p>
        </div>
      </div>
    );
  }

  // Redirect to Auth page if not logged in
  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* Sidebar Drawer */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        user={session}
      />

      {/* Main Panel Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Navbar */}
        <Navbar 
          onOpenSidebar={() => setSidebarOpen(true)} 
          user={session}
          onLogout={handleLogout}
        />

        {/* Dynamic Route Children Router Outlets */}
        <main className="flex-1 overflow-y-auto px-6 py-6 focus:outline-none">
          <div className="mx-auto max-w-7xl animate-fade-in">
            <Outlet context={{ user: session, onUpdateSession: checkAuth }} />
          </div>
        </main>
      </div>
    </div>
  );
};
export default Layout;
