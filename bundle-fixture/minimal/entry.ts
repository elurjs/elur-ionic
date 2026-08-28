/**
 * Minimal fixture — imports only one component.
 *
 * Expected: only ion-button code is included in the bundle.
 * No other Ionic component code should be present.
 */
import { initializeElurIonic, registerIonicComponents } from "@elurjs/ionic";
import { defineIonButton } from "@elurjs/ionic/components/button";

initializeElurIonic();
registerIonicComponents(defineIonButton);

export { defineIonButton };
