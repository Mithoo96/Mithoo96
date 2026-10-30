/**
 * Every photo on the site is referenced from here.
 *
 * The site is art-directed around four real ALAMOD Studio photos, installed in
 * /public/images/alamod/. To swap one, replace the file with the same name;
 * no component changes are needed:
 *
 *  alamod-hero.jpg   Wide room shot with the lit "ALAMOD MUSIC LLC" sign,
 *                    blue LED ceiling, bass rig on the left, drums center.
 *  studio-wide.jpg   Wide shot from the right: PDP kit, red congas, wedges,
 *                    digital mixer on the far right.
 *  equipment.jpg     Close shot of the sign above the Ampeg B4R + Hartke
 *                    HA2500 bass heads.
 *  band-area.jpg     Drummer's-eye view over the Sabian cymbals toward the
 *                    red tufted sofa, JBL PA and vocal mics.
 *
 * Detail shots ("crops") below reuse those same files with a focal point and
 * zoom, so close-ups stay real ALAMOD photography. Adding more photos later?
 * Add a file + an entry here and reference it from a section.
 */

export type StudioImage = {
  src: string;
  alt: string;
  width: number;
  height: number;
  /** Focal point (CSS object-position) used when the image is cropped. */
  position?: string;
  /** >1 zooms into the focal point for detail crops. */
  zoom?: number;
};

const file = (name: string) => `/images/alamod/${name}.jpg`;
const W = 2000;
const H = 1333;

const shot = (
  name: string,
  alt: string,
  position = "50% 50%",
  zoom = 1,
): StudioImage => ({ src: file(name), alt, width: W, height: H, position, zoom });

export const images = {
  // Primary photos
  hero: shot(
    "alamod-hero",
    "Inside ALAMOD Studio in Miami: blue LED ceiling, the lit ALAMOD Music sign, a full drum kit, bass rig and stage monitors on red carpet",
    "58% 58%",
  ),
  studioWide: shot(
    "studio-wide",
    "Wide view of the ALAMOD rehearsal room with a PDP drum kit, red congas, floor monitors and a digital mixing console",
    "50% 60%",
  ),
  equipment: shot(
    "equipment",
    "Ampeg B4R and Hartke HA2500 bass amplifier heads beneath the illuminated ALAMOD Music sign",
    "62% 70%",
  ),
  bandArea: shot(
    "band-area",
    "The drummer's view at ALAMOD Studio: Sabian cymbals in the foreground, vocal mics, JBL PA speakers and a red tufted sofa",
    "50% 55%",
  ),

  // Detail crops from the same photos
  sign: shot("equipment", "Illuminated ALAMOD Music LLC sign on the studio wall", "40% 18%", 1.25),
  drums: shot("studio-wide", "PDP drum kit with cymbals on the ALAMOD stage", "42% 60%", 1.6),
  congas: shot("studio-wide", "Red congas and mic stands in the ALAMOD rehearsal room", "57% 52%", 1.7),
  mixer: shot("studio-wide", "Digital mixing console and outboard rack at ALAMOD Studio", "93% 64%", 1.9),
  amps: shot("equipment", "Ampeg and Hartke bass heads ready to plug in", "66% 82%", 1.4),
  pa: shot("band-area", "JBL PA speakers on subwoofers flanking the lounge area", "30% 30%", 1.6),
  lounge: shot("band-area", "Red tufted lounge sofa inside the ALAMOD rehearsal room", "50% 55%", 1.4),
  ceiling: shot("alamod-hero", "Blue LED-lit ceiling and track lighting above the ALAMOD stage", "50% 18%", 1.4),
} satisfies Record<string, StudioImage>;

/** Order used by the horizontal gallery + lightbox. */
export const gallery: StudioImage[] = [
  images.studioWide,
  images.drums,
  images.bandArea,
  images.sign,
  images.mixer,
  images.hero,
  images.congas,
  images.equipment,
  images.lounge,
];
