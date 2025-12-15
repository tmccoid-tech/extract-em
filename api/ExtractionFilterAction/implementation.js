"use strict";

(function (exports) {

    const extractFilteredId = "tech.tmccoid.extractem#extractFiltered";

    const eventEmitter = new ExtensionCommon.EventEmitter();

    class ExtractionFilterAction extends ExtensionCommon.ExtensionAPI {
        getAPI(context) {

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
                                isValidForType: function(t, s) { return true; },
                                validateActionValue: function(v, f, t) { return null; },
                                allowDuplicates: false,
                                
                                applyAction: async function (aMsgHdrs, aActionValue, copyListener, _aType, _aMsgWindow) {
                                    const messageList = await context.extension.messageManager.startMessageList(aMsgHdrs);
                                    
                                    eventEmitter.emit("filter-executed", messageList);
                                },
                                
                                isAsync: true,
                                needsBody: false
                            });

                            console.log(`Custom filter action ${extractFilteredId} registration complete.`);
                        }

                        console.log("ExtractionFilterAction experminent API initialization complete.");
                    },

                    onFilterExecuted: new ExtensionCommon.EventManager({
                        context,
                        module: "ExtractionFilterAction",
                        event: "onFilterExecuted",
                        extensionApi: this,
                        
                        register: (invoke) => {
                            const callback = (_, messageList) => {
                                invoke.async(messageList);
                            };

                            eventEmitter.on("filter-executed", callback);

                            return () => {
                                eventEmitter.off("filter-executed", callback);
                            };
                        }
                            
                    }).api()
                }
            }
        }

        onShutdown(isAppShutdown) {
            if(isAppShutdown) {
                return;
            }

            Services.obs.notifyObservers(null, "startupcache-invalidate", null);

            console.log(`${extractFilteredId} cache cleared.`)
        }
    };

    exports.ExtractionFilterAction = ExtractionFilterAction;

}) (this);