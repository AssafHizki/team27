const translations = require('./translations.json');

describe('Translations', () => {
    it('should check all translations exist', async (done) => {
        const eng = translations['en_US']
        Object.keys(translations).forEach(lang => {
            expect(Object.keys(eng).length).toEqual(Object.keys(translations[lang]).length)
        });
        Object.keys(eng).forEach(key => {
            Object.keys(translations).forEach(lang => {
                expect(translations[lang][key].length).toBeGreaterThan(2)
            });
        });
        done();
    });
})