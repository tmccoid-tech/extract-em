import { CapabilitiesManager, selectionContexts } from "/module/capabilitiesmanager.js";
import { OptionsManager } from "/module/optionsmanager.js";
import { AttachmentManager } from "/module/attachmentmanager.js";
import { ReportManager } from "/module/reportmanager.js";
import { FilterManager } from "/module/filtering/filtermanager.js";
import { SaveManager } from "/module/savemanager.js";
import { i18nText } from "/module/i18nText.js";

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
    const errorText = i18nText.error;

    const elem = (id) => document.getElementById(id);

    const folderStatsTemplate = elem("folder-stats-template");
    const attachmentGroupingHeaderTemplate = elem("attachment-grouping-header-template");
    const attachmentPanelTemplate = elem("attachment-panel-template");

    const logoImage  = elem("logo-img");

    const quickmenuOptionLabel = elem("quickmenu-option-label");
    const alwaysShowQuickmenuCheckbox = elem("always-show-quickmenu-checkbox");
    const quickmenuIncludeEmbedsCheckbox = elem("quickmenu-include-embeds-checkbox");
    const quickmenuTagMessagesCheckbox = elem("quickmenu-tag-messages-checkbox");

    const statsTable = elem("stats-table");
    const statsSummaryTBody = elem("stats-summary-tbody");
    const statsSummaryRow = elem("stats-summary-tr");

    const selectedFolderCountSpan = elem("selected-folder-count-span");
    const folderCountSpan = elem("folder-count-span");
    const processedFolderCountSpan = elem("processed-folder-count-span");
    const summarySelectedMessageCountSpan = elem("summary-selected-message-count-span");
    const summaryMessageCountSpan = elem("summary-message-count-span");
    const summaryProcessedMessageCountSpan = elem("summary-processed-message-count-td");
    const summaryAttachmentMessageCountSpan = elem("summary-attachment-message-count-td");
    
   // Displayed in Attachment Summary
    const summarySelectedAttachmentCountSpan = elem("summary-selected-attachment-count-span");
    const summarySelectedAttachmentSizeSpan = elem("summary-selected-attachment-size-span");
    const summarySelectedEmbedCountSpan = elem("summary-selected-embed-count-span");
       
    const summaryAttachmentCountSpan = elem("summary-attachment-count-span");
    const summaryAttachmentSizeSpan = elem("summary-attachment-size-span");
    const summaryEmbedCountSpan = elem("summary-embed-count-span");

    const includeEmbedsCheckbox = elem("include-embeds-checkbox");
    const tagMessagesCheckbox = elem("tag-messages-checkbox");

    // Displayed in Attachment List
    const toggleSelectedAttachmentsCheckbox = elem("toggle-selected-attachments-checkbox");
    const selectedAttachmentCountSpan = elem("selected-attachment-count-span");
    const selectedAttachmentSizeSpan = elem("selected-attachment-size-span");

    const flexContainer = elem("flex-container");
    const quickmenuSection = elem("quickmenu-section");
    const mainSection = elem("main-section");

    const quickmenuExtractRecursiveDiv = elem("quickmenu-extract-recursive-div");

    const attachmentSummaryDiv = document.querySelector(".tab-content-div[context='summary']");
    const attachmentListDiv = elem("attachment-list-div");


    const zoomOverlay = elem("zoom-overlay");
    const zoomImage = elem("zoom-image");

    const attachmentListNavButton = document.querySelector(".nav-button[context='list']");

    const discoverAttachmentsButton = elem("discover-attachments-button");
    const discoverAttachmentsProgress = elem("discover-attachments-progress");
    const extractAllButton = elem("extract-all-button");
    const resetSummaryButton = elem("reset-summary-button");
    const extractSelectedButton = elem("extract-selected-button");

    const filterElements = {
        editorOverlay: elem("filter-overlay"),
        editorContainer: elem("filter-editor-container"),
        menuCheckbox: elem("quickmenu-use-file-type-filter-checkbox"),
        menuEditButton: elem("quickmenu-edit-file-type-filter-button"),
        menuFileTypeList: elem("quickmenu-file-type-filter-list-div"),
        secondaryCheckbox: elem("use-file-type-filter-checkbox"),
        secondaryEditButton: elem("use-file-type-filter-link-button"),
        secondaryFileTypeList: elem("use-file-type-filter-link-div")
    };

    const zipOverlay = elem("zip-overlay");
    const zipAccountNameLabel = elem("zip-account-name-label");
    const zipAttachmentContextSpan = elem("zip-attachment-context-span");
    const zipFolderNameSpan = elem("zip-folder-name-span");
    const zipSubfoldersSpan = elem("zip-subfolders-span");
    const zipLogoImage = elem("zip-logo-img");

    const zipTable = elem("zip-table");

    const immediateDiscoveryProgress = elem("immediate-discovery-progress");
    
    const immediateDiscoveryMessageDiv = elem("immediate-discovery-message-div");
    const immediateDiscoveryProgressMessageDiv = elem("immediate-discovery-progress-message-div");
    const immediateDiscoveredEmbedsSpan = elem("immediate-discovered-embeds-span");
    const fileTypeFilterAppliedSpan = elem("file-type-filter-applied-span");

    const prediscoveryMessageDiv = elem("prediscovery-message-div");
    const discoverySelectionMessageDiv = elem("discovery-selection-message-div");
    const embedDiscoverySelectionMessageDiv = elem("embed-discovery-selection-message-div");

    const discoverySizeLabel = elem("discovery-size-label");

    const preparationAlterationsSpan = elem("preparation-alterations-span");
    const packagingSkippedSpan = elem("packaging-skipped-span");
    const embedDuplicateSpan = elem("embed-duplicate-span");
    const duplicatesSizeLabel = elem("duplicates-size-label");

    const packagingProgressRow = elem("packaging-progress-row");
    const packagingCurrentSpan = elem("packaging-current-span");
    const packagingTotalSpan = elem("packaging-total-span");
    const embedPackagingCurrentSpan = elem("embed-packaging-current-span");
    const embedPackagingTotalSpan = elem("embed-packaging-total-span");
    const packagingSizeSpan = elem("packaging-size-span");
    const embedPackagingSizeSpan = elem("embed-packaging-size-span");
    const packagingFileCurrentSpan = elem("packaging-file-current-span");
    const packagingFileTotalSpan = elem("packaging-file-total-span");
    const packagingErrorCountSpan = elem("packaging-error-count-span");
    const packagingProgress = elem("packaging-progress");

    const savingProgessRow = elem("saving-progress-row");
    const savingCurrentSpan = elem("saving-current-span");
    const embedSavingCurrentSpan = elem("embed-saving-current-span");
    const savingSizeSpan = elem("saving-size-span");
    const embedSavingSizeSpan = elem("embed-saving-size-span");
    const savingProgress = elem("saving-progress");

    const lastFileNameDiv = elem("last-filename-div");

    const saveResultDiv = elem("save-result-div");
    const saveResultBorderDiv = elem("save-result-border-div");
    const saveResultLabel = elem("save-result-label");

    const showFilesButton = elem("show-files-button");
    const viewReportButton = elem("view-report-button");
    const permanentlyDetachButton = elem("permanently-detach-button");
    const closeZipPanelButton = elem("close-zip-panel-button");
    const exitExtensionButton = elem("exit-extension-button");

    const downloadFoldersOverlay = elem("download-folders-overlay");
    const closeDownloadFoldersButton = elem("close-download-folders-button");
    const downloadFoldersItemContainer = elem("download-folders-item-container");
    const downloadFolderItemTemplate = elem("download-folder-item-template");

    const detachOperationRow = elem("detach-operation-row");

    const detachTable = elem("detach-table");
    const detachActionButtonsDiv = elem("detach-action-buttons-div");
    const proceedDetachButton = elem("proceed-detach-button");
    const cancelDetachButton = elem("cancel-detach-button");
    const permanentDetachCurrentSpan = elem("permanent-detach-current-span");
    const permanentDetachTotalSpan = elem("permanent-detach-total-span");
    const detachmentProgress = elem("detachment-progress");
    const detachResultDiv = elem("detach-result-div");
    const detachResultBorderDiv = elem("detach-result-border-div");
    const detachResultLabel = elem("detach-result-label");
    const detachErrorCountSpan = elem("detach-error-count-span");
    const detachShowFilesButton = elem("detach-show-files-button");
    const detachViewReportButton = elem("detach-view-report-button");
    const detachExitExtensionButton = elem("detach-exit-extension-button");
    const imapDetachmentNoticePanel = elem("imap-detachment-notice");

    const reportStyleTemplate = elem("report-style-template");
    const reportTemplate = elem("report-template");
    const reportItemTemplate = elem("report-item-template");

    const releaseNotesOverlay = elem("release-notes-overlay");
    const closeReleaseNotesButton = elem("close-release-notes-button");

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
        ["by", i18nText.bytesLabel],
        ["kb", i18nText.kbLabel],
        ["mb", i18nText.mbLabel],
        ["gb", i18nText.gbLabel]
    ]);

    var extensionOptions;
    var attachmentManager;
    var useImmediateMode = false;
    var discoveryComplete = false;
    var selectionInvoked = false;
    var folderSummary;
    var selectedFolders;
    var hasAttachments = false;
    var useSpecialImapDetachmentHandling = false;
    let downloadLocations;
    let tagMessages = false;

//    var capabilities = new Capabilities();
    
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

            if(folderStats.lastFileName !== null) {
                lastFileNameDiv.innerText = folderStats.lastFileName;
            }

            hasAttachments = (folderStats.summaryAttachmentCount > 0 || folderStats.summaryEmbedCount > 0);
        }
        else {
            if(!discoverAttachmentsProgress.hasAttribute("value")) {
                discoverAttachmentsProgress.value = 0;
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

            const folderHasAttachments = (rowItem.attachmentCount > 0 || rowItem.embedCount > 0);

            if (!folderHasAttachments) {
                row.classList.add("ghost");
            }

            const checkbox = rowItem.checkbox;
            checkbox.checked = (checkbox.checked && folderHasAttachments);

            rowItem.processed = true;

            processedFolderCountSpan.innerText = processedFolderCount.toString();
        }
    };

    const updateProcessingComplete = async (info) => {
        if(useImmediateMode) {

            // This is a hack for TB 115, in which messages.list() does not return any items for virtual (Saved Search) folders
            if(immediateDiscoveryProgress.getAttribute("max") !== immediateDiscoveryProgress.value) {
                immediateDiscoveryProgress.value = immediateDiscoveryProgress.getAttribute("max");
            }
            
            if(hasAttachments) {
                extractImmediate();
            }
            else {
                const alterationCount = attachmentManager.getAlterationCount();

                preparationAlterationsSpan.innerText = alterationCount.toString();

                const info = {
                    status: "error",
                    message: i18nText.noAttachmentsMessage
                }

                updateSaveResult(info);
            }
        }
        else {
            folderRowSet.forEach((v, k, m) => {
                if (v.attachmentCount > 0 || v.embedCount > 0) {
                    v.checkbox.disabled = false;
                    v.button.disabled = false;
                }
                else if (v.hasChildren) {
                    v.button.disabled = false;
                }
            });

            discoveryComplete = true;

            const countInfo = updateSelectionCounts();

            if(countInfo.selectedAttachmentCount > 0 || countInfo.selectedEmbedCount > 0) {
                selectedAttachmentCountSpan.innerText = (countInfo.selectedAttachmentCount + countInfo.selectedEmbedCount).toString();
                selectedAttachmentSizeSpan.innerText = abbreviateFileSize(countInfo.selectedAttachmentSize);
                attachmentListNavButton.disabled = false;
                attachmentListNavButton.classList.remove("transparent");
            }

            // This is a hack for TB 115, in which messages.list() does not return any items for virtual (Saved Search) folders
            if(discoverAttachmentsProgress.getAttribute("max") !== discoverAttachmentsProgress.value) {
                discoverAttachmentsProgress.value = discoverAttachmentsProgress.getAttribute("max");
            }

            if(includeEmbedsCheckbox.checked) {
                includeEmbedsCheckbox.disabled = false;
            }

            filterElements.secondaryCheckbox.disabled = true;
            filterElements.secondaryEditButton.disabled = true;

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
                preparationAlterationsSpan.innerText = info.alterationCount.toString();
                packagingErrorCountSpan.innerText = info.errorCount.toString();        
                
                lastFileNameDiv.innerText = info.lastFileName;
        
                packagingProgress.value = info.includedCount + info.includedEmbedCount + info.duplicateEmbedCount + info.errorCount;
                packagingSizeSpan.innerText = abbreviateFileSize(info.totalBytes);
                embedPackagingSizeSpan.innerText = abbreviateFileSize(info.totalEmbedBytes);
        
                packagingSkippedSpan.innerText = info.duplicateCount.toString();
                embedDuplicateSpan.innerText = info.duplicateEmbedCount.toString();
                duplicatesSizeLabel.innerText = abbreviateFileSize(info.duplicateTotalBytes);

                break;
        }
    };

    const updateSavingProgress = async (info) => {
        switch(info.status) {
            case "started":
                preparationAlterationsSpan.innerText = info.alterationCount.toString();
                break;

            case "preparing":
                packagingSkippedSpan.innerText = info.duplicateCount.toString();
                duplicatesSizeLabel.innerText = abbreviateFileSize(info.duplicateTotalBytes);
                savingProgress.setAttribute("max", info.totalItems + info.totalEmbedItems);

                break;

            case "prepackaging":
                savingProgress.setAttribute("max", info.totalItems + info.totalEmbedItems);
                savingProgress.value = 0;
    
                break;

            default: // "packaging"

                savingCurrentSpan.innerText = info.includedCount.toString();
                embedSavingCurrentSpan.innerText = info.includedEmbedCount.toString();
                
                preparationAlterationsSpan.innerText = info.alterationCount.toString();
                packagingErrorCountSpan.innerText = info.errorCount.toString();        
                
                lastFileNameDiv.innerText = info.lastFileName;
        
                savingProgress.value = info.includedCount + info.includedEmbedCount + info.duplicateEmbedCount + info.errorCount;
                savingSizeSpan.innerText = abbreviateFileSize(info.totalBytes);
                embedSavingSizeSpan.innerText = abbreviateFileSize(info.totalEmbedBytes);
        
                packagingSkippedSpan.innerText = info.duplicateCount.toString();
                embedDuplicateSpan.innerText = info.duplicateEmbedCount.toString();
                duplicatesSizeLabel.innerText = abbreviateFileSize(info.duplicateTotalBytes);

                break;
        }
    };

    const updateSaveResult = async (info) =>
    {
        const success = (info.status == "success");

        zipLogoImage.classList.remove("rotating");

        saveResultLabel.innerHTML = info.message;
        lastFileNameDiv.innerText = "...";

        document.querySelectorAll(".close-button.disablable").forEach((button) => { button.disabled = false; });

        if(success || info.downloadLocations?.size) {
            downloadLocations = new Map(info.downloadLocations);

            if(downloadLocations.size == 1) {
                const [downloadId] = downloadLocations.values();

                showFilesButton.value = downloadId;
                detachShowFilesButton.value = downloadId;
            }
            else {
                showFilesButton.value = "*";
                detachShowFilesButton.value = "*";
            }

            downloadFoldersItemContainer.innerHTML = "";

            const extractedItemsText = i18nText.extractedItems;
    
            for(const [path, downloadId] of downloadLocations.entries()) {
                addDownloadFolderItem(path, downloadId, extractedItemsText);
            }

            showFilesButton.classList.remove("hidden");
            viewReportButton.classList.remove("hidden");
        }

        if(!(CapabilitiesManager.permitDetachment && success && info.attachmentCount > 0 && info.detachableCount > 0)) {
            permanentlyDetachButton.classList.add("hidden");
        }
        else if(useSpecialImapDetachmentHandling) {
            imapDetachmentNoticePanel.classList.remove("hidden");
        }

        saveResultDiv.classList.add("materialize");

        const saveResult = (success) ? "success" : "error";

        saveResultBorderDiv.classList.add(saveResult);
    };

    const updateDetachProgress = async (info) => {
        if(info.status == "started") {
            detachmentProgress.setAttribute("max", info.totalItems);
            permanentDetachTotalSpan.innerText = info.totalItems.toString();
            zipLogoImage.classList.add("rotating");
        }
        else {
            permanentDetachCurrentSpan.innerText = info.processedCount.toString();
            detachmentProgress.value = info.processedCount + info.errorCount;
            lastFileNameDiv.innerText = info.lastFileName;
        }
    };

    const updateDetachResult = async (info) => {
        zipLogoImage.classList.remove("rotating");
        lastFileNameDiv.innerText = "...";
        detachResultDiv.classList.add("materialize");

        let success = info.errorCount == 0 ;

        if(info.status == "failed") {
            success = false;
            info.errorCount = "1+";
        }

        if(success) {
            detachResultLabel.innerHTML = i18nText.detachComplete;
        }
        else {
            detachResultLabel.innerHTML =i18nText.detachErrorMessage;
            detachErrorCountSpan.innerText = info.errorCount.toString();
        }

        const detachResult = (success) ? "success" : "error";

        detachResultBorderDiv.classList.add(detachResult);
    };

    function updateDiscoveryProgressMessage(attachmentCount = 0, attachmentMessageCount = 0 , messageCount = 0, cumulativeAttachmentSize = 0, embedCount = 0) {
        immediateDiscoveryProgressMessageDiv.innerHTML = messenger.i18n.getMessage("discoveryProgressMessage", [attachmentCount.toString(), attachmentMessageCount.toString(), messageCount.toString()]);
        immediateDiscoveredEmbedsSpan.innerText = embedCount.toString();
        discoverySizeLabel.innerHTML = abbreviateFileSize(cumulativeAttachmentSize);
    }

    
    // MAIN ENTRY POINT

    async function main() {
        closeZipPanelButton.addEventListener("click", closeZipPanel);
        exitExtensionButton.addEventListener("click", (event) => { window.close(); });
        
        permanentlyDetachButton.addEventListener("click", displayPermanentDetachPanel);
        proceedDetachButton.addEventListener("click", proceedDetach);
        cancelDetachButton.addEventListener("click", cancelDetach);
        detachExitExtensionButton.addEventListener("click", (event) => { window.close(); });

        showFilesButton.addEventListener("click", showFiles);
        detachShowFilesButton.addEventListener("click", showFiles);
        closeDownloadFoldersButton.addEventListener("click", closeDownloadFoldersOverlay);

        viewReportButton.addEventListener("click", generateReport);
        detachViewReportButton.addEventListener("click", generateReport);

        includeEmbedsCheckbox.addEventListener("change", includeEmbedsCheckboxChanged);
        quickmenuIncludeEmbedsCheckbox.addEventListener("change", quickmenuIncludeEmbedsCheckboxChanged);

        toggleSelectedAttachmentsCheckbox.addEventListener("change", onToggleSelectedAttachmentsCheckboxChanged);

        updateDiscoveryProgressMessage();

        const params = await messenger.runtime.sendMessage({ action: "getParams" });

        if(params?.accountId) {
            const account = await messenger.accounts.get(params.accountId, false);
            document.title = `${i18nText.extensionName} (${account.name})`;
            zipAccountNameLabel.innerHTML = account.name;
            useSpecialImapDetachmentHandling = CapabilitiesManager.useSpecialImapDetachmentHandling(account.type);
        }

        selectedFolders = params?.selectedFolders;

        if (selectedFolders && selectedFolders.length > 0) {
            if(selectedFolders.length == 1) {
                document.title += `: ${selectedFolders[0].path}`;
            }

            extensionOptions = await OptionsManager.retrieve();

            await FilterManager.initializeEditor(filterElements, extensionOptions);

            i18n.updateDocument();

            const { selectionContext } = params;

            let displayQuickmenu = extensionOptions.displayQuickmenu && selectedFolders.length == 1 && !(selectionContext == selectionContexts.message || selectionContext == selectionContexts.selected || selectionContext == selectionContexts.listed);
            const extractImmediate = params.allowExtractImmediate;


            if(selectionContext == selectionContexts.folder && !extensionOptions.isInitialized) {
                quickmenuOptionLabel.classList.remove("invisible");
                alwaysShowQuickmenuCheckbox.checked = extensionOptions.displayQuickmenu;

                alwaysShowQuickmenuCheckbox.addEventListener("change", alwaysShowQuickmenuOptionChanged);

                OptionsManager.setOption("isInitialized", true);

                displayQuickmenu = true;
            }

            if(CapabilitiesManager.permitDetachment) {
                detachOperationRow.classList.remove("hidden");
            }

            if(extensionOptions.includeEmbeds) {
                quickmenuIncludeEmbedsCheckbox.checked = true;
                includeEmbedsCheckbox.checked = true;
                statsTable.classList.remove("omit-embeds");
            }

            if(extensionOptions.enableMessageTagging) {
                for(let container of document.querySelectorAll(".tag-messages-container")) {
                    container.classList.remove("hidden");
                }

                quickmenuTagMessagesCheckbox.addEventListener("change", onTagMessagesCheckboxChecked);
                tagMessagesCheckbox.addEventListener("change", onTagMessagesCheckboxChecked);

                if(extensionOptions.tagMessages) {
                    quickmenuTagMessagesCheckbox.checked = true;
                    tagMessagesCheckbox.checked = true;
                }
            }

            attachmentManager = new AttachmentManager({
                folders: selectedFolders,
                silentModeInvoked: false,

                reportFolderProcessing : updateProcessingFolder,
                reportMessageStats: updateMessageStats,
                reportAttachmentStats: updateAttachmentStats,
                reportFolderProcessed: updateProcessedFolder,
                reportProcessingComplete: updateProcessingComplete,

                reportStorageProgress: (extensionOptions.packageAttachments)
                    ? updatePackagingProgress
                    : updateSavingProgress,
                
                    reportSaveResult: updateSaveResult,

                reportDetachProgress: updateDetachProgress,
                reportDetachResult: updateDetachResult,

                alwaysPromptForDownloadLocation: extensionOptions.alwaysPromptForDownloadLocation,

                useAdvancedGetRaw: CapabilitiesManager.useAdvancedGetRaw,
                useEnhancedLogging: extensionOptions.useEnhancedLogging,

                useFilenamePattern: extensionOptions.useFilenamePattern,
                filenamePattern: extensionOptions.filenamePattern,
                maxFilenameSubjectLength: extensionOptions.maxFilenameSubjectLength,

                omitDuplicates: extensionOptions.omitDuplicates,
                tagMessagesEnabled: extensionOptions.enableMessageTagging,

                useMailFolderId: CapabilitiesManager.useMailFolderId,
                useSpecialImapDetachmentHandling: useSpecialImapDetachmentHandling
            });

            if(CapabilitiesManager.extensionVersion !== extensionOptions.lastLoadedVersion && !extractImmediate) {
                closeReleaseNotesButton.addEventListener("click", closeReleaseNotes);
                const releaseNotesPanel = document.querySelector(`.release-notes-panel[version^='${CapabilitiesManager.featureVersion}']`);

                if(releaseNotesPanel) {
                    releaseNotesPanel.classList.remove("hidden");
                    releaseNotesOverlay.classList.remove("hidden");
                }

                OptionsManager.setOption("lastLoadedVersion", CapabilitiesManager.extensionVersion);
            }

            if(displayQuickmenu) {
                invokeQuickmenu();
            }
            else if(extractImmediate) {
                const includeSubfolders = extensionOptions.includeSubfolders && selectedFolders[0].subFolders.length > 0;
                invokeExtractImmediate({
                    includeSubfolders: includeSubfolders,
                    hideCloseButton: true,
                    selectionContext: selectionContext,
                    tabId: params.tabId,
                    selectedMessages: params.selectedMessages
                });
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

    function invokeQuickmenu() {
        document.querySelectorAll(".quickmenu-button").forEach((button, i) =>
        {
            button.addEventListener("click", onQuickmenuButtonClicked);
        });

        if(selectedFolders[0].subFolders.length > 0) {
            quickmenuExtractRecursiveDiv.classList.remove("hidden");
        }

        mainSection.classList.add("hidden");
        quickmenuSection.classList.remove("hidden");
    }

    async function invokeExtractImmediate(extractOptions) {
        useImmediateMode = true;

        const summary = await attachmentManager.getFolderSummary(extractOptions.includeSubfolders);

        if(summary.messageCount == 0) {
            immediateDiscoveryProgress.setAttribute("max", 1);
            immediateDiscoveryProgress.value = 1;
            
            const info = {
                status: "error",
                message: i18nText.noMessagesMessage
            }

            updateSaveResult(info);
        }
        else {
            immediateDiscoveryProgress.setAttribute("max", summary.messageCount);

            const selectedFolderPaths = assembleFolderPaths(selectedFolders[0], extractOptions.includeSubfolders);

            let fileTypeFilter;

            if(extensionOptions.useFileTypeFilter) {
                fileTypeFilter = FilterManager.assembleFileTypeFilter();
            }
        
            packagingProgressRow.classList.toggle("hidden", !extensionOptions.packageAttachments);
            savingProgessRow.classList.toggle("hidden", extensionOptions.packageAttachments);

            const discoveryOptions = {
                selectedFolderPaths: new Set(selectedFolderPaths),
                includeEmbeds: extensionOptions.includeEmbeds,
                fileTypeFilter: fileTypeFilter,
                selectionContext: extractOptions.selectionContext,
                tabId: extractOptions.tabId,
                selectedMessages: extractOptions.selectedMessages,
            };
    
            attachmentManager.discoverAttachments(discoveryOptions);

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

        fileTypeFilterAppliedSpan.classList.toggle("hidden", !extensionOptions.useFileTypeFilter);

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

    function onQuickmenuButtonClicked(event) {
        const action = event.srcElement.getAttribute("action");

        switch(action) {
            case "extract-single":
                invokeExtractImmediate({ includeSubfolders: false, hideCloseButton: false });
                break;
            
            case "extract-recursive":
                invokeExtractImmediate({ includeSubfolders: true, hideCloseButton: false });
                break;

            case "standard-selection":
                quickmenuSection.classList.add("hidden");
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
                spacer = ("\u00A0").repeat(level * 4);
            }

            templateNode.querySelector(".spacer").textContent = spacer;

            if(folder.isVirtual) {
                const folderTd = templateNode.querySelector(".folder-td");
                folderTd.classList.add("virtual");
            }

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

    function quickmenuIncludeEmbedsCheckboxChanged(event) {
        const includeEmbeds = quickmenuIncludeEmbedsCheckbox.checked;
        includeEmbedsCheckbox.checked = includeEmbeds;

        OptionsManager.setOption("includeEmbeds", includeEmbeds);
        extensionOptions.includeEmbeds = includeEmbeds;
    }

    function onTagMessagesCheckboxChecked(event) {
        const { checked } = event.srcElement;

        quickmenuTagMessagesCheckbox.checked = checked;
        tagMessagesCheckbox.checked = checked;

        OptionsManager.setOption("tagMessages", checked);
        extensionOptions.tagMessages = checked;
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

        let fileTypeFilter;

        if(extensionOptions.useFileTypeFilter) {
            fileTypeFilter = FilterManager.assembleFileTypeFilter();
        }

        const discoveryOptions = {
            selectedFolderPaths: selectedFolderPaths,
            includeEmbeds: extensionOptions.includeEmbeds,
            fileTypeFilter: fileTypeFilter
        };

        attachmentManager.discoverAttachments(discoveryOptions);
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
                        const attachmentPanel = await generateAttachmentPanel(attachment, message, key);
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

    async function generateAttachmentPanel(attachment, message, groupingKey) {
        const attachmentPanel = attachmentPanelTemplate.content.cloneNode(true);

        const attachmentCheckbox = attachmentPanel.querySelector(".attachment-checkbox");

        attachmentCheckbox.setAttribute("message-id", attachment.messageId);
        attachmentCheckbox.setAttribute("part-name", attachment.partName);
        attachmentCheckbox.setAttribute("timestamp", attachment.date.toISOString());
        attachmentCheckbox.setAttribute("file-size", attachment.size);
        attachmentCheckbox.setAttribute("extension", attachment.extension);
        attachmentCheckbox.setAttribute("isEmbed", `${attachment.isEmbed}`);

        if(groupingKey) {
            attachmentCheckbox.setAttribute("grouping-key", groupingKey);
        }

        attachmentPanel.querySelector(".file-name-label").textContent = attachment.originalFilename;
        attachmentPanel.querySelector(".extension-label").textContent = attachment.extension;
        attachmentPanel.querySelector(".file-size-label").textContent = (attachment.size === null) ? "???" : abbreviateFileSize(attachment.size);
        attachmentPanel.querySelector(".author-label").textContent = message.author;
        attachmentPanel.querySelector(".message-date-label").textContent = attachment.date.toDateString();
        attachmentPanel.querySelector(".subject-label").textContent = message.subject;

        const defaultImagePreview = extensionOptions.defaultImagePreview;

        attachmentPanel.firstElementChild.classList.add(defaultImagePreview);

        const previewWrapper = attachmentPanel.querySelector(".preview-wrapper");

        if(defaultImagePreview.toLowerCase() != "none") {
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
                previewWrapper.innerHTML = "embed";
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
            immediateDiscoveryMessageDiv.classList.add("hidden");
            prediscoveryMessageDiv.classList.remove("hidden");

            zipLogoImage.classList.add("rotating");
        }

        fileTypeFilterAppliedSpan.classList.toggle("hidden", !extensionOptions.useFileTypeFilter);

        packagingProgressRow.classList.toggle("hidden", !extensionOptions.packageAttachments);
        savingProgessRow.classList.toggle("hidden", extensionOptions.packageAttachments);

        flexContainer.classList.add("modal");
        zipOverlay.classList.remove("hidden");

        attachmentManager.extract(list, getInfo, {
            packageAttachments: extensionOptions.packageAttachments,
            preserveFolderStructure: extensionOptions.preserveFolderStructure,
            includeEmbeds: includeEmbeds,
            tagMessages: extensionOptions.tagMessages
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
        discoverySelectionMessageDiv.innerHTML = messenger.i18n.getMessage("discoverySelectionMessage", [selectedAttachmentCount.toString(), attachmentCounts.attachmentCount.toString()]);
        embedDiscoverySelectionMessageDiv.innerHTML =  messenger.i18n.getMessage("embedDiscoverySelectionMessage", [selectedEmbedCount.toString(), attachmentCounts.embedCount.toString()]);
        discoverySizeLabel.innerHTML = abbreviateFileSize(selectedAttachmentSize);
    }

    function displayPermanentDetachPanel() {
        saveResultDiv.classList.add("hidden");
        detachResultDiv.classList.remove("hidden");
        zipTable.classList.add("hidden");
        detachTable.classList.remove("hidden");
    }

    function cancelDetach() {
        detachTable.classList.add("hidden");
        zipTable.classList.remove("hidden");
        detachResultDiv.classList.add("hidden");
        saveResultDiv.classList.remove("hidden");
    }

    function proceedDetach() {
        imapDetachmentNoticePanel.classList.add("hidden");
        detachActionButtonsDiv.classList.add("hidden");
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

            filterElements.secondaryCheckbox.disabled = false;
            filterElements.secondaryEditButton.disabled = !extensionOptions.useFileTypeFilter;
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

    function onToggleSelectedAttachmentsCheckboxChanged(event) {
        const checked = this.checked;

        document.querySelectorAll(".attachment-grouping-checkbox").forEach((checkbox, i) => {
            checkbox.checked = checked;
        });

        document.querySelectorAll(".attachment-checkbox").forEach((checkbox, i) => {
            checkbox.checked = checked;
        });

        updateAttachmentSelectionDependencies();
    }

    function onAttachmentGroupingCheckboxChanged(event) {
        const groupingCheckbox = event.srcElement;
        const groupingKey = groupingCheckbox.value;
        const isGroupChecked = groupingCheckbox.checked;

        document.querySelectorAll(`.attachment-checkbox[grouping-key='${groupingKey}']`).forEach((checkbox, i) => {
            checkbox.checked = isGroupChecked;
        });

        syncToggleSelectedAttachmentsCheckbox(isGroupChecked);

        updateAttachmentSelectionDependencies();
    }

    function onAttachmentCheckboxChanged(event) {
        let isChecked = event.srcElement.checked;
        const groupingKey = event.srcElement.getAttribute("grouping-key");

        if(groupingKey) {
            const groupingCheckbox = document.querySelector(`.attachment-grouping-checkbox[value='${groupingKey}']`);

            if(isChecked) {
                isChecked = !document.querySelector(`.attachment-checkbox[grouping-key='${groupingKey}']:not(:checked)`);
            }

            groupingCheckbox.checked = isChecked;
        }

        syncToggleSelectedAttachmentsCheckbox(isChecked);
        updateAttachmentSelectionDependencies();
    }

    function syncToggleSelectedAttachmentsCheckbox(isChecked) {
        if(isChecked) {
            isChecked = !document.querySelector(".attachment-checkbox:not(:checked)");
        }

        toggleSelectedAttachmentsCheckbox.checked = isChecked;
    }

    function updateAttachmentSelectionDependencies() {
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

        extractAllButton.disabled = (!discoveryComplete || (result.selectedAttachmentCount == 0 && result.selectedEmbedCount == 0));

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

    function showFiles(event) {
        let downloadId = event.srcElement.value;

        if(downloadId == "*") {

            downloadFoldersOverlay.classList.remove("hidden");
        }
        else {
            downloadId = parseInt(event.srcElement.value);
            browser.downloads.show(downloadId);
        }
    }

    function closeDownloadFoldersOverlay(event) {
        downloadFoldersOverlay.classList.add("hidden");
    }

    function addDownloadFolderItem(path, downloadId, label) {
        const templateNode = downloadFolderItemTemplate.content.cloneNode(true);
        const downloadFolderItem = templateNode.firstElementChild;

        downloadFolderItem.querySelector(".download-folder-label").innerText = label;

        const button = downloadFolderItem.querySelector(".link-button");
        button.value = downloadId;
        button.innerText = path;
        button.addEventListener("click", (e) => {
            browser.downloads.show(parseInt(e.srcElement.value));
        });

        downloadFoldersItemContainer.appendChild(downloadFolderItem);
    }

    async function generateReport(event) {
        const saveResult = await ReportManager.generateReport(attachmentManager, {
            reportStyleTemplate: reportStyleTemplate,
            reportTemplate: reportTemplate,
            reportItemTemplate: reportItemTemplate,
            abbreviateFileSize: abbreviateFileSize,
            fileTypeFilterList: (extensionOptions.useFileTypeFilter)
                ? filterElements.menuFileTypeList.innerHTML
                : null
        });

        if(saveResult.success) {
            const path = SaveManager.getFolderFromPath(saveResult.reportFilename);

            if(!downloadLocations.has(path)) {
                downloadLocations.set(path, saveResult.downloadId);
                addDownloadFolderItem(path, saveResult.downloadId, i18nText.report);
                showFilesButton.value = "*";
                detachShowFilesButton.value = "*";
            }

            if(CapabilitiesManager.permitReportTab) {
                messenger.tabs.create({ url: saveResult.reportFilename });
            }
        }
    }

    function closeZipPanel() {
        downloadLocations = null;

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
        embedDuplicateSpan.innerText = "0";
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
        packagingProgressRow.classList.add("hidden");

        // Saving
        savingCurrentSpan.innerText = "0";
        embedSavingCurrentSpan.innerText = "0";
        savingSizeSpan.innerText = abbreviateFileSize();
        embedSavingSizeSpan.innerText = abbreviateFileSize();
        savingProgessRow.classList.add("hidden");

        //Detaching

        detachOperationRow.classList.add("hidden");

        resetProgressElement(detachmentProgress);

        permanentDetachCurrentSpan.innerText = "0";
        permanentDetachTotalSpan.innerText = "0";
        
        lastFileNameDiv.innerText = "...";

        saveResultBorderDiv.classList.remove("success", "error");
        saveResultDiv.classList.remove("materialize", "hidden");
        saveResultLabel.innerText = "";
        packagingErrorCountSpan.innerText = "0";
        permanentlyDetachButton.classList.remove("hidden");
        permanentlyDetachButton.removeAttribute("title");

        detachTable.classList.add("hidden");
        zipTable.classList.remove("hidden");

        detachResultBorderDiv.classList.remove("success", "error");
        detachResultDiv.classList.remove("materialize");
        detachResultDiv.classList.add("hidden");
        detachResultLabel.innerText = "";
        detachErrorCountSpan.innerText = "0";

        downloadFoldersItemContainer.innerHTML = "";
        showFilesButton.value = "";
        detachShowFilesButton.value = "";

        showFilesButton.classList.add("hidden");
        viewReportButton.classList.add("hidden");

        document.querySelectorAll(".close-button.disablable").forEach((button) => { button.disabled = true; });            
    }

    function closeReleaseNotes(event) {
        releaseNotesOverlay.classList.add("hidden");
    }


    function alwaysShowQuickmenuOptionChanged(event) {
        const displayQuickmenu = alwaysShowQuickmenuCheckbox.checked;

        OptionsManager.setOption("displayQuickmenu", displayQuickmenu);
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