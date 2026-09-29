# Combat: Regicide roguelike (prototype v0)

Chosen 2026-09-29. Built on the co-op card game *Regicide*, turned into an endless roguelike run. The poker and blackjack drafts are kept in `docs/COMBAT_*_PARKED.md`.

Every number lives in `packages/core/src/config.ts` or `content.ts`. The balance lab (`npm run lab`) is how they get tuned.

## The deck is your life

You start with a **standard deck: Ace to 10 in hearts, diamonds, spades and clubs** (40 cards). There's no HP bar. Your cards in hand plus your draw pile are your life. The draw pile **never reshuffles**; spent cards only come back through Hearts, rests and a few Guides.

## A turn

1. **Play** one card. You can also play a combo:
   - two to four cards of the **same value** totalling 10 or less, or
   - an **Ace plus any one card** (the Ace is the companion).
2. **Suit powers fire.** Each suit in the play fires once, with N = the play's total value, unless the enemy is immune to that suit:

   | Suit | Power |
   |---|---|
   | ♥ Hearts | **Heal**: shuffle your discard pile and put N cards from it at the bottom of your deck |
   | ♦ Diamonds | **Draw**: draw N cards, up to your hand size (8) |
   | ♠ Spades | **Shield**: the enemy's attack drops by N for the rest of this fight |
   | ♣ Clubs | **Double**: this play deals ×2 damage |

3. **Damage** equal to the total (doubled by Clubs) hits the enemy.
4. **The enemy attacks.** Discard cards from your hand worth at least its attack minus your shield. If you can't, the run ends.

You can also **Yield** (play nothing and take the attack), but not two turns in a row. **Refresh** throws away your hand and draws a new one. You start with 2 Refreshes and can buy more.

## Catching

Kill an enemy with **exact** damage (HP to exactly 0) and it **joins your deck as a face card**, on top of your draw pile:

| Enemy | Becomes |
|---|---|
| Normal enemy | a Jack, worth 10 |
| Elite | a Queen, worth 15 |
| Boss | a King, worth 20 |

Each caught card keeps its enemy's suit and a small power of its own. The 40-card deck grows back toward 52 by catching, and your deck becomes a record of what you've beaten. In the real game, some enemies only appear at certain places and times.

## Enemies

Each enemy has HP, an attack, a suit it's immune to, and one trick:
- attacks twice
- attack goes up every turn
- slips junk into your deck
- armor
- heals every turn
- your first play does nothing

**Junk** ($9 Latte, Parking Ticket, A Like, Permit Delay) can't be played, is worth 0 when you pay, and some of it makes attacks heavier while you hold it. It leaves your deck when the fight ends.

## Guides

You can hold up to 5 Guides. Each one bends a rule. Some examples:
- **Krishnamurti:** combos have no cap.
- **Leadbeater:** start each fight by drawing 2.
- **Besant:** combos +4 damage.
- **The Life Coach:** first play each fight deals double.

## The run

A run is endless and escalating, and your score is the floors cleared. Each floor you pick one of three nodes: **Fight, Elite, Rest, Shop, Event**. Every 8th floor is a **Boss**. Enemies get 8% more HP and 6% more attack per floor.

- **Fight:** gold, plus pick 1 of 3 cards.
- **Elite:** gold, a card, and a Guide.
- **Boss:** gold, a Guide, and you recover 10 cards and refill your hand.
- **Rest:** Recover (14 cards back into your deck, refill your hand), Upgrade a card (+2 value), or Let Go of a card.
- **Shop:** cards, Guides, one card removal, one Refresh.
- **Event:** a small lore choice.

## What's new here

1. **Place and time change the fight** (next milestone). Each hotspot will tweak one rule; for example, Hearts are doubled at Shelf Road during Pink Moment.
2. **Catching** turns exact kills into collecting.
3. **Co-op by design.** At a group boss, 2 to 4 players take turns against one shared enemy, each with their own hand. Bosses never end a run and their damage counts for your faction.
4. **Live duels.** The loser pays gold or a card.

## Rules we added to Regicide

- **No yielding twice in a row.** Without this, a big enough shield let you stall forever.
- **Fatigue:** after turn 20 of a fight, your shield halves every turn. This also prevents stalling.
- **No reshuffle.** Solo Regicide ends when the castle deck is empty. Our run is endless, so Hearts, rests, the boss recover and Guides are the only ways back.
