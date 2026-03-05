'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle, ArrowRight, CheckCircle, Clock, XCircle, Plus, Trash2 } from 'lucide-react';
import { getSupabaseAdmin } from '@/lib/supabase';

interface StockTransfer {
  id?: string;
  item_name: string;
  from_location: string;
  to_location: string;
  quantity: number;
  status: 'pending' | 'approved' | 'completed' | 'cancelled';
  requested_by?: string;
  requested_at?: string;
  completed_at?: string;
  notes?: string;
}

interface InventoryItem {
  id?: string;
  name: string;
  category: string;
  current_stock: number;
  unit: string;
  par_level: number;
  location: string;
}

const LOCATIONS = ['Cafe du Monde Kiosk', 'Storyland Snacks', 'Morning Call Stand', 'Carousel Bar', 'Pavilion Grill'];

export default function StockTransfer() {
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'completed'>('all');
  const [newTransfer, setNewTransfer] = useState<Partial<StockTransfer>>({
    status: 'pending',
  });

  // Load transfers and inventory on mount
  useEffect(() => {
    loadTransfers();
    loadInventory();
    
    // Refresh every 20 seconds
    const interval = setInterval(() => {
      loadTransfers();
      loadInventory();
    }, 20000);
    
    return () => clearInterval(interval);
  }, []);

  const loadTransfers = async () => {
    try {
      const supabase = getSupabaseAdmin();
      const { data, error: err } = await supabase
        .from('stock_transfers')
        .select('*')
        .order('requested_at', { ascending: false });
      
      if (err) {
        console.warn('Transfer load error:', err.message);
        return;
      }
      
      setTransfers(data || []);
    } catch (err) {
      console.error('Load transfers error:', err);
    }
  };

  const loadInventory = async () => {
    try {
      const supabase = getSupabaseAdmin();
      const { data, error: err } = await supabase
        .from('inventory_items')
        .select('*');
      
      if (err) {
        console.warn('Inventory load error:', err.message);
        return;
      }
      
      setInventory(data || []);
    } catch (err) {
      console.error('Load inventory error:', err);
    }
  };

  const handleCreateTransfer = async () => {
    if (!newTransfer.item_name || !newTransfer.from_location || !newTransfer.to_location || !newTransfer.quantity) {
      setError('Please fill in all fields');
      return;
    }

    if (newTransfer.from_location === newTransfer.to_location) {
      setError('From and To locations must be different');
      return;
    }

    const fromItem = inventory.find(
      i => i.name === newTransfer.item_name && i.location === newTransfer.from_location
    );

    if (!fromItem || fromItem.current_stock < newTransfer.quantity) {
      setError('Insufficient stock at source location');
      return;
    }

    try {
      const supabase = getSupabaseAdmin();
      const { error: err } = await supabase
        .from('stock_transfers')
        .insert([{
          item_name: newTransfer.item_name,
          from_location: newTransfer.from_location,
          to_location: newTransfer.to_location,
          quantity: newTransfer.quantity,
          status: 'pending',
          notes: newTransfer.notes || '',
        }]);
      
      if (err) {
        setError(`Failed to create transfer: ${err.message}`);
        return;
      }
      
      setSuccessMessage('Transfer request created!');
      setNewTransfer({ status: 'pending' });
      setShowDialog(false);
      await loadTransfers();
      
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError('Failed to create transfer');
      console.error(err);
    }
  };

  const handleApproveTransfer = async (transferId: string) => {
    try {
      const supabase = getSupabaseAdmin();
      const transfer = transfers.find(t => t.id === transferId);
      
      if (!transfer) return;

      // Update transfer status
      const { error: transferErr } = await supabase
        .from('stock_transfers')
        .update({ status: 'approved' })
        .eq('id', transferId);

      if (transferErr) {
        setError('Failed to approve transfer');
        return;
      }

      setSuccessMessage('Transfer approved!');
      await loadTransfers();
      
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError('Failed to approve transfer');
      console.error(err);
    }
  };

  const handleCompleteTransfer = async (transferId: string) => {
    try {
      const supabase = getSupabaseAdmin();
      const transfer = transfers.find(t => t.id === transferId);
      
      if (!transfer) return;

      // Update FROM location inventory
      const fromItem = inventory.find(
        i => i.name === transfer.item_name && i.location === transfer.from_location
      );
      
      if (fromItem) {
        await supabase
          .from('inventory_items')
          .update({
            current_stock: fromItem.current_stock - transfer.quantity,
            last_updated: new Date().toISOString(),
          })
          .eq('id', fromItem.id);
      }

      // Update TO location inventory
      const toItem = inventory.find(
        i => i.name === transfer.item_name && i.location === transfer.to_location
      );
      
      if (toItem) {
        await supabase
          .from('inventory_items')
          .update({
            current_stock: toItem.current_stock + transfer.quantity,
            last_updated: new Date().toISOString(),
          })
          .eq('id', toItem.id);
      } else {
        // Create new item at destination if it doesn't exist
        const sourceItem = inventory.find(
          i => i.name === transfer.item_name && i.location === transfer.from_location
        );
        
        if (sourceItem) {
          await supabase
            .from('inventory_items')
            .insert([{
              name: sourceItem.name,
              category: sourceItem.category,
              unit: sourceItem.unit,
              current_stock: transfer.quantity,
              par_level: sourceItem.par_level,
              location: transfer.to_location,
              status: 'In Stock',
            }]);
        }
      }

      // Update transfer status
      const { error: transferErr } = await supabase
        .from('stock_transfers')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', transferId);

      if (transferErr) {
        setError('Failed to complete transfer');
        return;
      }

      setSuccessMessage('Transfer completed! Inventory updated.');
      await loadTransfers();
      await loadInventory();
      
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError('Failed to complete transfer');
      console.error(err);
    }
  };

  const handleCancelTransfer = async (transferId: string) => {
    try {
      const supabase = getSupabaseAdmin();
      const { error: err } = await supabase
        .from('stock_transfers')
        .update({ status: 'cancelled' })
        .eq('id', transferId);
      
      if (err) {
        setError('Failed to cancel transfer');
        return;
      }
      
      setSuccessMessage('Transfer cancelled');
      await loadTransfers();
      
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError('Failed to cancel transfer');
      console.error(err);
    }
  };

  const filteredTransfers = filterStatus === 'all' 
    ? transfers 
    : transfers.filter(t => t.status === filterStatus);

  const pendingCount = transfers.filter(t => t.status === 'pending').length;
  const approvedCount = transfers.filter(t => t.status === 'approved').length;
  const completedCount = transfers.filter(t => t.status === 'completed').length;

  // Get unique items for the dropdown
  const uniqueItems = Array.from(new Set(inventory.map(i => i.name)));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Stock Transfers</h2>
          <p className="text-sm text-slate-500 mt-0.5">Move inventory between locations</p>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-teal-600 hover:bg-teal-700">
              <Plus className="w-4 h-4" /> Request Transfer
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Stock Transfer</DialogTitle>
              <DialogDescription>Move inventory between locations</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Item Name</Label>
                <Select value={newTransfer.item_name || ''} onValueChange={(v) => setNewTransfer({ ...newTransfer, item_name: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select item" />
                  </SelectTrigger>
                  <SelectContent>
                    {uniqueItems.map(item => (
                      <SelectItem key={item} value={item}>{item}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>From Location</Label>
                <Select value={newTransfer.from_location || ''} onValueChange={(v) => setNewTransfer({ ...newTransfer, from_location: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select from location" />
                  </SelectTrigger>
                  <SelectContent>
                    {LOCATIONS.map(loc => (
                      <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>To Location</Label>
                <Select value={newTransfer.to_location || ''} onValueChange={(v) => setNewTransfer({ ...newTransfer, to_location: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select to location" />
                  </SelectTrigger>
                  <SelectContent>
                    {LOCATIONS.filter(loc => loc !== newTransfer.from_location).map(loc => (
                      <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Quantity to Transfer</Label>
                <Input 
                  type="number" 
                  value={newTransfer.quantity || 0}
                  onChange={(e) => setNewTransfer({ ...newTransfer, quantity: parseInt(e.target.value) })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Notes (optional)</Label>
                <Input 
                  value={newTransfer.notes || ''}
                  onChange={(e) => setNewTransfer({ ...newTransfer, notes: e.target.value })}
                  placeholder="e.g., Emergency restock for event"
                />
              </div>
              <Button onClick={handleCreateTransfer} className="w-full bg-teal-600 hover:bg-teal-700">Create Request</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {error && <Alert className="bg-red-50 border-red-200"><AlertCircle className="h-4 w-4" /><AlertDescription className="text-red-700">{error}</AlertDescription></Alert>}
      {successMessage && <Alert className="bg-green-50 border-green-200"><AlertDescription className="text-green-700">{successMessage}</AlertDescription></Alert>}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <p className="text-xs text-amber-600 uppercase tracking-wide">Pending</p>
            <p className="text-3xl font-bold text-amber-700 mt-1">{pendingCount}</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <p className="text-xs text-blue-600 uppercase tracking-wide">Approved</p>
            <p className="text-3xl font-bold text-blue-700 mt-1">{approvedCount}</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <p className="text-xs text-green-600 uppercase tracking-wide">Completed</p>
            <p className="text-3xl font-bold text-green-700 mt-1">{completedCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        {(['all', 'pending', 'approved', 'completed'] as const).map(status => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              filterStatus === status
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Transfers Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Transfers</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredTransfers.length === 0 ? (
            <p className="text-center text-slate-500 py-8">No transfers found</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Item</TableHead>
                    <TableHead className="text-xs">From</TableHead>
                    <TableHead className="text-xs text-center">→</TableHead>
                    <TableHead className="text-xs">To</TableHead>
                    <TableHead className="text-xs text-right">Qty</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransfers.map((transfer) => (
                    <TableRow key={transfer.id}>
                      <TableCell className="text-xs font-medium">{transfer.item_name}</TableCell>
                      <TableCell className="text-xs text-slate-600">{transfer.from_location}</TableCell>
                      <TableCell className="text-xs text-center">
                        <ArrowRight className="w-3 h-3 inline text-slate-400" />
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">{transfer.to_location}</TableCell>
                      <TableCell className="text-xs text-right font-semibold">{transfer.quantity}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          transfer.status === 'pending' ? 'border-amber-200 bg-amber-50 text-amber-700' :
                          transfer.status === 'approved' ? 'border-blue-200 bg-blue-50 text-blue-700' :
                          transfer.status === 'completed' ? 'border-green-200 bg-green-50 text-green-700' :
                          'border-red-200 bg-red-50 text-red-700'
                        }>
                          {transfer.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                          {transfer.status === 'approved' && <CheckCircle className="w-3 h-3 mr-1" />}
                          {transfer.status === 'completed' && <CheckCircle className="w-3 h-3 mr-1" />}
                          {transfer.status === 'cancelled' && <XCircle className="w-3 h-3 mr-1" />}
                          {transfer.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs space-x-1">
                        {transfer.status === 'pending' && (
                          <>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleApproveTransfer(transfer.id!)}
                              className="text-xs h-6"
                            >
                              Approve
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => handleCancelTransfer(transfer.id!)}
                              className="text-xs h-6"
                            >
                              Cancel
                            </Button>
                          </>
                        )}
                        {transfer.status === 'approved' && (
                          <Button 
                            size="sm"
                            onClick={() => handleCompleteTransfer(transfer.id!)}
                            className="text-xs h-6 bg-green-600 hover:bg-green-700"
                          >
                            Complete
                          </Button>
                        )}
                        {(transfer.status === 'completed' || transfer.status === 'cancelled') && (
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => handleCancelTransfer(transfer.id!)}
                            className="text-xs h-6"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Location Inventory Overview */}
      <div className="mt-8">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Location Inventory Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {LOCATIONS.map(location => {
            const locationItems = inventory.filter(i => i.location === location);
            const lowStockCount = locationItems.filter(i => i.current_stock < i.par_level * 0.5).length;
            
            return (
              <Card key={location} className="border-slate-200">
                <CardContent className="p-4">
                  <p className="font-semibold text-slate-900">{location}</p>
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div>
                      <p className="text-xs text-slate-500 uppercase">Items</p>
                      <p className="text-2xl font-bold text-slate-700">{locationItems.length}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase">Low Stock</p>
                      <p className={`text-2xl font-bold ${lowStockCount > 0 ? 'text-amber-700' : 'text-green-700'}`}>
                        {lowStockCount}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
