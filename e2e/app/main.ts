/**
 * E2E test app — uses real @ionic/core (no mocks).
 *
 * This app is served by Vite and exercises:
 *   - IonRouterOutlet with real ion-router-outlet.commit()
 *   - Page lifecycle events (ionViewWillEnter, etc.)
 *   - Navigation (forward, back, replace, root)
 *   - Cache behavior (cached vs non-cached pages)
 *   - Overlays (toast, alert, modal with delegate)
 *   - Tabs with per-tab stacks
 */
import "@ionic/core/css/core.css";
import "@ionic/core/css/normalize.css";
import "@ionic/core/css/structure.css";
import "@ionic/core/css/typography.css";
import "@ionic/core/css/padding.css";
import "@ionic/core/css/flex-utils.css";
import "@ionic/core/css/display.css";

import { ElurComponent, html, mount, signal, elurRouter, createRouter } from "@elurjs/core";
import {
    IonRouterOutlet,
    IonPage,
    IonBackButton,
    initializeElurIonic,
    registerIonicComponents,
    createToast,
    createAlert,
    createLoading,
    createActionSheet,
    createPicker,
    createModalController,
    createElurDelegate,
    type PageContext,
} from "../../src/index";

// Register ALL components for E2E (we want full Ionic Core)
import { allComponents } from "../../src/bundles/all";

initializeElurIonic();
registerIonicComponents(...allComponents);

// Create router with hash mode so it works under any base path
// The outlet will use this router (it won't auto-bootstrap since one exists)
createRouter([
    { path: "/" },
    { path: "/detail/:id" },
    { path: "/uncached" },
    { path: "*" },
], { mode: "hash" });

// --- Test pages ---

class HomePage extends IonPage {
    private visitCount = signal(0);

    constructor(ctx: PageContext) {
        super(ctx.lc);
    }

    override ionViewWillEnter() {
        this.visitCount.value++;
    }

    override render() {
        return html`
            <ion-header>
                <ion-toolbar color="primary">
                    <ion-title>Home</ion-title>
                </ion-toolbar>
            </ion-header>
            <ion-content class="ion-padding">
                <p data-testid="home-visits">Visits: ${() => this.visitCount.value}</p>
                <ion-button data-testid="go-detail" @click=${() => {
                const router = (window as any).__elurRouter;
                router.navigate("/detail/42");
            }}>Go to Detail</ion-button>
                <ion-button data-testid="go-toast" @click=${() => {
                (window as any).__showToast();
            }}>Show Toast</ion-button>
                <ion-button data-testid="go-modal" @click=${() => {
                (window as any).__showModal();
            }}>Show Modal</ion-button>
                <ion-button data-testid="go-alert" @click=${() => {
                (window as any).__showAlert();
            }}>Show Alert</ion-button>
                <ion-button data-testid="go-loading" @click=${() => {
                (window as any).__showLoading();
            }}>Show Loading</ion-button>
                <ion-button data-testid="go-action-sheet" @click=${() => {
                (window as any).__showActionSheet();
            }}>Show Action Sheet</ion-button>
                <ion-button data-testid="go-picker" @click=${() => {
                (window as any).__showPicker();
            }}>Show Picker</ion-button>
            </ion-content>
        `;
    }
}

class DetailPage extends IonPage {
    private id: string;
    private enterCount = signal(0);

    constructor(ctx: PageContext) {
        super(ctx.lc);
        this.id = ctx.params.id ?? "unknown";
    }

    override ionViewWillEnter() {
        this.enterCount.value++;
    }

    override render() {
        return html`
            <ion-header>
                <ion-toolbar color="primary">
                    <ion-buttons slot="start">
                        ${IonBackButton("/")}
                    </ion-buttons>
                    <ion-title>Detail ${() => this.id}</ion-title>
                </ion-toolbar>
            </ion-header>
            <ion-content class="ion-padding">
                <p data-testid="detail-id">ID: ${() => this.id}</p>
                <p data-testid="detail-enters">Enters: ${() => this.enterCount.value}</p>
                <ion-button data-testid="go-back" @click=${() => {
                const router = (window as any).__elurRouter;
                router.back();
            }}>Back</ion-button>
                <ion-button data-testid="go-deeper" @click=${() => {
                const router = (window as any).__elurRouter;
                router.navigate("/detail/99");
            }}>Go Deeper</ion-button>
            </ion-content>
        `;
    }
}

class UncachedPage extends IonPage {
    private mountCount = signal(0);

    constructor(ctx: PageContext) {
        super(ctx.lc);
    }

    override ionViewWillEnter() {
        this.mountCount.value++;
    }

    override render() {
        return html`
            <ion-header>
                <ion-toolbar>
                    <ion-buttons slot="start">
                        ${IonBackButton("/")}
                    </ion-buttons>
                    <ion-title>Uncached</ion-title>
                </ion-toolbar>
            </ion-header>
            <ion-content class="ion-padding">
                <p data-testid="uncached-mounts">Mounts: ${() => this.mountCount.value}</p>
            </ion-content>
        `;
    }
}

// --- Routes ---

const routes = [
    { path: "/", component: (ctx: PageContext) => new HomePage(ctx) },
    { path: "/detail/:id", component: (ctx: PageContext) => new DetailPage(ctx) },
    { path: "/uncached", cache: false as const, component: (ctx: PageContext) => new UncachedPage(ctx) },
];

const outlet = new IonRouterOutlet(routes);

// --- App ---

class App extends ElurComponent {
    override render() {
        return html`<ion-app>${outlet}</ion-app>`;
    }
}

// --- Expose helpers for E2E tests ---

const toast = createToast();
const modal = createModalController();
const alert = createAlert();
const loading = createLoading();
const actionSheet = createActionSheet();
const picker = createPicker();

(window as any).__elurRouter = (window as any).__elurRouter ?? undefined;
(window as any).__showToast = () => {
    return toast.present({ message: "Hello from E2E!", duration: 1500 });
};
(window as any).__showModal = () => {
    return modal.present({
        component: () => html`
            <ion-header>
                <ion-toolbar><ion-title>Modal</ion-title></ion-toolbar>
            </ion-header>
            <ion-content class="ion-padding">
                <p data-testid="modal-content">Modal content from Elur</p>
                <ion-button data-testid="modal-close" @click=${() => modal.dismiss()}>Close</ion-button>
            </ion-content>
        `,
    });
};
(window as any).__showAlert = () => {
    return alert.present({
        header: "E2E Alert",
        message: "This is an alert from elur-ionic",
        buttons: [
            { text: "Cancel", role: "cancel" },
            { text: "OK", role: "confirm" },
        ],
    });
};
(window as any).__dismissAlert = (role?: string) => alert.dismiss(undefined, role);
(window as any).__showLoading = () => {
    return loading.present({ message: "Loading...", duration: 1500 });
};
(window as any).__showActionSheet = () => {
    return actionSheet.present({
        header: "E2E Action Sheet",
        buttons: [
            { text: "Delete", role: "destructive" },
            { text: "Share", role: "share" },
            { text: "Cancel", role: "cancel" },
        ],
    });
};
(window as any).__dismissActionSheet = (role?: string) => actionSheet.dismiss(undefined, role);
(window as any).__showPicker = () => {
    return picker.present({
        columns: [
            {
                name: "color",
                options: [
                    { text: "Red", value: "red" },
                    { text: "Blue", value: "blue" },
                    { text: "Green", value: "green" },
                ],
            },
        ],
        buttons: [
            { text: "Cancel", role: "cancel" },
            { text: "Done", role: "confirm" },
        ],
    });
};
(window as any).__dismissPicker = (role?: string) => picker.dismiss(undefined, role);

// Mount after router is available
setTimeout(() => {
    // Ensure initial hash is "#/" so back() from a route to home fires
    // hashchange correctly (empty hash → empty hash doesn't fire).
    if (!window.location.hash) {
        window.location.hash = "#/";
    }
    (window as any).__elurRouter = elurRouter();
    mount(new App(), "#app");
}, 0);
