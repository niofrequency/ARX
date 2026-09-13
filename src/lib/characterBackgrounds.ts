import type { CharacterDef } from './adminPromptBuilder';

export const CHARACTER_BACKGROUNDS: Record<string, string> = {
  cammy: 'Delta Red briefing room or jungle war camp at dusk, metal crates, camouflage netting, harsh practical lights.',
  chunli: 'Hong Kong night street and neon signs, wet pavement, street stall steam, red lantern glow.',
  juri: 'Underground S.I.N. fight club, purple neon, chain-link, dirty concrete, cigarette haze.',
  tifa: 'Seventh Heaven bar after hours, wood counter, neon beer signs, dusty floorboards.',
  '2b': 'Abandoned ruined city in the YoRHa world, pale dust, broken androids, overcast white light.',
  quiet: 'Muddy jungle outpost, wet foliage, rusted shipping containers, humid overcast.',
  starfire: 'Tamaranean balcony over alien towers, purple-orange sky, glowing crystals.',
  raven: 'Dark azarath temple interior, floating candles, violet shadows, stone floor.',
  ivy: 'Overgrown greenhouse gone feral, vines through broken glass, damp soil, green light.',
  harley: 'Gotham amusement park wreckage, chipped paint, carnival lights, dirty concrete.',
  catwoman: 'Gotham rooftop at night, wet slate, city neon far below, moon and steam vents.',
  ww: 'Themysciran marble courtyard at dusk, columns, sea in the distance, gold torchlight.',
  cersei: 'Red Keep stone chamber, lion tapestries, candlelight, cold flagstones.',
  dany: 'Dragonstone throne hall, carved stone dragons, sea wind through open arches.',
  cleo: 'Egyptian palace chamber, painted columns, gold leaf, sand-dusted stone floor.',
  slave: 'Stone slave quarters or throne-room floor, chains, torchlight, dirty rugs.',
  dexmom: 'Bright 1960s suburban kitchen, orange counters, checker floor, morning window light.',
  sam: 'WOOHP high-tech HQ corridor, green spy lighting, metal floor.',
  wednesday: 'Nevermore Academy dorm, black wood, stained glass, grey daylight.',
  starlight: 'The Boys grimy New York alley and Vought tower glow, wet asphalt, sodium lights.',
  lydia: 'Tim Burton graveyard and old mansion interior, fog, dead flowers, cold moonlight.',
  nun: 'Abandoned chapel, cracked pews, dying candles, dirty stone, holy-water stains.',
  elvira: 'Campy gothic living room, cobwebs, velvet, cheap chandelier, late-night talk-show set energy.',
  joi: 'Rain-soaked Blade Runner 2049 street and tiny apartment, orange neon through blinds, holographic flicker.',
  cyber: 'Night City alley, puddles, hologram ads, trash, magenta-cyan neon.',
  egirl: 'Messy bedroom studio, LED strips, ring light, unmade bed, posters.',
  hooker: 'Dirty motel hallway or street curb at night, flickering sign, stained carpet, cigarette butts.',
  trailer: 'Trailer-park interior, wood paneling, overflowing ashtray, cheap lamps, screen door.',
  teacher: 'Empty classroom after hours, chalkboard, desks shoved aside, fluorescent lights.',
  nurse: 'Used exam room, paper-covered table, harsh clinic fluorescents, tile floor.',
  maid: 'Ornate hotel suite or rich apartment, rumpled sheets, gold trim, late afternoon light.',
  prisoner: 'Concrete cell block, metal bunk, open bars, sick green institutional light.',
  batgirl: 'Gotham clocktower workshop, bat-tech, rain on the windows, warm practical lamps.',
  supergirl: 'Metropolis rooftop at golden hour, city glass towers, cape-colored sky.',
  powergirl: 'Metro rooftop and smashed office glass, bright daylight, city behind her.',
  blackwidow: 'SHIELD safehouse or Budapest stairwell, peeling paint, tactical cases.',
  widowmaker: 'Talon penthouse overlooking a night city, purple lighting, glass and steel.',
  ada: 'Racoon City penthouse after dark, red dress energy, rain on floor-to-ceiling windows.',
  samus: 'Gunship hangar and Chozo ruins mix, cold metal, alien stone, helmet on a crate.',
  mai: 'Japanese festival night and wooden veranda, paper lanterns, maple leaves.',
  zerotwo: 'FRANXX hangar bay, red warning lights, metal grating, steam.',
  asuka: 'Nerv cage and Tokyo-3 dusk, orange sky, plug-suit red against concrete.',
  velma: 'Dusty mystery basement or haunted mansion library, flashlight practicals.',
  peach: 'Peach Castle balcony, pastel sky, marble, distant kingdom hills.',
  maeve: 'The Boys grimy rooftop and city night, gold armor against sodium streetlight.',
  ladyD: 'Castle Dimitrescu hall, tall windows, dust in cold light, stone and velvet.',
  blackcat: 'New York rooftop at night, wet tar, city glow, stolen loot crates.',
};

export function backgroundFor(character: CharacterDef): string {
  const preset = CHARACTER_BACKGROUNDS[character.id];
  if (preset) return preset;
  if ((character as any).background) return String((character as any).background);
  return `Background matches ${character.name}\'s world: a dirty lived-in location from her story, not a blank studio, not a generic bedroom unless that is her vibe.`;
}
