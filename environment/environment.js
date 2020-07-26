const IS_PROD = process.env.IS_PROD || false
const VERSION = '1.0.0'

module.exports = {
    env: (() => {
        let env;
        const prod = IS_PROD === "true"
        console.log(`Loading environment IS_PROD=${prod}`)
        if (prod) {
            env = require('./environment.prod').env;
            env.ENV_NAME = 'Production';
        } else {
            env = require('./environment.staging').env;
            env.ENV_NAME = 'Staging';
        }
        env.VERSION = VERSION
        return env
    })
};
