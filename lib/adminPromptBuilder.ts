export type ShotType = 'closeup' | 'medium' | 'far' | 'backshot';
export type TitSize = 'small' | 'medium' | 'big' | 'huge';
export type FaceMess = 'clean' | 'drool' | 'bukkake' | 'bukkake_drool';

export interface CharacterDef {
  id: string;
  name: string;
  costume: string;
  hair: string;
}
 
export interface ShotDef {
  id: ShotType;
  label: string;
  image2: string;
  poseBlock: string;
}

export interface BuilderOptions {
  character: CharacterDef;
  shot: ShotType;
  titSize: TitSize;
  thickCellulite: boolean;
  plumpStomach: boolean;
  hairyPussy: boolean;
  faceMess: FaceMess;
  pussyCumPuddle: boolean;
}

export const CHARACTERS: CharacterDef[] = [
  { id: 'cammy', name: 'Cammy', hair: 'long blonde hair, beret off', costume: 'torn green thong leotard, red thong straps still on, wrecked and half-on' },
  { id: 'chunli', name: 'Chun-Li', hair: 'dark hair in double buns', costume: 'torn tight blue qipao, spiked bracelets, wrecked and half-on' },
  { id: 'juri', name: 'Juri Han', hair: 'dark purple-black fighter hair', costume: 'torn purple fighter suit, spiked choker, wrecked and half-on' },
  { id: 'tifa', name: 'Tifa Lockhart', hair: 'dark hair in a long ponytail', costume: 'torn white tank, suspenders down, short black skirt shoved up' },
  { id: '2b', name: '2B', hair: 'short white hair', costume: 'black leotard pulled aside, blindfold still on, black boots on, skirt gone' },
  { id: 'quiet', name: 'Quiet', hair: 'brown hair', costume: 'ripped soaked tactical bikini, boots still on' },
  { id: 'starfire', name: 'Starfire', hair: 'long flowing reddish-orange hair, not pink, not pigtails', costume: 'torn purple cape and silver armor pieces, wrecked and half-on' },
  { id: 'raven', name: 'Raven', hair: 'short dark violet hair, red forehead gem', costume: 'dark leotard pulled aside, hood half on, running dark makeup' },
  { id: 'ivy', name: 'Poison Ivy', hair: 'long red hair', costume: 'torn green leafy bodysuit, vines around her thighs, leaves in her hair' },
  { id: 'harley', name: 'Harley Quinn', hair: 'messy blonde pigtails with pink and blue tips', costume: 'wrecked red/blue jacket open, Daddy\'s Lil Monster shirt yanked aside, smeared clown makeup' },
  { id: 'catwoman', name: 'Catwoman', hair: 'cowl pushed back, short black hair', costume: 'ripped black latex catsuit peeled open, whip on the floor' },
  { id: 'ww', name: 'Wonder Woman', hair: 'long dark wavy hair, broken gold tiara', costume: 'red/gold armor yanked open, lasso loose around one thigh' },
  { id: 'cersei', name: 'Cersei Lannister', hair: 'long blonde queen hair', costume: 'tight red Lannister gown ripped down the front, gold lion jewelry' },
  { id: 'dany', name: 'Daenerys', hair: 'long silver-blonde hair', costume: 'tight blue-white Targaryen gown ripped open' },
  { id: 'cleo', name: 'Cleopatra', hair: 'dark straight Egyptian wig with gold band', costume: 'white linen sheath ripped open, gold collar, snake cuffs' },
  { id: 'slave', name: 'Slave / handmaiden', hair: 'messy dark hair', costume: 'sheer wraps, metal collar, chains, wrecked and half-on' },
  { id: 'dexmom', name: "Dexter's Lab Mom", hair: 'big red 60s hair', costume: 'tight orange 1960s dress ripped open, pearls still on' },
  { id: 'sam', name: 'Sam (Totally Spies)', hair: 'long orange-red spy hair', costume: 'green spy catsuit unzipped' },
  { id: 'wednesday', name: 'Wednesday Addams', hair: 'black double braids', costume: 'black dress with white collar, wrecked and pulled open' },
  { id: 'starlight', name: 'Starlight (The Boys)', hair: 'long blonde hair', costume: 'torn star suit, flag cape off' },
  { id: 'lydia', name: 'Lydia Deetz', hair: 'black goth hair with red veil falling', costume: 'black wedding/goth dress ripped open' },
  { id: 'nun', name: 'The Nun', hair: 'hidden under wimple', costume: 'habit pulled open, wimple still on, half dressed as the nun' },
  { id: 'elvira', name: 'Elvira', hair: 'huge black beehive falling apart', costume: 'tight black gown ripped open' },
  { id: 'joi', name: 'Joi (Blade Runner 2049)', hair: 'dark holographic bob', costume: 'orange silk robe hanging open' },
  { id: 'cyber', name: 'Cyberpunk street samurai', hair: 'neon-streaked messy hair', costume: 'torn neon bodysuit and mesh, chrome jewelry' },
  { id: 'egirl', name: 'E-girl', hair: 'messy colored e-girl hair', costume: 'black tank yanked aside, striped arm warmers, choker' },
  { id: 'hooker', name: 'Dirty street hooker', hair: 'messy cheap dyed hair', costume: 'cheap tight mini ripped, smeared lipstick, wrecked club clothes' },
  { id: 'trailer', name: 'Trailer-trash woman', hair: 'messy mullet or clip-in hair', costume: 'tied-up flannel open, cutoff shorts yanked aside' },
  { id: 'teacher', name: 'Teacher', hair: 'messy bun falling out', costume: 'tight blouse unbuttoned, glasses still on, pencil skirt shoved up' },
  { id: 'nurse', name: 'Nurse', hair: 'hair falling out of a cap', costume: 'tight nurse dress unbuttoned, cap crooked' },
  { id: 'maid', name: 'French maid', hair: 'messy updo', costume: 'French maid dress yanked open, apron still on' },
  { id: 'prisoner', name: 'Prisoner', hair: 'messy prison hair', costume: 'orange jumpsuit unzipped and pulled open' },
];

export const SHOTS: ShotDef[] = [
  {
    id: 'closeup',
    label: 'Close-up',
    image2: 'Pussy-focus low angle, thighs spread wide (the orange-surface / ATK-style shot). Face and tits lean closer than the ref.',
    poseBlock: `Image 2 is the only pose and camera-angle reference. Copy her thigh position from image 2. Thighs spread wide like image 2. Extreme pussy close-up focus. Pussy fills the center and lower frame. Same low angle looking forward from the floor up her body. Same ground-to-ass ratio as image 2.
She leans closer to the viewer so her face is a close-up at the top and her tits are a close-up in the middle. Her tits lay on top of her thighs, resting on the thighs, pressed down onto them. Not hidden.
She looks at the viewer. Direct eye contact. Mouth open, wrecked slutty expression.`,
  },
  {
    id: 'medium',
    label: 'Medium',
    image2: 'Medium body shot, legs spread, face + tits + pussy all readable. Sofa / bed legs-up ref works.',
    poseBlock: `Image 2 is the only pose and camera-angle reference. Medium shot. Legs spread wide. Pussy visible in the lower frame, tits and face clearly visible above. Not an extreme crop. Same ground-to-ass ratio as image 2.
She leans slightly toward the viewer. Tits rest on her thighs. She looks at the viewer. Direct eye contact. Mouth open, wrecked slutty expression.`,
  },
  {
    id: 'far',
    label: 'Far',
    image2: 'Fuller body / farther shot so outfit reads. Keep legs spread and face visible.',
    poseBlock: `Image 2 is the only pose and camera-angle reference. Farther full-body-leaning shot. More of her outfit and legs in frame. Pussy still visible. Face still visible. Same ground-to-ass ratio as image 2.
She still looks at the viewer. Direct eye contact. Mouth open, wrecked slutty expression.`,
  },
  {
    id: 'backshot',
    label: 'Back shot',
    image2: 'Kneeling rear ass shot on the chair. Image 2 for pose only.',
    poseBlock: `Image 2 is the only pose and camera-angle reference. Rear kneeling ass shot. Same cheek spread, same pussy position from behind, same camera distance. She looks back toward the viewer so her face is visible. Direct eye contact over her shoulder.`,
  },
];

const TIT_LINE: Record<TitSize, string> = {
  small: 'Small natural tits.',
  medium: 'Medium full tits.',
  big: 'Big heavy tits.',
  huge: 'Huge tits. Make her tits much bigger.',
};

export function pickRandomCharacter(excludeId?: string): CharacterDef {
  const pool = excludeId ? CHARACTERS.filter((c) => c.id !== excludeId) : CHARACTERS;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function assembleAdminPrompt(opts: BuilderOptions): { prompt: string; image1: string; image2: string; summary: string } {
  const shot = SHOTS.find((s) => s.id === opts.shot) ?? SHOTS[0];
  const body: string[] = [];
  body.push(TIT_LINE[opts.titSize]);
  if (opts.thickCellulite) {
    body.push('Thick outer thighs with visible cellulite. Heavy natural thighs, not skinny, not airbrushed smooth. Cellulite dimples on ass and outer thighs.');
  }
  if (opts.plumpStomach) {
    body.push('A little plump stomach.');
  }
  if (opts.hairyPussy) {
    body.push('Hairy pussy. Visible pubic hair. Natural bush, not shaved bald.');
  } else {
    body.push('Naked pussy exposed.');
  }
  if (opts.shot === 'closeup' || opts.shot === 'medium') {
    body.push('Big or chosen-size tits laying on top of her inner thighs, squished against the thighs because she is leaning forward.');
  }

  const mess: string[] = [];
  if (opts.faceMess === 'clean') {
    mess.push('No bukkake. No cum on her face. Keep her face clean.');
  } else if (opts.faceMess === 'drool') {
    mess.push('No bukkake. Mouth open, spit and drool running from her tongue and lips down her chin. Wet glossy spit only.');
  } else {
    mess.push(`Fully messy bukkake. Face full of cum. Thick white sticky semen on her forehead, eyebrows, eyelashes, eyes, nose, cheeks, lips, chin, and tits. Fat ropes and clumps, not a thin glaze. Mouth open with cum coming out over her tongue and lips${opts.faceMess === 'bukkake_drool' ? ', spit mixed with cum, long strands drooling down' : ', a long strand drooling down'}.`);
  }
  if (opts.pussyCumPuddle) {
    mess.push('Pussy full of cum, dripping out onto the floor. A messy puddle of cum and squirt is clearly visible on the floor under her. You can see the puddle.');
  }

  const prompt = [
    `Image 1 is the only identity reference. Keep her exact face details from image 1: exact face shape, bone structure, eyes, nose, lips, skin color, skin tone, and likeness. Do not change who she is. Do not copy the woman from image 2.`,
    `Dress her as ${opts.character.name}. ${opts.character.hair}. ${opts.character.costume}. Accurate character clothing, wrecked and half-on. Use the character's real hairstyle, not the reference photo hair unless it already matches. No white stockings unless that character wears them.`,
    shot.poseBlock,
    body.join(' '),
    `Keep exact same skin color and skin tone from image 1. Highly detailed photorealistic skin: visible pores, natural texture, fine peach fuzz, subtle oil sheen, realistic micro-detail.`,
    mess.join(' '),
    `Photorealistic. Face and body identity only from image 1. Pose and camera only from image 2. Only change hair and clothes to ${opts.character.name}, the chosen body, the chosen mess, and the chosen shot. Do not change identity, age, or face shape.`,
  ].join('\n\n');

  return {
    prompt,
    image1: 'Subject face / likeness. Whoever you want this run.',
    image2: shot.image2,
    summary: `${opts.character.name} · ${shot.label} · tits ${opts.titSize}${opts.thickCellulite ? ' · cellulite' : ''}${opts.plumpStomach ? ' · plump' : ''}${opts.hairyPussy ? ' · hairy' : ''} · ${opts.faceMess}${opts.pussyCumPuddle ? ' · puddle' : ''}`,
  };
}
