/**
 * Direct subpath import for ion-select-option — maximum tree-shaking.
 *
 * ```ts
 * import { defineIonSelectOption } from "@elurjs/ionic/components/select-option";
 * import { registerIonicComponents } from "@elurjs/ionic";
 *
 * registerIonicComponents(defineIonSelectOption);
 * ```
 */
export { defineCustomElement as defineIonSelectOption } from "@ionic/core/components/ion-select-option.js";
