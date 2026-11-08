import { getToolcraftControlFieldByTarget } from "./browser-control-target-helpers";
import { expectToolcraftReferenceParity } from "./browser-acceptance-outcome-helpers";
import { expectToolcraftProductObservableToChange } from "./product-observable-helpers";
import { fieldValue, holdSliderDrag, openInkwell, outputSelector, waitForFrame } from "./inkwell-test-helpers";
import { test } from "./toolcraft-product-test";
import { INKWELL_TARGETS } from "../src/inkwell/inkwell-settings";

test(`browser: inkwell control ${INKWELL_TARGETS.ink}`, async ({ page }) => {
  const session = await openInkwell(page);
  await expectToolcraftProductObservableToChange(session, session.controlAction(INKWELL_TARGETS.ink, () => fieldValue(page, INKWELL_TARGETS.ink, "#1F3A68")), {
    requirementId: INKWELL_TARGETS.ink,
    selector: outputSelector,
  });
  await expectToolcraftReferenceParity(async () => (await getToolcraftControlFieldByTarget(page, INKWELL_TARGETS.ink)).getByRole("textbox").inputValue(), "#1F3A68", {
    requirementId: INKWELL_TARGETS.ink,
    target: INKWELL_TARGETS.ink,
  });
});

for (const [target, ratio] of [[INKWELL_TARGETS.spacing, 0.6], [INKWELL_TARGETS.brush, 0.8]] as const) {
  test(`browser: inkwell control ${target}`, async ({ page }) => {
    const session = await openInkwell(page);
    const field = await getToolcraftControlFieldByTarget(page, target);
    const before = await field.getByRole("slider").getAttribute("aria-valuenow");
    await expectToolcraftProductObservableToChange(session, session.controlAction(target, () => holdSliderDrag(page, target, ratio)), { requirementId: target, selector: outputSelector });
    await page.mouse.up();
    await waitForFrame(page);
    await expectToolcraftReferenceParity(async () => (await field.getByRole("slider").getAttribute("aria-valuenow")) !== before, true, { requirementId: target, target });
  });
}
