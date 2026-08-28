/**
 * Direct subpath import for ion-text — maximum tree-shaking.
 *
 * ```ts
 * import { defineIonText } from "@elurjs/ionic/components/text";
 * import { registerIonicComponents } from "@elurjs/ionic";
 *
 * registerIonicComponents(defineIonText);
 * ```
 */
export { defineCustomElement as defineIonText } from "@ionic/core/components/ion-text.js";
