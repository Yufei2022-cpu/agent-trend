'use client';

import { useCallback } from 'react';
import type { FilterState } from '@/types';

interface FilterPanelProps {
    filters: FilterState;
    availableTags: string[];
    yearRange: { min: number; max: number };
    onFiltersChange: (filters: FilterState) => void;
}

export default function FilterPanel({
    filters,
    availableTags,
    yearRange,
    onFiltersChange,
}: FilterPanelProps) {
    const updateFilter = useCallback(
        (partial: Partial<FilterState>) => {
            onFiltersChange({ ...filters, ...partial });
        },
        [filters, onFiltersChange]
    );

    const toggleTag = useCallback(
        (tag: string) => {
            const newTags = filters.tags.includes(tag)
                ? filters.tags.filter((t) => t !== tag)
                : [...filters.tags, tag];
            updateFilter({ tags: newTags });
        },
        [filters.tags, updateFilter]
    );

    const clearAll = useCallback(() => {
        onFiltersChange({
            q: '',
            tags: [],
            yearFrom: yearRange.min,
            yearTo: yearRange.max,
        });
    }, [onFiltersChange, yearRange]);

    const hasActiveFilters =
        filters.q ||
        filters.tags.length > 0 ||
        filters.yearFrom > yearRange.min ||
        filters.yearTo < yearRange.max;

    return (
        <div className="card">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold gradient-text">
                    🔍 Search & Filter
                </h3>
                {hasActiveFilters && (
                    <button
                        onClick={clearAll}
                        className="text-xs text-indigo-500 hover:text-indigo-400 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
                    >
                        Clear all
                    </button>
                )}
            </div>

            {/* Search */}
            <div className="mb-4">
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search papers by title, abstract, author, tag..."
                        value={filters.q}
                        onChange={(e) => updateFilter({ q: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 pl-10 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                    />
                    <svg
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                    </svg>
                </div>
            </div>

            {/* Year Range */}
            <div className="mb-4">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">
                    Year Range
                </label>
                <div className="flex items-center gap-3">
                    <select
                        value={filters.yearFrom}
                        onChange={(e) => updateFilter({ yearFrom: Number(e.target.value) })}
                        className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                    >
                        {Array.from(
                            { length: yearRange.max - yearRange.min + 1 },
                            (_, i) => yearRange.min + i
                        ).map((y) => (
                            <option key={y} value={y} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                                {y}
                            </option>
                        ))}
                    </select>
                    <span className="text-slate-400 dark:text-slate-500">—</span>
                    <select
                        value={filters.yearTo}
                        onChange={(e) => updateFilter({ yearTo: Number(e.target.value) })}
                        className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                    >
                        {Array.from(
                            { length: yearRange.max - yearRange.min + 1 },
                            (_, i) => yearRange.min + i
                        ).map((y) => (
                            <option key={y} value={y} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                                {y}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Tags */}
            <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">
                    Tags
                </label>
                <div className="flex flex-wrap gap-2">
                    {availableTags.map((tag) => (
                        <button
                            key={tag}
                            onClick={() => toggleTag(tag)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${filters.tags.includes(tag)
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
                                : 'bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-700'
                                }`}
                        >
                            {tag}
                        </button>
                    ))}
                </div>
            </div>

            {/* Active filters summary */}
            {hasActiveFilters && (
                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex flex-wrap gap-1.5 items-center">
                        <span className="text-xs text-slate-400 dark:text-slate-500">Active:</span>
                        {filters.q && (
                            <span className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded text-xs">
                                &quot;{filters.q}&quot;
                            </span>
                        )}
                        {filters.tags.map((tag) => (
                            <span
                                key={tag}
                                className="px-2 py-1 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded text-xs cursor-pointer hover:bg-purple-200 dark:hover:bg-purple-900/60 transition-colors"
                                onClick={() => toggleTag(tag)}
                            >
                                {tag} ×
                            </span>
                        ))}
                        {(filters.yearFrom > yearRange.min || filters.yearTo < yearRange.max) && (
                            <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded text-xs">
                                {filters.yearFrom}–{filters.yearTo}
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
