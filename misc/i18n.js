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

  updateSubtree(node) {
    const queries = [
      { xpathExpression: `descendant::text()[contains(self::text(), "${this.keyPrefix}")]`, value: (text) => text.nodeValue, set: (text, val) => { text.nodeValue = val; } },
      { xpathExpression: `descendant::*/attribute::*[contains(., "${this.keyPrefix}")]`, value: (attr) => attr.value, set: (attr, val) => { attr.value = val; } }
    ];

    queries.forEach((query) => {
      const items = document.evaluate(query.xpathExpression, node, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

      for (let i = 0, maxi = items.snapshotLength; i < maxi; i++) {
        const item = items.snapshotItem(i);
        const value = query.value(item);
        if (value.includes(this.keyPrefix))
          query.set(item, this.updateString(value));
      }
    });
  },

  updateDocument(options = {}) {
    this.extension = null;
    this.keyPrefix = "__MSG_";
    if (options) {
      if (options.extension) this.extension = options.extension;
      if (options.keyPrefix) this.keyPrefix = options.keyPrefix;
    }
    this.updateSubtree(document);
  },
};
