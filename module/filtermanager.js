import { OptionsManager } from "/module/optionsmanager.js";

export class FilterManager {
    static commonFileTypeMap = new Map([
        ["~doc", new Map([
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

    static #editorContainer;
    static #extensionOptions;
    static #onDismiss;

    static async initializeEditor(container, extensionOptions, onDismiss) {
        this.#onDismiss = (dismiss) => onDismiss(dismiss);

        const templatesContainer = document.createElement("template");

        templatesContainer.innerHTML = await (await fetch("/module/filtertemplate.html")).text();

        const mainTemplate = templatesContainer.content.getElementById("filter-file-type-editor-template");
        const fileTypeControlTemplate = templatesContainer.content.getElementById("file-type-control-template");

        const editorPanel = mainTemplate.content.cloneNode(true);

        const createFileTypeControl = (fileType, categoryId, isCustom = false) => {
            const result = fileTypeControlTemplate.content.cloneNode(true);

            const fileTypeId = fileType[0];

            const fileTypeCheckbox = result.querySelector(".file-type-checkbox");
            fileTypeCheckbox.value = fileTypeId;
            fileTypeCheckbox.setAttribute("ft-category", categoryId);
            fileTypeCheckbox.addEventListener("click", (e) => this.onFileTypeCheckboxChecked(e));

            const fileTypeControlLabel = result.querySelector(".file-type-control-label");
            fileTypeControlLabel.innerText = fileTypeId;

            if(isCustom) {
                fileTypeControlLabel.classList.add("custom");
            }

            return result;
        };

        for(const category of this.commonFileTypeMap) {
            const categoryId = category[0];

            const itemContainer = editorPanel.querySelector(`.file-type-category-container[ft-category='${categoryId}']`);

            for(const fileType of category[1]) {
                const fileTypeControl = createFileTypeControl(fileType, categoryId);
                itemContainer.appendChild(fileTypeControl);
            }

            const customFileTypes = extensionOptions.additionalFilterFileTypes.get(categoryId);
            for(const fileType of customFileTypes) {
                const fileTypeControl = createFileTypeControl(fileType, categoryId);
                itemContainer.appendChild(fileTypeControl);
            }

            const fileTypeCategoryCheckbox = editorPanel.querySelector(`.file-type-category-checkbox[value='${categoryId}']`);
            fileTypeCategoryCheckbox.addEventListener("click", (e) => this.onCategoryCheckboxChecked(e));
        }

        editorPanel.querySelector("#filter-save-button").addEventListener("click", async (e) => this.#onDismiss(() => this.save()));
        editorPanel.querySelector("#filter-cancel-button").addEventListener("click", async (e) => this.#onDismiss(() => this.dismiss()));

        container.appendChild(editorPanel);

        this.#editorContainer = container;
        this.#extensionOptions = extensionOptions;
    }

    static displayEditor() {
        const extensionOptions = this.#extensionOptions;

        if(extensionOptions.includeUnlistedFileTypes) {
            this.#editorContainer.querySelector(`.file-type-checkbox[value='${"*"}']`).checked = true;
        }

        if(extensionOptions.includedFilterFileTypes.length > 0) {
            for(const fileType of extensionOptions.includedFilterFileTypes) {
                this.#editorContainer.querySelector(`.file-type-checkbox[value='${fileType}']`).checked = true;    
            }

            for(const category of this.commonFileTypeMap) {
                this.syncCategoryCheckbox(category[0], true);
            }
        }

        this.validate(extensionOptions.includeUnlistedFileTypes || extensionOptions.includedFilterFileTypes.length > 0);

        document.getElementById("filter-overlay").classList.remove("hidden");
    }

    static onCategoryCheckboxChecked(event) {
        const checkbox = event.srcElement;
        const isChecked = checkbox.checked;

        const fileTypeCheckboxes = this.#editorContainer.querySelectorAll(`.file-type-checkbox[ft-category='${checkbox.value}']`);
        for(const item of fileTypeCheckboxes) {
            item.checked = isChecked;
        }

        this.validate(isChecked);
    }

    static onFileTypeCheckboxChecked(event) {
        const checkbox = event.srcElement;
        const isChecked = checkbox.checked;
        const category = checkbox.getAttribute("ft-category");

        this.syncCategoryCheckbox(category, isChecked);

        this.validate(isChecked);
    }

    static syncCategoryCheckbox(category, categoryChecked) {
        if(categoryChecked) {
            categoryChecked = !this.#editorContainer.querySelector(`.file-type-checkbox[ft-category='${category}']:not(:checked)`)
        }

        this.#editorContainer.querySelector(`.file-type-category-checkbox[value='${category}']`).checked = categoryChecked;
    }

    static validate(isValid) {
        if(isValid) {
            isValid = !!this.#editorContainer.querySelector(".file-type-checkbox:is(:checked)");
        }

        this.#editorContainer.querySelector("#filter-save-button").disabled = !isValid;
    }

    static async save() {
        const includedFilterFileTypes = [];
        const includeUnlistedFileTypes = false;
        const extensionOptions = this.#extensionOptions;

        const includedFileTypeCheckboxes = this.#editorContainer.querySelectorAll(".file-type-checkbox:is(:checked)");
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

        await this.dismiss();

        return true;
    }

    static async dismiss() {
        const fileTypeCheckboxes = this.#editorContainer.querySelectorAll(".file-type-checkbox");
        for(const checkbox of fileTypeCheckboxes) {
            checkbox.checked = false;
        }

        const fileTypeCategoryCheckboxes = this.#editorContainer.querySelectorAll(".file-type-category-checkbox");
        for(const checkbox of fileTypeCategoryCheckboxes) {
            checkbox.checked = false;
        }

        this.#editorContainer.querySelector("#filter-save-button").disabled = true;

        return false;
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