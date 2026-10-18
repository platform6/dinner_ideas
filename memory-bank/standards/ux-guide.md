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

## Photo slots

Intent 002 laid out three photo slots ahead of real photos. No dinner has an image field yet, so all
three are switched off by `SHOW_PHOTO_SLOTS` (`src/shared/components/photo-slots.ts`, `false`, intent 025).
They are part of the design, not removed. Turning the constant on restores them as listed:

| Where                                         | Slot                                          | Holds              |
| --------------------------------------------- | --------------------------------------------- | ------------------ |
| Catalog dinner card (`DinnerCard`)            | 76×76px `paper.sunken` tile, `control` radius | Cuisine icon, 30px |
| Cooking view row (`CookingViewPage`)          | 44×44px `paper.sunken` thumb                  | Cuisine icon, 20px |
| This week three-across card (`PlanPage`, md+) | Full-width, 76px tall `paper.sunken` tile     | Nothing            |

While the slots are off, the cooking view shows a 13px cuisine icon at the start of its meta row
instead, because the thumb was its only cuisine icon. The catalog card already has one in its meta
row. The hidden dinners page's 38px icon tile is not a photo slot.
