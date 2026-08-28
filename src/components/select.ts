/**
 * Direct subpath import for ion-select — maximum tree-shaking.
 *
 * ```ts
 * import { defineIonSelect } from "@elurjs/ionic/components/select";
 * import { registerIonicComponents } from "@elurjs/ionic";
 *
 * registerIonicComponents(defineIonSelect);
 * ```
 */
export { defineCustomElement as defineIonSelect } from "@ionic/core/components/ion-select.js";
