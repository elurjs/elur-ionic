/**
 * Direct subpath import for ion-list — maximum tree-shaking.
 *
 * ```ts
 * import { defineIonList } from "@elurjs/ionic/components/list";
 * import { registerIonicComponents } from "@elurjs/ionic";
 *
 * registerIonicComponents(defineIonList);
 * ```
 */
export { defineCustomElement as defineIonList } from "@ionic/core/components/ion-list.js";
