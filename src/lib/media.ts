/** Real solar + Palawan island photography used across the marketing page. */
const px = (id: number, w = 1400) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;

export const MEDIA = {
  heroPanels: px(38171120, 1920),
  rooftopCloseUp: px(13963757, 1200),
  installCrew: px(11645008, 1200),
  residentialHome: px(12243093, 1200),
  elNidoAerial: px(36724824, 1600),
  coronIsland: px(13256504, 1400),
  bangkaBoat: px(36758178, 1400),
};

export const SUB_CITIES = [
  "Puerto Princesa",
  "El Nido",
  "San Vicente",
  "Coron",
  "Linapacan",
  "Taytay",
  "Balabac",
];
