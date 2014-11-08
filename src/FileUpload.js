/**
 * @file 文件上传
 * @author hushicai(bluthcy@gmail.com)
 */

define(
    function(require) {
        var lang = require('saber-lang');
        var dom = require('saber-dom');
        var Widget = require('./Widget');
        var Emitter = require('saber-emitter');

        /**
         * array buffer转成string
         * 
         * @inner
         * @return {string} 
         */
        function arrayBufferToString(arrayBuffer) {
            var buf = new Uint8Array(arrayBuffer);
            var binary = '';
            function charCode(x) {
                binary += String.fromCharCode(x);
            }
            Array.prototype.map.call(buf, charCode);
            return binary;
        }

        /**
         * string转成array buffer
         * 
         * @inner
         * @return {Uint8Array} 
         */
        function stringToArrayBuffer(binary) {
            function byteValue(x) {
                // 丢掉高位
                return x.charCodeAt(0) & 0xff;
            }
            var buf = Array.prototype.map.call(binary, byteValue);
            // 咱们都是utf8系统
            // 因此采用Uint8视图
            var ui8a = new Uint8Array(buf);
            return ui8a;
        }


        // 失败状态
        // 只配置一个标志符
        // 在emit fail时，组件会把state发送出去；
        // 如果能拿到statusCode和error，则一并发送出去
        // 用户可以在fail事件中拿到此标志符，在具体的业务中配置文案
        var FailState = {
            // 前端文件大小限制
            LIMIT: 'limit',
            // 超时
            TIMEOUT: 'timeout',
            // 后台返回了status=1
            BACKENDFAIL: 'backendFail',
            // 后台返回的数据格式有误，json解析错误
            // 302、500等状态也能处理
            // 404在某些的服务器上也能处理，它们会把404重定向到一个error页面
            PARSEERROR: 'parseError'
        };

        /**
         * 上传基类
         * 
         * @constructor
         */
        function Base(options) {
            // 超过30s提示超时
            this.duration = 30000;
            // 文件大小上限，单位M
            this.limit = 3;
            // 透传的参数
            this.params = null;
            lang.extend(this, options);
        }

        Base.prototype = {
            constructor: Base,

            post: function() {
                // virtual
            },

            _progress: function(t) {
                t = parseInt(t * 100, 10);
                this.emit('progress', t);
            },

            // 鉴于浏览器对xhr progress支持力度太差
            // 这里统一用定时器来模拟进度

            /**
             * 开始定时器
             * 
             * @private
             */
            _startInterval: function() {
                this._startTime = +new Date();
                this._interval = setInterval(lang.bind(this._step, this), 1000);
                this._step();
            },

            /**
             * 逐帧
             * 
             * @private
             */
            _step: function() {
                var now = +new Date();
                var delta = now - this._startTime;
                var percent = delta / this.duration;

                if (percent >= 1) {
                    this._endInterval();
                    // 上传超时
                    this._failHandler({state: FailState.TIMEOUT});
                }
                else {
                    this._progress(percent);
                }
            },

            /**
             * 结束定时器
             * 
             * @private
             */
            _endInterval: function() {
                this._interval && clearInterval(this._interval);
                this._interval = null;
            },

            /**
             * 开始上传
             * 
             * @private
             */
            _startHandler: function() {
                this.emit('start');
                this._startInterval();
            },

            /**
             * 上传完成
             * 
             * @private
             */
            _doneHandler: function(data) {
                // 上传完成后，显示一下100%
                this._progress(1);
                this._endInterval();
                this.emit('done', data);
            },

            /**
             * 上传失败
             * 
             * @private
             */
            _failHandler: function(e) {
                this._endInterval();
                this.emit('fail', e);
            },

            dispose: function() {
                this._endInterval();
            }
        };

        Emitter.mixin(Base.prototype);

        /**
         * ajax上传
         * 
         * @constructor
         */
        function AjaxUpload(options) {
            // 表单域名称
            // 后台通过此字段接受文件
            this.name = 'file';

            Base.call(this, options);
        }

        AjaxUpload.prototype = {
            constructor: AjaxUpload,

            _prepareXMLHttpRequest: function() {
                // 需要重试
                // 如果重复调用prepareXMLHttpRequest方法，则释放原来的xhr对象
                if (this._xhr) {
                    this._disposeXhr();
                }

                var xhr = new XMLHttpRequest();
                this._xhr = xhr;
                this._readyStateChanger = lang.bind(this._readyStateChanger, this);
                xhr.onreadystatechange = this._readyStateChanger;

                xhr.open('post', this.action, true);

                xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

                return xhr;
            },

            _readyStateChanger: function(e) {
                var xhr = this._xhr;

                if (xhr.readyState !== 4) {
                    return;
                }

                xhr.onreadystatechange = null;

                if (xhr.status >= 200 && xhr.status < 300) {
                    var responseText = xhr.responseText;
                    var json;
                    try {
                        json = JSON.parse(responseText);

                        if (json.status === 0) {
                            return this._doneHandler(json.data);
                        }
                        else {
                            // 后台提示的信息
                            return this._failHandler(
                                {state: FailState.BACKENDFAIL, error: json.statusInfo}
                            );
                        }
                    }
                    catch (ex) {
                        return this._failHandler({state: FailState.PARSEERROR, statusCode: xhr.status});
                    }
                }
                else {
                    this._failHandler({state: FailState.PARSEERROR, statusCode: xhr.status});
                }
            },

            /**
             * 创建form-data分隔符
             * 
             * @private
             * @return {string} 
             */
            _getBoundary: function() {
                if (!this._boundary) {
                    this._boundary = '----' + (+new Date());
                }

                return this._boundary;
            },

            _buildFormData: function(field) {
                // formdata之间的分隔符有坑，需要符合一定的规则
                // 可以先参考一下chrome的post内容
                var dash = '--';
                var boundary = this._getBoundary();
                var crlf = '\r\n';

                var name = field.name;
                var data = field.data;
                var mine = field.mine || 'application/octet-stream';
                var filename = field.filename || '';

                var result = [];
                var formdata = '';
                formdata += 'Content-Disposition: form-data; name="' + name + '"';
                if (filename) {
                    formdata += '; filename="' + filename + '"';
                }
                formdata += crlf;
                formdata += 'Content-Type: ' + mine + crlf + crlf;
                formdata += data + crlf;
                result.push(formdata);

                // 透传一些参数
                var params = this.params || {};
                for (var key in params) {
                    if (params.hasOwnProperty(key)) {
                        formdata = '';
                        formdata += 'Content-Disposition: form-data; name="' + key + '"' + crlf;
                        formdata += crlf;
                        formdata += params[key] + crlf;
                        result.push(formdata);
                    }
                }

                // 第一个分隔符
                formdata = dash + boundary + crlf;
                // 内容
                formdata += result.join(dash + boundary + crlf);
                // 最后一个分隔符
                formdata += dash + boundary + dash + crlf;

                return formdata;
            },

            getInfo: function() {
                var file = this._file;
                var info = {
                    filename: file.name,
                    size: file.size,
                    mine: file.type,
                    name: this.name
                };

                return info;
            },

            /**
             * 提交
             * 
             * @public
             */
            post: function(input) {
                var files = input.files;
                if (files.length === 0) {
                    return;
                }
                // 单文件
                var file = files[0];

                this._file = file;

                // 限定一下文件大小
                var info = this.getInfo();
                // 作为可配置项
                if (info.size >= this.limit * 1024 * 1024) {
                    return this._failHandler({state: FailState.LIMIT});
                }

                this._startHandler();

                if (window.FormData) {
                    // 如果支持FormData，则直接发送FormData
                    var formdata = new FormData();
                    formdata.append(this.name, file, file.name);

                    var params = this.params || {};
                    for (var key in params) {
                        formdata.append(key, params[key]);
                    }

                    this.sendFormData(formdata);
                }
                else {
                    // 否则需要使用FileReader读取文件内容，自己构造form data
                    var fileReader = new FileReader();
                    var self = this;
                    fileReader.onloadend = function(e) {
                        fileReader = fileReader.onloadend = null;
                        self.sendAsBinary(this.result);
                    };
                    fileReader.readAsArrayBuffer(file);
                }

                return this;
            },

            /**
             * 直接发送FormData
             * 
             * @public
             */
            sendFormData: function(formdata) {
                var xhr = this._prepareXMLHttpRequest();
                xhr.send(formdata);
            },

            /**
             * 按字符串发送
             * 
             * 以这种方式需要注意以下步骤：
             * 1. 读取文件内容，`readAsArrayBuffer`
             * 2. 将array buffer转成字符串
             * 3. 将字符串构造成form-data格式
             * 4. 发送字符串
             * 5. 如果xhr不支持发送字符串，则还需要将form data转成array buffer
             * 
             * @public
             */
            sendAsBinary: function(buf) {
                var info = this.getInfo();

                info.data = arrayBufferToString(buf);

                var xhr = this._prepareXMLHttpRequest();
                var boundary = this._getBoundary();

                xhr.setRequestHeader('Content-Type', 'multipart/form-data; boundary=' + this._boundary);

                var formdata = this._buildFormData(info);
                if (xhr.sendAsBinary) {
                    return xhr.sendAsBinary(formdata);
                }

                var buf = stringToArrayBuffer(formdata);
                return xhr.send(buf);
            },

            abort: function() {
                this._xhr.abort();
                this._disposeXhr();
            },

            _disposeXhr: function() {
                var xhr = this._xhr;
                if (xhr === null) {
                    return;
                }
                xhr.onreadystatechange = null;
                this._xhr = null;
            },

            dispose: function() {
                this._disposeXhr();
                Base.prototype.dispose.call(this);
            }
        };

        lang.inherits(AjaxUpload, Base);

        /**
         * iframe上传
         * 
         * @constructor
         */
        function IframeUpload(options) {
            // 创建iframe
            var iframe = document.createElement('iframe');
            iframe.src = 'about:blank';
            iframe.name = '_iframe_upload_' + (+new Date());
            iframe.style.display = 'none';

            this._loadHandler = lang.bind(this._loadHandler, this);
            iframe.onload = this._loadHandler;
            this._iframe = iframe;

            document.body.appendChild(iframe);

            Base.call(this, options);
        }

        IframeUpload.prototype = {
            constructor: IframeUpload,

            post: function(input) {
                var form;
                var node = input;

                while (node) {
                    if (node.tagName.toLowerCase() === 'form') {
                        form = node;
                        break;
                    }
                    node = node.parentNode;
                }

                if (form) {
                    this._startHandler();
                    form.action = this.action;
                    form.target = this._iframe.name;
                    form.submit();
                }
            },

            _loadHandler: function(e) {
                var contentWindow = this._iframe.contentWindow;
                var doc = contentWindow.document;
                var content = doc.body.innerHTML;

                // about:blank也会触发onload
                // 因此内容不为空时，才处理
                if (content) {
                    try {
                        var text = doc.body.textContent;
                        var res = JSON.parse(text);

                        res = res || {};
                        
                        if (res.status === 0) {
                            this._doneHandler(res.data);
                        }
                        else {
                            this._failHandler({state: FailState.BACKENDFAIL, error: res.statusInfo});
                        }
                    } 
                    catch (ex) {
                        this._failHandler({state: FailState.PARSEERROR});
                    }
                }
            },

            dispose: function() {
                this._iframe.parentNode.removeChild(this._iframe);
                this._iframe = null;
                Base.prototype.dispose.call(this);
            }
        };

        lang.inherits(IframeUpload, Base);

        /**
         * 上传状态
         * 
         * @type {Object}
         */
        var State = {
            // 初始化
            INIT: 0,
            // 上传中
            PENDING: 1,
            // 上传成功
            DONE: 2,
            // 上传失败
            FAIL: 3
        };

        /**
         * 文件上传控件
         * 
         * @constructor
         */
        function FileUpload(options) {
            this.attrs = {
                // 文件选择框的name属性
                name: {
                    value: 'file'
                },
                // 上传选择框的accept属性
                accept: {
                    value: 'image/*'
                },
                // 文件上传地址
                action: {
                    value: ''
                },
                // 透传的参数
                params: {
                    value: {}
                }
            };

            Widget.apply(this, arguments);
        }

        FileUpload.prototype.type = 'FileUpload';

        FileUpload.prototype.initDom = function() {
            dom.addClass(this.main, 'fileupload');

            // 需要这个form
            // 以便支持iframe的上传方式
            var form = document.createElement('form');
            form.enctype = 'multipart/form-data';
            form.method = 'post';
            form.className = 'fileupload-form';

            // 暂存form元素
            this.runtime.form = form;

            var input = document.createElement('input');
            input.type = 'file';
            input.name = this.get('name');
            input.accept = this.get('accept') || '';
            input.className = 'fileupload-input';
            
            // 暂存input元素
            this.runtime.input = input;

            form.appendChild(input);

            this.main.appendChild(form);

            // 创建upload对象
            this._createUploadInstance();

            // 上传状态
            // 自己在runtime中维护一个状态吧
            // `this.states`是控件本身的状态，不适用
            this.runtime.state = State.INIT;
        };

        FileUpload.prototype.initEvent = function() {
            // bind contexts
            this._start = lang.bind(this._start, this);
            this._progress = lang.bind(this._progress, this);
            this._done = lang.bind(this._done, this);
            this._fail = lang.bind(this._fail, this);

            // events
            var upload = this.runtime.upload;
            upload.on('start', this._start);
            upload.on('progress', this._progress);
            upload.on('done', this._done);
            upload.on('fail', this._fail);

            // file input event
            this._fileChangeHandler = lang.bind(this._fileChangeHandler, this);
            this.runtime.input.addEventListener('change', this._fileChangeHandler, false);
        };

        /**
         * 失败重试
         * 
         * @public
         */
        FileUpload.prototype.retry = function() {
            if (this.runtime.state === State.FAIL) {
                this.runtime.post(this.runtime.input);
                this.emit('retry');
            }
        };

        /**
         * 简单工厂，生成upload对象
         * 
         * @private
         */
        FileUpload.prototype._createUploadInstance = function() {
            var options = {
                name: this.get('name'),
                action: this.get('action'),
                limit: this.get('limit'),
                params: this.get('params')
            };

            var instance;

            if (window.FileReader && window.ProgressEvent) {
                instance = new AjaxUpload(options);
            }
            else {
                instance = new IframeUpload(options);
            }

            this.runtime.upload = instance;

            return instance;
        };

        /**
         * 处理文件选择
         * 
         * @private
         */
        FileUpload.prototype._fileChangeHandler = function(ev) {
            var input = ev.target;
            var value = input.value;

            if (!value) {
                return;
            }

            this.runtime.upload.post(input);
            this.emit('filechange');
        };

        // 以下各个钩子，不具体实现，只改变状态和发事件
        // 使用者可以利用组合方式，维护一个`FileUpload`实例或者利用继承重载

        /**
         * 开始上传
         * 
         * @private
         */
        FileUpload.prototype._start = function() {
            this.runtime.state = State.PENDING;
            this.emit('start');
        };

        /**
         * 上传进度
         * 
         * @private
         */
        FileUpload.prototype._progress = function(t) {
            this.emit('progress', t);
        };

        /**
         * 上传结束，成功和失败都会调用
         * 
         * @private
         */
        FileUpload.prototype._end = function() {
            this.emit('end');
        };

        /**
         * 上传完成
         * 
         * @private
         */
        FileUpload.prototype._done = function(data) {
            this.runtime.state = State.DONE;
            this._end();
            this.emit('done', data);
        };

        /**
         * 上传失败
         * 
         * @private
         */
        FileUpload.prototype._fail = function(data) {
            this.runtime.state = State.FAIL;
            this._end();
            this.emit('fail', data);
        };

        /**
         * 释放
         * 
         * @public
         */
        FileUpload.prototype.dispose = function() {
            Widget.prototype.dispose.call(this);
        };

        lang.inherits(FileUpload, Widget);

        require('./main').register(FileUpload);
    }
);
