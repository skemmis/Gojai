# Combat (prototype v0)

A roguelike deckbuilder in the spirit of Slay the Spire, played with a **standard deck of cards**. It borrows three ideas from *Regicide*: you keep your hand, every card hits for its value, and an exact kill catches the enemy. (Suit immunity was tried and dropped on 2026-09-30; it's still a CONFIG switch.) The poker and blackjack drafts are kept in `docs/COMBAT_*_PARKED.md`.

The feel we're after: walk to a spot, find a fight, pay a little attention (like a Pokémon battle). Early fights are easy. Elites and bosses make you think.

Every number lives in `packages/core/src/config.ts` or `content.ts`. The balance lab (`npm run lab`) is how they get tuned.

## You

- **40 HP.** HP carries between fights. Rest heals 30%, beating a boss heals 30%. The run ends at 0.
- **Your deck** starts as a **full deck, Ace to 10 in every suit** (40 cards; face cards are earned by catching).

## A turn

1. **Keep your hand.** A fight opens with a hand of **8** (at most 8 held). You don't draw each turn: unplayed cards stay, and **diamonds are how you get more**. The discard pile does **not** shuffle back by itself: **clubs** put cards back into your deck. Only if you're completely out (nothing playable in hand, nothing to draw) is the discard pile shuffled back and a fresh hand dealt.
2. **You have 3 actions: play any 3 cards.** One card per action, in any order.
3. **Every card hits for its value** (N), and its suit adds a power:

   | Suit | Power |
   |---|---|
   | ♠ Spades | **Hit double**: 2N damage. |
   | ♥ Hearts | Also **block** N damage this turn. |
   | ♦ Diamonds | Also **draw** N cards (up to a hand of 8). |
   | ♣ Clubs | Also **replenish**: shuffle N cards from your discard pile back into your deck. |

   Each card's seal shows its value with an icon for its job: a sword (spades), a shield (hearts), drawing a card (diamonds), recycling (clubs). Icons from game-icons.net, CC BY 3.0.

   Why every card hits: with a kept hand and no draw each turn, a hand without diamonds used to leave you stuck (the balance lab found over half of all turns were dead). Once every card hits, no hand is dead.

4. **Matching:** play a card with the same value as one you already played this turn, in a **different suit**, and it counts **double** (a pair). A third one in yet another suit counts **triple**. 7♥ then 7♠ blocks 7 and hits 14. Two 7♠ don't match. Matching resets each turn.
5. **End your turn.** The enemy does what it said it would. Your block wears off. Your hand stays.

## Difficulty steps up

Every **10 fights won** the enemies jump a tier: +80% of their base HP and +50% of their base attack (all enemy HP is ×1.25 to start with), and within a tier they don't grow. The **10th fight of each tier is its boss**, whichever fight spot you take it at; shops and rests don't count toward the 10. **Elites unlock after the first boss.** A deck that doesn't improve falls behind: in the lab a bot that never takes a card, Guide or shop wins a median of about 19 fights; one that builds its deck wins about 29 (with the 40-card deck, each new card is a smaller share, so removing cards should matter more) (`npx tsx packages/sim/src/tiers.ts`).

## Intents

You always see what the enemy will do next: attack (and for how much), block, power up, heal, or slip junk into your deck. The screen tells you how much you'd take. **If it's attacking, play some hearts. If it isn't, go all in on spades.** Hearts still hit, so blocking never wastes the turn.

## Perfect fights and catching

- **Perfect fight:** win without losing any HP. You get **+50% gold** and **a guaranteed rare** in the card choice.
- **Catch:** kill an enemy with **exact** damage (HP to exactly 0) and it joins your deck as a face card: a normal enemy becomes a Jack (10), an elite a Queen (15), a boss a King (20). Each keeps its enemy's suit and a small power. Your deck becomes a record of what you've beaten.

## Enemies

Each enemy has HP, a suit it's immune to, a cycle of intents, and sometimes a trait (armor, regeneration, or silencing your first play). **Junk** ($9 Latte, Parking Ticket, A Like, Permit Delay) can't be played, and some of it makes attacks heavier while it's in your hand. Junk leaves your deck when the fight ends.

## Guides

You can hold up to 5 Guides. Each one bends a rule. Some examples:
- **Krishnamurti:** matching counts one step more (a pair ×3).
- **Leadbeater:** start each fight with 6 block.
- **Blavatsky:** your block doesn't wear off.
- **Ojai Day:** +1 action on your first turn.

## The run

A run is endless and escalating, and your score is the floors cleared. Like Pokémon Go, each floor you walk to a **spot** and find out what's there: usually a **Fight**, sometimes an **Elite** (from floor 3), a place to **Rest**, a **Shop** or an **Event**. Every 8th floor is an **event spot** (like a gym) with a **Boss**. Enemies get 4% more HP and 3% more attack per floor.

- **Fight:** gold, plus pick 1 of 3 cards.
- **Elite:** more gold, a card, and a Guide.
- **Boss:** gold, a Guide, and heal 30%.
- **Rest:** heal 30%, upgrade a card (+2 value), or let go of a card.
- **Shop:** cards, Guides, one card removal.
- **Event:** a small lore choice.

## What's new here

1. **Place and time change the fight** (next milestone). Each hotspot will tweak one rule; for example, Hearts are doubled at Shelf Road during Pink Moment.
2. **Catching** turns exact kills into collecting.
3. **Co-op by design.** At a group boss, 2 to 4 players take turns against one shared enemy, each with their own hand. Bosses never end a run and their damage counts for your faction.
4. **Live duels.** The loser pays gold or a card.
5. **No status effects** (no strength, weakness or poison). Suits, matching, catching and Guides carry the depth instead.
