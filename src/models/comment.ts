export interface Comment {
  pathFilter: string[];
  markdown: string;
  blocking: boolean;
}

export interface PullRequestComment {
  body: string;
  author: string;
  id: number;
}

export interface MatchResult<T> {
  comment: T;
  matches: string[];
}
