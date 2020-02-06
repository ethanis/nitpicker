export interface Comment {
  pathFilter: string[];
  markdown: string;
  blocking: boolean;
}

export interface PullRequestComment {
  body: string;
  author: string;
  id: number;
  reactions: Reactions;
}

export interface MatchResult<T> {
  comment: T;
  matches: string[];
}

export interface Reactions {
  url: string;
  total_count: number;
  '+1': number;
  '-1': number;
  laugh: number;
  confused: number;
  heart: number;
  hooray: number;
  rocket: number;
  eyes: number;
}

enum Reaction {
  plusOne = '+1',
  minusOne = '-1',
  laugh = 'laugh',
  hooray = 'hooray',
  confused = 'confused',
  heart = 'heart',
  rocket = 'rocket',
  eyes = 'eyes'
}

export const Active: Reaction[] = [Reaction.eyes];

export const Closed: Reaction[] = [Reaction.hooray, Reaction.heart];
