import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Menu, 
  Search, 
  Sun, 
  Moon, 
  LogOut, 
  ChevronDown, 
  ArrowRight,
  Shield,
  Loader2
} from 'lucide-react';
import { 
  getDatabaseStatus, 
  logoutUser, 
  runGlobalSearch 
} from '../../services/db';
import type { 
  SessionUser, 
  GlobalSearchResult 
} from '../../services/db';
import type { DatabaseStatus } from '../../types';

interface NavbarProps {
  onOpenSidebar: () => void;
  user: SessionUser | null;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenSidebar, user, onLogout }) => {
  const navigate = useNavigate();
  const [dbStatus, setDbStatus] = useState<DatabaseStatus>({
    isSupabase: false,
    connected: false,
    message: 'Checking...'
  });
  
  // Theme state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return document.documentElement.classList.contains('dark') || 
      localStorage.getItem('theme') === 'dark';
  });

  // Global search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GlobalSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  
  // Profile menu dropdown
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Load database status
  useEffect(() => {
    const fetchStatus = async () => {
      const status = await getDatabaseStatus();
      setDbStatus(status);
    };
    fetchStatus();
    // Refresh status check every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // Theme effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // Click outside search & profile dropdown to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchDropdown(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Run Search
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (searchQuery.trim().length >= 2) {
        setIsSearching(true);
        try {
          const res = await runGlobalSearch(searchQuery);
          setSearchResults(res);
          setShowSearchDropdown(true);
        } catch (err) {
          console.error(err);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
        setShowSearchDropdown(false);
      }
    }, 250);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  // Breadcrumbs title resolver


  const handleSearchResultClick = (url: string) => {
    setSearchQuery('');
    setShowSearchDropdown(false);
    navigate(url);
  };

  const handleLogoutClick = async () => {
    await logoutUser();
    onLogout();
    navigate('/auth');
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur-md">
      {/* Left: Hamburger & Global Search */}
      <div className="flex items-center gap-4 flex-1 min-w-0 mr-4">
        <button
          onClick={onOpenSidebar}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted lg:hidden shrink-0"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Global Search */}
        <div ref={searchRef} className="relative w-full max-w-md hidden md:block">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search products, customers, invoices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.trim().length >= 2 && setShowSearchDropdown(true)}
              className="w-full rounded-xl border border-input bg-card py-2 pl-10 pr-4 text-sm outline-none ring-primary/20 transition-all focus:border-primary focus:ring-4"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>

          {/* Search Results Dropdown */}
          {showSearchDropdown && (
            <div className="absolute left-0 mt-2 w-full rounded-2xl border border-border bg-card p-2 shadow-xl ring-1 ring-black/5 animate-slide-up">
              {searchResults.length > 0 ? (
                <div className="max-h-80 overflow-y-auto space-y-1">
                  <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Search Results</p>
                  {searchResults.map((result) => (
                    <button
                      key={`${result.type}-${result.id}`}
                      onClick={() => handleSearchResultClick(result.url)}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left hover:bg-muted transition-colors"
                    >
                      <div>
                        <span className={`inline-block rounded-md px-1.5 py-0.5 text-[10px] font-semibold mb-1
                          ${result.type === 'Product' ? 'bg-primary/10 text-primary' : ''}
                          ${result.type === 'Customer' ? 'bg-green-500/10 text-green-600 dark:text-green-400' : ''}
                          ${result.type === 'Supplier' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : ''}
                          ${result.type === 'Sale' ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400' : ''}
                          ${result.type === 'Purchase' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' : ''}
                        `}>
                          {result.type}
                        </span>
                        <h4 className="text-sm font-semibold text-foreground">{result.title}</h4>
                        <p className="text-xs text-muted-foreground">{result.subtitle}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                  No matches found for "{searchQuery}"
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right: Actions (Theme, DB Status, User Profile) */}
      <div className="flex items-center gap-3">
        {/* Database Status Indicator Dot */}
        <div 
          className="relative group flex items-center gap-1.5 cursor-help mr-1"
          title={dbStatus.message}
        >
          <span className={`relative flex h-2 w-2 rounded-full ${
            dbStatus.connected 
              ? 'bg-green-500' 
              : dbStatus.isSupabase 
                ? 'bg-amber-500 animate-pulse' 
                : 'bg-primary'
          }`}>
            {dbStatus.connected && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            )}
          </span>
          <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider hidden md:inline-block">
            {dbStatus.connected ? 'Cloud Synced' : 'Local Storage'}
          </span>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="rounded-xl border border-border bg-card p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Toggle Theme"
        >
          {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        {/* User Profile Dropdown */}
        {user && (
          <div ref={profileRef} className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-sm font-semibold hover:bg-muted transition-colors"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs">
                {user.name.charAt(0)}
              </div>
              <span className="max-w-[80px] truncate hidden sm:inline">{user.name.split(' ')[0]}</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-48 rounded-2xl border border-border bg-card p-1.5 shadow-xl ring-1 ring-black/5 animate-slide-up">
                <div className="px-3 py-2 border-b border-border mb-1">
                  <p className="text-xs font-semibold text-foreground truncate">{user.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                  <div className="flex items-center gap-1 mt-1 text-[10px] font-bold text-primary">
                    <Shield className="h-3 w-3" />
                    <span>{user.role} Privilege</span>
                  </div>
                </div>
                <button
                  onClick={handleLogoutClick}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
export default Navbar;
