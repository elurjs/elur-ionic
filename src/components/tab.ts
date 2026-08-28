/**
 * Direct subpath import for ion-tab — maximum tree-shaking.
 *
 * ```ts
 * import { defineIonTab } from "@elurjs/ionic/components/tab";
 * import { registerIonicComponents } from "@elurjs/ionic";
 *
 * registerIonicComponents(defineIonTab);
 * ```
 */
export { defineCustomElement as defineIonTab } from "@ionic/core/components/ion-tab.js";
