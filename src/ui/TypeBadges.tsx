import { typeName, type PokemonType } from '../domain';

export function TypeBadges({ types }: { types: PokemonType[] }) {
  return (
    <span className="type-badges">
      {types.map((type) => (
        <span key={type} className={`type-badge type-${typeName(type).toLowerCase()}`}>
          {typeName(type)}
        </span>
      ))}
    </span>
  );
}
