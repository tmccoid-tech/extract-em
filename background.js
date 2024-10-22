import { CapabilitiesManager } from "/module/capabilitiesmanager.js";
import { OptionsManager } from "/module/optionsmanager.js";
import { AttachmentManager } from "/module/attachmentmanager.js";
import { FilterManager } from "/module/filtering/filtermanager.js";

    const documentTitle = messenger.i18n.getMessage("extensionName");

    let menuId = messenger.menus.create({
        title: documentTitle,
        contexts: [
            "folder_pane",
            "message_list"
        ]
    });

    let params = null;

    let popupId = null;

    document.addEventListener("DOMContentLoaded", () => { document.title = documentTitle; });

    async function extractSilently(params) {
        const { extensionOptions } = params;

        const attachmentManager = new AttachmentManager({
            folders: params.selectedFolders,
            silentModeInvoked: true,

            reportProcessingComplete: () =>
            {
                attachmentManager.extract(attachmentManager.attachmentList,
                    (attachment) => {
                      return {
                          messageId: attachment.messageId,
                          partName: attachment.partName,
                          timestamp: attachment.date
                      };
                    },
                    {
                        preserveFolderStructure: params.preserveFolderStructure
                    }
                  );
            },
            
            reportSaveResult: updateSaveResult,

            useAdvancedGetRaw: CapabilitiesManager.useAdvancedGetRaw,
            useEnhancedLogging: extensionOptions.useEnhancedLogging,

            useFilenamePattern: extensionOptions.useFilenamePattern,
            filenamePattern: extensionOptions.filenamePattern,

            omitDuplicates: extensionOptions.omitDuplicates,

            useMailFolderId: CapabilitiesManager.useMailFolderId

            // TODO: Add useAdvancedGetRaw from capabilities
            // TODO: Add useMailFolderId from capabilities
        });

        const selectedFolderPaths = assembleFolderPaths(params.selectedFolders[0]);

        const fileTypeFilter = (extensionOptions.useFileTypeFilter)
            ? FilterManager.assembleFileTypeFilter(extensionOptions)
            : null

        attachmentManager.discoverAttachments(new Set(selectedFolderPaths), extensionOptions.includeEmbeds, fileTypeFilter);
    }

    function assembleFolderPaths(folder) {
        var result = [folder.path];

        folder.subFolders.forEach((item, i) =>
        {
            result.push(...assembleFolderPaths(item));
        });

        return result;
    }

    function updateSaveResult (info)
    {
        if(info.status != "started") {
            console.log(info.message);
            messenger.menus.update(menuId, { enabled: true });
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

    messenger.menus.onClicked.addListener(async (info, tab) => {
        if (info.menuItemId == menuId) {
            if (!popupId) {
                let accountId = null;
                let selectedFolders = [];
                let selectionContext = null;    // Possibly unnecessary

                // If an account node has been selected...
                if (info.selectedAccount) {
                    accountId = info.selectedAccount.id;
                    selectedFolders.push(...info.selectedAccount.folders);
                    selectionContext = "account";
                }
                // If a folder node has been selected...
                else if (info.selectedFolder) {
                    accountId = info.selectedFolder.accountId;
                    selectedFolders.push(info.selectedFolder);
                    selectionContext = "folder";
                }
                // If a message has been selected...
                else if (info.displayedFolder) {
                    accountId = info.displayedFolder.accountId;
                    selectedFolders.push(info.displayedFolder);
                    selectionContext = "message";
                }

                if (selectedFolders.length > 0) {
                    const extensionOptions = await OptionsManager.retrieve();

                    params = {
                        accountId: accountId,
                        selectedFolders: selectedFolders,
                        selectionContext: selectionContext,
                        preserveFolderStructure: extensionOptions.preserveFolderStructure,
                        allowExtractImmediate: 
                            extensionOptions.extractImmediate &&
                            selectedFolders.length == 1 &&
                            (selectedFolders[0].subFolders.length == 0 || extensionOptions.includeSubfolders)
                    };

                    messenger.menus.update(menuId, { enabled: false });

                    if(extensionOptions.useSilentMode && params.allowExtractImmediate) {
                        params.extensionOptions = extensionOptions;
                        /*
                        params.includeEmbeds = extensionOptions.includeEmbeds;
                        params.useEnhancedLogging = extensionOptions.useEnhancedLogging;
                        params.useFilenamePattern = extensionOptions.useFilenamePattern;
                        params.filenamePattern = extensionOptions.filenamePattern;
                        */

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

            messenger.menus.update(menuId, { enabled: true });
        }
    });
