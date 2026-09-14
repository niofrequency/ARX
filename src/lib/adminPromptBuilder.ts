export type ShotType = 'closeup' | 'medium' | 'far';
export type AngleType = 'low' | 'eye' | 'high';
export type TitSize = 'small' | 'medium' | 'big' | 'huge';
export type FaceMess = 'clean' | 'drool' | 'face_only' | 'bukkake' | 'bukkake_drool';
export type PoseFamily = 'front' | 'rear' | 'face' | 'tits' | 'other' | 'custom';
export type WardrobeStage = 'dressed' | 'tease' | 'flash_tits' | 'flash_pussy' | 'flash_ass' | 'pulled' | 'half' | 'nude';

export interface CharacterDef { id: string; name: string; costume: string; hair: string; }
export interface PoseDef { id: string; label: string; family: PoseFamily; image2: string; block: string; }
export interface BuilderOptions {
  character: CharacterDef; poseId: string; customPose?: string; shot: ShotType; angle: AngleType;
  titSize: TitSize; thickCellulite: boolean; plumpStomach: boolean; hairyPussy: boolean;
  faceMess: FaceMess; pussyCumPuddle: boolean;
  wardrobe?: WardrobeStage;
  matchImage2Pose?: boolean;
  keepImage1Accessories?: boolean;
  image3Role?: string;
}

export const POSE_FAMILIES: { id: PoseFamily; label: string }[] = [
  { id: 'front', label: 'Front / spread' },
  { id: 'rear', label: 'Rear / doggy' },
  { id: 'face', label: 'Face / oral' },
  { id: 'tits', label: 'Tits' },
  { id: 'other', label: 'Other' },
  { id: 'custom', label: 'Custom' },
];

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
  { id: 'harley', name: 'Harley Quinn', hair: 'messy blonde pigtails with pink and blue tips', costume: 'wrecked red/blue jacket open, Daddys Lil Monster shirt yanked aside, smeared clown makeup' },
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
  { id: 'batgirl', name: 'Batgirl', hair: 'red hair, cowl off', costume: 'torn bat suit, yellow bat emblem still on, cape under her' },
  { id: 'supergirl', name: 'Supergirl', hair: 'long blonde hair', costume: 'S-shield top shoved up, red skirt gone, cape used as a blanket' },
  { id: 'powergirl', name: 'Power Girl', hair: 'short blonde hair', costume: 'busted white suit, chest window ripped wider, cape still under her' },
  { id: 'blackwidow', name: 'Black Widow', hair: 'short red widow cut', costume: 'unzipped black tactical catsuit, empty holsters' },
  { id: 'widowmaker', name: 'Widowmaker', hair: 'long dark blue-black hair', costume: 'torn purple-pink catsuit peeled open' },
  { id: 'ada', name: 'Ada Wong', hair: 'shoulder-length dark hair', costume: 'red dress split open, slit to the hip, heels still on' },
  { id: 'samus', name: 'Samus Aran', hair: 'long blonde hair', costume: 'Zero Suit peeled down to her thighs, helmet on the table' },
  { id: 'mai', name: 'Mai Shiranui', hair: 'long brown hair with gold ornaments', costume: 'ripped red kunoichi outfit, obi undone' },
  { id: 'zerotwo', name: 'Zero Two', hair: 'long pink hair, small red horns', costume: 'torn red pilot plugsuit' },
  { id: 'asuka', name: 'Asuka Langley', hair: 'long orange hair with blue clips', costume: 'ripped red plugsuit' },
  { id: 'velma', name: 'Velma', hair: 'short auburn bob, glasses still on', costume: 'orange sweater yanked up, skirt shoved aside' },
  { id: 'peach', name: 'Princess Peach', hair: 'long blonde hair with a crown', costume: 'pink gown ripped down the front' },
  { id: 'maeve', name: 'Queen Maeve', hair: 'long dark hair', costume: 'torn gold-black The Boys armor' },
  { id: 'ladyD', name: 'Lady Dimitrescu', hair: 'black hair, hat off', costume: 'white blouse ripped open, black gloves still on' },
  { id: 'blackcat', name: 'Black Cat', hair: 'white hair, mask pushed up', costume: 'torn black latex with white fur trim' },
  { id: 'jinx', name: 'Jinx (Arcane)', hair: 'long blue-black twin braids', costume: 'torn crop top and low-slung pants, belts undone, wrecked and half-on' },
  { id: 'makima', name: 'Makima', hair: 'red hair in a low ponytail', costume: 'torn white dress shirt and tie, pulled open' },
  { id: 'rebecca', name: 'Rebecca (Edgerunners)', hair: 'short choppy pink hair', costume: 'ripped tactical crop top and shorts, wrecked and half-on' },
  { id: 'yennefer', name: 'Yennefer of Vengerberg', hair: 'long black curly hair', costume: 'torn black-and-white sorceress gown, obsidian star pendant' },
  { id: 'triss', name: 'Triss Merigold', hair: 'long wavy auburn hair', costume: 'torn green corset dress, wrecked and half-on' },
  { id: 'lara', name: 'Lara Croft', hair: 'long braided brown hair', costume: 'torn tank top and cargo shorts, gear straps hanging loose' },
  { id: 'jill', name: 'Jill Valentine', hair: 'short brown bob', costume: 'torn blue tactical vest and tube top, wrecked and half-on' },
  { id: 'bayonetta', name: 'Bayonetta', hair: 'long black hair, glasses off', costume: 'torn black bodysuit, peeled open at the chest' },
  { id: 'morrigan', name: 'Morrigan Aensland', hair: 'short green hair', costume: 'torn purple succubus bodysuit, bat-wing collar askew' },
  { id: 'shego', name: 'Shego', hair: 'short black hair', costume: 'torn green and black catsuit, zipper pulled down' },
  { id: 'ahri', name: 'Ahri', hair: 'long white-blonde hair, fox ears', costume: 'torn silk hanbok-style outfit, tails visible, wrecked and half-on' },
  { id: 'sailormoon', name: 'Sailor Moon', hair: 'long blonde twin-tail odango hair', costume: 'torn sailor fuku, tiara crooked, gloves still on' },
  { id: 'chel', name: 'Chel (The Road to El Dorado)', hair: 'long straight black hair with blunt bangs, gold drop earrings', costume: 'cream bandeau top with a pink band at the top edge, matching cream wrap skirt tied at the hip with a high thigh slit and a pink hem stripe, chunky green bangles on both arms, barefoot' },
  { id: 'saree', name: 'Indian saree', hair: 'long dark hair, center part', costume: 'silk saree with a blouse, pallu draped, jewelry' },
  { id: 'lehenga', name: 'Indian lehenga', hair: 'dark hair in a bun with jewelry', costume: 'embroidered lehenga choli, dupatta, waist chain' },
  { id: 'persian', name: 'Persian / Iranian', hair: 'long dark wavy hair', costume: 'ornate Persian vest and flowing pants, gold coins' },
  { id: 'egyptian', name: 'Egyptian', hair: 'dark straight hair, gold band', costume: 'white linen kalasiris, gold collar, snake cuffs' },
  { id: 'nubian', name: 'Nubian / African royal', hair: 'braids or a high puff with gold cuffs', costume: 'beaded top, wrapped skirt, gold collar, arm cuffs' },
  { id: 'westaf', name: 'West African', hair: 'cornrows or a headwrap', costume: 'ankara print wrap top and skirt, gold hoops' },
  { id: 'maasai', name: 'East African / Maasai-inspired', hair: 'shaved sides or braids with beads', costume: 'red shuka wrap, beaded collar, metal cuffs' },
  { id: 'native', name: 'Native American-inspired', hair: 'long dark hair, side part', costume: 'fringed hide dress, beadwork, turquoise, barefoot' },
  { id: 'aztec', name: 'Aztec / Mexica', hair: 'dark hair, jade ear flares', costume: 'huipil-style top and wrap skirt, jade and gold jewelry' },
  { id: 'mexican', name: 'Mexican traditional', hair: 'dark hair in braids with ribbons', costume: 'embroidered blouse and wide skirt' },
  { id: 'andalus', name: 'Andalusian / flamenco', hair: 'dark hair with a flower', costume: 'tight flamenco dress with a thigh slit, ruffles' },
  { id: 'bedouin', name: 'Bedouin / Arabian', hair: 'dark hair under a loose veil falling off', costume: 'sheer abaya or embroidered kaftan open over a tiny top and skirt, gold belt' },
  { id: 'turkish', name: 'Ottoman / Turkish', hair: 'dark hair with a jeweled cap', costume: 'shalwar and embroidered vest, coin belt' },
  { id: 'hanfu', name: 'Hanfu / Chinese', hair: 'dark hair in a half-up style', costume: 'silk ruqun or a tied wrap hanfu, sash' },
  { id: 'kimono', name: 'Kimono / Japanese', hair: 'dark hair up with kanzashi', costume: 'kimono or yukata loosely tied, obi undone' },
  { id: 'hanbok', name: 'Hanbok / Korean', hair: 'dark hair with a binyeo pin', costume: 'jeogori and chima, sash loose' },
  { id: 'thai', name: 'Thai traditional', hair: 'dark hair in a high twist', costume: 'sbai sash and sinh skirt, gold belt' },
  { id: 'balinese', name: 'Balinese / Indonesian', hair: 'dark hair with a flower crown', costume: 'kebaya and kain wrap, gold sash' },
  { id: 'polynesian', name: 'Polynesian', hair: 'long wavy dark hair, flower behind one ear', costume: 'tapa or floral wrap, shell necklace, barefoot' },
  { id: 'celtic', name: 'Celtic / Gaelic', hair: 'long red or dark waves', costume: 'torc, plaid wrap skirt, laced bodice' },
  { id: 'viking', name: 'Norse / Viking', hair: 'braided hair with metal rings', costume: 'apron dress over a shift, brooches, fur tossed off' },
  { id: 'slavic', name: 'Slavic folk', hair: 'flower crown, long hair', costume: 'embroidered blouse and wrap skirt, beads' },
];

export const WARDROBE_STAGES: { id: WardrobeStage; label: string; block: string }[] = [
  { id: 'dressed', label: '1 Dressed', block: 'Fully dressed in accurate character clothing, fitted and on properly, not wrecked. No nudity.' },
  { id: 'tease', label: '2 Tease', block: 'Still mostly dressed. Teasing: strap down, hiked hem. Nipples and pussy covered.' },
  { id: 'flash_tits', label: 'Flash tits', block: 'Still dressed. She pulls her top down so her breasts are out. Rest of outfit stays on.' },
  { id: 'flash_ass', label: 'Flash ass (rear)', block: 'Rear view Instagram tease. She looks back over her shoulder and tugs her skirt or shorts up over her ass. Top stays on.' },
  { id: 'flash_pussy', label: 'Flash pussy', block: 'Still dressed. She lifts her skirt so her pussy is visible. Top stays on.' },
  { id: 'pulled', label: '3 Pulled', block: 'Clothes pulled aside, not off. Tits or ass out, outfit still hanging on.' },
  { id: 'half', label: '4 Half-nude', block: 'Half nude. Costume bunched. Tits out. Ass or pussy visible depending on pose.' },
  { id: 'nude', label: '5 Nude', block: 'Fully nude. Costume off or leftover on an ankle.' },
];

export const POSES: PoseDef[] = [
  { id: 'spread', label: 'On back, legs spread', family: 'front', image2: 'Front spread-leg ref.', block: 'On her back holding her thighs open. Pussy facing the viewer. Direct eye contact.' },
  { id: 'front_pussy', label: 'Front pussy close-up', family: 'front', image2: 'Front crotch close-up.', block: 'Extreme front pussy close-up. Face still visible above. Direct eye contact.' },
  { id: 'ig_pussy', label: 'IG pussy close-up', family: 'front', image2: 'Phone-style pussy close-up.', block: 'Instagram thirst-trap pussy close-up. Extreme crotch crop. Pussy fills the lower frame. Thighs open. She looks down at the viewer like she is taking the photo. Face visible above.' },
  { id: 'ig_ass', label: 'IG ass tease rear', family: 'rear', image2: 'Phone-style rear ass close-up.', block: 'Instagram thirst-trap rear close-up. Ass fills the frame. She looks back over her shoulder. Skirt pulled up over her cheeks.' },
  { id: 'doggy', label: 'Doggystyle', family: 'rear', image2: 'All-fours rear ref.', block: 'On all fours. Ass toward the camera. Looks back. Direct eye contact.' },
  { id: 'ass', label: 'Ass shot', family: 'rear', image2: 'Kneeling rear ass ref.', block: 'Rear ass shot. Cheeks spread. Looks back at the viewer.' },
  { id: 'lift_top', label: 'Lifting shirt / top', family: 'tits', image2: 'Hands lifting the top.', block: 'Dressed. She lifts her top so her tits are out. Looks at the viewer.' },
  { id: 'lift_skirt', label: 'Lifting skirt', family: 'front', image2: 'Hands lifting the skirt.', block: 'Dressed. She lifts her skirt so her pussy shows. Top stays on.' },
  { id: 'face_closeup', label: 'Face close-up', family: 'face', image2: 'Tight face close-up.', block: 'Extreme face close-up. Looks at the viewer.' },
  { id: 'custom', label: 'Custom pose', family: 'custom', image2: 'Use a photo of that exact pose as Image 2.', block: '' },
];

const SHOT_LINE: Record<ShotType, string> = {
  closeup: 'Close-up crop. Subject fills the frame.',
  medium: 'Medium shot. Face, tits, and pose readable.',
  far: 'Farther shot. More body and outfit in frame.',
};
const ANGLE_LINE: Record<AngleType, string> = {
  low: 'Low angle. Camera looking up.',
  eye: 'Eye-level angle.',
  high: 'High angle. Camera looking down.',
};
const TIT_LINE: Record<TitSize, string> = {
  small: 'Small natural tits.', medium: 'Medium full tits.', big: 'Big heavy tits.', huge: 'Huge tits.',
};

export function pickRandomCharacter(excludeId?: string): CharacterDef {
  const pool = excludeId ? CHARACTERS.filter((c) => c.id !== excludeId) : CHARACTERS;
  return pool[Math.floor(Math.random() * pool.length)];
}
export function pickRandomPose(excludeId?: string): PoseDef {
  const pool = POSES.filter((p) => p.id !== 'custom' && p.id !== excludeId);
  return pool[Math.floor(Math.random() * pool.length)];
}

export function assembleAdminPrompt(opts: BuilderOptions): { prompt: string; image1: string; image2: string; image3: string; summary: string } {
  const pose = POSES.find((p) => p.id === opts.poseId) ?? POSES[0];
  const poseBlock = pose.id === 'custom'
    ? `Custom pose: ${opts.customPose?.trim() || 'use image 2'}.`
    : pose.block;
  const image3Role = opts.image3Role?.trim() || 'background, clothing, or an object';
  const matchPose = opts.matchImage2Pose !== false;
  const keepAccessories = opts.keepImage1Accessories !== false;
  const body: string[] = [TIT_LINE[opts.titSize]];
  if (opts.thickCellulite) body.push('Thick outer thighs with visible cellulite.');
  if (opts.plumpStomach) body.push('A little plump stomach.');
  const wardrobe: WardrobeStage = opts.wardrobe || 'half';
  const wardrobeLine = (WARDROBE_STAGES.find((w) => w.id === wardrobe) ?? WARDROBE_STAGES[3]).block;
  const showGenitals = wardrobe === 'half' || wardrobe === 'nude' || wardrobe === 'flash_pussy';
  if (showGenitals) body.push(opts.hairyPussy ? 'Hairy pussy.' : 'Naked pussy exposed.');
  else body.push('Keep genitals covered unless the wardrobe stage flashes them.');
  const wantCum = opts.faceMess !== 'clean' && opts.faceMess !== 'drool';
  const mess: string[] = [];
  if (opts.faceMess === 'clean') mess.push('NO SEMEN. NO BUKKAKE. Do not copy cum from image 2.');
  else if (opts.faceMess === 'drool') mess.push('NO SEMEN. Drool only.');
  else if (opts.faceMess === 'face_only') mess.push('Bukkake face only.');
  else mess.push('Heavy messy bukkake.');
  if (opts.pussyCumPuddle && wantCum) mess.push('Pussy full of cum, puddle on the floor.');
  else if (!wantCum) mess.push('No cum puddle.');
  const image2Line = matchPose
    ? `If Image 2 is present: copy BODY SHAPE only. Same waist, hips, thigh thickness, limb length. Do not stretch, melt, or add limbs. Two arms, two legs, five fingers. Do NOT copy image 2 exact pose or camera. Make a natural DERIVATIVE stance. ${poseBlock}`
    : `If Image 2 is present: body shape only. Do not copy pose or camera. Do not deform the body. ${poseBlock}`;
  const accessoriesLine = keepAccessories
    ? `Keep accessories from image 1 unchanged.`
    : `Accessories follow the character costume.`;
  const prompt = [
    `Image 1 is the only identity/face reference.`,
    accessoriesLine,
    `Dress her as ${opts.character.name}. ${opts.character.hair}. ${opts.character.costume}. ${wardrobeLine}`,
    image2Line,
    `If Image 3 is present, use it only for: ${image3Role}.`,
    SHOT_LINE[opts.shot], ANGLE_LINE[opts.angle], body.join(' '),
    `Keep skin color from image 1. Photorealistic skin: pores, peach fuzz.`,
    mess.join(' '),
    `Photorealistic. Face from image 1. Body proportions from Image 2 when present — never a deformed copy. Pose is the chosen pose, only loosely derived from image 2.`,
  ].join('\n\n');
  return {
    prompt,
    image1: 'Subject face / likeness only.',
    image2: `${pose.image2} Body proportions only. Pose is a derivative.`,
    image3: `Reference for: ${image3Role}.`,
    summary: `${opts.character.name} · ${wardrobe} · ${pose.label} · ${opts.shot}/${opts.angle} · ${opts.faceMess}`,
  };
}
