'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw, CheckCircle, AlertCircle, Clock } from 'lucide-react';

interface POSSyncProps {
  selectedLocation: string;
}

const POS_TRANSACTIONS = [
  // No POS system connected - transactions will appear here when integrated
];

const RECIPE_MAPPINGS = [
  { menu: 'Beignets (3)', ingredients: [{ name: 'Beignet Mix', qty: '0.5 lb' }, { name: 'Powdered Sugar', qty: '2 oz' }, { name: 'Frying Oil', qty: '4 oz' }] },
  { menu: 'Cafe au Lait', ingredients: [{ name: 'Coffee Beans', qty: '0.5 oz' }, { name: 'Whole Milk', qty: '6 oz' }, { name: '12oz Cup', qty: '1' }] },
  { menu: 'Hot Dog Combo', ingredients: [{ name: 'Hot Dog Franks', qty: '1' }, { name: 'Hot Dog Buns', qty: '1' }, { name: 'Soft Drink Syrup', qty: '2 oz' }, { name: '16oz Cup', qty: '1' }] },
  { menu: 'Hurricane Cocktail', ingredients: [{ name: 'Rum', qty: '3 oz' }, { name: 'Passion Fruit Juice', qty: '4 oz' }, { name: 'Hurricane Glass', qty: '1' }] },
];

const DEPLETION_LOG = [
  { time: '10:42 AM', item: 'Beignet Mix', qty: '-0.5 lb', trigger: 'TXN-4821', location: 'Cafe du Monde Kiosk' },
  { time: '10:42 AM', item: 'Powdered Sugar', qty: '-2 oz', trigger: 'TXN-4821', location: 'Cafe du Monde Kiosk' },
  { time: '10:42 AM', item: 'Coffee Beans', qty: '-1 oz', trigger: 'TXN-4821', location: 'Cafe du Monde Kiosk' },
  { time: '10:38 AM', item: 'Hot Dog Franks', qty: '-1', trigger: 'TXN-4822', location: 'Pavilion Grill' },
  { time: '10:38 AM', item: 'Hot Dog Buns', qty: '-1', trigger: 'TXN-4822', location: 'Pavilion Grill' },
  { time: '10:35 AM', item: 'Ice Cream (Vanilla)', qty: '-2 scoops', trigger: 'TXN-4823', location: 'Storyland Snacks' },
  { time: '10:28 AM', item: 'Draft Beer (Abita)', qty: '-2 pints', trigger: 'TXN-4825', location: 'Carousel Bar' },
  { time: '10:28 AM', item: 'Nacho Cheese', qty: '-3 oz', trigger: 'TXN-4825', location: 'Carousel Bar' },
];

function StatusIcon({ status }: { status: string }) {
  if (status === 'synced') return <CheckCircle className="w-4 h-4 text-green-500" />;
  if (status === 'pending') return <Clock className="w-4 h-4 text-amber-500" />;
  return <AlertCircle className="w-4 h-4 text-red-500" />;
}

export default function POSSync({ selectedLocation }: POSSyncProps) {
  const filteredTxns = selectedLocation === 'All Locations'
    ? POS_TRANSACTIONS
    : POS_TRANSACTIONS.filter((t) => t.location === selectedLocation);

  const syncedCount = POS_TRANSACTIONS.filter((t) => t.status === 'synced').length;
  const pendingCount = POS_TRANSACTIONS.filter((t) => t.status === 'pending').length;
  const errorCount = POS_TRANSACTIONS.filter((t) => t.status === 'error').length;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">POS Sync & Auto-Depletion</h2>
        <p className="text-sm text-slate-500 mt-0.5">Real-time sales data and ingredient deductions</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{syncedCount}</p>
              <p className="text-xs text-slate-500">Synced</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{pendingCount}</p>
              <p className="text-xs text-slate-500">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{errorCount}</p>
              <p className="text-xs text-slate-500">Errors</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-slate-900">Recent Transactions</CardTitle>
              <div className="flex items-center gap-1.5">
                <RefreshCw className="w-4 h-4 text-teal-600 animate-spin" />
                <span className="text-xs text-teal-600 font-medium">Live</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">ID</TableHead>
                    <TableHead className="text-xs">Time</TableHead>
                    <TableHead className="text-xs">Items</TableHead>
                    <TableHead className="text-xs">Total</TableHead>
                    <TableHead className="text-xs">Location</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTxns.map((txn) => (
                    <TableRow key={txn.id}>
                      <TableCell className="text-xs font-mono text-slate-600">{txn.id}</TableCell>
                      <TableCell className="text-xs text-slate-600">{txn.time}</TableCell>
                      <TableCell className="text-xs text-slate-700 max-w-[200px] truncate">{txn.items}</TableCell>
                      <TableCell className="text-xs font-semibold text-slate-900">{txn.total}</TableCell>
                      <TableCell className="text-xs text-slate-600">{txn.location}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <StatusIcon status={txn.status} />
                          <span className="text-xs capitalize text-slate-600">{txn.status}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-slate-900">Recipe / BOM Mapping</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {RECIPE_MAPPINGS.map((recipe) => (
                <div key={recipe.menu} className="p-3 rounded-lg border border-slate-100 bg-slate-50">
                  <p className="text-xs font-semibold text-slate-800 mb-1.5">{recipe.menu}</p>
                  <div className="space-y-0.5">
                    {recipe.ingredients.map((ing) => (
                      <div key={ing.name} className="flex justify-between text-xs">
                        <span className="text-slate-600">{ing.name}</span>
                        <span className="text-slate-500 font-mono">{ing.qty}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-slate-900">Auto-Depletion Log</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {DEPLETION_LOG.map((entry, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
                    <div>
                      <p className="text-xs font-medium text-slate-700">{entry.item}</p>
                      <p className="text-[10px] text-slate-400">{entry.time} &middot; {entry.trigger}</p>
                    </div>
                    <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50 text-xs">{entry.qty}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
