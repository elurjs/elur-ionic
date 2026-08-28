/**
 * Direct subpath import for ion-nav-link — maximum tree-shaking.
 *
 * ```ts
 * import { defineIonNavLink } from "@elurjs/ionic/components/nav-link";
 * import { registerIonicComponents } from "@elurjs/ionic";
 *
 * registerIonicComponents(defineIonNavLink);
 * ```
 */
export { defineCustomElement as defineIonNavLink } from "@ionic/core/components/ion-nav-link.js";
