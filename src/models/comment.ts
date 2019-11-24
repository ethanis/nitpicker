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
