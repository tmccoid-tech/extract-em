/*
 * Derived from:
 *
 * http://github.com/piroor/webextensions-lib-l10n
 * https://github.com/thunderbird/webext-support/blob/master/modules/i18n/i18n.mjs
 *
 * Original license:
 * The MIT License, Copyright (c) 2016-2019 YUKI "Piro" Hiroshi
 *
 */

export const i18n = ((document, messenger) => {

    // Private members
    const i18nAttrRegex = /^data-i18n-(?<target>.*)/;

    const propertyMapping = new Map([
        ["textcontent", "textContent"]
    ]);

    let _extension = null;
    let _keyPrefix = "__MSG_";
    let _keyErrorText = "*** i18n error ***";

    const getTranslation = (placeholder) => {
        const prefixRegex = new RegExp(_keyPrefix + "(.+?)__", "g");

        return placeholder.replace(prefixRegex, (matched) => {
            const key = matched.slice(_keyPrefix.length, -2);

            const result = _extension
                ? _extension.localeData.localizeMessage(key)
                : messenger.i18n.getMessage(key);

            return result || matched;
        });
    };

    const updateSubtreeSet = (sourceDocument, node, selector, update) => {
        const items = sourceDocument.evaluate(
            `descendant::${selector}`,
            node,
            null,
            XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
            null
        );

        for (let i = 0, count = items.snapshotLength; i < count; i++) {
            update(items.snapshotItem(i));
        }
    };

    const updateSubtree = (sourceDocument, node) => {
        // Update element properties (including textContent) or attributes based on data-i18n-* attributes assigned to the element
        updateSubtreeSet(sourceDocument, node, `*/@*[starts-with(name(), "data-i18n-")][contains(., "${_keyPrefix}")]`, (attr) => {
            const placeholder = attr.value;

            if (placeholder.includes(_keyPrefix)) {
                const value = getTranslation(placeholder);
                const { ownerElement } = attr;
                let { target } = i18nAttrRegex.exec(attr.name).groups;

                if (propertyMapping.has(target)) {
                    target = propertyMapping.get(target);
                }

                // If the target member is a property...
                if (typeof ownerElement[target] !== undefined) {
                    ownerElement[target] = value;
                }
                // Otherwise, assume it is an attribute
                else {
                    ownerElement.setAttribute(target, value);
                }
            }
        });

        // Update text nodes containing __MSG_*__ placeholders
        updateSubtreeSet(sourceDocument, node, `text()[contains(self::text(), "${_keyPrefix}")]`, (text) => {
            if (text.nodeValue.includes(_keyPrefix))
                text.nodeValue = getTranslation(text.nodeValue);
        });

        // Update element attributes (excluding data-i18n-*) containing __MSG_*__ placeholders
        updateSubtreeSet(sourceDocument, node, `*/@*[not(starts-with(name(), "data-i18n-"))][contains(., "${_keyPrefix}")]`, (attr) => {
            if (attr.value.includes(_keyPrefix))
                attr.value = getTranslation(attr.value);
        });
    };

    // Public members
    const updateAnyDocument = (sourceDocument, options = {}) => {
        if (options) {
            if (options.extension)
                _extension = options.extension;
            if (options.keyPrefix)
                _keyPrefix = options.keyPrefix;
        }

        updateSubtree(sourceDocument, sourceDocument);
    };

    const updateDocument = (options = {}) => {
        updateAnyDocument(document, options);
    };


    return {
        updateAnyDocument: updateAnyDocument,
        updateDocument: updateDocument
    };

})(document, messenger);