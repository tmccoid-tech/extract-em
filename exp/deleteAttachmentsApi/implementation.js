var { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm");

var deleteAttachmentsApi = class extends ExtensionCommon.ExtensionAPI {
    getAPI(context) {
        return {
            deleteAttachmentsApi: {
                prepare() {
                    let window = Services.wm.getMostRecentWindow("mail:3pane");

                    //  TB 115+ || TB 102
                    return MailServices.messageServiceFromURI || window.messenger.messageServiceFromURI;
                }
            }
        }
    }
};