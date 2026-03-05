'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const { login, users } = useAuth();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showUsers, setShowUsers] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Simulate network delay
    await new Promise((r) => setTimeout(r, 300));

    const result = login(pin);
    if (!result.success) {
      setError(result.error || 'Login failed');
      setPin('');
    }

    setLoading(false);
  };

  const handleQuickLogin = (userPin: string) => {
    setPin(userPin);
    setError('');
    const result = login(userPin);
    if (!result.success) {
      setError(result.error || 'Login failed');
      setPin('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-teal-600 flex items-center justify-center">
              <Lock className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white">Park Sync</h1>
          </div>
          <p className="text-slate-300">New Orleans City Park Inventory System</p>
        </div>

        {/* Login Card */}
        <Card className="border-0 shadow-2xl">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
            <CardTitle className="text-2xl text-slate-900">Staff Login</CardTitle>
            <CardDescription>Enter your 4-digit PIN to access the system</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pin" className="text-sm font-medium text-slate-700">
                  PIN Code
                </Label>
                <Input
                  id="pin"
                  type="password"
                  inputMode="numeric"
                  placeholder="••••"
                  value={pin}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setPin(value);
                    setError('');
                  }}
                  maxLength={4}
                  autoComplete="off"
                  className="text-center text-2xl tracking-widest h-12 font-bold border-2 border-slate-200 focus:border-teal-500 focus:ring-teal-500"
                  disabled={loading}
                />
              </div>

              {error && (
                <Alert variant="destructive" className="bg-red-50 border-red-200">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-700 ml-2">{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                disabled={pin.length !== 4 || loading}
                className="w-full h-10 bg-teal-600 hover:bg-teal-700 text-white font-semibold"
              >
                {loading ? 'Logging in...' : 'Login'}
              </Button>
            </form>

            {/* Quick Login Section */}
            <div className="mt-6 pt-6 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowUsers(!showUsers)}
                className="w-full text-sm text-teal-600 hover:text-teal-700 font-medium py-2 px-3 rounded-lg hover:bg-teal-50 transition-colors"
              >
                {showUsers ? 'Hide available users' : 'Show available users'}
              </button>

              {showUsers && (
                <div className="mt-3 space-y-2">
                  {users.filter((u) => u.active).map((user) => (
                    <button
                      key={user.id}
                      onClick={() => handleQuickLogin(user.pin)}
                      className="w-full text-left px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 hover:border-teal-300 transition-colors group"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-900 group-hover:text-teal-700">
                            {user.name}
                          </p>
                          <p className="text-xs text-slate-500 capitalize">{user.role}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-mono text-slate-400">PIN: {user.pin}</p>
                          <p className="text-xs text-slate-500">{user.location}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-slate-400 text-xs">
            © 2025 New Orleans City Park Operations. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
