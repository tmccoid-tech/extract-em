export class i18nText {
    static #keys = [
        "attachments",
        "bytesLabel",
        "detachComplete",
        "detached",
        "detachErrorMessage",
        "embeds",
        "error",
        "extensionName",
        "extracted",
        "extractedItems",
        "extractionReport",
        "gbLabel",
        "imapDetachUnavailable",
        "kbLabel",
        "mbLabel",
        "missingAttachment",
        "noAttachmentsMessage",
        "noMessagesMessage",
        "report",
        "resetMessageTagsConfirmationText",
        "saveCanceled",
        "saveComplete",
        "saveFailed"
    ];

    static {
        for(const key of this.#keys) {
            this[key] = messenger.i18n.getMessage(key);
        }
    }
}