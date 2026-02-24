"use strict";

// (function (exports) {

    const extractFilteredId = "tech.tmccoid.extractem#extractFiltered";

    const eventEmitter = new ExtensionCommon.EventEmitter();

    const { InboxRule, Manual, PostPlugin } = Ci.nsMsgFilterType;

    class ExtractionFilterAction extends ExtensionCommon.ExtensionAPIPersistent {

        PERSISTENT_EVENTS = {
            onFilterExecuted({ fire }) {
                function callback(_, actionType, messageList) {
                    let filterContext = "invalid";

                    if((actionType & Manual) == Manual) {
                        filterContext = "manualFilter";
                    }
                    else if(((actionType & InboxRule) == InboxRule) || ((actionType & PostPlugin) == PostPlugin)) {
                        filterContext = "messageReceiptFilter";
                    }

                    return fire.async(filterContext, messageList);
                }

                eventEmitter.on("filter-executed", callback);

                return {
                    unregister: () => {
                        eventEmitter.off("filter-executed", callback);
                    },
                    convert(_fire) {
                        fire = _fire;
                    }
                };
            }
        }

        getAPI(context) {
//            const eventEmitter = context.extension.emitter;

            const emit = (aType, result) => {
                eventEmitter.emit("filter-executed", aType, result);
            };

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
                                    return ((t & InboxRule) == InboxRule) || ((t & Manual) == Manual) || ((t & PostPlugin) == PostPlugin);
                                },
                                validateActionValue: function(v, f, t) { return null; },
                                allowDuplicates: false,
                                
                                applyAction: async function (aMsgHdrs, _aActionValue, _copyListener, aType, _aMsgWindow) {
                                    const result = await context.extension.messageManager.startMessageList(aMsgHdrs);
                                    
                                    emit(aType, result);
                                },
                                
                                isAsync: true,
                                needsBody: false
                            });

                            console.log(`Custom filter action ${extractFilteredId} registration complete.`);
                        }

                        console.log("ExtractionFilterAction experminent API initialization complete.");
                    },

                    testEmit: function() {
                        console.log("Test emit");

                        emit(48, null);
                    },

                    onFilterExecuted: new ExtensionCommon.EventManager({
                        context,
                        module: "ExtractionFilterAction",
                        event: "onFilterExecuted",
                        extensionApi: this
                    }).api()
                }
            }
        }

        onShutdown(isAppShutdown) {
            if(isAppShutdown) {
                return;
            }

//            Services.obs.notifyObservers(null, "startupcache-invalidate", null);

//            console.log(`${extractFilteredId} cache cleared.`)
        }
    };

    this.ExtractionFilterAction = ExtractionFilterAction;

// }) (this);