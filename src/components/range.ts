/**
 * Direct subpath import for ion-range — maximum tree-shaking.
 *
 * ```ts
 * import { defineIonRange } from "@elurjs/ionic/components/range";
 * import { registerIonicComponents } from "@elurjs/ionic";
 *
 * registerIonicComponents(defineIonRange);
 * ```
 */
export { defineCustomElement as defineIonRange } from "@ionic/core/components/ion-range.js";
