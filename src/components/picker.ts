/**
 * Direct subpath import for ion-picker — maximum tree-shaking.
 *
 * ```ts
 * import { defineIonPicker } from "@elurjs/ionic/components/picker";
 * import { registerIonicComponents } from "@elurjs/ionic";
 *
 * registerIonicComponents(defineIonPicker);
 * ```
 */
export { defineCustomElement as defineIonPicker } from "@ionic/core/components/ion-picker.js";
