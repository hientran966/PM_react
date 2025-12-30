const http = require("http");
const app = require("./app");
const config = require("./app/config");
const MySQL = require("./app/utils/mysql.util");
const initSocket = require("./app/socket/index");

async function startServer() {
    try {
        await MySQL.connect({
            host: config.db.host,
            user: config.db.username,
            password: config.db.password,
            database: config.db.database,
        });

        console.log("Connected to the database!");

        const PORT = config.app.port;
        const server = http.createServer(app);

        initSocket(server);

        server.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error("Cannot connect to the database:", error.message);
        process.exit(1);
    }
}

require("./app/jobs");

startServer();
