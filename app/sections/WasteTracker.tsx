'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { MdDelete, MdAdd, MdTrendingDown } from 'react-icons/md';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';

interface WasteTrackerProps {
  selectedLocation: string;
}

const REASON_CODES = ['Expired', 'Spillage', 'Preparation Error', 'Customer Return', 'Quality Issue', 'Equipment Failure', 'Over-Preparation'];

const INVENTORY_ITEMS = [
  'Beignet Mix', 'Coffee Beans', 'Whole Milk', 'Powdered Sugar', 'Frying Oil',
  'Hot Dog Franks', 'Hot Dog Buns', 'Soft Drink Syrup', 'Ice Cream (Vanilla)',
  'Ice Cream (Chocolate)', 'Nachos Chips', 'Nacho Cheese', 'Draft Beer (Abita)',
  'Rum', 'Lemonade Mix', 'Cotton Candy Sugar', 'Popcorn Kernels',
  'Paper Cups (12oz)', 'Paper Cups (16oz)', 'Napkins',
];

const UNITS = ['units', 'lbs', 'oz', 'gallons', 'bags', 'cases', 'scoops'];

const INITIAL_WASTE_ENTRIES = [
  { id: 1, item: 'Ice Cream (Vanilla)', qty: 14, unit: 'scoops', reason: 'Expired', notes: 'Freezer temp rose overnight', location: 'Storyland Snacks', date: '2026-03-02', cost: '$18.20' },
  { id: 2, item: 'Hot Dog Buns', qty: 8, unit: 'units', reason: 'Quality Issue', notes: 'Stale from yesterday delivery', location: 'Pavilion Grill', date: '2026-03-02', cost: '$4.80' },
  { id: 3, item: 'Beignet Mix', qty: 2, unit: 'lbs', reason: 'Spillage', notes: 'Dropped during prep', location: 'Cafe du Monde Kiosk', date: '2026-03-02', cost: '$6.40' },
  { id: 4, item: 'Lemonade Mix', qty: 1, unit: 'gallons', reason: 'Preparation Error', notes: 'Mixed wrong ratio', location: 'Storyland Snacks', date: '2026-03-01', cost: '$3.50' },
  { id: 5, item: 'Draft Beer (Abita)', qty: 3, unit: 'units', reason: 'Equipment Failure', notes: 'Draft line malfunction', location: 'Carousel Bar', date: '2026-03-01', cost: '$15.00' },
  { id: 6, item: 'Nachos Chips', qty: 2, unit: 'bags', reason: 'Over-Preparation', notes: 'Slow afternoon', location: 'Carousel Bar', date: '2026-03-01', cost: '$5.60' },
  { id: 7, item: 'Coffee Beans', qty: 4, unit: 'oz', reason: 'Spillage', notes: 'Grinder mishap', location: 'Morning Call Stand', date: '2026-03-01', cost: '$3.20' },
];

const WEEKLY_WASTE_DATA = [
  { day: 'Mon', value: 42 },
  { day: 'Tue', value: 35 },
  { day: 'Wed', value: 28 },
  { day: 'Thu', value: 51 },
  { day: 'Fri', value: 38 },
  { day: 'Sat', value: 62 },
  { day: 'Sun', value: 47 },
];

export default function WasteTracker({ selectedLocation }: WasteTrackerProps) {
  const [wasteEntries, setWasteEntries] = useState(INITIAL_WASTE_ENTRIES);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ item: '', qty: '', unit: 'units', reason: '', notes: '' });
  const [statusMsg, setStatusMsg] = useState('');
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const handleSubmit = () => {
    if (!formData.item || !formData.qty || !formData.reason) {
      setStatusMsg('Please fill in Item, Quantity, and Reason.');
      return;
    }
    const newEntry = {
      id: wasteEntries.length + 1,
      item: formData.item,
      qty: Number(formData.qty),
      unit: formData.unit,
      reason: formData.reason,
      notes: formData.notes,
      location: selectedLocation === 'All Locations' ? 'Cafe du Monde Kiosk' : selectedLocation,
      date: '2026-03-02',
      cost: `$${(Number(formData.qty) * 2.5).toFixed(2)}`,
    };
    setWasteEntries((prev) => [newEntry, ...prev]);
    setFormData({ item: '', qty: '', unit: 'units', reason: '', notes: '' });
    setShowForm(false);
    setStatusMsg('Waste entry logged successfully.');
    setTimeout(() => setStatusMsg(''), 3000);
  };

  const todayWaste = wasteEntries.filter((e) => e.date === '2026-03-02');
  const todayTotal = todayWaste.reduce((s, e) => s + parseFloat(e.cost.replace('$', '')), 0);
  const weekTotal = WEEKLY_WASTE_DATA.reduce((s, d) => s + d.value, 0);

  const reasonCounts: Record<string, number> = {};
  wasteEntries.forEach((e) => { reasonCounts[e.reason] = (reasonCounts[e.reason] || 0) + 1; });
  const topReason = Object.entries(reasonCounts).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Waste Tracker</h2>
          <p className="text-sm text-slate-500 mt-0.5">Log and track waste, spoilage, and spillage</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="bg-teal-600 hover:bg-teal-700 text-white">
          <MdAdd className="w-4 h-4 mr-1.5" /> Log Waste
        </Button>
      </div>

      {statusMsg && (
        <div className={`p-3 rounded-lg text-sm ${statusMsg.includes('success') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
          {statusMsg}
        </div>
      )}

      {showForm && (
        <Card className="border-teal-200 shadow-sm bg-teal-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-slate-900">New Waste Entry</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label className="text-xs text-slate-600">Item *</Label>
                <Select value={formData.item} onValueChange={(v) => setFormData((p) => ({ ...p, item: v }))}>
                  <SelectTrigger className="mt-1 bg-white"><SelectValue placeholder="Select item" /></SelectTrigger>
                  <SelectContent>{INVENTORY_ITEMS.map((it) => <SelectItem key={it} value={it}>{it}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-slate-600">Quantity *</Label>
                <div className="flex gap-2 mt-1">
                  <Input type="number" placeholder="0" value={formData.qty} onChange={(e) => setFormData((p) => ({ ...p, qty: e.target.value }))} className="bg-white" />
                  <Select value={formData.unit} onValueChange={(v) => setFormData((p) => ({ ...p, unit: v }))}>
                    <SelectTrigger className="w-28 bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>{UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs text-slate-600">Reason Code *</Label>
                <Select value={formData.reason} onValueChange={(v) => setFormData((p) => ({ ...p, reason: v }))}>
                  <SelectTrigger className="mt-1 bg-white"><SelectValue placeholder="Select reason" /></SelectTrigger>
                  <SelectContent>{REASON_CODES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-slate-600">Notes</Label>
                <Input placeholder="Optional details..." value={formData.notes} onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))} className="mt-1 bg-white" />
              </div>
            </div>
            <Separator className="my-4" />
            <div className="flex gap-2">
              <Button onClick={handleSubmit} className="bg-teal-600 hover:bg-teal-700 text-white">Save Entry</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Today&apos;s Waste</p>
            <p className="text-2xl font-bold text-red-600 mt-1">${todayTotal.toFixed(2)}</p>
            <p className="text-xs text-slate-400 mt-0.5">{todayWaste.length} entries</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Week Total</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">${weekTotal.toFixed(2)}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <MdTrendingDown className="w-3.5 h-3.5 text-green-500" />
              <span className="text-xs text-green-600">-12% vs last week</span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Top Wasted Item</p>
            <p className="text-lg font-bold text-slate-900 mt-1">Ice Cream</p>
            <p className="text-xs text-slate-400 mt-0.5">14 scoops today</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Top Reason</p>
            <p className="text-lg font-bold text-slate-900 mt-1">{topReason?.[0] ?? 'N/A'}</p>
            <p className="text-xs text-slate-400 mt-0.5">{topReason?.[1] ?? 0} occurrences</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-slate-900">Recent Waste Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Item</TableHead>
                    <TableHead className="text-xs">Qty</TableHead>
                    <TableHead className="text-xs">Reason</TableHead>
                    <TableHead className="text-xs">Location</TableHead>
                    <TableHead className="text-xs">Cost</TableHead>
                    <TableHead className="text-xs">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {wasteEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-xs font-medium text-slate-700">{entry.item}</TableCell>
                      <TableCell className="text-xs text-slate-600">{entry.qty} {entry.unit}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${entry.reason === 'Expired' ? 'border-red-200 bg-red-50 text-red-700' : entry.reason === 'Spillage' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
                          {entry.reason}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">{entry.location}</TableCell>
                      <TableCell className="text-xs font-semibold text-red-600">{entry.cost}</TableCell>
                      <TableCell className="text-xs text-slate-500">{entry.date}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-slate-900">Waste Trend (7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            {mounted && (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={WEEKLY_WASTE_DATA}>
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(val: number) => [`$${val}`, 'Waste']} />
                    <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="mt-4 space-y-2">
              <p className="text-xs font-medium text-slate-700">By Reason Code</p>
              {Object.entries(reasonCounts).slice(0, 5).map(([reason, count]) => (
                <div key={reason} className="flex items-center justify-between">
                  <span className="text-xs text-slate-600">{reason}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full" style={{ width: `${(count / wasteEntries.length) * 100}%` }} />
                    </div>
                    <span className="text-xs text-slate-500 w-5 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
