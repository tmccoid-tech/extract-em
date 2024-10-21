import { OptionsManager } from "/module/optionsmanager.js";

export class FilterManager {
    static groupedFileTypeMap = new Map([
        ["doc(x)", new Set(["doc", "docx"])],
        ["htm(l)", new Set(["htm", "html"])],
        ["ppt(x)", new Set(["ppt", "pptx"])],
        ["xls(x)", new Set(["xls", "xlsx"])],
        ["jp(e)g", new Set(["jpg", "jpeg"])],
        ["tif(f)", new Set(["tif", "tiff"])],
        ["mp(e)g", new Set(["mpg", "mpeg"])]
    ]);

    static commonFileTypeMap = new Map([
        ["~gen", new Set([
            "csv",
            "doc(x)",
            "eml",
            "htm(l)",
            "log",
            "ods",
            "odt",
            "pdf",
            "ppt(x)",
            "rtf",
            "txt",
            "xls(x)",
            "xml"
        ])],
        ["~img", new Set([
            "bmp",
            "gif",
            "ico",
            "jp(e)g",
            "png",
            "psd",
            "tif(f)"
        ])],
        ["~aud", new Set([
            "flac",
            "m4a",
            "mp3",
            "ogg",
            "wav",
            "wma"
        ])],
        ["~vid", new Set([
            "avi",
            "m4v",
            "mkv",
            "mov",
            "mp4",
            "mp(e)g",
            "vob",
            "wmv"
        ])]
    ]);

    static #elements;
    static #hasSecondaryControls = false;
    static #extensionOptions;
    static #fileTypeControlTemplate;

    static async initializeEditor(elements, extensionOptions) {
        this.#elements = elements;
        this.#extensionOptions = extensionOptions;
        this.#hasSecondaryControls = !!elements.secondaryCheckbox;

        elements.menuCheckbox.checked = extensionOptions.useFileTypeFilter;
        this.#syncMainControls(extensionOptions, (extensionOptions.includedFilterFileTypes.size > 0 || extensionOptions.includeUnlistedFileTypes));

        elements.menuCheckbox.addEventListener("change", (e) => this.#onMenuCheckboxChanged(e));
        elements.menuEditButton.addEventListener("click", (e) => this.#displayEditor(e));

        if(this.#hasSecondaryControls) {
            elements.secondaryCheckbox.checked = extensionOptions.useFileTypeFilter;
            elements.secondaryCheckbox.addEventListener("change", (e) => this.#onMenuCheckboxChanged(e));
            elements.secondaryEditButton.addEventListener("click", (e) => this.#displayEditor(e));
        }

        const templatesContainer = document.createElement("template");

        templatesContainer.innerHTML = await (await fetch("/module/filtering/filtertemplate.html")).text();

        const mainTemplate = templatesContainer.content.getElementById("filter-file-type-editor-template");
        this.#fileTypeControlTemplate = templatesContainer.content.getElementById("file-type-control-template");

        const editorPanel = mainTemplate.content.cloneNode(true);

        for(const categoryEntry of this.commonFileTypeMap) {
            const [categoryId, fileTypes] = categoryEntry;

            const itemContainer = editorPanel.querySelector(`.file-type-category-container[ft-category='${categoryId}']`);

            for(const fileType of fileTypes) {
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

        const fileTypeControl = result.querySelector(".file-type-control");
        fileTypeControl.setAttribute("control-id", `${categoryId}:${fileType}`);

        const fileTypeCheckbox = result.querySelector(".file-type-checkbox");
        fileTypeCheckbox.value = fileType;
        fileTypeCheckbox.setAttribute("ft-category", categoryId);
        fileTypeCheckbox.addEventListener("click", (e) => this.#onFileTypeCheckboxChecked(e));

        const fileTypeControlLabel = result.querySelector(".file-type-control-label");
        fileTypeControlLabel.innerText = fileType;

        if(isCustom) {
            fileTypeControlLabel.classList.add("custom");
        }

        return result;
    };


    static async #onMenuCheckboxChanged(event) {
        const { menuCheckbox, menuEditButton, menuFileTypeList, secondaryCheckbox, secondaryEditButton } = this.#elements;
        const extensionOptions = this.#extensionOptions;

        const useFileTypeFilter = event.srcElement.checked;

        await OptionsManager.setOption("useFileTypeFilter", useFileTypeFilter);
        extensionOptions.useFileTypeFilter = useFileTypeFilter;
        
        if(useFileTypeFilter) {
            if(!(extensionOptions.includedFilterFileTypes.size > 0 || extensionOptions.includeUnlistedFileTypes)) {
                this.#displayEditor();
            }
            else {
                menuFileTypeList.classList.remove("ghost");
                menuEditButton.disabled = false;
                if(this.#hasSecondaryControls) {
                    secondaryEditButton.disabled = false;
                }
            }
        }
        else {
            menuFileTypeList.classList.add("ghost");
            menuEditButton.disabled = true;
            if(this.#hasSecondaryControls) {
                secondaryEditButton.disabled = true;
            }
        }

        menuCheckbox.checked = useFileTypeFilter;
        secondaryCheckbox.checked = useFileTypeFilter;
    }

    static #displayEditor() {
        const { editorOverlay, editorContainer } = this.#elements;
        const extensionOptions = this.#extensionOptions;

        if(extensionOptions.includeUnlistedFileTypes) {
            editorContainer.querySelector(`.file-type-checkbox[value='${"*"}']`).checked = true;
        }

        if(extensionOptions.includedFilterFileTypes.size > 0) {
            for(const fileType of extensionOptions.includedFilterFileTypes) {
                editorContainer.querySelector(`.file-type-checkbox[value='${fileType}']`).checked = true;    
            }

            for(const [categoryId, ] of this.commonFileTypeMap) {
                this.#syncCategoryCheckbox(categoryId, true);
            }
        }

        this.#validate(extensionOptions.includeUnlistedFileTypes || extensionOptions.includedFilterFileTypes.size > 0);

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

        const includedFilterFileTypes = new Set();
        let includeUnlistedFileTypes = false;

        const includedFileTypeCheckboxes = editorContainer.querySelectorAll(".file-type-checkbox:is(:checked)");
        for(const checkbox of includedFileTypeCheckboxes) {
            if(checkbox.value == "*") {
                includeUnlistedFileTypes = checkbox.checked;
            }
            else {
                includedFilterFileTypes.add(checkbox.value);
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
        const { menuFileTypeList, menuEditButton, secondaryFileTypeList, secondaryEditButton } = this.#elements;

        let fileTypeList = "...";

        if(isInitialized) {
            fileTypeList = [...extensionOptions.includedFilterFileTypes].concat(
                (extensionOptions.includeUnlistedFileTypes) ? ["*"] : []
            ).join(", ");
        }

        menuFileTypeList.innerHTML = fileTypeList;
        if(this.#hasSecondaryControls) {
            secondaryFileTypeList.title = fileTypeList;
        }

        if(extensionOptions.useFileTypeFilter) {
            menuFileTypeList.classList.remove("ghost");
        }
        else {
            menuFileTypeList.classList.add("ghost");
        }

        menuEditButton.disabled = !extensionOptions.useFileTypeFilter;
        if(this.#hasSecondaryControls) {
            secondaryEditButton.disabled = !extensionOptions.useFileTypeFilter;
        }
    }

    static #cancel() {
        const { menuCheckbox, secondaryCheckbox } = this.#elements;
        const extensionOptions = this.#extensionOptions

        const isInitialized = (extensionOptions.includedFilterFileTypes.size > 0 || extensionOptions.includeUnlistedFileTypes);

        if(!isInitialized) {
            OptionsManager.setOption("useFileTypeFilter", false);
            extensionOptions.useFileTypeFilter = false;

            menuCheckbox.checked = false;
            if(this.#hasSecondaryControls) {
                secondaryCheckbox.checked = false;
            }

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

        const { additionalFilterFileTypes } = this.#extensionOptions;

        // Start optimistic, contrary to form...
        let isValid = true;

        // Test standard file types
        if(isValid) {
            test_standard:
            for(const [, fileTypes] of this.commonFileTypeMap) {

                for(const fileType of fileTypes) {
                    const groupedFileTypes = this.groupedFileTypeMap.get(fileType);

                    if(fileType == newFileType || (groupedFileTypes && groupedFileTypes.has(newFileType))){
                        isValid = false;
                        break test_standard;
                    }
                }
            }
        }

        // Test existing custom file types
        if(isValid) {
            test_custom:
            for(const [categoryId, fileTypes] of additionalFilterFileTypes) {
                for(const fileType of fileTypes) {
                    if(fileType == newFileType) {
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
            if(priorCategoryId) {
                const priorCategoryFileTypes = additionalFilterFileTypes.get(priorCategoryId);
                priorCategoryFileTypes.delete(newFileType);
            }

            const targetCategoryFileTypes = additionalFilterFileTypes.get(targetCategoryId);
            targetCategoryFileTypes.add(newFileType);

            await OptionsManager.setOption("additionalFilterFileTypes", additionalFilterFileTypes);

            // Add the html control
            const container = editorContainer.querySelector(`.file-type-category-container[ft-category='${targetCategoryId}']`);
            const control = this.#createFileTypeControl(newFileType, targetCategoryId, true);
            container.appendChild(control);
        }

        // Check the appropriate input
        editorContainer.querySelector(`.file-type-checkbox[value='${newFileType}']`).checked = true;

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
        const groupedFileTypeMap = this.groupedFileTypeMap;

        const result = {
            selectedExtensions: new Set(extensionOptions.includedFilterFileTypes),
            includeUnlisted: extensionOptions.includeUnlistedFileTypes,
            listedExtensions: null
        };

        const { selectedExtensions } = result;

        for(const [fileTypeId, fileTypes] of groupedFileTypeMap) {
            if(selectedExtensions.has(fileTypeId)) {
                selectedExtensions.delete(fileTypeId);

                for(const fileType of fileTypes) {
                    selectedExtensions.add(fileType);
                }
            }
        }

        if(result.includeUnlisted) {
            const listedExtensions = ["--"];

            const addFileTypes = (set) => {
                for(const [, fileTypes] of set) {
                    listedExtensions.push(...fileTypes.values());
                }
            };

            addFileTypes(this.commonFileTypeMap);
            addFileTypes(extensionOptions.additionalFilterFileTypes);
            addFileTypes(this.groupedFileTypeMap);

            result.listedExtensions = new Set(listedExtensions);
        }

        return result;
    }
}