import { OptionsManager } from "/module/optionsmanager.js";
import { AttachmentManager } from "/module/attachmentmanager.js";

const _filterSelect = function* (test, select) {
    for(const item of this) {
        if(test(item)) {
            if(select) {
                yield select(item);
            }
            else {
                yield item;
            }
        }
    }
};

const _toSet = function(select) {
    return new Set((select) ? select(this) : this);
};

Map.prototype.filterSelect = _filterSelect;
Map.prototype.toSet = _toSet;

NodeList.prototype.filterSelect = _filterSelect;
NodeList.prototype.toSet = _toSet;


document.addEventListener("DOMContentLoaded", async () => {
    class Capabilities {
        constructor() {
            const versionNumbers = browser.runtime.getManifest().version.split(".").map((n) => parseInt(n));
            
            this.permitDetachment = (versionNumbers[0] >= 1 && versionNumbers[1] >= 2 && !!messenger.messages.deleteAttachments);    //  >= 1.2
        }
    }
    


    i18n.updateDocument();
    const errorText = messenger.i18n.getMessage("error");

    const folderStatsTemplate = document.getElementById("folder-stats-template");
    const attachmentGroupingHeaderTemplate = document.getElementById("attachment-grouping-header-template");
    const attachmentPanelTemplate = document.getElementById("attachment-panel-template");

    const logoImage  = document.getElementById("logo-img");

    const quickMenuOptionLabel = document.getElementById("quickmenu-option-label");
    const alwaysShowQuickMenuCheckbox = document.getElementById("always-show-quickmenu-checkbox");
    const quickmenuIncludeEmbedsCheckbox = document.getElementById("quickmenu-include-embeds-checkbox");

    const statsTable = document.getElementById("stats-table");
    const statsSummaryTBody = document.getElementById("stats-summary-tbody");
    const statsSummaryRow = document.getElementById("stats-summary-tr");

    const selectedFolderCountSpan = document.getElementById("selected-folder-count-span");
    const folderCountSpan = document.getElementById("folder-count-span");
    const processedFolderCountSpan = document.getElementById("processed-folder-count-span");
    const summarySelectedMessageCountSpan = document.getElementById("summary-selected-message-count-span");
    const summaryMessageCountSpan = document.getElementById("summary-message-count-span");
    const summaryProcessedMessageCountSpan = document.getElementById("summary-processed-message-count-td");
    const summaryAttachmentMessageCountSpan = document.getElementById("summary-attachment-message-count-td");
    
   // Displayed in Attachment Summary
    const summarySelectedAttachmentCountSpan = document.getElementById("summary-selected-attachment-count-span");
    const summarySelectedAttachmentSizeSpan = document.getElementById("summary-selected-attachment-size-span");
    const summarySelectedEmbedCountSpan = document.getElementById("summary-selected-embed-count-span");
       
    const summaryAttachmentCountSpan = document.getElementById("summary-attachment-count-span");
    const summaryAttachmentSizeSpan = document.getElementById("summary-attachment-size-span");
    const summaryEmbedCountSpan = document.getElementById("summary-embed-count-span");

    const includeEmbedsCheckbox = document.getElementById("include-embeds-checkbox");

    // Displayed in Attachment List
    const selectedAttachmentCountSpan = document.getElementById("selected-attachment-count-span");
    const selectedAttachmentSizeSpan = document.getElementById("selected-attachment-size-span");

    const flexContainer = document.getElementById("flex-container");
    const quickMenuSection = document.getElementById("quickmenu-section");
    const mainSection = document.getElementById("main-section");

    const quickmenuExtractRecursiveDiv = document.getElementById("quickmenu-extract-recursive-div");

    const attachmentSummaryDiv = document.querySelector(".tab-content-div[context='summary']");
    const attachmentListDiv = document.getElementById("attachment-list-div");


    const zoomOverlay = document.getElementById("zoom-overlay");
    const zoomImage = document.getElementById("zoom-image");

    const attachmentListNavButton = document.querySelector(".nav-button[context='list']");

    const discoverAttachmentsButton = document.getElementById("discover-attachments-button");
    const discoverAttachmentsProgress = document.getElementById("discover-attachments-progress");
    const extractAllButton = document.getElementById("extract-all-button");
    const resetSummaryButton = document.getElementById("reset-summary-button");
    const extractSelectedButton = document.getElementById("extract-selected-button");

    const zipOverlay = document.getElementById("zip-overlay");
    const zipAccountNameLabel = document.getElementById("zip-account-name-label");
    const zipAttachmentContextSpan = document.getElementById("zip-attachment-context-span");
    const zipFolderNameSpan = document.getElementById("zip-folder-name-span");
    const zipSubfoldersSpan = document.getElementById("zip-subfolders-span");
    const zipLogoImage = document.getElementById("zip-logo-img");

    const discoveryProgressMessage = document.getElementById("discovery-progress-message");
    const discoverySizeLabel = document.getElementById("discovery-size-label");
    const embedDiscoveryProgressMessage = document.getElementById("embed-discovery-progress-message");
    const immediateDiscoveryProgress = document.getElementById("immediate-discovery-progress");

    const preparationAlterationsSpan = document.getElementById("preparation-alterations-span");
    const packagingSkippedSpan = document.getElementById("packaging-skipped-span");
    const duplicatesSizeLabel = document.getElementById("duplicates-size-label");

    const packagingCurrentSpan = document.getElementById("packaging-current-span");
    const packagingTotalSpan = document.getElementById("packaging-total-span");
    const embedPackagingCurrentSpan = document.getElementById("embed-packaging-current-span");
    const embedPackagingTotalSpan = document.getElementById("embed-packaging-total-span");
    const packagingSizeSpan = document.getElementById("packaging-size-span");
    const embedPackagingSizeSpan = document.getElementById("embed-packaging-size-span");
    const packagingFileCurrentSpan = document.getElementById("packaging-file-current-span");
    const packagingFileTotalSpan = document.getElementById("packaging-file-total-span");
    const packagingErrorCountSpan = document.getElementById("packaging-error-count-span");
    const packagingProgress = document.getElementById("packaging-progress");

    const lastFileNameDiv = document.getElementById("last-filename-div");

    const saveResultDiv = document.getElementById("save-result-div");
    const saveResultBorderDiv = document.getElementById("save-result-border-div");
    const saveResultLabel = document.getElementById("save-result-label");
    const permanentlyDetachButton = document.getElementById("permanently-detach-button");
    const closeZipPanelButton = document.getElementById("close-zip-panel-button");
    const exitExtensionButton = document.getElementById("exit-extension-button");

    const detachOperationRow = document.getElementById("detach-operation-row");

    const zipDetachPanelBody = document.getElementById("zip-detach-panel-body");
    const proceedDetachButton = document.getElementById("proceed-detach-button");
    const cancelDetachButton = document.getElementById("cancel-detach-button");
    const permanentDetachCurrentSpan = document.getElementById("permanent-detach-current-span");
    const permanentDetachTotalSpan = document.getElementById("permanent-detach-total-span");
    const permanentDetachNestedCountSpan = document.getElementById("permanent-detach-nested-count-span");
    const detachmentProgress = document.getElementById("detachment-progress");
    const detachResultDiv = document.getElementById("detach-result-div");
    const detachResultBorderDiv = document.getElementById("detach-result-border-div");
    const detachResultLabel = document.getElementById("detach-result-label");
    const detachErrorCountSpan = document.getElementById("detach-error-count-span");
    const detachExitExtensionButton = document.getElementById("detach-exit-extension-button");


    const folderRowSet = new Map();

    const imagePreviewSizeMap = new Map([
        ["sm", 200],
        ["md", 300],
        ["lg", 400]
    ]);

    const kb = 1000;
    const mb = kb * kb;
    const gb = mb * kb;

    const storageUnitMap = new Map([
        ["by", messenger.i18n.getMessage("bytesLabel")],
        ["kb", messenger.i18n.getMessage("kbLabel")],
        ["mb", messenger.i18n.getMessage("mbLabel")],
        ["gb", messenger.i18n.getMessage("gbLabel")]
    ]);

    var extensionOptions;
    var attachmentManager;
    var useImmediateMode = false;
    var discoveryComplete = false;
    var selectionInvoked = false;
    var folderSummary;
    var selectedFolders;
    var hasAttachments = false;

    var capabilities = new Capabilities();
    
    const updateProcessingFolder = async (folderPath) => {
        if(!useImmediateMode) {
            const row = folderRowSet.get(folderPath).row;

            row.querySelector(".processed-message-count-td").classList.remove("queued");

            row.classList.add("processing");
        }
    };

    const updateMessageStats = async (folderStats) => {
        if(useImmediateMode) {
            updateDiscoveryProgressMessage(folderStats.summaryAttachmentCount, folderStats.summaryAttachmentMessageCount, folderStats.summaryProcessedMessageCount, folderStats.summaryAttachmentSize, folderStats.summaryEmbedCount);

            immediateDiscoveryProgress.value = folderStats.summaryProcessedMessageCount;
        }
        else {
            const row = folderRowSet.get(folderStats.folderPath).row;

            row.querySelector(".processed-message-count-td").innerText = folderStats.processedMessageCount.toString();

            summaryProcessedMessageCountSpan.innerText = folderStats.summaryProcessedMessageCount.toString();
            discoverAttachmentsProgress.value = folderStats.summaryProcessedMessageCount;
        }
    };

    const updateAttachmentStats = async (folderStats) => {
        if(useImmediateMode) {
            updateDiscoveryProgressMessage(folderStats.summaryAttachmentCount, folderStats.summaryAttachmentMessageCount, folderStats.summaryProcessedMessageCount, folderStats.summaryAttachmentSize, folderStats.summaryEmbedCount);
            lastFileNameDiv.innerText = folderStats.lastFileName;

            hasAttachments = folderStats.summaryAttachmentCount > 0;
        }
        else {
            if(!discoverAttachmentsProgress.hasAttribute("value")) {
                discoverAttachmentsProgress.vallue = 0;
            }

            const rowItem = folderRowSet.get(folderStats.folderPath);
            rowItem.attachmentMessageCount = folderStats.attachmentMessageCount;
            rowItem.attachmentCount = folderStats.attachmentCount;
            rowItem.attachmentSize = folderStats.attachmentSize;
            rowItem.embedCount = folderStats.embedCount;

            const row = rowItem.row;

            row.querySelector(".attachment-message-count-td").innerText = folderStats.attachmentMessageCount.toString();
            row.querySelector(".attachment-count-td").innerText = folderStats.attachmentCount.toString();
            row.querySelector(".attachment-size-td").innerText = abbreviateFileSize(folderStats.attachmentSize);
            row.querySelector(".embed-count-td").innerText = folderStats.embedCount.toString();

            summaryAttachmentMessageCountSpan.innerText = folderStats.summaryAttachmentMessageCount.toString();

            summaryAttachmentCountSpan.innerText = folderStats.summaryAttachmentCount.toString();
            summaryAttachmentSizeSpan.innerText = abbreviateFileSize(folderStats.summaryAttachmentSize);
            summaryEmbedCountSpan.innerText = folderStats.summaryEmbedCount.toString();
        }
    };

    const updateProcessedFolder = async (info) => {
        if(!useImmediateMode) {
            const {
                folderPath,
                processedFolderCount
            } = info;

            const rowItem = folderRowSet.get(folderPath);

            const row = rowItem.row;

            row.querySelector(".processed-message-count-td").classList.add("complete");
            
            row.classList.add("processed");

            const folderHasAttachments = (rowItem.attachmentCount > 0);

            if (!folderHasAttachments) {
                row.classList.add("ghost");
            }

            const checkbox = rowItem.checkbox;
            checkbox.checked = (checkbox.checked && folderHasAttachments);

            rowItem.processed = true;

            processedFolderCountSpan.innerText = processedFolderCount.toString();
        }
    };

    const updateProcessingComplete = async () => {
        if(useImmediateMode) {
            if(hasAttachments) {
                extractImmediate();
            }
            else {
                const alterationCount = attachmentManager.getAlterationCount();

                preparationAlterationsSpan.innerText = alterationCount.toString();

                const info = {
                    status: "error",
                    message: messenger.i18n.getMessage("noAttachmentsMessage")
                }

                updateSaveResult(info);
            }
        }
        else {
            folderRowSet.forEach((v, k, m) => {
                if (v.attachmentCount > 0) {
                    v.checkbox.disabled = false;
                    v.button.disabled = false;
                }
                else if (v.hasChildren) {
                    v.button.disabled = false;
                }
            });

            discoveryComplete = true;

            const countInfo = updateSelectionCounts();

            if(countInfo.selectedAttachmentCount > 0) {
                selectedAttachmentCountSpan.innerText = (countInfo.selectedAttachmentCount + countInfo.selectedEmbedCount).toString();
                selectedAttachmentSizeSpan.innerText = abbreviateFileSize(countInfo.selectedAttachmentSize);
                attachmentListNavButton.disabled = false;
                attachmentListNavButton.classList.remove("transparent");
            }

            if(includeEmbedsCheckbox.checked) {
                includeEmbedsCheckbox.disabled = false;
            }

            resetSummaryButton.disabled = false;

            logoImage.classList.remove("rotating");
        }
    };

    const updatePackagingProgress = async (info) =>
    {
        switch(info.status) {
            case "started":
                preparationAlterationsSpan.innerText = info.alterationCount.toString();
                break;

            case "preparing":
                packagingSkippedSpan.innerText = info.duplicateCount.toString();
                duplicatesSizeLabel.innerText = abbreviateFileSize(info.duplicateTotalBytes);
                packagingProgress.setAttribute("max", info.totalItems + info.totalEmbedItems);

                break;

            case "prepackaging":
                packagingTotalSpan.innerText = info.totalItems.toString();
                embedPackagingTotalSpan.innerText = info.totalEmbedItems.toString();
                packagingProgress.setAttribute("max", info.totalItems + info.totalEmbedItems);
                packagingProgress.value = 0;
    
                break;

            default: // "packaging"
                packagingFileTotalSpan.innerText = info.fileCount.toString();

                packagingCurrentSpan.innerText = info.includedCount.toString();
                embedPackagingCurrentSpan.innerText = info.includedEmbedCount.toString();
                
                packagingFileCurrentSpan.innerText = info.filesCreated.toString();
                packagingErrorCountSpan.innerText = info.errorCount.toString();        
                
                lastFileNameDiv.innerText = info.lastFileName;
        
                packagingProgress.value = info.includedCount + info.includedEmbedCount + info.duplicateEmbedCount + info.errorCount;
                packagingSizeSpan.innerText = abbreviateFileSize(info.totalBytes);
                embedPackagingSizeSpan.innerText = abbreviateFileSize(info.totalEmbedBytes);
        
                packagingSkippedSpan.innerText = info.duplicateCount.toString();
                duplicatesSizeLabel.innerText = abbreviateFileSize(info.duplicateTotalBytes);

                break;
        }
    };

    const updateSaveResult = async (info) =>
    {
        if(info.status == "started") {
        }
        else {
            const success = (info.status == "success");

            zipLogoImage.classList.remove("rotating");

            saveResultLabel.innerHTML = info.message;

            document.querySelectorAll(".close-button.disablable").forEach((button) => { button.disabled = false; });            

            if(capabilities.permitDetachment && success && info.attachmentCount > 0) {
                permanentDetachTotalSpan.innerText = info.attachmentCount.toString();
                detachmentProgress.setAttribute("max", info.attachmentCount);
            }
            else {
                permanentlyDetachButton.classList.add("hidden");
            }

            saveResultDiv.classList.add("materialize");

            const saveResult = (success) ? "success" : "error";

            saveResultBorderDiv.classList.add(saveResult);
        }
    };

    const updateDetachProgress = async (info) => {
        if(info.status == "started") {
            detachmentProgress.setAttribute("max", info.totalItems);
        }
        else {
            permanentDetachCurrentSpan.innerText = info.processedCount.toString();
            permanentDetachNestedCountSpan.innerText = info.nestedCount;
            detachmentProgress.value = info.processedCount + info.nestedCount + info.errorCount;
            lastFileNameDiv.innerText = info.lastFileName;
        }
    };

    const updateDetachResult = async (info) => {
        const success = (info.errorCount == 0);

        detachResultDiv.classList.add("materialize");

        if(success) {
            detachResultLabel.innerHTML = messenger.i18n.getMessage("detachComplete");
        }
        else {
            detachResultLabel.innerHTML = messenger.i18n.getMessage("detachErrorMessage");
            detachErrorCountSpan.innerText = info.errorCount.toString();
        }

        const detachResult = (success) ? "success" : "error";

        detachResultBorderDiv.classList.add(detachResult);
    };

    function updateDiscoveryProgressMessage(attachmentCount = 0, attachmentMessageCount = 0 , messageCount = 0, cumulativeAttachmentSize = 0, embedCount = 0) {
        discoveryProgressMessage.innerHTML = messenger.i18n.getMessage("discoveryProgressMessage", [attachmentCount.toString(), attachmentMessageCount.toString(), messageCount.toString()]);
        discoverySizeLabel.innerHTML = abbreviateFileSize(cumulativeAttachmentSize);
        embedDiscoveryProgressMessage.innerHTML = messenger.i18n.getMessage("embedDiscoveryProgressMessage", [embedCount.toString(), attachmentMessageCount.toString(), messageCount.toString()]);
    }

    
    // MAIN ENTRY POINT

    async function main() {
        closeZipPanelButton.addEventListener("click", closeZipPanel);
        exitExtensionButton.addEventListener("click", (event) => { window.close(); });
        
        permanentlyDetachButton.addEventListener("click", displayPermanentDetachPanel);
        proceedDetachButton.addEventListener("click", proceedDetach);
        cancelDetachButton.addEventListener("click", cancelDetach);
        detachExitExtensionButton.addEventListener("click", (event) => { window.close(); });

        includeEmbedsCheckbox.addEventListener("change", includeEmbedsCheckboxChanged);
        quickmenuIncludeEmbedsCheckbox.addEventListener("change", quickMenuIncludeEmbedsCheckboxChanged);

        updateDiscoveryProgressMessage();

        const params = await messenger.runtime.sendMessage({ action: "getParams" });

        if(params?.accountId) {
            const account = await messenger.accounts.get(params.accountId, false);
            document.title = `${messenger.i18n.getMessage("extensionName")} (${account.name})`;
            zipAccountNameLabel.innerHTML = account.name;
        }

        selectedFolders = params?.selectedFolders;

        if (selectedFolders && selectedFolders.length > 0) {
            if(selectedFolders.length == 1) {
                document.title += `: ${selectedFolders[0].path}`;
            }

            extensionOptions = await OptionsManager.retrieve();

            let displayQuickMenu = extensionOptions.displayQuickMenu && selectedFolders.length == 1;
            const extractImmediate = params.allowExtractImmediate;

            const selectionContext = params.selectionContext;

            if(selectionContext != "account" && !extensionOptions.isInitialized) {
                quickMenuOptionLabel.classList.remove("invisible");
                alwaysShowQuickMenuCheckbox.checked = extensionOptions.displayQuickMenu;

                alwaysShowQuickMenuCheckbox.addEventListener("change", alwaysShowQuickMenuOptionChanged);

                OptionsManager.setOption("isInitialized", true);

                displayQuickMenu = true;
            }

            if(capabilities.permitDetachment) {
                detachOperationRow.classList.remove("hidden");
            }

            if(extensionOptions.includeEmbeds) {
                quickmenuIncludeEmbedsCheckbox.checked = true;
                includeEmbedsCheckbox.checked = true;
                statsTable.classList.remove("omit-embeds");
            }

            attachmentManager = new AttachmentManager({
                folders: selectedFolders,
                silentModeInvoked: false,

                reportFolderProcessing : updateProcessingFolder,
                reportMessageStats: updateMessageStats,
                reportAttachmentStats: updateAttachmentStats,
                reportFolderProcessed: updateProcessedFolder,
                reportProcessingComplete: updateProcessingComplete,

                reportPackagingProgress: updatePackagingProgress,
                reportSaveResult: updateSaveResult,

                reportDetachProgress: updateDetachProgress,
                reportDetachResult: updateDetachResult
            });


            if(displayQuickMenu) {
                invokeQuickMenu();
            }
            else if(extractImmediate) {
                const includeSubfolders = extensionOptions.includeSubfolders && selectedFolders[0].subFolders.length > 0;
                invokeExtractImmediate({ includeSubfolders: includeSubfolders, hideCloseButton: true });
            }
            else {
                invokeStandardMode();
            }
        }
    }


    async function invokeStandardMode() {
        useImmediateMode = false;

        logoImage.classList.add("initializing");

        document.querySelectorAll(".nav-button").forEach((button) => {
            button.addEventListener("click", onNavButtonClicked);
        });

        discoverAttachmentsButton.addEventListener("click", (event) => { discoverAttachments(); });
        extractAllButton.addEventListener("click", (event) => { extractFolders(); });
        resetSummaryButton.addEventListener("click", resetSummary);
        extractSelectedButton.addEventListener("click", (event) => { extractSelected(); });
        zoomImage.addEventListener("click", hideZoom);

        closeZipPanelButton.addEventListener("click", (event) => { zipOverlay.classList.add("hidden"); });

        if(selectedFolders.length > 1 || selectedFolders[0].subFolders.length > 0) {
            statsSummaryRow.classList.remove("hidden");
        }

        mainSection.classList.remove("hidden");

        folderSummary = await attachmentManager.getFolderSummary();

        generateFolderSummary();

        attachmentSummaryDiv.classList.add("materialize");
    }

    function invokeQuickMenu() {
        document.querySelectorAll(".quickmenu-button").forEach((button, i) =>
        {
            button.addEventListener("click", onQuickMenuButtonClicked);
        });

        if(selectedFolders[0].subFolders.length > 0) {
            quickmenuExtractRecursiveDiv.classList.remove("hidden");
        }

        mainSection.classList.add("hidden");
        quickMenuSection.classList.remove("hidden");
    }

    async function invokeExtractImmediate(extractOptions) {
        useImmediateMode = true;

        const summary = await attachmentManager.getFolderSummary(extractOptions.includeSubfolders);

        if(summary.messageCount == 0) {
            immediateDiscoveryProgress.setAttribute("max", 1);
            immediateDiscoveryProgress.value = 1;
            
            const info = {
                status: "error",
                message: messenger.i18n.getMessage("noMessagesMessage")
            }

            packagingDiv.classList.add("hidden");

            updateSaveResult(info);
        }
        else {
            immediateDiscoveryProgress.setAttribute("max", summary.messageCount);

            const selectedFolderPaths = assembleFolderPaths(selectedFolders[0], extractOptions.includeSubfolders);
    
            attachmentManager.discoverAttachments(new Set(selectedFolderPaths), extensionOptions.includeEmbeds);

            zipLogoImage.classList.add("rotating");
        }

        zipFolderNameSpan.innerText = selectedFolders[0].path;

        if(extractOptions.includeSubfolders) {
            zipSubfoldersSpan.classList.remove("hidden");
        }

        if(extractOptions.hideCloseButton) {
            closeZipPanelButton.classList.add("hidden");
        }

        zipAttachmentContextSpan.classList.remove("hidden");

        flexContainer.classList.add("modal");
        zipOverlay.classList.remove("hidden");
    }

    function assembleFolderPaths(folder, includeSubfolders) {
        var result = [folder.path];

        if(includeSubfolders) {
            folder.subFolders.forEach((item, i) =>
            {
                result.push(...assembleFolderPaths(item, true));
            });
        }

        return result;
    }

    function onQuickMenuButtonClicked(event) {
        const action = event.srcElement.getAttribute("action");

        switch(action) {
            case "extract-single":
                invokeExtractImmediate({ includeSubfolders: false, hideCloseButton: false });
                break;
            
            case "extract-recursive":
                invokeExtractImmediate({ includeSubfolders: true, hideCloseButton: false });
                break;

            case "standard-selection":
                quickMenuSection.classList.add("hidden");
                invokeStandardMode();
                break;
        }
    }

    function generateFolderSummary() {
        folderCountSpan.innerText = folderSummary.folderCount.toString();
        summaryMessageCountSpan.innerText = folderSummary.messageCount.toString();

        generateStatsRows(folderSummary.folders);

        updateSelectionCounts();
    }

    function generateStatsRows(folders, parentPath, level = 0) {
        for (const folder of folders) {
            const templateNode = folderStatsTemplate.content.cloneNode(true);

            const row = templateNode.firstElementChild;

            const folderCheckbox = templateNode.querySelector(".folder-checkbox")
            folderCheckbox.value = folder.path;
            folderCheckbox.addEventListener("change", onFolderSelectorCheckboxChanged);

            let pathText = folder.path;
            let spacer = "";

            if (parentPath) {
                pathText = pathText.slice(parentPath.length);
                spacer = ("&nbsp;&nbsp;&nbsp;&nbsp;").repeat(level);
            }

            templateNode.querySelector(".spacer").innerHTML = spacer;

            const folderSelectorButton = templateNode.querySelector(".folder-selector-button");
            folderSelectorButton.innerHTML = pathText;
            folderSelectorButton.value = folder.path;
            folderSelectorButton.addEventListener("click", onFolderSelectorButtonClick);

            templateNode.querySelector(".message-count-td").innerText = folder.messageCount.toString();

            if (folder.messageCount == 0) {
                folderCheckbox.checked = false;
                folderCheckbox.disabled = true;
                if (folder.subFolders.length == 0) {
                    folderSelectorButton.disabled = true;
                }
            }

            templateNode.querySelector(".attachment-size-td").innerText = abbreviateFileSize();

            statsSummaryTBody.appendChild(row);

            folderRowSet.set(folder.path, {
                processed: false,
                messageCount: folder.messageCount,
                attachmentMessageCount: 0,
                attachmentCount: 0,
                attachmentSize: 0,
                embedCount: 0,
                row: row,
                checkbox: folderCheckbox,
                button: folderSelectorButton,
                hasChildren: folder.subFolders.length > 0,
                virtualChecked: true
            });

            generateStatsRows(folder.subFolders, folder.path, ++level);
            level--;
        }
    }

    function includeEmbedsCheckboxChanged(event) {
        const includeEmbeds = includeEmbedsCheckbox.checked;

        statsTable.classList.toggle("omit-embeds", !includeEmbeds);

        if(discoveryComplete) {
            updateSelectionCounts();
        }
        else {
            quickmenuIncludeEmbedsCheckbox.checked = includeEmbeds;

            OptionsManager.setOption("includeEmbeds", includeEmbeds);
            extensionOptions.includeEmbeds = includeEmbeds;
        }
    }

    function quickMenuIncludeEmbedsCheckboxChanged(event) {
        const includeEmbeds = quickmenuIncludeEmbedsCheckbox.checked;
        includeEmbedsCheckbox.checked = includeEmbeds;

        OptionsManager.setOption("includeEmbeds", includeEmbeds);
        extensionOptions.includeEmbeds = includeEmbeds;
    }


    function discoverAttachments() {
        logoImage.classList.remove("initializing");
        logoImage.classList.add("rotating");

        discoverAttachmentsButton.disabled = true;
        resetSummaryButton.disabled = true;

        includeEmbedsCheckbox.disabled = true;

        const selectionCounts = determineSelectionCounts();
        discoverAttachmentsProgress.setAttribute("max", selectionCounts.selectedMessageCount);
        discoverAttachmentsProgress.removeAttribute("value");

        const selectedFolderPaths = new Set();

        folderRowSet.forEach((v, k, m) => {
            const checkbox = v.checkbox;

            checkbox.disabled = true;
            v.button.disabled = true;

            if (checkbox.checked && v.messageCount > 0) {
                v.row.querySelector(".processed-message-count-td").classList.add("queued");
                selectedFolderPaths.add(k);
            }
            else {
                v.row.classList.add("ghost");
                v.processed = true;
            }

            v.virtualChecked = true;
        });

        attachmentManager.discoverAttachments(selectedFolderPaths, extensionOptions.includeEmbeds);
    }

    async function generateAttachmentPanels() {
        if(!selectionInvoked) {
            selectionInvoked = true;

            attachmentManager.attachmentList.sort((a1, a2) => a2.date - a1.date);

            if(extensionOptions.defaultGrouping == "None") {
                for (const attachment of attachmentManager.attachmentList) {
                    const message = attachmentManager.messageList.get(attachment.messageId);
                    await generateAttachmentPanel(attachment, message);
                }
            }
            else {
                const grouping = attachmentManager.getGrouping(extensionOptions.defaultGrouping);

                const sortedKeys = [...grouping.keys()].sort();

                for(const key of sortedKeys) {
                    const groupingHeader = attachmentGroupingHeaderTemplate.content.cloneNode(true);
                    
                    groupingHeader.querySelector(".grouping-key-span").innerText = key;

                    const attachmentGroupingCheckbox = groupingHeader.querySelector(".attachment-grouping-checkbox");
                    attachmentGroupingCheckbox.value = key;
                    attachmentGroupingCheckbox.addEventListener("change", onAttachmentGroupingCheckboxChanged);

                    attachmentListDiv.appendChild(groupingHeader);

                    const groupedAttachmentIndices = grouping.get(key);

                    let isFirstInGroup = true;

                    for(const index of groupedAttachmentIndices) {
                        const attachment = attachmentManager.attachmentList[index];
                        const message = attachmentManager.messageList.get(attachment.messageId);
                        const attachmentPanel = await generateAttachmentPanel(attachment, message);
                        if(isFirstInGroup) {
                            attachmentPanel.classList.add("first-in-group");
                            isFirstInGroup = false;
                        }
                    }
                }
            }

            document.querySelectorAll(".attachment-checkbox").forEach((checkbox) =>
            {
                checkbox.addEventListener("change", onAttachmentCheckboxChanged);
            });
        }
    }

    async function generateAttachmentPanel(attachment, message) {
        const attachmentPanel = attachmentPanelTemplate.content.cloneNode(true);

        const attachmentCheckbox = attachmentPanel.querySelector(".attachment-checkbox");

        attachmentCheckbox.setAttribute("message-id", attachment.messageId);
        attachmentCheckbox.setAttribute("part-name", attachment.partName);
        attachmentCheckbox.setAttribute("timestamp", attachment.date.toISOString());
        attachmentCheckbox.setAttribute("file-size", attachment.size);
        attachmentCheckbox.setAttribute("extension", attachment.extension);
        attachmentCheckbox.setAttribute("isEmbed", `${attachment.isEmbed}`);

        attachmentPanel.querySelector(".file-name-label").textContent = attachment.name;
        attachmentPanel.querySelector(".extension-label").textContent = attachment.extension;
        attachmentPanel.querySelector(".file-size-label").textContent = (attachment.size === null) ? "???" : abbreviateFileSize(attachment.size);
        attachmentPanel.querySelector(".author-label").textContent = message.author;
        attachmentPanel.querySelector(".message-date-label").textContent = attachment.date.toDateString();
        attachmentPanel.querySelector(".subject-label").textContent = message.subject;

        const defaultImagePreview = extensionOptions.defaultImagePreview;

        attachmentPanel.firstElementChild.classList.add(defaultImagePreview);

        const previewWrapper = attachmentPanel.querySelector(".preview-wrapper");

        if(defaultImagePreview != "none") {
            if (attachment.isPreviewable) {
                previewWrapper.classList.add(defaultImagePreview);

                const image = attachmentPanel.querySelector(".preview-image");
                image.classList.add(defaultImagePreview);
                image.setAttribute("alt", errorText);

                image.setAttribute("message-id", attachment.messageId);
                image.setAttribute("part-name", attachment.partName);

                image.addEventListener("error", () => {
                    image.classList.add("error");
                    image.classList.remove("hidden");
                });

                image.addEventListener("load", () => {
                    image.addEventListener("click", displayZoom);
                    image.classList.remove("hidden");
                });

                getImagePreviewData(image, attachment.messageId, attachment.partName);
            }
            else if(attachment.isEmbed) {
                previewWrapper.classList.add(defaultImagePreview);
                previewWrapper.innerHTML = "embed";                     // TODO: add to messages.json when verbiage decided
            }
            else {
                previewWrapper.classList.add("none");
            }
        }

        var result = attachmentPanel.firstElementChild;

        attachmentListDiv.appendChild(attachmentPanel);

        return result;
    }

    async function getImagePreviewData(image, messageId, partName) {
        const src = await attachmentManager.getAttachmentFileData(messageId, partName);
        scaleImage(image, src);
    }

    function scaleImage(image, src) {
        const maxDimension = imagePreviewSizeMap.get(extensionOptions.defaultImagePreview);

        const buffer = new Image();

        buffer.onload = (event) => {
            let width = buffer.width;
            let height = buffer.height;
    
            if(width > maxDimension || height > maxDimension) {
                const canvas = document.createElement("canvas");
    
                let scaleFactor = 1;
    
                if(width > height) {
                    scaleFactor = maxDimension / width;
                    height *= scaleFactor;
                    width = maxDimension;
                }
                else {
                    scaleFactor = maxDimension / height;
                    width *= scaleFactor;
                    height = maxDimension;
                }

                canvas.width = width;
                canvas.height = height;
    
                const context = canvas.getContext("2d");
                context.drawImage(buffer, 0, 0, width, height);
                
                const contentType = src.split(";")[0].split(":")[1];

                image.src = canvas.toDataURL(contentType);
            }
            else {
                image.src = src;
            }
        };

        buffer.src = src;
    }

    function onNavButtonClicked(event) {
        const button = event.srcElement;

        if (!button.classList.contains("active")) {
            var context = button.getAttribute("context");

            var selector = `[context='${context}']`;
            var antiSelector = `:not([context='${context}'])`;

            document.querySelector(`.nav-button${antiSelector}`).classList.remove("active");
            document.querySelector(`.tab-content-div${antiSelector}`).classList.add("hidden");

            if(context == "list" && !selectionInvoked) {
                generateAttachmentPanels();
            }

            document.querySelector(`.nav-button${selector}`).classList.add("active");
            document.querySelector(`.tab-content-div${selector}`).classList.remove("hidden");
        }
    }

    async function extract(list, getInfo, includeEmbeds) {
        if(!useImmediateMode) {
            zipLogoImage.classList.add("rotating");
        }

        flexContainer.classList.add("modal");
        zipOverlay.classList.remove("hidden");

        attachmentManager.extract(list, getInfo, {
            preserveFolderStructure: extensionOptions.preserveFolderStructure,
            includeEmbeds: includeEmbeds
        });
    }

    function extractBySet(list, includeEmbeds = extensionOptions.includeEmbeds) {
        extract(list,
            (attachment) => {
                return {
                    messageId: attachment.messageId,
                    partName: attachment.partName
                };
            },
            includeEmbeds
        );
    }

    function extractImmediate() {
        extractBySet(attachmentManager.attachmentList);
    }

    function extractFolders() {
        const selectedFolderSet = document.querySelectorAll(".folder-checkbox:checked")
            .toSet((items) => items.filterSelect((checkbox) => true, (checkbox) => checkbox.value));

        const filteredMessageSet  = attachmentManager.messageList
            .toSet((items) => items.filterSelect((entry) => selectedFolderSet.has(entry[1].folderPath), (entry) => entry[0]));

        const filteredAttachmentList = attachmentManager.attachmentList.filter(
            (attachment) => filteredMessageSet.has(attachment.messageId)
        );

        const selectionCounts = determineSelectionCounts();

        updateZipDiscoveryInfo(selectionCounts.selectedAttachmentCount, selectionCounts.selectedAttachmentSize, selectionCounts.selectedEmbedCount);

        extractBySet(filteredAttachmentList, includeEmbedsCheckbox.checked);
    }

    function extractSelected() {
        const selections = getSelectedAttachmentCheckboxes();

        updateZipDiscoveryInfo(selections.selectedAttachmentCount, selections.selectedAttachmentSize, selections.selectedEmbedCount);

        extract(selections.checkboxes,
            (checkbox) => {
                return {
                    messageId: parseInt(checkbox.getAttribute("message-id")),
                    partName: checkbox.getAttribute("part-name")
                };
            },
            true
        );
    }

    function updateZipDiscoveryInfo(selectedAttachmentCount, selectedAttachmentSize, selectedEmbedCount) {
        immediateDiscoveryProgress.value = 1;
        const attachmentCounts = attachmentManager.getAttachmentCounts();
        discoveryProgressMessage.innerHTML =  messenger.i18n.getMessage("discoverySelectionMessages", [selectedAttachmentCount.toString(), attachmentCounts.attachmentCount.toString()]);
        discoverySizeLabel.innerHTML = abbreviateFileSize(selectedAttachmentSize);
        embedDiscoveryProgressMessage.innerHTML =  messenger.i18n.getMessage("embedDiscoverySelectionMessages", [selectedEmbedCount.toString(), attachmentCounts.embedCount.toString()]);
    }

    function displayPermanentDetachPanel() {
        saveResultDiv.classList.add("hidden");
        zipDetachPanelBody.classList.remove("hidden");
    }

    function cancelDetach() {
        zipDetachPanelBody.classList.add("hidden");
        saveResultDiv.classList.remove("hidden");
    }

    function proceedDetach() {
        zipDetachPanelBody.classList.add("hidden");
        detachResultDiv.classList.remove("hidden");
        detachOperationRow.classList.add("materialize");

        attachmentManager.deleteAttachments();
    }

    function resetProgressElement(element) {
        element.value = 0;
        element.setAttribute("max", 1);
    }

    function resetSummary() {
        attachmentManager.reset();

        if(discoveryComplete) {
            discoveryComplete = false;
            selectionInvoked = false;
            attachmentListNavButton.classList.add("transparent");
            attachmentListNavButton.disabled = true;
            attachmentListDiv.innerHTML = "";
            selectedAttachmentCountSpan.innerText = "0";
            selectedAttachmentSizeSpan.innerText = abbreviateFileSize();
            includeEmbedsCheckbox.disabled = false;
        }

        resetProgressElement(discoverAttachmentsProgress);
        processedFolderCountSpan.innerText = "0";
        summaryProcessedMessageCountSpan.innerText = "0";
        summaryAttachmentMessageCountSpan.innerText = "0";
        summaryAttachmentCountSpan.innerText = "0";
        summaryAttachmentSizeSpan.innerText = abbreviateFileSize();
        summaryEmbedCountSpan.innerText = "0";

        statsSummaryTBody.innerHTML = "";

        folderRowSet.clear();

        generateFolderSummary();
    }

    function onFolderSelectorCheckboxChanged(event) {
        const folderPath = event.srcElement.value;

        const rowItem = folderRowSet.get(folderPath);
        rowItem.virtualChecked = rowItem.checkbox.checked;

        updateSelectionCounts();
    }

    function onFolderSelectorButtonClick(event) {
        const folderPath = event.srcElement.value;

        const rowItem = folderRowSet.get(folderPath);

        const virtualChecked = rowItem.virtualChecked;

        folderRowSet.forEach((v, k, m) => {
            if (k.startsWith(folderPath)) {
                v.virtualChecked = !virtualChecked;

                const actualChecked = v.virtualChecked && (
                    !v.processed && v.messageCount > 0 ||
                    v.processed && v.attachmentCount > 0
                );

                v.checkbox.checked = actualChecked;
            }
        });

        updateSelectionCounts();
    }

    function onAttachmentGroupingCheckboxChanged(event) {
        const groupingCheckbox = event.srcElement;
        const extension = groupingCheckbox.value;
        const isGroupChecked = groupingCheckbox.checked;

        document.querySelectorAll(`.attachment-checkbox[extension='${extension}']`).forEach((checkbox, i) => {
            checkbox.checked = isGroupChecked;
        });

        onAttachmentCheckboxChanged(event);
    }

    function onAttachmentCheckboxChanged(event) {
        const selections = getSelectedAttachmentCheckboxes(true);

        const selectedItemCount = selections.selectedAttachmentCount + selections.selectedEmbedCount;

        extractSelectedButton.disabled = (selectedItemCount == 0);
        selectedAttachmentCountSpan.innerText = selectedItemCount.toString();
        selectedAttachmentSizeSpan.innerText = abbreviateFileSize(selections.selectedAttachmentSize);
    }

    function updateSelectionCounts() {
        const result = determineSelectionCounts();

        selectedFolderCountSpan.innerText = result.selectedFolderCount.toString();
        summarySelectedMessageCountSpan.innerText = result.selectedMessageCount.toString();
        summarySelectedAttachmentCountSpan.innerText = result.selectedAttachmentCount.toString();
        summarySelectedAttachmentSizeSpan.innerText = abbreviateFileSize(result.selectedAttachmentSize);
        summarySelectedEmbedCountSpan.innerText = result.selectedEmbedCount.toString();
        
        discoverAttachmentsButton.disabled = (discoveryComplete || result.selectedMessageCount == 0);

        extractAllButton.disabled = (!discoveryComplete || result.selectedAttachmentCount == 0);

        return result;
    }

    function determineSelectionCounts() {
        const result = {
            selectedFolderCount: 0,
            selectedMessageCount: 0,
            selectedAttachmentCount: 0,
            selectedAttachmentSize: 0,
            selectedEmbedCount: 0
        };

        const includeEmbeds = includeEmbedsCheckbox.checked;

        folderRowSet.forEach((v, k, m) => {
            if(v.checkbox.checked) {
                result.selectedFolderCount++;
                result.selectedMessageCount += (discoveryComplete)
                    ? v.attachmentMessageCount
                    : v.messageCount;
                result.selectedAttachmentCount += v.attachmentCount;
                result.selectedAttachmentSize += v.attachmentSize;

                if(includeEmbeds)
                    result.selectedEmbedCount += v.embedCount;
            }
        });

        return result;
    };

    function getSelectedAttachmentCheckboxes(statsOnly = false) {
        const result = {
            selectedAttachmentCount: 0,
            selectedAttachmentSize: 0,
            selectedEmbedCount: 0
        };

        const selectedAttachmentCheckboxes = [...document.querySelectorAll(".attachment-checkbox[isEmbed='false']:checked")];

        result.selectedAttachmentCount = selectedAttachmentCheckboxes.length;

        result.selectedAttachmentSize = selectedAttachmentCheckboxes.reduce((t, c) =>
            t + parseInt(c.getAttribute("file-size"))
        , 0);

        const selectedEmbedCheckboxes = [...document.querySelectorAll(".attachment-checkbox[isEmbed='true']:checked")];

        result.selectedEmbedCount = selectedEmbedCheckboxes.length;

        if(!statsOnly) {
            result.checkboxes = [...selectedAttachmentCheckboxes, ...selectedEmbedCheckboxes];
        }

        return result;
    }

    async function displayZoom(event) {
        const image = event.srcElement;
        const messageId = parseInt(image.getAttribute("message-id"));
        const partName = event.srcElement.getAttribute("part-name");

        zoomImage.src = await attachmentManager.getAttachmentFileData(messageId, partName);

        flexContainer.classList.add("modal");
        zoomOverlay.classList.remove("hidden");
    }

    function hideZoom(event) {
        zoomOverlay.classList.add("hidden");
        flexContainer.classList.remove("modal");

        zoomImage.src = "";
    }

    function closeZipPanel() {
        if(useImmediateMode) {
            attachmentManager.reset();
        }

        zipOverlay.classList.add("hidden");
        flexContainer.classList.remove("modal");

        zipAttachmentContextSpan.classList.add("hidden");
        zipFolderNameSpan.innerText = "";
        zipSubfoldersSpan.classList.add("hidden");

        // Discovering
        resetProgressElement(immediateDiscoveryProgress);

        updateDiscoveryProgressMessage();
        preparationAlterationsSpan.innerText = "0";
        discoverySizeLabel.innerText = abbreviateFileSize();

        // Prepararing
        packagingSkippedSpan.innerText = "0";
        duplicatesSizeLabel.innerText = abbreviateFileSize();

        // Packaging
        resetProgressElement(packagingProgress);

        packagingCurrentSpan.innerText = "0";
        packagingTotalSpan.innerText = "0";
        embedPackagingCurrentSpan.innerText = "0";
        embedPackagingTotalSpan.innerText = "0";
        packagingFileCurrentSpan.innerText = "0";
        packagingFileTotalSpan.innerText = "0";
        packagingSizeSpan.innerText = abbreviateFileSize();
        embedPackagingSizeSpan.innerText = abbreviateFileSize();

        //Detaching

        detachOperationRow.classList.add("hidden");

        resetProgressElement(detachmentProgress);

        permanentDetachCurrentSpan.innerText = "0";
        permanentDetachTotalSpan.innerText = "0";
        permanentDetachNestedCountSpan.innerText = "0";
        
        lastFileNameDiv.innerText = "...";

        saveResultBorderDiv.classList.remove("success", "error");
        saveResultDiv.classList.remove("materialize", "hidden");
        saveResultLabel.innerText = "";
        packagingErrorCountSpan.innerText = "0";
        permanentlyDetachButton.classList.remove("hidden");

        zipDetachPanelBody.classList.add("hidden");

        detachResultBorderDiv.classList.remove("success", "error");
        detachResultDiv.classList.remove("materialize");
        detachResultDiv.classList.add("hidden");
        detachResultLabel.innerText = "";
        detachErrorCountSpan.innerText = "0";

        document.querySelectorAll(".close-button.disablable").forEach((button) => { button.disabled = true; });            
    }

    function alwaysShowQuickMenuOptionChanged(event) {
        const displayQuickMenu = alwaysShowQuickMenuCheckbox.checked;

        OptionsManager.setOption("displayQuickMenu", displayQuickMenu);
    }

    function abbreviateFileSize(size = 0) {
        let result = "";

        let divisor = 1;
        let unitKey = "by";
        let precision = 1;

        if (size < kb) {
            precision = 0;
        }
        else if (size < mb) {
            divisor = kb;
            unitKey = "kb";
        }
        else if (size < gb) {
            divisor = mb;
            unitKey = "mb";
        }
        else {
            divisor = gb;
            unitKey = "gb";
        }

        result = `${(size / divisor).toFixed(precision)} ${storageUnitMap.get(unitKey)}`;

        return result;
    }


    // Main execution entry point
    await main();
});