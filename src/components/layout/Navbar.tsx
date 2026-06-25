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
  
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return document.documentElement.classList.contains('dark') || 
      localStorage.getItem('theme') === 'dark';
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GlobalSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      const status = await getDatabaseStatus();
      setDbStatus(status);
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

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
    <header
      className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-card/90 dark:bg-[hsl(215_28%_7%/0.9)] px-6 backdrop-blur-xl"
    >
      {/* Left: Hamburger & Global Search */}
      <div className="flex items-center gap-3 flex-1 min-w-0 mr-6">
        <button
          onClick={onOpenSidebar}
          className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground lg:hidden shrink-0"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Global Search */}
        <div ref={searchRef} className="relative w-full max-w-sm hidden md:block">
          <div className="relative">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search products, customers, invoices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.trim().length >= 2 && setShowSearchDropdown(true)}
              className="w-full rounded-full border border-border bg-muted dark:bg-[hsl(215_28%_11%)] py-2 pl-10 pr-4 text-sm outline-none transition-all focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
            />
            {isSearching && (
              <Loader2 className="absolute right-3.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>

          {/* Search Results Dropdown */}
          {showSearchDropdown && (
            <div className="absolute left-0 mt-2 w-full rounded-2xl border border-border bg-card p-2 shadow-2xl animate-slide-up z-50">
              {searchResults.length > 0 ? (
                <div className="max-h-72 overflow-y-auto space-y-0.5">
                  <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Results</p>
                  {searchResults.map((result) => (
                    <button
                      key={`${result.type}-${result.id}`}
                      onClick={() => handleSearchResultClick(result.url)}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left hover:bg-muted transition-colors"
                    >
                      <div>
                        <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold mb-0.5
                          ${result.type === 'Product' ? 'bg-primary/10 text-primary' : ''}
                          ${result.type === 'Customer' ? 'bg-green-500/10 text-green-400' : ''}
                          ${result.type === 'Supplier' ? 'bg-amber-500/10 text-amber-400' : ''}
                          ${result.type === 'Sale' ? 'bg-purple-500/10 text-purple-400' : ''}
                          ${result.type === 'Purchase' ? 'bg-rose-500/10 text-rose-400' : ''}
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
                <div className="px-4 py-5 text-center text-sm text-muted-foreground">
                  No matches found for "{searchQuery}"
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {/* DB Status */}
        <div 
          className="flex items-center gap-1.5 cursor-help"
          title={dbStatus.message}
        >
          <span className={`relative flex h-2 w-2 rounded-full ${
            dbStatus.connected 
              ? 'bg-green-400' 
              : dbStatus.isSupabase 
                ? 'bg-amber-400 animate-pulse' 
                : 'bg-primary'
          }`}>
            {dbStatus.connected && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-50"></span>
            )}
          </span>
          <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest hidden md:inline-block">
            {dbStatus.connected ? 'Cloud Synced' : 'Local Storage'}
          </span>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="rounded-xl p-2 text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
          aria-label="Toggle Theme"
        >
          {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        {/* User Profile */}
        {user && (
          <div ref={profileRef} className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-semibold hover:bg-muted transition-colors border border-border bg-card"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white text-xs font-bold">
                {user.name.charAt(0)}
              </div>
              <span className="max-w-[80px] truncate hidden sm:inline text-foreground">{user.name.split(' ')[0]}</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-52 rounded-2xl border border-border bg-card p-1.5 shadow-2xl animate-slide-up z-50">
                <div className="px-3 py-2.5 border-b border-border mb-1">
                  <p className="text-sm font-semibold text-foreground truncate">{user.name}</p>
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
