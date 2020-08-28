const translations = require('./translations.json');

describe('Translations', () => {
    it.skip('should check all translations exist', async (done) => {
        const eng = translations['en_US']
        Object.keys(translations).forEach(lang => {
            expect(Object.keys(eng).length).toEqual(Object.keys(translations[lang]).length)
        });
        // TODO: Compare names of keys
        // TODO: Make sure values are not empty
        done();
    });
})