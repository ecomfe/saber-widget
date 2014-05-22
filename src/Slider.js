/**
 * @file [Please input file description]
 * @author zfkun(zfkun@msn.com)
 */

define( function ( require, exports, module ) {

    var lang = require( 'saber-lang' );
    var dom = require( 'saber-dom' );
    var Widget = require( './Widget' );


    /**
     * 轮播图控件
     *
     * @class
     * @constructor
     * @exports Slider
     * @extends Control
     * @requires saber-lang
     * @requires saber-dom
     * @fires Slider#destroy
     * @fires Slider#resize
     * @fires Slider#change
     * @fires Slider#active
     * @fires Slider#inactive
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

        // 加这货，纯属洁癖
        /**
         * 运行时缓存区对象
         *
         * @type {Object}
         * @protected
         */
        this.runtime = {};

        /**
         * 控件属性集
         *
         * @private
         * @type {Object}
         */
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
            auto: { value: true },

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
            flex: { value: false },

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
            switchAt: { value: 30 }

        };

        Widget.apply( this, arguments );
    }


    Slider.prototype = {

        /**
         * 初始化DOM
         *
         * @override
         */
        initStructure: function () {
            var wrapper = dom.query( '[data-role=wrapper]', this.main ) || dom.children( this.main )[ 0 ];
            var items = [];

            if ( wrapper ) {
                dom.setData( wrapper, 'role', 'wrapper' );

                items = dom.children( wrapper );
                items.forEach(
                    function ( item ) {
                        dom.setData( item, 'role', 'item' );
                    }
                );
            }

            this.runtime.length = items.length;
            this.runtime.wrapper = wrapper;

            // // 屏幕旋转自适应支持
            // if ( this.flex ) {
            //     ui.activePlugin( this, 'SliderFlex', ( this.options.plugin || {} ).flex );
            // }
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
                if ( !this.isActive ) {
                    return;
                }

                this.stop();

                startX = e.touches[ 0 ].pageX;
                diffX = 0;
            } );

            this.addEvent( this.get( 'main' ), 'touchmove', function ( e ) {
                if ( !this.isActive ) {
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
                if ( !this.isActive ) {
                    return;
                }

                var diff = Math.abs( diffX );

                // 超过移动阀值，才进行拖动结束后的修正，防止影响内部的点击
                if ( diff < this.get( 'moveAt' ) ) {
                    return;
                }

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

                // 恢复自动轮换
                this.start();
            } );
        },

        /**
         * 重新渲染视图
         * 首次渲染时, 不传入 changes 参数
         *
         * @override
         * @param {Object=} changes 变更过的属性的集合
         */
        repaint: function ( changes ) {
            // `render` 阶段调用时,不传入 `changes`
            if ( !changes ) {
                this._resize( this.runtime.width );
                this.active();
            }

            // // `SliderFlex` 插件更新
            // if ( changes && changes.hasOwnProperty( 'flex' ) ) {
            //     if ( this.flex ) {
            //         ui.activePlugin( this, 'SliderFlex', ( this.options.plugin || {} ).flex );
            //     }
            //     else {
            //         ui.disposePlugin( this, 'SliderFlex' );
            //     }
            // }

            // 父类方法最后调用处理
            Widget.prototype.repaint.call( this, changes );
        },

        /**
         * 调整组件宽度
         *
         * @private
         * @param {number=} width 指定的容器宽度
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

            var children = dom.children( runtime.wrapper );
            var childrenCount = children.length;

            for ( var i = 0; i < childrenCount; i++ ) {
                styleNumber( children[ i ], 'width', width );
            }

            styleNumber( runtime.wrapper, 'width', width * childrenCount );

            var oldWidth = runtime.width;
            runtime.width = width;

            /**
             * @event Slider#resize
             * @param {number} from 上一次的切换项宽度,单位像素
             * @param {number} to 当前的切换项宽度,单位像素
             */
            this.emit( 'resize', oldWidth, width );
        },

        /**
         * 启动/停止轮播
         *
         * @private
         * @param {boolean=} isStop 是否停止
         */
        _loop: function ( isStop ) {
            var runtime = this.runtime;
            var delay = this.get( 'interval' );

            runtime.timer = clearTimeout( runtime.timer );

            if ( isStop || runtime.length < 2 || !delay || delay < 0 ) {
                return;
            }

            runtime.timer = setTimeout(
                lang.bind( function () {
                    var index = this.get( 'index' ) + 1;
                    this.to( index < this.runtime.length ? index : 0 );
                    this.start();
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
                ( this.get( 'animate' ) ? '-webkit-transition-duration:' + speed + 'ms;' : '' ),
                '-webkit-transform: translate(' + x + 'px, 0)',
                ' translateZ(0)',
                ';'
            ].join( '' );
        },

        /**
         * 激活控件
         *
         * @override
         * @return {Slider} 当前实例
         */
        active: function () {
            if ( !this.isActive ) {
                this.isActive = true;

                // 启动自动切换
                this.start();

                /**
                 * @event Slider#active
                 */
                this.emit( 'active' );
            }

            return this;
        },

        /**
         * 禁用控件
         *
         * @override
         * @return {Slider} 当前实例
         */
        inactive: function () {
            if ( this.isActive ) {
                this.isActive = false;

                // 停止自动切换
                this.stop();

                /**
                 * @event Slider#inactive
                 */
                this.emit( 'inactive' );
            }

            return this;
        },

        start: function () {
            if ( this.get( 'auto' ) ) {
                this._loop();
            }
            return this;
        },

        stop: function () {
            if ( this.get( 'auto' ) ) {
                this._loop( true );
            }
            return this;
        },

        /**
         * 切换到指定项
         *
         * @public
         * @param {number} index 目标项的位置
         * @return {Slider} 当前实例
         */
        to: function ( index ) {
            if ( !this.isActive ) {
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
