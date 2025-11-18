# MMM-NOAA V3.0 中文版

[![Platform](https://img.shields.io/badge/platform-MagicMirror-informational)](https://MagicMirror.builders)
[![license](https://img.shields.io/github/license/mashape/apistatus.svg)](LICENSE)

> **致谢声明**：本项目基于 [mumblebaj/MMM-NOAA3](https://github.com/mumblebaj/MMM-NOAA3) 进行开发，感谢原作者的杰出贡献！

> **中文汉化与优化版**：本项目为 [TwinsenLiang/MMM-NOAA3](https://github.com/TwinsenLiang/MMM-NOAA3) 分支，主要针对中文用户进行优化

## Support

如果你喜欢这个模块，可以通过给原项目点星或请原作者喝咖啡来支持他的工作。

<a href="https://www.buymeacoffee.com/mumblebaj" target="_blank"><img src="https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png" alt="Buy Me A Coffee" style="height: 45px !important;width: 180px !important;" ></a>

**为你的魔镜提供天气信息**

- 包含紫外线指数和空气质量指数 [注意：AQI 在某些地区可能无法正常工作]

## 🆕 版本差异说明

**中文版与原版的差异：**

1. **完整中文汉化**：
   - 所有界面元素、天气描述、空气质量等级等均已汉化
   - 支持完整的中文天气描述翻译（基于OpenWeatherMap API）
   - 风向、月相等专业术语均已本地化

2. **关于月相的优化**：
   - 原作者使用的是 http://api.farmsense.net/v1/moonphases 的API接口已经失效了
   - 获取OpenWeatherMap的多天数据来做切换为今天月相

3. **配置优化**：
   - 简化配置文件结构
   - 自动识别中文语言环境

## 示例

请查看下方示例！！

- 根据您的 config.js 文件自动调整语言和其他所有设置！

## 终端安装说明

- 将 `git clone https://github.com/TwinsenLiang/MMM-NOAA3.git` 克隆到 `~/MagicMirror/modules` 目录
- 进入 `cd MMM-NOAA3` 目录
- 运行 `npm install` 安装依赖

## 获取免费的 API 密钥 [天气API，您还需要获取空气质量API密钥 - 见下文]

有多个提供商可供选择：您只需要从以下提供商中选择一个API：
请注意，并非所有提供商都相同...有些比其他更好 :)

- weatherbit ~ https://www.weatherbit.io/api
- piratesky ~ https://pirateweather.net/en/latest/API/ //[目前仅支持此提供商的用户经纬度]
- accuweather ~ https://developer.accuweather.com/
- openweather ~ https://openweathermap.org/api
- msn ~ http://weather.service.msn.com

## 您需要您的纬度和经度

您可以在这里找到它们：
https://www.latlong.net/

## 从以下地址获取您的空气质量API密钥

[https://airvisual.com/api](https://airvisual.com/api)

## Config.js 配置项和选项

通过读取您的 config.js 文件中的默认设置，将自动选择翻译文件和温度单位（华氏度或摄氏度）
如果找不到翻译文件，将默认使用英文。

## 提供商名称必须在 config.js 中指定。以下是可用的提供商：

- weatherbit
- piratesky
- accuweather
- openweather
- msn
- 通用配置示例：
  ```
   {
         module: 'MMM-NOAA3',
         position: 'top_right',
         disabled: false,
         config: {
             provider: "openweather",
             apiKey: "your api key", // msn 不需要 apiKey
             airKey: "c097c9cb-2a72-4e43-9868-907196674033",
             units: "metric",
             css: "NOAA4",
             updateInterval: 1800000,
             userlat: "xx.xxxxxx",
             userlon: "xx.xxxxxx",
             language: "zh-cn", // 中文版已汉化，建议使用中文
             zip: 0000 // 您的邮政编码
         }
     },
  ```

使用 Accuweather 时，邮政编码需要是 accuweather.com 网站上搜索邮政编码后返回的 6 位代码。
例如：邮政编码 "13502" 返回 "329671" - 这就是我在配置文件中设置的内容，以便显示本地天气。
zip: '329671', // 必须有有效的邮政编码

- Accuweather 示例：
  ```
   {
        module: 'MMM-NOAA3',
        position: 'top_left',
            config: {
            provider: "accuweather",
            airKey: "YOUR API KEY",
            css: "NOAA3",                 // 必须包含 CSS 样式名称
            userlat: "xxxx", // 必须有
            userlon: "xxxx"  // 必须有
            zip: "11111" // 必须有有效的邮政编码
  }
    },

  ```

## 已知问题

虽然我们努力让 NOAA 成为完美的天气模块，但并非所有免费 API 密钥都会提供天气警告。
由于 Wunderground 停止服务，我们建议您使用以下模块来获取天气警告：

https://github.com/LukeSkywalker92/MMM-DWD-WarnWeather

这是一个天气警告模块，可以很好地满足需求 :)

## 更新间隔

通过配置可以更改更新间隔... 当前设置为 30 分钟，如下所示 -> updateInterval: 30 _ 60 _ 1000

您可以在 config.js 中添加此项来更改它，如下所示：

    {
        module: 'MMM-NOAA3',
        config: {
    	    provider: "msn",
    	    airKey: "YOUR API KEY",
            css: "NOAA4",   // 必须包含 CSS 样式名称
    	    updateInterval: 15 * 60 * 1000, // 每 15 分钟或您选择的间隔，但请确保您的 API 允许每天调用这么多次！
    	    userlat: "xxxx", // 必须有
            userlon: "xxxx"  // 必须有
    }
    },

## CSS 样式

- 您可以选择 5 种样式 [颜色] 之一来定制 NOAA3
  - MMM-NOAA1
  - MMM-NOAA2
  - MMM-NOAA3
  - MMM-NOAA4
  - 以及现在新增的
  - MMM-NOAA5 (占用空间更小！ 自行承担使用风险，仍需要进一步测试)

## NOAA1 (颜色样式 #1)

![](examples/1.png)

## NOAA2 (颜色样式 #2)

![](examples/2.png)

## NOAA3 (颜色样式 #3)

![](examples/3.png)

## NOAA4 (自动改变颜色)

![](examples/4.gif)

## NOAA5 (更紧凑的布局)

![](examples/5.gif)

## 鼠标悬停效果是什么？

现在当您将鼠标悬停在顶部的当前温度上时，会显示您的天气预报...
当您将鼠标悬停在 4 天预报上时，会显示当天的预报... (参见上面的 NOAA4 示例)..

## 自定义 CSS

如果我想要纯白色怎么办？  
只需进入 MagicMirror² 的 css 目录，打开 custom.css 文件并像这样编辑！

```
 .MMM-NOAA3 .rheading {
    background-color:  #000;
    border: none;
    }
 .MMM-NOAA3  .divTableHead {
     color: #fff;
    }
```

这将为您提供纯白色的标题，或者选择您想要的任何颜色样式！ :) 像这样 ->  
![](examples/plain.png)

## 启动您的魔镜...享受吧！

第一次运行时...可能会出现错误。它需要找到您的经纬度。第一次运行时它会找到它...之后就可以正常工作了 :)
