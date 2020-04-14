import * as $Televoke from '../lib';

(async () => {

    const router = $Televoke.createSimpleRouter();

    router.addHandler('hi', function(req) {

        req.ok(`Hi, ${req.args.name}`);
    });

    router.addHandler('Hello', function(req) {

        req.ok(`Hello, ${req.args.name}`);
    });

    router.addHandler('TestError', function(req) {

        req.fail(`Hello, ${req.args.name}`);
    });

    const server = $Televoke.createServer();

    const client = $Televoke.createTCPClient('127.0.0.1', 8899, Math.random);

    server.setRouter(router);
    server.on('error', console.error);
    server.on('handler_error', console.error);
    server.addGateway('tcp', $Televoke.createTCPGateway('127.0.0.1', 8899));

    await server.start();

    await client.connect();

    console.log(await client.invoke('hi', {'name': 'Mick'}));
    console.log(await client.invoke('hi', {'name': 'Angus'}));

    await client.invoke('not-exists-api', {'name': 'V'}).catch((e) => console.error(e.toString()));
    await client.invoke('TestError', {'name': 'V'}).catch((e) => console.error(e.toString()));

    await client.close();

    await server.close();

})().catch(console.error);
