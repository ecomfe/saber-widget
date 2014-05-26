/**
 * Saber Widget
 * Copyright 2014 Baidu Inc. All rights reserved.
 *
 * @file 轮播图翻转自适应插件
 * @author zfkun(zfkun@msn.com)
 */

define( function ( require, exports, module ) {

    var bind = require( 'saber-lang/bind' );
    var matchMedia = require( 'saber-matchmedia' );


    /**
     * 屏幕翻转监听辅助对象
     * 为了节省内存，只监听一次，所有`Slider实例`使用这个`Helper`来处理
     *
     * @inner
     * @type {Object}
     */
    var orientationHelper = {};
    require( 'saber-emitter' ).mixin( orientationHelper );

    // 监听屏幕翻转，并由 `orientationHelper` 统一调度
    matchMedia( 'screen and (orientation: portrait)' ).addListener(function () {
        orientationHelper.emit( 'change' );
    });



    /**
     * 轮播图翻转自适应插件
     *
     * @constructor
     * @exports SliderFlex
     * @class
     * @requires saber-lang
     * @requires saber-matchmedia
     * @param {Slider} slider 轮播图控件实例
     * @param {Object=} options 插件配置项
     */
    var SliderFlex = function( slider, options ) {
        /**
         * 轮播图控件实例
         *
         * @public
         * @type {Slider}
         */
        this.target = slider;
        this.initOptions( options );
    };

    SliderFlex.prototype = {

        /**
         * 插件类型标识
         *
         * @private
         * @type {string}
         */
        type: 'SliderFlex',

        /**
         * 插件初始化
         *
         * @protected
         * @param {Object=} options 构造函数传入的配置参数
         */
        initOptions: function ( options ) {
            this.options = options || {};

            if ( this.target.is( 'render' ) ) {
                this.render();
            }
            else {
                this.target.on(
                    'afterrender',
                    this.onRender = bind( this.render, this )
                );
            }
        },

        /**
         * 初始化所有事件监听
         *
         * @protected
         */
        attachEvents: function () {
            var slider = this.target;

            this.onRepaint = bind( this.repaint, this );
            orientationHelper.on( 'change', this.onRepaint );

            this.onEnable = bind( this.enable, this );
            slider.on( 'enable', this.onEnable );
            slider.on( 'show', this.onEnable );

            this.onDisable = bind( this.disable, this );
            slider.on( 'disable', this.onDisable );
            slider.on( 'hide', this.onDisable );
        },

        /**
         * 释放所有事件监听
         *
         * @protected
         */
        detachEvents: function() {
            var slider = this.target;

            slider.off( 'afterrender', this.onRender );

            orientationHelper.off( 'change', this.onRepaint );

            slider.off( 'enable', this.onEnable );
            slider.off( 'show', this.onEnable );

            slider.off( 'disable', this.onDisable );
            slider.off( 'hide', this.onDisable );

            this.onRender = this.onRepaint = this.onEnable = this.onDisable = null;
        },


        /**
         * 销毁插件
         *
         * @public
         */
        dispose: function () {
            this.detachEvents();
            this.target = null;
        },

        /**
         * 启用插件
         *
         * @public
         */
        enable: function () {
            this.disabled = false;
        },

        /**
         * 禁用插件
         *
         * @public
         */
        disable: function () {
            this.disabled = true;
        },

        /**
         * 重置插件
         *
         * @public
         */
        repaint: function () {
            if ( this.disabled ) {
                return;
            }

            var slider = this.target;

            // 暂停自动轮播
            slider.pause();

            // 重绘尺寸 & 重新切换一下使新尺寸立即生效
            slider._resize();
            slider.to( slider.get( 'index' ) );

            // 恢复自动轮播
            slider.resume();
        },

        /**
         * 渲染插件
         *
         * @public
         */
        render: function () {
            if ( this.rendered ) {
                return;
            }

            this.rendered = !0;

            this.attachEvents();

            this.repaint();
        }

    };

    require( '../main' ).registerPlugin( SliderFlex );

    return SliderFlex;

} );
