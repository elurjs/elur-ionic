/**
 * Direct subpath import for ion-modal — maximum tree-shaking.
 *
 * ```ts
 * import { defineIonModal } from "@elurjs/ionic/components/modal";
 * import { registerIonicComponents } from "@elurjs/ionic";
 *
 * registerIonicComponents(defineIonModal);
 * ```
 */
export { defineCustomElement as defineIonModal } from "@ionic/core/components/ion-modal.js";
