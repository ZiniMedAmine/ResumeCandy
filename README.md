# VibeCV

A resume builder where **versions are overlays, not copies**.

Each user has a collection of independent resumes (Software Engineer, Sales, …).
Inside a resume, you create unlimited **versions** (Google, Amazon, Startup, …).
A version stores only what it changes about the Default — so fixing a typo in
the Default fixes it in every version that never customized that field, and
"what differs" is always exact, never guessed.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000. The database (`data/vibecv.db`) is created,
migrated and seeded automatically on first load with a realistic Software
Engineer resume (Default / Google / Amazon versions).

Other commands:

```bash
npm run test         # engine unit tests (vitest)
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm run build        # production build
npm run db:generate  # regenerate drizzle migrations after schema changes
npm run db:seed      # seed manually (no-ops when data exists)
```

## The data model

Every piece of content — the header, each section, each experience, each
individual bullet — is one **node** with a stable id in a shared base tree
(`nodes`). A **version** (`versions`) stores only its divergences in
`node_overrides`, sparse by design:

| Overlay field | Meaning |
| --- | --- |
| `patch` | Only the fields that differ (`{"title": "Senior SWE"}`) — untouched fields keep inheriting |
| `hidden` | Node excluded from this version |
| `rank` | Reordered in this version only (fractional index) |

Content that exists in only one version is a node with `ownerVersionId` set.

Everything falls out of this shape:

- **Create version** — one row, empty overlay. O(1) at any scale.
- **Reset to Default** — delete override rows. Nothing to reconstruct.
- **See what differs** — `SELECT * FROM node_overrides WHERE version_id = ?`
  *is* the diff. The customizations panel renders it directly.
- **Instant switching** — one payload (base tree + all overlays) loads per
  resume; switching versions or tabs is a client-side re-resolve + `pushState`.

## Design settings (Customize tab)

Design follows the same layering as content: the resume stores base settings
(`resumes.settings`), each named version can override individual keys
(`versions.settingsPatch`). Editing Customize on the Default restyles every
version; on a named version it restyles that version only, with per-key
amber reset chips.

Settings: **template** (Classic — serif, centered, ruled sections · Modern —
sans, accent header, sidebar column), **page size** (A4 · Letter · Legal),
accent color (presets + custom hex), font family, font size, line height,
section spacing, page margins. Each template carries a natural typeface until
a font family is chosen explicitly.

## Pages

The preview is laid out on real sheets of the chosen size (A4 and US Letter
are the two resume standards; Legal suits long academic CVs). When content
outgrows a page it continues on the next one instead of stretching into an
endless strip.

Breaks are planned, not arbitrary. Content is rendered once off-screen to
measure every **block** — the header, each section heading, each entry's
title line, each bullet — and `src/lib/pagination.ts` decides which blocks
must move so that:

- no block is ever sliced by a page edge;
- a section heading is never stranded at the foot of a page without the entry
  that follows it (same for an entry's title line and its first bullet);
- a long entry splits between its bullets rather than jumping wholesale;
- in the two-column Modern template each column breaks independently, so the
  sidebar never shifts because the main column did.

The planner is pure geometry over measured blocks, so the rules are covered
by unit tests rather than eyeballed.

## PDF export

**Download** in the editor exports the version you're viewing; the dashboard
card menu exports a resume's Default. Both open `/print/[resumeId]/[versionId]`
in a hidden frame, which renders the paper alone — no application chrome — and
opens the browser's print dialog once fonts and pagination have settled. Choose
"Save as PDF" as the destination.

Export goes through the browser's own print pipeline rather than a canvas
screenshot, so the text in the PDF stays real text: selectable, searchable, and
readable by the applicant tracking systems that parse resumes. In print mode the
pages sit edge to edge with no gap, so the browser's page breaks land exactly on
the planner's, and `@page` is set to the resume's physical size (A4 / Letter /
Legal) with zero margin — the design's own margins do the spacing.

The print route is a plain URL, so you can open it directly to inspect what a
PDF will contain.

## Editing rules

- Editing the **Default** writes the base tree → flows into every version
  that hasn't overridden that field. The UI shows **"Updates N of M
  versions"** while you type.
- Editing a **named version** writes a per-field override → that version
  only. The first divergence pops a toast with Undo; customized fields carry
  an amber chip with **Reset / Push to Default / Copy to versions**.
- Typing a value back to the exact Default heals the override away.
- Adding content on a named version creates a version-local item
  (**"Only here"**), promotable to the Default.
- Deleting: local items delete; base items hide per-version, and hard-delete
  (all versions) is only offered from the Default, behind a confirm.

## Layout

```
src/db/            schema (drizzle/SQLite), client + auto-migration, seed
src/lib/resume/    the pure engine: resolve, patch, rank + unit tests
src/lib/           data loading, payload types, design settings,
                   pagination planner (+ tests), view/url
src/app/actions/   server actions: content, versions, resumes
src/store/         zustand store: optimistic edits, debounced persistence,
                   instant version/tab switching, toast undo
src/components/    Content tab (collapsible section cards, provenance
                   fields), Customize tab, paged preview (PagedPaper +
                   classic/modern templates), version rail, Cmd+K switcher,
                   manager table, customizations panel
```

Auth is stubbed (a seeded dev user owns the single collection); the schema is
auth-ready (`collections.userId`). Trashed versions purge after 30 days.
