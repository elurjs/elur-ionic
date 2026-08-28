/**
 * Direct subpath import for ion-segment — maximum tree-shaking.
 *
 * ```ts
 * import { defineIonSegment } from "@elurjs/ionic/components/segment";
 * import { registerIonicComponents } from "@elurjs/ionic";
 *
 * registerIonicComponents(defineIonSegment);
 * ```
 */
export { defineCustomElement as defineIonSegment } from "@ionic/core/components/ion-segment.js";
