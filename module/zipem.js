export class ZipEm {
    #useWebWorkers = false;
    #zipWriter;

    constructor(useWebWorkers = false) {
        this.#useWebWorkers = useWebWorkers;

        this.#zipWriter = new zip.ZipWriter(
            new zip.BlobWriter("application/zip"),
            { bufferedWrite: true, useCompressionStream: false }
        );
    }

    async add(fileName, fileData, creationDate) {
        await this.#zipWriter.add(
            fileName,
            new zip.BlobReader(fileData),
            { creationDate: creationDate, useWebWorkers: this.#useWebWorkers }
        );
    }

    async complete() {
        return await this.#zipWriter.close();
    }
}