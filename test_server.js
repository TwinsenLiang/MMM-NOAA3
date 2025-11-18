#!/usr/bin/env node

/**
 * NOAA3测试服务器
 * 模拟OpenWeatherMap API服务器，提供测试数据
 */

const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

const PORT = 3001;
const HOST = 'localhost';

// 测试数据文件路径
const testDataDir = __dirname;
const testFiles = {
    '1': path.join(testDataDir, 'test_data_1.json'),
    '2': path.join(testDataDir, 'test_data_2.json'),
    '3': path.join(testDataDir, 'test_data_3.json'),
    '4': path.join(testDataDir, 'test_data_4.json')
};

// 模拟日出日落API响应
const srssResponse = {
    "results": {
        "sunrise": "2025-03-20T06:00:00+00:00",
        "sunset": "2025-03-20T18:00:00+00:00",
        "solar_noon": "2025-03-20T12:00:00+00:00",
        "day_length": 43200,
        "civil_twilight_begin": "2025-03-20T05:30:00+00:00",
        "civil_twilight_end": "2025-03-20T18:30:00+00:00",
        "nautical_twilight_begin": "2025-03-20T05:00:00+00:00",
        "nautical_twilight_end": "2025-03-20T19:00:00+00:00",
        "astronomical_twilight_begin": "2025-03-20T04:30:00+00:00",
        "astronomical_twilight_end": "2025-03-20T19:30:00+00:00"
    },
    "status": "OK"
};

// 模拟空气质量API响应
const airQualityResponse = {
    "status": "success",
    "data": {
        "city": "Shenzhen",
        "state": "Guangdong",
        "country": "China",
        "location": {
            "type": "Point",
            "coordinates": [114.4309, 22.6273]
        },
        "current": {
            "pollution": {
                "ts": "2025-03-20T12:00:00.000Z",
                "aqius": 35,
                "mainus": "p2",
                "aqicn": 25,
                "maincn": "p2"
            },
            "weather": {
                "ts": "2025-03-20T12:00:00.000Z",
                "tp": 28,
                "pr": 1013,
                "hu": 65,
                "ws": 3.5,
                "wd": 180,
                "ic": "01d"
            }
        }
    }
};

// 创建HTTP服务器
const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    
    console.log(`[${new Date().toISOString()}] ${req.method} ${pathname}`);
    
    // 设置CORS头部
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // 处理不同的API端点
    if (pathname === '/api/weather/onecall') {
        // 模拟OpenWeatherMap API
        handleWeatherAPI(req, res, parsedUrl);
    } else if (pathname === '/api/sunrise-sunset') {
        // 模拟日出日落API
        handleSunriseSunsetAPI(req, res);
    } else if (pathname === '/api/air-quality') {
        // 模拟空气质量API
        handleAirQualityAPI(req, res);
    } else if (pathname === '/api/test-data') {
        // 提供测试数据文件
        handleTestDataAPI(req, res, parsedUrl);
    } else if (pathname === '/') {
        // 服务器状态页面
        handleStatusPage(req, res);
    } else {
        // 404处理
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'API endpoint not found' }));
    }
});

// 处理天气API请求
function handleWeatherAPI(req, res, parsedUrl) {
    const query = parsedUrl.query;
    const testId = query.test_id || '1'; // 默认使用第一个测试数据
    
    if (testFiles[testId]) {
        try {
            const data = JSON.parse(fs.readFileSync(testFiles[testId], 'utf8'));
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to read test data' }));
        }
    } else {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid test_id parameter' }));
    }
}

// 处理日出日落API请求
function handleSunriseSunsetAPI(req, res) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(srssResponse));
}

// 处理空气质量API请求
function handleAirQualityAPI(req, res) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(airQualityResponse));
}

// 处理测试数据API请求
function handleTestDataAPI(req, res, parsedUrl) {
    const query = parsedUrl.query;
    const testId = query.id || '1';
    
    if (testFiles[testId]) {
        try {
            const data = fs.readFileSync(testFiles[testId], 'utf8');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(data);
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to read test data file' }));
        }
    } else {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid test data ID' }));
    }
}

// 处理状态页面
function handleStatusPage(req, res) {
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>NOAA3测试服务器</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .endpoint { background: #f5f5f5; padding: 10px; margin: 10px 0; }
        .test-data { margin: 20px 0; }
    </style>
</head>
<body>
    <h1>NOAA3测试服务器</h1>
    <p>服务器运行在: http://${HOST}:${PORT}</p>
    
    <h2>可用API端点:</h2>
    
    <div class="endpoint">
        <strong>天气数据API:</strong><br>
        GET /api/weather/onecall?test_id=1|2|3|4<br>
        参数: test_id - 测试数据ID (1-4)<br>
        示例: <a href="/api/weather/onecall?test_id=1">/api/weather/onecall?test_id=1</a>
    </div>
    
    <div class="endpoint">
        <strong>日出日落API:</strong><br>
        GET /api/sunrise-sunset<br>
        示例: <a href="/api/sunrise-sunset">/api/sunrise-sunset</a>
    </div>
    
    <div class="endpoint">
        <strong>空气质量API:</strong><br>
        GET /api/air-quality<br>
        示例: <a href="/api/air-quality">/api/air-quality</a>
    </div>
    
    <div class="endpoint">
        <strong>测试数据API:</strong><br>
        GET /api/test-data?id=1|2|3|4<br>
        参数: id - 测试数据ID (1-4)<br>
        示例: <a href="/api/test-data?id=1">/api/test-data?id=1</a>
    </div>
    
    <h2>测试数据说明:</h2>
    <div class="test-data">
        <strong>测试数据1:</strong> 晴天天气 (28°C)<br>
        <strong>测试数据2:</strong> 多云天气 (25°C)<br>
        <strong>测试数据3:</strong> 雨天天气 (22°C)<br>
        <strong>测试数据4:</strong> 雪天天气 (5°C)<br>
    </div>
    
    <h2>使用说明:</h2>
    <p>在MagicMirror配置中，可以将API端点修改为:</p>
    <pre>http://${HOST}:${PORT}/api/weather/onecall?test_id=1</pre>
    
    <p>然后重新启动MagicMirror即可使用测试数据。</p>
</body>
</html>
    `;
    
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
}

// 启动服务器
server.listen(PORT, HOST, () => {
    console.log(`🌤️ NOAA3测试服务器启动成功!`);
    console.log(`📍 服务器地址: http://${HOST}:${PORT}`);
    console.log(`📊 测试数据目录: ${testDataDir}`);
    console.log(`
可用的测试数据:
  测试数据1 - 晴天天气 (28°C)
  测试数据2 - 多云天气 (25°C)  
  测试数据3 - 雨天天气 (22°C)
  测试数据4 - 雪天天气 (5°C)
`);
    console.log('按 Ctrl+C 停止服务器');
});

// 优雅关闭
process.on('SIGINT', () => {
    console.log('\n正在关闭服务器...');
    server.close(() => {
        console.log('服务器已关闭');
        process.exit(0);
    });
});