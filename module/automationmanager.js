import { OptionsManager } from "/module/optionsmanager.js";

export class AutomationManager {
    static #elements;
    static #extensionOptions;
    
    static async initializeEditor(elements, extensionOptions) {
        this.#elements = elements;
        this.#extensionOptions = extensionOptions;

        const {
            enableExtractOnReceiveCheckbox,
            limitAutomationFoldersCheckbox,
            editButton,
            saveButton,
            cancelButton
        } = elements;

        enableExtractOnReceiveCheckbox.checked = extensionOptions.extractOnReceiveEnabled;
        limitAutomationFoldersCheckbox.checked = extensionOptions.limitAutomationFolders;

        enableExtractOnReceiveCheckbox.addEventListener("change", (e) => this.#enableExtractOnReceiveCheckboxChanged(e));
        limitAutomationFoldersCheckbox.addEventListener("change", (e) => this.#limitAutomationFoldersCheckboxChanged(e));
        editButton.addEventListener("click", (e) => this.#editButtonClicked(e));
        saveButton.addEventListener("click", (e) => this.#saveButtonClicked(e));
        cancelButton.addEventListener("click", (e) => this.#cancelButtonClicked(e));
    }

    static async #enableExtractOnReceiveCheckboxChanged(event) {
        const enableExtractOnReceive = event.srcElement.checked;

        await OptionsManager.setOption("enableExtractOnReceive", enableExtractOnReceive);
        this.#extensionOptions.enableExtractOnReceive = enableExtractOnReceive;

        const {
            limitAutomationFoldersCheckbox,
            editButton,
        } = this.#elements;

        limitAutomationFoldersCheckbox.disabled = !enableExtractOnReceive;
        editButton.disabled = !(enableExtractOnReceive && this.#extensionOptions.limitAutomationToSpecificFolders);
    }

    static async #limitAutomationFoldersCheckboxChanged(event) {
        const limitAutomationToSpecificFolders = event.srcElement.checked;

        const {
            editorOverlay,
            editButton
        } = this.#elements;

        if(limitAutomationToSpecificFolders && this.#extensionOptions.automationFolders.size == 0) {
            this.#editButtonClicked(event);
        }
        else {
            await OptionsManager.setOption("limitAutomationToSpecificFolders", limitAutomationToSpecificFolders);
            this.#extensionOptions.limitAutomationToSpecificFolders = limitAutomationToSpecificFolders;

            this.#elements.editButton.disabled = !limitAutomationToSpecificFolders;
        }
    }

    static async #editButtonClicked(event) {
        const {
            editorOverlay,
            automationFoldersListContainer,            
            limitAutomationFoldersCheckbox,
            editButton,
            accountPanelTemplate,
            folderSelectorTemplate,
        } = this.#elements;


        const accounts = await messenger.accounts.list(true);

        for(let account of accounts) {

            const accountPanel = accountPanelTemplate.content.cloneNode(true);

            accountPanel.querySelector(".account-name-span").textContent = account.name;

            const container = accountPanel.querySelector(".account-folders-container");

            const folders = await messenger.folders.query({ accountId: account.id});
            for(let folder of folders) {
                const folderSelector = folderSelectorTemplate.content.cloneNode(true);

                folderSelector.querySelector(".folder-path-label").textContent = folder.path;

                container.appendChild(folderSelector);
            }

            automationFoldersListContainer.appendChild(accountPanel);
        }

        editorOverlay.classList.remove("hidden");
    }

    static async #saveButtonClicked(event) {
        this.#finalize(true);
    }

    static async #cancelButtonClicked(event) {
        this.#finalize(false);
    }

    static async #finalize(withSave) {
        const {
            editorOverlay,
            limitAutomationFoldersCheckbox,
            editButton,
            automationFoldersListContainer,
        } = this.#elements;

        const extensionOptions = this.#extensionOptions;

        if(withSave) {
            // Collect selected folders 
        }

        if(extensionOptions.automationFolders.size == 0) {
            limitAutomationFoldersCheckbox.checked = false;
            editButton.disabled = true;
        }

        editorOverlay.classList.add("hidden");

        automationFoldersListContainer.replaceChildren();
    }
}