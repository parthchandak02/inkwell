import type { ToolcraftCommand } from "@/toolcraft/runtime";

import { CITY_PRESETS, INKWELL_TARGETS } from "./inkwell-settings";

type ActionContext = { action: { value: string }; dispatch: (command: ToolcraftCommand) => void };

export function handleInkwellAction({ action, dispatch }: ActionContext): void {
  const city = CITY_PRESETS.find((preset) => preset.value === action.value);
  if (!city) return;
  dispatch({ label: city.label, target: INKWELL_TARGETS.latitude, type: "controls.setValue", value: city.latitude });
  dispatch({ label: city.label, target: INKWELL_TARGETS.longitude, type: "controls.setValue", value: city.longitude });
}
