/**
 * GitHub API Wrapper for Content Management
 *
 * Provides methods for:
 * - Fetching repository contents
 * - Creating/updating/deleting files
 * - Uploading images
 */

// ─── Types ──────────────────────────────────────────────────

export interface RepoContent {
  name: string;
  path: string;
  sha: string;
  size: number;
  type: 'file' | 'dir';
  download_url: string | null;
}

export interface FileContent {
  name: string;
  path: string;
  sha: string;
  content: string; // Base64 encoded
  encoding: 'base64';
}

export interface CommitResponse {
  content: {
    name: string;
    path: string;
    sha: string;
  };
  commit: {
    sha: string;
    message: string;
  };
}

export interface GitHubApiError {
  message: string;
  documentation_url?: string;
}

// ─── API Client ─────────────────────────────────────────────

const GITHUB_API = 'https://api.github.com';

async function githubFetch<T>(
  endpoint: string,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${GITHUB_API}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = (await response.json()) as GitHubApiError;
    throw new Error(error.message || `GitHub API error: ${response.status}`);
  }

  return response.json();
}

// ─── Repository Contents ────────────────────────────────────

/**
 * Fetch contents of a directory.
 */
export async function fetchRepoContents(
  token: string,
  owner: string,
  repo: string,
  path: string = ''
): Promise<RepoContent[]> {
  const endpoint = `/repos/${owner}/${repo}/contents/${path}`;
  const result = await githubFetch<RepoContent | RepoContent[]>(endpoint, token);

  // Single file returns object, directory returns array
  return Array.isArray(result) ? result : [result];
}

/**
 * Fetch a single file's content.
 */
export async function fetchFileContent(
  token: string,
  owner: string,
  repo: string,
  path: string
): Promise<string> {
  const endpoint = `/repos/${owner}/${repo}/contents/${path}`;
  const result = await githubFetch<FileContent>(endpoint, token);

  // Decode base64 content
  return atob(result.content.replace(/\n/g, ''));
}

/**
 * Fetch a file with its SHA (needed for updates).
 */
export async function fetchFileWithSha(
  token: string,
  owner: string,
  repo: string,
  path: string
): Promise<{ content: string; sha: string }> {
  const endpoint = `/repos/${owner}/${repo}/contents/${path}`;
  const result = await githubFetch<FileContent>(endpoint, token);

  return {
    content: atob(result.content.replace(/\n/g, '')),
    sha: result.sha,
  };
}

// ─── File Operations ────────────────────────────────────────

/**
 * Create a new file in the repository.
 */
export async function createFile(
  token: string,
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  branch: string = 'main'
): Promise<CommitResponse> {
  const endpoint = `/repos/${owner}/${repo}/contents/${path}`;

  return githubFetch<CommitResponse>(endpoint, token, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      content: btoa(unescape(encodeURIComponent(content))), // UTF-8 safe base64
      branch,
    }),
  });
}

/**
 * Update an existing file in the repository.
 */
export async function updateFile(
  token: string,
  owner: string,
  repo: string,
  path: string,
  content: string,
  sha: string,
  message: string,
  branch: string = 'main'
): Promise<CommitResponse> {
  const endpoint = `/repos/${owner}/${repo}/contents/${path}`;

  return githubFetch<CommitResponse>(endpoint, token, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      content: btoa(unescape(encodeURIComponent(content))), // UTF-8 safe base64
      sha,
      branch,
    }),
  });
}

/**
 * Delete a file from the repository.
 */
export async function deleteFile(
  token: string,
  owner: string,
  repo: string,
  path: string,
  sha: string,
  message: string,
  branch: string = 'main'
): Promise<CommitResponse> {
  const endpoint = `/repos/${owner}/${repo}/contents/${path}`;

  return githubFetch<CommitResponse>(endpoint, token, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      sha,
      branch,
    }),
  });
}

// ─── Image Upload ───────────────────────────────────────────

/**
 * Upload an image file to the repository.
 * Returns the URL path to use in markdown.
 */
export async function uploadImage(
  token: string,
  owner: string,
  repo: string,
  file: File,
  basePath: string = 'public/images/blog',
  branch: string = 'main'
): Promise<string> {
  // Generate path with date prefix
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');

  // Sanitize filename
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '-').toLowerCase();
  const timestamp = Date.now();
  const filename = `${timestamp}-${safeName}`;

  const path = `${basePath}/${year}/${month}/${filename}`;

  // Read file as base64
  const content = await fileToBase64(file);

  await githubFetch<CommitResponse>(`/repos/${owner}/${repo}/contents/${path}`, token, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: `Upload image: ${filename}`,
      content,
      branch,
    }),
  });

  // Return the URL path for markdown use
  // Remove 'public' prefix as it's served from root
  return path.replace(/^public/, '');
}

/**
 * Convert File to base64 string (without data URL prefix).
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:image/png;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─── Draft Management ───────────────────────────────────────

export interface DraftPost {
  slug: string;
  path: string;
  title: string;
  date: string;
  sha: string;
}

/**
 * Parse frontmatter from markdown content.
 *
 * Handles one-line scalars and bracket-arrays. The admin panel only emits
 * this flat shape from the new/edit pages, so we just round-trip what we
 * write — multi-line YAML block scalars (`|`/`>`) are intentionally not
 * supported.
 */
export function parseFrontmatter(content: string): Record<string, unknown> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};

  const frontmatter: Record<string, unknown> = {};
  const lines = match[1].split('\n');

  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;

    const key = line.slice(0, colonIndex).trim();
    let value: unknown = line.slice(colonIndex + 1).trim();

    // Array form: [a, b, c] — strip wrapping quotes on each item.
    if (typeof value === 'string' && value.startsWith('[') && value.endsWith(']')) {
      const inner = value.slice(1, -1).trim();
      value = inner
        ? inner
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean)
            .map((item) => item.replace(/^['"]|['"]$/g, ''))
        : [];
    } else if (typeof value === 'string') {
      // Scalars only: strip wrapping quotes, then convert literal "true"/"false".
      // Guarded so we don't call `.startsWith` on the array branch above.
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (value === 'true') value = true;
      else if (value === 'false') value = false;
    }

    frontmatter[key] = value;
  }

  return frontmatter;
}

export function splitFrontmatter(content: string): {
  frontmatter: Record<string, unknown>;
  body: string;
} {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    return { frontmatter: {}, body: content };
  }

  return {
    frontmatter: parseFrontmatter(content),
    body: match[2].replace(/^\n/, ''),
  };
}

export function serializeFrontmatter(frontmatter: Record<string, unknown>): string {
  const lines = Object.entries(frontmatter).map(([key, value]) => {
    if (Array.isArray(value)) {
      const serialized = value.map((item) => `"${String(item).replace(/"/g, '\\"')}"`).join(', ');
      return `${key}: [${serialized}]`;
    }

    if (typeof value === 'string') {
      return `${key}: "${value.replace(/"/g, '\\"')}"`;
    }

    return `${key}: ${JSON.stringify(value)}`;
  });

  return `---\n${lines.join('\n')}\n---`;
}

interface SearchResult {
  total_count: number;
  incomplete_results: boolean;
  items: Array<{
    name: string;
    path: string;
    sha: string;
    url: string;
    repository: { full_name: string };
  }>;
}

/**
 * Fetch all draft posts using GitHub Code Search API.
 * Much faster than scanning all files - searches for "draft: true" directly.
 */
export async function fetchDrafts(
  token: string,
  owner: string,
  repo: string,
  contentPath: string = 'src/content/blog',
  _branch: string = 'main'
): Promise<DraftPost[]> {
  // Use GitHub Code Search to find files with "draft: true"
  const query = encodeURIComponent(`"draft: true" repo:${owner}/${repo} path:${contentPath} extension:md`);
  const endpoint = `/search/code?q=${query}&per_page=100`;

  let searchResults: SearchResult;
  try {
    searchResults = await githubFetch<SearchResult>(endpoint, token);
  } catch {
    // Search API might fail (rate limits, etc.) - return empty
    console.warn('GitHub Code Search failed, returning empty drafts');
    return [];
  }

  if (searchResults.items.length === 0) {
    return [];
  }

  // Fetch content for matched files in parallel (these are confirmed drafts)
  const BATCH_SIZE = 5;
  const drafts: DraftPost[] = [];

  for (let i = 0; i < searchResults.items.length; i += BATCH_SIZE) {
    const batch = searchResults.items.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (file) => {
        try {
          const { content, sha } = await fetchFileWithSha(token, owner, repo, file.path);
          const frontmatter = parseFrontmatter(content);

          // Double-check it's actually a draft (search might have false positives)
          if (frontmatter.draft === true) {
            return {
              slug: file.path
                .replace(contentPath + '/', '')
                .replace(/\.(md|mdx)$/, ''),
              path: file.path,
              title: (frontmatter.title as string) || file.name,
              date: (frontmatter.date as string) || '',
              sha,
            };
          }
        } catch {
          // Skip files that can't be read
        }
        return null;
      })
    );

    drafts.push(...results.filter((d): d is DraftPost => d !== null));
  }

  // Sort by date (newest first)
  drafts.sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  return drafts;
}

// ─── Helper Functions ───────────────────────────────────────

/**
 * Parse owner and repo from a combined string (e.g., "owner/repo").
 */
export function parseRepo(repoString: string): { owner: string; repo: string } {
  const [owner, repo] = repoString.split('/');
  if (!owner || !repo) {
    throw new Error(`Invalid repo string: ${repoString}`);
  }
  return { owner, repo };
}

/**
 * Generate a new post template.
 */
export function generatePostTemplate(title: string, draft: boolean = true): string {
  const now = new Date();
  const date = now.toISOString().split('T')[0];

  return `---
title: "${title}"
date: ${date}
draft: ${draft}
description: ""
tags: []
---

`;
}

/**
 * Update frontmatter in markdown content.
 */
export function updateFrontmatter(
  content: string,
  updates: Record<string, unknown>
): string {
  const { frontmatter: existingFrontmatter, body } = splitFrontmatter(content);
  const newFrontmatter = { ...existingFrontmatter, ...updates };
  return `${serializeFrontmatter(newFrontmatter)}\n\n${body}`;
}
