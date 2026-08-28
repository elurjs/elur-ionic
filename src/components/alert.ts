/**
 * Direct subpath import for ion-alert — maximum tree-shaking.
 *
 * ```ts
 * import { defineIonAlert } from "@elurjs/ionic/components/alert";
 * import { registerIonicComponents } from "@elurjs/ionic";
 *
 * registerIonicComponents(defineIonAlert);
 * ```
 */
export { defineCustomElement as defineIonAlert } from "@ionic/core/components/ion-alert.js";
