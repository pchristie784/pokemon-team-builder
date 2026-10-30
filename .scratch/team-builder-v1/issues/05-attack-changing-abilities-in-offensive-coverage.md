# 05: Attack-changing abilities in Offensive Coverage

**What to build:** Offensive Coverage accounts for abilities that change how a Team Member's attacks work, whether they come from an Innate or the chosen Ability. Pixilate, Refrigerate, Aerilate and Galvanize turn Normal moves into Fairy, Ice, Flying and Electric moves. Scrappy lets Normal and Fighting moves hit Ghost. Tinted Lens makes resisted hits neutral. This extends the ability effects table with offensive entries, and adds any hack-specific offensive abilities found in the ticket 03 review.

**Blocked by:** 03 (Innates and Abilities in Defensive Coverage), 04 (Moves and Offensive Coverage).

**Status:** ready-for-agent

- [ ] Normal moves are converted for Pixilate, Refrigerate, Aerilate and Galvanize, and the traced move shows the converted type
- [ ] Scrappy allows Normal and Fighting moves to hit Ghost
- [ ] Tinted Lens treats resisted hits as neutral
- [ ] Effects apply from Innates and from the chosen Ability
- [ ] Tests through the domain layer, e.g. a Pixilate member's Normal move counts as Fairy coverage against Dragon
