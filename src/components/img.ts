/**
 * Direct subpath import for ion-img — maximum tree-shaking.
 *
 * ```ts
 * import { defineIonImg } from "@elurjs/ionic/components/img";
 * import { registerIonicComponents } from "@elurjs/ionic";
 *
 * registerIonicComponents(defineIonImg);
 * ```
 */
export { defineCustomElement as defineIonImg } from "@ionic/core/components/ion-img.js";
