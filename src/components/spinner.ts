/**
 * Direct subpath import for ion-spinner — maximum tree-shaking.
 *
 * ```ts
 * import { defineIonSpinner } from "@elurjs/ionic/components/spinner";
 * import { registerIonicComponents } from "@elurjs/ionic";
 *
 * registerIonicComponents(defineIonSpinner);
 * ```
 */
export { defineCustomElement as defineIonSpinner } from "@ionic/core/components/ion-spinner.js";
