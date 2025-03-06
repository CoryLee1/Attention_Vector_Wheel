const express = require('express');
const WebSocket = require('ws');
const https = require('https');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// **提供静态文件服务**
app.use(express.static(path.join(__dirname, 'public')));

// **如果 Railway 提供 HTTPS 证书**
const server = app.listen(PORT, () => {
    console.log(`Server running at https://localhost:${PORT}`);
});

// **WebSocket 服务器监听 HTTPS**
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
    console.log('Client connected');

    ws.on('message', (message) => {
        console.log(`Received: ${message}`);
        let data = JSON.parse(message);
        ws.send(JSON.stringify({ response: "Data received", originalData: data }));
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

console.log('WebSocket server is running on HTTPS...');
