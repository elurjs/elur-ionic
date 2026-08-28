/**
 * Direct subpath import for ion-infinite-scroll — maximum tree-shaking.
 *
 * ```ts
 * import { defineIonInfiniteScroll } from "@elurjs/ionic/components/infinite-scroll";
 * import { registerIonicComponents } from "@elurjs/ionic";
 *
 * registerIonicComponents(defineIonInfiniteScroll);
 * ```
 */
export { defineCustomElement as defineIonInfiniteScroll } from "@ionic/core/components/ion-infinite-scroll.js";
