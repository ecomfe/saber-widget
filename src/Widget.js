/**
 * Saber Widget
 * Copyright 2014 Baidu Inc. All rights reserved.
 *
 * @file 基类
 * @author zfkun(zfkun@msn.com)
 */

define( function ( require, exports, module ) {

    var dom = require( 'saber-dom' );
    var lang = require( 'saber-lang' );
    var Type = require( 'saber-lang/type' );
    var Emitter = require( 'saber-emitter' );
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
     * @fires Widget#init
     * @fires Widget#beforerender
     * @fires Widget#afterrender
     * @fires Widget#beforedispose
     * @fires Widget#afterdispose
     * @fires Widget#enable
     * @fires Widget#disable
     * @fires Widget#propertychange
     * @param {Object=} options 初始化配置参数
     * @param {string=} options.id 控件标识
     * @param {HTMLElement=} options.main 控件主元素
     * @param {*=} options.* 其余初始化参数由各控件自身决定
     */
    var Widget = function ( options ) {
        options = options || {};

        /**
         * 控件属性集
         *
         * @private
         * @type {Object}
         */
        this.attrs = lang.extend(

            // `基类`默认属性集
            // 使用`extend`确保正确`mixin`子类构造函数中定义的默认属性
            {
                /**
                 * 控件类型标识
                 *
                 * @type {string}
                 */
                type: {

                    readOnly: true,

                    value: this.type

                },

                /**
                 * 控件`id`
                 *
                 * @type {string}
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
                 */
                main: {

                    readOnly: true,

                    getter: function () {
                        return this.main;
                    }

                }

            },

            // `子类`默认属性集
            this.attrs

        );

        /**
         * 控件状态集
         *
         * @private
         * @type {Object}
         */
        this.states = lang.extend(

            // `基类`默认属性集
            // 使用`extend`确保正确`mixin`子类构造函数中定义的默认状态
            {

                // 默认为禁用状态
                disable: true

            },

            // `子类`默认属性集
            this.states

        );

        /**
         * 运行时缓存区
         *
         * @private
         * @type {Object}
         */
        this.runtime = {};


        // **只读**的**核心**属性需提前处理
        this.id = options.id || widget.getGUID();
        this.main = dom.query( options.main );

        // 初始化后立即从`options`里移除，以免`initOptions`触发`set`操作并抛异常
        delete options.id;
        delete options.main;

        // 初始化配置
        this.initOptions( options );

        // 存储实例
        widget.add( this );

        // 更新状态
        this.addState( 'init' );

        /**
         * @event Widget#init
         * @param {Object} ev 事件参数对象
         * @param {string} ev.type 事件类型
         * @param {Widget} ev.target 触发事件的控件对象
         */
        this.emit( 'init' );
    };

    Widget.prototype = {

        constructor: Widget,

        /**
         * 控件类型标识
         *
         * @readonly
         * @type {string}
         */
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
        initDom: function () {},

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
         * @fires Widget#beforerender
         * @fires Widget#afterrender
         */
        render: function () {
            var rendered = this.is( 'render' );

            if ( !rendered ) {
                /**
                 * @event Widget#beforerender
                 * @param {Object} ev 事件参数对象
                 * @param {string} ev.type 事件类型
                 * @param {Widget} ev.target 触发事件的控件对象
                 */
                this.emit( 'beforerender' );

                // DOM初始化
                this.initDom();

                // 事件初始化
                this.initEvent();

                // 为控件主元素添加控件实例标识属性
                this.get( 'main' ).setAttribute( widget.getConfig( 'instanceAttr' ), this.get( 'id' ) );

                this.addState( 'render' );
            }

            // DOM重绘
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

        /**
         * 重新渲染视图
         * 首次渲染时, 不传入变更属性集合参数
         *
         * @protected
         * @param {Object=} changes 变更过的属性的集合
         * 每个**属性变更对象**结构如下
         * `属性名`：[ `变更前的值`, `变更后的值` ]
         */
        repaint: function () {},

        /**
         * 销毁控件
         *
         * @public
         * @fires Widget#beforedispose
         * @fires Widget#afterdispose
         */
        dispose: function () {
            if ( !this.is( 'dispose' ) ) {
                /**
                 * @event Widget#beforedispose
                 * @param {Object} ev 事件参数对象
                 * @param {string} ev.type 事件类型
                 * @param {Widget} ev.target 触发事件的控件对象
                 */
                this.emit( 'beforedispose' );

                // 先禁用控件
                this.disable();

                // 清理运行时缓存区
                this.runtime = null;

                // 清理DOM事件
                this.clearEvents();

                // 清理实例存储
                widget.remove( this );

                // 清除已激活插件
                widget.disposePlugin( this );

                /**
                 * @event Widget#afterdispose
                 * @param {Object} ev 事件参数对象
                 * @param {string} ev.type 事件类型
                 * @param {Widget} ev.target 触发事件的控件对象
                 */
                this.emit( 'afterdispose' );

                // 清理自定义事件
                this.off();

                // 更新状态
                this.addState( 'dispose' );

                // 移除控件主元素实例标识属性
                this.main.removeAttribute( widget.getConfig( 'instanceAttr' ) );

                // 释放主元素引用
                this.main = null;
            }
        },

        /**
         * 启用控件
         *
         * @public
         * @fires Widget#enable
         * @return {Widget} 当前实例
         */
        enable: function () {
            if ( this.is( 'disable' ) ) {
                this.removeState( 'disable' );

                /**
                 * @event Widget#enable
                 * @param {Object} ev 事件参数对象
                 * @param {string} ev.type 事件类型
                 * @param {Widget} ev.target 触发事件的控件对象
                 */
                this.emit( 'enable' );
            }

            return this;
        },

        /**
         * 禁用控件
         *
         * @public
         * @fires Widget#disable
         * @return {Widget} 当前实例
         */
        disable: function () {
            if ( !this.is( 'disable' ) ) {
                this.addState( 'disable' );

                /**
                 * @event Widget#disable
                 * @param {Object} ev 事件参数对象
                 * @param {string} ev.type 事件类型
                 * @param {Widget} ev.target 触发事件的控件对象
                 */
                this.emit( 'disable' );
            }

            return this;
        },



        /**
         * 控件是否处于指定状态
         *
         * @param {string} state 状态名
         * @return {boolean} 包含指定状态返回`true`
         */
        is: function ( state ) {
            return !!this.states[ state ];
        },

        /**
         * 添加控件状态
         *
         * @public
         * @param {string} state 状态名
         */
        addState: function ( state ) {
            this.states[ state ] = !0;
        },

        /**
         * 移除控件状态
         *
         * @public
         * @param {string} state 状态名
         */
        removeState: function ( state ) {
            delete this.states[ state ];
        },

        /**
         * 反转控件状态
         *
         * @public
         * @param {string} state 状态名
         * @param {boolean=} isForce 强制指定添加或删除, 传入`true`则添加, 反之则删除
         */
        toggleState: function ( state, isForce ) {
            isForce = 'boolean' === typeof isForce ? isForce : !this.is( state );
            this[ isForce ? 'addState' : 'removeState' ]( state );
        },



        /**
         * 获取控件属性
         *
         * @public
         * @param {string} name 属性名
         * @return {*} 返回目标属性的值
         */
        get: function ( name ) {
            var attr = this.attrs[ name ] || {};
            return attr.getter ? attr.getter.call( this, attr.value, name ) : attr.value;
        },

        /**
         * 设置控件属性
         *
         * @public
         * @param {string | Object} name 属性名
         * - 当为`string`类型时, 为属性名
         * - 当为`Object`类型时, 为包含`属性名:属性值`的对象
         * @param {*=} value 属性值
         * - 当`name`为`string`类型时, 为对应属性值
         * - 当`name`为`Object`类型时, 为配置对象`options`
         * @param {Object=} options 配置对象
         * @param {boolean} options.silent 是否静默模式, 默认`false`
         * 此配置为`true`时，属性的变化不会触发`propertychange`事件
         * @param {boolean} options.override 是否覆盖模式, 默认`false`
         * 当属性值是`简单对象`类型时,默认以`mixin`方式合并,此配置为`true`时，则直接覆盖
         * @throws 对**只读**属性赋值时会抛出异常
         * @fires Widget#propertychange
         */
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

            var isInited = this.is( 'init' );
            var repaintChanges = {};

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
                if ( !options.override && Type.isPlainObject( oldValue ) &&  Type.isPlainObject( newVal ) ) {
                    newVal = lang.extend( {}, oldValue, newVal );
                }

                // 更新属性`key`的值
                currentAttrs[ key ].value = newVal;

                // 忽略重复赋值
                if ( isEqual( newVal, oldValue ) ) {
                    continue;
                }

                // TODO: 是否有必要按属性触发? 或许集中在一起一次性通知更好? 暂时先这样吧
                // 未指定静默 或 非初始化阶段 才触发事件
                if ( !options.silent && isInited ) {
                    /**
                     * @event Widget#propertychange
                     * @param {Object} ev 事件参数对象
                     * @param {string} ev.type 事件类型
                     * @param {Widget} ev.target 触发事件的控件对象
                     * @param {string} key 属性名
                     * @param {*} oldValue 变更前的属性值
                     * @param {*} newVal 变更后的属性值
                     */
                    this.emit( 'propertychange', key, oldValue, newVal );
                }

                // 属性`key`的变化影响重绘，则加入重绘通知对象列表
                if ( currentAttrs[ key ].repaint ) {
                    repaintChanges[ key ] = [ oldValue, newVal ];
                }
            }

            // 存在影响重绘的属性变更时执行一次重绘
            if ( this.is( 'render' ) && Object.keys( repaintChanges ).length > 0 ) {
                this.repaint( repaintChanges );
            }

        },



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

            if ( events ) {
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
            }

            if ( guid ) {
                delete this.domEvents[ guid ];
            }
        },




        /**
         * 获取控件激活的指定插件
         *
         * @param {string} pluginName 插件名称
         * @return {?Plugin} 插件实例
         */
        plugin: function ( pluginName ) {
            return ( this.plugins || {} )[ pluginName ];
        },

        /**
         * 激活插件
         *
         * @param {string} pluginName 插件名称
         * @param {string=} optionName 插件初始化配置名
         * @return {Widget} 当前控件实例
         */
        enablePlugin: function ( pluginName, optionName ) {
            require( './main' ).enablePlugin(
                this,
                pluginName,
                ( this.options.plugin || {} )[ optionName || pluginName.toLowerCase() ]
            );
            return this;
        },

        /**
         * 禁用插件
         *
         * @param {string} pluginName 插件名称
         * @return {Widget} 当前控件实例
         */
        disablePlugin: function ( pluginName ) {
            require( './main' ).disablePlugin( this, pluginName );
            return this;
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

            if ( /^on[A-Z]/.test( key ) && 'function' === Type.type( val ) ) {
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



    /**
     * 判断变量是否相同
     *
     * @innder
     * @param {*} x 目标变量
     * @param {*} y 对比变量
     * @return {boolean}
     */
    function isEqual ( x, y ) {
        // 简单常规的
        if ( x === y ) {
            return true;
        }

        // 复杂非常规: 先对比类型, 不同直接返回
        var xType = Type.type( x );
        var yType = Type.type( y );
        if ( xType !== yType ) {
            return false;
        }

        // 简单原始类型: String, Number, Boolean
        var primitiveTypes = {

            // 'a', new String( 'a' ), new String( true ), new String( window ) ..
            'string': String,

            // 1, new Number( 1 ), new Number( '1' ) ..
            'number': Number,

            // true, new Boolean( true ), new Boolean( 'true' ), new Boolean( 'a' ) ..
            'boolean': Boolean

        };
        for ( var type in primitiveTypes ) {
            if ( type === xType ) {
                return x === primitiveTypes[ type ]( y );
            }
        }

        // 数组类型: 数组中含有非原始类型值时暂时认为不相等
        if ( 'array' === xType ) {
            var xyString = [ x.toString(), y.toString() ];
            return !/\[object\s/.test( xyString[ 0 ] )
                && !/\[object\s/.test( xyString[ 1 ] )
                && xyString[ 0 ] === xyString[ 1 ];
        }


        // 日期类型
        if ( 'date' === xType ) {
            return +x === +y;
        }

        // 正则类型
        if ( 'regexp' === xType ) {
            return xType.source === yType.source
                && xType.global === yType.global
                && xType.ignoreCase === yType.ignoreCase
                && xType.multiline === yType.multiline;
        }

        // 空值类型: null, undefined, '', [], {}
        if ( Type.isEmpty( x ) && Type.isEmpty( y ) ) {
            return true;
        }

        // 至此，非对象类型时，也直接 false
        if ( 'object' !== typeof x || 'object' !== typeof y ) {
            return false;
        }

        // 普通对象类型时，浅对比(因要递归)
        if ( Type.isPlainObject( x ) && Type.isPlainObject( y ) ) {
            // 先对比`键`
            if ( Object.keys( x ).toString() !== Object.keys( y ).toString()  ) {
                return false;
            }

            // 再对比`值`
            for ( var k in x ) {
                if ( x[ k ] !== y[ k ] ) {
                    return false;
                }
            }

            return true;
        }

        // 到此也够了 ~
        return false;

    }





    return Widget;

} );
