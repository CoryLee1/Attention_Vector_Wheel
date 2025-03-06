const express = require('express');
const WebSocket = require('ws');
const https = require('https');
const fs = require('fs');
const path = require('path');
const cors = require('cors'); // 添加CORS支持

const app = express();
const PORT = process.env.PORT || 3000;

// 启用CORS，允许来自任何源的请求
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 提供静态文件服务
app.use(express.static(path.join(__dirname, 'public')));

// 添加一个简单的健康检查路径
app.get('/health', (req, res) => {
  res.status(200).send('Server is running');
});

// 启动HTTP服务器
const server = app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

// WebSocket服务器监听HTTP服务器
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', (message) => {
    try {
      console.log(`Received message`);
      let data = JSON.parse(message);
      
      // 向发送消息的客户端返回确认
      ws.send(JSON.stringify({ response: "Data received", originalData: data }));
      
      // 广播给所有其他客户端（排除发送方）
      wss.clients.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(message.toString());
        }
      });
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

console.log('WebSocket server is running...');