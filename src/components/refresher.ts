/**
 * Direct subpath import for ion-refresher — maximum tree-shaking.
 *
 * ```ts
 * import { defineIonRefresher } from "@elurjs/ionic/components/refresher";
 * import { registerIonicComponents } from "@elurjs/ionic";
 *
 * registerIonicComponents(defineIonRefresher);
 * ```
 */
export { defineCustomElement as defineIonRefresher } from "@ionic/core/components/ion-refresher.js";
