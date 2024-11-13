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