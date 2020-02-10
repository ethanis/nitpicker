import * as path from 'path';
import { getConfiguredComments } from '../src/services';
import { Constants } from '../src/constants';

test('read valid config file', () => {
  const configFile = './data/valid-nitpicks.yml';
  const inputPath = path.join(__dirname, configFile);

  const comments = getConfiguredComments(inputPath);

  expect(comments.length).toEqual(3);
});

test('read invalid config file', () => {
  const configFile = './data/invalid-nitpicks.yml';
  const inputPath = path.join(__dirname, configFile);

  const comments = getConfiguredComments(inputPath);

  expect(comments.length).toEqual(0);
});

test('blocking comment text', () => {
  const configFile = './data/blocking-nitpicks.yml';
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
