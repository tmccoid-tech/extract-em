import { OptionsManager } from "/module/optionsmanager.js";

document.addEventListener("DOMContentLoaded", async () => {
    i18n.updateDocument();

    const standardUiModeCheckbox = document.getElementById("standard-ui-mode-checkbox");
    const displayQuickMenuCheckbox = document.getElementById("display-quickmenu-checkbox");
    const extractImmediateCheckbox = document.getElementById("extract-immediate-checkbox");
    const extractImmediateSubfoldersCheckbox = document.getElementById("extract-immediate-subfolders-checkbox");
    const useSilentModeCheckbox = document.getElementById("use-silent-mode-checkbox");
    const preserveFolderStructureCheckbox = document.getElementById("preserve-folder-structure-checkbox");
    const defaultGroupingSelect = document.getElementById("default-grouping-select");
    const imagePreviewSelect = document.getElementById("image-preview-select");
    
    async function main() {
        standardUiModeCheckbox.addEventListener("change", onUserInteractionOptionChanged);
        displayQuickMenuCheckbox.addEventListener("change", onUserInteractionOptionChanged);
        extractImmediateCheckbox.addEventListener("change", onUserInteractionOptionChanged);
        
        extractImmediateSubfoldersCheckbox.addEventListener("change", onExtractImmediateSubfoldersOptionChanged);
        useSilentModeCheckbox.addEventListener("change", onUseSilentModeOptionChanged);
        preserveFolderStructureCheckbox.addEventListener("change", onPreserveFolderStructureOptionChanged);
        defaultGroupingSelect.addEventListener("change", onDefaultGroupingOptionChanged);
        imagePreviewSelect.addEventListener("change", onImagePreviewOptionChanged);

        const options = await OptionsManager.retrieve();

        standardUiModeCheckbox.checked = !(options.displayQuickMenu || options.extractImmediate);
        displayQuickMenuCheckbox.checked = options.displayQuickMenu;
        extractImmediateCheckbox.checked = options.extractImmediate;

        extractImmediateSubfoldersCheckbox.checked = options.includeSubfolders;
        useSilentModeCheckbox.checked = options.useSilentMode;
        preserveFolderStructureCheckbox.checked = options.preserveFolderStructure;
        defaultGroupingSelect.value = options.defaultGrouping;
        imagePreviewSelect.value = options.defaultImagePreview;

        extractImmediateSubfoldersCheckbox.disabled = !options.extractImmediate;
        useSilentModeCheckbox.disabled = !options.extractImmediate;
    }

    function onUserInteractionOptionChanged(event) {
        const mode = event.srcElement.value;
        const displayQuickMenu = (mode == "quickmenu");
        const extractImmediate = (mode == "immediate");

        OptionsManager.setOption("displayQuickMenu", displayQuickMenu);
        OptionsManager.setOption("extractImmediate", extractImmediate);
        OptionsManager.setOption("isInitialized", true);

        extractImmediateSubfoldersCheckbox.disabled = !extractImmediate;
        useSilentModeCheckbox.disabled= !extractImmediate;
    }

    function onExtractImmediateSubfoldersOptionChanged(event) {
        OptionsManager.setOption("includeSubfolders", extractImmediateSubfoldersCheckbox.checked);
    }

    function onUseSilentModeOptionChanged(event) {
        OptionsManager.setOption("useSilentMode", useSilentModeCheckbox.checked);
    }

    function onPreserveFolderStructureOptionChanged(event) {
        OptionsManager.setOption("preserveFolderStructure", preserveFolderStructureCheckbox.checked);
    }

    function onDefaultGroupingOptionChanged(event) {
        OptionsManager.setOption("defaultGrouping", defaultGroupingSelect.value);
    }

    function onImagePreviewOptionChanged(event) {
        OptionsManager.setOption("defaultImagePreview", imagePreviewSelect.value);
    }


    await main();
});