import { useState } from 'react';
import { spriteUrl } from '../domain';

interface Props {
  /** The snapshot's sprite path, e.g. `species.sprite`. */
  sprite: string;
  name: string;
  size?: 'small' | 'large';
}

/** A Species sprite from the wiki. Renders nothing if the image fails to load (offline, missing file). */
export function Sprite({ sprite, name, size = 'small' }: Props) {
  const [failed, setFailed] = useState<string | null>(null);
  if (failed === sprite) return null;
  return (
    <img
      className={`sprite sprite-${size}`}
      src={spriteUrl(sprite)}
      alt={name}
      loading="lazy"
      onError={() => setFailed(sprite)}
    />
  );
}
