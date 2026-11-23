import type { ImageMetadata } from 'astro';

const modules = import.meta.glob<{ default: ImageMetadata }>('../assets/photos/*.jpg', { eager: true });

export const photos: Record<string, ImageMetadata> = Object.fromEntries(
  Object.entries(modules).map(([path, mod]) => [path.split('/').pop()!.replace(/\.jpg$/, ''), mod.default]),
);

export function photo(name: string): ImageMetadata {
  const p = photos[name];
  if (!p) throw new Error(`Photo introuvable : ${name}`);
  return p;
}
