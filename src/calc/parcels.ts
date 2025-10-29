export type ParcelKind = "exploration" | "social" | "objective" | "puzzle" | "survival";
export interface Parcel {
  name: string;
  kind: ParcelKind;
  el: number;
  scale: number; // 0.5 .. 1.5
}
