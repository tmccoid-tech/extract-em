import { OptionsManager } from "/module/optionsmanager.js";

export class FilterManager {
    static commonFileTypeMap = new Map([
        ["~gen", new Map([
            ["csv"],
            ["doc(x)", ["doc", "docx"]],
            ["eml"],
            ["htm(l)", ["htm", "html"]],
            ["log"],
            ["ods"],
            ["odt"],
            ["pdf"],
            ["ppt(x)", ["ppt", "pptx"]],
            ["rtf"],
            ["txt"],
            ["xls(x)", ["xls", "xlsx"]],
            ["xml"]
        ])],
        ["~img", new Map([
            ["bmp"],
            ["gif"],
            ["ico"],
            ["jp(e)g", ["jpg", "jpeg"]],
            ["png"],
            ["psd"],
            ["tif(f)", ["tif", "tiff"]]
        ])],
        ["~aud", new Map([
            ["flac"],
            ["m4a"],
            ["mp3"],
            ["ogg"],
            ["wav"],
            ["wma"]
        ])],
        ["~vid", new Map([
            ["avi"],
            ["m4v"],
            ["mkv"],
            ["mov"],
            ["mp4"],
            ["mp(e)g", ["mpg", "mpeg"]],
            ["vob"],
            ["wmv"]
        ])]
    ]);

    static #elements;
    static #extensionOptions;
    static #fileTypeControlTemplate;

    static async initializeEditor(elements, extensionOptions) {
        this.#elements = elements;
        this.#extensionOptions = extensionOptions;

        elements.quickmenuCheckbox.checked = extensionOptions.useFileTypeFilter;
        this.#syncMainControls(extensionOptions, (extensionOptions.includedFilterFileTypes.length > 0 || extensionOptions.includeUnlistedFileTypes));

        elements.quickmenuCheckbox.addEventListener("change", (e) => this.#onQuickmenuCheckboxChanged(e));
        elements.quickmenuEditButton.addEventListener("click", (e) => this.#displayEditor(e));

        const templatesContainer = document.createElement("template");

        templatesContainer.innerHTML = await (await fetch("/module/filtering/filtertemplate.html")).text();

        const mainTemplate = templatesContainer.content.getElementById("filter-file-type-editor-template");
        this.#fileTypeControlTemplate = templatesContainer.content.getElementById("file-type-control-template");

        const editorPanel = mainTemplate.content.cloneNode(true);

        for(const category of this.commonFileTypeMap) {
            const [categoryId, entryList] = category;

            const itemContainer = editorPanel.querySelector(`.file-type-category-container[ft-category='${categoryId}']`);

            for(const fileType of entryList) {
                const fileTypeControl = this.#createFileTypeControl(fileType, categoryId);
                itemContainer.appendChild(fileTypeControl);
            }

            const customFileTypes = extensionOptions.additionalFilterFileTypes.get(categoryId);
            for(const fileType of customFileTypes) {
                const fileTypeControl = this.#createFileTypeControl(fileType, categoryId, true);
                itemContainer.appendChild(fileTypeControl);
            }

            const fileTypeCategoryCheckbox = editorPanel.querySelector(`.file-type-category-checkbox[value='${categoryId}']`);
            fileTypeCategoryCheckbox.addEventListener("click", (e) => this.#onCategoryCheckboxChecked(e));
        }

        const editorContainer = elements.editorContainer;

        editorContainer.appendChild(editorPanel);
        
        editorContainer.querySelector(".file-type-checkbox[value='--']").addEventListener("click", (e) => this.#onFileTypeCheckboxChecked(e));
        editorContainer.querySelector(".file-type-checkbox[value='*']").addEventListener("click", (e) => this.#onFileTypeCheckboxChecked(e));

        // Add file type editing elements

        elements.addFileTypeOverlay = editorContainer.querySelector("#add-file-type-overlay");
        elements.addFileTypeControlLabel = editorContainer.querySelector("#add-file-type-control-label");

        const addTypeButtons = editorContainer.querySelectorAll(".add-file-type-button");
        for(const button of addTypeButtons) {
            button.addEventListener("click", (e) => this.#displayNewFilterFileTypeDialog(e));
        }

        const addFileTypeTextbox = editorContainer.querySelector("#add-file-type-textbox");
        addFileTypeTextbox.addEventListener("keydown", (e) => this.#onFileTypeInputKeyDown(e));
        addFileTypeTextbox.addEventListener("input", (e) => this.#onFileTypeInputTextChanged(e));
        addFileTypeTextbox.addEventListener("cut paste drop", (e) => { e.preventDefault(); return false; });
        elements.addFileTypeTextbox = addFileTypeTextbox;


        const saveNewFileTypeButton = editorContainer.querySelector("#save-new-file-type-button");
        saveNewFileTypeButton.addEventListener("click", async (e) => this.#onSaveNewFileTypeButtonClicked(e));
        elements.saveNewFileTypeButton = saveNewFileTypeButton;

        const cancelAddFileTypeButton = editorContainer.querySelector("#cancel-add-file-type-button");
        cancelAddFileTypeButton.addEventListener("click", (e) => this.#dismissAddFileType());
        elements.cancelAddFileTypeButton = cancelAddFileTypeButton;

        ////////////////////////////

        elements.saveButton = editorContainer.querySelector("#filter-save-button");
        elements.saveButton.addEventListener("click", async (e) => this.#save());

        elements.cancelButton = editorContainer.querySelector("#filter-cancel-button");
        elements.cancelButton.addEventListener("click", (e) => this.#cancel());
    }

    static #createFileTypeControl = (fileType, categoryId, isCustom = false) => {
        const result = this.#fileTypeControlTemplate.content.cloneNode(true);

        const [fileTypeId ,] = fileType;

        const fileTypeControl = result.querySelector(".file-type-control");
        fileTypeControl.setAttribute("control-id", `${categoryId}:${fileTypeId}`);

        const fileTypeCheckbox = result.querySelector(".file-type-checkbox");
        fileTypeCheckbox.value = fileTypeId;
        fileTypeCheckbox.setAttribute("ft-category", categoryId);
        fileTypeCheckbox.addEventListener("click", (e) => this.#onFileTypeCheckboxChecked(e));

        const fileTypeControlLabel = result.querySelector(".file-type-control-label");
        fileTypeControlLabel.innerText = fileTypeId;

        if(isCustom) {
            fileTypeControlLabel.classList.add("custom");
        }

        return result;
    };


    static async #onQuickmenuCheckboxChanged(event) {
        const { quickmenuCheckbox, quickmenuEditButton, quickmenuFileTypeList } = this.#elements;
        const extensionOptions = this.#extensionOptions;

        const useFileTypeFilter = quickmenuCheckbox.checked;

        await OptionsManager.setOption("useFileTypeFilter", useFileTypeFilter);
        extensionOptions.useFileTypeFilter = useFileTypeFilter;
        
        if(useFileTypeFilter) {
            if(!(extensionOptions.includedFilterFileTypes.length > 0 || extensionOptions.includeUnlistedFileTypes)) {
                this.#displayEditor();
            }
            else {
                quickmenuFileTypeList.classList.remove("ghost");
                quickmenuEditButton.disabled = false;
            }
        }
        else {
            quickmenuFileTypeList.classList.add("ghost");
            quickmenuEditButton.disabled = true;
        }
    }

    static #displayEditor() {
        const { editorOverlay, editorContainer } = this.#elements;
        const extensionOptions = this.#extensionOptions;

        if(extensionOptions.includeUnlistedFileTypes) {
            editorContainer.querySelector(`.file-type-checkbox[value='${"*"}']`).checked = true;
        }

        if(extensionOptions.includedFilterFileTypes.length > 0) {
            for(const fileType of extensionOptions.includedFilterFileTypes) {
                editorContainer.querySelector(`.file-type-checkbox[value='${fileType}']`).checked = true;    
            }

            for(const category of this.commonFileTypeMap) {
                this.#syncCategoryCheckbox(category[0], true);
            }
        }

        this.#validate(extensionOptions.includeUnlistedFileTypes || extensionOptions.includedFilterFileTypes.length > 0);

        editorOverlay.classList.remove("hidden");
    }

    static #onCategoryCheckboxChecked(event) {
        const { editorContainer } = this.#elements;

        const checkbox = event.srcElement;
        const isChecked = checkbox.checked;

        const fileTypeCheckboxes = editorContainer.querySelectorAll(`.file-type-checkbox[ft-category='${checkbox.value}']`);
        for(const item of fileTypeCheckboxes) {
            item.checked = isChecked;
        }

        this.#validate(isChecked);
    }

    static #onFileTypeCheckboxChecked(event) {
        const checkbox = event.srcElement;
        const isChecked = checkbox.checked;
        const category = checkbox.getAttribute("ft-category");

        if(category) {
            this.#syncCategoryCheckbox(category, isChecked);
        }

        this.#validate(isChecked);
    }

    static #syncCategoryCheckbox(category, categoryChecked) {
        const { editorContainer } = this.#elements;

        if(categoryChecked) {
            categoryChecked = !editorContainer.querySelector(`.file-type-checkbox[ft-category='${category}']:not(:checked)`)
        }

        editorContainer.querySelector(`.file-type-category-checkbox[value='${category}']`).checked = categoryChecked;
    }

    static #validate(isValid) {
        const { editorContainer, saveButton } = this.#elements;

        if(!isValid) {
            isValid = !!editorContainer.querySelector(".file-type-checkbox:is(:checked)");
        }

        saveButton.disabled = !isValid;
    }

    static async #save() {
        const { editorContainer  } = this.#elements;
        const extensionOptions = this.#extensionOptions;

        const includedFilterFileTypes = [];
        let includeUnlistedFileTypes = false;

        const includedFileTypeCheckboxes = editorContainer.querySelectorAll(".file-type-checkbox:is(:checked)");
        for(const checkbox of includedFileTypeCheckboxes) {
            if(checkbox.value == "*") {
                includeUnlistedFileTypes = checkbox.checked;
            }
            else {
                includedFilterFileTypes.push(checkbox.value);
            }
        }

        await OptionsManager.setOption("includedFilterFileTypes", includedFilterFileTypes);
        extensionOptions.includedFilterFileTypes = includedFilterFileTypes;

        await OptionsManager.setOption("includeUnlistedFileTypes", includeUnlistedFileTypes);
        extensionOptions.includeUnlistedFileTypes = includeUnlistedFileTypes;

        this.#syncMainControls(extensionOptions, true);

        this.#dismiss();
    }

    static #syncMainControls(extensionOptions, isInitialized) {
        const { quickmenuFileTypeList, quickmenuEditButton } = this.#elements;

        let fileTypeList = "...";

        if(isInitialized) {
            fileTypeList = extensionOptions.includedFilterFileTypes.concat(
                (extensionOptions.includeUnlistedFileTypes) ? ["*"] : []
            ).join(", ");
        }

        quickmenuFileTypeList.innerHTML = fileTypeList;

        if(extensionOptions.useFileTypeFilter) {
            quickmenuFileTypeList.classList.remove("ghost");
        }
        else {
            quickmenuFileTypeList.classList.add("ghost");
        }

        quickmenuEditButton.disabled = !extensionOptions.useFileTypeFilter;
    }

    static #cancel() {
        const { quickmenuCheckbox } = this.#elements;
        const extensionOptions = this.#extensionOptions

        const isInitialized = (extensionOptions.includedFilterFileTypes.length > 0 || extensionOptions.includeUnlistedFileTypes);

        if(!isInitialized) {
            OptionsManager.setOption("useFileTypeFilter", false);
            extensionOptions.useFileTypeFilter = false;

            quickmenuCheckbox.checked = false;
            this.#syncMainControls(extensionOptions, false);
        }

        this.#dismiss();
    }

    static #dismiss() {
        const { editorOverlay, editorContainer, saveButton } = this.#elements;
   
        editorOverlay.classList.add("hidden");

        const fileTypeCheckboxes = editorContainer.querySelectorAll(".file-type-checkbox");
        for(const checkbox of fileTypeCheckboxes) {
            checkbox.checked = false;
        }

        const fileTypeCategoryCheckboxes = editorContainer.querySelectorAll(".file-type-category-checkbox");
        for(const checkbox of fileTypeCategoryCheckboxes) {
            checkbox.checked = false;
        }

        saveButton.disabled = true;
    }

    static #displayNewFilterFileTypeDialog(event) {
        const { addFileTypeOverlay, addFileTypeControlLabel, addFileTypeTextbox, saveNewFileTypeButton } = this.#elements;
        saveNewFileTypeButton.value = event.srcElement.value;
        addFileTypeControlLabel.innerText = event.srcElement.getAttribute("ft-category-desc");
        addFileTypeOverlay.classList.remove("hidden");
        addFileTypeTextbox.focus();
    }

    static #onFileTypeInputKeyDown(event) {
        const key = event.key;
        const { value } = event.target;
        const extensionRegex = /^[a-zA-Z0-9]{1}$/;

        if(key.length == 1) {
            if(!(extensionRegex.test(key) && value.length < 5)) {
                event.preventDefault();
            }
        }
        else if(key == "Escape") {
            this.#dismissAddFileType(event);
        }
        else if(key == "Enter") {
            if(value.length > 2) {
                const targetCategoryId = this.#elements.saveNewFileTypeButton.value;
                this.#saveNewFileType(targetCategoryId);
            }
        }
    }

    static #onFileTypeInputTextChanged(event) {
        const { saveNewFileTypeButton } = this.#elements;
        const { value } = event.target;

        saveNewFileTypeButton.disabled = (value.length < 3);
    }

    static #onSaveNewFileTypeButtonClicked(event) {
        const targetCategoryId = event.srcElement.value;
        this.#saveNewFileType(targetCategoryId);
    }

    static async #saveNewFileType(targetCategoryId) {
        const { editorContainer, addFileTypeTextbox } = this.#elements;
        const newFileType = addFileTypeTextbox.value.toLowerCase();
        let priorCategoryId = null;

        const additionalFilterFileTypes = this.#extensionOptions.additionalFilterFileTypes;

        // Start optimistic, contrary to form...
        let isValid = true;

        // Test standard file types
        if(isValid) {
            test_standard:
            for(const category of this.commonFileTypeMap) {
                const [, entryList] = category;

                for(const [fileTypeId, itemList] of entryList) {
                    if(fileTypeId == newFileType || (itemList && itemList.includes(newFileType))){
                        isValid = false;
                        break test_standard;
                    }
                }
            }
        }

        // Test existing custom file types
        if(isValid) {
            test_custom:
            for(const [categoryId, entryList] of additionalFilterFileTypes) {
                for(const [fileTypeId, ] of entryList) {
                    if(fileTypeId == newFileType) {
                        if(categoryId == targetCategoryId) {
                            isValid = false;
                        }
                        else {
                            priorCategoryId = categoryId;

                            // Remove the html control
                            const priorControl = editorContainer.querySelector(`.file-type-control[control-id='${priorCategoryId}:${newFileType}']`);
                            priorControl.remove();

                            // Ensure prior category checkbox sync'd
                            this.#syncCategoryCheckbox(priorCategoryId, true);
                        }

                        break test_custom;
                    }
                }
            }
        }

        if(isValid) {
            const additionalFilterFileTypes = this.#extensionOptions.additionalFilterFileTypes;

            if(priorCategoryId) {
                const priorCategoryEntry = additionalFilterFileTypes.get(priorCategoryId);
                priorCategoryEntry.delete(newFileType);
            }

            const categoryEntry = additionalFilterFileTypes.get(targetCategoryId);
            categoryEntry.set(newFileType);

            await OptionsManager.setOption("additionalFilterFileTypes", additionalFilterFileTypes);

            // Add the html control
            const container = editorContainer.querySelector(`.file-type-category-container[ft-category='${targetCategoryId}']`);
            const control = this.#createFileTypeControl([newFileType], targetCategoryId, true);
            container.appendChild(control);
        }

        // Check the appropriate input
        this.#elements.editorContainer.querySelector(`.file-type-checkbox[value='${newFileType}']`).checked = true;

        this.#dismissAddFileType();

        this.#validate(true);
    }

    static #dismissAddFileType() {
        const { addFileTypeOverlay, addFileTypeControlLabel, addFileTypeTextbox, saveNewFileTypeButton } = this.#elements;
        addFileTypeOverlay.classList.add("hidden");
        addFileTypeTextbox.value = "";
        addFileTypeControlLabel.innerText = "";
        saveNewFileTypeButton.value = "";
    }

    static assembleFileTypeFilter() {
        const extensionOptions = this.#extensionOptions;

        const result = {
            selectedExtensions: new Set(extensionOptions.includedFilterFileTypes),
            listedExtensions: new Set(["--"]),
            includeUnlisted: extensionOptions.includeUnlistedFileTypes
        };

        const assembleListedExtensions = (set) => {
            for(let categoryEntry of set) {
                for(let fileTypeEntry of categoryEntry) {
                    if(fileTypeEntry[1]) {
                        for(const fileType of fileTypeEntry[1]) {
                            result.listedExtensions.add(fileType);
                        }
                    }
                    else {
                        result.listedExtensions.add(fileTypeEntry);
                    }
                }
            }
        };

        for(let set of [this.commonFileTypeMap, extensionOptions.additionalFilterFileTypes]) {
            assembleListedExtensions(set);
        }

        return result;
    }
}