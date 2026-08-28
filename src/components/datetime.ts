/**
 * Direct subpath import for ion-datetime — maximum tree-shaking.
 *
 * ```ts
 * import { defineIonDatetime } from "@elurjs/ionic/components/datetime";
 * import { registerIonicComponents } from "@elurjs/ionic";
 *
 * registerIonicComponents(defineIonDatetime);
 * ```
 */
export { defineCustomElement as defineIonDatetime } from "@ionic/core/components/ion-datetime.js";
