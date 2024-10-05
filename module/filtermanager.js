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

    static editorContainer;

    static async initializeEditor(container, extensionOptions) {
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

        container.appendChild(editorPanel);

        this.editorContainer = container;
    }

    static displayEditor(extensionOptions) {

        // Remove hidden class from overlay
    }

    static onCategoryCheckboxChecked(event) {
        const checkbox = event.srcElement;
        const isChecked = checkbox.checked;

        const fileTypeCheckboxes = this.editorContainer.querySelectorAll(`.file-type-checkbox[ft-category='${checkbox.value}']`);
        for(const item of fileTypeCheckboxes) {
            item.checked = isChecked;
        }

        this.validate(isChecked);
    }

    static onFileTypeCheckboxChecked(event) {
        const checkbox = event.srcElement;
        const isChecked = checkbox.checked;
        const category = checkbox.getAttribute("ft-category");
        let categoryChecked = isChecked;

        if(isChecked) {
            categoryChecked = !this.editorContainer.querySelector(`.file-type-checkbox[ft-category='${category}']:not(:checked)`)
        }

        this.editorContainer.querySelector(`.file-type-category-checkbox[value='${category}']`).checked = categoryChecked;

        this.validate(isChecked);
    }

    static validate(isValid) {
        if(isValid) {
            isValid = !!this.editorContainer.querySelector(".file-type-checkbox:is(:checked)");
        }

        this.editorContainer.querySelector("#filter-save-button").disabled = !isValid;
    }

    static save() {
        const includedFilterFileTypes = [];
        const includeUnlistedFileTypes = false;

        const includedFileTypeCheckboxes = this.editorContainer.querySelectorAll(".file-type-checkbox:is(:checked)");
        for(const checkbox of includedFileTypeCheckboxes) {
            if(checkbox.value == "*") {
                includeUnlistedFileTypes = checkbox.checked;
            }
            else {
                includedFilterFileTypes.push(checkbox.value);
            }
        }

        //TODO: Store options
        // Dismiss modal dialog
    }

    static cancel() {
        // Dismiss modal dialog
    }

    static assembleFileTypeFilter(extensionsOptions) {
        const result = {
            selectedExtensions: extensionOptions.includedFilterFileTypes,
            listedExtensions: ["--"],
            includeUnlisted: extensionOptions.includeUnlistedFileTypes
        };

        const assembleListedExtensions = (set) => {
            for(let categoryEntry of set) {
                for(let item of categoryEntry) {
                    if(item[1]) {
                        result.listedExtensions.push(...item[1])
                    }
                    else {
                        result.push(item);
                    }
                }
            }
        };

        for(let set of [commonFileTypeMap, extensionOptions.additionalFilterFileTypes]) {
            assembleListedExtensions(set);
        }

        return result;
    }
}