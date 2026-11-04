// Help tips: one plain sentence for every control, looked up by the control's
// label when it isn't given its own (DESIGN.md §6). A label that isn't listed
// as it is is looked up with its numbers as "#" ("Colour 2 position" →
// "Colour # position").
// ui/help.test.tsx opens every panel and checks that no control is left
// without one.

const HELP: Record<string, string> = {
  // Layers
  Opacity: 'How see-through it is: 100% is solid, 0% invisible.',
  'Blend mode': 'How its colours mix with the layers under it; Normal simply covers them.',
  Frame: 'Which Token Maker frame this layer draws.',
  Colour: 'The main colour.',
  Paint: 'How it is coloured: flat, lit like metal, a gradient, or colours that change round the ring.',
  'Pressed in (lit from the other side)': 'Lights it from the opposite side, so it looks stamped into the band.',
  Highlight: 'How much lighter the side facing the light gets.',
  Shade: 'How much darker the side away from the light gets.',
  Angle: 'Which way the gradient runs across the token.',
  'Colour #': 'One colour of the gradient or ring.',
  'Colour # position': 'Where this colour sits: 0% at the start of the gradient, 100% at the end.',
  'Colour # opacity': 'How see-through this colour of the gradient is.',
  'Colour # angle': 'Where round the token this colour sits: 0° right, 90° bottom, 180° left, 270° top.',
  'Starts at (outer edge = 0%)': 'Where it begins across the band: 0% is the outer edge, 100% the inner edge.',
  'Ends at (inner edge = 100%)': 'Where it stops across the band: 0% is the outer edge, 100% the inner edge.',
  'Position across the band': 'How far in it sits: 0% on the outer edge, 100% on the inner edge, beyond either to reach past the band.',
  Width: 'How thick the line is, as a share of the band width.',
  Style: 'A solid, dashed or dotted line.',
  Glow: 'Adds a soft glow of colour around it.',
  'Waves all the way round': 'How many times it wanders in and out going once round the token.',
  'Slide the waves': 'Moves the waves round the token without changing them.',
  'Wave shape': 'Smooth waves, a zigzag, scallops bulging outwards, or battlements.',
  'Fit the waves to the band': 'Fits as many waves as suit the band, so a bigger token gets more of them, as Token Maker’s vines do.',
  'Wave length': 'How long each wave is, as a share of the band width.',
  'Make the number a multiple of': 'Rounds how many there are to a multiple of this: 2 keeps it even, so alternating patterns meet up all the way round.',
  'Wander in and out': 'Moves each one in or out by a random amount, up to this share of the band width.',
  'Vary the size': 'Makes each one a little bigger or smaller at random, by up to half this either way.',
  'Vary the turn': 'Turns each one a little at random, by up to half this many degrees either way.',
  'Fill with': 'Fill with one colour, or with a paint: metal lighting, a gradient, colours round the ring or a photo texture.',
  'Paint each one on its own': 'On: each one gets the whole paint, shrunk to fit it. Off: the paint runs across the whole token, so each shows its own part of it.',
  Photo: 'Which photo texture: metals, woods, stone, leather, rope, ice and more.',
  'Tile size': 'How big the photo is drawn, as a share of the band width; it repeats seamlessly.',
  'Turn the photo': 'Turns the photo, e.g. to run wood grain or bricks another way.',
  'Bend round the band': 'On: the photo follows the band round the token, like a carved ring. Off: it lies flat across the token.',
  Tint: 'Recolours the photo, keeping its light and dark: gold into silver, oak into ebony.',
  'Light and shade': 'Lightens the side facing the light and darkens the other, so the photo looks lit like the rest of the frame.',
  Ornament: 'Which ornament is drawn: a heart, a fleur-de-lis, a skull and many more.',
  Shape: 'Which shape is drawn.',
  'How many': 'A set number of them, or as many as fit at the spacing you choose.',
  Number: 'How many go round the token.',
  Size: 'How big each one is, as a share of the band width.',
  Rotation: 'Turns each one by this many degrees.',
  'Slide along': 'Moves them all round the token, so a different spot is at the top.',
  'Raised (small shadow)': 'Adds a small shadow, falling away from the light, so it stands out from the band.',
  'Width ÷ height': 'Stretches it: above 1 is wider than tall, below 1 narrower.',
  Outline: 'Draws a dark edge round it.',
  'Outline width': 'How thick the outline is.',
  'Stroke width': 'How thick the lines of each rune are.',
  'Bigger one every… (0 = off)': 'Makes every so many of them bigger, like a large gem between small beads; 0 keeps them all the same.',
  'Bigger by': 'How much bigger the bigger ones are.',
  'Own colour for the bigger ones': 'Gives the bigger ones a colour of their own.',
  'Rune pattern': 'Each number draws a different sequence of runes.',
  'Note pattern': 'Each number draws a different mix of single and paired notes.',
  'Alternate sides': 'Every other one moves inwards and points the other way, like leaves on a vine; 0 is off.',
  'Alternate colours #': 'One of the colours taken in turn.',
  Texture: 'Which surface is drawn: marble, metal, wood, stone, stars and more.',
  'Star colour': 'The colour of the stars.',
  Haze: 'Soft clouds of colour behind the stars.',
  Strength: 'How strongly it shows; 100% is as strong as in Token Maker.',
  Variation: 'Each number gives a different arrangement of the same texture.',
  Points: 'How many points the star has.',
  Sides: 'How many sides the polygon has.',
  'Inner points': 'How deep the star’s points are cut: lower is spikier.',
  'Round the corners': 'How rounded the rectangle’s corners are.',
  Fill: 'Fills the shape with a colour; off leaves only its outline.',
  'Shaded by the light': 'Lighter on the side facing the light; off draws one flat colour.',
  'Round the token (from the top)': 'Where it sits round the token, clockwise from the top: 25% is the right-hand side.',
  'Height (band widths)': 'How tall it is, in band widths, so it grows and shrinks with the band.',
  'Left / right': 'Where it sits across the token, from the centre.',
  'Up / down': 'Where it sits up or down the token, from the centre.',
  'Height (of the token’s half-width)': 'How tall it is, as a share of half the token’s width.',
  Clip: 'Shows this layer only inside the band, or only where the layer below it has paint.',
  // The stage
  'Token shape': 'The token shape the design is shown on; designs fit every shape.',
  'Band thickness': 'Designs follow the band, so try them thick and thin.',
  'Outer spacing': 'The gap between the edge of the token and the band.',
  'Light direction': 'Where the light comes from; your layers are shaded to match.',
  'Show sample picture': 'Shows a stand-in picture inside the frame, to see how a token will look.',
  'Backing colour': 'The colour behind the sample picture.',
  // The top bar and export
  'Menu style': 'Basic shows the settings most people need; Advanced shows every setting.',
  'Export as': 'A single picture, a sheet with the design on every token shape, or the project file with a small picture in it.',
  'Picture size': 'How many pixels wide and tall the picture is.',
  'Size in pixels': 'Any size from 16 to 4096 pixels.',
  'Include the sample picture': 'Off leaves the middle see-through, ready to put a picture behind.',
  // The library and texture dialogs
  'Also add a matching band colour under it': 'Adds a band coloured to suit the texture under it, as one step.',
};

/** The help tip for a control, by its label. */
export function helpFor(label: string): string | undefined {
  if (HELP[label]) return HELP[label];
  const key = label.replace(/\d+/g, '#');
  if (HELP[key]) return HELP[key];
  // An optional colour's own picker ("Glow colour", "Fill colour").
  const base = key.replace(/ colour$/, '');
  if (base !== key && HELP[base]) return `The colour of the ${base.toLowerCase()}.`;
  return undefined;
}

/** The id of a control's help text, for its aria-describedby. */
export const hintId = (id: string) => `${id}-help`;
