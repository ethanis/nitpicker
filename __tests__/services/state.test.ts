import { getMatchingFilePaths } from '../../src/services';
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

  const result = getMatchingFilePaths(comment, changes);

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

  const result = getMatchingFilePaths(comment, changes);

  expect(result).toEqual([]);
});

test('match new files only', () => {
  const comment: Comment = {
    pathFilter: ['+app/**'],
    markdown: 'Only new files',
    blocking: false
  };

  const changes: Change[] = [
    {
      file: 'app/models/old.rb',
      changeType: ChangeType.edit
    },
    {
      file: 'app/models/new.rb',
      changeType: ChangeType.add
    }
  ];

  const result = getMatchingFilePaths(comment, changes);

  expect(result).toEqual(['app/models/new.rb']);
});

test('match deleted files only', () => {
  const comment: Comment = {
    pathFilter: ['-app/**'],
    markdown: 'Only deleted files',
    blocking: false
  };

  const changes: Change[] = [
    {
      file: 'app/models/old.rb',
      changeType: ChangeType.edit
    },
    {
      file: 'app/models/deleted.rb',
      changeType: ChangeType.delete
    }
  ];

  const result = getMatchingFilePaths(comment, changes);

  expect(result).toEqual(['app/models/deleted.rb']);
});

test('match edited files only', () => {
  const comment: Comment = {
    pathFilter: ['~app/**'],
    markdown: 'Only deleted files',
    blocking: false
  };

  const changes: Change[] = [
    {
      file: 'app/models/old.rb',
      changeType: ChangeType.edit
    },
    {
      file: 'app/models/deleted.rb',
      changeType: ChangeType.delete
    }
  ];

  const result = getMatchingFilePaths(comment, changes);

  expect(result).toEqual(['app/models/old.rb']);
});
