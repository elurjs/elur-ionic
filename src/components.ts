/**
 * Individual Ionic component re-exports for tree-shakeable imports.
 *
 * Import only what you need:
 * ```ts
 * import { defineIonButton, defineIonCard } from "@elurjs/ionic/components";
 * ```
 *
 * For maximum tree-shaking, prefer direct subpaths:
 * ```ts
 * import { defineIonButton } from "@elurjs/ionic/components/button";
 * ```
 *
 * NOTE: This barrel re-exports all components. While ESM can tree-shake
 * unused exports, the guarantee depends on bundler side-effects analysis.
 * For size-critical apps, use direct subpaths or the Vite plugin auto-import.
 */

// Re-export manifest helpers
export {
    COMPONENT_MANIFEST,
    getComponentByTag,
    getComponentsByCategory,
    getAllSupportedTags,
    isSupportedTag,
    getDependencyChain,
    tagToSubpath,
    tagToDefinerName,
    type ComponentManifestEntry,
    type ComponentCategory,
} from "./components/manifest.js";

// Layout & Core
export { defineCustomElement as defineIonHeader } from "@ionic/core/components/ion-header.js";
export { defineCustomElement as defineIonToolbar } from "@ionic/core/components/ion-toolbar.js";
export { defineCustomElement as defineIonTitle } from "@ionic/core/components/ion-title.js";
export { defineCustomElement as defineIonContent } from "@ionic/core/components/ion-content.js";
export { defineCustomElement as defineIonFooter } from "@ionic/core/components/ion-footer.js";
export { defineCustomElement as defineIonGrid } from "@ionic/core/components/ion-grid.js";
export { defineCustomElement as defineIonRow } from "@ionic/core/components/ion-row.js";
export { defineCustomElement as defineIonCol } from "@ionic/core/components/ion-col.js";
export { defineCustomElement as defineIonSplitPane } from "@ionic/core/components/ion-split-pane.js";
export { defineCustomElement as defineIonText } from "@ionic/core/components/ion-text.js";
export { defineCustomElement as defineIonImg } from "@ionic/core/components/ion-img.js";
export { defineCustomElement as defineIonBackdrop } from "@ionic/core/components/ion-backdrop.js";

// Navigation
export { defineCustomElement as defineIonButtons } from "@ionic/core/components/ion-buttons.js";
export { defineCustomElement as defineIonMenu } from "@ionic/core/components/ion-menu.js";
export { defineCustomElement as defineIonMenuButton } from "@ionic/core/components/ion-menu-button.js";
export { defineCustomElement as defineIonMenuToggle } from "@ionic/core/components/ion-menu-toggle.js";
export { defineCustomElement as defineIonTabs } from "@ionic/core/components/ion-tabs.js";
export { defineCustomElement as defineIonTab } from "@ionic/core/components/ion-tab.js";
export { defineCustomElement as defineIonTabBar } from "@ionic/core/components/ion-tab-bar.js";
export { defineCustomElement as defineIonTabButton } from "@ionic/core/components/ion-tab-button.js";
export { defineCustomElement as defineIonNav } from "@ionic/core/components/ion-nav.js";
export { defineCustomElement as defineIonNavLink } from "@ionic/core/components/ion-nav-link.js";
export { defineCustomElement as defineIonRouterLink } from "@ionic/core/components/ion-router-link.js";

// Forms & Inputs
export { defineCustomElement as defineIonInput } from "@ionic/core/components/ion-input.js";
export { defineCustomElement as defineIonInputOtp } from "@ionic/core/components/ion-input-otp.js";
export { defineCustomElement as defineIonInputPasswordToggle } from "@ionic/core/components/ion-input-password-toggle.js";
export { defineCustomElement as defineIonTextarea } from "@ionic/core/components/ion-textarea.js";
export { defineCustomElement as defineIonCheckbox } from "@ionic/core/components/ion-checkbox.js";
export { defineCustomElement as defineIonToggle } from "@ionic/core/components/ion-toggle.js";
export { defineCustomElement as defineIonSelect } from "@ionic/core/components/ion-select.js";
export { defineCustomElement as defineIonSelectOption } from "@ionic/core/components/ion-select-option.js";
export { defineCustomElement as defineIonSelectModal } from "@ionic/core/components/ion-select-modal.js";
export { defineCustomElement as defineIonSelectPopover } from "@ionic/core/components/ion-select-popover.js";
export { defineCustomElement as defineIonRadio } from "@ionic/core/components/ion-radio.js";
export { defineCustomElement as defineIonRadioGroup } from "@ionic/core/components/ion-radio-group.js";
export { defineCustomElement as defineIonRange } from "@ionic/core/components/ion-range.js";
export { defineCustomElement as defineIonSearchbar } from "@ionic/core/components/ion-searchbar.js";
export { defineCustomElement as defineIonDatetime } from "@ionic/core/components/ion-datetime.js";
export { defineCustomElement as defineIonDatetimeButton } from "@ionic/core/components/ion-datetime-button.js";
export { defineCustomElement as defineIonSegment } from "@ionic/core/components/ion-segment.js";
export { defineCustomElement as defineIonSegmentButton } from "@ionic/core/components/ion-segment-button.js";
export { defineCustomElement as defineIonSegmentView } from "@ionic/core/components/ion-segment-view.js";
export { defineCustomElement as defineIonSegmentContent } from "@ionic/core/components/ion-segment-content.js";

// List & Items
export { defineCustomElement as defineIonList } from "@ionic/core/components/ion-list.js";
export { defineCustomElement as defineIonListHeader } from "@ionic/core/components/ion-list-header.js";
export { defineCustomElement as defineIonItem } from "@ionic/core/components/ion-item.js";
export { defineCustomElement as defineIonItemDivider } from "@ionic/core/components/ion-item-divider.js";
export { defineCustomElement as defineIonItemGroup } from "@ionic/core/components/ion-item-group.js";
export { defineCustomElement as defineIonItemSliding } from "@ionic/core/components/ion-item-sliding.js";
export { defineCustomElement as defineIonItemOptions } from "@ionic/core/components/ion-item-options.js";
export { defineCustomElement as defineIonItemOption } from "@ionic/core/components/ion-item-option.js";
export { defineCustomElement as defineIonLabel } from "@ionic/core/components/ion-label.js";
export { defineCustomElement as defineIonNote } from "@ionic/core/components/ion-note.js";
export { defineCustomElement as defineIonReorder } from "@ionic/core/components/ion-reorder.js";
export { defineCustomElement as defineIonReorderGroup } from "@ionic/core/components/ion-reorder-group.js";

// Cards & Data
export { defineCustomElement as defineIonCard } from "@ionic/core/components/ion-card.js";
export { defineCustomElement as defineIonCardHeader } from "@ionic/core/components/ion-card-header.js";
export { defineCustomElement as defineIonCardTitle } from "@ionic/core/components/ion-card-title.js";
export { defineCustomElement as defineIonCardSubtitle } from "@ionic/core/components/ion-card-subtitle.js";
export { defineCustomElement as defineIonCardContent } from "@ionic/core/components/ion-card-content.js";
export { defineCustomElement as defineIonChip } from "@ionic/core/components/ion-chip.js";
export { defineCustomElement as defineIonBadge } from "@ionic/core/components/ion-badge.js";
export { defineCustomElement as defineIonAvatar } from "@ionic/core/components/ion-avatar.js";
export { defineCustomElement as defineIonThumbnail } from "@ionic/core/components/ion-thumbnail.js";
export { defineCustomElement as defineIonAccordion } from "@ionic/core/components/ion-accordion.js";
export { defineCustomElement as defineIonAccordionGroup } from "@ionic/core/components/ion-accordion-group.js";
export { defineCustomElement as defineIonBreadcrumb } from "@ionic/core/components/ion-breadcrumb.js";
export { defineCustomElement as defineIonBreadcrumbs } from "@ionic/core/components/ion-breadcrumbs.js";
export { defineCustomElement as defineIonInfiniteScroll } from "@ionic/core/components/ion-infinite-scroll.js";
export { defineCustomElement as defineIonInfiniteScrollContent } from "@ionic/core/components/ion-infinite-scroll-content.js";
export { defineCustomElement as defineIonRefresher } from "@ionic/core/components/ion-refresher.js";
export { defineCustomElement as defineIonRefresherContent } from "@ionic/core/components/ion-refresher-content.js";

// Feedback & Progress
export { defineCustomElement as defineIonSpinner } from "@ionic/core/components/ion-spinner.js";
export { defineCustomElement as defineIonProgressBar } from "@ionic/core/components/ion-progress-bar.js";
export { defineCustomElement as defineIonSkeletonText } from "@ionic/core/components/ion-skeleton-text.js";

// Buttons & Actions
export { defineCustomElement as defineIonButton } from "@ionic/core/components/ion-button.js";
export { defineCustomElement as defineIonFab } from "@ionic/core/components/ion-fab.js";
export { defineCustomElement as defineIonFabButton } from "@ionic/core/components/ion-fab-button.js";
export { defineCustomElement as defineIonFabList } from "@ionic/core/components/ion-fab-list.js";
export { defineCustomElement as defineIonRippleEffect } from "@ionic/core/components/ion-ripple-effect.js";

// Overlays
export { defineCustomElement as defineIonModal } from "@ionic/core/components/ion-modal.js";
export { defineCustomElement as defineIonPopover } from "@ionic/core/components/ion-popover.js";
export { defineCustomElement as defineIonToast } from "@ionic/core/components/ion-toast.js";
export { defineCustomElement as defineIonAlert } from "@ionic/core/components/ion-alert.js";
export { defineCustomElement as defineIonActionSheet } from "@ionic/core/components/ion-action-sheet.js";
export { defineCustomElement as defineIonLoading } from "@ionic/core/components/ion-loading.js";
export { defineCustomElement as defineIonPicker } from "@ionic/core/components/ion-picker.js";
export { defineCustomElement as defineIonPickerColumn } from "@ionic/core/components/ion-picker-column.js";
export { defineCustomElement as defineIonPickerColumnOption } from "@ionic/core/components/ion-picker-column-option.js";

// Legacy routing (not registered by default — import manually if needed)
export { defineCustomElement as defineIonRouter } from "@ionic/core/components/ion-router.js";
export { defineCustomElement as defineIonRoute } from "@ionic/core/components/ion-route.js";
export { defineCustomElement as defineIonRouteRedirect } from "@ionic/core/components/ion-route-redirect.js";
