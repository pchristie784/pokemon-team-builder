# 03: Innates and Abilities in Defensive Coverage

**What to build:** A player picks each Team Member's Ability from its regular and hidden abilities. Defensive Coverage now accounts for the Innates and the chosen Ability, e.g. Levitate gives Ground immunity and Thick Fat halves Fire and Ice. This adds the defensive half of the hand-curated ability effects table (immunities and type damage multipliers), including a one-time review of Soulgold's ability list for hack-specific abilities that affect type matchups. Abilities not in the table have no effect.

**Blocked by:** 02 (Defensive Coverage from typings).

**Status:** ready-for-agent

- [ ] Ability picker per Team Member, listing regular and hidden abilities from the data
- [ ] Defensive ability effects table covers standard immunities (Levitate, Flash Fire, Water Absorb, Volt Absorb, Sap Sipper, Lightning Rod, Storm Drain, Motor Drive, Dry Skin, Earth Eater, Well-Baked Body, …) and multipliers (Thick Fat, Heatproof, Water Bubble, Purifying Salt, …)
- [ ] Soulgold's ability list has been reviewed and any hack-specific abilities that affect type matchups are added to the table
- [ ] Innates are always applied; the chosen Ability is applied once selected
- [ ] Unrecognised abilities do not change Defensive Coverage
- [ ] Tests through the domain layer, e.g. Marill's Thick Fat Innate makes it resist Ice and Fire; a Levitate member is immune to Ground and no longer counts towards a Ground Stacked Weakness
