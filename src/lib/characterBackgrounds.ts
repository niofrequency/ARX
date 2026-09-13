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
  elvira: 'Campy gothic living room, cobwebs, velvet, cheap chandelier.',
  joi: 'Rain-soaked Blade Runner 2049 street and tiny apartment, orange neon through blinds.',
  cyber: 'Night City alley, puddles, hologram ads, trash, magenta-cyan neon.',
  egirl: 'Messy bedroom studio, LED strips, ring light, unmade bed, posters.',
  hooker: 'Dirty motel hallway or street curb at night, flickering sign, stained carpet.',
  trailer: 'Trailer-park interior, wood paneling, overflowing ashtray, cheap lamps.',
  teacher: 'Empty classroom after hours, chalkboard, desks shoved aside, fluorescent lights.',
  nurse: 'Used exam room, paper-covered table, harsh clinic fluorescents, tile floor.',
  maid: 'Ornate hotel suite, rumpled sheets, gold trim, late afternoon light.',
  prisoner: 'Concrete cell block, metal bunk, open bars, sick green institutional light.',
  batgirl: 'Gotham clocktower workshop, bat-tech, rain on the windows, warm practical lamps.',
  supergirl: 'Metropolis rooftop at golden hour, city glass towers.',
  powergirl: 'Metro rooftop and smashed office glass, bright daylight.',
  blackwidow: 'SHIELD safehouse or Budapest stairwell, peeling paint, tactical cases.',
  widowmaker: 'Talon penthouse overlooking a night city, purple lighting, glass and steel.',
  ada: 'Racoon City penthouse after dark, rain on floor-to-ceiling windows.',
  samus: 'Gunship hangar mixed with Chozo ruins, cold metal, helmet on a crate.',
  mai: 'Japanese festival night and wooden veranda, paper lanterns, maple leaves.',
  zerotwo: 'FRANXX hangar bay, red warning lights, metal grating, steam.',
  asuka: 'Nerv cage and Tokyo-3 dusk, orange sky, concrete.',
  velma: 'Dusty mystery basement or haunted mansion library, flashlight practicals.',
  peach: 'Peach Castle balcony, pastel sky, marble, distant kingdom hills.',
  maeve: 'The Boys grimy rooftop and city night, sodium streetlight.',
  ladyD: 'Castle Dimitrescu hall, tall windows, dust in cold light, stone and velvet.',
  blackcat: 'New York rooftop at night, wet tar, city glow.',
};

export function backgroundFor(character: CharacterDef): string {
  if (character.background) return character.background;
  if (CHARACTER_BACKGROUNDS[character.id]) return CHARACTER_BACKGROUNDS[character.id];
  return 'A location from ' + character.name + "'s world. Dirty and lived-in. Not a blank studio, not a random bedroom unless that is her vibe.";
}

export function withCharacterBackground(prompt: string, character: CharacterDef): string {
  const line = 'Background: ' + backgroundFor(character) + ' Match the location to her character vibe.';
  if (prompt.includes('Background:')) return prompt;
  const marker = 'If Image 2 is present';
  if (prompt.includes(marker)) return prompt.replace(marker, line + '\n\n' + marker);
  return prompt + '\n\n' + line;
}
