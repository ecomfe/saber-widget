/**
 * Saber Widget
 * Copyright 2014 Baidu Inc. All rights reserved.
 *
 * @file 缩放插件
 * @author zfkun(zfkun@msn.com)
 */

define( function ( require, exports, module ) {

    var dom = require( 'saber-dom' );
    var Plugin = require( './Plugin' );


    /**
     * 缩放插件
     *
     * @class
     * @constructor
     * @exports Zoom
     * @extends Plugin
     * @requires saber-lang
     * @param {Widget} widget 控件实例
     * @param {Object=} options 插件配置项
     */
    var Zoom = function( widget, options ) {
        Plugin.apply( this, arguments );
    };

    Zoom.prototype = {

        /**
         * 插件类型标识
         *
         * @private
         * @type {string}
         */
        type: 'Zoom',

        /**
         * 默认配置
         *
         * @type {Object}
         */
        options: {

            /**
             * 移动侦测阀值，单位像素
             * 当按下后`移动距离`超过此阀值时才`启动`切换动画
             *
             * @type {number}
             */
            moveAt: 10

        },

        /**
         * 禁用插件
         *
         * @override
         */
        disable: function () {
            this.reset();

            // 及时解绑, 以防元素意外删除等
            this.main = null;

            Plugin.prototype.disable.call( this );
        },


        /**
         * 重置还原
         *
         * @return {Zoom} 当前实例
         */
        reset: function () {
            if ( !this.is( 'disable' ) ) {
                // 清理侦听器 & 还原缩放
                this._toggleTouchEvents( true );
                this._zoom( true );
            }

            return this;
        },

        /**
         * 缩放指定元素
         *
         * @param {HTMLElement} node 目标元素
         */
        scale: function ( node ) {
            if ( !node ) {
                return;
            }

            // 主元素发生变化，则需要先清理还原当前关联的主元素
            if ( this.main && this.main !== node ) {
                this.reset();
            }

            // 更新关联元素
            /**
             * 插件关联的当前缩放元素
             *
             * @type {HTMLElement}
             */
            this.main = node;

            this._zoom();
        },

        /**
         * 执行缩放
         *
         * @private
         * @param {boolean=} isReset 是否强制还原
         * @return {Zoom} 当前实例
         */
        _zoom: function ( isReset ) {
            if ( this.main ) {
                var isZooming = isReset || this.target.is( 'zoom' );

                // 3D变换
                transformNode( this.main, 'all 500ms', 0, 0, isZooming ? 1 : 2 );

                // 更新宿主控件缩放状态标示
                this.target[ isZooming ? 'removeState' : 'addState' ]( 'zoom' );

                // 更新缩放相关事件监听
                this._toggleTouchEvents( isZooming );
            }

            return this;
        },

        /**
         * 切换移动
         *
         * @private
         * @param {number} x X轴偏移量
         * @param {number} y Y轴偏移量
         * @return {Zoom} 当前实例
         */
        _move: function ( x, y ) {
            transformNode( this.main, '0ms', x, y, this.target.is( 'zoom' ) ? 2 : 1 );
            return this;
        },

        /**
         * 绑定/解除 相关触摸事件
         *
         * @private
         * @param {boolean=} isOff 是否强制解除
         * @return {Zoom} 当前实例
         */
        _toggleTouchEvents: function ( isOff ) {
            if ( !this.main ) {
                return this;
            }

            if ( isOff ) {
                this.target.clearEvents( this.main );
            }
            else {
                var self = this;

                // 每次拖动开始时的X
                var startXY;
                // 上次有效拖动的相对位移值
                var diffXY;
                // 上次有效拖动时计算后的X
                var xy = [ 0, 0 ];

                var lastXY = [ 0, 0 ];

                this.target.addEvent( this.main, 'touchstart', function ( e ) {
                    // 停止冒泡
                    e.stopPropagation();

                    diffXY = [ 0, 0 ];
                    startXY = [ e.touches[ 0 ].pageX, e.touches[ 0 ].pageY ];
                } );

                this.target.addEvent( this.main, 'touchmove', function ( e ) {
                    // 停止冒泡
                    e.stopPropagation();

                    // 计算移动偏移
                    diffXY = [
                        e.touches[ 0 ].pageX - startXY[ 0 ],
                        e.touches[ 0 ].pageY - startXY[ 1 ]
                    ];


                    // 超过移动阀值，才进行移动，防止影响内部的点击
                    if ( Math.abs( diffXY[ 0 ] ) > self.options.moveAt || Math.abs( diffXY[ 1 ] ) > self.options.moveAt ) {
                        xy = [ lastXY[ 0 ] + diffXY[ 0 ], lastXY[ 1 ] + diffXY[ 1 ] ];

                        self._move( xy[ 0 ], xy[ 1 ] );
                    }
                } );

                this.target.addEvent( this.main, 'touchend', function ( e ) {
                    // 超过移动阀值，才进行必要的更新
                    if ( Math.abs( diffXY[ 0 ] ) > self.options.moveAt || Math.abs( diffXY[ 1 ] ) > self.options.moveAt ) {
                        // 停止冒泡
                        e.stopPropagation();

                        // 更新坐标
                        lastXY = xy.concat( [] );
                    }
                } );
            }

            return this;
        }

    };


    require( 'saber-lang' ).inherits( Zoom, Plugin );

    require( '../main' ).registerPlugin( Zoom );




    /**
     * 对元素进行3D变换
     *
     * @inner
     * @param {HTMLElement} node 目标元素
     * @param {string} transition transition值
     * @param {number=} x X轴位移
     * @param {number=} y Y轴位移
     * @param {number} scale 缩放比
     */
    function transformNode( node, transition, x, y, scale ) {
        node.style.webkitTransition = transition;
        node.style.webkitTransform = [
            'translateX(' + ( x || 0 ) + 'px)',
            'translateY(' + ( y || 0 ) + 'px)',
            'scale(' + scale + ')'
        ].join( ' ' );
    }

    return Zoom;

} );
