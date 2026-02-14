import Link from 'next/link';
import { notFound } from 'next/navigation';
import { loadPapers } from '@/lib/data';
import { findSimilarPapers } from '@/lib/analytics';
import { ThemeToggle } from '@/components/ThemeToggle';

export default async function PaperDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const allPapers = loadPapers();
    const paper = allPapers.find((p) => p.id === id);

    if (!paper) {
        notFound();
    }

    const similar = findSimilarPapers(paper, allPapers, 5);

    return (
        <main className="min-h-screen bg-pattern py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <Link
                        href="/"
                        className="inline-flex items-center text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors group"
                    >
                        <span className="mr-2 transition-transform group-hover:-translate-x-1">
                            ←
                        </span>
                        Back to Dashboard
                    </Link>
                    <ThemeToggle />
                </div>

                {/* Paper Detail Card */}
                <div className="card space-y-6">
                    <div className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                            <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-semibold">
                                {paper.year}
                            </span>
                            <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full text-xs font-semibold">
                                {paper.venue}
                            </span>
                        </div>

                        <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 leading-tight">
                            {paper.title}
                        </h1>

                        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-600 dark:text-slate-400">
                            <div className="flex items-center">
                                <span className="mr-1.5 opacity-70">👥</span>
                                {paper.authors.join(', ')}
                            </div>
                            <div className="flex items-center">
                                <span className="mr-1.5 opacity-70">🌟</span>
                                {paper.citations.toLocaleString()} Citations
                            </div>
                            {paper.url && (
                                <a
                                    href={paper.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center"
                                >
                                    <span className="mr-1.5 opacity-70">🔗</span>
                                    View PDF / Source
                                </a>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-6 border-y border-slate-200 dark:border-slate-800">
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                Tags & Topics
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {paper.tags.map((tag) => (
                                    <span key={tag} className="tag-pill">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                Key Methods
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {paper.methods.map((method) => (
                                    <span
                                        key={method}
                                        className="px-2.5 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs font-medium border border-purple-200 dark:border-purple-800/50"
                                    >
                                        {method}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                            Abstract
                        </h3>
                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-justify">
                            {paper.abstract}
                        </p>
                    </div>
                </div>

                {/* Similar Papers */}
                <div className="space-y-4">
                    <h2 className="text-xl font-bold gradient-text">Similar Research</h2>
                    <div className="grid grid-cols-1 gap-4">
                        {similar.map(({ paper: simPaper, similarity }) => (
                            <Link
                                key={simPaper.id}
                                href={`/paper/${simPaper.id}`}
                                className="card group hover:translate-x-1 transition-all"
                            >
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex-1 space-y-2">
                                        <h4 className="font-semibold text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                            {simPaper.title}
                                        </h4>
                                        <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
                                            <span>{simPaper.year}</span>
                                            <span>•</span>
                                            <span>{simPaper.venue}</span>
                                        </div>
                                    </div>
                                    <div className="flex-shrink-0 px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded text-[10px] font-bold">
                                        {Math.round(similarity * 100)}% Match
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </main>
    );
}
