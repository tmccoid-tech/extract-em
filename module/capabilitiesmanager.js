export class CapabilitiesManager {
    static {
        browser.runtime.getBrowserInfo()
            .then((browserInfo) => {
                this.appVersion = browserInfo.version;
                const appVersionNumbers = this.appVersion.split(".").map((n) => parseInt(n));
        
                this.extensionVersion = browser.runtime.getManifest().version;
                const extensionVersionNumbers = this.extensionVersion.split(".").map((n) => parseInt(n));
                this.featureVersion = extensionVersionNumbers.slice(0,2).join(".");
        
                this.permitDetachment = (this.#isSufficientVersion(extensionVersionNumbers, [1, 2]) && !!messenger.messages.deleteAttachments);       //  >= EE 1.2
                this.useAdvancedGetRaw = this.#isSufficientVersion(appVersionNumbers, [115, 3, 2]);                                                   //  >= TB 115.3.2
                this.useMailFolderId = this.#isSufficientVersion(appVersionNumbers, [121]);                                                           //  >= TB 121

                this.permitReportTab = !this.#isSufficientVersion(appVersionNumbers, [134]);                                                          // < TB 134
                
                this.preventDetachment = (accountType) => {
                    return false;
//                    return this.permitDetachment && accountType == "imap" && !this.#isSufficientVersion(appVersionNumbers, [136]);                    //  Account type is "imap" and TB < 136
                };
            });
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
