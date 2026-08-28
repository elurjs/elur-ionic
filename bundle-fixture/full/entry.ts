/**
 * Full fixture — imports all components + overlays + navigation.
 *
 * Expected: all Ionic component code is included. This is the worst-case
 * bundle size for consumers who import everything.
 */
import {
    initializeElurIonic,
    registerIonicComponents,
    createToast,
    createAlert,
    createModalController,
    createElurDelegate,
    IonRouterOutlet,
    IonPage,
} from "@elurjs/ionic";
import { allComponents } from "@elurjs/ionic/bundles/all";

initializeElurIonic();
registerIonicComponents(...allComponents);

export {
    createToast,
    createAlert,
    createModalController,
    createElurDelegate,
    IonRouterOutlet,
    IonPage,
    allComponents,
};
