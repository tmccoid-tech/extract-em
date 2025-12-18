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
                                isValidForType: function(t, s) {
                                    const { InboxRule, Manual } = Ci.nsMsgFilterType;

                                    return (t & InboxRule == InboxRule) || (t & Manual == Manual);
                                },
                                validateActionValue: function(v, f, t) { return null; },
                                allowDuplicates: false,
                                
                                applyAction: async function (aMsgHdrs, _aActionValue, _copyListener, aType, _aMsgWindow) {
                                    const result = await context.extension.messageManager.startMessageList(aMsgHdrs);
                                    
                                    eventEmitter.emit("filter-executed", aType, result);
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
                            const callback = (_, actionType, messageList) => {
                                const { InboxRule, Manual } = Ci.nsMsgFilterType;

                                let filterContext = "invalid";

                                if(actionType & Manual == Manual) {
                                    filterContext = "manualFilter";
                                }
                                else if(actionType & InboxRule == InboxRule) {
                                    filterContext = "messageReceiptFilter";
                                }

                                invoke.async(filterContext, messageList);
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