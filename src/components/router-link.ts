/**
 * Direct subpath import for ion-router-link — maximum tree-shaking.
 *
 * ```ts
 * import { defineIonRouterLink } from "@elurjs/ionic/components/router-link";
 * import { registerIonicComponents } from "@elurjs/ionic";
 *
 * registerIonicComponents(defineIonRouterLink);
 * ```
 */
export { defineCustomElement as defineIonRouterLink } from "@ionic/core/components/ion-router-link.js";
