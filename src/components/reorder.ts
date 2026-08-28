/**
 * Direct subpath import for ion-reorder — maximum tree-shaking.
 *
 * ```ts
 * import { defineIonReorder } from "@elurjs/ionic/components/reorder";
 * import { registerIonicComponents } from "@elurjs/ionic";
 *
 * registerIonicComponents(defineIonReorder);
 * ```
 */
export { defineCustomElement as defineIonReorder } from "@ionic/core/components/ion-reorder.js";
