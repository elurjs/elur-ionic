/**
 * Direct subpath import for ion-tabs — maximum tree-shaking.
 *
 * ```ts
 * import { defineIonTabs } from "@elurjs/ionic/components/tabs";
 * import { registerIonicComponents } from "@elurjs/ionic";
 *
 * registerIonicComponents(defineIonTabs);
 * ```
 */
export { defineCustomElement as defineIonTabs } from "@ionic/core/components/ion-tabs.js";
