import { i18n } from "/module/i18n.js";

document.addEventListener("DOMContentLoaded", async () => {
    i18n.updateDocument();

    const messageKey = new URL(document.location).searchParams.get("messageKey");

    document.querySelector("#dismiss-prompt-button").addEventListener("click", (event) => window.close());

    document.querySelector(`.prompt-message-item[message-key='${messageKey}']`).classList.remove("hidden");
});