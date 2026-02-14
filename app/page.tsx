'use client';

import { useState, useEffect, useCallback } from 'react';
import { searchPapers, initializeSearchIndex, getSearchStatus } from '@/lib/search';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import type {
  Paper,
  TrendDataPoint,
  TagDistribution,
  TagTimeSeriesPoint,
  CooccurrenceNode,
  CooccurrenceLink,
  CooccurrenceType,
  FilterState,
  Metric,
  Insight,
} from '@/types';

// Dynamic imports for chart components (avoid SSR issues with ECharts)
const TrendLineChart = dynamic(() => import('@/components/charts/TrendLineChart'), { ssr: false });
const TopTagsBarChart = dynamic(() => import('@/components/charts/TopTagsBarChart'), { ssr: false });
const TagHeatmap = dynamic(() => import('@/components/charts/TagHeatmap'), { ssr: false });
const CooccurrenceGraph = dynamic(() => import('@/components/charts/CooccurrenceGraph'), { ssr: false });

import FilterPanel from '@/components/filters/FilterPanel';
import PaperTable from '@/components/PaperTable';
import InsightsPanel from '@/components/InsightsPanel';
import TagAnalysisPanel from '@/components/TagAnalysisPanel';
import TrendPredictionPanel from '@/components/TrendPredictionPanel';
import ResearchAdvisorPanel from '@/components/ResearchAdvisorPanel';
import { ThemeToggle } from '@/components/ThemeToggle';

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize filters from URL
  const [filters, setFilters] = useState<FilterState>({
    q: searchParams.get('q') || '',
    tags: searchParams.get('tags')?.split(',').filter(Boolean) || [],
    yearFrom: Number(searchParams.get('yearFrom')) || 2020,
    yearTo: Number(searchParams.get('yearTo')) || 2026,
  });

  // State
  const [metric, setMetric] = useState<Metric>(
    (searchParams.get('metric') as Metric) || 'count'
  );
  const [cooccType, setCooccType] = useState<CooccurrenceType>('tags');
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
  const [tagDistribution, setTagDistribution] = useState<TagDistribution[]>([]);
  const [tagTimeSeries, setTagTimeSeries] = useState<TagTimeSeriesPoint[]>([]);
  const [cooccNodes, setCooccNodes] = useState<CooccurrenceNode[]>([]);
  const [cooccLinks, setCooccLinks] = useState<CooccurrenceLink[]>([]);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [allPapers, setAllPapers] = useState<Paper[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sync filters to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.q) params.set('q', filters.q);
    if (filters.tags.length > 0) params.set('tags', filters.tags.join(','));
    if (filters.yearFrom > 2020) params.set('yearFrom', String(filters.yearFrom));
    if (filters.yearTo < 2026) params.set('yearTo', String(filters.yearTo));
    if (metric !== 'count') params.set('metric', metric);

    const queryString = params.toString();
    const newUrl = queryString ? `/?${queryString}` : '/';
    router.replace(newUrl, { scroll: false });
  }, [filters, metric, router]);

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const filterParams = new URLSearchParams();
      if (filters.tags.length > 0) filterParams.set('tags', filters.tags.join(','));
      if (filters.yearFrom > 2020) filterParams.set('yearFrom', String(filters.yearFrom));
      if (filters.yearTo < 2026) filterParams.set('yearTo', String(filters.yearTo));

      const searchFilterParams = new URLSearchParams(filterParams);
      if (filters.q) searchFilterParams.set('q', filters.q);

      const [trendsRes, tagsRes, cooccRes, searchRes] = await Promise.all([
        fetch(`/api/trends?groupBy=month&metric=${metric}&${filterParams}`),
        fetch(`/api/tags?groupBy=month&${filterParams}`),
        fetch(`/api/cooccurrence?type=${cooccType}&min=2`),
        fetch(`/api/search?${searchFilterParams}`),
      ]);

      if (!trendsRes.ok || !tagsRes.ok || !cooccRes.ok || !searchRes.ok) {
        throw new Error('Failed to fetch data from one or more APIs');
      }

      const [trends, tags, coocc, search] = await Promise.all([
        trendsRes.json(),
        tagsRes.json(),
        cooccRes.json(),
        searchRes.json(),
      ]);

      setTrendData(trends.data || []);
      setTagDistribution(tags.distribution || []);
      setTagTimeSeries(tags.timeSeries || []);
      setCooccNodes(coocc.nodes || []);
      setCooccLinks(coocc.links || []);
      setPapers(search.papers || []);

      // Extract available tags from distribution
      if (availableTags.length === 0 && tags.distribution) {
        setAvailableTags(tags.distribution.map((t: TagDistribution) => t.tag));
      }

      // Generate insights client side from search results
      const insightsRes = await fetch('/api/search');
      if (insightsRes.ok) {
        const allData = await insightsRes.json();
        const allPapersList = allData.papers || [];
        setAllPapers(allPapersList);
        generateClientInsights(allPapersList);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [filters, metric, cooccType, availableTags.length]);

  // Generate insights from data
  const generateClientInsights = (allPapers: Paper[]) => {
    if (allPapers.length === 0) {
      setInsights([]);
      return;
    }

    const newInsights: Insight[] = [];

    // Peak year
    const yearCounts = new Map<number, number>();
    allPapers.forEach((p) => yearCounts.set(p.year, (yearCounts.get(p.year) || 0) + 1));
    const peakYear = [...yearCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (peakYear) {
      newInsights.push({
        type: 'peak',
        icon: '🏔️',
        text: `${peakYear[0]} was the peak publication year with ${peakYear[1]} papers.`,
        value: `${peakYear[1]} papers`,
      });
    }

    // Most cited
    const topCited = [...allPapers].sort((a, b) => b.citations - a.citations)[0];
    if (topCited) {
      newInsights.push({
        type: 'milestone',
        icon: '🏆',
        text: `"${topCited.title}" leads with ${topCited.citations.toLocaleString()} citations.`,
        value: `${topCited.citations.toLocaleString()}`,
      });
    }

    // Growth analysis
    const years = [...new Set(allPapers.map((p) => p.year))].sort();
    if (years.length >= 2) {
      const lastYear = years[years.length - 1];
      const prevYear = years[years.length - 2];
      const lastCount = allPapers.filter((p) => p.year === lastYear).length;
      const prevCount = allPapers.filter((p) => p.year === prevYear).length;
      if (prevCount > 0) {
        const growth = Math.round(((lastCount - prevCount) / prevCount) * 100);
        newInsights.push({
          type: growth > 0 ? 'growth' : 'declining',
          icon: growth > 0 ? '📈' : '📉',
          text: `Publication volume ${growth > 0 ? 'grew' : 'declined'} ${Math.abs(growth)}% from ${prevYear} to ${lastYear}.`,
          value: `${growth > 0 ? '+' : ''}${growth}%`,
        });
      }
    }

    // Top tag
    const tagCounts = new Map<string, number>();
    allPapers.forEach((p) => p.tags.forEach((t) => tagCounts.set(t, (tagCounts.get(t) || 0) + 1)));
    const topTag = [...tagCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (topTag) {
      newInsights.push({
        type: 'milestone',
        icon: '🔬',
        text: `"${topTag[0]}" is the most researched topic with ${topTag[1]} papers (${Math.round((topTag[1] / allPapers.length) * 100)}%).`,
        value: `${topTag[1]} papers`,
      });
    }

    // Fastest growing tag
    if (years.length >= 2) {
      const lastYear = years[years.length - 1];
      const prevYear = years[years.length - 2];
      const tagGrowth = new Map<string, { prev: number; last: number }>();
      allPapers.forEach((p) => {
        if (p.year === lastYear || p.year === prevYear) {
          p.tags.forEach((tag) => {
            const entry = tagGrowth.get(tag) || { prev: 0, last: 0 };
            if (p.year === lastYear) entry.last++;
            else entry.prev++;
            tagGrowth.set(tag, entry);
          });
        }
      });

      let fastest = '';
      let maxRate = 0;
      tagGrowth.forEach(({ prev, last }, tag) => {
        if (prev >= 2) {
          const rate = (last - prev) / prev;
          if (rate > maxRate) { maxRate = rate; fastest = tag; }
        }
      });

      if (fastest) {
        newInsights.push({
          type: 'growth',
          icon: '🚀',
          text: `"${fastest}" is the fastest-growing tag, up ${Math.round(maxRate * 100)}% year-over-year.`,
          value: `+${Math.round(maxRate * 100)}%`,
        });
      }
    }

    setInsights(newInsights.slice(0, 5));
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleTagClick = useCallback(
    (tag: string) => {
      setFilters((prev) => ({
        ...prev,
        tags: prev.tags.includes(tag)
          ? prev.tags.filter((t) => t !== tag)
          : [...prev.tags, tag],
      }));
    },
    []
  );

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-slate-800/80 backdrop-blur-sm sticky top-0 z-50 bg-[#0b0f1a]/80">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-extrabold gradient-text">
                AgentTrend
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                AI Agent Research Trend Explorer
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs text-slate-600 dark:text-slate-500 bg-slate-100 dark:bg-slate-800/60 px-3 py-1.5 rounded-full">
                {papers.length} papers loaded
              </span>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-fade-in">
        {error && (
          <div className="p-4 bg-red-900/20 border border-red-700/50 rounded-lg text-red-300 text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* Insights */}
        <InsightsPanel insights={insights} loading={loading} />

        {/* Row 1: Trend Chart + Top Tags */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3">
            <TrendLineChart
              data={trendData}
              metric={metric}
              loading={loading}
              onMetricChange={setMetric}
            />
          </div>
          <div className="lg:col-span-2">
            <TopTagsBarChart
              data={tagDistribution}
              loading={loading}
              onTagClick={handleTagClick}
            />
          </div>
        </div>

        {/* Row 2: Tag Heatmap */}
        <TagHeatmap
          data={tagTimeSeries}
          loading={loading}
          onCellClick={(tag) => handleTagClick(tag)}
        />

        {/* Row 3: Co-occurrence + Filters */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3">
            <CooccurrenceGraph
              nodes={cooccNodes}
              links={cooccLinks}
              type={cooccType}
              loading={loading}
              onTypeChange={setCooccType}
            />
          </div>
          <div className="lg:col-span-2">
            <FilterPanel
              filters={filters}
              availableTags={availableTags}
              yearRange={{ min: 2020, max: 2026 }}
              onFiltersChange={setFilters}
            />
          </div>
        </div>

        {/* Row 4: Paper Table */}
        <PaperTable
          papers={papers}
          loading={loading}
          onTagClick={handleTagClick}
        />

        {/* Row 5: Tag Deep Analysis (only shown when tags are selected) */}
        <TagAnalysisPanel
          papers={papers}
          selectedTags={filters.tags}
          loading={loading}
        />

        {/* Row 6: Research Advisor (only shown when tags are selected) */}
        <ResearchAdvisorPanel
          papers={papers}
          allPapers={allPapers}
          selectedTags={filters.tags}
          loading={loading}
        />

        {/* Row 7: Trend Prediction */}
        <TrendPredictionPanel
          papers={papers}
          loading={loading}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/50 mt-12">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-xs text-slate-600">
          AgentTrend — Built with Next.js, ECharts & TailwindCSS • Mock data for demonstration
        </div>
      </footer>
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
            <p className="text-slate-400">Loading dashboard...</p>
          </div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
