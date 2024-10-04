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

        for(const category of this.commonFileTypeMap) {
            const itemContainer = editorPanel.querySelector(`.file-type-category-container[ft-category='${category[0]}']`);

            for(const fileType of category[1]) {
                const fileTypeControl = fileTypeControlTemplate.content.cloneNode(true);

                const fileTypeId = fileType[0];

                const fileTypeCheckbox = fileTypeControl.querySelector(".file-type-checkbox");
                fileTypeCheckbox.value = fileTypeId;
                fileTypeCheckbox.setAttribute("ft-category", category[0]);
                fileTypeCheckbox.addEventListener("click", (e) => this.onFileTypeCheckboxChecked(e));


                const fileTypeControlLabel = fileTypeControl.querySelector(".file-type-control-label");
                fileTypeControlLabel.innerText = fileTypeId;

                itemContainer.appendChild(fileTypeControl);
            }


            const fileTypeCategoryCheckbox = editorPanel.querySelector(`.file-type-category-checkbox[value='${category[0]}']`);
            fileTypeCategoryCheckbox.addEventListener("click", (e) => this.onCategoryCheckboxChecked(e));
        }

        container.appendChild(editorPanel);

        this.editorContainer = container;
    }

    static displayEditor(extensionOptions) {

    }

    static onCategoryCheckboxChecked(event) {
        const checkbox = event.srcElement;

        const fileTypeCheckboxes = this.editorContainer.querySelectorAll(`.file-type-checkbox[ft-category='${checkbox.value}']`)
        for(const item of fileTypeCheckboxes) {
            item.checked = checkbox.checked;
        }
    }

    static onFileTypeCheckboxChecked(event) {
        alert("FT clicked!");
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