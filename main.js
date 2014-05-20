/**
 * Saber Widget
 * Copyright 2014 Baidu Inc. All rights reserved.
 *
 * @file 主模块
 * @author zfkun(zfkun@msn.com)
 */

define(function ( require ) {

    var extend = require( 'saber-lang/extend' );

    /**
     * 主模块
     * 提供组件全局注册、管理等
     *
     * @exports widget
     * @singleton
     * @requires saber-lang/extend
     */
    var main = {};



    /**
     * 清理已初始化的控件实例
     *
     * @param {(string|Widget)=} widget 空或控件id或实例
     */
    main.dispose = function ( widget ) {
        // 不传时，清理释放所有控件实例
        if ( !widget ) {
            for ( var w in widgets ) {
                w.dispose();
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



    return main;

});
