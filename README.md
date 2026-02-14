# AgentTrend

> Interactive dashboard for analyzing trends in AI Agent research papers.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![ECharts](https://img.shields.io/badge/ECharts-6-red)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4-blue?logo=tailwindcss)

## Features

- **📈 Trend Analysis** — Line charts showing paper count/citations over time
- **🏷️ Tag Distribution** — Top research tags with horizontal bar chart
- **🔥 Tag Heatmap** — Topic × time heatmap showing rise and fall of research areas
- **🕸️ Co-occurrence Network** — Force-directed graph for tag/method relationships
- **🔍 Search & Filter** — Full-text search, tag multi-select, year range filtering
- **📄 Paper Table** — Sortable, paginated table with links to paper details
- **💡 Trend Insights** — Auto-generated observations (top growing tag, peak year, etc.)
- **🌓 Theme Toggle** — Beautiful Light and Dark modes for better viewing experience
- **🔗 Similar Papers** — Jaccard similarity-based recommendations on paper detail pages
- **🔗 Shareable URLs** — All filter state synced to URL query parameters

## Quick Start

```bash
# Install dependencies
pnpm install

# Fetch real paper data (from OpenAlex API)
pnpm data:fetch
# Or directly: node scripts/fetch-papers.mjs

# Start development server
pnpm dev

# Open http://localhost:3000
```

## Project Structure

```
agent-trend/
├── app/
│   ├── page.tsx                     # Dashboard
│   ├── layout.tsx                   # Root layout
│   ├── globals.css                  # Global styles
│   ├── paper/[id]/page.tsx          # Paper detail page
│   └── api/
│       ├── trends/route.ts          # GET /api/trends
│       ├── tags/route.ts            # GET /api/tags
│       ├── cooccurrence/route.ts    # GET /api/cooccurrence
│       ├── search/route.ts          # GET /api/search
│       ├── paper/[id]/route.ts      # GET /api/paper/:id
│       └── similar/route.ts         # GET /api/similar
├── components/
│   ├── charts/
│   │   ├── TrendLineChart.tsx
│   │   ├── TopTagsBarChart.tsx
│   │   ├── TagHeatmap.tsx
│   │   └── CooccurrenceGraph.tsx
│   ├── filters/
│   │   └── FilterPanel.tsx
│   ├── ThemeProvider.tsx            # Next-themes wrapper
│   ├── ThemeToggle.tsx              # Sun/Moon switch
│   ├── PaperTable.tsx
│   └── InsightsPanel.tsx
├── data/
│   └── papers.json                  # Real paper data (~150+ papers)
├── scripts/
│   └── fetch-papers.mjs             # OpenAlex data fetching script
├── lib/
│   ├── data.ts                      # Data loading + Zod validation
│   ├── analytics.ts                 # Aggregation, similarity, insights
│   ├── query.ts                     # URL param parsing
│   └── sources/
│       └── index.ts                 # PaperSource adapter interface
├── types.ts                         # TypeScript interfaces
├── .env.example                     # Environment variable template
└── package.json
```

## API Endpoints

| Endpoint | Params | Description |
|---|---|---|
| `GET /api/trends` | `groupBy=month\|year`, `metric=count\|citations`, `tags`, `yearFrom`, `yearTo` | Time-series trend data |
| `GET /api/tags` | `groupBy=month\|year`, `yearFrom`, `yearTo` | Tag distribution + time series |
| `GET /api/cooccurrence` | `type=tags\|methods`, `min=N` | Co-occurrence network data |
| `GET /api/search` | `q`, `tags`, `yearFrom`, `yearTo` | Search & filter papers |
| `GET /api/paper/:id` | — | Single paper detail |
| `GET /api/similar` | `id` | Similar papers by Jaccard similarity |

## Verification Paths

1. **Tag filtering** — Click "multi-agent" tag → observe the trend chart, heatmap filter to show multi-agent papers; notice growth in 2023-2024
2. **Search** — Type "ReAct" in search → table shows 5+ related papers; clear search to return
3. **Metric toggle** — Switch to "Citations" in trend chart → observe different distribution pattern dominated by high-citation papers
4. **Paper detail** — Click any paper title → view abstract, tags, methods, and similar papers ranked by Jaccard similarity
5. **Co-occurrence** — Toggle to "Methods" in co-occurrence graph → see planning/CoT/ReAct cluster; toggle "Tags" to see multi-agent/planning cluster

## Extensibility: Adding Real Data Sources

The system is designed for easy integration with real paper data sources via the `PaperSource` adapter interface in `lib/sources/index.ts`:

```typescript
interface PaperSource {
  name: string;
  fetchPapers(params: FetchParams): Promise<Paper[]>;
  searchPapers(query: string, maxResults?: number): Promise<Paper[]>;
  getPaper(id: string): Promise<Paper | null>;
}
```

### To add arXiv:
1. Create `lib/sources/arxiv.ts` implementing `PaperSource`
2. Fetch from `http://export.arxiv.org/api/query` (XML response)
3. Parse and map to `Paper` interface
4. Set `ARXIV_API_URL` in `.env.local`

### To add Semantic Scholar:
1. Create `lib/sources/semantic-scholar.ts` implementing `PaperSource`
2. Use `https://api.semanticscholar.org/graph/v1/paper/search`
3. Set `SEMANTIC_SCHOLAR_API_KEY` in `.env.local`

### To add OpenAlex:
1. Create `lib/sources/openalex.ts` implementing `PaperSource`
2. Use `https://api.openalex.org/works` (no key needed for basic)
3. Set `OPENALEX_EMAIL` in `.env.local` for polite pool access

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Theming**: next-themes
- **Icons**: lucide-react
- **Language**: TypeScript 5
- **Styling**: TailwindCSS 4
- **Visualization**: ECharts 6 via echarts-for-react
- **Validation**: Zod 4
- **Package Manager**: pnpm
