/**
 * Capacitor-only fixture — imports only the Capacitor subpath.
 *
 * Expected: zero @capacitor/* code in the bundle (all dynamic imports).
 * The web bundle should not contain any native plugin code.
 */
import { isNative, isWeb, StatusBar, Haptics } from "@elurjs/ionic/capacitor";

export { isNative, isWeb, StatusBar, Haptics };
