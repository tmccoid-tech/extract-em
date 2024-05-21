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
  updateString(string) {
    let re = new RegExp(this.keyPrefix + "(.+?)__", "g");
    return string.replace(re, (matched) => {
      const key = matched.slice(this.keyPrefix.length, -2);
      let rv = this.extension
        ? this.extension.localeData.localizeMessage(key)
        : messenger.i18n.getMessage(key);
      return rv || matched;
    });
  },

  updateSubtreeSet(sourceDocument, node, selector, update) {
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

  updateSubtree(sourceDocument, node) {
    this.updateSubtreeSet(sourceDocument, node, `text()[contains(self::text(), "${this.keyPrefix}")]`, (text) => {
      if (text.nodeValue.includes(this.keyPrefix))
        text.nodeValue = this.updateString(text.nodeValue);
    });

    this.updateSubtreeSet(sourceDocument, node, `*/attribute::*[contains(., "${this.keyPrefix}")]`, (attr) => {
      if (attr.value.includes(this.keyPrefix))
        attr.value = this.updateString(attr.value);
    });
  },

  updateAnyDocument(sourceDocument, options = {}) {
    this.extension = null;
    this.keyPrefix = "__MSG_";
  
    if (options) {
      if (options.extension) this.extension = options.extension;
      if (options.keyPrefix) this.keyPrefix = options.keyPrefix;
    }
    
    this.updateSubtree(sourceDocument, sourceDocument);
  },

  updateDocument(options = {}) {
    this.updateAnyDocument(document, options);
  },
};