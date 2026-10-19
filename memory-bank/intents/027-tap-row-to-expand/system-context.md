---
intent: 027-tap-row-to-expand
phase: inception
status: context-defined
updated: '2026-10-19T10:20:41Z'
---

# Tap Row to Expand: System Context

## System Overview

This is entirely in the React PWA, in one component: `PlanPage.tsx`. The bar of each picked dinner
on This week gets a click handler that does what the expand button does. No data, query, schema,
RLS or Edge Function change.

## Actors

- **Household member planning the week**: taps a picked dinner's bar to see its ingredients and
  steps, on a phone or a desktop.

## External Systems

None changed. Expanding still loads details through `useDinnerFullDetails`, as in intent 026.

## Event Flow

```mermaid
flowchart TB
    bar["Click on the bar<br/>(phone row / desktop card top)"]
    expand["Click on the expand icon"]
    remove["Click on remove"]
    details["Click inside the open details"]
    toggle["toggle: phone toggleRow(id),<br/>desktop setAllExpanded"]
    mutate["toggleSelection.mutate"]
    nothing["no toggle"]

    bar --> toggle
    expand -->|"stopPropagation, then"| toggle
    remove -->|"stopPropagation, then"| mutate
    details --> nothing
```
