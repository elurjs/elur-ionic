/**
 * Direct subpath import for ion-menu — maximum tree-shaking.
 *
 * ```ts
 * import { defineIonMenu } from "@elurjs/ionic/components/menu";
 * import { registerIonicComponents } from "@elurjs/ionic";
 *
 * registerIonicComponents(defineIonMenu);
 * ```
 */
export { defineCustomElement as defineIonMenu } from "@ionic/core/components/ion-menu.js";
