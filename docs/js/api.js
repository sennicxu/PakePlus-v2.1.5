// ============================================================
//  API 请求封装
// ============================================================
var API_BASE = 'http://localhost:5000/api';

function requestGet(url, params) {
    return new Promise(function(resolve, reject) {
        var xhr = new XMLHttpRequest();
        var fullUrl = API_BASE + url;
        
        if (params) {
            var queryParams = [];
            for (var key in params) {
                if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
                    var value = params[key];
                    if (typeof value === 'object') {
                        value = JSON.stringify(value);
                    }
                    queryParams.push(key + '=' + encodeURIComponent(value));
                }
            }
            if (queryParams.length > 0) {
                fullUrl += '?' + queryParams.join('&');
            }
        }
        
        xhr.open('GET', fullUrl, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        
        var token = localStorage.getItem('token');
        if (token) {
            xhr.setRequestHeader('Authorization', 'Bearer ' + token);
        }
        
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                try {
                    var response = JSON.parse(xhr.responseText);
                    if (response.code === 0) {
                        resolve(response.data);
                    } else {
                        reject(response.message || '请求失败');
                    }
                } catch (e) {
                    reject('响应解析失败: ' + e.message);
                }
            }
        };
        
        xhr.onerror = function() {
            reject('网络请求失败');
        };
        
        xhr.send();
    });
}

function requestPost(url, data) {
    return new Promise(function(resolve, reject) {
        var xhr = new XMLHttpRequest();
        var fullUrl = API_BASE + url;
        
        xhr.open('POST', fullUrl, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        
        var token = localStorage.getItem('token');
        if (token) {
            xhr.setRequestHeader('Authorization', 'Bearer ' + token);
        }
        
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                try {
                    var response = JSON.parse(xhr.responseText);
                    if (response.code === 0) {
                        resolve(response.data);
                    } else {
                        reject(response.message || '请求失败');
                    }
                } catch (e) {
                    reject('响应解析失败: ' + e.message);
                }
            }
        };
        
        xhr.onerror = function() {
            reject('网络请求失败');
        };
        
        xhr.send(JSON.stringify(data));
    });
}

// ============================================================
//  获取当前用户
// ============================================================
function getCurrentUser() {
    try {
        var user = localStorage.getItem('currentUser');
        return user ? JSON.parse(user) : null;
    } catch(e) {
        return null;
    }
}

function isAdmin() {
    var user = getCurrentUser();
    return user && user.UserRole === 2;
}

// ============================================================
//  门店API
// ============================================================
var StoreAPI = {
    list: function(params) {
        if (params && params.conditions && params.conditions.length > 0) {
            var postData = { conditions: params.conditions };
            if (params.logic) postData.logic = params.logic;
            return requestPost('/store/list', postData);
        }
        return requestGet('/store/list', params);
    },
    get: function(id) {
        return requestPost('/store/get', {id: id});
    },
    add: function(data) {
        return requestPost('/store/add', data);
    },
    update: function(data) {
        return requestPost('/store/update', data);
    },
    delete: function(id) {
        return requestPost('/store/delete', {id: id});
    }
};

// ============================================================
//  用户API
// ============================================================
var UserAPI = {
    list: function(params) {
        if (params && params.conditions && params.conditions.length > 0) {
            var postData = { conditions: params.conditions };
            if (params.logic) postData.logic = params.logic;
            return requestPost('/user/list', postData);
        }
        return requestGet('/user/list', params);
    },
    get: function(id) {
        return requestPost('/user/get', {id: id});
    },
    add: function(data) {
        return requestPost('/user/add', data);
    },
    update: function(data) {
        return requestPost('/user/update', data);
    },
    delete: function(id) {
        return requestPost('/user/delete', {id: id});
    },
    login: function(username, password) {
        return requestPost('/user/login', {username: username, password: password});
    }
};

// ============================================================
//  权限API
// ============================================================
var PermissionAPI = {
    list: function(params) {
        if (params && params.conditions && params.conditions.length > 0) {
            var postData = { conditions: params.conditions };
            if (params.logic) postData.logic = params.logic;
            return requestPost('/permission/list', postData);
        }
        return requestGet('/permission/list', params);
    },
    get: function(id) {
        return requestPost('/permission/get', {id: id});
    },
    add: function(data) {
        return requestPost('/permission/add', data);
    },
    update: function(data) {
        return requestPost('/permission/update', data);
    },
    delete: function(id) {
        return requestPost('/permission/delete', {id: id});
    },
    getUserStores: function(userId) {
        return requestPost('/permission/user_stores', {user_id: userId});
    }
};

// ============================================================
//  合同API
// ============================================================
var ContractAPI = {
    list: function(params) {
        var user = getCurrentUser();
        if (user && user.Id) {
            params = params || {};
            params._user_id = user.Id;
        }
        
        if (params && params.conditions && params.conditions.length > 0) {
            var postData = {
                conditions: params.conditions,
                _user_id: user ? user.Id : null
            };
            if (params.logic) postData.logic = params.logic;
            if (params.status) postData.status = params.status;
            if (params.store_id) postData.store_id = params.store_id;
            return requestPost('/contract/list', postData);
        }
        return requestGet('/contract/list', params);
    },
    get: function(id) {
        return requestPost('/contract/get', {id: id});
    },
    add: function(data) {
        return requestPost('/contract/add', data);
    },
    update: function(data) {
        return requestPost('/contract/update', data);
    },
    delete: function(id) {
        return requestPost('/contract/delete', {id: id});
    },
    adjustRent: function(data) {
        return requestPost('/contract/adjust_rent', data);
    }
};

// ============================================================
//  水电费API
// ============================================================
var UtilityAPI = {
    list: function(params) {
        var user = getCurrentUser();
        if (user && user.Id) {
            params = params || {};
            params._user_id = user.Id;
        }
        
        if (params && params.conditions && params.conditions.length > 0) {
            var postData = {
                conditions: params.conditions,
                _user_id: user ? user.Id : null
            };
            if (params.logic) postData.logic = params.logic;
            if (params.bill_year) postData.bill_year = params.bill_year;
            if (params.bill_month) postData.bill_month = params.bill_month;
            if (params.status) postData.status = params.status;
            return requestPost('/utility/list', postData);
        }
        return requestGet('/utility/list', params);
    },
    get: function(id) {
        return requestPost('/utility/get', {id: id});
    },
    add: function(data) {
        return requestPost('/utility/add', data);
    },
    update: function(data) {
        return requestPost('/utility/update', data);
    },
    delete: function(id) {
        return requestPost('/utility/delete', {id: id});
    },
    updateToReceivable: function(data) {
        return requestPost('/utility/update_to_receivable', data);
    }
};

// ============================================================
//  调租日志API
// ============================================================
var RentLogAPI = {
    list: function(params) {
        return requestGet('/rent_log/list', params);
    },
    byContract: function(contractId) {
        return requestPost('/rent_log/by_contract', {contract_id: contractId});
    }
};

// ============================================================
//  应收账款API
// ============================================================
var ReceivableAPI = {
    list: function(params) {
        var user = getCurrentUser();
        if (user && user.Id) {
            params = params || {};
            params._user_id = user.Id;
        }
        
        if (params && params.conditions && params.conditions.length > 0) {
            var postData = {
                conditions: params.conditions,
                _user_id: user ? user.Id : null
            };
            if (params.logic) postData.logic = params.logic;
            if (params.bill_year) postData.bill_year = params.bill_year;
            if (params.bill_month) postData.bill_month = params.bill_month;
            if (params.charge_status) postData.charge_status = params.charge_status;
            if (params.store_id) postData.store_id = params.store_id;
            return requestPost('/receivable/list', postData);
        }
        return requestGet('/receivable/list', params);
    },
    get: function(id) {
        return requestPost('/receivable/get', {id: id});
    },
    generate: function(data) {
        return requestPost('/receivable/generate', data);
    },
    updateStatus: function(data) {
        return requestPost('/receivable/update_status', data);
    }
};

// ============================================================
//  收款API
// ============================================================
var PaymentAPI = {
    list: function(params) {
        var user = getCurrentUser();
        if (user && user.Id) {
            params = params || {};
            params._user_id = user.Id;
        }
        
        if (params && params.conditions && params.conditions.length > 0) {
            var postData = {
                conditions: params.conditions,
                _user_id: user ? user.Id : null
            };
            if (params.logic) postData.logic = params.logic;
            if (params.payment_method) postData.payment_method = params.payment_method;
            if (params.start_date) postData.start_date = params.start_date;
            if (params.end_date) postData.end_date = params.end_date;
            return requestPost('/payment/list', postData);
        }
        return requestGet('/payment/list', params);
    },
    get: function(id) {
        return requestPost('/payment/get', {id: id});
    },
    add: function(data) {
        return requestPost('/payment/add', data);
    },
    delete: function(id) {
        return requestPost('/payment/delete', {id: id});
    }
};

// ============================================================
//  报表API
// ============================================================
var ReportAPI = {
    monthlySummary: function(params) {
        var user = getCurrentUser();
        if (user && user.Id) {
            params = params || {};
            params._user_id = user.Id;
        }
        return requestPost('/report/monthly_summary', params);
    },
    arrearsSummary: function(params) {
        var user = getCurrentUser();
        if (user && user.Id) {
            params = params || {};
            params._user_id = user.Id;
        }
        return requestPost('/report/arrears_summary', params);
    },
    storeIncome: function(params) {
        var user = getCurrentUser();
        if (user && user.Id) {
            params = params || {};
            params._user_id = user.Id;
        }
        return requestPost('/report/store_income', params);
    }
};