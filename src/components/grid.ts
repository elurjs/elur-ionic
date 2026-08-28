/**
 * Direct subpath import for ion-grid — maximum tree-shaking.
 *
 * ```ts
 * import { defineIonGrid } from "@elurjs/ionic/components/grid";
 * import { registerIonicComponents } from "@elurjs/ionic";
 *
 * registerIonicComponents(defineIonGrid);
 * ```
 */
export { defineCustomElement as defineIonGrid } from "@ionic/core/components/ion-grid.js";
