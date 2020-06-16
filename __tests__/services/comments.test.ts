import { getCommentBody } from '../../src/services';

test('link to md5 of filepath', () => {
  const markdown = 'markdown';
  const files = ['package.json', 'src/services/comments.ts'];
  const prNumber = 42;
  const owner = 'foo';
  const repo = 'bar';

  const expected = `markdown
--------------
_Caused by:_
 - [package.json](https://github.com/foo/bar/pull/42/files#diff-b9cfc7f2cdf78a7f4b91a753d10865a2)
 - [src/services/comments.ts](https://github.com/foo/bar/pull/42/files#diff-0ea10ba5bc61e4ecb7226e70bec7c02f)`;

  const commentBody = getCommentBody(markdown, files, prNumber, owner, repo);

  expect(commentBody).toEqual(expected);
});
