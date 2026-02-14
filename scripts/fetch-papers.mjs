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

// Search Depth & Limits
const FETCH_CONFIG = {
    PAGES_2025: 25,           // Pages to fetch for 2025 queries
    PAGES_HISTORICAL: 25,     // Pages per year for historical queries
    RESULTS_PER_PAGE: 200,    // Results per API call (max 200)
    START_YEAR: 2022,        // Starting year for historical search
    END_YEAR: 2026,          // Ending year for historical search
};

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

// Venue normalization patterns (regex for safety with short acronyms)
const VENUE_REGEX = [
    { regex: /\bneurips\b/i, val: 'NeurIPS' },
    { regex: /\bnips\b/i, val: 'NeurIPS' },
    { regex: /neural information processing systems/i, val: 'NeurIPS' },
    { regex: /\biclr\b/i, val: 'ICLR' },
    { regex: /international conference on learning representations/i, val: 'ICLR' },
    { regex: /\bicml\b/i, val: 'ICML' },
    { regex: /international conference on machine learning/i, val: 'ICML' },
    { regex: /\bcvpr\b/i, val: 'CVPR' },
    { regex: /computer vision and pattern recognition/i, val: 'CVPR' },
    { regex: /\biccv\b/i, val: 'ICCV' },
    { regex: /international conference on computer vision/i, val: 'ICCV' },
    { regex: /\beccv\b/i, val: 'ECCV' },
    { regex: /european conference on computer vision/i, val: 'ECCV' },
    { regex: /\bacl\b/i, val: 'ACL' },
    { regex: /association for computational linguistics/i, val: 'ACL' },
    { regex: /\bemnlp\b/i, val: 'EMNLP' },
    { regex: /empirical methods in natural language processing/i, val: 'EMNLP' },
    { regex: /\bnaacl\b/i, val: 'NAACL' },
    { regex: /\baaai\b/i, val: 'AAAI' },
    { regex: /association for the advancement of artificial intelligence/i, val: 'AAAI' },
    { regex: /\bijcai\b/i, val: 'IJCAI' },
    { regex: /international joint conference on artificial intelligence/i, val: 'IJCAI' },
    { regex: /\bkdd\b/i, val: 'KDD' },
    { regex: /knowledge discovery and data mining/i, val: 'KDD' },
    { regex: /\bsigir\b/i, val: 'SIGIR' },
    { regex: /\bwww\b/i, val: 'WWW' },
    { regex: /the web conference/i, val: 'WWW' },
    { regex: /\bchi\b/i, val: 'CHI' },
    { regex: /\bnature\b/i, val: 'Nature' },
    { regex: /\bscience\b/i, val: 'Science' },
    { regex: /arxiv/i, val: 'arXiv' },
];

// Strict whitelist of top venues
const ALLOWED_VENUES = new Set([
    'NeurIPS', 'ICLR', 'ICML', 'CVPR', 'ICCV', 'ECCV', 'ACL', 'EMNLP', 'NAACL',
    'AAAI', 'IJCAI', 'KDD', 'SIGIR', 'WWW', 'CHI', 'Nature', 'Science'
]);

function canonicalizeVenue(rawVenue) {
    if (!rawVenue) return 'arXiv';

    // Check regex patterns
    for (const { regex, val } of VENUE_REGEX) {
        if (regex.test(rawVenue)) return val;
    }

    // Return original if no match (will be filtered out later if not in allowed list)
    return rawVenue;
}

function openAlexToVenue(source) {
    if (!source) return 'arXiv';
    const raw = source.display_name || 'arXiv';
    return canonicalizeVenue(raw);
}

function extractUrl(work) {
    if (work.doi) return work.doi.replace('https://doi.org/', 'https://doi.org/');
    if (work.ids?.openalex) return `https://openalex.org/works/${work.ids.openalex.replace('https://openalex.org/', '')}`;
    return work.id || '';
}

function transformOpenAlexPaper(work, index) {
    // ... transformation logic remains the same ...
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

// ... fetchOpenAlex remains the same ...
async function fetchOpenAlex(query, page = 1, perPage = FETCH_CONFIG.RESULTS_PER_PAGE, { fromDate = '2020-01-01', toDate = '2026-12-31', sort = 'cited_by_count:desc' } = {}) {
    const url = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&filter=from_publication_date:${fromDate},to_publication_date:${toDate},type:article&per_page=${perPage}&page=${page}&sort=${sort}&mailto=${POLITE_EMAIL}`;

    console.log(`  📡 "${query}" (p${page}, ${sort.split(':')[0]}, ${fromDate.slice(0, 4)}-${toDate.slice(0, 4)})`);

    const MAX_RETRIES = 5;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const res = await fetch(url);

            if (res.status === 429) {
                const waitTime = attempt * 2000 + Math.random() * 1000;
                console.warn(`  ⚠️ Rate limited (429). Retrying in ${Math.round(waitTime / 1000)}s... (Attempt ${attempt}/${MAX_RETRIES})`);
                await sleep(waitTime);
                continue;
            }

            if (!res.ok) {
                console.error(`  ❌ HTTP ${res.status}: ${res.statusText}`);
                return [];
            }

            const data = await res.json();
            return data.results || [];
        } catch (err) {
            console.error(`  ❌ Error: ${err.message}`);
            // Network error, maybe retry?
            if (attempt < MAX_RETRIES) {
                await sleep(1000);
                continue;
            }
            return [];
        }
    }
    console.error(`  ❌ Failed after ${MAX_RETRIES} attempts.`);
    return [];
}

// Helper: collect into a bucket, deduplicating AND FILTERING VENUES
function collectWorks(works, seenTitles, bucket) {
    let added = 0;
    for (const work of works) {
        if (!work.title) continue;
        const titleLower = work.title.toLowerCase();
        if (seenTitles.has(titleLower)) continue;
        if (!work.publication_year || work.publication_year < 2020) continue;

        // Strict Venue Filter
        const venue = openAlexToVenue(work.primary_location?.source);
        if (!ALLOWED_VENUES.has(venue)) continue;

        seenTitles.add(titleLower);
        bucket.push(work);
        added++;
    }
    return added;
}

// ---- Main ----

async function main() {
    console.log('🚀 Fetching real AI Agent papers from OpenAlex (TOP VENUES ONLY)...\n');
    console.log(`  Target Venues: ${[...ALLOWED_VENUES].join(', ')}\n`);

    const seenTitles = new Set();

    // ============================================================
    // Phase 1: 2025 papers (date-sorted, recent first)
    // ============================================================
    console.log('━━━ Phase 1: 2025 papers (recent first) ━━━\n');
    const papers2025 = [];

    for (const query of QUERIES_2025) {
        // Use configuration for search depth
        for (let page = 1; page <= FETCH_CONFIG.PAGES_2025; page++) {
            const works = await fetchOpenAlex(query, page, FETCH_CONFIG.RESULTS_PER_PAGE, {
                fromDate: '2025-01-01',
                toDate: '2026-02-14',
                sort: 'publication_date:desc',
            });
            const count = collectWorks(works, seenTitles, papers2025);
            await sleep(200);
        }
    }

    // Supplement with general queries filtered to 2025
    for (const query of QUERIES) {
        for (let page = 1; page <= Math.ceil(FETCH_CONFIG.PAGES_2025 / 2); page++) {
            const works = await fetchOpenAlex(query, page, FETCH_CONFIG.RESULTS_PER_PAGE, {
                fromDate: '2025-01-01',
                toDate: '2026-02-14',
                sort: 'cited_by_count:desc',
            });
            collectWorks(works, seenTitles, papers2025);
            await sleep(200);
        }
    }

    console.log(`\n📊 Phase 1 done: ${papers2025.length} papers from 2025+\n`);

    // ============================================================
    // Phase 2: Historical papers per year (START_YEAR-END_YEAR)
    // ============================================================
    console.log(`━━━ Phase 2: Historical papers (${FETCH_CONFIG.START_YEAR}-${FETCH_CONFIG.END_YEAR}, by citations) ━━━\n`);
    const papersHistorical = [];

    // Fetch each year separately
    for (let year = FETCH_CONFIG.START_YEAR; year <= FETCH_CONFIG.END_YEAR; year++) {
        const fromDate = `${year}-01-01`;
        const toDate = `${year}-12-31`;

        for (const query of QUERIES.slice(0, 10)) {
            for (let page = 1; page <= FETCH_CONFIG.PAGES_HISTORICAL; page++) {
                const works = await fetchOpenAlex(query, page, FETCH_CONFIG.RESULTS_PER_PAGE, {
                    fromDate, toDate,
                    sort: 'cited_by_count:desc',
                });
                collectWorks(works, seenTitles, papersHistorical);
                await sleep(200);
            }
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
