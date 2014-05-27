/**
 * Saber Widget
 * Copyright 2014 Baidu Inc. All rights reserved.
 *
 * @file 常用工具库模块
 * @author zfkun(zfkun@msn.com)
 */

define( function ( require, exports, module ) {

    /**
     * 常用工具库模块
     *
     * @exports lib
     * @singleton
     */
    var lib = {};





    /**
     * CSS 专属前缀
     *
     * @public
     * @const
     * @type {string}
     */
    lib.CSS_PREFIX = '';

    // 支持浏览器列表
    var vendors = { webkit: 'webkit', moz: '', o: 'o', ms: 'MS' };

    // 探测
    var detectNode = document.createElement( 'div' );
    for ( var vendor in vendors ) {
        if ( undefined !== detectNode.style[ vendors[ vendor ] + 'TransitionProperty' ] ) {
            lib.CSS_PREFIX = '-' + vendor + '-';
            break;
        }
    }
    detectNode = vendors = vendor = null;






    /**
     * 类型查询表
     *
     * @inner
     * @type {Object}
     */
    var class2type = {};

    // 填充初始化
    'Boolean Number String Function Array Date RegExp Object Error'
    .split(' ')
    .forEach(
        function ( name ) {
            class2type[ '[object ' + name + ']' ] = name.toLowerCase();
        }
    );


    /**
     * 图个方便
     *
     * @inner
     * @type {Function}
     */
    var toString = class2type.toString;

    /**
     * 获取变量类型
     *
     * @public
     * @param {*} obj 目标变量
     * @return {string} 类型名
     */
    lib.type = function ( obj ) {
        return ( obj == null ? String( obj ) : class2type[ toString.call( obj ) ] ) || 'object';
    };

    /**
     * 检测变量是否为函数
     *
     * @public
     * @param {*} obj 目标变量
     * @return {boolean}
     */
    lib.isFunction = function ( obj ) {
        return 'function' === this.type( obj );
    };

    /**
     * 检测变量是否为简单对象
     *
     * @public
     * @param {*} obj 目标变量
     * @return {boolean}
     */
    lib.isPlainObject = function ( obj ) {
        return 'object' === this.type( obj )
            && !( obj && obj === obj.window )
            && Object.getPrototypeOf( obj ) === Object.prototype;
    };

    /**
     * 检测变量是否为空的简单对象
     *
     * @public
     * @param {*} obj 目标变量
     * @return {boolean}
     */
    lib.isEmptyObject = function ( obj ) {
        if ( 'object' !== this.type( obj ) ) {
            return false;
        }

        for ( var key in obj ) {
            return false;
        }

        return true;
    };

    /**
     * 检测变量是否为空值类型
     * 目前 `[]`, `{}` 也算做空值
     *
     * @public
     * @param {*} obj 目标变量
     * @return {boolean}
     */
    lib.isEmpty = function ( obj ) {
        return null === obj
            || undefined === obj
            || '' === obj
            || ( Array.isArray( obj ) && 0 === obj.length )
            || this.isEmptyObject( obj );
    };

    /**
     * 判断变量是否相同
     *
     * @public
     * @param {*} x 目标变量
     * @param {*} y 对比变量
     * @return {boolean}
     */
    lib.isEqual = function ( x, y ) {
        // 简单常规的
        if ( x === y ) {
            return true;
        }

        // 复杂非常规: 先对比类型, 不同直接返回
        var xType = this.type( x );
        var yType = this.type( y );
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
        if ( this.isEmpty( x ) && this.isEmpty( y ) ) {
            return true;
        }

        // 至此，非对象类型时，也直接 false
        if ( 'object' !== typeof x || 'object' !== typeof y ) {
            return false;
        }

        // 普通对象类型时，浅对比(因要递归)
        if ( this.isPlainObject( x ) && this.isPlainObject( y ) ) {
            // 先对比键
            if ( !this.isEqual( Object.keys( x ).toString(), Object.keys( y ).toString() )  ) {
                return false;
            }

            // 再对比值
            for ( var k in x ) {
                if ( x[ k ] !== y[ k ] ) {
                    return false;
                }
            }

            return true;
        }

        // 到此也够了 ~
        return false;

    };





    return lib;

} );