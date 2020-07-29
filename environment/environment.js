const VERSION = '1.1.0'

module.exports = {
    env: (() => {
        let env;
        switch(process.env.CLIENT) {
            case 'prod':
                env = require('./environment.prod').env;
                env.ENV_NAME = 'Production';
                break;
            case 'maan':
                env = require('./environment.maan').env;
                env.ENV_NAME = 'MAAN';
                break;
            case 'staging':
                env = require('./environment.staging').env;
                env.ENV_NAME = 'Staging';
                break;
            default:
                
        }
        env.VERSION = VERSION
        console.log(`Loading environment ${env.ENV_NAME} (${env.VERSION})`)
        return env
    })
};
