'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { RefreshCw, TrendingUp, TrendingDown, Sparkles, TrendingUpIcon } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { callAIAgent } from '@/lib/aiAgent';

interface FinancialDashboardProps {
  selectedLocation: string;
  activeAgentId: string | null;
  setActiveAgentId: (id: string | null) => void;
}

const AGENT_ID = '69a5b1a3f2d0d9c8063d1a47';

const REVENUE_COGS_DATA = [
  { location: 'Cafe du Monde', revenue: 4280, cogs: 1420 },
  { location: 'Storyland', revenue: 2150, cogs: 780 },
  { location: 'Morning Call', revenue: 3640, cogs: 1210 },
  { location: 'Carousel Bar', revenue: 2870, cogs: 890 },
  { location: 'Pavilion Grill', revenue: 1880, cogs: 646 },
];

const MARGIN_TREND = [
  { period: 'Week 1', margin: 64.2 }, { period: 'Week 2', margin: 65.8 }, { period: 'Week 3', margin: 63.5 },
  { period: 'Week 4', margin: 66.1 }, { period: 'Week 5', margin: 67.3 }, { period: 'Week 6', margin: 66.6 },
];

const WASTE_BY_CATEGORY = [
  { name: 'Expired', value: 42, color: '#ef4444' },
  { name: 'Spillage', value: 22, color: '#f59e0b' },
  { name: 'Prep Error', value: 18, color: '#3b82f6' },
  { name: 'Equipment', value: 11, color: '#8b5cf6' },
  { name: 'Other', value: 7, color: '#6b7280' },
];

const PERIODS = ['This Week', 'Last Week', 'This Month', 'Last Month'];

interface FinancialAnalysis {
  executive_summary?: string;
  key_metrics?: Array<{ name?: string; value?: string; trend?: string; status?: string }>;
  location_performance?: Array<{ location?: string; revenue?: string; cogs?: string; gross_profit_margin?: string; waste_percentage?: string; status?: string }>;
  trend_analysis?: Array<{ metric?: string; direction?: string; details?: string }>;
  anomalies?: Array<{ description?: string; severity?: string; affected_location?: string; recommended_action?: string }>;
  recommendations?: Array<{ priority?: string; title?: string; description?: string; estimated_impact?: string }>;
}

function parseAgentResponse(result: ReturnType<typeof callAIAgent> extends Promise<infer T> ? T : never) {
  if (!result?.success) return null;
  let data = result?.response?.result;
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch { try { data = JSON.parse(JSON.parse(data)); } catch { return null; } }
  }
  if (data?.result && typeof data.result === 'object') data = data.result;
  return data as FinancialAnalysis;
}

function renderMarkdown(text: string) {
  if (!text) return null;
  return (
    <div className="space-y-1.5">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### ')) return <h4 key={i} className="font-semibold text-sm mt-2 mb-1">{line.slice(4)}</h4>;
        if (line.startsWith('## ')) return <h3 key={i} className="font-semibold text-base mt-2 mb-1">{line.slice(3)}</h3>;
        if (line.startsWith('# ')) return <h2 key={i} className="font-bold text-lg mt-3 mb-1">{line.slice(2)}</h2>;
        if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} className="ml-4 list-disc text-sm">{line.slice(2)}</li>;
        if (!line.trim()) return <div key={i} className="h-1" />;
        return <p key={i} className="text-sm">{line}</p>;
      })}
    </div>
  );
}

function severityColor(s: string) {
  const sl = (s ?? '').toLowerCase();
  if (sl.includes('high') || sl.includes('critical')) return 'border-red-200 bg-red-50 text-red-700';
  if (sl.includes('medium') || sl.includes('moderate')) return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-green-200 bg-green-50 text-green-700';
}

function priorityColor(p: string) {
  const pl = (p ?? '').toLowerCase();
  if (pl.includes('high') || pl === '1') return 'bg-red-100 text-red-700';
  if (pl.includes('medium') || pl === '2') return 'bg-amber-100 text-amber-700';
  return 'bg-green-100 text-green-700';
}

function statusMetricColor(s: string) {
  const sl = (s ?? '').toLowerCase();
  if (sl.includes('good') || sl.includes('positive') || sl.includes('healthy')) return 'text-green-600';
  if (sl.includes('warning') || sl.includes('caution')) return 'text-amber-600';
  if (sl.includes('critical') || sl.includes('negative') || sl.includes('poor')) return 'text-red-600';
  return 'text-slate-600';
}

export default function FinancialDashboard({ selectedLocation, activeAgentId, setActiveAgentId }: FinancialDashboardProps) {
  const [period, setPeriod] = useState('This Week');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<FinancialAnalysis | null>(null);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const totalRevenue = REVENUE_COGS_DATA.reduce((s, d) => s + d.revenue, 0);
  const totalCogs = REVENUE_COGS_DATA.reduce((s, d) => s + d.cogs, 0);
  const grossProfit = totalRevenue - totalCogs;
  const grossMargin = ((grossProfit / totalRevenue) * 100).toFixed(1);
  const wasteCost = WASTE_BY_CATEGORY.reduce((s, d) => s + d.value, 0) * 2.5;

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    setActiveAgentId(AGENT_ID);
    const finData = REVENUE_COGS_DATA.map((d) => `${d.location}: Revenue $${d.revenue}, COGS $${d.cogs}, Margin ${(((d.revenue - d.cogs) / d.revenue) * 100).toFixed(1)}%`).join('\n');
    const message = `Generate financial insights for ${selectedLocation} for ${period}. Financial data:\n${finData}\nTotal Revenue: $${totalRevenue}, Total COGS: $${totalCogs}, Gross Margin: ${grossMargin}%, Waste Cost: $${wasteCost.toFixed(0)}.\nProvide executive summary, key metrics, location performance, trend analysis, anomalies, and recommendations.`;
    try {
      const result = await callAIAgent(message, AGENT_ID);
      const parsed = parseAgentResponse(result);
      if (parsed) { setAnalysis(parsed); } else { setError('Failed to parse financial analysis.'); }
    } catch {
      setError('Failed to generate financial report. Please try again.');
    }
    setLoading(false);
    setActiveAgentId(null);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Financial Dashboard</h2>
          <p className="text-sm text-slate-500 mt-0.5">{selectedLocation} &middot; {period}</p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>{PERIODS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
          </Select>
          <Button onClick={handleGenerate} disabled={loading} className="bg-teal-600 hover:bg-teal-700 text-white">
            {loading ? <><RefreshCw className="w-4 h-4 mr-1.5 animate-spin" /> Generating...</> : <><TrendingUpIcon className="w-4 h-4 mr-1.5" /> Generate Report</>}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Revenue', value: `$${totalRevenue.toLocaleString()}`, color: 'text-slate-900' },
          { label: 'Total COGS', value: `$${totalCogs.toLocaleString()}`, color: 'text-red-600' },
          { label: 'Gross Profit', value: `$${grossProfit.toLocaleString()}`, color: 'text-green-600' },
          { label: 'Waste Cost', value: `$${wasteCost.toFixed(0)}`, color: 'text-amber-600' },
          { label: 'Net Margin', value: `${grossMargin}%`, color: 'text-teal-600' },
        ].map((card) => (
          <Card key={card.label} className="border-slate-200 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wide">{card.label}</p>
              <p className={`text-2xl font-bold mt-1 ${card.color}`}>{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {mounted && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 border-slate-200 shadow-sm">
            <CardHeader className="pb-3"><CardTitle className="text-base font-semibold text-slate-900">Revenue vs COGS by Location</CardTitle></CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={REVENUE_COGS_DATA}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="location" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(val: number) => `$${val.toLocaleString()}`} />
                    <Legend />
                    <Bar dataKey="revenue" name="Revenue" fill="#0d9488" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="cogs" name="COGS" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3"><CardTitle className="text-base font-semibold text-slate-900">Waste by Category</CardTitle></CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={WASTE_BY_CATEGORY} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {WASTE_BY_CATEGORY.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 space-y-1">
                {WASTE_BY_CATEGORY.map((w) => (
                  <div key={w.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: w.color }} />{w.name}</span>
                    <span className="text-slate-500">${(w.value * 2.5).toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {mounted && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-base font-semibold text-slate-900">Gross Profit Margin Trend</CardTitle></CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={MARGIN_TREND}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                  <YAxis domain={[60, 70]} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(val: number) => `${val}%`} />
                  <Line type="monotone" dataKey="margin" stroke="#0d9488" strokeWidth={2} dot={{ fill: '#0d9488', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">{error}</div>}

      {analysis && (
        <div className="space-y-6">
          <Separator />
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-teal-600" />
            <h3 className="text-lg font-bold text-slate-900">AI Financial Insights</h3>
          </div>

          {analysis.executive_summary && (
            <Card className="border-teal-200 shadow-sm bg-teal-50/30">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-teal-800">Executive Summary</CardTitle></CardHeader>
              <CardContent><div className="text-sm text-slate-700">{renderMarkdown(analysis.executive_summary)}</div></CardContent>
            </Card>
          )}

          {Array.isArray(analysis.key_metrics) && analysis.key_metrics.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {analysis.key_metrics.map((m, i) => (
                <Card key={i} className="border-slate-200 shadow-sm">
                  <CardContent className="p-4">
                    <p className="text-xs text-slate-500">{m?.name ?? ''}</p>
                    <p className="text-xl font-bold text-slate-900 mt-1">{m?.value ?? ''}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        {(m?.trend ?? '').includes('+') || (m?.trend ?? '').toLowerCase().includes('up') ? <TrendingUp className="w-3 h-3 text-green-500" /> : <TrendingDown className="w-3 h-3 text-red-500" />}
                        {m?.trend ?? ''}
                      </span>
                      <span className={`text-xs font-medium ${statusMetricColor(m?.status ?? '')}`}>{m?.status ?? ''}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {Array.isArray(analysis.location_performance) && analysis.location_performance.length > 0 && (
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold text-slate-900">Location Performance</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow><TableHead className="text-xs">Location</TableHead><TableHead className="text-xs">Revenue</TableHead><TableHead className="text-xs">COGS</TableHead><TableHead className="text-xs">Margin</TableHead><TableHead className="text-xs">Waste %</TableHead><TableHead className="text-xs">Status</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {analysis.location_performance.map((lp, i) => (
                        <TableRow key={i}><TableCell className="text-xs font-medium">{lp?.location ?? ''}</TableCell><TableCell className="text-xs">{lp?.revenue ?? ''}</TableCell><TableCell className="text-xs">{lp?.cogs ?? ''}</TableCell><TableCell className="text-xs font-semibold">{lp?.gross_profit_margin ?? ''}</TableCell><TableCell className="text-xs">{lp?.waste_percentage ?? ''}</TableCell><TableCell><Badge variant="outline" className={`text-xs ${severityColor(lp?.status ?? '')}`}>{lp?.status ?? ''}</Badge></TableCell></TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {Array.isArray(analysis.trend_analysis) && analysis.trend_analysis.length > 0 && (
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold text-slate-900">Trend Analysis</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {analysis.trend_analysis.map((t, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                    {(t?.direction ?? '').toLowerCase().includes('up') ? <TrendingUp className="w-4 h-4 text-green-500 mt-0.5 shrink-0" /> : <TrendingDown className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />}
                    <div><p className="text-sm font-medium text-slate-800">{t?.metric ?? ''} &mdash; {t?.direction ?? ''}</p><p className="text-xs text-slate-600">{t?.details ?? ''}</p></div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {Array.isArray(analysis.anomalies) && analysis.anomalies.length > 0 && (
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold text-slate-900">Anomalies Detected</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {analysis.anomalies.map((a, i) => (
                  <div key={i} className={`p-3 rounded-lg border ${severityColor(a?.severity ?? '')}`}>
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="outline" className={`text-xs ${severityColor(a?.severity ?? '')}`}>{a?.severity ?? ''}</Badge>
                      <span className="text-xs text-slate-500">{a?.affected_location ?? ''}</span>
                    </div>
                    <p className="text-sm text-slate-800">{a?.description ?? ''}</p>
                    <p className="text-xs text-slate-600 mt-1">Action: {a?.recommended_action ?? ''}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {Array.isArray(analysis.recommendations) && analysis.recommendations.length > 0 && (
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold text-slate-900">Recommendations</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {analysis.recommendations.map((r, i) => (
                  <div key={i} className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={`text-xs ${priorityColor(r?.priority ?? '')}`}>{r?.priority ?? ''}</Badge>
                      <p className="text-sm font-semibold text-slate-800">{r?.title ?? ''}</p>
                    </div>
                    <p className="text-xs text-slate-600">{r?.description ?? ''}</p>
                    {r?.estimated_impact && <p className="text-xs text-teal-700 mt-1 font-medium">Impact: {r.estimated_impact}</p>}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
