"use strict";

class ExtractionFilterAction extends ExtensionCommon.ExtensionAPIPersistent {

    PERSISTENT_EVENTS = {
        onFilterExecuted({ fire }) {
            const { InboxRule, Manual, PostPlugin } = Ci.nsMsgFilterType;

            const { emitter } = this.extension;

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

            emitter.on("filter-executed", callback);

            return {
                unregister: () => {
                    emitter.off("filter-executed", callback);
                },
                convert(_fire) {
                    fire = _fire;
                }
            };
        }
    }

    getAPI(context) {
        return {
            ExtractionFilterAction: {
                initialize: function (extensionName) {
                    const { MailServices } = ChromeUtils.importESModule(
                        "resource:///modules/MailServices.sys.mjs"
                    );
                    
                    const { InboxRule, Manual, PostPlugin } = Ci.nsMsgFilterType;

                    const { messageManager, emitter } = context.extension;

                    MailServices.filters.addCustomAction({
                        id: "tech.tmccoid.extractem#extractFiltered",
                        name: extensionName,
                        isValidForType: function(t, s) {
                            return ((t & InboxRule) == InboxRule) || ((t & Manual) == Manual) || ((t & PostPlugin) == PostPlugin);
                        },
                        validateActionValue: function(v, f, t) { return null; },
                        allowDuplicates: false,
                        
                        applyAction: async function (aMsgHdrs, _aActionValue, _copyListener, aType, _aMsgWindow) {
                            const result = await messageManager.startMessageList(aMsgHdrs);
                            
                            emitter.emit("filter-executed", aType, result);
                        },
                        
                        isAsync: true,
                        needsBody: false
                    });

                    console.log(`Custom filter action for ${extensionName} registration complete.`);
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
    }
};

this.ExtractionFilterAction = ExtractionFilterAction;