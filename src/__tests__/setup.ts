import { cleanup } from "@elurjs/core-testing";
import { afterEach } from "vitest";

afterEach(() => {
    cleanup();
    document.body.innerHTML = "";
    history.replaceState(null, "", "/");
});
