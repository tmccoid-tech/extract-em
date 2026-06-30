import { i18n } from "/module/i18n.mjs";

((document) => {
    setInterval(() => messenger.runtime.sendMessage({ action: "keepAlive" }), 20000);

    document.addEventListener("DOMContentLoaded", async () => {
        i18n.updateDocument();
        for(let item of document.querySelectorAll(".release-notes-panel:not(.template)")) {
            item.classList.remove("hidden");
        }
    });
})(document);