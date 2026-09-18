---
intent: 024-mobile-ergonomics
phase: inception
status: context-defined
updated: '2026-09-18T13:10:36Z'
---

# Mobile Ergonomics — System Context

## System Overview

Entirely inside the React PWA, and mostly inside one file: the theme. No data crosses any boundary
that did not already, no query changes, and nothing new is stored (NFR-1). What changes is how big
things are below `md`, and how two rows and one sheet arrange what they already show.

## Actors

- **Household member on a phone** (human): cooks from the step editor, shops from the list, and
  sets up the walking path one-handed. Every change here is theirs.
- **Household member at a desk**: must see no difference (NFR-2).

## External Systems

- **Supabase Postgres**: unchanged. No query, policy or table is touched.
- **claude-proxy Edge Function**: unchanged.

## Data Flows

None new. The aisle sheet keeps the reads and writes it has today; this intent adds a close control
beside them.

## Context Diagram

```mermaid
flowchart TB
    phone([Household member on a phone])
    desk([Household member at a desk])

    theme["theme/index.ts<br/>Button sizes: sm 44px below md (NEW), 34px at md+"]

    subgraph screens["Screens that inherit the size"]
        header["Header icons, week arrows,<br/>catalog + / eye, plan actions"]
        steps["CookingStepsEditor<br/>remove moved off the arrows (FR-2)"]
        row["LocationRow<br/>name first, actions below (FR-3)"]
        sheet["AssignSheet<br/>visible close, last action clear (FR-4)"]
    end

    phone --> screens
    desk -. unchanged .-> screens
    theme --> header & steps & row & sheet
```
