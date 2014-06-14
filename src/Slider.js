/**
 * Saber Widget
 * Copyright 2014 Baidu Inc. All rights reserved.
 *
 * @file 轮播图控件
 * @author zfkun(zfkun@msn.com)
 */

define( function ( require, exports, module ) {

    var lang = require( 'saber-lang' );
    var dom = require( 'saber-dom' );
    var Widget = require( './Widget' );

    /**
     * CSS 专有前缀
     *
     * @const
     * @type {string}
     */
    var CSS_PREFIX = require( './lib' ).CSS_PREFIX;


    /**
     * 轮播图控件
     *
     * @class
     * @constructor
     * @exports Slider
     * @extends Widget
     * @requires saber-lang
     * @requires saber-dom
     * @fires Slider#resize
     * @fires Slider#change
     * @param {Object=} options 初始化配置参数
     * @param {string=} options.id 控件标识
     * @param {HTMLElement=} options.main 控件主元素
     * @param {boolean=} options.animate 是否启用切换动画
     * @param {boolean=} options.auto 是否自动循环切换
     * @param {boolean=} options.interval 自动循环切换间隔，单位毫秒
     * @param {boolean=} options.flex 是否自适应屏幕旋转
     * @param {boolean=} options.index 初始位置
     * @param {boolean=} options.speed 回弹动画时长，单位毫秒
     * @param {boolean=} options.moveAt 移动侦测阀值，单位像素
     * @param {boolean=} options.switchAt 切换阀值，单位像素
     */
    function Slider( options ) {


        this.attrs = {

            /**
             * 是否启用切换动画
             *
             * @type {boolean}
             */
            animate: { value: true },

            /**
             * 是否自动循环切换
             *
             * @type {boolean}
             */
            auto: { value: true, repaint: true },

            /**
             * 自动循环切换间隔，单位毫秒
             *
             * @type {number}
             */
            interval: { value: 2000 },

            /**
             * 是否自适应屏幕旋转
             * 此配置在插件`SliderFlex`引入后才起作用
             *
             * @type {boolean}
             */
            flex: { value: false, repaint: true },

            /**
             * 初始位置
             *
             * @type {number}
             */
            index: { value: 0 },

            /**
             * 回弹动画时长，单位毫秒
             *
             * @type {number}
             */
            speed: { value: 400 },

            /**
             * 移动侦测阀值，单位像素
             * 当按下后`移动距离`超过此阀值时才`启动`切换动画
             *
             * @type {number}
             */
            moveAt: { value: 10 },

            /**
             * 切换阀值，单位像素
             * 当`移动距离`超过此阀值时才进行`切换`，否则进行`回弹`
             *
             * @type {number}
             */
            switchAt: { value: 30 },

            /**
             * 轮播项总数
             *
             * @type {Object}
             */
            length: {

                readOnly: true,

                getter: function () {
                    return this.runtime.length || 0;
                }

            },

            /**
             * 切换项包装元素
             *
             * @type {HTMLElement}
             */
            wrapper: {

                readOnly: true,

                getter: function () {
                    return this.runtime.wrapper;
                }

            }

        };

        /**
         * 控件状态集
         *
         * @private
         * @type {Object}
         */
        this.states = {

            // 默认停止自动切换状态
            stop: true

        };

        // **MUST**最后调用父类的构造函数
        // 由于子类的`attrs`、`states`等需要与父类的对应默认值进行`mixin`
        Widget.apply( this, arguments );
    }


    Slider.prototype = {

        /**
         * 控件类型标识
         *
         * @readonly
         * @type {string}
         */
        type: 'Slider',

        /**
         * 初始化DOM
         *
         * @override
         */
        initDom: function () {
            var main = this.get( 'main' );
            var wrapper = dom.query( '[data-role=wrapper]', main ) || dom.children( main )[ 0 ];

            // 确保 `data-role` 设置正确
            if ( wrapper) {
                dom.setData( wrapper, 'role', 'wrapper' );
                dom.children( wrapper ).forEach(
                    function ( item ) {
                        dom.setData( item, 'role', 'item' );
                    }
                );
            }

            this.runtime.wrapper = wrapper;
        },

        /**
         * 初始化事件
         *
         * @override
         */
        initEvent: function () {
            // 每次拖动开始时的X
            var startX;
            // 上次有效拖动的相对位移值
            var diffX = 0;
            // 上次有效拖动时计算后的X
            var x = 0;

            // 上次拖动完成后的左边距
            this.runtime.x = 0;

            this.addEvent( this.get( 'main' ), 'touchstart', function ( e ) {
                if ( this.is( 'disable') ) {
                    return;
                }

                this.pause();

                startX = e.touches[ 0 ].pageX;
                diffX = 0;
            } );

            // TODO: 防抖
            this.addEvent( this.get( 'main' ), 'touchmove', function ( e ) {
                if ( this.is( 'disable') ) {
                    return;
                }

                diffX = e.touches[ 0 ].pageX - startX;

                // 超过移动阀值，才进行移动，防止影响内部的点击
                if ( Math.abs( diffX ) > this.get( 'moveAt' ) ) {
                    e.preventDefault();

                    x = this.runtime.x + diffX;

                    this._move( x );
                }
            } );

            this.addEvent( this.get( 'main' ), 'touchend', function ( e ) {
                if ( this.is( 'disable') ) {
                    return;
                }

                var diff = Math.abs( diffX );

                // 超过移动阀值，才进行拖动结束后的修正，防止影响内部的点击
                if ( diff > this.get( 'moveAt' ) ) {
                    // update
                    this.runtime.x = x;

                    // 达到切换阀值，则根据滑动方向切换
                    if ( diff > this.get( 'switchAt' ) ) {
                        this.to( this.get( 'index' ) + ( diffX < 0 ? 1 : -1 ) );
                    }
                    // 未达到阀值，则回弹复位
                    else {
                        this.to( this.get( 'index' ) );
                    }
                }

                // 恢复自动切换
                this.resume();
            } );
        },

        /**
         * 重新渲染视图
         * 首次渲染时, 不传入 changes 参数
         *
         * @override
         * @param {Object=} changes 变更过的属性的集合
         * 每个**属性变更对象**结构如下
         * `属性名`：[ `变更前的值`, `变更后的值` ]
         */
        repaint: function ( changes ) {
            // 先处理父类的重绘
            Widget.prototype.repaint.call( this, changes );

            // `render` 阶段调用时,不传入 `changes`
            if ( !changes ) {
                this._resize( this.runtime.width ).enable();
            }
            else {
                // 启动切换属性变更
                if ( changes.hasOwnProperty( 'auto' ) ) {
                    // 因属性`auto`值已发生变化, 这里调用需要带上`true`参数强制执行
                    this[ changes.auto[ 1 ] ? 'start' : 'stop' ]( true );
                }

                // `SliderFlex` 插件更新
                if ( changes.hasOwnProperty( 'flex' ) ) {
                    this[ changes.flex[ 1 ] ? 'enablePlugin' : 'disablePlugin' ]( 'SliderFlex', 'flex' );
                }
            }

        },



        /**
         * 调整控件宽度
         *
         * @private
         * @param {number=} width 指定的容器宽度
         * 不传宽度，则仅在容器宽度变化时才重绘，反之，则强制重绘
         * @fires Slider#resize
         * @return {Slider} 当前实例
         */
        _resize: function ( width ) {
            var runtime = this.runtime;

            if ( !width ) {
                // 未指定宽度时，仅在容器宽度发生变化时才重绘
                width = styleNumber( this.get( 'main' ) );
                if ( width == runtime.width ) {
                    return this;
                }
            }

            var items = dom.children( runtime.wrapper );
            var length = runtime.length = items.length;

            for ( var i = 0; i < length; i++ ) {
                styleNumber( items[ i ], 'width', width );
            }

            styleNumber( runtime.wrapper, 'width', width * length );

            var oldWidth = runtime.width;
            runtime.width = width;

            /**
             * @event Slider#resize
             * @param {number} from 上一次的切换项宽度,单位像素
             * @param {number} to 当前的切换项宽度,单位像素
             */
            this.emit( 'resize', oldWidth, width );

            return this;
        },

        /**
         * 轮播切换处理
         *
         * @private
         * @param {boolean=} isStop 是否停止
         */
        _loop: function ( isStop ) {
            var runtime = this.runtime;
            var delay = this.get( 'interval' );

            runtime.timer = clearTimeout( runtime.timer );

            // 已停止 或 间隔时长异常 则终止切换
            if ( isStop || !delay || delay < 0 ) {
                return;
            }

            // 切换项不足时, 恢复到第一项目并暂停切换
            if ( runtime.length < 2 ) {
                this.to( 0 ).pause();
                return;
            }

            // next
            runtime.timer = setTimeout(
                lang.bind( function () {
                    var index = this.get( 'index' ) + 1;
                    this.to( index < this.runtime.length ? index : 0 );

                    // next
                    this._loop();
                }, this ),
                delay
            );
        },

        /**
         * 切换移动
         *
         * @private
         * @param {number} x X轴偏移量
         * @param {number=} speed 移动速度,单位毫秒
         */
        _move: function ( x, speed ) {
            speed = speed || 0;
            this.runtime.wrapper.style.cssText += [
                ( this.get( 'animate' ) ? CSS_PREFIX + 'transition-duration:' + speed + 'ms;' : '' ),
                CSS_PREFIX + 'transform: translate(' + x + 'px, 0)',
                ' translateZ(0)',
                ';'
            ].join( '' );
        },



        /**
         * 激活控件
         *
         * @override
         * @fires Slider#enable
         * @return {Slider} 当前实例
         */
        enable: function () {
            // 先启动自动切换
            if ( this.is( 'disable' ) && this.is( 'render' ) ) {
                this.start();

                // 屏幕旋转自适应插件
                if ( this.get( 'flex' ) ) {
                    this.enablePlugin( 'SliderFlex', 'flex' );
                }
            }

            // 回归父类继续后续处理
            Widget.prototype.enable.call( this );

            return this;
        },

        /**
         * 禁用控件
         *
         * @override
         * @fires Slider#disable
         * @return {Slider} 当前实例
         */
        disable: function () {
            // 先停止自动切换
            if ( !this.is( 'disable' ) && this.is( 'render' ) ) {
                this.stop();

                // 屏幕旋转自适应插件
                if ( this.get( 'flex' ) ) {
                    this.disablePlugin( 'SliderFlex' );
                }
            }

            // 回归父类继续后续处理
            Widget.prototype.disable.call( this );

            return this;
        },

        /**
         * 数据同步
         * 此方法供用户在对`切换项`做了`添加`或`删除`后同步修改使用
         *
         * @public
         * @return {Slider} 当前实例
         */
        sync: function () {
            // 未渲染控件无需同步
            if ( this.is( 'render' ) ) {
                this.pause()
                ._resize( this.runtime.width )
                .resume();
            }

            return this;
        },


        /**
         * 启动自动切换
         *
         * @public
         * @param {boolean} isForce 是否强制启动
         * @return {Slider} 当前实例
         */
        start: function ( isForce ) {
            if ( this.is( 'stop' ) && ( isForce || this.get( 'auto' ) ) ) {
                this.removeState( 'stop' );
                this._loop();
            }

            return this;
        },

        /**
         * 停止自动切换
         *
         * @public
         * @param {boolean} isForce 是否强制停止
         * @return {Slider} 当前实例
         */
        stop: function ( isForce ) {
            if ( !this.is( 'stop' ) && ( isForce || this.get( 'auto' ) ) ) {
                this.addState( 'stop' );
                this._loop( true );
            }

            return this;
        },

        /**
         * 暂停自动切换
         *
         * @public
         * @return {Slider} 当前实例
         */
        pause: function () {
            if ( !this.is( 'pause' ) && !this.is( 'stop' ) ) {
                this.addState( 'pause' );
                this._loop( true );
            }

            return this;
        },

        /**
         * 恢复自动切换
         * 仅对**暂停**状态有效，若处于**停止**状态，则无效
         *
         * @public
         * @return {Slider} 当前实例
         */
        resume: function () {
            if ( this.is( 'pause' ) ) {
                this.removeState( 'pause' );
                this._loop();
            }

            return this;
        },



        /**
         * 切换到指定项
         *
         * @public
         * @param {number} index 目标项的位置
         * @fires Slider#change
         * @return {Slider} 当前实例
         */
        to: function ( index ) {
            if ( this.is( 'disable' ) ) {
                return this;
            }

            var runtime = this.runtime;
            var from = this.get( 'index' );

            // 防越界
            index = Math.max( 0, Math.min( runtime.length - 1, index ) );

            // 提前更新,以防不测- -
            this.set( 'index', index );

            // 更新计算X轴偏移
            runtime.x = 0 - runtime.width * index;

            this._move( runtime.x, this.get( 'speed' ) );

            // 排除回弹
            if ( from !== index ) {
                /**
                 * @event Slider#change
                 * @param {number} from 原来显示项的位置
                 * @param {number} to 当前显示项的位置
                 */
                this.emit( 'change', from, index );
            }

            return this;
        },

        /**
         * 切换到上一项
         *
         * @public
         * @return {Slider} 当前实例
         */
        prev: function () {
            return this.to( this.get( 'index' ) - 1 );
        },

        /**
         * 切换到下一项
         *
         * @public
         * @return {Slider} 当前实例
         */
        next: function () {
            return this.to( this.get( 'index' ) + 1 );
        }

    };

    lang.inherits( Slider, Widget );

    require( './main' ).register( Slider );



    /**
     * 设置/获取 元素的数字值类型的样式
     * 为了方便处理数字值类型的样式
     *
     * @inner
     * @param {HTMLElement} node 元素
     * @param {string} name 样式名,如`width`,`height`,`margin-left`等数字类型的样式
     * @param {number=} val 样式值(不含单位),传入时则为设置样式
     * @return {number=} 没有传入`val`参数时返回获取到的值，否则返回`undefined`
     */
    function styleNumber ( node, name, val ) {
        name = name || 'width';

        if ( arguments.length > 2 ) {
            return dom.setStyle( node, name, ( parseInt( val, 10 ) || 0 ) + 'px' );
        }

        return parseInt( dom.getStyle( node, name ), 10 ) || 0;
    }


    return Slider;

} );
