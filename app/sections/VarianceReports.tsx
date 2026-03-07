'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { RefreshCw, GitCompare, Sparkles, PieChart as PieChartIcon } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { callAIAgent } from '@/lib/aiAgent';

interface VarianceReportsProps {
  selectedLocation: string;
  activeAgentId: string | null;
  setActiveAgentId: (id: string | null) => void;
}

const AGENT_ID = '69a5b1a38413529629dda599';

const LOCATIONS = ['All Locations', 'Cafe du Monde Kiosk', 'Storyland Snacks', 'Morning Call Stand', 'Carousel Bar', 'Pavilion Grill'];
const DATE_RANGES = ['Today', 'Yesterday', 'Last 7 Days', 'Last 30 Days'];

const VARIANCE_DATA = [
  // No variance data until physical counts are conducted
];

function varianceRowColor(pct: number) {
  const abs = Math.abs(pct);
  if (abs <= 2) return '';
  if (abs <= 5) return 'bg-amber-50';
  return 'bg-red-50';
}

interface VarianceAnalysis {
  summary?: string;
  total_variance_value?: string;
  variance_by_category?: Array<{ category?: string; count?: string; total_value?: string; percentage_of_total?: string }>;
  top_variance_items?: Array<{ item_name?: string; theoretical_qty?: string; physical_qty?: string; variance_qty?: string; variance_percentage?: string; dollar_impact?: string; likely_cause?: string }>;
  location_ranking?: Array<{ location?: string; total_variance_value?: string; item_count?: string; severity?: string }>;
  patterns_identified?: Array<{ pattern?: string; evidence?: string; confidence?: string }>;
  recommended_actions?: Array<{ priority?: string; action?: string; rationale?: string; expected_outcome?: string }>;
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
  if (data?.result && typeof data.result === 'object' && !Array.isArray(data.result)) data = data.result;
  if (data?.response && typeof data.response === 'object' && !Array.isArray(data.response)) data = data.response;
  if (data?.data && typeof data.data === 'object' && !Array.isArray(data.data)) data = data.data;
  
  return data as VarianceAnalysis;
}

function renderMarkdown(text: string) {
  if (!text) return null;
  return (
    <div className="space-y-1.5">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### ')) return <h4 key={i} className="font-semibold text-sm mt-2 mb-1">{line.slice(4)}</h4>;
        if (line.startsWith('## ')) return <h3 key={i} className="font-semibold text-base mt-2 mb-1">{line.slice(3)}</h3>;
        if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} className="ml-4 list-disc text-sm">{line.slice(2)}</li>;
        if (!line.trim()) return <div key={i} className="h-1" />;
        return <p key={i} className="text-sm">{line}</p>;
      })}
    </div>
  );
}

function severityColor(s: string) {
  const sl = (s ?? '').toLowerCase();
  if (sl.includes('high') || sl.includes('critical') || sl.includes('severe')) return 'border-red-200 bg-red-50 text-red-700';
  if (sl.includes('medium') || sl.includes('moderate')) return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-green-200 bg-green-50 text-green-700';
}

function priorityBadge(p: string) {
  const pl = (p ?? '').toLowerCase();
  if (pl.includes('high') || pl === '1' || pl.includes('urgent')) return 'bg-red-100 text-red-700';
  if (pl.includes('medium') || pl === '2') return 'bg-amber-100 text-amber-700';
  return 'bg-green-100 text-green-700';
}

const CATEGORY_CHART_COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#10b981'];

export default function VarianceReports({ selectedLocation, activeAgentId, setActiveAgentId }: VarianceReportsProps) {
  const [location, setLocation] = useState(selectedLocation);
  const [dateRange, setDateRange] = useState('Last 7 Days');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<VarianceAnalysis | null>(null);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const filtered = location === 'All Locations' ? VARIANCE_DATA : VARIANCE_DATA.filter((v) => v.location === location);
  const totalVarianceValue = filtered.reduce((s, v) => s + Math.abs(v.dollarImpact), 0);
  const itemsWithVariance = filtered.filter((v) => Math.abs(v.pct) > 2).length;
  const locationsAffected = new Set(filtered.map((v) => v.location)).size;

  const handleAnalyze = async () => {
    setLoading(true);
    setError('');
    setActiveAgentId(AGENT_ID);
    const varData = filtered.map((v) => `${v.item}: Theoretical ${v.theoretical}, Physical ${v.physical}, Variance ${v.variance} (${v.pct.toFixed(1)}%), $${v.dollarImpact.toFixed(2)}, Cause: ${v.cause}`).join('\n');
    const message = `Run variance analysis for ${location}, ${dateRange}. Variance data:\n${varData}\nTotal variance: $${totalVarianceValue.toFixed(2)}. Identify patterns, rank locations, and recommend corrective actions.`;
    try {
      const result = await callAIAgent(message, AGENT_ID);
      const parsed = parseAgentResponse(result);
      if (parsed) { setAnalysis(parsed); } else { setError('Failed to parse variance analysis.'); }
    } catch {
      setError('Failed to run variance analysis. Please try again.');
    }
    setLoading(false);
    setActiveAgentId(null);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Variance Analysis</h2>
          <p className="text-sm text-slate-500 mt-0.5">Theoretical vs Physical stock comparison</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={location} onValueChange={setLocation}>
            <SelectTrigger className="w-48 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>{LOCATIONS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>{DATE_RANGES.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
          </Select>
          <Button onClick={handleAnalyze} disabled={loading} className="bg-teal-600 hover:bg-teal-700 text-white">
            {loading ? <><RefreshCw className="w-4 h-4 mr-1.5 animate-spin" /> Analyzing...</> : <><GitCompare className="w-4 h-4 mr-1.5" /> Run Analysis</>}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Total Variance Value</p>
            <p className="text-2xl font-bold text-red-600 mt-1">${totalVarianceValue.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Items with Variance</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{itemsWithVariance}</p>
            <p className="text-xs text-slate-400 mt-0.5">of {filtered.length} items</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Locations Affected</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{locationsAffected}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3"><CardTitle className="text-base font-semibold text-slate-900">Variance Detail</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Item</TableHead>
                  <TableHead className="text-xs">Theoretical</TableHead>
                  <TableHead className="text-xs">Physical</TableHead>
                  <TableHead className="text-xs">Variance</TableHead>
                  <TableHead className="text-xs">Variance %</TableHead>
                  <TableHead className="text-xs">$ Impact</TableHead>
                  <TableHead className="text-xs">Likely Cause</TableHead>
                  <TableHead className="text-xs">Location</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((v) => (
                  <TableRow key={`${v.item}-${v.location}`} className={varianceRowColor(v.pct)}>
                    <TableCell className="text-xs font-medium text-slate-800">{v.item}</TableCell>
                    <TableCell className="text-xs text-slate-600">{v.theoretical}</TableCell>
                    <TableCell className="text-xs text-slate-600">{v.physical}</TableCell>
                    <TableCell className={`text-xs font-semibold ${v.variance < 0 ? 'text-red-600' : 'text-green-600'}`}>{v.variance > 0 ? '+' : ''}{v.variance}</TableCell>
                    <TableCell className={`text-xs font-semibold ${Math.abs(v.pct) > 5 ? 'text-red-600' : Math.abs(v.pct) > 2 ? 'text-amber-600' : 'text-green-600'}`}>{v.pct > 0 ? '+' : ''}{v.pct.toFixed(1)}%</TableCell>
                    <TableCell className={`text-xs font-semibold ${v.dollarImpact < 0 ? 'text-red-600' : 'text-green-600'}`}>${v.dollarImpact.toFixed(2)}</TableCell>
                    <TableCell className="text-xs text-slate-600 max-w-[160px]">{v.cause}</TableCell>
                    <TableCell className="text-xs text-slate-500">{v.location}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-white border border-slate-200" /> Within tolerance (0-2%)</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-50 border border-amber-200" /> Warning (2-5%)</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-50 border border-red-200" /> Critical (&gt;5%)</span>
      </div>

      {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">{error}</div>}

      {analysis && (
        <div className="space-y-6">
          <Separator />
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-teal-600" />
            <h3 className="text-lg font-bold text-slate-900">AI Variance Analysis</h3>
          </div>

          {analysis.summary && (
            <Card className="border-teal-200 shadow-sm bg-teal-50/30">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-teal-800">Summary</CardTitle></CardHeader>
              <CardContent><div className="text-sm text-slate-700">{renderMarkdown(analysis.summary)}</div></CardContent>
            </Card>
          )}

          {analysis.total_variance_value && (
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs text-slate-500">AI-Calculated Total Variance</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{analysis.total_variance_value}</p>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Array.isArray(analysis.variance_by_category) && analysis.variance_by_category.length > 0 && (
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2"><PieChartIcon className="w-4 h-4 text-teal-600" /> Variance by Category</CardTitle></CardHeader>
                <CardContent>
                  {mounted && (
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={analysis.variance_by_category.map((c) => ({ name: c?.category ?? '', value: parseFloat(String(c?.percentage_of_total ?? '0').replace('%', '')) || 1 }))} cx="50%" cy="50%" outerRadius={65} innerRadius={35} dataKey="value" label={({ name }) => name}>
                            {analysis.variance_by_category.map((_, i) => <Cell key={i} fill={CATEGORY_CHART_COLORS[i % CATEGORY_CHART_COLORS.length]} />)}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  <div className="mt-2 space-y-1.5">
                    {analysis.variance_by_category.map((c, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: CATEGORY_CHART_COLORS[i % CATEGORY_CHART_COLORS.length] }} />{c?.category ?? ''}</span>
                        <span className="text-slate-500">{c?.total_value ?? ''} ({c?.percentage_of_total ?? ''})</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {Array.isArray(analysis.location_ranking) && analysis.location_ranking.length > 0 && (
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold text-slate-900">Location Ranking</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {analysis.location_ranking.map((lr, i) => (
                    <div key={i} className={`p-3 rounded-lg border ${severityColor(lr?.severity ?? '')}`}>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-slate-800">#{i + 1} {lr?.location ?? ''}</p>
                        <Badge variant="outline" className={`text-xs ${severityColor(lr?.severity ?? '')}`}>{lr?.severity ?? ''}</Badge>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">Variance: {lr?.total_variance_value ?? ''} | Items: {lr?.item_count ?? ''}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {Array.isArray(analysis.top_variance_items) && analysis.top_variance_items.length > 0 && (
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold text-slate-900">Top Variance Items (AI)</CardTitle></CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow><TableHead className="text-xs">Item</TableHead><TableHead className="text-xs">Theoretical</TableHead><TableHead className="text-xs">Physical</TableHead><TableHead className="text-xs">Variance</TableHead><TableHead className="text-xs">%</TableHead><TableHead className="text-xs">$ Impact</TableHead><TableHead className="text-xs">Cause</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {analysis.top_variance_items.map((tv, i) => (
                        <TableRow key={i}><TableCell className="text-xs font-medium">{tv?.item_name ?? ''}</TableCell><TableCell className="text-xs">{tv?.theoretical_qty ?? ''}</TableCell><TableCell className="text-xs">{tv?.physical_qty ?? ''}</TableCell><TableCell className="text-xs font-semibold text-red-600">{tv?.variance_qty ?? ''}</TableCell><TableCell className="text-xs font-semibold text-red-600">{tv?.variance_percentage ?? ''}</TableCell><TableCell className="text-xs font-semibold text-red-600">{tv?.dollar_impact ?? ''}</TableCell><TableCell className="text-xs text-slate-600 max-w-[180px]">{tv?.likely_cause ?? ''}</TableCell></TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {Array.isArray(analysis.patterns_identified) && analysis.patterns_identified.length > 0 && (
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold text-slate-900">Patterns Identified</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {analysis.patterns_identified.map((p, i) => (
                  <div key={i} className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-slate-800">{p?.pattern ?? ''}</p>
                      <Badge variant="outline" className="text-xs border-slate-200 text-slate-600">Confidence: {p?.confidence ?? ''}</Badge>
                    </div>
                    <p className="text-xs text-slate-600">{p?.evidence ?? ''}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {Array.isArray(analysis.recommended_actions) && analysis.recommended_actions.length > 0 && (
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold text-slate-900">Recommended Actions</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {analysis.recommended_actions.map((ra, i) => (
                  <div key={i} className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={`text-xs ${priorityBadge(ra?.priority ?? '')}`}>{ra?.priority ?? ''}</Badge>
                      <p className="text-sm font-semibold text-slate-800">{ra?.action ?? ''}</p>
                    </div>
                    <p className="text-xs text-slate-600">{ra?.rationale ?? ''}</p>
                    {ra?.expected_outcome && <p className="text-xs text-teal-700 mt-1 font-medium">Expected: {ra.expected_outcome}</p>}
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
