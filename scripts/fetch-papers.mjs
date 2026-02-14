/**
 * Fetch real AI Agent papers from OpenAlex API
 * Usage: node scripts/fetch-papers.mjs
 *
 * OpenAlex is completely free, no API key required.
 * Polite pool: just provide an email in the query.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.join(__dirname, '..', 'data', 'papers.json');

// ---- Configuration ----

const POLITE_EMAIL = 'agenttrend@example.com';

// Search queries - broad coverage across all tag categories
const QUERIES = [
    'autonomous AI agent large language model',
    'LLM tool use function calling',
    'task planning decomposition language model agent',
    'multi-agent debate collaboration LLM',
    'retrieval augmented generation knowledge',
    'code generation software engineering agent',
    'web browser agent navigation interaction',
    'AI safety alignment guardrail jailbreak',
    'chain of thought reasoning prompting',
    'self-refinement reflection iterative improvement',
    'agent memory long-term knowledge',
    'agent evaluation benchmark testing',
    'reinforcement learning human feedback RLHF',
    'LLM agent framework ReAct tool',
    'multimodal agent vision language',
    'code agent SWE-bench repository',
];

// Extra queries specifically targeting 2025 trends
const QUERIES_2025 = [
    'AI agent 2025',
    'LLM agent reasoning 2025',
    'agentic AI workflow orchestration',
    'agent computer use GUI interaction',
    'AI agent tool use API integration 2025',
    'multi-agent system communication protocol',
    'autonomous coding agent software development',
    'AI agent planning world model',
    'LLM agent safety red teaming',
    'generalist agent embodied intelligence',
    'agent self-improvement evolution',
    'retrieval augmented generation agent 2025',
    'LLM agent benchmark evaluation 2025',
    'agentic RAG knowledge grounding',
    'language model agent web browsing automation',
    'agent memory retrieval context window',
    'multimodal agent grounding perception',
    'open source AI agent framework',
];

// ---- Auto-tagging rules ----

const TAG_RULES = [
    { tag: 'tool-use', patterns: ['tool use', 'tool-use', 'tool using', 'function call', 'function-call', 'api call', 'tool learning', 'tool augment', 'external tool', 'tool-integrated', 'tool interact', 'plugin', 'tool selection', 'toolformer', 'gorilla'] },
    { tag: 'planning', patterns: ['planning', 'task decompos', 'subgoal', 'sub-goal', 'hierarchical', 'action plan', 'task plan', 'plan generat', 'goal-oriented'] },
    { tag: 'multi-agent', patterns: ['multi-agent', 'multiagent', 'multi agent', 'collaborat', 'cooperative', 'debate among', 'society of', 'agent communi', 'multiple agent', 'agent interaction', 'two agent'] },
    { tag: 'memory', patterns: ['memory', 'long-term context', 'episodic', 'working memory', 'memory augment', 'memoriz', 'context management'] },
    { tag: 'RAG', patterns: ['retrieval-augmented', 'retrieval augmented', 'retrieval-enhanced', 'knowledge retrieval', 'retrieve and', 'knowledge-grounded', 'grounded generation', 'document retrieval'] },
    { tag: 'evaluation', patterns: ['benchmark', 'evaluat', 'leaderboard', 'test suite', 'assessment', 'scoring', 'human evaluation'] },
    { tag: 'reasoning', patterns: ['reasoning', 'chain-of-thought', 'chain of thought', 'step-by-step', 'tree of thought', 'logical', 'mathematical reasoning', 'commonsense reasoning', 'causal reasoning', 'multi-step reasoning'] },
    { tag: 'code-agent', patterns: ['code gen', 'coding', 'program synth', 'software engineer', 'swe-bench', 'code agent', 'code completion', 'code repair', 'automated debug', 'code language', 'source code'] },
    { tag: 'web-agent', patterns: ['web agent', 'web-agent', 'web brows', 'web navigation', 'web task', 'browser agent', 'web environment', 'web interact', 'website', 'html', 'webpage'] },
    { tag: 'self-refine', patterns: ['self-refin', 'self refin', 'self-correct', 'self correct', 'iterative refin', 'self-improv', 'self-critic', 'reflexion', 'reflection-based'] },
    { tag: 'safety', patterns: ['safety', 'alignment', 'harmless', 'jailbreak', 'guardrail', 'trustworth', 'red team', 'adversarial attack', 'toxic', 'harmful', 'responsible ai'] },
    { tag: 'RL', patterns: ['reinforcement learn', 'rlhf', 'reward model', 'policy gradient', 'ppo', 'human feedback', 'reward shaping', 'policy optimization'] },
];

const TITLE_TAG_BOOST = [
    { keywords: ['tool', 'function call', 'plugin', 'api'], tag: 'tool-use' },
    { keywords: ['plan', 'decompos'], tag: 'planning' },
    { keywords: ['multi-agent', 'multiagent', 'collaborat', 'debate'], tag: 'multi-agent' },
    { keywords: ['memory', 'memoriz'], tag: 'memory' },
    { keywords: ['retrieval', 'rag', 'knowledge'], tag: 'RAG' },
    { keywords: ['benchmark', 'evaluat', 'survey'], tag: 'evaluation' },
    { keywords: ['code', 'program', 'software', 'swe'], tag: 'code-agent' },
    { keywords: ['web', 'browser'], tag: 'web-agent' },
    { keywords: ['refine', 'reflect', 'correct'], tag: 'self-refine' },
    { keywords: ['safe', 'align', 'jailbreak', 'guardrail'], tag: 'safety' },
    { keywords: ['reinforcement', 'rlhf', 'reward'], tag: 'RL' },
    { keywords: ['reason', 'chain-of-thought', 'cot'], tag: 'reasoning' },
];

const METHOD_RULES = [
    { method: 'ReAct', patterns: ['react', 're-act', 'reasoning and acting', 'reason and act'] },
    { method: 'CoT', patterns: ['chain-of-thought', 'chain of thought', 'step-by-step'] },
    { method: 'ToT', patterns: ['tree of thought', 'tree-of-thought'] },
    { method: 'RAG', patterns: ['retrieval-augmented', 'retrieval augmented', 'retrieval-enhanced'] },
    { method: 'function calling', patterns: ['function call', 'api call', 'tool call', 'tool use'] },
    { method: 'self-refine', patterns: ['self-refin', 'self refin', 'iterative refin'] },
    { method: 'reflection', patterns: ['reflection', 'self-reflect', 'reflexion'] },
    { method: 'planning', patterns: ['planning', 'plan generation', 'task planning'] },
    { method: 'code generation', patterns: ['code gen', 'code synth', 'program gen'] },
    { method: 'prompting', patterns: ['prompting', 'prompt engineer', 'few-shot', 'zero-shot', 'in-context'] },
    { method: 'fine-tuning', patterns: ['fine-tun', 'finetun', 'instruction tun', 'sft'] },
    { method: 'RLHF', patterns: ['rlhf', 'reinforcement learning from human', 'human feedback'] },
    { method: 'role-playing', patterns: ['role-play', 'role play', 'persona'] },
    { method: 'benchmark', patterns: ['benchmark', 'evaluation framework', 'test suite'] },
    { method: 'multi-agent', patterns: ['multi-agent', 'multi agent', 'multiagent'] },
    { method: 'web browsing', patterns: ['web brows', 'web navigat', 'browser'] },
];

// ---- Utility functions ----

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function matchPatterns(text, patterns) {
    const lower = ` ${text.toLowerCase()} `;
    return patterns.some((p) => lower.includes(p));
}

function autoTag(title, abstract) {
    const text = `${title} ${abstract}`;
    const tags = TAG_RULES.filter((r) => matchPatterns(text, r.patterns)).map((r) => r.tag);
    const titleLower = ` ${title.toLowerCase()} `;
    for (const boost of TITLE_TAG_BOOST) {
        if (boost.keywords.some((k) => titleLower.includes(k)) && !tags.includes(boost.tag)) {
            tags.push(boost.tag);
        }
    }
    if (tags.length === 0) tags.push('evaluation');
    return [...new Set(tags)];
}

function autoMethods(title, abstract) {
    const text = `${title} ${abstract}`;
    const methods = METHOD_RULES.filter((r) => matchPatterns(text, r.patterns)).map((r) => r.method);
    if (methods.length === 0) methods.push('prompting');
    return [...new Set(methods)];
}

// ---- OpenAlex specific ----

function openAlexToVenue(source) {
    if (!source) return 'arXiv';
    return source.display_name || 'arXiv';
}

function extractUrl(work) {
    if (work.doi) return work.doi.replace('https://doi.org/', 'https://doi.org/');
    if (work.ids?.openalex) return `https://openalex.org/works/${work.ids.openalex.replace('https://openalex.org/', '')}`;
    return work.id || '';
}

function transformOpenAlexPaper(work, index) {
    const title = work.title || 'Untitled';

    let abstract = '';
    if (work.abstract_inverted_index) {
        const words = [];
        for (const [word, positions] of Object.entries(work.abstract_inverted_index)) {
            for (const pos of positions) {
                words[pos] = word;
            }
        }
        abstract = words.filter(Boolean).join(' ').slice(0, 500);
    }

    const year = work.publication_year || 2023;
    const month = work.publication_date
        ? parseInt(work.publication_date.split('-')[1], 10) || 1
        : Math.floor(Math.random() * 12) + 1;

    const venue = openAlexToVenue(work.primary_location?.source);
    const citations = work.cited_by_count || 0;
    const authors = (work.authorships || [])
        .map((a) => a.author?.display_name)
        .filter(Boolean)
        .slice(0, 5);

    const url = extractUrl(work);
    const tags = autoTag(title, abstract);
    const methods = autoMethods(title, abstract);

    return {
        id: `r${String(index).padStart(3, '0')}`,
        title, authors, year, month, venue, url, abstract,
        tags, methods, datasets: [], citations,
    };
}

async function fetchOpenAlex(query, page = 1, perPage = 25, { fromDate = '2020-01-01', toDate = '2026-12-31', sort = 'cited_by_count:desc' } = {}) {
    const url = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&filter=from_publication_date:${fromDate},to_publication_date:${toDate},type:article&per_page=${perPage}&page=${page}&sort=${sort}&mailto=${POLITE_EMAIL}`;

    console.log(`  📡 "${query}" (p${page}, ${sort.split(':')[0]}, ${fromDate.slice(0, 4)}-${toDate.slice(0, 4)})`);

    try {
        const res = await fetch(url);
        if (!res.ok) {
            console.error(`  ❌ HTTP ${res.status}: ${res.statusText}`);
            return [];
        }
        const data = await res.json();
        return data.results || [];
    } catch (err) {
        console.error(`  ❌ Error: ${err.message}`);
        return [];
    }
}

// Helper: collect into a bucket, deduplicating
function collectWorks(works, seenTitles, bucket) {
    let added = 0;
    for (const work of works) {
        if (!work.title) continue;
        const titleLower = work.title.toLowerCase();
        if (seenTitles.has(titleLower)) continue;
        if (!work.publication_year || work.publication_year < 2020) continue;
        seenTitles.add(titleLower);
        bucket.push(work);
        added++;
    }
    return added;
}

// ---- Main ----

async function main() {
    console.log('🚀 Fetching real AI Agent papers from OpenAlex...\n');

    const seenTitles = new Set();

    // ============================================================
    // Phase 1: 2025 papers (date-sorted, recent first)
    // ============================================================
    console.log('━━━ Phase 1: 2025 papers (recent first) ━━━\n');
    const papers2025 = [];

    for (const query of QUERIES_2025) {
        for (let page = 1; page <= 2; page++) {
            const works = await fetchOpenAlex(query, page, 25, {
                fromDate: '2025-01-01',
                toDate: '2026-02-14',
                sort: 'publication_date:desc',
            });
            collectWorks(works, seenTitles, papers2025);
            await sleep(200);
        }
    }

    // Supplement with general queries filtered to 2025
    for (const query of QUERIES) {
        const works = await fetchOpenAlex(query, 1, 25, {
            fromDate: '2025-01-01',
            toDate: '2026-02-14',
            sort: 'cited_by_count:desc',
        });
        collectWorks(works, seenTitles, papers2025);
        await sleep(200);
    }

    console.log(`\n📊 Phase 1 done: ${papers2025.length} papers from 2025+\n`);

    // ============================================================
    // Phase 2: Historical papers per year (2020-2024), by citations
    // ============================================================
    console.log('━━━ Phase 2: Historical papers (2020-2024, by citations) ━━━\n');
    const papersHistorical = [];

    // Fetch each year separately to guarantee year coverage
    for (let year = 2020; year <= 2024; year++) {
        const fromDate = `${year}-01-01`;
        const toDate = `${year}-12-31`;

        for (const query of QUERIES.slice(0, 8)) { // Use top 8 queries per year
            const works = await fetchOpenAlex(query, 1, 25, {
                fromDate, toDate,
                sort: 'cited_by_count:desc',
            });
            collectWorks(works, seenTitles, papersHistorical);
            await sleep(200);
        }
    }

    console.log(`\n📊 Phase 2 done: ${papersHistorical.length} historical papers\n`);

    // ============================================================
    // Merge: take all 2025 papers + historical papers
    // ============================================================
    const allWorks = [...papers2025, ...papersHistorical];

    // Transform to our schema
    const papers = allWorks
        .map((raw, i) => transformOpenAlexPaper(raw, i + 1))
        .filter((p) => p.abstract.length > 20);

    // Sort by year, month
    papers.sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
    });

    // Re-assign sequential IDs after sorting
    papers.forEach((p, i) => { p.id = `r${String(i + 1).padStart(3, '0')}`; });

    // Write output
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(papers, null, 2), 'utf-8');

    console.log(`\n✅ Done! Wrote ${papers.length} papers to data/papers.json`);

    // Stats
    const tagCounts = {};
    papers.forEach((p) => p.tags.forEach((t) => { tagCounts[t] = (tagCounts[t] || 0) + 1; }));
    console.log('\n📊 Tag distribution:');
    Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .forEach(([tag, count]) => console.log(`   ${tag}: ${count}`));

    const yearCounts = {};
    papers.forEach((p) => { yearCounts[p.year] = (yearCounts[p.year] || 0) + 1; });
    console.log('\n📅 Year distribution:');
    Object.entries(yearCounts)
        .sort((a, b) => Number(a[0]) - Number(b[0]))
        .forEach(([year, count]) => console.log(`   ${year}: ${count}`));

    const count2025 = papers.filter(p => p.year === 2025).length;
    console.log(`\n🎯 2025 papers: ${count2025}`);
}

main().catch(console.error);
