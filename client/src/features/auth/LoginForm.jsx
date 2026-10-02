import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BedDouble, LogIn, Shield, PhoneCall, Building2 } from 'lucide-react';
import { useAuth } from './useAuth';
import { Button } from '../../components/Button';
import { ROUTES } from '../../constants/routes';
import { useToast } from '../../components/Toast';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both email and password');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const user = await login({ email, password });
      showToast({
        title: 'Signed in successfully',
        message: `Welcome back, ${user.name || user.email}`,
        type: 'success',
      });

      if (user.role === 'ADMIN') {
        navigate(ROUTES.ADMIN_DASHBOARD);
      } else if (user.role === 'DISPATCHER') {
        navigate(ROUTES.DISPATCHER_DASHBOARD);
      } else if (user.role === 'HOSPITAL') {
        navigate(ROUTES.HOSPITAL_DASHBOARD);
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFill = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError('');
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-surface border border-border rounded-xl shadow-raised p-8">
        {/* Brand header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary-soft flex items-center justify-center text-primary mb-3 shadow-sm">
            <BedDouble className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-text">BedLink</h1>
          <p className="text-sm text-text-muted mt-1 font-medium">Find the right bed. Right now.</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-danger-soft border border-danger/20 rounded-md text-xs font-medium text-danger text-center animate-in fade-in">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. dispatcher@bedlink.demo"
              className="w-full h-11 px-3.5 bg-surface border border-border rounded-md text-sm text-text placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-focus focus:border-transparent transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text uppercase tracking-wider mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full h-11 px-3.5 bg-surface border border-border rounded-md text-sm text-text placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-focus focus:border-transparent transition-all"
              required
            />
          </div>

          <Button
            type="submit"
            size="lg"
            variant="primary"
            isLoading={isLoading}
            icon={LogIn}
            className="w-full mt-2"
          >
            Sign In
          </Button>
        </form>

        {/* Demo Accounts Quick-Fill Section */}
        <div className="mt-8 pt-6 border-t border-border">
          <p className="text-xs font-semibold text-text-subtle uppercase tracking-wider text-center mb-3">
            Demo Accounts (1-Click Fill)
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickFill('dispatcher@bedlink.demo', 'DemoPass123!')}
              className="flex flex-col items-center p-2.5 rounded-lg border border-border hover:border-primary/50 hover:bg-primary-soft/30 transition-all text-center group"
            >
              <PhoneCall className="w-4 h-4 text-primary mb-1 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-medium text-text">Dispatcher</span>
              <span className="text-[10px] text-text-subtle">Control room</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickFill('hospital@bedlink.demo', 'DemoPass123!')}
              className="flex flex-col items-center p-2.5 rounded-lg border border-border hover:border-primary/50 hover:bg-primary-soft/30 transition-all text-center group"
            >
              <Building2 className="w-4 h-4 text-success mb-1 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-medium text-text">Hospital</span>
              <span className="text-[10px] text-text-subtle">Bed staff</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickFill('admin@bedlink.demo', 'DemoPass123!')}
              className="flex flex-col items-center p-2.5 rounded-lg border border-border hover:border-primary/50 hover:bg-primary-soft/30 transition-all text-center group"
            >
              <Shield className="w-4 h-4 text-warning mb-1 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-medium text-text">Admin</span>
              <span className="text-[10px] text-text-subtle">Full access</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
