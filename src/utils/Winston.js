const moment = require('moment')

const {
    createLogger,
    format,
    transports
} = require('winston');

const timestamp = () => {
    return moment().format('YYYY-MM-DD HH:MM:SS')
};

const {
    combine,
    label,
    printf
} = format;

const myFormat = printf(info => {
    console.log(`[${timestamp()}][${info.level}]: ${info.message}`);
    return `[${timestamp()}][${info.level}]: ${info.message}`;
});

module.exports = createLogger({
    format: combine(
        label({
            label: ''
        }),
        myFormat
    ),
    transports: [
        // new transports.Console(),
        new transports.File({
            level: 'warn',
            filename: './logs/error.log',
            json: true
        }),
        new transports.File({
            filename: './logs/combined.log'
        })
    ]
});