import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function SetupAuthPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const handleQuickSetup = async () => {
    setLoading(true);
    setError('');

    try {
      const adminEmail = 'admin@eos.local';
      const adminPassword = 'admin123';

      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: adminEmail,
        password: adminPassword,
      });

      if (signUpError) throw signUpError;

      if (authData.user) {
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            name: 'Super User',
            first_name: 'Super',
            last_name: 'User',
            email: adminEmail,
            title: 'Administrator',
            role: 'super_user',
          });

        if (insertError) throw insertError;

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: adminEmail,
          password: adminPassword,
        });

        if (signInError) throw signInError;

        window.location.href = '/';
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Welcome to EOS Platform</h1>
          <p className="text-slate-600">
            Let's get you started with instant access
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800 mb-3">
            Click below to create your admin account with these credentials:
          </p>
          <div className="bg-white rounded p-3 font-mono text-sm">
            <div className="mb-1">
              <span className="text-slate-600">Email:</span>{' '}
              <span className="font-semibold text-slate-900">admin@eos.local</span>
            </div>
            <div>
              <span className="text-slate-600">Password:</span>{' '}
              <span className="font-semibold text-slate-900">admin123</span>
            </div>
          </div>
          <p className="text-xs text-blue-700 mt-3">
            You can update your credentials after signing in.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <button
          onClick={handleQuickSetup}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg"
        >
          {loading ? 'Setting up your account...' : 'Get Started as Super User'}
        </button>

        <div className="mt-6 pt-6 border-t border-slate-200">
          <p className="text-sm text-slate-600 text-center">
            Already set up?{' '}
            <a href="/" className="text-blue-600 hover:text-blue-700 font-medium">
              Sign In
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
