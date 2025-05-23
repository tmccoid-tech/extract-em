/*
 * This file is provided by the addon-developer-support repository at
 * https://github.com/thundernest/addon-developer-support
 *
 * For usage descriptions, please check:
 * https://github.com/thundernest/addon-developer-support/tree/master/scripts/i18n
 *
 * Version 1.1
 *
 * Derived from:
 * http://github.com/piroor/webextensions-lib-l10n
 *
 * Original license:
 * The MIT License, Copyright (c) 2016-2019 YUKI "Piro" Hiroshi
 *
 */

var i18n = {

  i18nAttrRegex: /^data-i18n-(?<target>.*)/,

  propertyMapping: new Map([
    ["textcontent", "textContent"]
  ]),

  getTranslation(placeholder) {
    const prefixRegex = new RegExp(this.keyPrefix + "(.+?)__", "g");
    
    return placeholder.replace(prefixRegex, (matched) => {
      const key = matched.slice(this.keyPrefix.length, -2);

      const result = this.extension
        ? this.extension.localeData.localizeMessage(key)
        : messenger.i18n.getMessage(key);

      return result || matched;
    });
  },

  updateSubtreeSet (sourceDocument, node, selector, update) {
    const items = sourceDocument.evaluate(
      `descendant::${selector}`,
      node,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null
    );

    for (let i = 0, maxi = items.snapshotLength; i < maxi; i++) {
      update(items.snapshotItem(i));
    }
  },

  updateSubtree (sourceDocument, node) {
    const { keyPrefix, updateSubtreeSet, i18nAttrRegex, propertyMapping } = this;

    // Update element properties (including textContent) or attributes based on data-i18n-* attributes assigned to the element
    updateSubtreeSet(sourceDocument, node, `*/@*[starts-with(name(), "data-i18n-")][contains(., "${keyPrefix}")]`, (attr) => {
      const placeholder = attr.value;

      if (placeholder.includes(keyPrefix)) {
        const value = this.getTranslation(placeholder);
        const { ownerElement } = attr;
        let { target } = i18nAttrRegex.exec(attr.name).groups;

        if(propertyMapping.has(target)) {
          target = propertyMapping.get(target);
        }

        // If the target member is a property...
        if(typeof ownerElement[target] !== undefined) {
          ownerElement[target] = value;
        }
        // Otherwise, assume it is an attribute
        else {
          ownerElement.setAttribute(target, value);
        }
      }
    });

    // Update text nodes containing __MSG_*__ placeholders
    updateSubtreeSet(sourceDocument, node, `text()[contains(self::text(), "${keyPrefix}")]`, (text) => {
      if (text.nodeValue.includes(keyPrefix))
        text.nodeValue = this.getTranslation(text.nodeValue);
    });

    // Update element attributes (excluding data-i18n-*) containing __MSG_*__ placeholders
    updateSubtreeSet(sourceDocument, node, `*/@*[not(starts-with(name(), "data-i18n-"))][contains(., "${keyPrefix}")]`, (attr) => {
      if (attr.value.includes(keyPrefix))
        attr.value = this.getTranslation(attr.value);
    });
  },

  updateAnyDocument (sourceDocument, options = {}) {
    this.extension = null;
    this.keyPrefix = "__MSG_";
  
    if (options) {
      if (options.extension) this.extension = options.extension;
      if (options.keyPrefix) this.keyPrefix = options.keyPrefix;
    }
    
    this.updateSubtree(sourceDocument, sourceDocument);
  },

  updateDocument (options = {}) {
    this.updateAnyDocument(document, options);
  }
};