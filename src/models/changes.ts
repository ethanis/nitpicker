export enum ChangeType {
  add,
  edit,
  delete,
  any
}

export interface Change {
  file: string;
  changeType: ChangeType;
  sha: string;
}
