/**
 * Saber Widget
 * Copyright 2014 Baidu Inc. All rights reserved.
 *
 * @file 基类
 * @author zfkun(zfkun@msn.com)
 */

define(function ( require ) {

    var lang = require( 'saber-lang' );
    var dom = require( 'saber-dom' );
    var Emitter = require( 'saber-emitter' );
    // var Helper = require( './Helper' );
    var widget = require( './main' );

    /**
     * DOM事件存储器键值
     * 仅为控件管理的DOM元素使用，存储在控件实例上
     *
     * @const
     * @type {string}
     */
    var DOM_EVENTS_KEY = '_uiDOMEvent';


    /**
     * 控件基类
     * 禁止实例化，只能继承
     *
     * @constructor
     * @exports Widget
     * @class
     * @mixes Emitter
     * @requires saber-lang
     * @requires saber-dom
     * @requires saber-emitter
     * @param {Object=} options 初始化配置参数
     * @param {string=} options.id 控件标识
     * @param {HTMLElement=} options.main 控件主元素
     * @param {*=} options.* 其余初始化参数由各控件自身决定
     */
    var Widget = function ( options ) {

        // if ( Widget !== this.constructor ) {
        //     return new Widget( options );
        // }

        options = options || {};

        /**
         * 控件属性集
         *
         * @private
         * @type {Object}
         */
        this.attrs = lang.extend( {

            /**
             * 控件类型标识
             *
             * @type {string}
             * @readonly
             */
            type: {
                readOnly: true,
                getter: function () {
                    return this.type;
                }
            },

            /**
             * 控件`id`
             *
             * @type {string}
             * @readonly
             */
            id: {
                readOnly: true,
                getter: function () {
                    return this.id;
                }
            },

            /**
             * 控件主元素
             *
             * @type {HTMLElement}
             * @readonly
             */
            main: {
                readOnly: true,
                getter: function () {
                    return this.main;
                }
            },

            /**
             * 控件关联的`Helper`对象
             *
             * @type {Helper}
             * @readonly
             */
            helper: {
                readOnly: true,
                getter: function () {
                    return this.helper;
                }
            }

        }, this.attrs );


        this.id = options.id || widget.getGUID();
        this.main = dom.query( options.main );
        // this.helper = new Helper( this );

        delete options.id;
        delete options.main;

        // 初始化配置
        this.initOptions( options );

        // 存储实例
        widget.add( this );

        /**
         * @event Widget#init
         * @param {Object} ev 事件参数对象
         * @param {string} ev.type 事件类型
         * @param {Widget} ev.target 触发事件的控件对象
         */
        this.emit( 'init' );

        this.inited = true;
    };

    Widget.prototype = {

        constructor: Widget,

        type: 'Widget',

        /**
         * 初始化控件选项
         *
         * @protected
         * @param {Object} options 构造函数传入的选项
         * @param {string=} options.id 控件标识
         * @param {HTMLElement=} options.main 控件主元素
         * @param {*=} options.* 其余初始化参数由各控件自身决定
         */
        initOptions: function ( options ) {

            // 过滤`onxxx`形式参数并自动化绑定
            options = processEventHandlers.call( this, options );

            // 这里做了下对象克隆，以防各种不可预知的覆盖错误
            this.options = lang.extend( {}, options );

            this.set( this.options );
        },

        /**
         * 初始化DOM结构，仅在第一次渲染时调用
         *
         * @protected
         */
        initStructure: function () {},

        /**
         * 初始化DOM相关事件，仅在第一次渲染时调用
         *
         * @protected
         */
        initEvent: function () {},

        /**
         * 渲染控件
         *
         * @protected
         * @fires Control#beforerender
         * @fires Control#afterrender
         */
        render: function () {
            var rendered = this.rendered;

            if ( !rendered ) {
                /**
                 * 控件已渲染标志位
                 *
                 * @type {boolean}
                 * @private
                 */
                this.rendered = true;

                /**
                 * @event Widget#beforerender
                 * @param {Object} ev 事件参数对象
                 * @param {string} ev.type 事件类型
                 * @param {Widget} ev.target 触发事件的控件对象
                 */
                this.emit( 'beforerender' );

                // DOM初始化
                this.initStructure();

                // 事件初始化
                this.initEvent();

                // 为控件主元素添加控件实例标识属性
                this.get( 'main' ).setAttribute( widget.getConfig( 'instanceAttr' ), this.get( 'id' ) );

                // // 为控件主元素添加控件样式
                // this.helper.addClass();
            }

            // 子类自行覆盖扩展
            this.repaint();

            if ( !rendered ) {
                /**
                 * @event Widget#afterrender
                 * @param {Object} ev 事件参数对象
                 * @param {string} ev.type 事件类型
                 * @param {Widget} ev.target 触发事件的控件对象
                 */
                this.emit( 'afterrender' );
            }

            return this;
        },

        repaint: function () {},

        dispose: function () {
            if ( !this.disposed ) {
                /**
                 * @event Widget#beforedispose
                 * @param {Object} ev 事件参数对象
                 * @param {string} ev.type 事件类型
                 * @param {Widget} ev.target 触发事件的控件对象
                 */
                this.emit( 'beforedispose' );

                // 清理DOM事件
                this.clearEvents();

                // 清理实例存储
                widget.remove( this );

                /**
                 * @event Widget#afterdispose
                 * @param {Object} ev 事件参数对象
                 * @param {string} ev.type 事件类型
                 * @param {Widget} ev.target 触发事件的控件对象
                 */
                this.emit( 'afterdispose' );

                // 清理自定义事件
                this.off();

                this.disposed = true;
            }
        },


        // attribute

        get: function ( name ) {
            var attr = this.attrs[ name ] || {};
            return attr.getter ? attr.getter.call( this, attr.value, name ) : attr.value;
        },

        set: function ( name, value, options ) {
            // 当前的属性集合
            var currentAttrs = this.attrs;

            // 待设置的属性集合: { 'key1': value1, 'key2': value2 ... }
            var newAttrs = {};

            // 参数多态处理
            if ( 'string' === typeof name ) {
                newAttrs[ name ] = value;
            }
            else if ( 'object' === typeof name ) {
                newAttrs = name;
                options = value;
            }

            options = options || {};

            var isInited = this.inited;
            var isSilent = options.silent;
            var isOverride = options.override;

            // 循环处理每个属性
            for ( var key in newAttrs ) {

                if ( !newAttrs.hasOwnProperty( key ) ) {
                    continue;
                }

                // 属性`key`的新值
                var newVal = newAttrs[ key ];

                // 属性`key`的当前状态
                var attr = currentAttrs[ key ] || ( currentAttrs[ key ] = {} );

                // 属性`key`只读时，立即抛出异常
                if ( attr.readOnly || attr.readonly ) {
                    throw new Error( 'attribute is readOnly: ' + key );
                }

                // 属性`key`有`setter`方法，优先使用
                if ( attr.setter ) {
                    attr.setter.call( this, newVal, key );
                }

                // 属性`key`的值若是`Object`
                // 且新值也是`Object`时,
                // 非覆盖模式需要`merge`防止丢失属性
                var oldValue = attr.value;
                if ( !isOverride && isPlainObject( oldValue ) &&  isPlainObject( newVal ) ) {
                    newVal = lang.extend( {}, oldValue, newVal );
                }

                // 更新属性`key`的值
                currentAttrs[ key ].value = newVal;

                // 未指定静默 或 非初始化阶段 才触发事件
                if ( !isSilent && isInited ) {
                    // XXX: 考虑是否有必要这样，或许集中在一起通知一次更好？
                    this.emit( 'propertychange', key, oldValue, newVal );
                }
            }

        },



        // dom event
        /**
         * 为控件管理的DOM元素添加DOM事件
         *
         * @public
         * @param {HTMLElement} element 需要添加事件的DOM元素
         * @param {string} type 事件的类型
         * @param {function} handler 事件处理函数
         * @return {Widget} 实例自身
         */
        addEvent: function ( element, type, handler ) {
            if ( !this.domEvents ) {
                this.domEvents = {};
            }

            var guid = element[ DOM_EVENTS_KEY ];
            if ( !guid ) {
                guid = element[ DOM_EVENTS_KEY ] = widget.getGUID();
            }

            var events = this.domEvents[ guid ];
            if ( !events ) {
                // `events`中的键都是事件的名称，仅`node`除外，
                // 因为DOM上没有`node`这个事件，所以这里占用一下没关系
                events = this.domEvents[ guid ] = { node: element };
            }

            // var isGlobal = isGlobalEvent( element );

            var handlers = events[ type ];

            // 同一个部件元素的同一个DOM事件
            // 仅用一个处理函数处理,存放在队列的`handler`上
            if ( !handlers ) {
                handlers = events[ type ] = [];
                handlers.handler = lang.bind( triggerDOMEvent, null, this, element );
                element.addEventListener( type, handlers.handler, false );
            }

            // 过滤重复监听器
            if ( handlers.indexOf( handler ) < 0 ) {
                handlers.push( handler );
            }
        },

        /**
         * 为控件管理的DOM元素移除DOM事件
         *
         * @public
         * @param {HTMLElement} element 需要删除事件的DOM元素
         * @param {string} type 事件的类型
         * @param {Function=} handler 事件处理函数
         * 如果没有此参数则移除该控件管理的元素的所有`type`DOM事件
         */
        removeEvent: function ( element, type, handler ) {
            var events = this.domEvents;
            if ( !events ) {
                return;
            }

            events = events[ element[ DOM_EVENTS_KEY ] ];
            if ( !events || !events[ type ] ) {
                return;
            }

            // 图方便
            events = events[ type ];

            if ( !handler ) {
                events.length = 0;
                element.removeEventListener( type, events.handler, false );
            }
            else {
                var i = events.indexOf( handler );
                if ( i >= 0 ) {
                    events.splice( i, 1 );
                }
            }

            delete this.domEvents[ type ];
        },

        /**
         * 清除控件管理的DOM元素上的事件
         *
         * @public
         * @param {HTMLElement=} element 控件管理的DOM元素
         * 如果没有此参数则去除所有该控件管理的元素的DOM事件
         */
        clearEvents: function ( element ) {
            var events = this.domEvents;
            if ( !events ) {
                return;
            }

            var guid;

            if ( !element ) {
                for ( guid in events ) {
                    if ( events.hasOwnProperty( guid ) ) {
                        this.clearEvents( events[ guid ].node );
                    }
                }

                this.domEvents = null;

                return;
            }

            guid = element[ DOM_EVENTS_KEY ];
            events = events[ guid ];

            // `events`是各种DOM事件的键值对容器
            // 但包含存在一个键值为`node`的DOM对象，需要先移除掉
            // 以避免影响后面的`for`循环处理
            delete events.node;

            // 清除已经注册的事件
            for ( var type in events ) {
                if ( events.hasOwnProperty( type ) ) {
                    this.removeEvent( element, type );
                }
            }

            delete this.domEvents[ guid ];
        }

    };


    // 混入 `Emitter` 支持
    Emitter.mixin( Widget.prototype );


    /**
     * 触发自定义事件
     * 注: 监听器方法调用时第一个参数为如下的`Object`
     *    { `type`: 事件类型, `target`: 触发事件的控件对象 }
     *
     * @override
     * @param {string} type 事件名
     * @param {...*} * 传递给监听器的参数，可以有多个
     * @example
     * // 很多类型事件监听的场景下，可共享同一个 handler 简化代码
     * var handler = function( ev ) {
     *     var args = [].slice.call( arguments, 1 );
     *     console.info( 'event[%s]: ', ev.type, args );
     * };
     * var b = new Button( { content: 'test', onInit: handler } );
     * b.on( 'propertychange', handler);
     * b.render();
     * b.set( 'content', 'foo' );
     * @return {Emitter}
     */
    Widget.prototype.emit = function ( type ) {
        // 构造事件参数对象
        var ev = { type: type, target: this };

        // 构造新调用参数序列
        var args = [ ev ].concat( Array.prototype.slice.call( arguments, 1 ) );

        // 先调用直接写在实例上的 "onxxx"
        var handler = this[ 'on' + type ];
        if ( 'function' === typeof handler ) {
            handler.apply( this, args );
        }

        // 最终回到 `Emitter` 的 `emit` 方法
        // 使用调整后的新参数序列:
        // `type`, `ev`, `args`...
        Emitter.prototype.emit.apply( this, [ type ].concat( args ) );
    };




    /**
     * 触发DOM元素上的事件队列
     *
     * @inner
     * @param {Widget} widget 控件实例
     * @param {HTMLElement} element 触发事件的DOM元素
     * @param {Object} ev 事件信息对象
     */
    function triggerDOMEvent ( widget, element, ev ) {
        var queue = widget.domEvents[ ev.currentTarget[ DOM_EVENTS_KEY ] ][ ev.type ];
        if ( queue ) {
            queue.forEach(
                function ( fn ) {
                    fn.call( this, ev );
                },
                widget
            );
        }
    }


    /**
     * 处理`onxxx`形式的监听方法参数
     *
     * @inner
     * @param {Object} options 配置对象
     * @return {Object} 过滤掉事件监听属性的配置对象
     */
    function processEventHandlers( options ) {
        var key, val;
        for ( key in options ) {
            if ( !options.hasOwnProperty( key ) ) {
                continue;
            }

            val = options[ key ];

            if ( /^on[A-Z]/.test( key ) && isFunction( val ) ) {
                // 移除on前缀，并转换第3个字符为小写，得到事件类型
                this.on(
                    key.charAt( 2 ).toLowerCase() + key.slice( 3 ),
                    val
                );
                delete options[ key ];
            }
        }

        return options;
    }

    function isFunction ( obj ) {
        return '[object Function]' === Object.prototype.toString.call( obj );
    }

    function isPlainObject ( obj ) {
        return '[object Object]' === Object.prototype.toString.call( obj )
            && !( obj && obj === obj.window )
            && Object.getPrototypeOf( obj ) === Object.prototype;
    }




    return Widget;

});
