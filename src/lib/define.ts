/**
 * Theme helper functions — single typed entrypoint for all blog config.
 *
 * Usage in src/consts/config.ts (or wherever you keep your config):
 *
 *   import { defineSite, defineBranding, defineNewsletter } from '@/lib/define';
 *
 *   export const SITE = defineSite({
 *     title: "My Blog",
 *     description: "Posts about X",
 *     author: "Me",
 *     url: "https://example.com",
 *     lang: "en",
 *   });
 *
 * Each `define*` is identity at runtime but gives IDE autocomplete and
 * type errors when the shape is wrong.
 */

// ─── Site ────────────────────────────────────────────────────
export interface SiteConfig {
  title: string;
  description: string;
  author: string;
  url: string;
  /** BCP-47 locale tag, e.g. "ko-KR", "en-US" */
  locale: string;
  lang: 'ko' | 'en' | 'ja' | 'zh';
}
export const defineSite = <T extends SiteConfig>(c: T) => c;

// ─── Branding ───────────────────────────────────────────────
export interface BrandingConfig {
  logoText: string;
  logoSuffix?: string;
  copyright: string;
  tagline: string;
  heroTitle: string;
  heroDescription: string;
}
export const defineBranding = <T extends BrandingConfig>(c: T) => c;

// ─── Navigation ─────────────────────────────────────────────
export interface NavItem {
  href: string;
  label: string;
  /** Path prefixes (incl. self) used to mark the link active */
  match?: ReadonlyArray<string>;
}
export const defineNav = <T extends ReadonlyArray<NavItem>>(c: T) => c;

// ─── Social ─────────────────────────────────────────────────
export interface SocialLink {
  name: string;
  href: string;
  /** Raw SVG markup, rendered via set:html */
  icon: string;
}
export const defineSocial = <T extends ReadonlyArray<SocialLink>>(c: T) => c;

// ─── Comments ───────────────────────────────────────────────
export type CommentsConfig =
  | { enabled: false }
  | {
      enabled: true;
      provider: 'giscus';
      repo: string;
      repoId: string;
      category: string;
      categoryId: string;
      lang?: string;
    };
export const defineComments = <T extends CommentsConfig>(c: T) => c;

// ─── Analytics ──────────────────────────────────────────────
export type AnalyticsConfig =
  | { enabled: false }
  | { enabled: true; provider: 'google'; id: string }
  | { enabled: true; provider: 'umami'; id: string; src?: string }
  | { enabled: true; provider: 'plausible'; id: string };
export const defineAnalytics = <T extends AnalyticsConfig>(c: T) => c;

// ─── Newsletter ─────────────────────────────────────────────
export type NewsletterConfig =
  | { enabled: false }
  | {
      enabled: true;
      /** Provider determines which embed/iframe is rendered */
      provider: 'beehiiv' | 'substack' | 'convertkit' | 'buttondown' | 'custom';
      /** Beehiiv: publication name; Substack: subdomain; ConvertKit: form id;
       *  Buttondown: username; custom: POST endpoint */
      publication: string;
      /** Optional copy overrides */
      title?: string;
      description?: string;
      buttonText?: string;
    };
export const defineNewsletter = <T extends NewsletterConfig>(c: T) => c;

// ─── Author (multi-author support) ──────────────────────────
export interface AuthorConfig {
  /** Slug used in URLs and the frontmatter `author:` field */
  id: string;
  name: string;
  bio?: string;
  avatar?: string;
  url?: string;
  social?: { twitter?: string; github?: string; linkedin?: string; email?: string };
}
export const defineAuthor = <T extends AuthorConfig>(c: T) => c;
export const defineAuthors = <T extends ReadonlyArray<AuthorConfig>>(c: T) => c;

// ─── Blog ───────────────────────────────────────────────────
export interface BlogConfig {
  postsPerPage: number;
  maxTagsInCard: number;
  maxTagsInSidebar: number;
}
export const defineBlog = <T extends BlogConfig>(c: T) => c;

// ─── UI ─────────────────────────────────────────────────────
export interface UiConfig {
  /** How many page numbers to show either side of the current */
  paginationDelta: number;
  tocHeadingDepth: { min: number; max: number };
  tocScrollOffset: number;
}
export const defineUi = <T extends UiConfig>(c: T) => c;
