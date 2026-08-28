/**
 * Partial fixture — imports a few components via bundle subpaths.
 *
 * Expected: only layout + buttons code is included. No forms, lists,
 * feedback, overlays, or navigation component code.
 */
import { initializeElurIonic, registerIonicComponents } from "@elurjs/ionic";
import { layoutComponents } from "@elurjs/ionic/bundles/layout";
import { buttonComponents } from "@elurjs/ionic/bundles/buttons";

initializeElurIonic();
registerIonicComponents(...layoutComponents, ...buttonComponents);

export { layoutComponents, buttonComponents };
