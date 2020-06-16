import { isCommentApplicable } from '../../src/services';
import { Comment, Change, ChangeType } from '../../src/models';

test('match recursively', () => {
  const comment: Comment = {
    pathFilter: ['app/**'],
    markdown: 'Woohoo!',
    blocking: false
  };

  const changes: Change[] = [
    {
      file: 'app/models/foo.rb',
      changeType: ChangeType.edit
    }
  ];

  const result = isCommentApplicable(comment, changes);

  expect(result).toEqual(changes.map(c => c.file));
});

test('remove exclusion patterns', () => {
  const comment: Comment = {
    pathFilter: ['app/**', '!app/models/*.h'],
    markdown: 'Everything except headers',
    blocking: false
  };

  const changes: Change[] = [
    {
      file: 'app/models/main.h',
      changeType: ChangeType.edit
    }
  ];

  const result = isCommentApplicable(comment, changes);

  expect(result).toEqual([]);
});
