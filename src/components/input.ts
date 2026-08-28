/**
 * Direct subpath import for ion-input — maximum tree-shaking.
 *
 * ```ts
 * import { defineIonInput } from "@elurjs/ionic/components/input";
 * import { registerIonicComponents } from "@elurjs/ionic";
 *
 * registerIonicComponents(defineIonInput);
 * ```
 */
export { defineCustomElement as defineIonInput } from "@ionic/core/components/ion-input.js";
