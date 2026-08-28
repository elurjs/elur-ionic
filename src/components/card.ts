/**
 * Direct subpath import for ion-card — maximum tree-shaking.
 *
 * ```ts
 * import { defineIonCard } from "@elurjs/ionic/components/card";
 * import { registerIonicComponents } from "@elurjs/ionic";
 *
 * registerIonicComponents(defineIonCard);
 * ```
 */
export { defineCustomElement as defineIonCard } from "@ionic/core/components/ion-card.js";
