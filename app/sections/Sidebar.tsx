'use client';

import React from 'react';
import { useAuth } from '@/lib/auth-context';
import { Trees, LayoutDashboard, Package, CreditCard, DollarSign, BarChart3, Trash2, Menu, X, Users } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedLocation: string;
  setSelectedLocation: (loc: string) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: MdDashboard },
  { id: 'inventory', label: 'Inventory', icon: MdInventory },
  { id: 'pos', label: 'POS Sales', icon: MdPointOfSale },
  { id: 'financial', label: 'Financial Reports', icon: MdAttachMoney },
  { id: 'variance', label: 'Variance Analysis', icon: MdCompareArrows },
  { id: 'waste', label: 'Waste Tracker', icon: MdDelete },
];

const LOCATIONS = [
  'All Locations',
  'Cafe du Monde Kiosk',
  'Storyland Snacks',
  'Morning Call Stand',
  'Carousel Bar',
  'Pavilion Grill',
];

export default function Sidebar({
  activeTab,
  setActiveTab,
  selectedLocation,
  setSelectedLocation,
  mobileOpen,
  setMobileOpen,
}: SidebarProps) {
  const { isOwner } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'pos', label: 'POS Sales', icon: CreditCard },
    { id: 'financial', label: 'Financial Reports', icon: DollarSign },
    { id: 'variance', label: 'Variance Analysis', icon: BarChart3 },
    { id: 'waste', label: 'Waste Tracker', icon: Trash2 },
    ...(isOwner ? [{ id: 'staff', label: 'Staff Management', icon: Users }] : []),
  ];
  return (
    <>
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-4 left-4 z-50 md:hidden p-2 rounded-lg bg-slate-800 text-white shadow-lg"
      >
        {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed md:static z-40 flex flex-col h-screen w-64 bg-gradient-to-b from-slate-800 to-slate-900 text-white transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-700">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-teal-600">
            <Trees className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold leading-tight">NOLA City Park</h1>
            <p className="text-xs text-slate-400">Inventory & COGS</p>
          </div>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-teal-600/20 text-teal-400 border border-teal-600/30'
                    : 'text-slate-300 hover:bg-slate-700/50 hover:text-white border border-transparent'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-teal-400' : 'text-slate-400'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="px-4 py-4 border-t border-slate-700">
          <label className="text-xs text-slate-400 mb-1.5 block">Current Location</label>
          <Select value={selectedLocation} onValueChange={setSelectedLocation}>
            <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white text-xs h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LOCATIONS.map((loc) => (
                <SelectItem key={loc} value={loc}>
                  {loc}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="px-4 py-3 border-t border-slate-700">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-slate-400">System Online</span>
          </div>
        </div>
      </aside>
    </>
  );
}
