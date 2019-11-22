import * as path from 'path';
import { getConfiguredComments } from '../src/services';

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
