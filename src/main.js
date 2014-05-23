/**
 * Saber Widget
 * Copyright 2014 Baidu Inc. All rights reserved.
 *
 * @file 主模块
 * @author zfkun(zfkun@msn.com)
 */

define(function ( require ) {

    /**
     * 主模块
     * 提供组件全局配置、注册、管理等
     *
     * @exports widget
     * @singleton
     * @requires saber-lang
     */
    var main = {};






    /**
     * 控件库默认配置
     *
     * @inner
     * @type {Object}
     */
    var config = {

        // 控件配置信息所在的DOM属性名
        configAttr: 's-ui',

        // 控件实例的标识属性
        instanceAttr: 's-id',

        // 控件的默认class前缀
        uiClassPrefix: 'ui'

    };

    /**
     * 配置控件库全局配置
     *
     * @public
     * @param {Object} info 控件库配置信息对象
     */
    main.config = function ( info ) {
        require( 'saber-lang' ).extend( config, info );
    };

    /**
     * 获取配置项
     *
     * @public
     * @param {string} name 配置项名称
     * @return {string} 配置项值
     */
    main.getConfig = function ( name ) {
        return config[ name ];
    };






    /**
     * GUID生成基数
     *
     * @inner
     * @type {number}
     */
    var guid = 0x861005;

    /**
     * 生成全局唯一id
     *
     * @param {string=} prefix 前缀
     * @return {string} 新唯一id字符串
     */
    main.getGUID = function ( prefix ) {
        prefix = prefix || 's';
        return prefix + guid++;
    };





    /**
     * 清理已初始化的控件实例
     *
     * @param {(string|Widget|HTMLElement)=} widget 控件实例或控件实例id或DOM元素，不传则销毁全部
     * - 传入`控件id`时,销毁`id`对应的控件
     * - 传入`控件实例`时,销毁之
     * - 传入`DOM元素`时,销毁`DOM元素`内的所有控件
     */
    main.dispose = function ( widget ) {
        // 不传时，清理释放所有控件实例
        if ( !widget ) {
            for ( var w in widgets ) {
                widgets[ w ].dispose();
            }
        }
        // 传入字符串时，清理释放控件id与之匹配的实例
        else if ( 'string' === typeof widget ) {
            widget = this.get( widget );
            if ( widget ) {
                widget.dispose();
            }
        }
        // 传入控件实例时，直接清理释放
        else if ( 'function' === typeof widget.dispose ) {
            widget.dispose();
        }
        // 传入DOM元素时，清理释放DOM元素范围的实例
        else if ( /^\[object\sHTML/.test( Object.prototype.toString.call( widget ) ) ) {
            this.find( widget ).forEach( function ( w ) {
                w.dispose();
            } );
        }
    };

    /**
     * 获取指定DOM元素内的所有控件实例
     *
     * @param {HTMLElement} element 被检索的DOM元素
     * @return {Array.<Widget>} 查找到的控件实例
     */
    main.find = function ( element ) {
        var attr = this.getConfig( 'instanceAttr' );
        return [].map.call(
            element.querySelectorAll( '[' + attr + ']' ),
            function ( node ) {
                return main.get( node.getAttribute( attr ) );
            }
        );
    };






    /**
     * 控件实例集合
     * 以实例id为键值存储映射关系
     *
     * @inner
     * @type {Object}
     */
    var widgets = {};

    /**
     * 存储控件实例
     *
     * @public
     * @param {Widget} widget 待加控件实例
     */
    main.add = function( widget ) {
        var exists = widgets[ widget.id ];

        // 根据传入实例的id检索当前存储:
        // 若 不存在，直接加入存储
        // 若 存在, 但不是同一实例，则替换更新
        if ( !exists || exists !== widget ) {
            // 存储(或更新)实例
            widgets[ widget.id ] = widget;
        }
    };

    /**
     * 移除控件实例
     *
     * @public
     * @param {Widget} widget 待移除控件实例
     */
    main.remove = function( widget ) {
        delete widgets[ widget.id ];
    };

    /**
     * 通过id获取控件实例
     *
     * @public
     * @param {string} id 控件id
     * @return {Widget} 根据id获取的控件实例
     */
    main.get = function ( id ) {
        return widgets[ id ];
    };






    /**
     * 已注册控件类集合
     *
     * @inner
     * @type {Object}
     */
    var components = {};

    /**
     * 注册控件类
     * 通过类的`prototype.type`识别控件类型信息
     *
     * @public
     * @param {Function} component 控件类
     */
    main.register = function ( component ) {
        if ( 'function' === typeof component ) {
            var type = component.prototype.type;
            if ( type in components ) {
                throw new Error( type + ' is exists!' );
            }

            components[ type ] = component;
        }
    };



    return main;

});
