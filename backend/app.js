const http = require('http');
const cluster = require('cluster');
const { Server } = require('socket.io');
const { setupMaster, setupWorker } = require('@socket.io/sticky');
const { createAdapter, setupPrimary } = require('@socket.io/cluster-adapter');
const redisAdapter = require('socket.io-redis');
const numCPUs = require('os').cpus().length;
const PORT = process.env.PORT || 3000;
const express = require('express');

if (cluster.isMaster) {
    const app = express();
    const httpServer = http.createServer(app);
  
    // Serve your static HTML file
    app.use(express.static('public')); // 'public' is the directory name where your HTML file is located
  
    // Setup the primary process
    setupMaster(httpServer, {
        loadBalancingMethod: 'least-connection',
    });
    setupPrimary();

    httpServer.listen(PORT, () => console.log(`Master server listening on port ${PORT}`));

    // Fork workers
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    app.get('/', function(req, res) {
        res.sendFile(__dirname + '/public/index.html');
      });

    cluster.on('exit', (worker) => {
        console.log(`Worker ${worker.process.pid} died`);
        cluster.fork();
    });
} else {
    console.log(`Worker ${process.pid} started and listening on port ${PORT}`);
    const app = express();
    const httpServer = http.createServer(app);
    const io = new Server(httpServer);

    // Serve your index.html file
    app.use(express.static('./index.html'));

    // Use the cluster adapter
    io.adapter(createAdapter());

    // Use the Redis adapter
    io.adapter(redisAdapter({ host: 'localhost', port: 6379 }));

    setupWorker(io);

    io.on('connection', (socket) => {
        console.log(`[Worker ${process.pid}] Client connected, socket id: ${socket.id}`);

        socket.on('chat message', (msg) => {
            console.log(`[Worker ${process.pid}] Message received on socket id ${socket.id}: ${msg}`);
            io.emit('chat message', msg); // Broadcast the message to all clients
        });

        socket.on('disconnect', () => {
            console.log(`[Worker ${process.pid}] Client disconnected, socket id: ${socket.id}`);
        });
    });

    app.get('/', function(req, res) {
        res.sendFile(__dirname + '/public/index.html');
      });

    httpServer.listen(0, 'localhost', () => console.log(`[Worker ${process.pid}] Worker server started`));
}
