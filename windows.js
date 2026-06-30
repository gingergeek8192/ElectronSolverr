import { app, ipcMain, Menu, BrowserWindow as ElectronBrowserWindow } from "electron";

const windows = {
    Tags: new Map(),

    render: app.isRender = () => !!windows.Tags.size,

    BrowserWindow: class extends ElectronBrowserWindow {
        constructor(tag, options) {
            super(options);

            this.tag = tag;
            windows.Tags.set(tag, this);

            this.on("closed", () => {
                windows.Tags.delete(tag);
            });
        }

        /**
         * Returns array of tagged BrowserWindows
         * 
         * @returns {BrowserWindow[]}
         */
        static getAllTaggedWindows() {
            return Array.from(windows.Tags.values());
        }


        /**
         * Returns array of tags 
         * 
         * @returns {string[]}
         */
        static getAllWindowTags() {
            return Array.from(windows.Tags.keys());
        }


        /**
         * Returns the string tag assigned to this window instance
         *
         * @returns {string}
         */
        get getTag() {
            return this.tag
        }


        /**
         * Returns a window by its given string tag
         *
         * @param {string} tag
         * @returns {BrowserWindow}
         */
        static fromTag(tag) {
            return windows.Tags.get(tag) ?? false;
        }


        /**
         * Checks if a window with the given tag exists
         *
         * @param {string} tag
         * @returns {boolean}
         */
        static isWindow(tag) {
            return windows.Tags.has(tag);
        }


        /**
         * Ensures an existing tagged window is destroyed before
         * creating a new instance
         * 
         * @param {string} tag 
         */
        static oneWindow(tag, options) {
            if (this.isWindow(tag)) {
                const win = this.fromTag(tag)
                if (win && !win.isDestroyed()) win.destroy()
            }
            return new this(tag, options)
        }


        /**
         * Close all tagged windows
         * 
         */
        static closeAll() {
            for (const win of this.getAllTaggedWindows()) {
                if (win && !win.isDestroyed()) win.destroy()
            }
        }
    }
};

export const BrowserWindow = windows.BrowserWindow;
export default windows;