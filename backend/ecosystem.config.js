module.exports = {
    apps: [{
        name: 'socket-io-app',
        script: 'app.js',
        instances: 0, // This will spawn as many workers as there are CPU cores
        exec_mode: 'cluster',
        env: {
            NODE_ENV: 'production',
            PORT: 3000
        },
        node_args: '--max_old_space_size=4096' // Adjust memory allocation as needed
    }]
};
