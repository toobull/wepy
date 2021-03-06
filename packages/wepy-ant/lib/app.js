'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _native = require('./native');

var _native2 = _interopRequireDefault(_native);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var RequestMQ = {
    map: {},
    mq: [],
    running: [],
    MAX_REQUEST: 5,
    push: function push(param) {
        param.t = +new Date();
        while (this.mq.indexOf(param.t) > -1 || this.running.indexOf(param.t) > -1) {
            param.t += Math.random() * 10 >> 0;
        }
        this.mq.push(param.t);
        this.map[param.t] = param;
    },
    next: function next() {
        var me = this;

        if (this.mq.length === 0) return;

        if (this.running.length < this.MAX_REQUEST - 1) {
            var newone = this.mq.shift();
            var obj = this.map[newone];
            var oldComplete = obj.complete;
            obj.complete = function () {
                for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
                    args[_key] = arguments[_key];
                }

                me.running.splice(me.running.indexOf(obj.t), 1);
                delete me.map[obj.t];
                oldComplete && oldComplete.apply(obj, args);
                me.next();
            };
            this.running.push(obj.t);
            return my.request(obj);
        }
    },
    request: function request(obj) {
        var me = this;

        obj = obj || {};
        obj = typeof obj === 'string' ? { url: obj } : obj;

        this.push(obj);

        return this.next();
    }
};

var _class = function () {
    function _class() {
        _classCallCheck(this, _class);

        this.$addons = {};
        this.$interceptors = {};
        this.$pages = {};
    }

    _createClass(_class, [{
        key: '$init',
        value: function $init(wepy) {
            var config = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

            this.$initAPI(wepy, config.promisifyAPI);
            this.$initDiffAPI(wepy);
            this.$wxapp = getApp();
        }
    }, {
        key: 'use',
        value: function use(addon) {
            for (var _len2 = arguments.length, args = Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
                args[_key2 - 1] = arguments[_key2];
            }

            if (typeof addon === 'string' && this[addon]) {
                this.$addons[addon] = 1;
                this[addon](args);
            } else {
                this.$addons[addon.name] = new addon(args);
            }
        }
    }, {
        key: 'intercept',
        value: function intercept(api, provider) {
            this.$interceptors[api] = provider;
        }
    }, {
        key: 'promisify',
        value: function promisify() {}
    }, {
        key: 'requestfix',
        value: function requestfix() {}
    }, {
        key: '$initAPI',
        value: function $initAPI(wepy, promisifyAPI) {
            var self = this;
            var noPromiseMethods = {
                stopRecord: true,
                pauseVoice: true,
                stopVoice: true,
                pauseBackgroundAudio: true,
                stopBackgroundAudio: true,
                showNavigationBarLoading: true,
                hideNavigationBarLoading: true,
                createAnimation: true,
                createContext: true,
                createCanvasContext: true,
                hideKeyboard: true,
                stopPullDownRefresh: true
            };
            if (promisifyAPI) {
                for (var k in promisifyAPI) {
                    noPromiseMethods[k] = promisifyAPI[k];
                }
            }
            Object.keys(my).forEach(function (key) {
                if (!noPromiseMethods[key] && key.substr(0, 2) !== 'on' && !/\w+Sync$/.test(key)) {
                    Object.defineProperty(_native2.default, key, {
                        get: function get() {
                            return function (obj) {
                                obj = obj || {};
                                if (self.$interceptors[key] && self.$interceptors[key].config) {
                                    var rst = self.$interceptors[key].config.call(self, obj);
                                    if (rst === false) {
                                        if (self.$addons.promisify) {
                                            return Promise.reject('aborted by interceptor');
                                        } else {
                                            obj.fail && obj.fail('aborted by interceptor');
                                            return;
                                        }
                                    }
                                    obj = rst;
                                }
                                if (key === 'request') {
                                    obj = typeof obj === 'string' ? { url: obj } : obj;
                                }
                                if (key === 'getAuthCode') {
                                    obj.scopes = obj.scopes || 'auth_user';
                                }
                                if (typeof obj === 'string') {
                                    return my[key](obj);
                                }
                                if (self.$addons.promisify) {
                                    return new Promise(function (resolve, reject) {
                                        var bak = {};
                                        ['fail', 'success', 'complete'].forEach(function (k) {
                                            bak[k] = obj[k];
                                            obj[k] = function (res) {
                                                if (self.$interceptors[key] && self.$interceptors[key][k]) {
                                                    res = self.$interceptors[key][k].call(self, res);
                                                }
                                                if (k === 'success') resolve(res);else if (k === 'fail') reject(res);
                                            };
                                        });
                                        if (self.$addons.requestfix && key === 'request') {
                                            RequestMQ.request(obj);
                                        } else my[key](obj);
                                    });
                                } else {
                                    var bak = {};
                                    ['fail', 'success', 'complete'].forEach(function (k) {
                                        bak[k] = obj[k];
                                        obj[k] = function (res) {
                                            if (self.$interceptors[key] && self.$interceptors[key][k]) {
                                                res = self.$interceptors[key][k].call(self, res);
                                            }
                                            bak[k] && bak[k].call(self, res);
                                        };
                                    });
                                    if (self.$addons.requestfix && key === 'request') {
                                        RequestMQ.request(obj);
                                    } else my[key](obj);
                                }
                            };
                        }
                    });
                    wepy[key] = _native2.default[key];
                } else {
                    Object.defineProperty(_native2.default, key, {
                        get: function get() {
                            return function () {
                                for (var _len3 = arguments.length, args = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
                                    args[_key3] = arguments[_key3];
                                }

                                return my[key].apply(my, args);
                            };
                        }
                    });
                    wepy[key] = _native2.default[key];
                }
            });
        }
    }, {
        key: '$initDiffAPI',
        value: function $initDiffAPI(wepy) {
            var STORAGE_API = ['getStorageSync', 'setStorageSync', 'removeStorageSync'];
            var bak = {};
            STORAGE_API.forEach(function (api) {
                bak[api] = wepy[api];
                wepy[api] = function (key, data) {
                    var params = {};
                    if (typeof key === 'string') {
                        params.key = key;
                        if (data) {
                            params.data = data;
                        }
                    } else {
                        params = key;
                    }
                    return bak[api](params);
                };
            });

            wepy.setNavigationBarTitle = wepy.setNavigationBar;

            wepy.login = wepy.getAuthCode;

            wepy.request = wepy.httpRequest;

            if (this.$addons.promisify) {
                wepy.login = function () {
                    return new Promise(function (resolve, reject) {
                        wepy.getAuthCode().then(function (res) {
                            res.code = res.authCode;
                            delete res.authCode;
                            resolve(res);
                        }).catch(reject);
                    });
                };
                wepy.getUserInfo = function () {
                    return new Promise(function (resolve, reject) {
                        wepy.getAuthUserInfo(function (res) {
                            var rst = {};
                            for (var k in res) {
                                rst[k === 'avatar' ? 'avatarUrl' : k] = res[k];
                            }
                            resolve({
                                userInfo: rst
                            });
                        });
                    });
                };
            } else {
                wepy.login = function (o) {
                    var bak = {
                        success: o.success,
                        fail: o.fail,
                        complete: o.complete
                    };
                    o.success = function (res) {
                        res.code = res.authCode;
                        delete res.authCode;
                        bak.success && bak.success(res);
                    };
                    return wepy.getAuthCode(o);
                };
                wepy.getUserInfo = function (o) {
                    var bak = {
                        success: o.success,
                        fail: o.fail,
                        complete: o.complete
                    };
                    o.success = function (res) {
                        var rst = {};
                        for (var k in res) {
                            rst[k === 'avatar' ? 'avatarUrl' : k] = res[k];
                        }
                        bak.success && bak.success({ userInfo: rst });
                    };
                    return wepy.getAuthUserInfo(o);
                };
            }
        }
    }]);

    return _class;
}();

exports.default = _class;
//# sourceMappingURL=app.js.map