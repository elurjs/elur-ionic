/**
 * Direct subpath import for ion-loading — maximum tree-shaking.
 *
 * ```ts
 * import { defineIonLoading } from "@elurjs/ionic/components/loading";
 * import { registerIonicComponents } from "@elurjs/ionic";
 *
 * registerIonicComponents(defineIonLoading);
 * ```
 */
export { defineCustomElement as defineIonLoading } from "@ionic/core/components/ion-loading.js";
