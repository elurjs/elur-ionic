/**
 * Direct subpath import for ion-item — maximum tree-shaking.
 *
 * ```ts
 * import { defineIonItem } from "@elurjs/ionic/components/item";
 * import { registerIonicComponents } from "@elurjs/ionic";
 *
 * registerIonicComponents(defineIonItem);
 * ```
 */
export { defineCustomElement as defineIonItem } from "@ionic/core/components/ion-item.js";
