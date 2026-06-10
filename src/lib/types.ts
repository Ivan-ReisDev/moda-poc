// Tipos e dados estáticos — seguro para client e server

export interface PersonMeasurements {
  height?: string;
  weight?: string;
  bust?: string;
  waist?: string;
  hips?: string;
}

export interface ClothingMeasurements {
  size?: string;
  bust?: string;
  waist?: string;
  hips?: string;
  length?: string;
  sleeve?: string;
  shoulder?: string;
}

export type ClothingSize = "M" | "G";

export const PRESET_MEASUREMENTS = {
  person: {
    height: "1,70m",
    weight: "65kg",
    bust: "92cm",
    waist: "70cm",
    hips: "98cm",
  } as Required<PersonMeasurements>,
  clothing: {
    M: {
      size: "M",
      bust: "92cm",
      waist: "72cm",
      hips: "96cm",
      length: "62cm",
      sleeve: "22cm",
      shoulder: "38cm",
    },
    G: {
      size: "G",
      bust: "100cm",
      waist: "80cm",
      hips: "104cm",
      length: "65cm",
      sleeve: "24cm",
      shoulder: "41cm",
    },
  } as Record<string, Required<ClothingMeasurements>>,
};
