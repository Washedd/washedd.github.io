export type RepoStats = {
  language: string | null;
  stars: number;
  description: string | null;
  htmlUrl: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export async function fetchRepoStats(repo: string): Promise<RepoStats | null> {
  try {
    const response = await fetch(`https://api.github.com/repos/${repo}`, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'ethanbyrne.co.uk',
      },
    });
    if (!response.ok) {
      return null;
    }
    const data: unknown = await response.json();
    if (!isRecord(data)) {
      return null;
    }
    const language = typeof data.language === 'string' ? data.language : null;
    const stars = typeof data.stargazers_count === 'number' ? data.stargazers_count : 0;
    const description = typeof data.description === 'string' ? data.description : null;
    const htmlUrl = typeof data.html_url === 'string' ? data.html_url : `https://github.com/${repo}`;
    return { language, stars, description, htmlUrl };
  } catch {
    return null;
  }
}
