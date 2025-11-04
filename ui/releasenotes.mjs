import { i18n } from "/module/i18n.mjs";

((document) => {
    document.addEventListener("DOMContentLoaded", async () => {
        i18n.updateDocument();
        for(let item of document.querySelectorAll(".release-notes-panel:not(.template)")) {
            item.classList.remove("hidden");
        }
    });
})(document);