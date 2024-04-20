const { app } = require('@azure/functions');
const libCookie = require('cookie');

app.http('cookie', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        let value = null;
        if (request.headers.has('cookie')) {
            let cookies = libCookie.parse(request.headers.get('cookie'));
            if ('counter' in cookies) {
                value = parseInt(cookies['counter']);
            }
        }

        let newValue = value !== null ? value + 1 : 1;

        body = `Received from client: ${value}
Value returned in cookie: ${newValue}`

        return {
            body: `Received from client: ${value}
Value returned in cookie: ${newValue}`,
            headers: {
                'set-cookie': libCookie.serialize('counter', newValue.toString(), {
                    secure: true
                })
            }
        };
    }
});
