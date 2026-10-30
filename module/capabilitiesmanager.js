export class CapabilitiesManager {
    static #isLoaded = false;
    
    static extensionVersion;
    static featureVersion;
    static permitDetachment;
    static useAdvancedGetRaw;
    static useMailFolderId;
    static permitReportTab;
    static useLegacyEmbedIdentification;
    static useSpecialImapDetachmentHandling;
    static useGetListedMessages;

    static async get(capability) {
        if(this.#isLoaded) {
            return capability(this);
        }
        else {
            await Promise
                .all([
                    browser.runtime.getBrowserInfo(),
                    browser.runtime.getManifest()
                ])
                .then(([
                    { version: appVersion },
                    { version: extensionVersion }
                ]) => {
                    const isSufficentVersion = this.#isSufficientVersion

                    const appVersionNumbers = appVersion.split(".").map((n) => parseInt(n));
            
                    this.extensionVersion = extensionVersion;
                    const extensionVersionNumbers = extensionVersion.split(".").map((n) => parseInt(n));
                    this.featureVersion = extensionVersionNumbers.slice(0,2).join(".");
            
                    this.permitDetachment = (this.#isSufficientVersion(extensionVersionNumbers, [1, 2]) && !!messenger.messages.deleteAttachments);       //  >= EE 1.2
                    this.useAdvancedGetRaw = this.#isSufficientVersion(appVersionNumbers, [115, 3, 2]);                                                   //  >= TB 115.3.2
                    this.useMailFolderId = this.#isSufficientVersion(appVersionNumbers, [121]);                                                           //  >= TB 121

                    this.permitReportTab = !this.#isSufficientVersion(appVersionNumbers, [134]);                                                          // < TB 134

                    this.useLegacyEmbedIdentification = !this.#isSufficientVersion(appVersionNumbers, [140]);                                             // < TB 140
                    
                    this.useSpecialImapDetachmentHandling = (accountType) => {
                        return this.permitDetachment && accountType == "imap" && !this.#isSufficientVersion(appVersionNumbers, [136]);                    //  Account type is "imap" and TB < 136
                    };

                    this.useGetListedMessages = this.#isSufficientVersion(appVersionNumbers, [121]);                                                      //  >= TB 121

                    this.#isLoaded = true;
                });

            return capability(this);
        }
    }

    static #isSufficientVersion(actualVersionNumbers, minimumVersionNumbers) {
        for(let i = 0; i < actualVersionNumbers.length; i++) {
            if(actualVersionNumbers[i] > minimumVersionNumbers[i]) {
                return true;
            }

            if(actualVersionNumbers[i] < minimumVersionNumbers[i]) {
                return false;
            }
        }

        return true;
    }
}

export const selectionContexts = {
    account: "account",
    folder: "folder",
    message: "message",
    messageDirect: "messageDirect",
    selected: "selected",
    listed: "listed",
    manualFilter: "manualFilter",
    messageReceiptFilter: "messageReceiptFilter"
};

export const menuIconPaths = {
    "64": "/icons/extractem-64px.png",
    "32": "/icons/extractem-32px.png",
    "16": "/icons/extractem-16px.png"
};

