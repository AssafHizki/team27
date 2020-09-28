const LocalizedStrings = require('localized-strings').default;
const env = require('../environment/environment').env();
const translations = require('./translations.json');

function getCustomInterfaceLanguage() {
    return env.LOCALE
}

let strings = new LocalizedStrings(translations,
    {
        customLanguageInterface: getCustomInterfaceLanguage
    }
);

exports.getString = (key, var1, var2, var3, var4, var5, var6) => {
    return strings.formatString(key, var1, var2, var3, var4, var5, var6)
}