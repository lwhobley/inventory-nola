'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, AlertTriangle, TrendingDown, Send, Bell, Settings, Trash2 } from 'lucide-react';
import { getSupabaseAdmin } from '@/lib/supabase';

interface AlertRule {
  id?: string;
  item_name: string;
  location: string;
  alert_type: 'critical' | 'low' | 'overstocked' | 'custom';
  threshold: number;
  enabled: boolean;
  recipients?: string[];
  created_at?: string;
}

interface Alert {
  id?: string;
  item_name: string;
  location: string;
  current_stock: number;
  threshold: number;
  alert_type: string;
  severity: 'critical' | 'warning' | 'info';
  created_at?: string;
  resolved?: boolean;
}

const LOCATIONS = ['Cafe du Monde Kiosk', 'Storyland Snacks', 'Morning Call Stand', 'Carousel Bar', 'Pavilion Grill'];

export default function InventoryAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showRuleDialog, setShowRuleDialog] = useState(false);
  const [newRule, setNewRule] = useState<Partial<AlertRule>>({
    alert_type: 'critical',
    enabled: true,
  });

  // Load alerts and rules on mount
  useEffect(() => {
    loadAlerts();
    loadRules();
    
    // Refresh alerts every 30 seconds
    const interval = setInterval(() => {
      loadAlerts();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const loadAlerts = async () => {
    try {
      const supabase = getSupabaseAdmin();
      const { data, error: err } = await supabase
        .from('inventory_items')
        .select('*');
      
      if (err) {
        console.warn('Alert load error:', err.message);
        return;
      }
      
      // Generate alerts based on current inventory
      const generatedAlerts: Alert[] = [];
      
      data?.forEach((item: any) => {
        const { current_stock, par_level, name, location } = item;
        
        if (current_stock === 0) {
          generatedAlerts.push({
            item_name: name,
            location,
            current_stock,
            threshold: par_level,
            alert_type: 'out_of_stock',
            severity: 'critical',
          });
        } else if (current_stock < par_level * 0.2) {
          generatedAlerts.push({
            item_name: name,
            location,
            current_stock,
            threshold: par_level * 0.2,
            alert_type: 'critical_low',
            severity: 'critical',
          });
        } else if (current_stock < par_level * 0.5) {
          generatedAlerts.push({
            item_name: name,
            location,
            current_stock,
            threshold: par_level * 0.5,
            alert_type: 'low_stock',
            severity: 'warning',
          });
        } else if (current_stock > par_level * 1.8) {
          generatedAlerts.push({
            item_name: name,
            location,
            current_stock,
            threshold: par_level * 1.8,
            alert_type: 'overstocked',
            severity: 'info',
          });
        }
      });
      
      setAlerts(generatedAlerts);
    } catch (err) {
      console.error('Load alerts error:', err);
    }
  };

  const loadRules = async () => {
    try {
      const supabase = getSupabaseAdmin();
      const { data, error: err } = await supabase
        .from('alert_rules')
        .select('*');
      
      if (err) {
        console.warn('Rules load error:', err.message);
        return;
      }
      
      setRules(data || []);
    } catch (err) {
      console.error('Load rules error:', err);
    }
  };

  const handleAddRule = async () => {
    if (!newRule.item_name || !newRule.location || newRule.threshold === undefined) {
      setError('Please fill in all fields');
      return;
    }
    
    try {
      const supabase = getSupabaseAdmin();
      const { error: err } = await supabase
        .from('alert_rules')
        .insert([{
          item_name: newRule.item_name,
          location: newRule.location,
          alert_type: newRule.alert_type || 'critical',
          threshold: newRule.threshold,
          enabled: newRule.enabled !== false,
        }]);
      
      if (err) {
        setError(`Failed to add rule: ${err.message}`);
        return;
      }
      
      setSuccessMessage('Alert rule created!');
      setNewRule({ alert_type: 'critical', enabled: true });
      setShowRuleDialog(false);
      await loadRules();
      
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError('Failed to add rule. Please try again.');
      console.error(err);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    try {
      const supabase = getSupabaseAdmin();
      const { error: err } = await supabase
        .from('alert_rules')
        .delete()
        .eq('id', ruleId);
      
      if (err) {
        setError('Failed to delete rule');
        return;
      }
      
      setSuccessMessage('Rule deleted');
      await loadRules();
      
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError('Failed to delete rule');
      console.error(err);
    }
  };

  const handleSendAlert = async (alert: Alert) => {
    try {
      // In a real app, this would send an email/SMS
      setSuccessMessage(`Alert sent for ${alert.item_name} at ${alert.location}`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError('Failed to send alert');
      console.error(err);
    }
  };

  const criticalAlerts = alerts.filter(a => a.severity === 'critical');
  const warningAlerts = alerts.filter(a => a.severity === 'warning');
  const infoAlerts = alerts.filter(a => a.severity === 'info');

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Inventory Alerts</h2>
          <p className="text-sm text-slate-500 mt-0.5">Real-time stock level monitoring and alerts</p>
        </div>
        <Dialog open={showRuleDialog} onOpenChange={setShowRuleDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-teal-600 hover:bg-teal-700">
              <Settings className="w-4 h-4" /> Add Alert Rule
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Alert Rule</DialogTitle>
              <DialogDescription>Set up automatic alerts for inventory levels</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Item Name</Label>
                <Input 
                  value={newRule.item_name || ''} 
                  onChange={(e) => setNewRule({ ...newRule, item_name: e.target.value })} 
                  placeholder="e.g., Coffee Beans"
                />
              </div>
              <div>
                <Label>Location</Label>
                <Select value={newRule.location || ''} onValueChange={(v) => setNewRule({ ...newRule, location: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {LOCATIONS.map(loc => (
                      <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Alert Type</Label>
                <Select value={newRule.alert_type || 'critical'} onValueChange={(v) => setNewRule({ ...newRule, alert_type: v as any })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical (20% of par)</SelectItem>
                    <SelectItem value="low">Low (50% of par)</SelectItem>
                    <SelectItem value="overstocked">Overstocked (180% of par)</SelectItem>
                    <SelectItem value="custom">Custom Threshold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Custom Threshold (units)</Label>
                <Input 
                  type="number" 
                  value={newRule.threshold || 0} 
                  onChange={(e) => setNewRule({ ...newRule, threshold: parseInt(e.target.value) })} 
                  placeholder="0"
                />
              </div>
              <Button onClick={handleAddRule} className="w-full bg-teal-600 hover:bg-teal-700">Create Rule</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {error && <Alert className="bg-red-50 border-red-200"><AlertCircle className="h-4 w-4" /><AlertDescription className="text-red-700">{error}</AlertDescription></Alert>}
      {successMessage && <Alert className="bg-green-50 border-green-200"><AlertDescription className="text-green-700">{successMessage}</AlertDescription></Alert>}

      {/* Alert Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <p className="text-xs text-red-600 uppercase tracking-wide">Critical Alerts</p>
            <p className="text-3xl font-bold text-red-700 mt-1">{criticalAlerts.length}</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <p className="text-xs text-amber-600 uppercase tracking-wide">Warnings</p>
            <p className="text-3xl font-bold text-amber-700 mt-1">{warningAlerts.length}</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <p className="text-xs text-blue-600 uppercase tracking-wide">Info</p>
            <p className="text-3xl font-bold text-blue-700 mt-1">{infoAlerts.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Critical Alerts */}
      {criticalAlerts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-red-700 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" /> Critical Alerts ({criticalAlerts.length})
          </h3>
          {criticalAlerts.map((alert, i) => (
            <Card key={i} className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{alert.item_name}</p>
                    <p className="text-sm text-slate-600">{alert.location}</p>
                    <p className="text-xs text-red-700 mt-1">
                      Current: {alert.current_stock} units | Threshold: {alert.threshold} units
                    </p>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={() => handleSendAlert(alert)}
                    className="gap-1 bg-red-600 hover:bg-red-700"
                  >
                    <Send className="w-3 h-3" /> Alert
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Warning Alerts */}
      {warningAlerts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-amber-700 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" /> Warnings ({warningAlerts.length})
          </h3>
          {warningAlerts.map((alert, i) => (
            <Card key={i} className="border-amber-200 bg-amber-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{alert.item_name}</p>
                    <p className="text-sm text-slate-600">{alert.location}</p>
                    <p className="text-xs text-amber-700 mt-1">
                      Current: {alert.current_stock} units | Threshold: {alert.threshold} units
                    </p>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={() => handleSendAlert(alert)}
                    variant="outline"
                  >
                    <Send className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Info Alerts */}
      {infoAlerts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-blue-700 flex items-center gap-2">
            <TrendingDown className="w-5 h-5" /> Overstocked ({infoAlerts.length})
          </h3>
          {infoAlerts.map((alert, i) => (
            <Card key={i} className="border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{alert.item_name}</p>
                    <p className="text-sm text-slate-600">{alert.location}</p>
                    <p className="text-xs text-blue-700 mt-1">
                      Current: {alert.current_stock} units | Par: {alert.threshold} units
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {alerts.length === 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-8 text-center">
            <Bell className="w-12 h-12 text-green-400 mx-auto mb-2" />
            <p className="text-slate-700 font-semibold">All inventory levels are healthy!</p>
            <p className="text-sm text-slate-500 mt-1">No alerts at this time.</p>
          </CardContent>
        </Card>
      )}

      {/* Alert Rules */}
      <div className="mt-8">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Alert Rules</h3>
        <div className="space-y-3">
          {rules.length === 0 ? (
            <Card className="border-slate-200">
              <CardContent className="p-6 text-center">
                <p className="text-slate-500">No custom alert rules configured yet.</p>
              </CardContent>
            </Card>
          ) : (
            rules.map(rule => (
              <Card key={rule.id} className="border-slate-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{rule.item_name}</p>
                      <p className="text-sm text-slate-600">{rule.location}</p>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="outline">{rule.alert_type}</Badge>
                        <Badge variant={rule.enabled ? 'default' : 'secondary'}>
                          {rule.enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => rule.id && handleDeleteRule(rule.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
