/**
 * Direct subpath import for ion-badge — maximum tree-shaking.
 *
 * ```ts
 * import { defineIonBadge } from "@elurjs/ionic/components/badge";
 * import { registerIonicComponents } from "@elurjs/ionic";
 *
 * registerIonicComponents(defineIonBadge);
 * ```
 */
export { defineCustomElement as defineIonBadge } from "@ionic/core/components/ion-badge.js";
