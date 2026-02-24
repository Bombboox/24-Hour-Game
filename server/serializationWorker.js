const { parentPort } = require('worker_threads');
const msgpack = require('msgpack-lite');

parentPort.on('message', (job) => {
    try {
        const packet = {
            e: job.event,
            d: job.payload
        };
        const encoded = msgpack.encode(packet);
        parentPort.postMessage({ id: job.id, encoded });
    } catch (error) {
        parentPort.postMessage({
            id: job.id,
            error: error.message
        });
    }
});
