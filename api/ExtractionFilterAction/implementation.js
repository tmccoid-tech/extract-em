"use strict";

(function (exports) {

     class ExtractionFilterAction extends ExtensionCommon.ExtensionAPI {
        static extractFilteredId = "tech.tmccoid.extractem#extractFiltered";

        getAPI(content) {
            const { extractFilteredId } = ExtractionFilterAction;

            return {
                ExtractionFilterAction: {
                    initialize: function(extensionName) {

                        const { MailServices } = ChromeUtils.importESModule(
                            "resource:///modules/MailServices.sys.mjs"
                        );

                        const isRegistered = (customActionId) => {
                            try {
                                MailServices.filters.getCustomAction(customActionId);
                            }
                            catch (e) {
                                return false;
                            }

                            console.log(`Custom filter action ${customActionId} previously registered.`);

                            return true;
                        }

                        if(!isRegistered(extractFilteredId)) {
                            MailServices.filters.addCustomAction({
                                id: extractFilteredId,
                                name: extensionName,
                                isValidForType: function(t, s) { return true },
                                validateActionValue: function(v, f, t) { return null; },
                                allowDuplicates: false,
                                applyAction: function (aMsgHdrs, aActionValue, copyListener, _aType, _aMsgWindow) {
                                    console.log("Filter action applied!");
                                },
                                isAsync: true,
                                needsBody: false
                            });

                            console.log(`Custom filter action ${extractFilteredId} registration complete.`);
                        }

                        console.log("ExtractionFilterAction experminent API initialization complete.");
                    }
                }
            }
        }

        onShutdown(isAppShutdown) {
            if(isAppShutdown) {
                return;
            }

            Services.obs.notifyObservers(null, "startupcache-invalidate", null);

            console.log(`${ExtractionFilterAction.extractFilteredId} cache cleared.`)
        }
    };

    exports.ExtractionFilterAction = ExtractionFilterAction;

}) (this);