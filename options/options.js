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
    const includeRemoteAttachmentsCheckbox = elem("include-remote-attachments-checkbox");
    
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
        listen(includeRemoteAttachmentsCheckbox, (e) => setOption(e, (c) => c.checked));

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
        includeRemoteAttachmentsCheckbox.checked = extensionOptions.includeRemoteAttachments;

        extractImmediateSubfoldersCheckbox.disabled = !extensionOptions.extractImmediate;
        useSilentModeCheckbox.disabled = !extensionOptions.extractImmediate;
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

    await main();
});