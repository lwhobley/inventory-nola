'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Search, RefreshCw, ChevronDown, ChevronUp, AlertTriangle, CheckCircle, Package, AlertCircle, Plus, Save, X } from 'lucide-react';
import { callAIAgent } from '@/lib/aiAgent';
import { getSupabaseAdmin } from '@/lib/supabase';

interface InventoryManagementProps {
  selectedLocation: string;
  activeAgentId: string | null;
  setActiveAgentId: (id: string | null) => void;
}

interface InventoryItem {
  id?: string;
  name: string;
  category: string;
  current_stock: number;
  unit: string;
  par_level: number;
  location: string;
  status: string;
  last_updated?: string;
}

const AGENT_ID = '69a5b1a33fe08f1e2b19b91e';
const CATEGORIES = ['All', 'Beverages', 'Food Items', 'Supplies', 'Ingredients'];

interface InventoryAnalysis {
  summary?: string;
  overall_health_score?: string;
  critical_items?: Array<{ item_name?: string; current_stock?: string; daily_usage?: string; days_remaining?: string; risk_level?: string }>;
  reorder_suggestions?: Array<{ item_name?: string; current_stock?: string; daily_usage?: string; days_remaining?: string; suggested_order_qty?: string; urgency?: string }>;
  consumption_anomalies?: Array<{ item_name?: string; expected_usage?: string; actual_usage?: string; deviation_percentage?: string; possible_cause?: string }>;
  excess_stock_alerts?: Array<{ item_name?: string; current_stock?: string; days_until_expiry?: string; recommended_action?: string }>;
}

function parseAgentResponse(result: any) {
  if (!result?.success) return null;
  let data = result?.response?.result;
  
  // Handle multiple levels of nesting
  while (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {
      break;
    }
  }
  
  // Extract from common wrappers
  if (data?.result && typeof data.result === 'object') data = data.result;
  if (data?.response && typeof data.response === 'object' && !Array.isArray(data.response)) data = data.response;
  
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

function calculateStatus(stock: number, par: number): string {
  if (stock === 0) return 'Critical';
  if (stock < par * 0.3) return 'Critical';
  if (stock < par * 0.7) return 'Low';
  if (stock > par * 1.5) return 'Overstocked';
  return 'In Stock';
}

export default function InventoryManagement({ selectedLocation, activeAgentId, setActiveAgentId }: InventoryManagementProps) {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [showCount, setShowCount] = useState(false);
  const [countValues, setCountValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<InventoryAnalysis | null>(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ critical: true, reorder: true, anomalies: false, excess: false });
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newItem, setNewItem] = useState<Partial<InventoryItem>>({ category: 'Beverages', unit: 'units', location: selectedLocation });
  const [savingCounts, setSavingCounts] = useState(false);

  // Load inventory from Supabase
  useEffect(() => {
    loadInventory();
  }, [selectedLocation]);

  const loadInventory = async () => {
    try {
      const supabase = getSupabaseAdmin();
      const { data, error: err } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('location', selectedLocation);
      
      if (err) {
        // If table doesn't exist or permission error, start with empty list
        console.warn('Inventory load warning:', err.message);
        setInventory([]);
        setError('');
        return;
      }
      
      setInventory(data || []);
      setError('');
    } catch (err) {
      console.error('Inventory load error:', err);
      // Don't show error if table doesn't exist yet - just start with empty
      setInventory([]);
      setError('');
    }
  };

  const filtered = inventory.filter((item) => {
    const matchCat = category === 'All' || item.category === category;
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const handleAnalyze = async () => {
    setLoading(true);
    setError('');
    setActiveAgentId(AGENT_ID);
    
    const inventorySummary = inventory
      .map((i) => `${i.name}: ${i.current_stock} ${i.unit} (par: ${i.par_level}, status: ${calculateStatus(i.current_stock, i.par_level)})`)
      .join('\n');
    
    const message = `Analyze inventory levels for ${selectedLocation}. Current inventory:\n${inventorySummary}\n\nProvide health score, critical items, reorder suggestions, consumption anomalies, and excess stock alerts.`;
    
    try {
      const result = await callAIAgent(message, AGENT_ID);
      const parsed = parseAgentResponse(result);
      if (parsed) {
        setAnalysis(parsed);
      } else {
        setError('Failed to parse analysis results.');
      }
    } catch (err) {
      setError('Failed to run inventory analysis. Please try again.');
      console.error(err);
    }
    
    setLoading(false);
    setActiveAgentId(null);
  };

  const handleSaveCounts = async () => {
    setSavingCounts(true);
    setError('');
    setSuccessMessage('');
    
    try {
      const supabase = getSupabaseAdmin();
      
      for (const [itemName, count] of Object.entries(countValues)) {
        if (count && count !== '') {
          const item = inventory.find(i => i.name === itemName);
          if (item) {
            const { error: err } = await supabase
              .from('inventory_items')
              .update({
                current_stock: parseInt(count),
                last_updated: new Date().toISOString(),
              })
              .eq('id', item.id);
            
            if (err) {
              setError(`Failed to update ${itemName}`);
              return;
            }
          }
        }
      }
      
      setSuccessMessage('Counts saved successfully!');
      setCountValues({});
      setShowCount(false);
      await loadInventory();
      
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError('Failed to save counts. Please try again.');
      console.error(err);
    }
    
    setSavingCounts(false);
  };

  const handleAddItem = async () => {
    if (!newItem.name || !newItem.category || !newItem.unit || newItem.current_stock === undefined || newItem.par_level === undefined) {
      setError('Please fill in all fields');
      return;
    }
    
    try {
      const supabase = getSupabaseAdmin();
      const { error: err } = await supabase
        .from('inventory_items')
        .insert([{
          name: newItem.name,
          category: newItem.category,
          unit: newItem.unit,
          current_stock: parseInt(String(newItem.current_stock)),
          par_level: parseInt(String(newItem.par_level)),
          location: selectedLocation,
          status: calculateStatus(parseInt(String(newItem.current_stock)), parseInt(String(newItem.par_level))),
        }]);
      
      if (err) {
        setError(`Failed to add item: ${err.message}`);
        return;
      }
      
      setSuccessMessage('Item added successfully!');
      setNewItem({ category: 'Beverages', unit: 'units', location: selectedLocation });
      setShowAddDialog(false);
      await loadInventory();
      
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError('Failed to add item. Please try again.');
      console.error(err);
    }
  };

  const toggle = (key: string) => setOpenSections((p) => ({ ...p, [key]: !p[key] }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Inventory Management</h2>
          <p className="text-sm text-slate-500 mt-0.5">{selectedLocation}</p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-teal-600 hover:bg-teal-700">
                <Plus className="w-4 h-4" /> Add Item
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Inventory Item</DialogTitle>
                <DialogDescription>Add a new item to your inventory</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Item Name</Label>
                  <Input value={newItem.name || ''} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} placeholder="e.g., Coffee Beans" />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={newItem.category || 'Beverages'} onValueChange={(v) => setNewItem({ ...newItem, category: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.filter(c => c !== 'All').map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Current Stock</Label>
                    <Input type="number" value={newItem.current_stock || 0} onChange={(e) => setNewItem({ ...newItem, current_stock: parseInt(e.target.value) })} />
                  </div>
                  <div>
                    <Label>Unit</Label>
                    <Input value={newItem.unit || 'units'} onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label>Par Level</Label>
                  <Input type="number" value={newItem.par_level || 0} onChange={(e) => setNewItem({ ...newItem, par_level: parseInt(e.target.value) })} />
                </div>
                <Button onClick={handleAddItem} className="w-full bg-teal-600 hover:bg-teal-700">Add Item</Button>
              </div>
            </DialogContent>
          </Dialog>
          
          <Button onClick={handleAnalyze} disabled={loading} className="gap-2">
            {loading ? 'Analyzing...' : 'Generate Report'}
          </Button>
        </div>
      </div>

      {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">{error}</div>}
      {successMessage && <div className="p-3 rounded-lg bg-green-50 text-green-700 text-sm border border-green-200">{successMessage}</div>}

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <Input placeholder="Search items..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant={showCount ? 'default' : 'outline'} onClick={() => setShowCount(!showCount)}>
              {showCount ? 'Hide Counts' : 'Count Items'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Item Name</TableHead>
                  <TableHead className="text-xs">Category</TableHead>
                  <TableHead className="text-xs text-right">Stock</TableHead>
                  <TableHead className="text-xs text-right">Par</TableHead>
                  <TableHead className="text-xs text-right">% of Par</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  {showCount && <TableHead className="text-xs">New Count</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={showCount ? 7 : 6} className="text-center py-8">
                      <div className="space-y-2">
                        <Package className="w-8 h-8 text-slate-300 mx-auto" />
                        <p className="text-sm text-slate-500">No inventory items found</p>
                        <p className="text-xs text-slate-400">Click "Add Item" to get started</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((item) => {
                    const percentage = Math.round((item.current_stock / item.par_level) * 100);
                    const status = calculateStatus(item.current_stock, item.par_level);
                    return (
                      <TableRow key={item.id || item.name}>
                        <TableCell className="text-xs font-medium">{item.name}</TableCell>
                        <TableCell className="text-xs text-slate-500">{item.category}</TableCell>
                        <TableCell className="text-xs text-right">{item.current_stock} {item.unit}</TableCell>
                        <TableCell className="text-xs text-right">{item.par_level}</TableCell>
                        <TableCell className="text-xs text-right">
                          <Progress value={Math.min(percentage, 200)} className="w-12 h-2" />
                          <span className={percentage > 150 ? 'text-blue-600' : percentage > 70 ? 'text-green-600' : percentage > 30 ? 'text-amber-600' : 'text-red-600'}>{percentage}%</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusColor(status)}>
                            {status}
                          </Badge>
                        </TableCell>
                        {showCount && (
                          <TableCell>
                            <Input
                              type="number"
                              value={countValues[item.name] || ''}
                              onChange={(e) => setCountValues({ ...countValues, [item.name]: e.target.value })}
                              placeholder="New count"
                              className="w-20 h-8 text-xs"
                            />
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          
          {showCount && (
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCount(false)}>Cancel</Button>
              <Button onClick={handleSaveCounts} disabled={savingCounts} className="gap-2 bg-teal-600 hover:bg-teal-700">
                <Save className="w-4 h-4" /> {savingCounts ? 'Saving...' : 'Save Counts'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

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
                  <CardTitle className="text-sm font-semibold text-red-700 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Critical Items</CardTitle>
                  {openSections.critical ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
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
                  <CardTitle className="text-sm font-semibold text-teal-700 flex items-center gap-2"><RefreshCw className="w-4 h-4" /> Reorder Suggestions</CardTitle>
                  {openSections.reorder ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
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
                  <CardTitle className="text-sm font-semibold text-amber-700 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Consumption Anomalies</CardTitle>
                  {openSections.anomalies ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
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
                  <CardTitle className="text-sm font-semibold text-blue-700 flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Excess Stock Alerts</CardTitle>
                  {openSections.excess ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
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
