/**
 * Direct subpath import for ion-note — maximum tree-shaking.
 *
 * ```ts
 * import { defineIonNote } from "@elurjs/ionic/components/note";
 * import { registerIonicComponents } from "@elurjs/ionic";
 *
 * registerIonicComponents(defineIonNote);
 * ```
 */
export { defineCustomElement as defineIonNote } from "@ionic/core/components/ion-note.js";
