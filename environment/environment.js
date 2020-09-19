const VERSION = '1.2.0'

module.exports = {
    env: (() => {
        let env;
        switch(process.env.CLIENT) {
            case 'prod':
                env = require('./environment.prod').env;
                env.ENV_NAME = 'Production';
                break;
            case 'batmelech':
                env = require('./environment.batmelech').env;
                env.ENV_NAME = 'BATMELECH';
                break;
            case 'maan':
                env = require('./environment.maan').env;
                env.ENV_NAME = 'MAAN';
                break;
            case 'staging':
                env = require('./environment.staging').env;
                env.ENV_NAME = 'Staging';
                break;
            case 'test':
                env = require('./environment.mock').env;
                env.ENV_NAME = 'Test';
                break;
            default:

        }
        env.VERSION = VERSION
        env.AMPLITUDE_BASE_URL = 'https://api.amplitude.com/2/httpapi'
        console.log(`Loading environment ${env.ENV_NAME} (${env.VERSION})`)
        return env
    })
};
