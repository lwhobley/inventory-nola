'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { MdSearch, MdRefresh, MdExpandMore, MdExpandLess, MdWarning, MdCheckCircle } from 'react-icons/md';
import { FaBoxOpen, FaExclamationTriangle } from 'react-icons/fa';
import { callAIAgent } from '@/lib/aiAgent';

interface InventoryManagementProps {
  selectedLocation: string;
  activeAgentId: string | null;
  setActiveAgentId: (id: string | null) => void;
}

const AGENT_ID = '69a5b1a33fe08f1e2b19b91e';

const CATEGORIES = ['All', 'Beverages', 'Food Items', 'Supplies', 'Ingredients'];

const INVENTORY_DATA = [
  { name: 'Beignet Mix', category: 'Ingredients', stock: 12, unit: 'lbs', par: 50, status: 'Critical', updated: '10:30 AM' },
  { name: 'Coffee Beans', category: 'Beverages', stock: 28, unit: 'lbs', par: 40, status: 'Low', updated: '10:30 AM' },
  { name: 'Whole Milk', category: 'Beverages', stock: 18, unit: 'gal', par: 25, status: 'Low', updated: '10:30 AM' },
  { name: 'Powdered Sugar', category: 'Ingredients', stock: 35, unit: 'lbs', par: 30, status: 'In Stock', updated: '10:30 AM' },
  { name: 'Frying Oil', category: 'Ingredients', stock: 8, unit: 'gal', par: 20, status: 'Critical', updated: '10:30 AM' },
  { name: 'Hot Dog Franks', category: 'Food Items', stock: 96, unit: 'units', par: 100, status: 'In Stock', updated: '9:45 AM' },
  { name: 'Hot Dog Buns', category: 'Food Items', stock: 48, unit: 'units', par: 100, status: 'Low', updated: '9:45 AM' },
  { name: 'Soft Drink Syrup', category: 'Beverages', stock: 3, unit: 'gal', par: 15, status: 'Critical', updated: '9:45 AM' },
  { name: 'Ice Cream (Vanilla)', category: 'Food Items', stock: 42, unit: 'scoops', par: 80, status: 'Low', updated: '9:00 AM' },
  { name: 'Ice Cream (Chocolate)', category: 'Food Items', stock: 65, unit: 'scoops', par: 60, status: 'In Stock', updated: '9:00 AM' },
  { name: 'Nachos Chips', category: 'Food Items', stock: 24, unit: 'bags', par: 20, status: 'In Stock', updated: '9:00 AM' },
  { name: 'Nacho Cheese', category: 'Ingredients', stock: 6, unit: 'lbs', par: 10, status: 'Low', updated: '9:00 AM' },
  { name: 'Draft Beer (Abita)', category: 'Beverages', stock: 48, unit: 'pints', par: 50, status: 'In Stock', updated: '8:30 AM' },
  { name: 'Rum', category: 'Beverages', stock: 3, unit: 'bottles', par: 8, status: 'Critical', updated: '8:30 AM' },
  { name: 'Lemonade Mix', category: 'Beverages', stock: 5, unit: 'gal', par: 10, status: 'Low', updated: '8:30 AM' },
  { name: 'Cotton Candy Sugar', category: 'Ingredients', stock: 20, unit: 'lbs', par: 15, status: 'Overstocked', updated: '8:30 AM' },
  { name: 'Popcorn Kernels', category: 'Ingredients', stock: 18, unit: 'lbs', par: 12, status: 'Overstocked', updated: '8:30 AM' },
  { name: 'Paper Cups (12oz)', category: 'Supplies', stock: 450, unit: 'units', par: 500, status: 'In Stock', updated: '8:00 AM' },
  { name: 'Paper Cups (16oz)', category: 'Supplies', stock: 380, unit: 'units', par: 500, status: 'Low', updated: '8:00 AM' },
  { name: 'Napkins', category: 'Supplies', stock: 2000, unit: 'units', par: 1500, status: 'Overstocked', updated: '8:00 AM' },
];

interface InventoryAnalysis {
  summary?: string;
  overall_health_score?: string;
  critical_items?: Array<{ item_name?: string; current_stock?: string; daily_usage?: string; days_remaining?: string; risk_level?: string }>;
  reorder_suggestions?: Array<{ item_name?: string; current_stock?: string; daily_usage?: string; days_remaining?: string; suggested_order_qty?: string; urgency?: string }>;
  consumption_anomalies?: Array<{ item_name?: string; expected_usage?: string; actual_usage?: string; deviation_percentage?: string; possible_cause?: string }>;
  excess_stock_alerts?: Array<{ item_name?: string; current_stock?: string; days_until_expiry?: string; recommended_action?: string }>;
}

function parseAgentResponse(result: ReturnType<typeof callAIAgent> extends Promise<infer T> ? T : never) {
  if (!result?.success) return null;
  let data = result?.response?.result;
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch { try { data = JSON.parse(JSON.parse(data)); } catch { return null; } }
  }
  if (data?.result && typeof data.result === 'object') data = data.result;
  return data as InventoryAnalysis;
}

function statusColor(status: string) {
  if (status === 'Critical') return 'border-red-200 bg-red-50 text-red-700';
  if (status === 'Low') return 'border-amber-200 bg-amber-50 text-amber-700';
  if (status === 'Overstocked') return 'border-blue-200 bg-blue-50 text-blue-700';
  return 'border-green-200 bg-green-50 text-green-700';
}

function urgencyColor(u: string) {
  const ul = (u ?? '').toLowerCase();
  if (ul.includes('critical') || ul.includes('high')) return 'border-red-200 bg-red-50 text-red-700';
  if (ul.includes('medium') || ul.includes('moderate')) return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-green-200 bg-green-50 text-green-700';
}

export default function InventoryManagement({ selectedLocation, activeAgentId, setActiveAgentId }: InventoryManagementProps) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [showCount, setShowCount] = useState(false);
  const [countValues, setCountValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<InventoryAnalysis | null>(null);
  const [error, setError] = useState('');
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ critical: true, reorder: true, anomalies: false, excess: false });

  const filtered = INVENTORY_DATA.filter((item) => {
    const matchCat = category === 'All' || item.category === category;
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const handleAnalyze = async () => {
    setLoading(true);
    setError('');
    setActiveAgentId(AGENT_ID);
    const inventorySummary = INVENTORY_DATA.map((i) => `${i.name}: ${i.stock} ${i.unit} (par: ${i.par}, status: ${i.status})`).join('\n');
    const message = `Analyze inventory levels for ${selectedLocation}. Current inventory:\n${inventorySummary}\n\nProvide health score, critical items, reorder suggestions, consumption anomalies, and excess stock alerts.`;
    try {
      const result = await callAIAgent(message, AGENT_ID);
      const parsed = parseAgentResponse(result);
      if (parsed) { setAnalysis(parsed); } else { setError('Failed to parse analysis results.'); }
    } catch {
      setError('Failed to run inventory analysis. Please try again.');
    }
    setLoading(false);
    setActiveAgentId(null);
  };

  const toggle = (key: string) => setOpenSections((p) => ({ ...p, [key]: !p[key] }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Inventory Management</h2>
          <p className="text-sm text-slate-500 mt-0.5">{selectedLocation}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowCount(!showCount)} className="border-slate-200">
            <FaBoxOpen className="w-4 h-4 mr-1.5" /> {showCount ? 'Close Count' : 'Morning Count'}
          </Button>
          <Button onClick={handleAnalyze} disabled={loading} className="bg-teal-600 hover:bg-teal-700 text-white">
            {loading ? <><MdRefresh className="w-4 h-4 mr-1.5 animate-spin" /> Analyzing...</> : <><MdSearch className="w-4 h-4 mr-1.5" /> Analyze Inventory</>}
          </Button>
        </div>
      </div>

      {showCount && (
        <Card className="border-teal-200 shadow-sm bg-teal-50/30">
          <CardHeader className="pb-3"><CardTitle className="text-base text-slate-900">Morning Physical Count</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {INVENTORY_DATA.slice(0, 8).map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <Label className="text-xs text-slate-600 w-28 truncate">{item.name}</Label>
                  <Input type="number" placeholder={String(item.stock)} value={countValues[item.name] ?? ''} onChange={(e) => setCountValues((p) => ({ ...p, [item.name]: e.target.value }))} className="h-8 w-20 text-xs bg-white" />
                  <span className="text-xs text-slate-400">{item.unit}</span>
                </div>
              ))}
            </div>
            <Button className="mt-3 bg-teal-600 hover:bg-teal-700 text-white text-sm">Save Counts</Button>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search items..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
        <div className="flex gap-2 text-xs text-slate-500">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" /> {INVENTORY_DATA.filter((i) => i.status === 'Critical').length} Critical</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> {INVENTORY_DATA.filter((i) => i.status === 'Low').length} Low</span>
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Item Name</TableHead>
                  <TableHead className="text-xs">Category</TableHead>
                  <TableHead className="text-xs">Stock</TableHead>
                  <TableHead className="text-xs">Unit</TableHead>
                  <TableHead className="text-xs">Par Level</TableHead>
                  <TableHead className="text-xs">Fill %</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => {
                  const fillPct = Math.min(100, Math.round((item.stock / item.par) * 100));
                  return (
                    <TableRow key={item.name}>
                      <TableCell className="text-xs font-medium text-slate-800">{item.name}</TableCell>
                      <TableCell className="text-xs text-slate-600">{item.category}</TableCell>
                      <TableCell className={`text-xs font-semibold ${item.status === 'Critical' ? 'text-red-600' : 'text-slate-900'}`}>{item.stock}</TableCell>
                      <TableCell className="text-xs text-slate-500">{item.unit}</TableCell>
                      <TableCell className="text-xs text-slate-500">{item.par}</TableCell>
                      <TableCell className="text-xs"><div className="flex items-center gap-2"><Progress value={fillPct} className="h-1.5 w-16" /><span className="text-slate-500">{fillPct}%</span></div></TableCell>
                      <TableCell><Badge variant="outline" className={`text-xs ${statusColor(item.status)}`}>{item.status}</Badge></TableCell>
                      <TableCell className="text-xs text-slate-400">{item.updated}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">{error}</div>}

      {analysis && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">AI Inventory Analysis</h3>
            <Badge className="bg-teal-100 text-teal-700 border-teal-200">Health Score: {analysis.overall_health_score ?? 'N/A'}</Badge>
          </div>
          {analysis.summary && <Card className="border-slate-200 shadow-sm"><CardContent className="p-4"><p className="text-sm text-slate-700">{analysis.summary}</p></CardContent></Card>}

          <Collapsible open={openSections.critical} onOpenChange={() => toggle('critical')}>
            <Card className="border-slate-200 shadow-sm">
              <CollapsibleTrigger className="w-full">
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-red-700 flex items-center gap-2"><FaExclamationTriangle className="w-4 h-4" /> Critical Items</CardTitle>
                  {openSections.critical ? <MdExpandLess className="w-5 h-5 text-slate-400" /> : <MdExpandMore className="w-5 h-5 text-slate-400" />}
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  {Array.isArray(analysis.critical_items) && analysis.critical_items.length > 0 ? (
                    <div className="space-y-2">
                      {analysis.critical_items.map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-red-50 border border-red-100">
                          <div><p className="text-sm font-medium text-slate-800">{item?.item_name ?? 'Unknown'}</p><p className="text-xs text-slate-500">Stock: {item?.current_stock ?? '?'} | Usage: {item?.daily_usage ?? '?'}/day | {item?.days_remaining ?? '?'} days left</p></div>
                          <Badge variant="outline" className={urgencyColor(item?.risk_level ?? '')}>{item?.risk_level ?? 'Unknown'}</Badge>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-sm text-slate-500">No critical items found.</p>}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          <Collapsible open={openSections.reorder} onOpenChange={() => toggle('reorder')}>
            <Card className="border-slate-200 shadow-sm">
              <CollapsibleTrigger className="w-full">
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-teal-700 flex items-center gap-2"><MdRefresh className="w-4 h-4" /> Reorder Suggestions</CardTitle>
                  {openSections.reorder ? <MdExpandLess className="w-5 h-5 text-slate-400" /> : <MdExpandMore className="w-5 h-5 text-slate-400" />}
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  {Array.isArray(analysis.reorder_suggestions) && analysis.reorder_suggestions.length > 0 ? (
                    <Table>
                      <TableHeader><TableRow><TableHead className="text-xs">Item</TableHead><TableHead className="text-xs">Stock</TableHead><TableHead className="text-xs">Usage/Day</TableHead><TableHead className="text-xs">Days Left</TableHead><TableHead className="text-xs">Order Qty</TableHead><TableHead className="text-xs">Urgency</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {analysis.reorder_suggestions.map((s, i) => (
                          <TableRow key={i}><TableCell className="text-xs">{s?.item_name ?? ''}</TableCell><TableCell className="text-xs">{s?.current_stock ?? ''}</TableCell><TableCell className="text-xs">{s?.daily_usage ?? ''}</TableCell><TableCell className="text-xs">{s?.days_remaining ?? ''}</TableCell><TableCell className="text-xs font-semibold">{s?.suggested_order_qty ?? ''}</TableCell><TableCell><Badge variant="outline" className={`text-xs ${urgencyColor(s?.urgency ?? '')}`}>{s?.urgency ?? ''}</Badge></TableCell></TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : <p className="text-sm text-slate-500">No reorder suggestions.</p>}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          <Collapsible open={openSections.anomalies} onOpenChange={() => toggle('anomalies')}>
            <Card className="border-slate-200 shadow-sm">
              <CollapsibleTrigger className="w-full">
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-amber-700 flex items-center gap-2"><MdWarning className="w-4 h-4" /> Consumption Anomalies</CardTitle>
                  {openSections.anomalies ? <MdExpandLess className="w-5 h-5 text-slate-400" /> : <MdExpandMore className="w-5 h-5 text-slate-400" />}
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  {Array.isArray(analysis.consumption_anomalies) && analysis.consumption_anomalies.length > 0 ? (
                    <div className="space-y-2">{analysis.consumption_anomalies.map((a, i) => (
                      <div key={i} className="p-3 rounded-lg bg-amber-50 border border-amber-100">
                        <p className="text-sm font-medium text-slate-800">{a?.item_name ?? ''}</p>
                        <p className="text-xs text-slate-600">Expected: {a?.expected_usage ?? ''} | Actual: {a?.actual_usage ?? ''} | Deviation: {a?.deviation_percentage ?? ''}</p>
                        <p className="text-xs text-slate-500 mt-1">Cause: {a?.possible_cause ?? 'Unknown'}</p>
                      </div>
                    ))}</div>
                  ) : <p className="text-sm text-slate-500">No anomalies detected.</p>}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          <Collapsible open={openSections.excess} onOpenChange={() => toggle('excess')}>
            <Card className="border-slate-200 shadow-sm">
              <CollapsibleTrigger className="w-full">
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-blue-700 flex items-center gap-2"><MdCheckCircle className="w-4 h-4" /> Excess Stock Alerts</CardTitle>
                  {openSections.excess ? <MdExpandLess className="w-5 h-5 text-slate-400" /> : <MdExpandMore className="w-5 h-5 text-slate-400" />}
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  {Array.isArray(analysis.excess_stock_alerts) && analysis.excess_stock_alerts.length > 0 ? (
                    <div className="space-y-2">{analysis.excess_stock_alerts.map((e, i) => (
                      <div key={i} className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                        <p className="text-sm font-medium text-slate-800">{e?.item_name ?? ''} &mdash; Stock: {e?.current_stock ?? ''}</p>
                        <p className="text-xs text-slate-600">Expiry: {e?.days_until_expiry ?? 'N/A'} days</p>
                        <p className="text-xs text-slate-500 mt-1">{e?.recommended_action ?? ''}</p>
                      </div>
                    ))}</div>
                  ) : <p className="text-sm text-slate-500">No excess stock alerts.</p>}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </div>
      )}
    </div>
  );
}
