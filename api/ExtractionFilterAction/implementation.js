"use strict";

(function (exports) {

     class ExtractionFilterAction extends ExtensionCommon.ExtensionAPI {
        getAPI(content) {
            return {
                ExtractionFilterAction: {
                    test: function() {
                        console.log("Experiments API test!");
                    }
                }
            }
        }

        onShutdown(isAppShutdown) {
            if(isAppShutdown) {
                return;
            }
        }
    };

    exports.ExtractionFilterAction = ExtractionFilterAction;

}) (this);