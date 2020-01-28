import { PullRequestComment } from '../src/models';
import { isActiveComment } from '../src/services';

test('comment is not active', () => {
  const comment: PullRequestComment = {
    body: '## Blocking issue',
    author: 'github-actions[bot]',
    id: 1,
    reactions: {
      url: '',
      total_count: 2,
      '+1': 0,
      '-1': 0,
      laugh: 0,
      hooray: 1,
      confused: 0,
      heart: 1,
      rocket: 0,
      eyes: 0
    }
  };

  const isActive = isActiveComment(comment);

  expect(isActive).toBeFalsy();
});

test('comment is active', () => {
  const comment: PullRequestComment = {
    body: '## Blocking issue',
    author: 'github-actions[bot]',
    id: 1,
    reactions: {
      url: '',
      total_count: 1,
      '+1': 0,
      '-1': 0,
      laugh: 0,
      hooray: 0,
      confused: 0,
      heart: 0,
      rocket: 0,
      eyes: 1
    }
  };

  const isActive = isActiveComment(comment);

  expect(isActive).toBeTruthy();
});
