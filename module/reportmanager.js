import { SaveManager } from "/module/savemanager.js";
import { i18nText } from "/module/i18nText.js";

export class ReportManager {
    static async generateReport(attachmentManager, parameters) {
        const {
            reportStyleTemplate,
            reportTemplate,
            reportItemTemplate,
            abbreviateFileSize
        } = parameters;

        const {
            packagingFilenameList,
            packagingTracker,
            duplicateFileTracker,
            duplicateEmbedFileTracker,
            alterationTracker,
            errorList,
            detachmentErrorList
        } = attachmentManager.getReportData();


        const namespace = "http://www.w3.org/1999/xhtml";
        const reportDocument = document.implementation.createDocument(namespace, "html", null);

        const reportHead = document.createElementNS(namespace, "head");
        const reportBody = document.createElementNS(namespace, "body");

        // Populate head section
        const reportTitle = document.createElement("title");
        reportTitle.innerText = `${i18nText.extensionName} - ${i18nText.extractionReport}`;
        reportHead.append(reportTitle);

        const reportIcon = document.createElement("link");
        reportIcon.setAttribute("rel", "icon");
        reportIcon.setAttribute("type", "image/png");
        reportHead.append(reportIcon);

        const reportStyle = reportStyleTemplate.content.cloneNode(true);
        reportHead.append(reportStyle.firstElementChild);

        // Populate body section 

        const reportBodyContent = reportTemplate.content.cloneNode(true);
        reportBody.append(reportBodyContent.firstElementChild);

        const reportItemContent = reportItemTemplate.content;

        reportBody.querySelector(".current-datetime-label").textContent = new Date().toLocaleDateString();
        reportBody.querySelector(".package-file-count-label").textContent = packagingFilenameList.length.toString();

        const messageList = attachmentManager.messageList;

        const formatTimeElement = (v) => v.toString().padStart(2, "0");

        const generateSection = (tableClass, iterate, canDisplay = () => true) =>
        {
            const currentTable = reportBody.querySelector(tableClass);

            iterate(currentTable);

            if(canDisplay()) {
                currentTable.classList.remove("hidden");
            }
        };

        const generateFilenameHeaderRow = (currentTable, filename) => {
            const row = document.createElement("div");
            row.classList.add("filename-row");
            row.classList.toggle("canceled", !filename)
            row.textContent = (filename) ? filename : `*** ${i18nText.saveCanceled} ***`;
            currentTable.append(row);
        };

        const generateReportLineItem =  (reportItemContent, item, messageInfo, sequenceNumber, specialMessage) => {
            const reportItem = reportItemContent.cloneNode(true);
    
            const date = messageInfo.date;

            reportItem.querySelector(".sequence-number").textContent = sequenceNumber.toString();
            reportItem.querySelector(".subject-label").textContent = messageInfo.subject;
            reportItem.querySelector(".author-label").textContent = messageInfo.author;
            reportItem.querySelector(".message-date-label").textContent = date.toDateString();
            reportItem.querySelector(".message-time-label").textContent = `${formatTimeElement(date.getHours())}:${formatTimeElement(date.getMinutes())}:${formatTimeElement(date.getSeconds())}`;
            reportItem.querySelector(".output-filename-label").textContent =  item.outputFilename;
            reportItem.querySelector(".file-size-label").textContent = abbreviateFileSize(item.size);

            if(item.outputFilename !== item.originalFilename) {
                const originalFilenameLabel = reportItem.querySelector(".original-filename-label");

                originalFilenameLabel.textContent = item.originalFilename;
                originalFilenameLabel.classList.remove("hidden");
            }


            if(specialMessage) {
                const specialMessageLabel = reportItem.querySelector(".special-message-label");
                specialMessageLabel.classList.remove("hidden");
                specialMessageLabel.textContent = specialMessage;
            }
    
            return reportItem.firstElementChild;
        };

        let currentFilenameIndex = -1;

        // Standard attachments

        const attachmentItems = packagingTracker.items.filter((item) => !item.hasError);

        const savePath = (packagingTracker.lastDownloadId) 
            ? await SaveManager.getFolderByDownloadId(packagingTracker.lastDownloadId)
            : null
        ;

        if(attachmentItems.length > 0) {
            generateSection(".attachment-table", (currentTable) => {
                let sequenceNumber = 0;
                for(const item of attachmentItems) {
                    if(savePath && currentFilenameIndex == -1 || !savePath && item.packagingFilenameIndex !== currentFilenameIndex) {
                        currentFilenameIndex = item.packagingFilenameIndex;

                        const filename = (savePath)
                            ? savePath
                            : packagingFilenameList[currentFilenameIndex]
                        ;

                        generateFilenameHeaderRow(currentTable, filename);
                    }

                    const specialMessage = (item.isDeleted) ? i18nText.detached : null;

                    currentTable.append(generateReportLineItem(reportItemContent, item, messageList.get(item.messageId), ++sequenceNumber, specialMessage));
                }
            });

            reportBody.querySelector(".saved-attachment-count-label").textContent = attachmentItems.length.toString();
        }

        // Duplicate attachments

        if(duplicateFileTracker.length > 0) {
            generateSection(".duplicate-table", (currentTable) => {
                let sequenceNumber = 0;
                for(const item of duplicateFileTracker) {
                    const specialMessage = (item.isDeleted) ? i18nText.detached : null;

                    currentTable.append(generateReportLineItem(reportItemContent, item, messageList.get(item.messageId), ++sequenceNumber, specialMessage));
                }
            });

            reportBody.querySelector(".duplicate-attachment-count-label").textContent = duplicateFileTracker.length.toString();
        }

        // Alterations

        if(alterationTracker.length > 0) {
            generateSection(".alteration-table", (currentTable) => {
                let sequenceNumber = 0;
                for(const item of alterationTracker) {
                    currentTable.append(generateReportLineItem(reportItemContent, item, item, ++sequenceNumber, item.alteration));
                }
            });

            reportBody.querySelector(".alteration-count-label").textContent = alterationTracker.length.toString();
        }

        // Embeds

        const embedItems = packagingTracker.embedItems.filter((item) => !(item.isDuplicate || item.hasError));

        let embedHeaderGenerated = false;

        if(embedItems.length > 0) {
            generateSection(".embed-table", (currentTable) => {
                let sequenceNumber = 0;
                for(const item of embedItems) {
                    if(savePath && !embedHeaderGenerated || !savePath && item.packagingFilenameIndex !== currentFilenameIndex) {
                        currentFilenameIndex = item.packagingFilenameIndex;
                        embedHeaderGenerated = true;

                        const filename = (savePath)
                            ? savePath
                            : packagingFilenameList[currentFilenameIndex]
                        ;

                        generateFilenameHeaderRow(currentTable, filename);
                    }

                    currentTable.append(generateReportLineItem(reportItemContent, item, messageList.get(item.messageId), ++sequenceNumber));
                }
            });

            reportBody.querySelector(".saved-embed-count-label").textContent = embedItems.length.toString();
        }

        // Duplicate embeds

        if(duplicateEmbedFileTracker && duplicateEmbedFileTracker.size > 0) {
            let sequenceNumber = 0;
            generateSection(".duplicate-embed-table", (currentTable) => {
                for(const filenameEntry of duplicateEmbedFileTracker.entries()) {
                    for(const sizeEntry of filenameEntry[1].sizes.entries()) {
                        for(const checksumEntry of sizeEntry[1].entries()) {
                            for(const messageId of checksumEntry[1]) {
                                currentTable.append(generateReportLineItem(reportItemContent, { name: filenameEntry[0], size: sizeEntry[0] }, messageList.get(messageId), ++sequenceNumber));
                            }
                        }
                    }
                }
            }, () => sequenceNumber > 0);

            reportBody.querySelector(".duplicate-embed-count-label").textContent = sequenceNumber.toString();
        }

        // Errors

        if(errorList.length > 0) {
            generateSection(".error-table", (currentTable) => {
                let sequenceNumber = 0;
                for(const item of errorList) {
                    currentTable.append(generateReportLineItem(reportItemContent, item, messageList.get(item.messageId), ++sequenceNumber, item.error));
                }
            });

            reportBody.querySelector(".packaging-error-count-label").textContent = errorList.length.toString();
        }

        // Detachment errors

        if(detachmentErrorList && detachmentErrorList.length > 0) {
            generateSection(".detachment-error-table", (currentTable) => {
                let sequenceNumber = 0;
                for(const item of detachmentErrorList) {
                    currentTable.append(generateReportLineItem(reportItemContent, item, messageList.get(item.messageId), ++sequenceNumber, item.error));
                }
            });

            reportBody.querySelector(".deletion-error-count-label").textContent = detachmentErrorList.length.toString();
        }

        // Filtering, when applicable
        if(parameters.fileTypeFilterList) {
            reportBody.querySelector("#report-file-type-list-span").innerText = parameters.fileTypeFilterList;
            reportBody.querySelector("#report-filter-div").classList.remove("hidden");
        }

        // Fetch image files and assign appropriately

        const [iconDataUrl, backgroundDataUrl] = await Promise.all([
            this.#getImageDataUrl("/icons/extractem-32px.png"),
            this.#getImageDataUrl("/ui/tiled_paperclip.png")
        ]);

        reportIcon.setAttribute("href", iconDataUrl);
        
        const reportLogo = reportBody.querySelector(".report-logo");
        reportLogo.setAttribute("src", iconDataUrl);

        reportBody.style.background = `url(${backgroundDataUrl}) center/124px repeat`;

        // Final report assembly

        const element = reportDocument.documentElement;
    
        element.appendChild(reportHead);
        element.appendChild(reportBody);

        i18n.updateAnyDocument(reportDocument);

        const fileText = `<!DOCTYPE html>${element.outerHTML}`;

        const reportFileData = new Blob([fileText], { type: "text/html" });

        let reportFilename = null;

        const result = await SaveManager.save({
            fileData: reportFileData,
            filename: `${i18nText.extractionReport}-${new Date().getTime()}.html`,
            saveAs: true,
            onSaveStarted: (downloadItem) => {
                reportFilename = downloadItem.filename
            }
        });

        result.reportFilename = reportFilename;

        return result;
    }

    static #getImageDataUrl(filename) {
        return new Promise((resolve) => {
            const xhr = new XMLHttpRequest();
            const fileReader = new FileReader();
    
            xhr.onload = () => {
                fileReader.readAsDataURL(xhr.response);
            };

            fileReader.onload = () => {
                resolve(fileReader.result);
            };

            xhr.open("get", filename);
            xhr.responseType = "blob";
            xhr.send();        
        });
    }
}