'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, AlertTriangle, Play, FileText, Trash2 } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface DashboardOverviewProps {
  setActiveTab: (tab: string) => void;
  selectedLocation: string;
}

const SPARKLINE_DATA = {
  revenue: [
    { v: 12400 }, { v: 13200 }, { v: 11800 }, { v: 14100 }, { v: 13500 }, { v: 15200 }, { v: 14800 },
  ],
  cogs: [
    { v: 4200 }, { v: 4500 }, { v: 4100 }, { v: 4800 }, { v: 4600 }, { v: 5100 }, { v: 4900 },
  ],
  margin: [
    { v: 66 }, { v: 65 }, { v: 67 }, { v: 66 }, { v: 65 }, { v: 67 }, { v: 67 },
  ],
  waste: [
    { v: 3.2 }, { v: 2.8 }, { v: 3.5 }, { v: 2.9 }, { v: 3.1 }, { v: 2.7 }, { v: 2.6 },
  ],
};

const ALERTS = [
  { id: 1, type: 'critical', message: 'Beignet Mix below par level at Cafe du Monde Kiosk', time: '12 min ago' },
  { id: 2, type: 'warning', message: 'Hot dog buns variance detected at Pavilion Grill (8.2%)', time: '45 min ago' },
  { id: 3, type: 'warning', message: 'Waste spike: 14 ice cream units expired at Storyland Snacks', time: '1 hr ago' },
  { id: 4, type: 'info', message: 'Morning count completed at Morning Call Stand', time: '2 hrs ago' },
  { id: 5, type: 'critical', message: 'Soft drink syrup critically low at Carousel Bar', time: '3 hrs ago' },
];

export default function DashboardOverview({ setActiveTab, selectedLocation }: DashboardOverviewProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const kpis = [
    { label: 'Total Revenue', value: '$14,820', trend: '+8.3%', up: true, data: SPARKLINE_DATA.revenue, color: '#0d9488' },
    { label: 'Total COGS', value: '$4,946', trend: '+5.1%', up: true, data: SPARKLINE_DATA.cogs, color: '#ef4444' },
    { label: 'Gross Margin', value: '66.6%', trend: '+1.2%', up: true, data: SPARKLINE_DATA.margin, color: '#10b981' },
    { label: 'Waste %', value: '2.6%', trend: '-0.5%', up: false, data: SPARKLINE_DATA.waste, color: '#f59e0b' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Dashboard</h2>
          <p className="text-sm text-slate-500 mt-0.5">{selectedLocation} &middot; Today&apos;s Overview</p>
        </div>
        <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200">Live</Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="border-slate-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{kpi.label}</span>
                <span className={`flex items-center text-xs font-semibold ${kpi.label === 'Waste %' ? (kpi.up ? 'text-red-500' : 'text-green-600') : (kpi.up ? 'text-green-600' : 'text-red-500')}`}>
                  {kpi.up ? <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> : <TrendingDown className="w-3.5 h-3.5 mr-0.5" />}
                  {kpi.trend}
                </span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{kpi.value}</p>
              {mounted && (
                <div className="h-10 mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={kpi.data}>
                      <Line type="monotone" dataKey="v" stroke={kpi.color} strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-3 border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-slate-900">Recent Alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {ALERTS.map((alert) => (
              <div key={alert.id} className={`flex items-start gap-3 p-3 rounded-lg ${alert.type === 'critical' ? 'bg-red-50 border border-red-100' : alert.type === 'warning' ? 'bg-amber-50 border border-amber-100' : 'bg-slate-50 border border-slate-100'}`}>
                <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${alert.type === 'critical' ? 'text-red-500' : alert.type === 'warning' ? 'text-amber-500' : 'text-slate-400'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700">{alert.message}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{alert.time}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-slate-900">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={() => setActiveTab('inventory')} variant="outline" className="w-full justify-start gap-3 h-12 text-left border-slate-200 hover:bg-teal-50 hover:border-teal-200 hover:text-teal-700">
              <Play className="w-5 h-5 text-teal-600" />
              <div>
                <p className="text-sm font-medium">Start Morning Count</p>
                <p className="text-xs text-slate-400">Physical inventory check</p>
              </div>
            </Button>
            <Button onClick={() => setActiveTab('waste')} variant="outline" className="w-full justify-start gap-3 h-12 text-left border-slate-200 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-700">
              <Trash2 className="w-5 h-5 text-amber-600" />
              <div>
                <p className="text-sm font-medium">Log Waste</p>
                <p className="text-xs text-slate-400">Record spoilage or spillage</p>
              </div>
            </Button>
            <Button onClick={() => setActiveTab('financial')} variant="outline" className="w-full justify-start gap-3 h-12 text-left border-slate-200 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700">
              <FileText className="w-5 h-5 text-emerald-600" />
              <div>
                <p className="text-sm font-medium">Generate Report</p>
                <p className="text-xs text-slate-400">Financial insights & COGS</p>
              </div>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-slate-900">Location Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { name: 'Cafe du Monde Kiosk', rev: '$4,280', items: 2, status: 'warning' },
              { name: 'Storyland Snacks', rev: '$2,150', items: 0, status: 'ok' },
              { name: 'Morning Call Stand', rev: '$3,640', items: 1, status: 'warning' },
              { name: 'Carousel Bar', rev: '$2,870', items: 3, status: 'critical' },
              { name: 'Pavilion Grill', rev: '$1,880', items: 0, status: 'ok' },
            ].map((loc) => (
              <div key={loc.name} className="p-3 rounded-lg border border-slate-200 bg-white">
                <p className="text-xs font-medium text-slate-600 truncate">{loc.name}</p>
                <p className="text-lg font-bold text-slate-900 mt-1">{loc.rev}</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <div className={`w-2 h-2 rounded-full ${loc.status === 'ok' ? 'bg-green-400' : loc.status === 'warning' ? 'bg-amber-400' : 'bg-red-400'}`} />
                  <span className="text-xs text-slate-500">
                    {loc.items === 0 ? 'All stocked' : `${loc.items} alerts`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
