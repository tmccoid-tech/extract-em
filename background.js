import { CapabilitiesManager, selectionContexts } from "/module/capabilitiesmanager.js";
import { OptionsManager } from "/module/optionsmanager.js";
import { AttachmentManager } from "/module/attachmentmanager.js";
import { FilterManager } from "/module/filtering/filtermanager.js";
import { i18nText } from "/module/i18nText.js";

    const documentTitle = i18nText.extensionName;

    const { create } = messenger.menus;

    const thisMessageMenuId = await create({ title: i18nText.thisMessage, contexts: ["message_list"] });

    const menuItems = new Map([
        [ await create({ title: documentTitle, contexts: ["folder_pane"] }), selectionContexts.folder ],
        [ thisMessageMenuId, selectionContexts.message ],
        [ await create({ title: i18nText.selectedMessages, contexts: ["message_list"] }), selectionContexts.selected ],
        [ await create({ title: i18nText.listedMessages, contexts: ["message_list"] }), selectionContexts.listed ]
    ]);

    let params = null;

    let popupId = null;

    document.addEventListener("DOMContentLoaded", () => { document.title = documentTitle; });

    async function extractSilently(params) {
        const { extensionOptions } = params;

        const attachmentManager = new AttachmentManager({
            folders: params.selectedFolders,
            silentModeInvoked: true,

            reportProcessingComplete: (info) =>
            {
                if(info.attachmentCount > 0) {
                    attachmentManager.extract(attachmentManager.attachmentList,
                        (attachment) => ({
                            messageId: attachment.messageId,
                            partName: attachment.partName,
                            timestamp: attachment.date
                        }),
                        {
                            preserveFolderStructure: params.preserveFolderStructure,
                            includeEmbeds: extensionOptions.includeEmbeds,
                            packageAttachments: extensionOptions.packageAttachments,
                            tagMessages: extensionOptions.enableMessageTagging                  // Tag if enabled as .tagMessages not assignable in this context
                        }
                    );
                }
                else {
                    browser.windows.create({
                        type: "popup",
                        url: "/ui/prompt.html?messageKey=noAttachments",
                        allowScriptsToClose: true,
                        height: 300,
                        width: 500
                    });

                    toggleMenuEnablement(true);
                }
            },
            
            reportSaveResult: updateSaveResult,

            alwaysPromptForDownloadLocation: extensionOptions.alwaysPromptForDownloadLocation,

            useAdvancedGetRaw: CapabilitiesManager.useAdvancedGetRaw,
            useEnhancedLogging: extensionOptions.useEnhancedLogging,

            useFilenamePattern: extensionOptions.useFilenamePattern,
            filenamePattern: extensionOptions.filenamePattern,
            maxFilenameSubjectLength: extensionOptions.maxFilenameSubjectLength,

            omitDuplicates: extensionOptions.omitDuplicates,

            tagMessagesEnabled: extensionOptions.enableMessageTagging,

            useMailFolderId: CapabilitiesManager.useMailFolderId
        });

        const selectedFolderPaths = (params.selectionContext == selectionContexts.folder && extensionOptions.includeSubfolders)
            ? assembleFolderPaths(params.selectedFolders[0])
            : [params.selectedFolders[0].path];

        const fileTypeFilter = (extensionOptions.useFileTypeFilter)
            ? FilterManager.assembleFileTypeFilter(extensionOptions)
            : null

        const discoveryOptions = {
            selectedFolderPaths: new Set(selectedFolderPaths),
            includeEmbeds: extensionOptions.includeEmbeds,
            fileTypeFilter: fileTypeFilter,
            selectionContext: params.selectionContext,
            tabId: params.tabId,
            selectedMessages: params.selectedMessages
        };
    
        attachmentManager.discoverAttachments(discoveryOptions);
    }

    function assembleFolderPaths(folder) {
        var result = [folder.path];

        folder.subFolders.forEach((item, i) => {
            result.push(...assembleFolderPaths(item));
        });

        return result;
    }

    function updateSaveResult(info)
    {
        if(info.status != "started") {
            params = null;

            toggleMenuEnablement(true);
        }
    }

    function toggleMenuEnablement(enable) {
        for(let menuId of menuItems.keys()) {
            messenger.menus.update(menuId, { enabled: enable });
        }
    }

    messenger.runtime.onMessage.addListener((request, sender, respond) => {
        if(request && request.action) {
            switch(request.action) {
                case "getParams":
                    respond(params);
                    break;

                case "close":
                    messenger.windows.remove(popupId);
                    break;
            }
        }
    });

    messenger.menus.onShown.addListener(async (info, tab) => {
        if(!popupId && info.contexts.includes("message_list")) {
            if(info.selectedMessages && info.selectedMessages.messages) {
                await messenger.menus.update(thisMessageMenuId, { enabled: info.selectedMessages.messages.length == 1 });
                messenger.menus.refresh();
            }
        }
    });


    messenger.menus.onClicked.addListener(async (info, tab) => {
        if(menuItems.has(info.menuItemId)) {
            if (!popupId) {

                let selectionContext = menuItems.get(info.menuItemId);

                let accountId = null;
                const selectedFolders = [];
                let tabId;
                let selectedMessages;

                if(selectionContext == selectionContexts.folder) {

                    // If an account node has been selected...
                    if (info.selectedAccount) {
                        accountId = info.selectedAccount.id;
                        selectedFolders.push(...info.selectedAccount.folders);
                        selectionContext = selectionContexts.account;
                    }
                    // If a folder node has been selected...
                    else if (info.selectedFolder) {
                        accountId = info.selectedFolder.accountId;
                        selectedFolders.push(info.selectedFolder);
                    }
                }
                else {
                    accountId = info.displayedFolder.accountId;
                    selectedFolders.push(info.displayedFolder);

                    switch(selectionContext) {
                        case selectionContexts.message:
                            selectedMessages = info.selectedMessages.messages;
                            break;
    
                        case selectionContexts.selected:
                            tabId = tab.id;
                            break;
    
                        case selectionContexts.listed:
                            if(CapabilitiesManager.useGetListedMessages) {
                                tabId = tab.id;
                            }
                            else {
                                selectionContext = selectionContexts.folder;
                            }

                            break;
                    }
                }


                if (selectedFolders.length > 0 || getMessages) {
                    const extensionOptions = await OptionsManager.retrieve();

                    await OptionsManager.tagging.initializeGlobalTag();

                    params = {
                        accountId: accountId,
                        selectionContext: selectionContext,
                        selectedFolders: selectedFolders,
                        tabId: tabId,
                        selectedMessages: selectedMessages,
                        preserveFolderStructure: extensionOptions.preserveFolderStructure,
                        allowExtractImmediate: selectionContext !== selectionContexts.account && (
                            selectionContext !== selectionContexts.folder ||
                            (extensionOptions.extractImmediate && selectedFolders.length == 1 && (selectedFolders[0].subFolders.length == 0 || extensionOptions.includeSubfolders))
                        )
                    };

                    toggleMenuEnablement(false);

                    if(extensionOptions.extractImmediate && extensionOptions.useSilentMode && params.allowExtractImmediate) {
                        params.extensionOptions = extensionOptions;

                        extractSilently(params);
                    }
                    else {
    
                        let popup = await browser.windows.create({
                            type: "popup",
                            url: "/ui/extractem.html",
                            allowScriptsToClose: true
                        });
    
                        popupId = popup.id;
                    }
                }
            }
        }
    });

    messenger.windows.onRemoved.addListener(async (windowId) => {
        if (windowId == popupId) {
            params = null;
            popupId = null;

            toggleMenuEnablement(true);
        }
    });
