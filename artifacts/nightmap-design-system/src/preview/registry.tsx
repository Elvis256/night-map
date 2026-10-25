import { lazy, type ComponentType } from 'react';
import {
  BrandPage,
  ColorsPage,
  FontsPage,
  LayoutPage,
  OverviewPage,
} from './nightmap-foundations';

function lazyPage(load: () => Promise<ComponentType>) {
  return lazy(async () => ({ default: await load() }));
}

const TrustBadgeDemo = lazyPage(() =>
  import('./demos/trust-badge').then(({ TrustBadgeDemo }) => TrustBadgeDemo),
);

export type PreviewEntry = {
  id: string;
  name: string;
  description: string;
  Page: ComponentType;
};

export type NavGroup = {
  name: string;
  entries: PreviewEntry[];
};

export const DESIGN_SYSTEM = {
  title: 'NightMap Design System',
  description:
    'A dark-first visual system for NightMap, a social discovery and companion-planning app.',
} as const;

export const OVERVIEW_ENTRY: PreviewEntry = {
  id: 'overview',
  name: 'Overview',
  description: 'The visual foundations and source-backed components used by NightMap.',
  Page: OverviewPage,
};

export const NAV_GROUPS: NavGroup[] = [
  {
    name: 'Brand',
    entries: [
      {
        id: 'brand-assets',
        name: 'Brand assets',
        description: 'The app mark and identity assets found in NightMap.',
        Page: BrandPage,
      },
    ],
  },
  {
    name: 'Colors',
    entries: [
      {
        id: 'color-roles',
        name: 'Color roles',
        description: 'NightMap’s light and dark semantic palettes.',
        Page: ColorsPage,
      },
    ],
  },
  {
    name: 'Fonts',
    entries: [
      {
        id: 'type-scale',
        name: 'Typography',
        description: 'Inter weights and the type sizes observed in the app.',
        Page: FontsPage,
      },
    ],
  },
  {
    name: 'Layout',
    entries: [
      {
        id: 'spacing-radius',
        name: 'Spacing and radius',
        description: 'The 4-pixel spacing base and 16-pixel base radius.',
        Page: LayoutPage,
      },
    ],
  },
  {
    name: 'Components',
    entries: [
      {
        id: 'trust-badge',
        name: 'Trust badge',
        description: 'The shared shield-and-score badge used on companion cards.',
        Page: TrustBadgeDemo,
      },
    ],
  },
];

export const ALL_ENTRIES: PreviewEntry[] = [
  OVERVIEW_ENTRY,
  ...NAV_GROUPS.flatMap((group) => group.entries),
];

const duplicateIds = ALL_ENTRIES.map((entry) => entry.id).filter(
  (id, index, ids) => ids.indexOf(id) !== index,
);

if (duplicateIds.length > 0) {
  throw new Error(
    `Duplicate preview page id(s): ${[...new Set(duplicateIds)].join(', ')}`,
  );
}
