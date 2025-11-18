/* MagicMirror²
 * Module: MMM-NOAA3
 * By Cowboysdude special Thanks to JimL from php help forum!
 * Updated by mumblebaj
 * Caching mechanism added for API rate limiting
 */

// NodeHelper模块 - 负责后端数据获取和处理
var NodeHelper = require("node_helper");    // 导入MagicMirror的NodeHelper基类
var moment = require('moment');             // 导入时间处理库
//var request = require('request');          // 注释掉的HTTP请求库（已使用fetch替代）
const fs = require('fs');                   // 导入文件系统模块
const path = require('path');               // 导入路径处理模块

// 创建并导出NodeHelper实例
module.exports = NodeHelper.create({

    // 默认配置
    config: {
        updateInterval: 5 * 1000,     // 更新间隔（5秒）
        initialLoadDelay: 400000       // 初始加载延迟（400秒）
    },
    
    provider: null,  // 当前天气提供者实例
    
    // 缓存管理相关变量
    cache: {
        weatherData: null,         // 缓存的天气数据
        srssData: null,            // 缓存的日出日落数据
        airData: null,             // 缓存的空气质量数据
        moonData: null,            // 缓存的月相数据
        lastUpdateHour: null,      // 最后更新的小时数（0-23）
        cacheFile: path.join(__dirname, 'noaa3_cache.json')  // 缓存文件路径
    },
    
    // 天气提供者映射表（提供者名称 -> 文件标识符）
    providers: {
        piratesky: 'ds',        // Dark Sky（已停用）
        openweather: 'ow',      // OpenWeatherMap
        wunderground: 'wg',     // Weather Underground
        apixu: 'ax',            // Apixu（已被WeatherAPI收购）
        weatherbit: 'wb',       // Weatherbit
        weatherunlocked: 'wu',  // Weather Unlocked
        accuweather: 'aw',      // AccuWeather
        msn: 'ms',              // MSN Weather
    },

    // NodeHelper启动函数
    start: function () {
        var self = this;  // 保存this引用用于回调
        
        // 加载缓存数据
        this.loadCache();
        
        setTimeout(function () {});  // 空定时器（可能用于初始化延迟）
    },
    
    // 缓存管理方法
    
    // 加载缓存数据
    loadCache: function () {
        try {
            if (fs.existsSync(this.cache.cacheFile)) {
                const cacheData = fs.readFileSync(this.cache.cacheFile, 'utf8');
                const parsedCache = JSON.parse(cacheData);
                
                // 检查缓存是否过期（超过24小时）
                const now = moment();
                const cacheTime = moment(parsedCache.timestamp);
                const hoursDiff = now.diff(cacheTime, 'hours');
                
                if (hoursDiff < 24) {
                    // 缓存有效，加载数据
                    this.cache.weatherData = parsedCache.weatherData;
                    this.cache.srssData = parsedCache.srssData;
                    this.cache.airData = parsedCache.airData;
                    this.cache.moonData = parsedCache.moonData;
                    this.cache.lastUpdateHour = parsedCache.lastUpdateHour;
                    
                    console.log('✅ [NOAA3] 缓存数据已加载，最后更新:', cacheTime.format('YYYY-MM-DD HH:mm:ss'));
                } else {
                    console.log('ℹ️ [NOAA3] 缓存数据已过期，将重新获取');
                }
            }
        } catch (error) {
            console.log('⚠️ [NOAA3] 加载缓存失败:', error.message);
        }
    },
    
    // 保存缓存数据
    saveCache: function () {
        try {
            const cacheData = {
                timestamp: moment().toISOString(),
                weatherData: this.cache.weatherData,
                srssData: this.cache.srssData,
                airData: this.cache.airData,
                moonData: this.cache.moonData,
                lastUpdateHour: this.cache.lastUpdateHour
            };
            
            fs.writeFileSync(this.cache.cacheFile, JSON.stringify(cacheData, null, 2));
            console.log('💾 [NOAA3] 缓存数据已保存');
        } catch (error) {
            console.log('❌ [NOAA3] 保存缓存失败:', error.message);
        }
    },
    
    // 检查是否需要更新API（每小时自然周期只调用一次）
    shouldUpdateAPI: function () {
        const currentHour = moment().hour();
        
        // 如果还没有更新过，或者当前小时与上次更新小时不同，则需要更新
        if (this.cache.lastUpdateHour === null || this.cache.lastUpdateHour !== currentHour) {
            this.cache.lastUpdateHour = currentHour;
            console.log('🔄 [NOAA3] 新小时周期开始，需要更新API数据');
            return true;
        }
        
        // 检查是否有缓存数据可用
        if (this.cache.weatherData && this.cache.srssData && this.cache.airData) {
            console.log('✅ [NOAA3] 使用缓存数据，跳过API调用');
            return false;
        }
        
        return true;
    },

    // 接收来自前端模块的socket通知
    socketNotificationReceived: function (notification, payload) {
        if (notification === "MMM-NOAA3") {  // 模块初始化通知
            //this.sendSocketNotification('MMM-NOAA3');  // 注释掉的响应通知
            this.path = "modules/MMM-NOAA3/latlon.json";  // 经纬度配置文件路径
            
            // 根据配置获取天气提供者
            this.provider = this.getProviderFromConfig(payload);
            
            // 配置提供者
            this.provider.addModuleConfiguration(payload);
            
            // 保存配置
            this.config = payload;
            
            // 检查是否需要更新API数据（每小时自然周期只调用一次）
            if (this.shouldUpdateAPI()) {
                // 需要更新API数据
                console.log("🔄 [NOAA3] 开始获取最新API数据");
                
                // 先获取天气数据，然后基于天气数据获取月相数据
                this.getData().then(() => {
                    // 天气数据获取完成后，再获取其他数据
                    this.getMoonData();    // 获取月相数据
                    this.getSRSS();        // 获取日出日落数据
                    this.getAIR();         // 获取空气质量数据
                    
                    // 保存缓存数据
                    this.saveCache();
                }).catch(error => {
                    console.error("❌ [NOAA3] 获取天气数据失败:", error);
                });
            } else {
                // 使用缓存数据
                console.log("✅ [NOAA3] 使用缓存数据，跳过API调用");
                
                // 发送缓存的天气数据
                if (this.cache.weatherData) {
                    this.sendSocketNotification("WEATHER_RESULT", this.cache.weatherData);
                }
                
                // 发送缓存的日出日落数据
                if (this.cache.srssData) {
                    this.sendSocketNotification("SRSS_RESULT", this.cache.srssData);
                }
                
                // 发送缓存的空气质量数据
                if (this.cache.airData) {
                    this.sendSocketNotification("AIR_RESULT", this.cache.airData);
                }
                
                // 发送缓存的月相数据
                if (this.cache.moonData) {
                    this.sendSocketNotification("MOON_RESULT", this.cache.moonData);
                }
            }
            
            // 注释掉的警报获取功能（仅Dark Sky提供者支持）
            // if (this.providers[config.provider] == 'ds') {
            //     console.log(this.providers[config.provider]);
            //     this.getALERT()
            // };
        }
        
        // 启动定时更新（改为每小时更新一次）
        this.scheduleUpdate(60 * 60 * 1000); // 1小时 = 3600000毫秒
    },

    // 定时更新调度函数
    scheduleUpdate: function (interval) {
        var self = this;  // 保存this引用用于定时器回调
        
        // 清除已有的定时器
        if (self.updateInterval) {
            clearInterval(self.updateInterval);
        }
        
        // 设置定时更新间隔
        self.updateInterval = setInterval(() => {
            console.log('🕒 [NOAA3] 定时更新检查，下一小时周期更新');  // 更新日志
            
            // 检查是否需要更新API数据（每小时自然周期只调用一次）
            if (self.shouldUpdateAPI()) {
                console.log('🔄 [NOAA3] 新小时周期开始，获取最新API数据');
                
                // 定期获取各种数据
                self.getData().then(() => {
                    self.getMoonData();    // 获取月相数据
                    self.getSRSS();        // 获取日出日落数据
                    self.getAIR();         // 获取空气质量数据
                    
                    // 保存缓存数据
                    self.saveCache();
                }).catch(error => {
                    console.error('❌ [NOAA3] 定时更新失败:', error);
                });
            } else {
                console.log('✅ [NOAA3] 当前小时周期内已更新，使用缓存数据');
            }
            
            // 注释掉的警报获取功能
            // self.getALERT();
            // if (self.providers[config.provider] == 'ds') {
            //     self.getALERT()
            // };
        }, interval);  // 使用指定的更新间隔
    },

    // 存储原始天气数据的变量
    rawWeatherData: null,

    // 获取月相数据的函数 - 从已获取的原始天气数据中提取
    getMoonData: function () {
        var self = this;                   // 保存this引用
        
        try {
            // 检查是否有缓存的原始天气数据
            if (!self.rawWeatherData) {
                const defaultData = 'NO_MOON_DATA';
                self.cache.moonData = defaultData;
                self.sendSocketNotification("MOON_RESULT", defaultData);
                return;
            }
            
            // 检查daily数据是否存在
            if (self.rawWeatherData.daily && self.rawWeatherData.daily.length > 0) {
                // 获取当前时间戳（秒）
                var currentTimestamp = Math.floor(Date.now() / 1000);
                
                // 找到今天的daily数据（dt最接近当前时间的那个）
                var todayDaily = null;
                for (var i = 0; i < self.rawWeatherData.daily.length; i++) {
                    var dailyDt = self.rawWeatherData.daily[i].dt;
                    
                    // 如果这个daily的dt在未来的24小时内，就认为是今天的数据
                    if (dailyDt > currentTimestamp && dailyDt <= currentTimestamp + 86400) {
                        todayDaily = self.rawWeatherData.daily[i];
                        break;
                    }
                }
                
                // 如果没有找到未来24小时的数据，取第一个数据作为今天的
                if (!todayDaily && self.rawWeatherData.daily.length > 0) {
                    todayDaily = self.rawWeatherData.daily[0];
                }
                
                if (todayDaily && todayDaily.moon_phase !== undefined) {
                    // 提取今天数据的moon_phase值
                    var moonPhaseValue = todayDaily.moon_phase;
                    
                    // 将数值映射到月相名称
                    var moonPhaseName = this.mapMoonPhase(moonPhaseValue);
                    
                    // 保存到缓存
                    self.cache.moonData = moonPhaseName;
                    
                    // 发送月相数据到前端模块
                    self.sendSocketNotification("MOON_RESULT", moonPhaseName);
                } else {
                    const defaultData = 'NO_MOON_DATA';
                    self.cache.moonData = defaultData;
                    self.sendSocketNotification("MOON_RESULT", defaultData);
                }
            } else {
                const defaultData = 'NO_MOON_DATA';
                self.cache.moonData = defaultData;
                self.sendSocketNotification("MOON_RESULT", defaultData);
            }
            
        } catch (error) {
            // 错误处理
            console.error("获取月相数据错误: " + error.message);
            
            // 出错时发送默认值
            const errorData = 'NO_MOON_DATA';
            self.cache.moonData = errorData;
            self.sendSocketNotification("MOON_RESULT", errorData);
        }
    },
    
    // 月相数值到名称的映射函数
    mapMoonPhase: function(moonPhaseValue) {
        // 根据数值映射到对应的月相名称（确保与config.moon键名完全匹配）
        if (moonPhaseValue === 0 || moonPhaseValue === 1) {
            return "New Moon";        // 新月
        } else if (moonPhaseValue === 0.25) {
            return "First Quarter";  // 上弦月
        } else if (moonPhaseValue === 0.5) {
            return "Full Moon";      // 满月
        } else if (moonPhaseValue === 0.75) {
            return "Last Quarter";    // 下弦月
        } else if (moonPhaseValue > 0 && moonPhaseValue < 0.25) {
            return "Waxing Crescent"; // 蛾眉月（新月到上弦月之间）
        } else if (moonPhaseValue > 0.25 && moonPhaseValue < 0.5) {
            return "Waxing Gibbous";  // 盈凸月（上弦月到满月之间）
        } else if (moonPhaseValue > 0.5 && moonPhaseValue < 0.75) {
            return "Waning Gibbous";  // 亏凸月（满月到下弦月之间）
        } else if (moonPhaseValue > 0.75 && moonPhaseValue < 1) {
            return "Waning Crescent"; // 残月（下弦月到新月之间）
        } else {
            return "Unknown";         // 未知月相
        }
    },

    // 获取天气数据的异步函数
    getData: async function () {
        try {
            // 通过天气提供者获取天气数据
            const response = await this.provider.fetchWeatherData();
            
            if (response && response.raw) {
                // 保存原始数据，供getMoonData使用
                this.rawWeatherData = response.raw;
                
                // 保存到缓存
                this.cache.weatherData = response.parsed || 'NO_WEATHER_RESULT';
                
                // 发送处理后的天气数据到前端模块
                this.sendSocketNotification("WEATHER_RESULT", this.cache.weatherData);
            } else {
                // 发送默认值
                const defaultData = 'NO_WEATHER_RESULT';
                this.cache.weatherData = defaultData;
                this.sendSocketNotification("WEATHER_RESULT", defaultData);
            }
            
        } catch (error) {
            // 错误处理
            console.error("获取天气数据错误:" + error);
			
            // 发送错误通知到前端
            const errorData = 'NO_WEATHER_RESULT';
            this.cache.weatherData = errorData;
            this.sendSocketNotification("WEATHER_RESULT", errorData);
        }
    },

    // 获取日出日落数据的异步函数
    getSRSS: async function () {
        try {
			// 通过天气提供者获取日出日落数据
			const response = await this.provider.fetchSunriseSunset();
			
            // 保存到缓存
            this.cache.srssData = response || 'NO_SRSS_DATA';
            
            // 发送日出日落数据到前端模块（如果失败则发送默认值）
            this.sendSocketNotification("SRSS_RESULT", this.cache.srssData);
			
		} catch (error) {
			// 错误处理
			console.error("Error fetching SRSS data:" + error);
			
			// 发送错误通知到前端
			const errorData = 'NO_SRSS_DATA';
            this.cache.srssData = errorData;
            this.sendSocketNotification("SRSS_RESULT", errorData);
        }
    },

    // 获取空气质量数据的异步函数
    getAIR: async function () {
        try {
			// 通过天气提供者获取空气质量数据
			const response = await this.provider.fetchAirQuality();
			
            // 保存到缓存
            this.cache.airData = response || 'NO_AIR_DATA';
            
            // 发送空气质量数据到前端模块（如果失败则发送默认值）
            this.sendSocketNotification("AIR_RESULT", this.cache.airData);
            
        } catch (error) {
			// 错误处理
			console.error("Error fetching Air Data:", error);
			
			// 发送错误通知到前端
			const errorData = 'NO_AIR_DATA';
            this.cache.airData = errorData;
            this.sendSocketNotification("AIR_RESULT", errorData);
		}
    },

    // 注释掉的警报获取函数（仅Dark Sky提供者支持）
    getALERT: function () {
         var self = this;  // 保存this引用
         
         // 通过天气提供者获取警报数据（回调函数方式）
         self.provider.getALERT(function (response) {
             // 发送警报数据到前端模块（如果失败则发送默认值）
             self.sendSocketNotification("ALERT_RESULT", response ? response : 'NO_ALERT_DATA');
         });
    },

    // 根据配置获取天气提供者模块
    getProviderFromConfig: function (config) {
        // 检查配置中是否指定了有效的提供者
        if (!this.providers[config.provider]) {
            throw new Error('Invalid config No provider selected');  // 抛出错误：无效配置，未选择提供者
        }
        
        // console.log(this.providers[config.provider]);  // 注释掉的调试日志
        
        // 动态加载对应的提供者模块文件
        // 例如：如果config.provider是'openweather'，则加载'./providers/ow.js'
        return require('./providers/' + this.providers[config.provider] + '.js');
    }
});  // NodeHelper创建结束
