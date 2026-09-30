# Combat, poker-hand variant (PARKED)

> Parked 2026-09-29 in favour of blackjack, then the Regicide roguelike (docs/COMBAT.md). Kept for the record.

A roguelike deckbuilder fight where every play is a **poker hand**. Slay the Spire gives us the frame (a run of escalating fights, visible enemy intent, a deck you grow and prune). Balatro gives us the hand (patterns, scoring cards, rule-bending Guides). What's ours: **the pattern you make decides what you do**, discarding is a real move, and colour only appears when something big happens.

Every number below lives in `packages/core/src/config.ts` and the content files, and is expected to change after the balance lab has had a go at it.

## Cards

Every card has a **Number** (1–10) and a **Suit**. Some have an **effect**.

| Suit | Lore | Colour | Splash (fires on a Flush) |
|---|---|---|---|
| Pink | The Moment (Pink Moment, ecstatic Ojai) | magenta | Heal |
| Gold | The Families (Libbey, old money) | yellow | Gain gold; the strike ignores guard |
| Cyan | The Astral (Theosophy, the Masters) | cyan | +3 hand size next turn, +1 discard |
| Green | The Wellness ($9 lattes, sound baths) | acid green | Guard, and throw out every junk card |

Cards are drawn in black and white; the suit is the only colour on them.

Starting deck: 20 plain cards, Numbers 2–6 in each suit.

## A turn

1. Refill your hand to **8**. Your hand carries over between turns (hold cards for a flush).
2. **Discard** up to **2 times** a turn: pick up to 5 cards, throw them away, draw replacements. Discarding is a move: some cards fire *when discarded*.
3. **Play one hand** of 1–5 cards. Its pattern decides the verb, its numbers decide the size.
4. The enemy does what its intent said. Your guard absorbs its attacks this turn, then resets.

## Patterns

Only the cards that make the pattern **score**. Value = (sum of scoring Numbers + bonuses) × mult.

| Pattern | Scores | Strike × | Guard × | Splash |
|---|---|---|---|---|
| Single (highest card) | 1 | 1 | – | – |
| Pair | 2 | 2 | – | – |
| Run of 3 | 3 | – | 1.5 | – |
| Two Pair | 4 | 2 | – | – |
| Three of a Kind | 3 | 3 | – | – |
| Run of 4 | 4 | – | 2 | – |
| Flush (4+ one suit) | the flush cards | 2 | – | yes |
| Run of 5 | 5 | 1 | 2 | – |
| Full House | 5 | 4 | – | – |
| Four of a Kind | 4 | 5 | – | – |
| Straight Flush | 5 | 2 | 3 | yes |

Strikes hit the enemy (through its guard). Guard protects you this turn. **The central choice each turn: pairs and sets hit, runs protect, flushes explode.** Guides and cards bend all of this.

## Card effects (fire when the card scores, unless noted)

`+N` bonus to the sum · `+N mult` · `×N mult` · heal · gold · **wild** (counts as every suit) · **on discard:** strike / guard / gold / +mult on your next play · **held:** guard at end of turn if still in hand.

Junk: enemies shove junk cards into your deck (a $9 Latte, a Parking Ticket, a Like). Junk can't be played and goes away after the fight, but it clogs your hand until you discard it, and some junk punishes you for holding or discarding it.

## Guides (the Jokers)

Up to **5**. Each one bends a rule: Besant makes pairs hit harder; Krishnamurti ("The Pathless") makes hands with *no* pattern score ×4; Blavatsky lets runs skip a number; the Crystal Shop makes 3-card flushes count. Guides come from elites, bosses and shops.

## Enemies

One enemy per fight for now. Each shows its **intent** before you act: attack, multi-attack, guard, **hex** (adds junk to your deck), **seal** (locks cards in your hand next turn), **drain** (one fewer discard next turn), **escalate** (its attacks get bigger for the rest of the fight). No poison, strength, weakness or vulnerable: enemies mess with your *hand*, not your stats.

## The run

Endless and escalating; every run ends in defeat, score = floors cleared. Each floor you pick one of three nodes: **Fight, Elite, Rest, Shop, Event**. Every 8th floor is a **Boss**. Enemies get tougher every floor.

- Fight: gold + pick 1 of 3 cards (or skip).
- Elite: gold + pick 1 of 3 Guides + a card.
- Rest: heal 30%, **Refine** a card (+1 Number), or **Let Go** of a card (remove it).
- Shop: cards, Guides, and card removal.
- Event: a small lore choice.
- Boss: Guide, heal, gold.

In the real game the nodes are **places in Ojai** (see `/docs` plan): rest sites are Meditation Mount and Krotona, shops are the Arcade and the markets, bosses only appear at timed events like Pink Moment.

## Not in v0 (designed for, not built)

Live duels and group boss fights (the engine is deterministic and seeded, so a server can referee both), factions and territory, the map, art.
