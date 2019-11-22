import * as fs from 'fs';
import { Comment } from '../models';
import { safeLoad } from 'js-yaml';

export function getConfiguredComments(filePath: string): Comment[] {
  const contents = fs.readFileSync(filePath, 'utf8');
  console.log(contents);
  const yaml: Comment[] = safeLoad(contents);

  return yaml;
}
