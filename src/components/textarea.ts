/**
 * Direct subpath import for ion-textarea — maximum tree-shaking.
 *
 * ```ts
 * import { defineIonTextarea } from "@elurjs/ionic/components/textarea";
 * import { registerIonicComponents } from "@elurjs/ionic";
 *
 * registerIonicComponents(defineIonTextarea);
 * ```
 */
export { defineCustomElement as defineIonTextarea } from "@ionic/core/components/ion-textarea.js";
