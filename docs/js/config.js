// ========== API基础地址 ==========
var API_BASE = 'http://localhost:5000/api';

// ========== 门店状态 ==========
var STORE_STATUS = {
    0: '停用',
    1: '启用'
};
var STORE_STATUS_COLOR = {
    0: 'red',
    1: 'green'
};

// ========== 用户状态 ==========
var USER_STATUS = {
    0: '停用',
    1: '启用'
};
var USER_STATUS_COLOR = {
    0: 'red',
    1: 'green'
};

// ========== 用户角色 ==========
var USER_ROLE = {
    1: '普通用户',
    2: '系统管理员'
};
var USER_ROLE_COLOR = {
    1: 'blue',
    2: 'orange'
};

// ========== 合同状态 ==========
var CONTRACT_STATUS = {
    0: '已终止',
    1: '生效中',
    2: '已到期'
};
var CONTRACT_STATUS_COLOR = {
    0: 'gray',
    1: 'green',
    2: 'orange'
};

// ========== 收费状态 ==========
var CHARGE_STATUS = {
    1: '待收',
    2: '部分收款',
    3: '已收清',
    4: '逾期'
};
var CHARGE_STATUS_COLOR = {
    1: 'orange',
    2: 'blue',
    3: 'green',
    4: 'red'
};

// ========== 收款方式 ==========
var PAYMENT_METHOD = {
    1: '现金',
    2: '银行转账',
    3: '支票',
    4: '微信',
    5: '支付宝'
};
var PAYMENT_METHOD_COLOR = {
    1: 'green',
    2: 'blue',
    3: 'orange',
    4: 'green',
    5: 'blue'
};

// ========== 水电费状态 ==========
var UTILITY_STATUS = {
    0: '待录入',
    1: '已录入',
    2: '已确认'
};
var UTILITY_STATUS_COLOR = {
    0: 'gray',
    1: 'blue',
    2: 'green'
};

// ========== 缴费周期 ==========
var PAYMENT_CYCLE = {
    1: '月付',
    2: '季付',
    3: '半年付',
    4: '年付'
};