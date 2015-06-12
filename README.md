saber-widget [![Build Status](https://travis-ci.org/ecomfe/saber-widget.png)](https://travis-ci.org/ecomfe/saber-widget)
===

适合移动端的UI组件库。

## Installation

通过 [`edp`](https://github.com/ecomfe/edp) 引入模块：

```sh
edp import saber-widget
```

## API

* [主模块 main](./doc/api-main.md)

### 控件

* [基类 Widget](./doc/api-widget.md)
* [懒加载 LazyLoad](./doc/api-widget-lazyload.md)
* [轮播图 Slider](./doc/api-widget-slider.md)
* [图片查看器 ImageView](./doc/api-widget-imageview.md)
* [搜索建议 Suggestion](./doc/api-widget-suggestion.md)
* [单选组 RadioGroup](./doc/api-widget-radiogroup.md)
* [文件上传 FileUpload](./doc/api-widget-fileupload.md)

__注：__ 如果需要使用 [轮播图(Slider)](./doc/api-widget-slider.md) 与 [图片查看器(ImageView)](./doc/api-widget-imageview.md) 请手动引入额外依赖 [hammer](http://hammerjs.github.io/)(&gt;= 2.0.4)，可以使用以下命令引入：

```sh
edp import hammer
```

### 插件

* [基类 Plugin](./doc/api-plugin.md)
* [翻转自适应(轮播图) SliderFlex](./doc/api-plugin-sliderflex.md)
* [翻转自适应(图片查看器) ImageViewFlex](./doc/api-plugin-imageviewflex.md)
* [遮罩 Masker](./doc/api-plugin-masker.md)
