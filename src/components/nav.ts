/**
 * Direct subpath import for ion-nav — maximum tree-shaking.
 *
 * ```ts
 * import { defineIonNav } from "@elurjs/ionic/components/nav";
 * import { registerIonicComponents } from "@elurjs/ionic";
 *
 * registerIonicComponents(defineIonNav);
 * ```
 */
export { defineCustomElement as defineIonNav } from "@ionic/core/components/ion-nav.js";
