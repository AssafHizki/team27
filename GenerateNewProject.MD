## Server
*  Create a new Google Cloud Project
* [Enable the necessary APIs](https://www.serverless.com/framework/docs/providers/google/guide/credentials#enable-the-necessary-apis)
* [Get credentials & assign roles](https://www.serverless.com/framework/docs/providers/google/guide/credentials#get-credentials--assign-roles)
* After deployment, enable public access (Select function -> Permissions -> Add Member -> allUsers -> Cloud Functions Invoker). Check if this step can be automated using serverless framework


## Database
* Create new redis DB
* Get the following data for server config: host name, port, secret


## Telegram
* Create new bot with BotFather: /newbot and add the token to the config
* Update the commands:
/mybots -> Edit Bot -> Edit Commands:

```
take_conversation - Get conversation from pending queue
end_conversation - End current conversation
get_pending_users - Get list of pending users
get_registered - See who is registered on the platform
register - Register to platform
unregister - Unregister to platform
```


## Connect server to Telegram
* POST https://api.telegram.org/bot<BOTTOKEN>/setwebhook?url=<SERVER_URL>/volunteerMessage


## Client
* Get client base URL for server config


## Configuration file final result
```javascript
module.exports = {
    env: {
        TELEGRAM_BOT_TOKEN: '',
        LOG_DEST: '', // (deprecated) Only if sending logs to Telegram
        REDIS_PORT: '',
        REDIS_HOST: '',
        REDIS_PASSWORD: '',
        DB_PREFIX: '',
        CLIENT_BASE_URL: '',
        REGISTRATION_SECRET: '',
        GMAIL_USER: '', // Optional
        GMAIL_PASS: '', // Optional
        EMAIL_RECIPIENTS: [], // Optional
        API_KEY: '',
        LOGZ_IO_TOKEN: ''
    }
};
```
