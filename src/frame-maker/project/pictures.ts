// The photo textures a "picture" paint can use: seamless photographs from
// Poly Haven (polyhaven.com) and ambientCG (ambientcg.com), both CC0
// (public domain, no credit needed; credited anyway in Help → Artwork
// credits and ASSETS-CREDITS.md). Their pixels are in render/pictureData.ts.

export interface PictureInfo {
  id: string;
  name: string;
  site: 'Poly Haven' | 'ambientCG';
  source: string;
  /** The picture's average colour: drawn until it has loaded, and its tint's starting point. */
  average: string;
}

export const PICTURES = [
  { id: 'bark', name: 'Tree bark', site: 'Poly Haven', source: 'https://polyhaven.com/a/bark_brown_02', average: '#5f5640' },
  { id: 'leather', name: 'Brown leather', site: 'Poly Haven', source: 'https://polyhaven.com/a/brown_leather', average: '#512d10' },
  { id: 'castle-brick', name: 'Castle brick', site: 'Poly Haven', source: 'https://polyhaven.com/a/castle_brick_01', average: '#87785e' },
  { id: 'rust', name: 'Coarse rust', site: 'Poly Haven', source: 'https://polyhaven.com/a/rust_coarse_01', average: '#623920' },
  { id: 'cobblestone', name: 'Cobblestones', site: 'Poly Haven', source: 'https://polyhaven.com/a/cobblestone_floor_08', average: '#928b80' },
  { id: 'granite', name: 'Granite tiles', site: 'Poly Haven', source: 'https://polyhaven.com/a/granite_tile', average: '#4e4e4f' },
  { id: 'green-rust', name: 'Green painted metal', site: 'Poly Haven', source: 'https://polyhaven.com/a/green_metal_rust', average: '#3f4d34' },
  { id: 'hammered-metal', name: 'Bumpy bronze', site: 'ambientCG', source: 'https://ambientcg.com/view?id=Metal007', average: '#c5974f' },
  { id: 'hessian', name: 'Hessian', site: 'Poly Haven', source: 'https://polyhaven.com/a/hessian_230', average: '#8c7859' },
  { id: 'ice', name: 'Ice', site: 'ambientCG', source: 'https://ambientcg.com/view?id=Ice002', average: '#627b70' },
  { id: 'lava', name: 'Lava', site: 'ambientCG', source: 'https://ambientcg.com/view?id=Lava004', average: '#ac452f' },
  { id: 'marble', name: 'Marble blocks', site: 'Poly Haven', source: 'https://polyhaven.com/a/marble_01', average: '#b19d7a' },
  { id: 'medieval-wood', name: 'Medieval wood', site: 'Poly Haven', source: 'https://polyhaven.com/a/medieval_wood', average: '#73685c' },
  { id: 'mossy-rock', name: 'Mossy rock', site: 'Poly Haven', source: 'https://polyhaven.com/a/mossy_rock', average: '#6c6b57' },
  { id: 'jacquard', name: 'Red jacquard', site: 'Poly Haven', source: 'https://polyhaven.com/a/quatrefoil_jacquard_fabric', average: '#930320' },
  { id: 'rope', name: 'Twisted rope', site: 'ambientCG', source: 'https://ambientcg.com/view?id=Rope001', average: '#796a4e' },
  { id: 'gold', name: 'Rough gold', site: 'ambientCG', source: 'https://ambientcg.com/view?id=Metal048C', average: '#f9df99' },
  { id: 'snow', name: 'Snow', site: 'Poly Haven', source: 'https://polyhaven.com/a/snow_02', average: '#a5a5a7' },
  { id: 'metal-plate', name: 'Tread plate', site: 'Poly Haven', source: 'https://polyhaven.com/a/metal_plate', average: '#3d321c' },
  { id: 'wood-planks', name: 'Wood planks', site: 'Poly Haven', source: 'https://polyhaven.com/a/wood_planks', average: '#795839' },
  // Version 11: more natural and strange ones.
  { id: 'lava-flow', name: 'Ember streaks', site: 'ambientCG', source: 'https://ambientcg.com/view?id=Lava001', average: '#4a383b' },
  { id: 'molten-rock', name: 'Molten rock', site: 'ambientCG', source: 'https://ambientcg.com/view?id=Lava005', average: '#7c413c' },
  { id: 'moss', name: 'Moss', site: 'ambientCG', source: 'https://ambientcg.com/view?id=Moss002', average: '#4a6519' },
  { id: 'blue-onyx', name: 'Blue onyx', site: 'ambientCG', source: 'https://ambientcg.com/view?id=Onyx006', average: '#767b7b' },
  { id: 'black-onyx', name: 'Black onyx', site: 'ambientCG', source: 'https://ambientcg.com/view?id=Onyx013', average: '#35302b' },
  { id: 'plane-bark', name: 'Plane tree bark', site: 'Poly Haven', source: 'https://polyhaven.com/a/bark_platanus', average: '#56473c' },
  { id: 'coral-stone', name: 'Coral stone', site: 'Poly Haven', source: 'https://polyhaven.com/a/coral_stone_wall', average: '#908372' },
  { id: 'dark-rock', name: 'Dark rock', site: 'Poly Haven', source: 'https://polyhaven.com/a/dark_rock', average: '#211c17' },
  { id: 'forest-floor', name: 'Forest floor', site: 'Poly Haven', source: 'https://polyhaven.com/a/forest_leaves_02', average: '#8e703a' },
  { id: 'lichen-rock', name: 'Lichen rock', site: 'Poly Haven', source: 'https://polyhaven.com/a/lichen_rock', average: '#44392e' },
  { id: 'cracked-mud', name: 'Cracked mud', site: 'Poly Haven', source: 'https://polyhaven.com/a/mud_cracked_dry_03', average: '#cfa981' },
  { id: 'tiger-rock', name: 'Tiger rock', site: 'Poly Haven', source: 'https://polyhaven.com/a/tiger_rock', average: '#705341' },
] as const satisfies readonly PictureInfo[];

export type PictureId = (typeof PICTURES)[number]['id'];
export const PICTURE_IDS = PICTURES.map((p) => p.id) as readonly PictureId[];
export const pictureById = (id: string) => (PICTURES as readonly PictureInfo[]).find((p) => p.id === id);
