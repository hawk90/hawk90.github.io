/**
 * Posts the homepage offers as a way in, by post id.
 *
 * These used to be the `startHereIds` of a Topic Hub. Hubs were a second
 * curation axis alongside learning paths, and the two answered questions that
 * had already converged: the one published hub, PCIe & CXL, duplicated part 9
 * of the computer-from-scratch path down to the same series and the same
 * Enumeration → BAR → DMA → Interrupt framing. The hub layer is gone; the
 * three entry points it curated were worth keeping, so they live here as what
 * they actually are — a short, hand-picked list, not a byproduct of a taxonomy.
 *
 * Ids are validated at build time by `assertHomepageGuidesExist`; a renamed or
 * unpublished post fails the build rather than silently vanishing.
 */
export const HOMEPAGE_GUIDE_IDS: readonly string[] = [
  'embedded/hardware/pcie/chapter01-fundamentals',
  'embedded/hardware/pcie/chapter04-bar-mmio',
  'embedded/hardware/cxl/chapter08-cxl-mem',
];
