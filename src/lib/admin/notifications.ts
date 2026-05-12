/**
 * Comment Notifications System
 *
 * Polls GitHub Discussions API for new comments on Giscus discussions.
 * Stores last check time in localStorage for tracking new comments.
 */

// ─── Types ──────────────────────────────────────────────────

export interface Comment {
  id: string;
  author: {
    login: string;
    avatarUrl: string;
  };
  body: string;
  bodyText: string;
  createdAt: string;
  url: string;
  discussionTitle: string;
  discussionUrl: string;
  isNew: boolean;
}

export interface Discussion {
  id: string;
  title: string;
  url: string;
  updatedAt: string;
  comments: {
    totalCount: number;
    nodes: Array<{
      id: string;
      author: { login: string; avatarUrl: string } | null;
      body: string;
      bodyText: string;
      createdAt: string;
      url: string;
    }>;
  };
}

interface GraphQLResponse {
  data: {
    repository: {
      discussions: {
        nodes: Discussion[];
      };
    };
  };
  errors?: Array<{ message: string }>;
}

// ─── Storage Keys ───────────────────────────────────────────

const STORAGE_KEYS = {
  lastCheck: 'admin_last_comment_check',
  seenComments: 'admin_seen_comments',
} as const;

// ─── GraphQL Query ──────────────────────────────────────────

const DISCUSSIONS_QUERY = `
  query($owner: String!, $name: String!, $first: Int!, $categoryId: ID) {
    repository(owner: $owner, name: $name) {
      discussions(
        first: $first
        orderBy: { field: UPDATED_AT, direction: DESC }
        categoryId: $categoryId
      ) {
        nodes {
          id
          title
          url
          updatedAt
          comments(first: 10, orderBy: { field: CREATED_AT, direction: DESC }) {
            totalCount
            nodes {
              id
              author {
                login
                avatarUrl
              }
              body
              bodyText
              createdAt
              url
            }
          }
        }
      }
    }
  }
`;

// ─── API Functions ──────────────────────────────────────────

/**
 * Fetch recent discussions with comments from GitHub.
 */
export async function fetchDiscussions(
  token: string,
  owner: string,
  repo: string,
  categoryId?: string,
  first: number = 20
): Promise<Discussion[]> {
  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: DISCUSSIONS_QUERY,
      variables: {
        owner,
        name: repo,
        first,
        categoryId: categoryId || null,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }

  const json = (await response.json()) as GraphQLResponse;

  if (json.errors?.length) {
    throw new Error(json.errors[0].message);
  }

  return json.data.repository.discussions.nodes;
}

/**
 * Extract and flatten comments from discussions.
 */
export function extractComments(
  discussions: Discussion[],
  sinceDate?: Date
): Comment[] {
  const comments: Comment[] = [];
  const seenIds = getSeenCommentIds();

  for (const discussion of discussions) {
    for (const comment of discussion.comments.nodes) {
      if (!comment.author) continue;

      const createdAt = new Date(comment.createdAt);
      const isNew = sinceDate ? createdAt > sinceDate : !seenIds.has(comment.id);

      comments.push({
        id: comment.id,
        author: {
          login: comment.author.login,
          avatarUrl: comment.author.avatarUrl,
        },
        body: comment.body,
        bodyText: comment.bodyText.slice(0, 200) + (comment.bodyText.length > 200 ? '...' : ''),
        createdAt: comment.createdAt,
        url: comment.url,
        discussionTitle: discussion.title,
        discussionUrl: discussion.url,
        isNew,
      });
    }
  }

  // Sort by date (newest first)
  comments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return comments;
}

/**
 * Fetch recent comments (convenience function).
 */
export async function fetchRecentComments(
  token: string,
  owner: string,
  repo: string,
  categoryId?: string
): Promise<Comment[]> {
  const lastCheck = getLastCheckTime();
  const discussions = await fetchDiscussions(token, owner, repo, categoryId);
  return extractComments(discussions, lastCheck);
}

// ─── Storage Functions ──────────────────────────────────────

/**
 * Get the last check time from localStorage.
 */
export function getLastCheckTime(): Date | undefined {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.lastCheck);
    return stored ? new Date(stored) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Update the last check time in localStorage.
 */
export function updateLastCheckTime(): void {
  try {
    localStorage.setItem(STORAGE_KEYS.lastCheck, new Date().toISOString());
  } catch {
    // Ignore storage errors
  }
}

/**
 * Get set of seen comment IDs.
 */
function getSeenCommentIds(): Set<string> {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.seenComments);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

/**
 * Mark comments as seen.
 */
export function markCommentsAsSeen(commentIds: string[]): void {
  try {
    const seen = getSeenCommentIds();
    for (const id of commentIds) {
      seen.add(id);
    }

    // Keep only last 1000 IDs to prevent unbounded growth
    const idsArray = Array.from(seen);
    if (idsArray.length > 1000) {
      const trimmed = idsArray.slice(-1000);
      localStorage.setItem(STORAGE_KEYS.seenComments, JSON.stringify(trimmed));
    } else {
      localStorage.setItem(STORAGE_KEYS.seenComments, JSON.stringify(idsArray));
    }
  } catch {
    // Ignore storage errors
  }
}

/**
 * Get count of new (unseen) comments.
 */
export function getNewCommentCount(comments: Comment[]): number {
  return comments.filter((c) => c.isNew).length;
}

// ─── Polling ────────────────────────────────────────────────

export interface NotificationPollingOptions {
  token: string;
  owner: string;
  repo: string;
  categoryId?: string;
  intervalMinutes: number;
  onNewComments: (comments: Comment[], newCount: number) => void;
  onError?: (error: Error) => void;
}

/**
 * Start polling for new comments.
 * Returns a cleanup function.
 */
export function startNotificationPolling(options: NotificationPollingOptions): () => void {
  const { token, owner, repo, categoryId, intervalMinutes, onNewComments, onError } = options;

  let intervalId: ReturnType<typeof setInterval> | null = null;

  async function checkForComments() {
    try {
      const comments = await fetchRecentComments(token, owner, repo, categoryId);
      const newCount = getNewCommentCount(comments);
      onNewComments(comments, newCount);
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  }

  // Initial check
  checkForComments();

  // Start polling
  intervalId = setInterval(checkForComments, intervalMinutes * 60 * 1000);

  // Return cleanup function
  return () => {
    if (intervalId) {
      clearInterval(intervalId);
    }
  };
}

// ─── Formatting Helpers ─────────────────────────────────────

/**
 * Format a date as relative time (e.g., "5 minutes ago").
 */
export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

/**
 * Truncate text to a maximum length.
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}
