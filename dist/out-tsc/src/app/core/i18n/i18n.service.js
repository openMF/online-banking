import { __decorate } from "tslib";
/** Angular Imports */
import { Injectable } from '@angular/core';
/** Custom Services */
import { Logger } from '../logger/logger.service';
/** Other Imports */
import { includes } from 'lodash';
import * as enUS from '../../../translations/en-US.json';
/** Initialize Logger */
const log = new Logger('I18nService');
/**
 * Pass-through function to mark a string for translation extraction.
 * Running `npm translations:extract` will include the given string by using this.
 * @param {string} s The string to extract for translation.
 * @return {string} The same string.
 */
export function extract(s) {
    return s;
}
let I18nService = class I18nService {
    constructor(translateService) {
        this.translateService = translateService;
        /** Key to store current language of application in local storage. */
        this.languageStorageKey = 'mifosXLanguage';
        // Embed languages to avoid extra HTTP requests
        translateService.setTranslation('en-US', enUS);
        // translateService.setTranslation('fr-FR', frFR);
    }
    /**
     * Initializes i18n for the application.
     * Loads language from local storage if present, or sets default language.
     * @param {!string} defaultLanguage The default language to use.
     * @param {Array.<String>} supportedLanguages The list of supported languages.
     */
    init(defaultLanguage, supportedLanguages) {
        this.defaultLanguage = defaultLanguage;
        this.supportedLanguages = supportedLanguages;
        this.language = '';
        this.translateService.onLangChange
            .subscribe((event) => { localStorage.setItem(this.languageStorageKey, event.lang); });
    }
    /**
     * Sets the current language.
     * Note: The current language is saved to the local storage.
     * If no parameter is specified, the language is loaded from local storage (if present).
     * @param {string} language The IETF language code to set.
     */
    set language(language) {
        language = language || localStorage.getItem(this.languageStorageKey) || this.translateService.getBrowserCultureLang();
        let isSupportedLanguage = includes(this.supportedLanguages, language);
        // If no exact match is found, search without the region
        if (language && !isSupportedLanguage) {
            language = language.split('-')[0];
            language = this.supportedLanguages.find(supportedLanguage => supportedLanguage.startsWith(language)) || '';
            isSupportedLanguage = Boolean(language);
        }
        // Fallback if language is not supported
        if (!isSupportedLanguage) {
            language = this.defaultLanguage;
        }
        log.debug(`Language set to ${language}`);
        this.translateService.use(language);
    }
    /**
     * Gets the current language.
     * @return {string} The current language code.
     */
    get language() {
        return this.translateService.currentLang;
    }
};
I18nService = __decorate([
    Injectable()
], I18nService);
export { I18nService };
//# sourceMappingURL=i18n.service.js.map