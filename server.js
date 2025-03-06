const express = require('express');
const WebSocket = require('ws');
const https = require('https');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 添加自定义CORS中间件（不需要额外的依赖）
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  
  // 处理OPTIONS请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// 提供静态文件服务
app.use(express.static(path.join(__dirname, 'public')));

// 添加一个简单的健康检查路径
app.get('/health', (req, res) => {
  res.status(200).send('Server is running');
});

// 最新数据存储
let latestData = {};

// 添加REST API端点来获取最新数据
app.get('/api/data', (req, res) => {
  res.json(latestData);
});

// 启动HTTP服务器
const server = app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

// WebSocket服务器监听HTTP服务器
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('Client connected');
  
  // 如果有最新数据，立即发送给新连接的客户端
  if (Object.keys(latestData).length > 0) {
    ws.send(JSON.stringify(latestData));
  }

  ws.on('message', (message) => {
    try {
      console.log(`Received message`);
      let data = JSON.parse(message);
      
      // 更新最新数据
      latestData = data;
      
      // 发送确认消息回客户端
      ws.send(JSON.stringify({ 
        response: "Data received", 
        timestamp: new Date().toISOString() 
      }));
      
      // 广播给所有其他连接的客户端
      wss.clients.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            timestamp: new Date().toISOString(),
            data: data
          }));
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