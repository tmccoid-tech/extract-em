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
            selectedAutomationFoldersList,            
            saveButton,
            cancelButton
        } = elements;

        const { extractOnReceiveEnabled, limitAutomationToSpecificFolders } = extensionOptions;

        enableExtractOnReceiveCheckbox.checked = extractOnReceiveEnabled;
        limitAutomationFoldersCheckbox.checked = limitAutomationToSpecificFolders;

        enableExtractOnReceiveCheckbox.addEventListener("change", (e) => this.#enableExtractOnReceiveCheckboxChanged(e));
        limitAutomationFoldersCheckbox.addEventListener("change", (e) => this.#limitAutomationFoldersCheckboxChanged(e));
        editButton.addEventListener("click", (e) => this.#editButtonClicked(e));
        saveButton.addEventListener("click", (e) => this.#saveButtonClicked(e));
        cancelButton.addEventListener("click", (e) => this.#cancelButtonClicked(e));

        limitAutomationFoldersCheckbox.disabled = !extractOnReceiveEnabled;
        editButton.disabled = !(extractOnReceiveEnabled && limitAutomationToSpecificFolders);

        this.#setDisplay(extensionOptions.automationFolders);
    }

    static async #enableExtractOnReceiveCheckboxChanged(event) {
        const extractOnReceiveEnabled = event.srcElement.checked;

        await OptionsManager.setOption("extractOnReceiveEnabled", extractOnReceiveEnabled);
        this.#extensionOptions.extractOnReceiveEnabled = extractOnReceiveEnabled;

        const {
            limitAutomationFoldersCheckbox,
            editButton,
        } = this.#elements;

        limitAutomationFoldersCheckbox.disabled = !extractOnReceiveEnabled;
        editButton.disabled = !(extractOnReceiveEnabled && this.#extensionOptions.limitAutomationToSpecificFolders);
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

        const { automationFolders } = this.#extensionOptions;

        const accounts = await messenger.accounts.list(true);

        const generateFolderPanels = (subFolders, container, account, folderPaths, indent = 0, parentPath) => {
            for(let folder of subFolders) {
                if(folder.isVirtual) {
                    continue;
                }

                const folderSelector = folderSelectorTemplate.content.cloneNode(true);

                const checkbox = folderSelector.querySelector(".account-folder-checkbox");
                checkbox.setAttribute("account-id", account.id);
                checkbox.setAttribute("account-name", account.name)
                checkbox.setAttribute("folder-path", folder.path);

                if(folderPaths && folderPaths.has(folder.path)) {
                    checkbox.checked = true;
                }

                checkbox.addEventListener("change", (e) => {
                    const accountId = e.srcElement.getAttribute("account-id");

                    this.#syncAccountToggler(accountId);
                });

                const button = folderSelector.querySelector(".folder-selector-button");
                button.setAttribute("account-id", account.id);
                button.setAttribute("folder-path", folder.path);

                if(parentPath) {
                    button.textContent = folder.path.slice(parentPath.length);
                    folderSelector.querySelector(".spacer").textContent = ("\u00A0").repeat(indent);
                }
                else {
                    button.textContent = folder.path;
                }

                button.addEventListener("click", (e) => {
                    const { srcElement } = e;
                    const accountId = srcElement.getAttribute("account-id");
                    const folderPath = srcElement.getAttribute("folder-path");
                    
                    const fCheckbox = document.querySelector(`.account-folder-checkbox[account-id='${accountId}'][folder-path='${folderPath}']`);

                    const checked = !fCheckbox.checked;

                    for(let gCheckbox of document.querySelectorAll(`.account-folder-checkbox[account-id='${accountId}'][folder-path^='${folderPath}']`)) {
                        gCheckbox.checked = checked;
                    }

                    this.#syncAccountToggler(accountId);
                });

                container.appendChild(folderSelector);

                if(folder.subFolders) {
                    generateFolderPanels(folder.subFolders, container, account, folderPaths, indent + 4, folder.path);
                }
            }
        }

        for(let account of accounts) {
            const accountPanel = accountPanelTemplate.content.cloneNode(true);

            accountPanel.querySelector(".account-name-span").textContent = account.name;

            const checkbox = accountPanel.querySelector(".account-folder-toggle-checkbox");
            checkbox.setAttribute("account-id", account.id);
            checkbox.addEventListener("change", (e) => {
                const { srcElement } = e;
                const { checked } = srcElement;
                const accountId = srcElement.getAttribute("account-id");

                for(let child of document.querySelectorAll(`.account-folder-checkbox[account-id='${accountId}']`)) {
                    child.checked = checked;
                }
            });

            const container = accountPanel.querySelector(".account-folders-container");

            const folderPaths = (automationFolders.has(account.id) ? automationFolders.get(account.id).folderPaths : null);

            generateFolderPanels(account.rootFolder.subFolders, container, account, folderPaths);

            automationFoldersListContainer.appendChild(accountPanel);

            this.#syncAccountToggler(account.id);
        }

        editorOverlay.classList.remove("hidden");

        automationFoldersListContainer.parentElement.scrollTo(0, 0);
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
            automationFoldersListContainer
        } = this.#elements;

        const extensionOptions = this.#extensionOptions;

        if(withSave) {
            const automationFolders = new Map();

            const checkboxes = automationFoldersListContainer.querySelectorAll(".account-folder-checkbox:is(:checked)");

            for(let checkbox of checkboxes) {
                const accountId = checkbox.getAttribute("account-id");
                const accountName = checkbox.getAttribute("account-name");
                const folderPath = checkbox.getAttribute("folder-path");

                if(automationFolders.has(accountId)) {
                    automationFolders.get(accountId).folderPaths.add(folderPath);
                }
                else {
                    automationFolders.set(accountId, { name: accountName, folderPaths: new Set([folderPath]) });
                }
            }


            OptionsManager.setOption("automationFolders", automationFolders);
            extensionOptions.automationFolders = automationFolders;

            OptionsManager.setOption("limitAutomationToSpecificFolders", automationFolders.size > 0);
            extensionOptions.limitAutomationToSpecificFolders = automationFolders.size > 0;

            this.#setDisplay(extensionOptions.automationFolders);
        }

        const hasAutomationFolders = (extensionOptions.automationFolders.size > 0);

        limitAutomationFoldersCheckbox.checked = hasAutomationFolders;
        editButton.disabled = !hasAutomationFolders;

        editorOverlay.classList.add("hidden");

        automationFoldersListContainer.replaceChildren();
    }

    static async #setDisplay(automationFolders) {
        const { selectedAutomationFoldersList } = this.#elements;

        selectedAutomationFoldersList.replaceChildren();

        let selectedFolderCount = 0;
        for(const account of automationFolders.values()) {
            selectedFolderCount += account.folderPaths.size;

            for(let folderPath of account.folderPaths.values()) {
                const option = document.createElement("option");
                option.text = `${ account.name }: ${ folderPath }`;
                selectedAutomationFoldersList.add(option);
            }
        }

        selectedAutomationFoldersList.setAttribute("size", (selectedFolderCount > 3) ? 3 : selectedFolderCount);

        if(selectedFolderCount == 0) {
            selectedAutomationFoldersList.classList.add("hidden");
        }
        else {
            selectedAutomationFoldersList.classList.remove("hidden");
        }
    }

    static #syncAccountToggler(accountId) {
        const checkToggler = !(document.querySelector(`.account-folder-checkbox[account-id='${accountId}']:not(:checked)`));

        document.querySelector(`.account-folder-toggle-checkbox[account-id='${accountId}']`).checked = checkToggler;
    }
}