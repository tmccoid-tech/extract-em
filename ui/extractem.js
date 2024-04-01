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
    i18n.updateDocument();
    const errorText = messenger.i18n.getMessage("error");

    const folderStatsTemplate = document.getElementById("folder-stats-template");
    const attachmentGroupingHeaderTemplate = document.getElementById("attachment-grouping-header-template");
    const attachmentPanelTemplate = document.getElementById("attachment-panel-template");

    const logoImage  = document.getElementById("logo-img");

    const quickMenuOptionLabel = document.getElementById("quickmenu-option-label");
    const alwaysShowQuickMenuCheckbox = document.getElementById("always-show-quickmenu-checkbox");

    const statsSummaryTBody = document.getElementById("stats-summary-tbody");

    const statsSummaryRow = document.getElementById("stats-summary-tr");

    const selectedFolderCountSpan = document.getElementById("selected-folder-count-span");
    const folderCountSpan = document.getElementById("folder-count-span");
    const summarySelectedMessageCountSpan = document.getElementById("summary-selected-message-count-span");
    const summaryMessageCountSpan = document.getElementById("summary-message-count-span");
    const summaryProcessedMessageCountSpan = document.getElementById("summary-processed-message-count-td");
    const summaryAttachmentMessageCountSpan = document.getElementById("summary-attachment-message-count-td");
    const summarySelectedAttachmentCountSpan = document.getElementById("summary-selected-attachment-count-span");
    const summarySelectedAttachmentSizeSpan = document.getElementById("summary-selected-attachment-size-span");
    const summaryAttachmentCountSpan = document.getElementById("summary-attachment-count-span");
    const summaryAttachmentSizeSpan = document.getElementById("summary-attachment-size-span");

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

    const zipExtractPanelBody = document.getElementById("zip-extract-panel-body");

    const immediateDiscoveryDiv = document.getElementById("immediate-discovery-div");
    const discoveryProgressMessage = document.getElementById("discovery-progress-message");
    const discoverySizeLabel = document.getElementById("discovery-size-label");
    const immediateDiscoveryProgress = document.getElementById("immediate-discovery-progress");

    const packagingSkippedSpan = document.getElementById("packaging-skipped-span");
    const preparationProgress = document.getElementById("preparation-progress");

    const packagingDiv = document.getElementById("packaging-div");
    const packagingCurrentSpan = document.getElementById("packaging-current-span");
    const packagingTotalSpan = document.getElementById("packaging-total-span");
    const packagingSizeSpan = document.getElementById("packaging-size-span");
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

    const zipDetachPanelBody = document.getElementById("zip-detach-panel-body");
    const detachActionButtonsDiv = document.getElementById("detach-action-buttons-div");
    const proceedDetachButton = document.getElementById("proceed-detach-button");
    const cancelDetachButton = document.getElementById("cancel-detach-button");
    const detachProgressDiv = document.getElementById("detach-progress-div");
    const permanentDetachCurrentSpan = document.getElementById("permanent-detach-current-span");
    const permanentDetachTotalSpan = document.getElementById("permanent-detach-total-span");
    const detachmentProgress = document.getElementById("detachment-progress");
    const detachResultDiv = document.getElementById("detach-result-div");
    const detachResultBorderDiv = document.getElementById("detach-result-border-div");
    const detachResultLabel = document.getElementById("detach-result-label");
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

    var options;
    var attachmentManager;
    var useImmediateMode = false;
    var discoveryComplete = false;
    var selectionInvoked = false;
    var folderSummary;
    var selectedFolders;
    var hasAttachments = false;

    const updateProcessingFolder = (folderPath) => {
        if(!useImmediateMode) {
            const row = folderRowSet.get(folderPath).row;

            row.classList.add("processing");
        }
    };

    const updateMessageStats = (folderStats) => {
        if(useImmediateMode) {
            updateDiscoveryProgressMessage(folderStats.summaryAttachmentCount, folderStats.summaryAttachmentMessageCount, folderStats.summaryProcessedMessageCount, folderStats.summaryAttachmentSize);

            immediateDiscoveryProgress.value = folderStats.summaryProcessedMessageCount;
        }
        else {
            const row = folderRowSet.get(folderStats.folderPath).row;

            row.querySelector(".processed-message-count-td").innerText = folderStats.processedMessageCount.toString();

            summaryProcessedMessageCountSpan.innerText = folderStats.summaryProcessedMessageCount.toString();
            discoverAttachmentsProgress.value = folderStats.summaryProcessedMessageCount;
        }
    };

    const updateAttachmentStats = (folderStats) => {
        if(useImmediateMode) {
            updateDiscoveryProgressMessage(folderStats.summaryAttachmentCount, folderStats.summaryAttachmentMessageCount, folderStats.summaryProcessedMessageCount, folderStats.summaryAttachmentSize);
            lastFileNameDiv.innerText = folderStats.lastFileName;

            hasAttachments = folderStats.summaryAttachmentCount > 0;
        }
        else {
            const rowItem = folderRowSet.get(folderStats.folderPath);
            rowItem.attachmentMessageCount = folderStats.attachmentMessageCount;
            rowItem.attachmentCount = folderStats.attachmentCount;
            rowItem.attachmentSize = folderStats.attachmentSize;

            const row = rowItem.row;

            row.querySelector(".attachment-message-count-td").innerText = folderStats.attachmentMessageCount.toString();
            row.querySelector(".attachment-count-td").innerText = folderStats.attachmentCount.toString();
            row.querySelector(".attachment-size-td").innerText = abbreviateFileSize(folderStats.attachmentSize);

            summaryAttachmentMessageCountSpan.innerText = folderStats.summaryAttachmentMessageCount.toString();

            summaryAttachmentCountSpan.innerText = folderStats.summaryAttachmentCount.toString();
            summaryAttachmentSizeSpan.innerText = abbreviateFileSize(folderStats.summaryAttachmentSize);
        }
    };

    const updateProcessedFolder = (folderPath) => {
        if(!useImmediateMode) {
            const rowItem = folderRowSet.get(folderPath);

            const row = rowItem.row;
            row.classList.add("processed");

            const hasAttachments = (rowItem.attachmentCount > 0);

            if (!hasAttachments) {
                row.classList.add("ghost");
            }

            const checkbox = rowItem.checkbox;
            checkbox.checked = (checkbox.checked && hasAttachments);

            rowItem.processed = true;
        }
    };

    const updateProcessingComplete = () => {
        if(useImmediateMode) {
            if(hasAttachments) {
                extractImmediate();
            }
            else {
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
                selectedAttachmentCountSpan.innerText = countInfo.selectedAttachmentCount.toString();
                selectedAttachmentSizeSpan.innerText = abbreviateFileSize(countInfo.selectedAttachmentSize);
                attachmentListNavButton.disabled = false;
                attachmentListNavButton.classList.remove("invisible");
            }

            resetSummaryButton.disabled = false;

            logoImage.classList.remove("rotating");
        }
    };

    const updatePreparationProgress = (info) =>
    {
        if(info.status == "started") {
            preparationProgress.value = null;
        }
        else if(info.status == "complete") {
            preparationProgress.value = 1;
        }
        else {
            packagingSkippedSpan.innerText = info.duplicateCount.toString();
        }
    };

    const updatePackagingProgress = (info) =>
    {
        if(info.status == "started") {
            packagingTotalSpan.innerText = info.totalItems.toString();
            packagingProgress.setAttribute("max", info.totalItems);
            
            packagingFileTotalSpan.innerText = info.fileCount.toString();
        }

        packagingCurrentSpan.innerText = info.includedCount.toString();
        
        packagingFileCurrentSpan.innerText = info.filesCreated.toString();
        packagingErrorCountSpan.innerText = info.errorCount.toString();        
        
        lastFileNameDiv.innerText = info.lastFileName;

        packagingProgress.value = info.includedCount + info.errorCount;
        packagingSizeSpan.innerText = abbreviateFileSize(info.totalBytes.toString());
    };

    const updateSaveResult = (info) =>
    {
        if(info.status == "started") {
        }
        else {
            const success = (info.status == "success");

            zipLogoImage.classList.remove("rotating");

            saveResultLabel.innerHTML = info.message;

            document.querySelectorAll(".close-button").forEach((button) => { button.disabled = false; });            

            if(success && messenger.messages.deleteAttachments && info.attachmentCount > 0) {
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

    const updateDetachProgress = (info) => {
        permanentDetachCurrentSpan.innerText = info.processedCount.toString();
        detachmentProgress.value = info.processedCount;
        lastFileNameDiv.innerText = info.lastFileName;
    };

    const updateDetachResult = (info) => {
        detachResultDiv.classList.add("materialize");

        if(!info.success) {
            detachResultLabel.innerHTML = messenger.i18n.getMessage("detachErrorMessage");
        }

        const detachResult = (info.success) ? "success" : "error";

        detachResultBorderDiv.classList.add(detachResult);
    };

    function updateDiscoveryProgressMessage(attachmentCount = 0, attachmentMessageCount = 0 , messageCount = 0, cumulativeAttachmentSize = 0) {
        discoveryProgressMessage.innerHTML = messenger.i18n.getMessage("discoveryProgressMessage", [attachmentCount.toString(), attachmentMessageCount.toString(), messageCount.toString()]);
        discoverySizeLabel.innerHTML = abbreviateFileSize(cumulativeAttachmentSize);
    }

    async function main() {
        closeZipPanelButton.addEventListener("click", closeZipPanel);
        exitExtensionButton.addEventListener("click", (event) => { window.close(); });
        
        permanentlyDetachButton.addEventListener("click", displayPermanentDetachPanel);
        proceedDetachButton.addEventListener("click", proceedDetach);
        cancelDetachButton.addEventListener("click", cancelDetach);
        detachExitExtensionButton.addEventListener("click", (event) => { window.close(); });

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

            options = await OptionsManager.retrieve();

            let displayQuickMenu = options.displayQuickMenu && selectedFolders.length == 1;
            const extractImmediate = params.allowExtractImmediate;

            const selectionContext = params.selectionContext;

            if(selectionContext != "account" && !options.isInitialized) {
                quickMenuOptionLabel.classList.remove("hidden");
                alwaysShowQuickMenuCheckbox.checked = options.displayQuickMenu;

                alwaysShowQuickMenuCheckbox.addEventListener("change", alwaysShowQuickMenuOptionChanged);

                OptionsManager.setOption("isInitialized", true);

                displayQuickMenu = true;
            }

            attachmentManager = new AttachmentManager({
                folders: selectedFolders,
                
                silentModeInvoked: false,

                reportFolderProcessing : updateProcessingFolder,
                reportMessageStats: updateMessageStats,
                reportAttachmentStats: updateAttachmentStats,
                reportFolderProcessed: updateProcessedFolder,
                reportProcessingComplete: updateProcessingComplete,

                reportPreparationProgress: updatePreparationProgress,
                
                reportPackagingProgress: updatePackagingProgress,
                reportSaveResult: updateSaveResult,

                reportDetachProgress: updateDetachProgress,
                reportDetachResult: updateDetachResult
            });


            if(displayQuickMenu) {
                invokeQuickMenu();
            }
            else if(extractImmediate) {
                const includeSubfolders = options.includeSubfolders && selectedFolders[0].subFolders.length > 0;
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

    async function invokeExtractImmediate(options) {
        useImmediateMode = true;

        const summary = await attachmentManager.getFolderSummary(options.includeSubfolders);

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

            const selectedFolderPaths = assembleFolderPaths(selectedFolders[0], options.includeSubfolders);
    
            attachmentManager.discoverAttachments(new Set(selectedFolderPaths));

            zipLogoImage.classList.add("rotating");
        }

        zipFolderNameSpan.innerText = selectedFolders[0].path;

        if(options.includeSubfolders) {
            zipSubfoldersSpan.classList.remove("hidden");
        }

        if(options.hideCloseButton) {
            closeZipPanelButton.classList.add("hidden");
        }

        zipAttachmentContextSpan.classList.remove("hidden");

        immediateDiscoveryDiv.classList.remove("hidden");
        flexContainer.classList.add("modal");
        zipOverlay.classList.remove("hidden");
    }

    function assembleFolderPaths(folder, includeSubfolders) {
        var result = [folder.path];

        if(includeSubfolders) {
            folder.subFolders.forEach((item, i) =>
            {
                result.push(...assembleFolderPaths(item));
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

            templateNode.querySelector(".attachment-size-td").innerText = abbreviateFileSize(0);

            statsSummaryTBody.appendChild(row);

            folderRowSet.set(folder.path, {
                processed: false,
                messageCount: folder.messageCount,
                attachmentMessageCount: 0,
                attachmentCount: 0,
                attachmentSize: 0,
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

    function discoverAttachments() {
        logoImage.classList.remove("initializing");
        logoImage.classList.add("rotating");

        discoverAttachmentsButton.disabled = true;
        resetSummaryButton.disabled = true;

        const selectionCounts = determineSelectionCounts();
        discoverAttachmentsProgress.setAttribute("max", selectionCounts.selectedMessageCount);

        const selectedFolderPaths = new Set();

        folderRowSet.forEach((v, k, m) => {
            const checkbox = v.checkbox;

            checkbox.disabled = true;
            v.button.disabled = true;

            if (checkbox.checked && v.messageCount > 0) {
                selectedFolderPaths.add(k);
            }
            else {
                v.row.classList.add("ghost");
                v.processed = true;
            }

            v.virtualChecked = true;
        });

        attachmentManager.discoverAttachments(selectedFolderPaths);
    }

    async function generateAttachmentPanels() {
        if(!selectionInvoked) {
            selectionInvoked = true;

            attachmentManager.attachmentList.sort((a1, a2) => a2.date - a1.date);

            if(options.defaultGrouping == "None") {
                for (const attachment of attachmentManager.attachmentList) {
                    const message = attachmentManager.messageList.get(attachment.messageId);
                    await generateAttachmentPanel(attachment, message);
                }
            }
            else {
                const grouping = attachmentManager.getGrouping(options.defaultGrouping);

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

        attachmentPanel.querySelector(".file-name-label").textContent = attachment.name;
        attachmentPanel.querySelector(".extension-label").textContent = attachment.extension;
        attachmentPanel.querySelector(".file-size-label").textContent = abbreviateFileSize(attachment.size);
        attachmentPanel.querySelector(".author-label").textContent = message.author;
        attachmentPanel.querySelector(".message-date-label").textContent = attachment.date.toDateString();
        attachmentPanel.querySelector(".subject-label").textContent = message.subject;

        const defaultImagePreview = options.defaultImagePreview;

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
        const maxDimension = imagePreviewSizeMap.get(options.defaultImagePreview);

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

    async function extract(list, getInfo) {
        packagingDiv.classList.add("materialize");

        if(!useImmediateMode) {
            zipLogoImage.classList.add("rotating");
        }

        flexContainer.classList.add("modal");
        zipOverlay.classList.remove("hidden");

        attachmentManager.extract(list, getInfo,
            { preserveFolderStructure: options.preserveFolderStructure }
        );
    }

    function extractBySet(list) {
        extract(list, (attachment) => {
            return {
                messageId: attachment.messageId,
                partName: attachment.partName
            };
        });
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

        updateZipDiscoveryInfo(selectionCounts.selectedAttachmentCount, selectionCounts.selectedAttachmentSize);

        extractBySet(filteredAttachmentList);
    }

    function extractSelected() {
        const selections = getSelectedAttachmentCheckboxes();

        updateZipDiscoveryInfo(selections.count, selections.selectedAttachmentSize);

        extract(selections.checkboxes,
            (checkbox) => {
                return {
                    messageId: parseInt(checkbox.getAttribute("message-id")),
                    partName: checkbox.getAttribute("part-name")
                };
            }
        );
    }

    function updateZipDiscoveryInfo(selectedCount, size) {
        immediateDiscoveryProgress.value = 1;
        discoveryProgressMessage.innerHTML =  messenger.i18n.getMessage("discoverySelectionMessages", [selectedCount.toString(), attachmentManager.attachmentList.length.toString()]);
        discoverySizeLabel.innerHTML = abbreviateFileSize(size);
    }

    function displayPermanentDetachPanel() {
        zipExtractPanelBody.classList.add("hidden");
        zipDetachPanelBody.classList.remove("hidden");
    }

    function cancelDetach() {
        zipDetachPanelBody.classList.add("hidden");
        zipExtractPanelBody.classList.remove("hidden");
    }

    function proceedDetach() {
        detachActionButtonsDiv.classList.add("hidden");
        detachProgressDiv.classList.add("materialize");

        attachmentManager.deleteAttachments();
    }

    function resetSummary() {
        attachmentManager.reset();

        if(discoveryComplete) {
            discoveryComplete = false;
            selectionInvoked = false;
            attachmentListNavButton.classList.add("invisible");
            attachmentListNavButton.disabled = true;
            attachmentListDiv.innerHTML = "";
            selectedAttachmentCountSpan.innerText = "0";
        }

        discoverAttachmentsProgress.value = 0;
        discoverAttachmentsProgress.setAttribute("max", 1);
        summaryProcessedMessageCountSpan.innerText = "0";
        summaryAttachmentMessageCountSpan.innerText = "0";
        summaryAttachmentCountSpan.innerText = "0";

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

        extractSelectedButton.disabled = (selections.count == 0);
        selectedAttachmentCountSpan.innerText = selections.count.toString();
        selectedAttachmentSizeSpan.innerText = abbreviateFileSize(selections.selectedAttachmentSize);
    }

    function updateSelectionCounts() {
        const result = determineSelectionCounts();

        selectedFolderCountSpan.innerText = result.selectedFolderCount.toString();
        summarySelectedMessageCountSpan.innerText = result.selectedMessageCount.toString();
        summarySelectedAttachmentCountSpan.innerText = result.selectedAttachmentCount.toString();
        summarySelectedAttachmentSizeSpan.innerText = abbreviateFileSize(result.selectedAttachmentSize);
        
        discoverAttachmentsButton.disabled = (discoveryComplete || result.selectedMessageCount == 0);

        extractAllButton.disabled = (!discoveryComplete || result.selectedAttachmentCount == 0);

        return result;
    }

    function determineSelectionCounts() {
        const result = {
            selectedFolderCount: 0,
            selectedMessageCount: 0,
            selectedAttachmentCount: 0,
            selectedAttachmentSize: 0
        };

        folderRowSet.forEach((v, k, m) => {
            if(v.checkbox.checked) {
                result.selectedFolderCount++;
                result.selectedMessageCount += (discoveryComplete)
                    ? v.attachmentMessageCount
                    : v.messageCount;
                result.selectedAttachmentCount += v.attachmentCount;
                result.selectedAttachmentSize += v.attachmentSize;
            }
        });

        return result;
    };

    function getSelectedAttachmentCheckboxes(statsOnly = false) {
        const result = {
            count: 0,
            selectedAttachmentSize: 0
        };

        const selectedCheckboxes = [...document.querySelectorAll(".attachment-checkbox:checked")];

        result.count = selectedCheckboxes.length;

        result.selectedAttachmentSize = selectedCheckboxes.reduce((t, c) =>
            t + parseInt(c.getAttribute("file-size"))
        , 0);

        if(!statsOnly) {
            result.checkboxes = selectedCheckboxes;
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

        immediateDiscoveryDiv.classList.add("hidden");

        updateDiscoveryProgressMessage();

        immediateDiscoveryProgress.removeAttribute("value");
        immediateDiscoveryProgress.removeAttribute("max");

        packagingDiv.classList.remove("hidden", "materialize");
        packagingCurrentSpan.innerText = "0";
        packagingTotalSpan.innerText = "0";
        packagingSizeSpan.innerText = `0 ${messenger.i18n.getMessage("bytesLabel")}}`;
        packagingSkippedSpan.innerText = "0";
        lastFileNameDiv.innerText = "...";
        packagingProgress.removeAttribute("value");
        packagingProgress.removeAttribute("max");

        saveResultBorderDiv.classList.remove("success", "error");
        saveResultDiv.classList.remove("materialize");
        saveResultLabel.innerText = "";

//        deletionMap = null;

        document.querySelectorAll(".close-button").forEach((button) => { button.disabled = true; });            
    }

    function alwaysShowQuickMenuOptionChanged(event) {
        const displayQuickMenu = alwaysShowQuickMenuCheckbox.checked;

        OptionsManager.setOption("displayQuickMenu", displayQuickMenu);
    }

    function abbreviateFileSize(size) {
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