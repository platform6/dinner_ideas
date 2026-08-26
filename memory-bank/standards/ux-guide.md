# UX Guide

## Overview

A mobile-first UI built on Chakra UI, so accessible interactive components (dropdowns, checkboxes, dialogs) come largely for free instead of being hand-rolled.

## Design System / Component Library

Chakra UI

Provides accessible, pre-built components suited to this app's needs: dropdowns/selects for dinner filters, checkboxes for the "pick 3 dinners" flow, cards for the dinner catalog, and dialogs for the future "add/edit recipe" feature. Chosen over a Tailwind-based approach (shadcn/ui, DaisyUI) per explicit preference.

## Styling Approach

Chakra's style props + theme system (no Tailwind) — one styling approach end-to-end, avoiding the redundancy of running two styling systems side by side.

## Accessibility

Chakra components are accessible by default (ARIA attributes, keyboard navigation, focus management). Custom, non-Chakra UI (dinner cards, shopping list view) should still follow baseline good practices: semantic HTML, sufficient color contrast, visible focus states. No formal WCAG audit — this is a two-person household app, not a public product.

## Responsive Strategy

Mobile-first, using Chakra's responsive style-prop syntax (e.g. `p={{ base: 4, md: 6 }}`). Phone/PWA use is the primary case; desktop just needs to remain usable.

## Decision Relationships

- Adopting Chakra UI supersedes the Tailwind CSS choice discussed earlier in tech-stack facilitation — Chakra's own styling engine replaces it rather than running alongside it.
