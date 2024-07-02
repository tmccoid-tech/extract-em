import { OptionsManager } from "/module/optionsmanager.js";

document.addEventListener("DOMContentLoaded", async () => {
    i18n.updateDocument();

    const elem = (id) => document.getElementById(id);

    const standardUiModeCheckbox = elem("standard-ui-mode-checkbox");
    const displayQuickMenuCheckbox = elem("display-quickmenu-checkbox");
    const extractImmediateCheckbox = elem("extract-immediate-checkbox");
    const extractImmediateSubfoldersCheckbox = elem("extract-immediate-subfolders-checkbox");
    const useSilentModeCheckbox = elem("use-silent-mode-checkbox");
    const preserveFolderStructureCheckbox = elem("preserve-folder-structure-checkbox");
    const useEnhancedLoggingCheckbox = elem("use-enhanced-logging-checkbox");
    const defaultGroupingSelect = elem("default-grouping-select");
    const imagePreviewSelect = elem("image-preview-select");
    const includeEmbedsCheckbox = elem("include-embeds-checkbox");

    const useFilenamePatternCheckbox = elem("use-filename-pattern-checkbox");
    const filenamePatternDisplayTextbox = elem("filename-pattern-display-textbox");
    const filenamePatternEditButton = elem("filename-pattern-edit-button");
    
    async function main() {
        listen(standardUiModeCheckbox, onUserInteractionOptionChanged);
        listen(displayQuickMenuCheckbox, onUserInteractionOptionChanged);
        listen(extractImmediateCheckbox, onUserInteractionOptionChanged);

        listen(extractImmediateSubfoldersCheckbox, (e) => setOption(e, (c) => c.checked));
        listen(useSilentModeCheckbox, (e) => setOption(e, (c) => c.checked));
        listen(preserveFolderStructureCheckbox, (e) => setOption(e, (c) => c.checked));
        listen(useEnhancedLoggingCheckbox, (e) => setOption(e, (c) => c.checked));
        listen(defaultGroupingSelect, (e) => setOption(e));
        listen(imagePreviewSelect, (e) => setOption(e));
        listen(includeEmbedsCheckbox, (e) => setOption(e, (c) => c.checked));

        listen(useFilenamePatternCheckbox, onFilenamePatternOptionChanged);

        const extensionOptions = await OptionsManager.retrieve();

        standardUiModeCheckbox.checked = !(extensionOptions.displayQuickMenu || extensionOptions.extractImmediate);
        displayQuickMenuCheckbox.checked = extensionOptions.displayQuickMenu;
        extractImmediateCheckbox.checked = extensionOptions.extractImmediate;

        extractImmediateSubfoldersCheckbox.checked = extensionOptions.includeSubfolders;
        useSilentModeCheckbox.checked = extensionOptions.useSilentMode;
        preserveFolderStructureCheckbox.checked = extensionOptions.preserveFolderStructure;
        useEnhancedLoggingCheckbox.checked = extensionOptions.useEnhancedLogging;
        defaultGroupingSelect.value = extensionOptions.defaultGrouping;
        imagePreviewSelect.value = extensionOptions.defaultImagePreview;
        includeEmbedsCheckbox.checked = extensionOptions.includeEmbeds;

        extractImmediateSubfoldersCheckbox.disabled = !extensionOptions.extractImmediate;
        useSilentModeCheckbox.disabled = !extensionOptions.extractImmediate;

        useFilenamePatternCheckbox.checked = options.useFilenamePattern;
        filenamePatternDisplayTextbox.value = options.filenamePattern;
    }

    function listen(element, handler) {
        element.addEventListener("change", handler);
    }

    function setOption(event, getValue = (c) => c.value) {
        const element = event.srcElement;
        const optionName = element.getAttribute("option-name");
        OptionsManager.setOption(optionName, getValue(element));
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

    function onFilenamePatternOptionChanged(event) {
        if(useFilenamePatternCheckbox.checked) {
            if(filenamePatternDisplayTextbox.value.length == 0) {
                // Open FP editor
            }
            else {
                filenamePatternEditButton.removeAttribute("disabled");
            }
        }
        else {
            filenamePatternEditButton.setAttribute("disabled", "disabled");
        }
    }

    await main();
});