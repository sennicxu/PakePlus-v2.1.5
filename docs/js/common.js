// ========== 日期格式化 ==========
function formatDate(dateStr) {
    if (!dateStr) return '-';
    try {
        var d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        var y = d.getFullYear();
        var m = String(d.getMonth() + 1).padStart(2, '0');
        var day = String(d.getDate()).padStart(2, '0');
        var h = String(d.getHours()).padStart(2, '0');
        var min = String(d.getMinutes()).padStart(2, '0');
        var s = String(d.getSeconds()).padStart(2, '0');
        return y + '-' + m + '-' + day + ' ' + h + ':' + min + ':' + s;
    } catch(e) {
        return dateStr;
    }
}

function formatDateShort(dateStr) {
    if (!dateStr) return '-';
    try {
        var d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        var y = d.getFullYear();
        var m = String(d.getMonth() + 1).padStart(2, '0');
        var day = String(d.getDate()).padStart(2, '0');
        return y + '-' + m + '-' + day;
    } catch(e) {
        return dateStr;
    }
}

// ========== 金额格式化 ==========
function formatMoney(amount) {
    if (amount === undefined || amount === null) return '0.00';
    return Number(amount).toFixed(2);
}

// ========== 状态标签渲染 ==========
function getStatusTag(status, map, colorMap) {
    var text = map[status] || status;
    var color = colorMap[status] || 'gray';
    return '<span class="status-tag ' + color + '">' + text + '</span>';
}

// ========== 获取URL参数 ==========
function getUrlParam(name) {
    var reg = new RegExp('(^|&)' + name + '=([^&]*)(&|$)');
    var r = window.location.search.substr(1).match(reg);
    if (r != null) return decodeURIComponent(r[2]);
    return null;
}

// ========== 页面跳转 ==========
function goPage(page, params) {
    var url = page + '.html';
    if (params) {
        var query = [];
        for (var key in params) {
            query.push(key + '=' + encodeURIComponent(params[key]));
        }
        if (query.length > 0) {
            url += '?' + query.join('&');
        }
    }
    window.location.href = url;
}

// ========== 获取当前用户 ==========
function getCurrentUser() {
    try {
        var user = localStorage.getItem('currentUser');
        return user ? JSON.parse(user) : null;
    } catch(e) {
        return null;
    }
}

// ========== 权限判断 ==========
function isAdmin() {
    var user = getCurrentUser();
    return user && user.UserRole === 2;
}

function getStoreId() {
    var user = getCurrentUser();
    return user ? user.StoreId : null;
}

// ========== 防抖 ==========
function debounce(fn, delay) {
    var timer = null;
    return function() {
        var context = this;
        var args = arguments;
        clearTimeout(timer);
        timer = setTimeout(function() {
            fn.apply(context, args);
        }, delay);
    };
}

// ========== 生成随机颜色 ==========
function getColorByIndex(index) {
    var colors = ['#2d6a9f', '#52c41a', '#faad14', '#ff4d4f', '#722ed1', '#13c2c2', '#eb2f96', '#fa541c'];
    return colors[index % colors.length];
}