import * as fs from 'fs';
import { Comment } from '../models';
import { safeLoad } from 'js-yaml';
import { Constants } from '../constants';

export function getConfiguredComments(filePath: string): Comment[] {
  const contents = fs.readFileSync(filePath, 'utf8');
  const yaml: Comment[] = safeLoad(contents);

  const comments: Comment[] = yaml
    .filter(y => y.markdown && y.pathFilter?.length > 0)
    .map(c => ({
      ...c,
      markdown: `${c.markdown}${c.blocking ? Constants.BlockingText : ''}`
    }));

  return comments;
}
