export function projectGroupTitleNeedsUpdate(
  memberTitles: ReadonlyArray<string>,
  nextTitle: string,
  wasEdited: boolean,
): boolean {
  return wasEdited && memberTitles.some((title) => title !== nextTitle);
}

export function concreteRuntimeProject<T extends { environmentId: string; id: string }>(
  members: readonly T[],
): T | null {
  return members.length === 1 ? members[0]! : null;
}
