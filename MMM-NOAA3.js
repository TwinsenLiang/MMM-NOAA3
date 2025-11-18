/* MagicMirror²
 * Module: MMM-NOAA3
 * By cowboysdude with HUGE Thanks to JimL at https://www.phphelp.com!!
 * Last updated by TwinsenLiang
 */

var current = {};
var srss;

Module.register("MMM-NOAA3", {
    defaults: {
        animationSpeed: 0,
        initialLoadDelay: 8000,
        rotateInterval: 60 * 1000,
		updateInterval: 21600000,
		//updateInterval: 5 * 1000,
        apiKey: "",
        airKey: "",
        pws: "",
        css: "",
        frow: true,
		nupdate: false,
		userlat: "",
		userlon: "",

        levelTrans: {
            "1": "green",
            "2": "yellow",
            "3": "orange",
            "4": "red",
        },

        uvScale: {
            "0": "Low",
            "1": "Low",
            "2": "Low",
            "3": "Moderate",
            "4": "Moderate",
            "5": "Moderate",
            "6": "High",
            "7": "High",
            "8": "Very High",
            "9": "Very High",
            "10": "Very High",
            "11": "Extreme",
        },
		
		moon: {
			"Last Quarter": 'modules/MMM-NOAA3/images/moon/thirdquarter.png',
			"New Moon": 'modules/MMM-NOAA3/images/moon/newmoon.png',
			"Waxing": 'modules/MMM-NOAA3/images/moon/waxingcrescent.png',
			"First Quarter": 'modules/MMM-NOAA3/images/moon/firstquarter.png',
			"Waxing Gibbous": 'modules/MMM-NOAA3/images/moon/waxinggibbous.png',
			"Full Moon": 'modules/MMM-NOAA3/images/moon/fullmoon.png',
			"Waning Gibbous": 'modules/MMM-NOAA3/images/moon/waninggibbous.png',
			"Waning Crescent": 'modules/MMM-NOAA3/images/moon/waningcrescent.png',
			"Waxing Crescent": 'modules/MMM-NOAA3/images/moon/waxingcrescent.png',
			"3rd Quarter":'modules/MMM-NOAA3/images/moon/thirdquarter.png'
		}
    },


    // 不再从translations目录获取翻译文件，改为从config配置中获取翻译信息

    // 调度定时更新函数
    scheduleUpdate: function() {
        setInterval(() => {
        }, this.config.updateInterval);
    },

    // 将秒数转换为时间字符串（HH:MM格式）
    secondsToString: function(seconds) {
        var seconds = this.srss.day;  // 从日出日落数据获取秒数

        var date = new Date(seconds * 1000);  // 创建日期对象（秒转毫秒）
        var hh = date.getUTCHours();          // 获取UTC时间的小时
        var mm = date.getUTCMinutes();         // 获取UTC时间的分钟
        var ss = date.getSeconds();           // 获取秒数
        
        // 小时和分钟补零处理
        if (hh < 10) {
            hh = "0" + hh;
        }
        if (mm < 10) {
            mm = "0" + mm;
        }
        if (ss < 10) {
            ss = "0" + ss;
        }
        
        var t = hh + ":" + mm;  // 返回格式化的时间字符串
        return t;
    },

    // 声明依赖的外部脚本
    getScripts: function() {
        return ['moment.js'];  // 需要moment.js库进行时间处理
    },

    // 加载CSS样式文件
    getStyles: function() {
        // 根据配置选择不同的CSS样式文件
        if (this.config.css == "NOAA3") {
            return ["modules/MMM-NOAA3/css/MMM-NOAA3.css"];
        } else if (this.config.css == "NOAA2") {
            return ["modules/MMM-NOAA3/css/MMM-NOAA2.css"];
        } else if (this.config.css == "NOAA1") {
			return ["modules/MMM-NOAA3/css/MMM-NOAA1.css"];
		} else {
			return ["modules/MMM-NOAA3/css/MMM-NOAA4.css"];  // 默认样式
		}
    },

    // 加载翻译文件 - 根据MagicMirror配置自动选择对应语言
    getTranslations: function() {
        // 直接使用config.language作为键，映射到对应的翻译文件
        var translations = {};
        translations[config.language] = "translations/" + config.language + ".json";
        return translations;
    },

	// 模块文本内容
    text: '',

    // 翻译函数，直接使用MagicMirror的标准翻译机制
    customTranslate: function(key) {
        // 直接使用MagicMirror的标准翻译机制
        // 这会自动从translations目录加载对应语言的翻译文件
        return this.translate(key);
    },

    // 模块启动函数
    start: function() {
        Log.info("Starting module: " + this.name);  // 记录启动日志
        this.text = this.customTranslate("TEXT_PLACEHOLDER");  // 初始化文本内容
        this.sendSocketNotification('MMM-NOAA3', this.config);  // 发送配置到Node helper
        this.updateInterval = null;  // 初始化更新间隔变量
        
        // 设置默认单位（使用全局配置或模块配置）
        this.config.units = this.config.units || config.units;
        
        // 初始化数据存储对象
        this.forecast = {};      // 预报数据
        this.air = {};           // 空气质量数据
        this.srss = {};          // 日出日落数据
        this.amess = [];         // 警报消息数组
        this.current = {};       // 当前天气数据
        this.today = "";         // 今日日期
        this.aqius = {};         // 空气质量指数
		this.issue = {};          // 问题数据
        this.activeItem = 0;     // 当前活动项索引
        this.rotateInterval = null; // 轮播定时器
        this.loaded = false;     // 数据加载完成标志
        this.dataReady = false;  // 所有数据已就绪标志
        this.dataCount = 0;      // 已接收数据类型的计数器
        this.expectedDataTypes = ['weather', 'srss', 'air', 'alert', 'moon']; // 期望的数据类型
    },
	

    // 接收来自Node helper的socket通知
    socketNotificationReceived: function(notification, payload) {
		// 根据不同的通知类型调用相应的处理方法
		if (notification === "WEATHER_RESULT") {
            this.processWeather(payload);  // 处理天气数据
            this.dataCount++;              // 增加已接收数据类型计数
        }
        if (notification === "SRSS_RESULT") {
            this.processSRSS(payload);     // 处理日出日落数据
            this.dataCount++;              // 增加已接收数据类型计数
        }
        if (notification === "AIR_RESULT") {
            this.processAIR(payload);       // 处理空气质量数据
            this.dataCount++;              // 增加已接收数据类型计数
        }
        if (notification === "ALERT_RESULT") {
            this.processALERT(payload);     // 处理警报数据
            this.dataCount++;              // 增加已接收数据类型计数
        }
		if (notification === "MOON_RESULT") {
            this.processMOON(payload);      // 处理月相数据
            this.dataCount++;              // 增加已接收数据类型计数
        }  
		
		// 检查是否所有必要数据都已接收完成
		// 使用2作为最小阈值，确保至少天气和基本数据已接收
		if (this.dataCount >= 2) {
            this.dataReady = true;         // 标记所有数据已就绪
            this.loaded = true;             // 标记数据加载完成
            
            // 首次接收数据时启动轮播功能
			if (this.rotateInterval == null) {
                this.scheduleCarousel();
            }
            
            this.updateDom();  // 一次性更新DOM显示
        }
    },
	// 处理月相数据
	processMOON: function(data) {
        console.log("MOON data received:", data); // 调试日志
        this.moon = data; 	// 存储月相数据
    },
	
    // 处理空气质量数据
    processAIR: function(data) {
        this.air = data.air;  // 存储空气质量数据
    },
    
    // 处理日出日落数据
    processSRSS: function(data) {
        this.srss = data;    // 存储到模块实例
		srss = this.srss;      // 同时存储到全局变量（可能用于兼容性）
    },
	
	// 处理当前天气数据
	processWeather: function(data) {
        this.current = data;  // 存储当前天气数据
		console.log(this.current);  // 调试输出
		var weather = this.current.current;  // 提取天气信息
			 icon = weather.icon;              // 天气图标
			 sunset = this.srss.sunset;        // 日落时间
	    this.sendNotification("WEATHER", {icon , sunset});  // 发送天气通知（可能用于其他模块）
    },
	
	// 处理警报数据
	processALERT: function(data) {
        this.issue = data.alerts;  // 存储警报数据
        console.log(this.issue);		// 调试输出
    },
	
	// 调度信息轮播
	scheduleCarousel: function() {
        this.rotateInterval = setInterval(() => {
            this.activeItem++;     // 切换到下一项
            this.updateDom();      // 更新显示
        }, this.config.rotateInterval);
    },
	
	
    // 创建DOM元素的入口函数
    getDom: function() {
		var wrapper = document.createElement("div");  // 创建根容器
		
		 // 检查数据是否已加载
		 if (!this.dataReady) {
            wrapper.classList.add("container");
            wrapper.innerHTML = "正在获取天气信息...";
            wrapper.className = "bright small";
            return wrapper;  // 返回加载中提示
        }
        var current = this.current.current;            // 获取当前天气数据
//console.log(current);
        var d = new Date();
        var n = d.getHours();  // 当前小时数
 
        // 提取当前天气数据的各个字段
        if (typeof current !== 'undefined') {
			var weather = current.weather;           // 天气描述
            var icon = current.icon;                 // 天气图标代码
            var temp_f = current.temp_f;             // 华氏温度
            var temp_c = current.temp_c;             // 摄氏温度
            var fctext = current.weather_f;          // 预报文本
            var humid = current.humidity;            // 湿度百分比
            var baro_in = current.pressure_in;        // 气压（英寸汞柱）
            var baro_mb = current.pressure_mb;        // 气压（毫巴）
            var visibility = Math.round(current.visibility_mi);  // 能见度（英里）
            var UV = current.UV;                     // UV指数
            var wind_mph = Math.round(current.wind_mph);  // 风速（英里/小时）
            var wind_kph = Math.round(current.wind_kph);  // 风速（公里/小时）
        }
 //console.log('this is from NOAA3 '+weather);
        
        // 创建天气描述显示区域
        var cweat = document.createElement("div");
        cweat.classList.add("small", "bright", "floatl");
        cweat.innerHTML = this.customTranslate(fctext) + "<br>"; 
        wrapper.appendChild(cweat);

        // 创建天气图标显示
        var curCon = document.createElement("div");
        curCon.classList.add("img");
        
        // 根据时间显示白天或夜晚图标（6:00-18:00为白天）
        curCon.innerHTML = (n < 18 && n > 6) ? 
            "<img src='modules/MMM-NOAA3/images/" + icon + ".png'>" : 
            "<img src='modules/MMM-NOAA3/images/nt_" + icon + ".png'>";
        wrapper.appendChild(curCon);
		
		
		// 工具提示切换功能
		function myFunction(id) {
    var x = document.getElementById(id);
    if (x.className.indexOf("w3-show") == -1) {
        x.className += " w3-show";  // 显示
    } else { 
        x.className = x.className.replace(" w3-show", "");  // 隐藏
    }
     }

        // 创建温度显示区域
        var cur = document.createElement("div");
        cur.classList.add("tempf", "tooltip");
        
        // 根据单位制式显示温度（公制或英制）
        var temper = config.units != "metric" ? 
            Math.round(temp_f) + "&deg;<span class='tooltiptext'>" + this.customTranslate('Forecast') + ": " + this.customTranslate(fctext) + "</span> " : 
            Math.round(temp_c) + "&deg;<span class='tooltiptext'>" + this.customTranslate('Forecast') + ": " + this.customTranslate(fctext) + "</span> ";
            
        // 使用表格布局显示温度
        cur.innerHTML = `<div class="divTable">
          <div class="divTableBody">
        <div class="divTableRow">
            <div class="divTableHead"> </div> 
        </div>
		<div class="divTableRow"> 
                <div class="divTableCell2">${temper}</div>
            </div></div></div> `
        wrapper.appendChild(cur);

        // 创建顶部信息显示区域（湿度、气压、能见度）
        var top = document.createElement('div');
		top.classList.add('topshow');
		
		// 根据单位制式格式化数据
		var Baro = config.units != "metric" ? baro_in + " inHg": baro_mb;
		var Miles = config.units != "metric" ? visibility + " Mi": (Math.round(visibility*1.60934)) + " Km";
		
		top.innerHTML=	
		`<div class="divTable">
          <div class="divTableBody">
        <div class="divTableRow">
            <div class="divTableHead">${this.customTranslate("Humidity")}</div>
            <div class="divTableHead">${this.customTranslate("Pressure")}</div>
            <div class="divTableHead">${this.customTranslate("Visibility")}</div>
        </div>
		
		<div class="divTableRow">
                <div class="divTableCell">${humid}</div>
                <div class="divTableCell">${Baro}</div>
                <div class="divTableCell">${Miles}</div>
            </div></div></div>`;
         
         // 添加点击隐藏功能
         top.addEventListener("click", () => hideit(thisTop));			
		 wrapper.appendChild(top);
        
		// 隐藏函数定义
		function hideit(thisTop) {
				top.style.display="none";
			};
		
		// 处理日出日落数据显示
		srss = this.srss;
        var sunrise = srss.sunrise;    // 日出时间
        var sunset = srss.sunset;     // 日落时间
		var daylength = moment.utc(srss.day_length * 1000).format('HH:mm:ss');;  // 日照时长
        
        // 时间格式转换（UTC转本地时间）
        var utcsunrise = moment.utc(sunrise).toDate();
        var utcsunset = moment.utc(sunset).toDate();
        
        // 根据系统时间格式显示时间（12小时制或24小时制）
        var sunrise = config.timeFormat == 12 ? 
            moment(utcsunrise).local().format("h:mm") : 
            moment(utcsunrise).local().format("HH:mm");
        var sunset = config.timeFormat == 12 ? 
            moment(utcsunset).local().format("h:mm") : 
            moment(utcsunset).local().format("HH:mm");
		 
		// 创建日出日落时间显示表格
		var nextDiv = document.createElement('div');
		nextDiv.innerHTML=	
		`<div class="divTable">
   <div class="divTableBody">
   
      <div class="divTableRow">
         <div class="divTableHead">${this.customTranslate("Rise")}</div>        <!-- 日出标题 -->
         <div class="divTableHead">${this.customTranslate("Hours of Light")}</div> <!-- 日照时长标题 -->
         <div class="divTableHead">${this.customTranslate("Set")}</div>         <!-- 日落标题 -->
      </div>
	 
      <div class="divTableRow">
         <div class="divTableCell">${sunrise}</div>       <!-- 日出时间 -->
         <div class="divTableCell">${daylength}</div>     <!-- 日照时长 -->
         <div class="divTableCell">${sunset}</div>        <!-- 日落时间 -->
      </div>
   </div>
</div>`; 
		 wrapper.appendChild(nextDiv);  // 添加到DOM容器
		 
		// 获取当前时间并进行格式化处理
		var time = new Date();
        var g = time.getHours();        // 当前小时
        var m = time.getMinutes();      // 当前分钟
        var fun = g + ":" + m;          // 组合时间字符串
        var done = moment(fun, ["h:mm A"]).format("HH:mm");  // 格式化时间
        var str1 = moment(sunrise, ["h:mm A"]).format("HH:mm");  // 日出时间格式化
        var str2 = moment(sunset, ["h:mm A"]).format("HH:mm");   // 日落时间格式化
		
		// 获取当前时间、日出时间、日落时间的小时数用于判断白天/夜晚
		var ev1= moment().format("HH");         // 当前小时（24小时制）
		var ev2  = moment(srss.sunrise).format("HH");  // 日出小时
		var ev3 =  moment(srss.sunset).format("HH");   // 日落小时
	// console.log("Now :"+ev1 + " Rise: "+ ev2+" Set:  "+ev3);	// 调试输出当前时间、日出、日落时间
		// 创建空气质量、UV指数和风速显示表格
		var lastDiv = document.createElement('div');
        var level = this.air.aqius;  // 空气质量指数值
      /* 空气质量等级注释（已注释掉的代码）
      this.air.aqius  > 0 && this.air.aqius <= 50 ? this.air.aqius + "<span class='CellComment'>" + this.customTranslate('Excellent') + "</span>": 
      this.air.aqius > 50 && this.air.aqius <= 100 ? this.air.aqius + "<span class='CellComment'>" + this.customTranslate('Good') + "</span>" :
	  this.air.aqius > 100 && this.air.aqius <= 150 ? this.air.aqius + "<span class='CellComment'>" + this.customTranslate('Lightly Polluted') + "</span>":
	  this.air.aqius > 151 && this.air.aqius <= 200 ? this.air.aqius + "<span class='CellComment'>" + this.customTranslate('Moderately Polluted') + "</span>":
	  this.air.aqius > 201 && this.air.aqius <= 300 ? this.air.aqius + "<span class='CellComment'>" + this.customTranslate('Heavily Polluted') + "</span>":
	  this.air.aqius + "<span class='CellComment'>Severely Polluted</span></div>";	*/	
		lastDiv.innerHTML=
		`<div class="divTable">
   <div class="divTableBody">
  
      <div class="divTableRow">
         <div class="divTableHead">${this.customTranslate("AQI")}</div>
         <!-- 空气质量指数标题 -->
         <div class="divTableHead">${(ev1 >= ev2 && ev1 <= ev3) ? this.customTranslate("UV"): this.customTranslate("Moon")}</div>  <!-- 白天显示UV，夜晚显示Night -->
         <div class="divTableHead">${this.customTranslate("Wind")}</div>                                  <!-- 风速标题 -->
      </div>
	   
      <div class="divTableRow">
       <div class="divTableCell">${level}</div>                
         <!--空气质量指数值 -->
         <div class="divTableCell CellWithComment">${(ev1 >= ev2 && ev1 <= ev3) ? UV : (this.moon ? '<img src="'+this.config.moon[this.moon]+'" height="16px" width="16px" style="vertical-align: text-bottom; position: relative; top: -1px;"><span class="CellComment">' + this.translate(this.moon) + '</span>' : 'No moon data')}</div>  <!-- 白天显示UV指数，夜晚显示月相图标 -->
         <div class="divTableCell">${(this.config.lang != 'en') ? wind_kph : wind_mph}</div>      <!-- 非英语显示km/h，英语显示mph -->
      </div>
   </div>
</div>`; 
		 wrapper.appendChild(lastDiv);  // 添加到DOM容器
		 
	// 四天天气预报显示区域 ////////////////////////////////////////////////
	
		var forecast = this.current.forecast  // 获取预报数据
        if (forecast != null) {

            var ForecastTable = document.createElement("table");  // 创建预报表格
            ForecastTable.classList.add("table")
            ForecastTable.setAttribute('style', 'line-height: 20%;');  // 设置行高

            var FCRow = document.createElement("tr");              // 创建表格行
            var jumpy = document.createElement("th");              // 创建表头单元格
            jumpy.setAttribute("colspan", 4);                      // 跨4列
            jumpy.classList.add("rheading");                      // 添加CSS类
            jumpy.innerHTML = this.customTranslate("4 Day Forecast");    // 显示"四天预报"标题
            FCRow.appendChild(jumpy);                              // 添加表头到行
            ForecastTable.appendChild(FCRow);                     // 添加行到表格

            // 设置星期几数组
            var d = new Date();
            var weekday = new Array(7);  // 星期数组
            weekday[0] = "Sun";          // 周日
            weekday[1] = "Mon";          // 周一
            weekday[2] = "Tue";          // 周二
            weekday[3] = "Wed";          // 周三
            weekday[4] = "Thu";          // 周四
            weekday[5] = "Fri";          // 周五
            weekday[6] = "Sat";          // 周六

            var n = this.customTranslate(weekday[d.getDay()]);  // 获取当前星期的翻译

            // 创建日期行（显示星期几）
            var nextRow = document.createElement("tr");
            for (i = 0; i < forecast.length; i++) {
                var noaa = forecast[i];
                var wdshort = document.createElement("td");  // 创建日期单元格
                if (this.config.provider != "weatherunlocked") {
                    wdshort.classList.add("xsmall", "bright");  // 非weatherunlocked提供商的样式
                    //wdshort.setAttribute("style", "padding:11px");  // 注释掉的样式设置
                } else {
                    wdshort.classList.add("dates", "bright");   // weatherunlocked提供商的样式
                    wdshort.setAttribute("style", "padding:11px");  // 设置内边距
                }
                // 如果是今天显示"Today"，否则显示星期几
                wdshort.innerHTML = (this.customTranslate(noaa.date.weekday_short) == n) ? this.customTranslate("Today") : this.customTranslate(noaa.date.weekday_short);
                nextRow.appendChild(wdshort);          // 添加单元格到行
                ForecastTable.appendChild(nextRow);    // 添加行到表格
            }

            // 创建天气图标行
            var foreRow = document.createElement("tr");
            for (i = 0; i < this.current.forecast.length; i++) {
                var noaa = this.current.forecast[i];
                var fore = document.createElement("td");  // 创建图标单元格
                fore.setAttribute("colspan", "1");        // 跨1列
				//fore.setAttribute('style','float: center');  // 注释掉的居中样式
                fore.classList.add("CellWithComment");     // 添加工具提示CSS类
				if (noaa.date.weekday_short == n){
					// 今天不显示工具提示
					fore.innerHTML = "<img src='modules/MMM-NOAA3/images/" + noaa.icon + ".png' height='22' width='28'>";	
				} else {
					// 其他日期显示天气图标和描述工具提示
                fore.innerHTML = "<img src='modules/MMM-NOAA3/images/" + noaa.icon + ".png' height='22' width='28'><span class='CellComment'>" + this.customTranslate(noaa.desc) + "</span>";
				}
                foreRow.appendChild(fore);          // 添加单元格到行
                ForecastTable.appendChild(foreRow);  // 添加行到表格
            }

            // 创建温度显示行
            var tempRow = document.createElement("tr");
            for (i = 0; i < this.current.forecast.length; i++) {
                var noaa = this.current.forecast[i];
                var temper = document.createElement("td");  // 创建温度单元格
                temper.setAttribute("colspan", "1");         // 跨1列
                temper.setAttribute("style", "font-size:10px;");         // 跨1列
                temper.classList.add("xsmall","bright");    // 添加CSS类
                // 根据单位制式显示温度（华氏度/摄氏度）
                temper.innerHTML = (config.units != "metric") ? 
                    Math.round(noaa.low.fahrenheit) + " / " + Math.round(noaa.high.fahrenheit) : 
                    Math.round(noaa.low.celsius) + " / " + Math.round(noaa.high.celsius);
                tempRow.appendChild(temper);          // 添加单元格到行
                ForecastTable.appendChild(tempRow);  // 添加行到表格
            }

            wrapper.appendChild(ForecastTable);  // 将预报表格添加到DOM容器
        }
		
////////// 仅适用于DarkSKY的天气警报显示 ////////////////////
		var issue = this.issue;  // 获取警报数据
		if (typeof issue != 'undefined' || null){
			var keys = Object.keys(this.issue);  // 获取警报键名数组
			if (keys.length > 0) {  // 如果有警报数据
				if (this.activeItem >= keys.length) {
					this.activeItem = 0;  // 重置活动项索引（轮播功能）
				}
				var issue = this.issue[keys[this.activeItem]];  // 获取当前活动警报

				// 创建警报类型显示
				var warning = document.createElement("div");
				warning.classList.add('advise');
				warning.innerHTML = "Weather Advisory<BR> Type: "+issue.severity;  // 显示警报类型
				wrapper.appendChild(warning);

				// 创建警报标题和描述显示（带工具提示）
				var emer = document.createElement("div");
				emer.classList.add('warning', 'bright');
				var str2 = issue.description.replace(/(([^\s]+\s\s*){30})(.*)/,"$1…");  // 截断长描述（保留前30个单词）
				emer.innerHTML = issue.title + "<span class='tooltiptext'>" + str2+ "</span> ";  // 标题+工具提示
				wrapper.appendChild(emer);

				// 创建受影响区域标题
				var area = document.createElement("div");
				area.classList.add('areas');
				area.innerHTML = "Areas effected :<BR>";  // 受影响区域标题
				wrapper.appendChild(area);

				// 创建受影响地区列表
				var counties = issue.regions;  // 获取受影响地区数组
				var list = document.createElement("div");
				list.classList.add('list');
				for (var i = 0; i < counties.length; i++) {
					list.innerHTML += counties[i] + ",  ";  // 添加地区名称，用逗号分隔
				}
				wrapper.appendChild(list);
			}
		}
///////////// 警报显示结束 ///////////////////////////////////
		
		
		// 更新时间显示（如果配置启用）
		if (this.config.nupdate != false){  // 检查是否显示更新时间
        if (config.timeFormat == 12) {  // 12小时制时间格式
            var doutput = moment().format("M.D.YYYY");  // 月.日.年格式
            var tinput = document.lastModified;         // 获取最后修改时间
            var toutput = (moment(tinput.substring(10, 16), 'HH:mm').add(30, 'minutes').format('h:mm a'));  // 格式化时间并加30分钟
        } else {  // 24小时制时间格式
            var doutput = moment().format("DD.MM.YYYY");  // 日.月.年格式
            var tinput = document.lastModified;           // 获取最后修改时间
            var toutput = (moment(tinput.substring(10, 16), 'HH:mm').format('HH:mm'));  // 格式化时间
        }
		var x = this.config.updateInterval;  // 获取更新间隔
		var y = moment.utc(x).format('mm');    // 格式化更新间隔为分钟
        
		// 创建更新时间显示元素
        var mod = document.createElement("div");
        mod.classList.add("xxsmall");                     // 添加小字体CSS类
		mod.setAttribute('style','text-align: center;');     // 设置居中对齐
        mod.innerHTML = "<font color=yellow>[</font>Updated: " +  doutput + " @ "+  toutput+"<font color=yellow>]</font>";  // 显示更新时间
        wrapper.appendChild(mod);  // 添加到DOM容器
		}
        return wrapper;  // 返回完整的DOM容器
    },
});  // 模块注册结束