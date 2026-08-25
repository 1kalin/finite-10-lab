# Agent Wall information architecture

Status: implementation contract for the selected flagship. This document defines page purpose and indexing eligibility; it does not assert that an agent, integration, verification, or placement exists.

## Search and buyer journey

Agent Wall serves one primary journey: **find an AI agent for a specific job, inspect current evidence, then visit the agent's official destination**. Sponsorship may change presentation, but never evidence requirements or organic order.

The public hierarchy is deliberately shallow:

```text
Home /
├── Directory /agents/
│   └── Agent profile /agents/{agent-slug}/
├── Use cases /use-cases/
│   └── Curated use-case guide /use-cases/{use-case-slug}/
├── Integrations /integrations/
│   └── Verified integration collection /integrations/{integration-slug}/
├── Compare /compare/
│   └── Evidence comparison /compare/{agent-a}-vs-{agent-b}/
├── Methodology /methodology/
└── Listing standards /listing-standards/
```

Internal search, arbitrary filters, moderation previews, reservation flows, and account/admin pages are utilities rather than landing pages. They must not enter the index.

## Taxonomy

Use three independent, human-readable dimensions. Do not multiply them into crawlable combinations.

| Dimension | Meaning | Examples | Crawlable surface |
| --- | --- | --- | --- |
| Use case | The job a buyer needs done | research, customer support, coding | `/use-cases/{slug}/` after the quality gate |
| Integration | A tool the agent is evidenced to work with | Slack, GitHub, Salesforce | `/integrations/{slug}/` after verification and the quality gate |
| Capability | A factual facet used for filtering | browser use, API actions, human approval | Directory filter only; never an automatic landing page |

Categories are editorial labels, not vendor-selected ranking boosts. One primary use case is required per listing; secondary labels must be supported by the same evidence record. Slugs are lowercase ASCII words joined by hyphens. A renamed entity keeps its canonical slug unless the old URL can permanently redirect to the new one.

## Page contracts

| Route | Single intent | Required unique value | Index rule | Primary next step |
| --- | --- | --- | --- | --- |
| `/` | Understand Agent Wall and start discovery | Promise, scope, methodology summary, featured editorial paths | Index when disclosures and real directory links exist | Browse agents |
| `/agents/` | Browse all eligible agents | Search, approved facets, meaningful result summaries | Index when it contains real approved profiles | Open a profile |
| `/agents/{agent-slug}/` | Evaluate one agent | Original summary, evidenced capabilities and integrations, source links, disclosure, changelog, `last checked` | Index only after moderation and the profile evidence gate | Visit official destination |
| `/use-cases/` | Browse buyer jobs | Editorial taxonomy descriptions and eligible guide links | Index after at least two eligible child guides | Choose a use case |
| `/use-cases/{use-case-slug}/` | Shortlist agents for one job | At least 5 relevant agents, at least 300 words of unique analysis, methodology, selection rationale, and current evidence | Index only when every requirement is met; otherwise `noindex,follow` | Compare or inspect profiles |
| `/integrations/` | Browse evidenced tool compatibility | Explanation of verification and eligible integration links | Index after at least two eligible child collections | Choose an integration |
| `/integrations/{integration-slug}/` | Find agents evidenced for one tool | At least 5 relevant agents, verification source per agent, at least 300 words of unique analysis, and `last checked` | Index only while evidence remains current; otherwise `noindex,follow` | Inspect a profile |
| `/compare/` | Explain available evidence comparisons | Comparison policy and links to eligible comparisons | Index only when at least two eligible comparisons exist | Open a comparison |
| `/compare/{agent-a}-vs-{agent-b}/` | Compare a specific pair | Directly evidenced capability differences, methodology, sources, material trade-offs, and update date | Index only when both profiles are eligible and differentiation is substantive | Inspect or visit an agent |
| `/methodology/` | Explain selection, evidence, ranking, sponsorship, and freshness | Complete public method with revision date | Always index | Browse the directory |
| `/listing-standards/` | Explain eligibility and moderation | Standards, disclosures, correction and takedown paths | Always index once workflow exists | Submit or report a listing |

No tile, placement, or reservation receives a standalone indexable URL. A listing profile represents the agent; commercial placement state is separate.

## Navigation and crawl paths

The global header uses: **Agents**, **Use cases**, **Integrations**, **Methodology**. The primary CTA is **Browse agents** until a truthful submission flow is live. Listing submission may appear as a secondary action only after ticket #62 is approved.

Every indexable page must be reachable through ordinary `<a href>` links without JavaScript:

1. Home links to the directory and eligible editorial hubs.
2. Each hub links only to eligible children.
3. Collections link to every included agent profile.
4. Profiles link back to their approved use cases and verified integrations.
5. Breadcrumbs mirror the shortest canonical hierarchy.
6. Footer links to methodology, listing standards, privacy, terms, contact, and moderation/takedown policy when those pages ship.

Search and filtering may improve browsing, but cannot be the only discovery path for an indexable page.

## URL, canonical, and indexing rules

- Canonical URLs use HTTPS, the production host, lowercase slugs, and a trailing slash. Deployment must permanently redirect every other form to this form.
- The canonical for a profile is `/agents/{agent-slug}/`; placement, campaign, referral, and tracking parameters never change it.
- Paginated directory pages self-canonicalize when they contain distinct results. Filtered and sorted states canonicalize to `/agents/` and use `noindex,follow` unless an editorial collection explicitly graduates through the quality gate.
- Internal search results, zero-result states, arbitrary facet combinations, previews, drafts, rejected/removed profiles, reservation/checkout pages, and account/admin routes use `noindex,nofollow` where appropriate and must be excluded from the sitemap.
- A sub-threshold editorial collection remains accessible for users only if useful, with `noindex,follow`; otherwise return 404. Never return a thin 200 page merely to preserve a slug.
- Removed profiles return 410 when removal is permanent. Renames use a permanent redirect. Unknown routes return a real 404.
- Canonical tags are not a substitute for controlling crawlable links or preventing unbounded parameter URLs.

## Evidence and freshness gates

A profile is index-eligible only when it has an approved moderation state, official destination, original summary, at least one current source, explicit sponsor/complimentary disclosure where relevant, and a visible `last checked` date. Integration and capability claims inherit the source and review date that support them.

When evidence expires or a destination becomes unsafe, remove the page from hubs and the sitemap immediately. Keep it `noindex` during a bounded correction window, then restore, redirect, or return 410 according to the moderation decision. Public counts must derive from approved source records, never seeded or simulated inventory.

## Phased implementation

1. **Architecture phase (this ticket):** preserve this route and indexing contract.
2. **Data phase (#60):** model stable slugs, taxonomy relations, evidence, status, visibility, and history; render pages from validated records.
3. **Lifecycle and moderation (#61–#63):** make public eligibility derive from authoritative state and policy.
4. **SEO implementation (#67):** add metadata, canonicals, robots, sitemap, structured data, redirects, and crawl validation against this contract.

Until those phases pass review, the production build must not emit invented collection/profile pages or expose simulated inventory as crawlable truth.
