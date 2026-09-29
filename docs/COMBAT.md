# Combat (prototype v0)

A roguelike deckbuilder in the spirit of Slay the Spire, played with a **standard deck of cards**. It borrows two ideas from *Regicide*: enemies are immune to a suit, and an exact kill catches the enemy. The poker and blackjack drafts are kept in `docs/COMBAT_*_PARKED.md`.

The feel we're after: walk to a spot, find a fight, pay a little attention (like a Pokémon battle). Early fights are easy. Elites and bosses make you think.

Every number lives in `packages/core/src/config.ts` or `content.ts`. The balance lab (`npm run lab`) is how they get tuned.

## You

- **40 HP.** HP carries between fights. Rest heals 30%, beating a boss heals 30%. The run ends at 0.
- **Your deck** starts as **Ace to 10 in hearts and spades** (20 cards): enough to attack and block, and enough to win early fights. **Diamonds and clubs come as rewards**, for the longer fights with elites and bosses.

## A turn

1. **Draw 5.** When your draw pile runs out, your discard pile is shuffled back in.
2. **You have 3 actions: play any 3 cards.** One card per action, in any order.
3. **Each suit does one job**, with N = the card's value, unless the enemy is immune to that suit:

   | Suit | Job |
   |---|---|
   | ♠ Spades | **Attack**: deal N damage. The only suit that hits. |
   | ♥ Hearts | **Block** N damage this turn. |
   | ♦ Diamonds | **Draw** 1 card, +1 per 4 value (A-3: 1, 4-7: 2, 8-10: 3). |
   | ♣ Clubs | **Recall** your best card from the discard pile to your hand, +1 per 5 value. |

4. **Matching:** play a card with the same value as one you already played this turn, in a **different suit**, and it counts **double** (a pair). A third one in yet another suit counts **triple**. 7♥ then 7♠ blocks 7 and hits 14. Two 7♠ don't match. Matching resets each turn.
5. **End your turn.** Unplayed cards are discarded. The enemy does what it said it would. Your block wears off.

## Intents

You always see what the enemy will do next: attack (and for how much), block, power up, heal, or slip junk into your deck. The screen tells you how much you'd take. **If it's attacking, play some hearts. If it isn't, go all in on spades.**

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
