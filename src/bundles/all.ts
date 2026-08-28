/**
 * All components bundle — convenience re-export of every bundle.
 *
 * @deprecated Prefer individual imports, direct subpaths, or the Vite plugin
 * auto-registration. This bundle forces ALL components into the importing
 * chunk and defeats tree-shaking. Kept for migration convenience only.
 *
 * ```ts
 * import { setupElurIonic } from "@elurjs/ionic";
 * import { allComponents } from "@elurjs/ionic/bundles/all";
 *
 * setupElurIonic({ components: allComponents }); // ⚠ not recommended
 * ```
 */
import type { ComponentDefiner } from "../setup";

import { layoutComponents } from "./layout";
import { navigationComponents } from "./navigation";
import { formComponents } from "./forms";
import { listComponents } from "./lists";
import { feedbackComponents } from "./feedback";
import { buttonComponents } from "./buttons";
import { overlayComponents } from "./overlays";

export const allComponents: ComponentDefiner[] = [
  ...layoutComponents,
  ...navigationComponents,
  ...formComponents,
  ...listComponents,
  ...feedbackComponents,
  ...buttonComponents,
  ...overlayComponents,
];
