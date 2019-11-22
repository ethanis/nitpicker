import * as fs from 'fs';
import { Comment } from '../models';
import { safeLoad } from 'js-yaml';

export function getConfiguredComments(filePath: string): Comment[] {
  const contents = fs.readFileSync(filePath, 'utf8');
  const yaml: Comment[] = safeLoad(contents);

  return yaml;
}
