"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
const net_1 = __importDefault(require("net"));
const path_1 = __importDefault(require("path"));
const spawn_args_1 = __importDefault(require("spawn-args"));
const events_1 = require("events");
const getGoBinary_1 = __importDefault(require("./getGoBinary"));
const logger_1 = __importDefault(require("./logger"));
const which_1 = __importDefault(require("./which"));
const childProcess_1 = require("./childProcess");
class HooksWorkerClient {
    constructor(runner) {
        this.runner = runner;
        const options = this.runner.hooks.configuration;
        this.language = options.language;
        this.timeout = options['hooks-worker-timeout'] || 5000;
        this.connectTimeout = options['hooks-worker-connect-timeout'] || 1500;
        this.connectRetry = options['hooks-worker-connect-retry'] || 500;
        this.afterConnectWait = options['hooks-worker-after-connect-wait'] || 100;
        this.termTimeout = options['hooks-worker-term-timeout'] || 5000;
        this.termRetry = options['hooks-worker-term-retry'] || 500;
        this.handlerHost = options['hooks-worker-handler-host'] || '127.0.0.1';
        this.handlerPort = options['hooks-worker-handler-port'] || 61321;
        this.handlerMessageDelimiter = '\n';
        this.clientConnected = false;
        this.connectError = false;
        this.emitter = new events_1.EventEmitter();
    }
    start(callback) {
        logger_1.default.debug('Looking up hooks handler implementation:', this.language);
        this.setCommandAndCheckForExecutables((executablesError) => {
            if (executablesError) {
                return callback(executablesError);
            }
            logger_1.default.debug('Starting hooks handler.');
            this.spawnHandler((spawnHandlerError) => {
                if (spawnHandlerError) {
                    return callback(spawnHandlerError);
                }
                logger_1.default.debug('Connecting to hooks handler.');
                this.connectToHandler((connectHandlerError) => {
                    if (connectHandlerError) {
                        this.terminateHandler((terminateError) => callback(connectHandlerError || terminateError));
                        return;
                    }
                    logger_1.default.debug('Registering hooks.');
                    this.registerHooks((registerHooksError) => {
                        if (registerHooksError) {
                            return callback(registerHooksError);
                        }
                        callback();
                    });
                });
            });
        });
    }
    stop(callback) {
        this.disconnectFromHandler();
        this.terminateHandler(callback);
    }
    terminateHandler(callback) {
        logger_1.default.debug('Terminating hooks handler process, PID', this.handler.pid);
        if (this.handler.terminated) {
            logger_1.default.debug('The hooks handler process has already terminated');
            return callback();
        }
        this.handler.terminate({
            force: true,
            timeout: this.termTimeout,
            retryDelay: this.termRetry,
        });
        this.handler.on('close', () => callback());
    }
    disconnectFromHandler() {
        this.handlerClient.destroy();
    }
    setCommandAndCheckForExecutables(callback) {
        // Select handler based on option, use option string as command if not match anything
        let msg;
        if (this.language === 'ruby') {
            this.handlerCommand = 'dredd-hooks-ruby';
            this.handlerCommandArgs = [];
            if (!which_1.default.which(this.handlerCommand)) {
                msg = `
Ruby hooks handler command not found: ${this.handlerCommand}
Install ruby hooks handler by running:
$ gem install dredd_hooks
`;
                callback(new Error(msg));
            }
            else {
                callback();
            }
        }
        else if (this.language === 'rust') {
            this.handlerCommand = 'dredd-hooks-rust';
            this.handlerCommandArgs = [];
            if (!which_1.default.which(this.handlerCommand)) {
                msg = `
Rust hooks handler command not found: ${this.handlerCommand}
Install rust hooks handler by running:
$ cargo install dredd-hooks
`;
                callback(new Error(msg));
            }
            else {
                callback();
            }
        }
        else if (this.language === 'python') {
            this.handlerCommand = 'dredd-hooks-python';
            this.handlerCommandArgs = [];
            if (!which_1.default.which(this.handlerCommand)) {
                msg = `
Python hooks handler command not found: ${this.handlerCommand}
Install python hooks handler by running:
$ pip install dredd_hooks
`;
                callback(new Error(msg));
            }
            else {
                callback();
            }
        }
        else if (this.language === 'php') {
            this.handlerCommand = 'dredd-hooks-php';
            this.handlerCommandArgs = [];
            if (!which_1.default.which(this.handlerCommand)) {
                msg = `
PHP hooks handler command not found: ${this.handlerCommand}
Install php hooks handler by running:
$ composer require ddelnano/dredd-hooks-php --dev
`;
                callback(new Error(msg));
            }
            else {
                callback();
            }
        }
        else if (this.language === 'perl') {
            this.handlerCommand = 'dredd-hooks-perl';
            this.handlerCommandArgs = [];
            if (!which_1.default.which(this.handlerCommand)) {
                msg = `
Perl hooks handler command not found: ${this.handlerCommand}
Install perl hooks handler by running:
$ cpanm Dredd::Hooks
`;
                callback(new Error(msg));
            }
            else {
                callback();
            }
        }
        else if (this.language === 'nodejs') {
            msg = `
Hooks handler should not be used for Node.js.
Use Dredd's native Node.js hooks instead.
`;
            callback(new Error(msg));
        }
        else if (this.language === 'go') {
            getGoBinary_1.default((err, goBin) => {
                if (err) {
                    callback(new Error(`Go doesn't seem to be installed: ${err.message}`));
                }
                else {
                    this.handlerCommand = path_1.default.join(goBin, 'goodman');
                    this.handlerCommandArgs = [];
                    if (which_1.default.which(this.handlerCommand)) {
                        callback();
                    }
                    else {
                        msg = `
Go hooks handler command not found: ${this.handlerCommand}
Install go hooks handler by running:
$ go get github.com/snikch/goodman/cmd/goodman
`;
                        callback(new Error(msg));
                    }
                }
            });
        }
        else {
            const parsedArgs = spawn_args_1.default(this.language);
            this.handlerCommand = parsedArgs.shift();
            this.handlerCommandArgs = parsedArgs;
            logger_1.default.debug(`Using '${this.handlerCommand}' as a hooks handler command, '${this.handlerCommandArgs.join(' ')}' as arguments`);
            if (!which_1.default.which(this.handlerCommand)) {
                msg = `Hooks handler command not found: ${this.handlerCommand}`;
                callback(new Error(msg));
            }
            else {
                callback();
            }
        }
    }
    spawnHandler(callback) {
        const pathGlobs = this.runner.hooks.configuration.hookfiles;
        const handlerCommandArgs = this.handlerCommandArgs.concat(pathGlobs);
        logger_1.default.debug(`Spawning '${this.language}' hooks handler process.`);
        this.handler = childProcess_1.spawn(this.handlerCommand, handlerCommandArgs);
        this.handler.stdout.on('data', (data) => logger_1.default.debug('Hooks handler stdout:', data.toString()));
        this.handler.stderr.on('data', (data) => logger_1.default.debug('Hooks handler stderr:', data.toString()));
        this.handler.on('signalTerm', () => logger_1.default.debug('Gracefully terminating the hooks handler process'));
        this.handler.on('signalKill', () => logger_1.default.debug('Killing the hooks handler process'));
        this.handler.on('crash', (exitStatus, killed) => {
            let msg;
            if (killed) {
                msg = `Hooks handler process '${this.handlerCommand} ${handlerCommandArgs.join(' ')}' was killed.`;
            }
            else {
                msg = `Hooks handler process '${this.handlerCommand} ${handlerCommandArgs.join(' ')}' exited with status: ${exitStatus}`;
            }
            logger_1.default.error(msg);
            this.runner.hookHandlerError = new Error(msg);
        });
        this.handler.on('error', (err) => {
            this.runner.hookHandlerError = err;
        });
        callback();
    }
    connectToHandler(callback) {
        let timeout;
        const start = Date.now();
        const waitForConnect = () => {
            if (Date.now() - start < this.connectTimeout) {
                clearTimeout(timeout);
                if (this.connectError !== false) {
                    logger_1.default.warn('Error connecting to the hooks handler process. Is the handler running? Retrying.');
                    this.connectError = false;
                }
                if (this.clientConnected !== true) {
                    connectAndSetupClient();
                    timeout = setTimeout(waitForConnect, this.connectRetry);
                }
            }
            else {
                clearTimeout(timeout);
                if (!this.clientConnected) {
                    if (this.handlerClient) {
                        this.handlerClient.destroy();
                    }
                    const msg = `Connection timeout ${this.connectTimeout /
                        1000}s to hooks handler ` +
                        `on ${this.handlerHost}:${this.handlerPort} exceeded. Try increasing the limit.`;
                    callback(new Error(msg));
                }
            }
        };
        const connectAndSetupClient = () => {
            logger_1.default.debug('Starting TCP connection with hooks handler process.');
            if (this.runner.hookHandlerError) {
                callback(this.runner.hookHandlerError);
            }
            this.handlerClient = net_1.default.connect({
                port: this.handlerPort,
                host: this.handlerHost,
            });
            this.handlerClient.on('connect', () => {
                logger_1.default.debug(`Successfully connected to hooks handler. Waiting ${this
                    .afterConnectWait / 1000}s to start testing.`);
                this.clientConnected = true;
                clearTimeout(timeout);
                setTimeout(callback, this.afterConnectWait);
            });
            this.handlerClient.on('close', () => logger_1.default.debug('TCP communication with hooks handler closed.'));
            this.handlerClient.on('error', (connectError) => {
                logger_1.default.debug('TCP communication with hooks handler errored.', connectError);
                this.connectError = connectError;
            });
            let handlerBuffer = '';
            this.handlerClient.on('data', (data) => {
                logger_1.default.debug('Dredd received some data from hooks handler.');
                handlerBuffer += data.toString();
                if (data.toString().indexOf(this.handlerMessageDelimiter) > -1) {
                    const splittedData = handlerBuffer.split(this.handlerMessageDelimiter);
                    // Add last chunk to the buffer
                    handlerBuffer = splittedData.pop();
                    const messages = [];
                    for (const message of splittedData) {
                        messages.push(JSON.parse(message));
                    }
                    const result = [];
                    for (const message of messages) {
                        if (message.uuid) {
                            logger_1.default.debug('Dredd received a valid message from hooks handler:', message.uuid);
                            result.push(this.emitter.emit(message.uuid, message));
                        }
                        else {
                            result.push(logger_1.default.debug('UUID not present in hooks handler message, ignoring:', JSON.stringify(message, null, 2)));
                        }
                    }
                    return result;
                }
            });
        };
        timeout = setTimeout(waitForConnect, this.connectRetry);
    }
    registerHooks(callback) {
        const eachHookNames = [
            'beforeEach',
            'beforeEachValidation',
            'afterEach',
            'beforeAll',
            'afterAll',
        ];
        for (const eventName of eachHookNames) {
            this.runner.hooks[eventName]((data, hookCallback) => {
                const uuid = uuid_1.v4();
                // Send transaction to the handler
                const message = {
                    event: eventName,
                    uuid,
                    data,
                };
                logger_1.default.debug('Sending HTTP transaction data to hooks handler:', uuid);
                this.handlerClient.write(JSON.stringify(message));
                this.handlerClient.write(this.handlerMessageDelimiter);
                // Register event for the sent transaction
                function messageHandler(receivedMessage) {
                    let value;
                    logger_1.default.debug('Handling hook:', uuid);
                    clearTimeout(timeout);
                    // We are directly modifying the `data` argument here. Neither direct
                    // assignment (`data = receivedMessage.data`) nor `clone()` will work...
                    // *All hooks receive array of transactions
                    if (eventName.indexOf('All') > -1) {
                        for (let index = 0; index < receivedMessage.data.length; index++) {
                            value = receivedMessage.data[index];
                            data[index] = value;
                        }
                        // *Each hook receives single transaction
                    }
                    else {
                        for (const key of Object.keys(receivedMessage.data || {})) {
                            value = receivedMessage.data[key];
                            data[key] = value;
                        }
                    }
                    hookCallback();
                }
                const handleTimeout = () => {
                    logger_1.default.warn('Hook handling timed out.');
                    if (eventName.indexOf('All') === -1) {
                        data.fail = 'Hook timed out.';
                    }
                    this.emitter.removeListener(uuid, messageHandler);
                    hookCallback();
                };
                // Set timeout for the hook
                let timeout = setTimeout(handleTimeout, this.timeout);
                this.emitter.on(uuid, messageHandler);
            });
        }
        this.runner.hooks.afterAll((transactions, hookCallback) => {
            // This is needed for transaction modification integration tests:
            // https://github.com/apiaryio/dredd-hooks-template/blob/master/features/execution_order.feature
            if (process.env.TEST_DREDD_HOOKS_HANDLER_ORDER === 'true') {
                console.error('FOR TESTING ONLY');
                const modifications = (transactions[0] && transactions[0].hooks_modifications) || [];
                if (!modifications.length) {
                    throw new Error('Hooks must modify transaction.hooks_modifications');
                }
                for (let index = 0; index < modifications.length; index++) {
                    const modification = modifications[index];
                    console.error(`${index} ${modification}`);
                }
                console.error('FOR TESTING ONLY');
            }
            this.stop(hookCallback);
        });
        callback();
    }
}
exports.default = HooksWorkerClient;
