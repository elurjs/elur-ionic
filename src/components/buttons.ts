/**
 * Direct subpath import for ion-buttons — maximum tree-shaking.
 *
 * ```ts
 * import { defineIonButtons } from "@elurjs/ionic/components/buttons";
 * import { registerIonicComponents } from "@elurjs/ionic";
 *
 * registerIonicComponents(defineIonButtons);
 * ```
 */
export { defineCustomElement as defineIonButtons } from "@ionic/core/components/ion-buttons.js";
