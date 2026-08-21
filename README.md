# US Privacy Law Comparison

An interactive US map that lets anyone click two states and see how their comprehensive consumer data privacy laws compare, with disagreements highlighted so the "patchwork problem" is obvious at a glance.

## What it does

- **Map**: all 50 states, colored by law status — green (comprehensive law in effect), yellow (passed, not yet in effect), gray (no comprehensive law).
- **Comparison**: click two states → a side-by-side table appears with 9 provisions. Rows where the two states disagree are highlighted in yellow (`#FEF3C7`).
- **Editorial line**: when the two selections produce a striking contrast (one has no law, they differ on private right of action, or they disagree on 3+ provisions), a one-line explanation appears beneath the table.
- **Glossary**: `/glossary` page with plain-English definitions for the legal terms; field labels in the comparison table link to the anchor for that term.

## Run locally

```bash
npm install
npm start
```

Then open http://localhost:3000.

Build a production bundle:

```bash
npm run build
```

## Updating the data

All state data lives in `src/data/states.json`. Each entry is keyed by the state's USPS two-letter code and has this shape:

```json
{
  "CA": {
    "name": "California",
    "status": "active",
    "lawName": "California Consumer Privacy Act (CCPA/CPRA)",
    "effectiveDate": "January 2020",
    "appliesTo": "$25M+ revenue OR 100K+ consumers OR 50%+ revenue from selling data",
    "rightToDelete": true,
    "rightToOptOutProfiling": true,
    "privateRightOfAction": "limited",
    "universalOptOut": true,
    "curePeriod": "None",
    "enforcement": "AG + California Privacy Protection Agency"
  }
}
```

Field reference:

| Field | Type | Notes |
| --- | --- | --- |
| `name` | string | Full state name shown on chips and column headers |
| `status` | `"active"` \| `"pending"` \| `"none"` | Drives the map color (green / yellow / gray) |
| `lawName` | string | Short statute name, use `"No comprehensive privacy law"` for `"none"` states |
| `effectiveDate` | string | Human-readable (e.g. `"January 2020"`); use `"—"` for none |
| `appliesTo` | string | Short business-applicability phrase; `"—"` for none |
| `rightToDelete` | boolean | Renders ✓ / ✗ |
| `rightToOptOutProfiling` | boolean | Renders ✓ / ✗ |
| `privateRightOfAction` | `"full"` \| `"limited"` \| `"no"` | ✓, ✓ (limited), or ✗ — two states only "match" on this field when the string is identical |
| `universalOptOut` | boolean | GPC support requirement |
| `curePeriod` | string | e.g. `"30 days"`, `"None"`, `"—"` |
| `enforcement` | string | e.g. `"AG only"`, `"AG + dedicated agency"` |

**Diff rule:** the comparison table uses raw equality per field to decide which rows to highlight. Strings are compared as-is, booleans as booleans. Keep values consistent (`"None"` vs `"none"` will count as differing).

After updating `states.json`, update `src/data/lastUpdated.js` so the footer date reflects the change.

## Data sources

State law statuses and provisions are compiled from the [IAPP US State Privacy Legislation Tracker](https://iapp.org/resources/article/us-state-privacy-legislation-tracker/) and [Mayer Brown's State Privacy Trackers](https://www.mayerbrown.com/en/insights/publications). This tool is a summary aggregator and is **not legal advice**.

## Stack

- Create React App (`react-scripts` 5)
- `react-router-dom` for routing
- `react-simple-maps` + `us-atlas` for the flat US map (TopoJSON bundled — no runtime CDN)
- Plain CSS (no Tailwind); all data ships static
