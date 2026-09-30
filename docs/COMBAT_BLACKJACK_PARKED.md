# Combat, blackjack variant (PARKED)

> Parked 2026-09-29: Sam chose the Regicide roguelike (docs/COMBAT.md). Kept for the record.

A roguelike deckbuilder where every fight is **blackjack against the enemy, who is the dealer**. Beat the dealer's hand and you deal damage; lose and you take it. From roguelikes: a run of escalating fights that always ends in death, an enemy that shows its next move, a deck you grow and prune. What's ours: **you deal from your own deck and the enemy deals from its own**, discarding is a real move, **Guides** bend the rules of the table, and colour only shows up when something big happens.

Every number here lives in `packages/core/src/config.ts` or the content files, and the balance lab is expected to move them.

## Cards

A card has a **value** (Ace = 1 or 11, then 2–10) and a **suit**. Some have an **effect**. A few break the rules: the Channeler counts as whatever value gets you closest to 21, and Unlearning counts as −3.

| Suit | Lore | Colour | Splash (win with 3+ cards of one suit) |
|---|---|---|---|
| Pink | The Moment (Pink Moment, ecstatic Ojai) | magenta | Heal |
| Gold | The Families (Libbey, old money) | yellow | Gold |
| Cyan | The Astral (Theosophy, the Masters) | cyan | +2 discards this fight |
| Green | The Wellness ($9 lattes, sound baths) | acid green | Heal a little, clear junk from your hand |

Starting deck: 20 plain cards, Ace–10 twice, spread across the four suits.

## A round

1. The enemy shows its **intent**: its **stake** (the damage you take if you lose) plus any trick (double stakes, shove junk into your deck, seal your discards, raise its stakes for good).
2. The dealer deals itself two cards, one face up. You draw two from your deck.
3. On your turn:
   - **Hit**: draw a card.
   - **Stand**.
   - **Double**: on your first two cards only. Take exactly one more card; win or lose, it counts double.
   - **Discard**: throw away *any* card in your hand. You get **3 discards per fight**. Some cards fire when discarded. Discarding is how you save a bust or throw out junk.
4. The dealer flips and draws until it reaches its stand number (usually 17).
5. Settle:
   - **Win**: deal (sum of your cards + bonuses) × mult. **Exactly 21 is a crit, ×2.**
   - **Lose**: take the stake.
   - **Bust**: take the stake plus 3.
   - **Dealer busts**: you win.
   - **Push**: nothing happens.

Cards you used go to your discard pile, and your deck reshuffles when it runs out. So the cards left in your draw pile are something you can plan around.

## Guides (our Jokers)

You can hold up to **5**. Each one bends a rule of the table. Some examples:
- **Krishnamurti, The Pathless:** your limit is 23, not 21.
- **Leadbeater, The Clairvoyant:** you always see the dealer's hole card.
- **Blavatsky, The Secret Doctrine:** the dealer must hit until 18.
- **The Sound Bath:** each discard adds mult to your next win.
- **The Arcade:** five cards without busting wins automatically.

Guides come from elites, bosses and shops.

## Enemies are dealers with their own decks

Each enemy has its own deck and house rules:
- **The E-Bike Teen** deals small cards and almost never busts.
- **The Influencer's** deck is all face cards.
- **The Crystal Vendor** greedily stands on 18.
- **The Oak Grove Mom** hits hard and seals your discards.

There are no poison, strength or weakness stats. Enemies mess with your deck and your options instead.

## The run

A run is endless and escalating. Every run ends in death, and your score is the number of floors you cleared. Each floor you pick one of three nodes: **Fight, Elite, Rest, Shop, Event**. Every 8th floor is a **Boss**.

- **Fight:** gold, plus pick 1 of 3 cards (or skip).
- **Elite:** gold, pick 1 of 3 Guides, and a card.
- **Rest:** heal 30%, **Tune** a card (value ±1), or **Let Go** of a card (remove it).
- **Shop:** cards, Guides, and card removal.
- **Event:** a small lore choice.
- **Boss:** a Guide, a heal and gold.

In the real game the nodes are **places in Ojai**. Rest sites are Meditation Mount and Krotona, shops are the Arcade and the markets, and bosses only appear at timed events like Pink Moment.

## Built for, not built yet

- **Group boss fights**: the boss is the dealer at a table and each player plays their own hand against it, which is how real blackjack works. Everyone races for damage, and the boss never ends anyone's run.
- **Live duels**: two players at one table against a neutral dealer, or head to head.

The engine is deterministic and seeded, so a server can referee both. Factions, the map and art come later.
