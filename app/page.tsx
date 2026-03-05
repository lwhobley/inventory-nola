'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { LogOut, User, Lock, LayoutDashboard, Package, DollarSign, BarChart3, Trash2 } from 'lucide-react';

import Sidebar from './sections/Sidebar';
import DashboardOverview from './sections/DashboardOverview';
import InventoryManagement from './sections/InventoryManagement';
import FinancialDashboard from './sections/FinancialDashboard';
import VarianceReports from './sections/VarianceReports';
import WasteTracker from './sections/WasteTracker';
import InventoryAlerts from './sections/InventoryAlerts';
import StockTransfer from './sections/StockTransfer';
import StaffManagement from './staff/page';

const AGENTS = [
  { id: '69a5b1a3f2d0d9c8063d1a47', name: 'Financial Insights', purpose: 'COGS & revenue analysis', tab: 'financial' },
  { id: '69a5b1a33fe08f1e2b19b91e', name: 'Inventory Intelligence', purpose: 'Stock & reorder analysis', tab: 'inventory' },
  { id: '69a5b1a38413529629dda599', name: 'Variance Analyst', purpose: 'Theoretical vs physical variance', tab: 'variance' },
];

const TAB_ICONS: Record<string, React.ReactNode> = {
  financial: <DollarSign className="w-3.5 h-3.5" />,
  inventory: <Package className="w-3.5 h-3.5" />,
  variance: <BarChart3 className="w-3.5 h-3.5" />,
};

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: '' };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-900">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-slate-500 mb-4 text-sm">{this.state.error}</p>
            <button
              onClick={() => this.setState({ hasError: false, error: '' })}
              className="px-4 py-2 bg-teal-600 text-white rounded-md text-sm hover:bg-teal-700 transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function Page() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedLocation, setSelectedLocation] = useState('All Locations');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);
  const { currentUser, logout, isOwner } = useAuth();

  return (
    <ErrorBoundary>
      <div className="flex h-screen bg-slate-50">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          selectedLocation={selectedLocation}
          setSelectedLocation={setSelectedLocation}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
        />

        <main className="flex-1 overflow-auto">
          {/* Top Header with User Info */}
          <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3 pl-10 md:pl-0">
              {activeTab === 'dashboard' && <LayoutDashboard className="w-5 h-5 text-teal-600" />}
              {activeTab === 'inventory' && <Package className="w-5 h-5 text-teal-600" />}
              {activeTab === 'financial' && <DollarSign className="w-5 h-5 text-teal-600" />}
              {activeTab === 'variance' && <BarChart3 className="w-5 h-5 text-teal-600" />}
              {activeTab === 'waste' && <Trash2 className="w-5 h-5 text-teal-600" />}
              <span className="text-sm font-medium text-slate-700 capitalize">
                {activeTab === 'financial' ? 'Financial Reports' : activeTab === 'variance' ? 'Variance Analysis' : activeTab === 'waste' ? 'Waste Tracker' : activeTab}
              </span>
            </div>
            
            {/* User Info and Controls */}
            <div className="flex items-center gap-4">
              {/* User Profile */}
              <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
                <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center">
                  <User className="w-4 h-4 text-teal-700" />
                </div>
                <div className="hidden sm:block text-sm">
                  <p className="font-medium text-slate-900">{currentUser?.name}</p>
                  <p className="text-xs text-slate-500 capitalize flex items-center gap-1">
                    {isOwner && <Lock className="w-3 h-3" />}
                    {currentUser?.role}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={logout}
                  className="ml-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {activeTab === 'dashboard' && <DashboardOverview setActiveTab={setActiveTab} selectedLocation={selectedLocation} />}
          {activeTab === 'inventory' && <InventoryManagement selectedLocation={selectedLocation} activeAgentId={activeAgentId} setActiveAgentId={setActiveAgentId} />}
          {activeTab === 'alerts' && <InventoryAlerts />}
          {activeTab === 'transfers' && <StockTransfer />}
          {activeTab === 'financial' && <FinancialDashboard selectedLocation={selectedLocation} activeAgentId={activeAgentId} setActiveAgentId={setActiveAgentId} />}
          {activeTab === 'variance' && <VarianceReports selectedLocation={selectedLocation} activeAgentId={activeAgentId} setActiveAgentId={setActiveAgentId} />}
          {activeTab === 'waste' && <WasteTracker selectedLocation={selectedLocation} />}
          {activeTab === 'staff' && <StaffManagement />}

          <div className="px-6 py-4 border-t border-slate-200 bg-white">
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">AI Agents</p>
                  {activeAgentId && (
                    <Badge className="bg-teal-100 text-teal-700 border-teal-200 text-xs animate-pulse">Processing</Badge>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {AGENTS.map((agent) => {
                    const isActive = activeAgentId === agent.id;
                    return (
                      <button
                        key={agent.id}
                        onClick={() => setActiveTab(agent.tab)}
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${isActive ? 'border-teal-300 bg-teal-50 shadow-sm' : 'border-slate-100 bg-slate-50 hover:bg-slate-100'}`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isActive ? 'bg-teal-600' : 'bg-slate-200'}`}>
                          <span className={isActive ? 'text-white' : 'text-slate-500'}>{TAB_ICONS[agent.tab]}</span>
                        </div>
                        <div className="min-w-0">
                          <p className={`text-xs font-semibold ${isActive ? 'text-teal-800' : 'text-slate-700'}`}>{agent.name}</p>
                          <p className="text-[10px] text-slate-500 truncate">{agent.purpose}</p>
                        </div>
                        <div className={`ml-auto w-2 h-2 rounded-full shrink-0 ${isActive ? 'bg-teal-500 animate-pulse' : 'bg-slate-300'}`} />
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </ErrorBoundary>
  );
}
