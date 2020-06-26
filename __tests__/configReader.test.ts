import * as path from 'path';
import { getConfiguredComments } from '../src/services';
import { Constants } from '../src/constants';

test('read valid config file', () => {
  const configFile = './data/valid_nitpicks.yml';
  const inputPath = path.join(__dirname, configFile);

  const comments = getConfiguredComments(inputPath);

  expect(comments.length).toEqual(5);
});

test("pathFilter defaults to '*'", () => {
  const configFile = './data/default_path_filter.yml';
  const inputPath = path.join(__dirname, configFile);

  const comments = getConfiguredComments(inputPath);

  expect(
    comments.every(c => c.pathFilter.every(p => p === '**/*'))
  ).toBeTruthy();
});

test('contentFilter defaults to undefined', () => {
  const configFile = './data/default_content_filter.yml';
  const inputPath = path.join(__dirname, configFile);

  const comments = getConfiguredComments(inputPath);

  expect(comments.every(c => !c.contentFilter)).toBeTruthy();
});

test('read invalid config file', () => {
  const configFile = './data/invalid_nitpicks.yml';
  const inputPath = path.join(__dirname, configFile);

  const comments = getConfiguredComments(inputPath);

  expect(comments.length).toEqual(0);
});

test('blocking comment text', () => {
  const configFile = './data/blocking_nitpicks.yml';
  const inputPath = path.join(__dirname, configFile);

  const comments = getConfiguredComments(inputPath);
  for (const comment of comments) {
    if (comment.blocking) {
      expect(comment.markdown).toContain(Constants.BlockingText);
    } else {
      expect(comment.markdown).not.toContain(Constants.BlockingText);
    }
  }
});

test('file doesnt exist', () => {
  const configFile = './data/foo_bar.yml';
  const inputPath = path.join(__dirname, configFile);

  expect(() => getConfiguredComments(inputPath)).toThrowError(
    'Nitpicks file does not exist: '
  );
});
