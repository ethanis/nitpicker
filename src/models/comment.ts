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

export interface Reactions {
  url: string;
  total_count: number;
  [key: string]: number | string;
}

export enum Reaction {
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
