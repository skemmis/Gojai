// The small sample set every candidate style is judged on: one card, one
// enemy, one place. Descriptions avoid colour words except for the one
// element meant to carry the accent, so the style decides the rest.

export interface Subject {
  id: "card" | "enemy" | "place";
  /** Logical pixel grid [w, h] and display upscale. */
  size: [number, number, number];
  aspect: string;
  prompt: string;
}

export const SUBJECTS: Subject[] = [
  {
    id: "card",
    size: [150, 210, 3],
    aspect: "portrait playing card, 5:7",
    prompt:
      "Illustration for the Ace of Spades in a lore deck called The Pathless Land. An oval vignette: a lone coast live oak on a hill above the Ojai valley, its canopy shaped like a spade. A dirt path leads toward it and dissolves into the grass; a small figure walks away from the path into open country. Ornate engraved card border with small corner fleurons. The corner fleurons are the only coloured element (gilt gold). No readable text.",
  },
  {
    id: "enemy",
    size: [160, 160, 3],
    aspect: "square sprite, centred, plain paper background",
    prompt:
      "An enemy called The $9 Latte: a tall takeaway coffee cup come to life, smug and menacing, with a cardboard sleeve, a sipping lid and steam curling above it. A sneering face on the sleeve with narrowed eyes. A paper price tag on a string. Its eyes are the only coloured element (blood red). Full body, centred, no background scenery.",
  },
  {
    id: "place",
    size: [320, 180, 3],
    aspect: "wide 16:9 landscape",
    prompt:
      "Shelf Road above Ojai, California at the 'Pink Moment' just after sunset: the long flat-topped Topatopa Bluffs across the valley glow bright pink. Below them chaparral foothills and rows of orange orchards, a dirt road with a wire fence along a shelf in the foreground, a big gnarled oak on the left, a few small figures walking together on the road. The lit bluffs are the only coloured element (vivid pink).",
  },
];
