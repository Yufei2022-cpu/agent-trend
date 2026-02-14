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
const TARGET_TOTAL = 200;

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

// ---- Auto-tagging rules ----
// Patterns are matched case-insensitively against title+abstract.
// 'titleBoost' tags are added if the pattern matches the TITLE specifically.

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

// Title-specific tagging: if these words are in the title, force the tag
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

    // Title-based boost: if keywords appear in the title, add the tag
    const titleLower = ` ${title.toLowerCase()} `;
    for (const boost of TITLE_TAG_BOOST) {
        if (boost.keywords.some((k) => titleLower.includes(k)) && !tags.includes(boost.tag)) {
            tags.push(boost.tag);
        }
    }

    // Default fallback
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
    // Prefer DOI, then OpenAlex URL
    if (work.doi) return work.doi.replace('https://doi.org/', 'https://doi.org/');
    if (work.ids?.openalex) return `https://openalex.org/works/${work.ids.openalex.replace('https://openalex.org/', '')}`;
    return work.id || '';
}

function transformOpenAlexPaper(work, index) {
    const title = work.title || 'Untitled';

    // Get abstract from inverted index
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
        title,
        authors,
        year,
        month,
        venue,
        url,
        abstract,
        tags,
        methods,
        datasets: [],
        citations,
    };
}

async function fetchOpenAlex(query, page = 1, perPage = 25) {
    const url = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&filter=from_publication_date:2020-01-01,to_publication_date:2026-12-31,type:article&per_page=${perPage}&page=${page}&sort=cited_by_count:desc&mailto=${POLITE_EMAIL}`;

    console.log(`  📡 Fetching: "${query}" (page=${page})`);

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

// ---- Main ----

async function main() {
    console.log('🚀 Fetching real AI Agent papers from OpenAlex...\n');

    const seenTitles = new Set();
    const allPapers = [];

    for (const query of QUERIES) {
        // Fetch 2 pages per query for more coverage
        for (let page = 1; page <= 2; page++) {
            const works = await fetchOpenAlex(query, page, 25);

            for (const work of works) {
                if (!work.title) continue;
                const titleLower = work.title.toLowerCase();
                if (seenTitles.has(titleLower)) continue;
                if (!work.publication_year || work.publication_year < 2020) continue;

                seenTitles.add(titleLower);
                allPapers.push(work);
            }

            console.log(`  ✅ ${works.length} results, ${allPapers.length} unique papers total`);
            await sleep(200); // Polite delay
        }
        console.log('');

        if (allPapers.length >= TARGET_TOTAL) break;
    }

    // Transform to our schema
    const papers = allPapers
        .slice(0, TARGET_TOTAL)
        .map((raw, i) => transformOpenAlexPaper(raw, i + 1))
        .filter((p) => p.abstract.length > 20); // Filter out papers without meaningful abstracts

    // Sort by year, month
    papers.sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
    });

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
}

main().catch(console.error);
