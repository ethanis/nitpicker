import { getMatchingFilePaths } from '../../src/services';
import { Comment, Change, ChangeType } from '../../src/models';

test('pathFilter * matches everything', () => {
  const comment: Comment = {
    pathFilter: ['*'],
    markdown: 'Woohoo!',
    blocking: false
  };

  const changes: Change[] = [
    {
      file: 'app/models/foo.rb',
      changeType: ChangeType.edit,
      patch: ''
    }
  ];

  const result = getMatchingFilePaths(comment, changes);

  expect(result).toEqual(changes);
});

test('pathFilter matches recursively', () => {
  const comment: Comment = {
    pathFilter: ['app/**'],
    markdown: 'Woohoo!',
    blocking: false
  };

  const changes: Change[] = [
    {
      file: 'app/models/foo.rb',
      changeType: ChangeType.edit,
      patch: ''
    }
  ];

  const result = getMatchingFilePaths(comment, changes);

  expect(result).toEqual(changes);
});

test('pathFilter ignores case', () => {
  const comment: Comment = {
    pathFilter: ['app/**'],
    markdown: 'Woohoo!',
    blocking: false
  };

  const changes: Change[] = [
    {
      file: 'APP/MODELS/FOO.rb',
      changeType: ChangeType.edit,
      patch: ''
    }
  ];

  const result = getMatchingFilePaths(comment, changes);

  expect(result).toEqual(changes);
});

test('pathFilter removes exclusion patterns', () => {
  const comment: Comment = {
    pathFilter: ['app/**', '!app/models/*.h'],
    markdown: 'Everything except headers',
    blocking: false
  };

  const changes: Change[] = [
    {
      file: 'app/models/main.h',
      changeType: ChangeType.edit,
      patch: ''
    }
  ];

  const result = getMatchingFilePaths(comment, changes);

  expect(result).toHaveLength(0);
});

test('pathFilter can match new files only', () => {
  const comment: Comment = {
    pathFilter: ['+app/**'],
    markdown: 'Only new files',
    blocking: false
  };

  const changes: Change[] = [
    {
      file: 'app/models/old.rb',
      changeType: ChangeType.edit,
      patch: ''
    },
    {
      file: 'app/models/new.rb',
      changeType: ChangeType.add,
      patch: ''
    }
  ];

  const result = getMatchingFilePaths(comment, changes);

  expect(result).toEqual(changes.filter(c => c.changeType === ChangeType.add));
});

test('pathFilter can match deleted files only', () => {
  const comment: Comment = {
    pathFilter: ['-app/**'],
    markdown: 'Only deleted files',
    blocking: false
  };

  const changes: Change[] = [
    {
      file: 'app/models/old.rb',
      changeType: ChangeType.edit,
      patch: ''
    },
    {
      file: 'app/models/deleted.rb',
      changeType: ChangeType.delete,
      patch: ''
    }
  ];

  const result = getMatchingFilePaths(comment, changes);

  expect(result).toEqual(
    changes.filter(c => c.changeType === ChangeType.delete)
  );
});

test('pathFilter can match edited files only', () => {
  const comment: Comment = {
    pathFilter: ['~app/**'],
    markdown: 'Only deleted files',
    blocking: false
  };

  const changes: Change[] = [
    {
      file: 'app/models/old.rb',
      changeType: ChangeType.edit,
      patch: ''
    },
    {
      file: 'app/models/deleted.rb',
      changeType: ChangeType.delete,
      patch: ''
    }
  ];

  const result = getMatchingFilePaths(comment, changes);

  expect(result).toEqual(changes.filter(c => c.changeType === ChangeType.edit));
});

test('pathFilter disallows multiple modifiers', () => {
  const comment: Comment = {
    pathFilter: ['!~app/**'],
    markdown: 'Not edited files',
    blocking: false
  };

  const changes: Change[] = [
    {
      file: 'app/models/old.rb',
      changeType: ChangeType.edit,
      patch: ''
    }
  ];

  expect(() => getMatchingFilePaths(comment, changes)).toThrow(
    'Multiple path modifiers are not supported'
  );
});
