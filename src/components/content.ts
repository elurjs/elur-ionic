/**
 * Direct subpath import for ion-content — maximum tree-shaking.
 *
 * ```ts
 * import { defineIonContent } from "@elurjs/ionic/components/content";
 * import { registerIonicComponents } from "@elurjs/ionic";
 *
 * registerIonicComponents(defineIonContent);
 * ```
 */
export { defineCustomElement as defineIonContent } from "@ionic/core/components/ion-content.js";
