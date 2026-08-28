/**
 * Direct subpath import for ion-chip — maximum tree-shaking.
 *
 * ```ts
 * import { defineIonChip } from "@elurjs/ionic/components/chip";
 * import { registerIonicComponents } from "@elurjs/ionic";
 *
 * registerIonicComponents(defineIonChip);
 * ```
 */
export { defineCustomElement as defineIonChip } from "@ionic/core/components/ion-chip.js";
