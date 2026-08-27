import {
  ArrowRight,
  Beef,
  BookOpen,
  CalendarCheck,
  CalendarDays,
  CalendarOff,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  CookingPot,
  Copy,
  Croissant,
  Drumstick,
  Egg,
  Eye,
  EyeOff,
  Fish,
  Flame,
  Heart,
  Info,
  Leaf,
  Lock,
  LogOut,
  Mail,
  Milk,
  MoreVertical,
  Package,
  Plus,
  RotateCcw,
  Salad,
  Search,
  ShoppingBasket,
  SlidersHorizontal,
  Soup,
  Sparkles,
  Store,
  Utensils,
  UtensilsCrossed,
  Wheat,
  X,
  type LucideIcon,
} from 'lucide-react';

/**
 * Icon vocabulary for Dinner Ideas. One source of truth: components pull an
 * icon from these maps rather than importing lucide icons ad hoc, so a cuisine
 * or category never gets two different glyphs in two places.
 *
 * Install: pnpm add lucide-react
 *
 * Sizing convention (matches the design):
 *   inline metadata   13px, strokeWidth 1.8
 *   section labels    15px, strokeWidth 2
 *   inside buttons    13-17px, strokeWidth 2-2.6
 *   bottom nav        21px, strokeWidth 1.8 (2 when active)
 * Colour always comes from the parent via currentColor — never hardcode.
 */

/** Cuisines present in the seed data, plus a safe fallback. */
export const cuisineIcons: Record<string, LucideIcon> = {
  American: Drumstick,
  Chinese: Soup,
  Italian: Wheat,
  Japanese: Fish,
  Mediterranean: Salad,
  Mexican: Flame,
  Indian: Soup,
  Thai: Soup,
  French: Croissant,
  Greek: Salad,
};

export function cuisineIcon(cuisine: string | null | undefined): LucideIcon {
  if (!cuisine) return Utensils;
  return cuisineIcons[cuisine] ?? Utensils;
}

/** Shopping-list categories produced by aggregate.ts (Other = fallback). */
export const categoryIcons: Record<string, LucideIcon> = {
  Produce: Leaf,
  Protein: Beef,
  Dairy: Milk,
  Grains: Wheat,
  Pantry: Package,
  Other: ShoppingBasket,
};

export function categoryIcon(category: string): LucideIcon {
  return categoryIcons[category] ?? categoryIcons.Other;
}

/** Card metadata row. */
export const metaIcons = {
  cookTime: Clock,
  neverMade: CalendarOff,
  lastMade: CalendarCheck,
  rosieApproved: Heart, // render with fill="currentColor" in heart.500
} as const;

/** Bottom tab bar, in order. */
export const navItems = [
  { to: '/', label: 'Catalog', icon: BookOpen },
  { to: '/plan', label: 'This week', icon: CalendarDays },
  { to: '/shopping-list', label: 'List', icon: ShoppingBasket },
  { to: '/cooking', label: 'Cooking', icon: CookingPot },
] as const;

/**
 * Cooking steps. Steps have no type column in the schema, so pick by keyword
 * from the instruction text — good enough to give each step a face, and it
 * degrades to Utensils rather than to nothing.
 */
const stepRules: Array<[RegExp, LucideIcon]> = [
  [/(oven|preheat|heat the oven|line a sheet|\b\d{3}\s*°?F)/i, UtensilsCrossed],
  [/(toss|chop|dice|slice|mix|stir together|season|marinate)/i, Salad],
  [/(roast|bake|broil|grill|sear|saute|sauté|simmer|boil|fry)/i, Flame],
  [/(serve|plate|squeeze over|garnish|top with)/i, Utensils],
  [/(egg|whisk)/i, Egg],
];

export function stepIcon(instruction: string): LucideIcon {
  for (const [pattern, icon] of stepRules) if (pattern.test(instruction)) return icon;
  return Utensils;
}

/** Everything else the screens reference, so there is one import site. */
export const uiIcons = {
  add: Plus,
  check: Check,
  checkAll: CheckCheck,
  remove: X,
  suppress: EyeOff,
  restore: RotateCcw,
  filters: SlidersHorizontal,
  search: Search,
  copy: Copy,
  locked: Lock,
  info: Info,
  empty: Sparkles,
  back: ChevronLeft,
  nextWeek: ChevronRight,
  expand: ChevronDown,
  collapse: ChevronUp,
  forward: ArrowRight,
  email: Mail,
  password: Lock,
  reveal: Eye,
  hidePassword: EyeOff,
  logo: CookingPot,
  allCuisines: Utensils,
  shoppingList: ShoppingBasket,
  allDone: Sparkles,
  eaten: CalendarCheck,
  // Added in 002-kitchen-table-theme bolt 015 (structural nav — not in the original handoff).
  storeConfig: Store,
  logOut: LogOut,
  overflowMenu: MoreVertical,
} as const;

export type { LucideIcon };
