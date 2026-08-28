/**
 * Direct subpath import for ion-toast — maximum tree-shaking.
 *
 * ```ts
 * import { defineIonToast } from "@elurjs/ionic/components/toast";
 * import { registerIonicComponents } from "@elurjs/ionic";
 *
 * registerIonicComponents(defineIonToast);
 * ```
 */
export { defineCustomElement as defineIonToast } from "@ionic/core/components/ion-toast.js";
