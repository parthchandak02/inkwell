import type { InkwellSettings } from "./inkwell-settings";
import type { WindData } from "./wind-data";

export type InkwellRasterRequest = { backingHeight: number; backingWidth: number; data: WindData; height: number; id: number; settings: InkwellSettings;  width: number };
export type InkwellRasterResponse = { bitmap?: ImageBitmap; error?: string; id: number };
