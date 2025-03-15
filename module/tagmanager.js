export class TagManager {
    static #tag = {
        key: "576EF466-E74E-4C2B-A112-D780818AD958".toLowerCase(),
        title: "~EE!: Extracted",
        color: "#94642a"
    };

    static async #createTag(key, title, color) {
        await messenger.messages.tags.create(key, title, color);
    }

    static async initializeGlobalTag() {
        const { key, title, color } = this.#tag;

        const tagList = await messenger.messages.tags.list();

        if(tagList.some((tag) => tag.key == key)) {
            await messenger.messages.tags.delete(key);
        }

        await this.#createTag(key, title, color);
    }

    static async resetExtractedTag() {
        const { key, title, color } = this.#tag;

        const tagList = await messenger.messages.tags.list();

    }

    static isTagged(tags) {
        return tags.includes(this.#tag.key);
    }

    static tag(messageId) {
        
    }
}