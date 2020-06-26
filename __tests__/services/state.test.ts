import {
  getMatchingFilePaths,
  getMatchingContentChanges
} from '../../src/services';
import { Comment, Change, ChangeType } from '../../src/models';

test('getMatchingFilePaths * matches everything', () => {
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

test('getMatchingFilePaths matches recursively', () => {
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

test('getMatchingFilePaths ignores case', () => {
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

test('getMatchingFilePaths removes exclusion patterns', () => {
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

test('getMatchingFilePaths can match new files only', () => {
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

test('getMatchingFilePaths can match deleted files only', () => {
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

test('getMatchingFilePaths can match edited files only', () => {
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

test('getMatchingFilePaths disallows multiple modifiers', () => {
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

test('getMatchingContentChanges returns all changes if contentFilter not defined', () => {
  const comment: Comment = {
    pathFilter: ['*'],
    markdown: 'Everything',
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

  const result = getMatchingContentChanges(comment, changes);

  expect(result).toEqual(changes);
});

test('getMatchingContentChanges returns changes with matching regex', () => {
  const comment: Comment = {
    pathFilter: ['*'],
    markdown: 'Everything',
    blocking: false,
    contentFilter: [`(\\+\\s*console.log\\(.*\\))`]
  };

  const changes: Change[] = [
    {
      file: 'src/services/configReader.ts',
      changeType: ChangeType.edit,
      patch:
        "@@ -4,14 +4,19 @@ import { safeLoad } from 'js-yaml';\n" +
        " import { Constants } from '../constants';\n" +
        ' \n' +
        ' export function getConfiguredComments(filePath: string): Comment[] {\n' +
        '+  if (!fs.existsSync(filePath)) {\n' +
        '+    throw Error(`Nitpicks file does not exist: ${filePath}`);\n' +
        '+  }\n' +
        '+\n' +
        "   const contents = fs.readFileSync(filePath, 'utf8');\n" +
        '   const yaml: Comment[] = safeLoad(contents);\n' +
        ' \n' +
        '+  console.log("this shouldnt have been committed!")\n' +
        ' \n' +
        '   const comments: Comment[] = yaml\n' +
        '-    .filter(y => y.markdown && y.pathFilter?.length > 0)\n' +
        '+    .filter(y => y.markdown)\n' +
        '     .map(c => ({\n' +
        '       ...c,\n' +
        "-      markdown: `${c.markdown}${c.blocking ? Constants.BlockingText : ''}`\n" +
        "+      markdown: `${c.markdown}${c.blocking ? Constants.BlockingText : ''}`,\n" +
        '+      pathFilter: c.pathFilter ?? Constants.DefaultPathFilter // Default to match everything\n' +
        '     }));\n' +
        ' \n' +
        '   return comments;'
    },
    {
      file: 'src/models/comment.ts',
      changeType: ChangeType.edit,
      patch:
        '@@ -1,5 +1,6 @@\n' +
        ' export interface Comment {\n' +
        '   pathFilter: string[];\n' +
        '+  contentFilter?: string[];\n' +
        '   markdown: string;\n' +
        '   blocking: boolean;\n' +
        ' }'
    }
  ];

  const result = getMatchingContentChanges(comment, changes);

  expect(result).toEqual(changes.slice(0, 1));
});

test('getMatchingContentChanges returns single changes with multiple matching contentFilters', () => {
  const comment: Comment = {
    pathFilter: ['*'],
    markdown: 'Everything',
    blocking: false,
    contentFilter: [`(\\+\\s*debugger)`, `(\\+\\s*console.log\\(.*\\))`]
  };

  const changes: Change[] = [
    {
      file: 'src/services/configReader.ts',
      changeType: ChangeType.edit,
      patch:
        "@@ -4,14 +4,19 @@ import { safeLoad } from 'js-yaml';\n" +
        " import { Constants } from '../constants';\n" +
        ' \n' +
        ' export function getConfiguredComments(filePath: string): Comment[] {\n' +
        '+  if (!fs.existsSync(filePath)) {\n' +
        '+    throw Error(`Nitpicks file does not exist: ${filePath}`);\n' +
        '+  }\n' +
        '+\n' +
        "   const contents = fs.readFileSync(filePath, 'utf8');\n" +
        '   const yaml: Comment[] = safeLoad(contents);\n' +
        ' \n' +
        '+  debugger\n' +
        '+  console.log("this shouldnt have been committed!")\n' +
        ' \n' +
        '   const comments: Comment[] = yaml\n' +
        '-    .filter(y => y.markdown && y.pathFilter?.length > 0)\n' +
        '+    .filter(y => y.markdown)\n' +
        '     .map(c => ({\n' +
        '       ...c,\n' +
        "-      markdown: `${c.markdown}${c.blocking ? Constants.BlockingText : ''}`\n" +
        "+      markdown: `${c.markdown}${c.blocking ? Constants.BlockingText : ''}`,\n" +
        '+      pathFilter: c.pathFilter ?? Constants.DefaultPathFilter // Default to match everything\n' +
        '     }));\n' +
        ' \n' +
        '   return comments;'
    }
  ];

  const result = getMatchingContentChanges(comment, changes);

  expect(result).toHaveLength(1);
});

test('getMatchingContentChanges throws error if unable to parse regexpr', () => {
  const comment: Comment = {
    pathFilter: ['*'],
    markdown: 'Everything',
    blocking: false,
    contentFilter: [`(\+\s*console.log\(.*\))`]
  };

  const changes: Change[] = [
    {
      file: 'src/models/comment.ts',
      changeType: ChangeType.edit,
      patch:
        '@@ -1,5 +1,6 @@\n' +
        ' export interface Comment {\n' +
        '   pathFilter: string[];\n' +
        '+  contentFilter?: string[];\n' +
        '   markdown: string;\n' +
        '   blocking: boolean;\n' +
        ' }'
    }
  ];

  expect(() => getMatchingContentChanges(comment, changes)).toThrowError(
    'Unable to parse regex expression'
  );
});
