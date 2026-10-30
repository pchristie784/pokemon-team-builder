// Sprites are vendored by `npm run fetch-data` into public/soulgold/ so the app works offline.
// The snapshot's `sprite` fields are paths relative to the wiki root, e.g. "sprites/pokemon/bulbasaur.png",
// and the same relative path is kept under public/soulgold/.
export function spriteUrl(sprite: string): string {
  return `${import.meta.env.BASE_URL}soulgold/${sprite}`;
}
