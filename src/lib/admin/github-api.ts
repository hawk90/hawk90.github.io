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
  basePath: string = 'public/images/blog'
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
      branch: 'main',
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

    // Remove quotes if present
    if (
      (typeof value === 'string' && value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    // Parse booleans
    if (value === 'true') value = true;
    if (value === 'false') value = false;

    frontmatter[key] = value;
  }

  return frontmatter;
}

/**
 * Fetch all draft posts from the content directory.
 */
export async function fetchDrafts(
  token: string,
  owner: string,
  repo: string,
  contentPath: string = 'src/content/blog'
): Promise<DraftPost[]> {
  const drafts: DraftPost[] = [];

  // Recursive function to scan directories
  async function scanDirectory(path: string): Promise<void> {
    try {
      const contents = await fetchRepoContents(token, owner, repo, path);

      for (const item of contents) {
        if (item.type === 'dir') {
          await scanDirectory(item.path);
        } else if (item.name.endsWith('.md') || item.name.endsWith('.mdx')) {
          // Fetch file content to check frontmatter
          try {
            const content = await fetchFileContent(token, owner, repo, item.path);
            const frontmatter = parseFrontmatter(content);

            if (frontmatter.draft === true) {
              drafts.push({
                slug: item.path
                  .replace(contentPath + '/', '')
                  .replace(/\.(md|mdx)$/, ''),
                path: item.path,
                title: (frontmatter.title as string) || item.name,
                date: (frontmatter.date as string) || '',
                sha: item.sha,
              });
            }
          } catch {
            // Skip files that can't be read
          }
        }
      }
    } catch {
      // Directory doesn't exist or can't be read
    }
  }

  await scanDirectory(contentPath);

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
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

  if (!frontmatterMatch) {
    // No frontmatter - create one
    const lines = Object.entries(updates)
      .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
      .join('\n');
    return `---\n${lines}\n---\n\n${content}`;
  }

  const existingFrontmatter = parseFrontmatter(content);
  const newFrontmatter = { ...existingFrontmatter, ...updates };

  const lines = Object.entries(newFrontmatter)
    .map(([key, value]) => {
      if (typeof value === 'string') {
        return `${key}: "${value}"`;
      }
      return `${key}: ${JSON.stringify(value)}`;
    })
    .join('\n');

  const body = content.slice(frontmatterMatch[0].length).trim();
  return `---\n${lines}\n---\n\n${body}`;
}
