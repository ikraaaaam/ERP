import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import * as zod from 'zod';
import { 
  KeyRound, 
  Mail, 
  User, 
  ShieldCheck, 
  Lock, 
  ArrowRight,
  Eye,
  EyeOff,
  Database
} from 'lucide-react';
import { getActiveSession, logActivity } from '../services/db';

// Custom lightweight Zod Resolver for React Hook Form to avoid npm 404 package issues
const zodResolver = (schema: any) => async (values: any) => {
  try {
    const data = schema.parse(values);
    return { values: data, errors: {} };
  } catch (err: any) {
    const errors: any = {};
    if (err.errors) {
      err.errors.forEach((e: any) => {
        const field = e.path[0];
        errors[field] = {
          message: e.message,
          type: e.code
        };
      });
    }
    return { values: {}, errors };
  }
};


// Forms Validations Schemas
const loginSchema = zod.object({
  email: zod.string().email({ message: 'Provide a valid email address.' }),
  password: zod.string().min(6, { message: 'Password must be at least 6 characters.' })
});

const registerSchema = zod.object({
  name: zod.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: zod.string().email({ message: 'Provide a valid email address.' }),
  password: zod.string().min(6, { message: 'Password must be at least 6 characters.' }),
  role: zod.enum(['Admin', 'Staff'])
});

const forgotSchema = zod.object({
  email: zod.string().email({ message: 'Provide a valid email address.' })
});

const resetSchema = zod.object({
  password: zod.string().min(6, { message: 'Password must be at least 6 characters.' }),
  confirmPassword: zod.string().min(6, { message: 'Password must be at least 6 characters.' })
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords must match",
  path: ["confirmPassword"]
});

type AuthView = 'login' | 'register' | 'forgot' | 'reset';

export const Auth: React.FC = () => {
  const [view, setView] = useState<AuthView>('login');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();

  // Redirect if session already exists
  React.useEffect(() => {
    if (getActiveSession()) {
      navigate('/');
    }
  }, [navigate]);

  // Form Hooks
  const { register: loginReg, handleSubmit: handleLoginSubmit, formState: { errors: loginErrors }, setValue: setLoginValue } = useForm<zod.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema)
  });

  const { register: registerReg, handleSubmit: handleRegisterSubmit, formState: { errors: registerErrors } } = useForm<zod.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: 'Staff' }
  });

  const { register: forgotReg, handleSubmit: handleForgotSubmit, formState: { errors: forgotErrors } } = useForm<zod.infer<typeof forgotSchema>>({
    resolver: zodResolver(forgotSchema)
  });

  const { register: resetReg, handleSubmit: handleResetSubmit, formState: { errors: resetErrors } } = useForm<zod.infer<typeof resetSchema>>({
    resolver: zodResolver(resetSchema)
  });

  // Login handler
  const onLogin = async (data: zod.infer<typeof loginSchema>) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      // Simulate Database Verification
      const localUsers = JSON.parse(localStorage.getItem('erp_users') || '[]');
      const user = localUsers.find((u: any) => u.email.toLowerCase() === data.email.toLowerCase());
      
      // Basic login authentication check
      if (!user) {
        throw new Error('No user account matches this email.');
      }
      
      // Simulate pass check (mock matches)
      if (data.password.length < 6) {
        throw new Error('Incorrect credentials.');
      }

      // Establish session
      const sessionData = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      };
      
      localStorage.setItem('erp_session', JSON.stringify(sessionData));
      await logActivity('USER_LOGIN', `${user.name} logged in successfully.`);
      navigate('/');
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  // Register handler
  const onRegister = async (data: zod.infer<typeof registerSchema>) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const localUsers = JSON.parse(localStorage.getItem('erp_users') || '[]');
      if (localUsers.some((u: any) => u.email.toLowerCase() === data.email.toLowerCase())) {
        throw new Error('This email is already registered.');
      }

      const newUser = {
        id: `user-${Date.now()}`,
        email: data.email,
        name: data.name,
        role: data.role
      };

      localUsers.push(newUser);
      localStorage.setItem('erp_users', JSON.stringify(localUsers));

      // Establish session directly
      localStorage.setItem('erp_session', JSON.stringify(newUser));
      await logActivity('USER_REGISTER', `New user registered: ${data.name} (${data.role}).`);
      navigate('/');
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  // Forgot password
  const onForgot = async (data: zod.infer<typeof forgotSchema>) => {
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const localUsers = JSON.parse(localStorage.getItem('erp_users') || '[]');
      const exists = localUsers.some((u: any) => u.email.toLowerCase() === data.email.toLowerCase());
      if (!exists) {
        throw new Error('No account found under this email.');
      }
      setSuccessMsg('A password reset link was dispatched to your inbox (simulated).');
      // Forward to mock reset view
      setTimeout(() => setView('reset'), 2500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Request failed.');
    } finally {
      setLoading(false);
    }
  };

  // Reset password
  const onReset = async (_data: zod.infer<typeof resetSchema>) => {
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      setSuccessMsg('Password updated successfully! Redirecting to login...');
      setTimeout(() => {
        setSuccessMsg(null);
        setView('login');
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Update failed.');
    } finally {
      setLoading(false);
    }
  };

  // Quick Login Demo Helpers
  const fillCredentials = (role: 'Admin' | 'Staff') => {
    if (role === 'Admin') {
      setLoginValue('email', 'admin@erpnexus.com');
      setLoginValue('password', 'admin123');
    } else {
      setLoginValue('email', 'staff@erpnexus.com');
      setLoginValue('password', 'staff123');
    }
  };

  return (
    <div className="relative flex min-h-screen w-screen flex-col items-center justify-center bg-[#0B0F19] px-4 overflow-hidden">
      {/* Decorative gradient glowing bubbles */}
      <div className="absolute top-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] h-[500px] w-[500px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

      {/* Auth Portal Branding */}
      <div className="mb-6 flex flex-col items-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full overflow-hidden border border-primary/30 bg-card shadow-lg shadow-primary/10">
          <img src="/logo.png" alt="Code Bondhu IT Logo" className="h-full w-full object-cover" />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-white tracking-tight">Code Bondhu IT</h1>
        <p className="text-xs text-muted-foreground mt-1">Enterprise Resource Planning Portal</p>
      </div>

      {/* Main Glassmorphic Form Card */}
      <div className="w-full max-w-md rounded-3xl border border-white/5 bg-[#111827]/75 p-8 shadow-2xl backdrop-blur-md">
        {/* VIEW: LOGIN */}
        {view === 'login' && (
          <form onSubmit={handleLoginSubmit(onLogin)} className="space-y-5">
            <div>
              <h2 className="text-lg font-bold text-white">Welcome back</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Access your inventory dashboard panel.</p>
            </div>

            {errorMsg && (
              <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs font-medium text-red-400">
                {errorMsg}
              </div>
            )}

            <div className="space-y-4">
              {/* Email */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Work Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
                  <input
                    type="email"
                    placeholder="name@company.com"
                    {...loginReg('email')}
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white outline-none ring-primary/20 transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:ring-4 focus:bg-white/10"
                  />
                </div>
                {loginErrors.email && (
                  <p className="text-[10px] font-medium text-red-400 mt-1">{loginErrors.email.message}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-muted-foreground">Password</label>
                  <button 
                    type="button" 
                    onClick={() => setView('forgot')}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Forgot?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    {...loginReg('password')}
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-10 text-sm text-white outline-none ring-primary/20 transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:ring-4 focus:bg-white/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3.5 text-muted-foreground hover:text-white"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {loginErrors.password && (
                  <p className="text-[10px] font-medium text-red-400 mt-1">{loginErrors.password.message}</p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/20 hover:bg-primary-hover active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>

            {/* Quick Demo Logins */}
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
                <Database className="h-3.5 w-3.5 text-primary" />
                <span>Quick Seed Logins (Local Storage Mode)</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => fillCredentials('Admin')}
                  className="rounded-lg bg-white/5 border border-white/5 px-2 py-1.5 text-left text-xs text-white hover:bg-white/10 transition-colors"
                >
                  <span className="block font-bold text-primary">Admin User</span>
                  <span className="text-[10px] text-muted-foreground truncate block">admin@erpnexus.com</span>
                </button>
                <button
                  type="button"
                  onClick={() => fillCredentials('Staff')}
                  className="rounded-lg bg-white/5 border border-white/5 px-2 py-1.5 text-left text-xs text-white hover:bg-white/10 transition-colors"
                >
                  <span className="block font-bold text-green-400">Staff User</span>
                  <span className="text-[10px] text-muted-foreground truncate block">staff@erpnexus.com</span>
                </button>
              </div>
            </div>

            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                Don't have an account?{' '}
                <button 
                  type="button" 
                  onClick={() => setView('register')}
                  className="font-semibold text-primary hover:underline"
                >
                  Create one
                </button>
              </p>
            </div>
          </form>
        )}

        {/* VIEW: REGISTER */}
        {view === 'register' && (
          <form onSubmit={handleRegisterSubmit(onRegister)} className="space-y-5">
            <div>
              <h2 className="text-lg font-bold text-white">Create workspace profile</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Register a new system user profile.</p>
            </div>

            {errorMsg && (
              <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs font-medium text-red-400">
                {errorMsg}
              </div>
            )}

            <div className="space-y-4">
              {/* Name */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="John Doe"
                    {...registerReg('name')}
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white outline-none ring-primary/20 transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:ring-4 focus:bg-white/10"
                  />
                </div>
                {registerErrors.name && (
                  <p className="text-[10px] font-medium text-red-400 mt-1">{registerErrors.name.message}</p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Work Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
                  <input
                    type="email"
                    placeholder="name@company.com"
                    {...registerReg('email')}
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white outline-none ring-primary/20 transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:ring-4 focus:bg-white/10"
                  />
                </div>
                {registerErrors.email && (
                  <p className="text-[10px] font-medium text-red-400 mt-1">{registerErrors.email.message}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    {...registerReg('password')}
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white outline-none ring-primary/20 transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:ring-4 focus:bg-white/10"
                  />
                </div>
                {registerErrors.password && (
                  <p className="text-[10px] font-medium text-red-400 mt-1">{registerErrors.password.message}</p>
                )}
              </div>

              {/* Role */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">System Privilege Role</label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
                  <select
                    {...registerReg('role')}
                    className="w-full rounded-xl border border-white/10 bg-[#1f2937] py-2.5 pl-10 pr-4 text-sm text-white outline-none ring-primary/20 transition-all focus:border-primary focus:ring-4 focus:bg-white/10"
                  >
                    <option value="Staff">Staff (Read/Write/Edit)</option>
                    <option value="Admin">Admin (Full Privilege & Delete Access)</option>
                  </select>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/20 hover:bg-primary-hover active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loading ? 'Creating Account...' : 'Register Profile'}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>

            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                Already have an account?{' '}
                <button 
                  type="button" 
                  onClick={() => setView('login')}
                  className="font-semibold text-primary hover:underline"
                >
                  Sign in
                </button>
              </p>
            </div>
          </form>
        )}

        {/* VIEW: FORGOT PASSWORD */}
        {view === 'forgot' && (
          <form onSubmit={handleForgotSubmit(onForgot)} className="space-y-5">
            <div>
              <h2 className="text-lg font-bold text-white">Reset credentials</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Receive a secure link to access your account.</p>
            </div>

            {errorMsg && (
              <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs font-medium text-red-400">
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-3 text-xs font-medium text-green-400">
                {successMsg}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
                <input
                  type="email"
                  placeholder="name@company.com"
                  {...forgotReg('email')}
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white outline-none ring-primary/20 transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:ring-4 focus:bg-white/10"
                />
              </div>
              {forgotErrors.email && (
                <p className="text-[10px] font-medium text-red-400 mt-1">{forgotErrors.email.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/20 hover:bg-primary-hover transition-all"
            >
              {loading ? 'Sending link...' : 'Send Recovery Link'}
            </button>

            <div className="text-center">
              <button 
                type="button" 
                onClick={() => setView('login')}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Back to sign in
              </button>
            </div>
          </form>
        )}

        {/* VIEW: RESET PASSWORD */}
        {view === 'reset' && (
          <form onSubmit={handleResetSubmit(onReset)} className="space-y-5">
            <div>
              <h2 className="text-lg font-bold text-white">Create new password</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Please finalize your new account password.</p>
            </div>

            {errorMsg && (
              <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs font-medium text-red-400">
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-3 text-xs font-medium text-green-400">
                {successMsg}
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">New Password</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    {...resetReg('password')}
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white outline-none ring-primary/20 transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:ring-4 focus:bg-white/10"
                  />
                </div>
                {resetErrors.password && (
                  <p className="text-[10px] font-medium text-red-400 mt-1">{resetErrors.password.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Confirm New Password</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    {...resetReg('confirmPassword')}
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white outline-none ring-primary/20 transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:ring-4 focus:bg-white/10"
                  />
                </div>
                {resetErrors.confirmPassword && (
                  <p className="text-[10px] font-medium text-red-400 mt-1">{resetErrors.confirmPassword.message}</p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/20 hover:bg-primary-hover transition-all"
            >
              {loading ? 'Saving...' : 'Save and Sign In'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
export default Auth;
