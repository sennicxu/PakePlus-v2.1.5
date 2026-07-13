/**
 * ============================================================
 * 通用表格控件 - DataTable
 * 统一管理表格、搜索、分页、增删改查、导入导出
 * 
 * 用法：
 *   var table = new DataTable({
 *       container: '#tableWrap',
 *       title: '用户管理',
 *       subtitle: '管理所有用户',
 *       icon: '👤',
 *       badge: '共 0 人',
 *       api: UserAPI,
 *       searchFields: [...],
 *       advancedFields: [...],
 *       stats: [...],
 *       columns: [...],
 *       rowActions: [...],
 *       formFields: [...],
 *       importable: true,      // 是否允许导入
 *       exportable: true,      // 是否允许导出
 *       importFields: null,    // 导入字段配置（可选，默认使用 formFields）
 *       onLoad: function(data) {}
 *   });
 * ============================================================
 */

function DataTable(config) {
    'use strict';
    
    var self = this;
    
    // ============================================================
    //  默认配置
    // ============================================================
    var defaults = {
        pageSize: 15,
        currentPage: 1,
        container: '#tableWrap',
        api: null,
        columns: [],
        searchFields: [],
        rowActions: [],
        formFields: [],
        onLoad: null,
        quickSearchFields: null,
        advancedFields: null,
        stats: null,
        title: '数据管理',
        subtitle: '',
        icon: '📋',
        badge: '共 0 条',
        importable: true,
        exportable: true,
        importFields: null
    };
    
    // 合并配置
    self.config = {};
    for (var key in defaults) {
        if (defaults.hasOwnProperty(key)) {
            self.config[key] = config[key] !== undefined ? config[key] : defaults[key];
        }
    }
    if (!self.config.quickSearchFields) {
        self.config.quickSearchFields = self.config.searchFields;
    }
    if (!self.config.advancedFields) {
        self.config.advancedFields = self.config.searchFields;
    }
    if (!self.config.importFields) {
        self.config.importFields = self.config.formFields;
    }
    
    // ============================================================
    //  状态变量
    // ============================================================
    self.allData = [];
    self.filteredData = [];
    self.totalPages = 1;
    self.layer = null;
    self.modalIndex = null;
    self.deleteModalIndex = null;
    self.deleteTargetId = null;
    self.conditionCount = 0;
    self.currentPage = self.config.currentPage;
    self.pageSize = self.config.pageSize;
    self.permModalIndex = null;
    self.importModalIndex = null;
    
    // ============================================================
    //  初始化
    // ============================================================
    self.init = function() {
        layui.use(['layer'], function() {
            self.layer = layui.layer;
            self.buildUI();
            self.loadData();
            self.bindEvents();
            self.loadExcelLib();
        });
    };
    
    // ============================================================
    //  加载Excel库
    // ============================================================
    self.loadExcelLib = function() {
        if (typeof XLSX === 'undefined') {
            var script = document.createElement('script');
            script.src = 'https://cdn.sheetjs.com/xlsx-0.20.2/package/dist/xlsx.full.min.js';
            script.onload = function() {
                console.log('SheetJS 加载成功');
            };
            script.onerror = function() {
                console.warn('SheetJS 加载失败，导入导出功能不可用');
            };
            document.head.appendChild(script);
        }
    };
    
    // ============================================================
    //  构建UI
    // ============================================================
    self.buildUI = function() {
        var container = document.querySelector(self.config.container);
        if (!container) {
            console.error('容器 ' + self.config.container + ' 不存在');
            return;
        }
        
        if (!container.classList.contains('page-wrapper')) {
            container.classList.add('page-wrapper');
        }
        
        var html = '';
        html += self.buildHeader();
        if (self.config.stats && self.config.stats.length > 0) {
            html += self.buildStats();
        }
        html += self.buildSearchBar();
        html += self.buildTable();
        
        container.innerHTML = html;
        window._table = self;
    };
    
    // ============================================================
    //  构建标题栏（含导入导出按钮）
    // ============================================================
    self.buildHeader = function() {
        var actionsHtml = '';
        
        if (self.config.exportable) {
            actionsHtml += '<button class="btn btn-outline" onclick="window._table.exportExcel()"><i class="fas fa-file-export"></i> 导出</button>';
        }
        if (self.config.importable) {
            actionsHtml += '<button class="btn btn-outline" onclick="window._table.showImportModal()"><i class="fas fa-file-import"></i> 导入</button>';
        }
        actionsHtml += `
            <button class="btn btn-outline" onclick="window._table.refresh()"><i class="fas fa-sync-alt"></i> 刷新</button>
            <button class="btn btn-primary" onclick="window._table.showAdd()"><i class="fas fa-plus"></i> 添加</button>
        `;
        
        return `
            <div class="page-header">
                <div class="title-area">
                    <div class="title-icon">${self.config.icon}</div>
                    <div>
                        <span class="title-text">${self.config.title} <small>${self.config.subtitle}</small></span>
                        <span class="title-badge" id="totalBadge">${self.config.badge}</span>
                        <span class="search-indicator" id="searchIndicator"><i class="fas fa-filter"></i> 已筛选</span>
                    </div>
                </div>
                <div class="actions">
                    ${actionsHtml}
                </div>
            </div>
        `;
    };
    
    // ============================================================
    //  构建统计卡片
    // ============================================================
    self.buildStats = function() {
        var html = '<div class="stat-grid">';
        self.config.stats.forEach(function(stat) {
            html += `
                <div class="stat-card ${stat.color || ''}">
                    <div class="stat-top">
                        <div>
                            <div class="stat-number" id="${stat.id}">0</div>
                            <div class="stat-label">${stat.label}</div>
                        </div>
                        <div class="stat-icon">${stat.icon}</div>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        return html;
    };
    
    // ============================================================
    //  构建搜索栏
    // ============================================================
    self.buildSearchBar = function() {
        var fields = self.config.searchFields;
        if (!fields || fields.length === 0) {
            return '';
        }
        
        var quickOptions = '';
        var advancedOptions = '';
        var quickFields = self.config.quickSearchFields || fields;
        var advFields = self.config.advancedFields || fields;
        
        quickFields.forEach(function(f) {
            quickOptions += '<option value="' + f.value + '">' + f.label + '</option>';
        });
        advFields.forEach(function(f) {
            advancedOptions += '<option value="' + f.value + '">' + f.label + '</option>';
        });
        
        return `
            <div class="search-bar">
                <div class="search-tabs">
                    <span class="tab active" data-tab="quick" onclick="window._table.switchTab('quick')"><i class="fas fa-bolt"></i> 快速搜索</span>
                    <span class="tab" data-tab="advanced" onclick="window._table.switchTab('advanced')"><i class="fas fa-sliders-h"></i> 高级搜索</span>
                </div>
                <div class="search-panel active" id="panel-quick">
                    <div class="quick-search">
                        <select id="quickField">${quickOptions}</select>
                        <input type="text" id="quickValue" placeholder="请输入搜索内容..." onkeydown="if(event.key==='Enter') window._table.doQuickSearch()">
                        <select class="status-select" id="quickStatus">
                            <option value="">全部状态</option>
                            <option value="1">启用</option>
                            <option value="0">停用</option>
                        </select>
                    </div>
                    <div class="search-actions">
                        <button class="btn btn-search" onclick="window._table.doQuickSearch()"><i class="fas fa-search"></i> 搜索</button>
                        <button class="btn btn-reset" onclick="window._table.resetSearch()"><i class="fas fa-undo"></i> 重置</button>
                    </div>
                </div>
                <div class="search-panel" id="panel-advanced">
                    <div class="advanced-search">
                        <div class="logic-select-wrap">
                            <label>多个条件关系：</label>
                            <select id="logicType">
                                <option value="AND">且（全部满足）</option>
                                <option value="OR">或（满足任一）</option>
                            </select>
                        </div>
                        <div id="conditionContainer"></div>
                        <span class="add-condition" onclick="window._table.addCondition()"><i class="fas fa-plus-circle"></i> 添加条件</span>
                    </div>
                    <div class="search-actions">
                        <button class="btn btn-search" onclick="window._table.doAdvancedSearch()"><i class="fas fa-search"></i> 搜索</button>
                        <button class="btn btn-reset" onclick="window._table.resetSearch()"><i class="fas fa-undo"></i> 重置</button>
                    </div>
                </div>
            </div>
        `;
    };
    
    // ============================================================
    //  构建表格
    // ============================================================
    self.buildTable = function() {
        var colCount = self.config.columns.length + 1;
        return `
            <div class="table-wrap">
                <div class="table-toolbar">
                    <div class="info">共 <strong id="totalCount">0</strong> 条记录，当前第 <strong id="currentPageDisplay">1</strong> 页</div>
                    <div><span style="font-size:13px;color:#999;"><i class="far fa-clock"></i> 更新于 <span id="updateTime">-</span></span></div>
                </div>
                <div class="table-scroll">
                    <table class="data-table">
                        <thead><tr>${self.buildTableHeader()}</tr></thead>
                        <tbody id="tableBody"><tr><td colspan="${colCount}"><div class="empty-state"><div class="empty-icon">📭</div><div class="empty-text">加载中...</div></div></td></tr></tbody>
                    </table>
                </div>
                <div class="pagination-wrap">
                    <div class="total-info">共 <strong id="totalCount2">0</strong> 条记录，每页显示
                        <select class="page-size-select" id="pageSizeSelect" onchange="window._table.changePageSize()">
                            <option value="10">10</option>
                            <option value="15" selected>15</option>
                            <option value="20">20</option>
                            <option value="30">30</option>
                            <option value="50">50</option>
                        </select> 条
                    </div>
                    <div class="page-controls" id="pageControls">
                        <button onclick="window._table.goPage(1)" id="pageFirst">首页</button>
                        <button onclick="window._table.goPage(window._table.currentPage - 1)" id="pagePrev">上一页</button>
                        <span class="page-info" id="pageInfo">1 / 1</span>
                        <button onclick="window._table.goPage(window._table.currentPage + 1)" id="pageNext">下一页</button>
                        <button onclick="window._table.goPage(window._table.totalPages)" id="pageLast">末页</button>
                    </div>
                </div>
            </div>
        `;
    };
    
    // ============================================================
    //  构建表头
    // ============================================================
    self.buildTableHeader = function() {
        var html = '<th style="width:50px;">#</th>';
        self.config.columns.forEach(function(col) {
            var style = '';
            if (col.width) style += 'width:' + col.width + ';';
            if (col.style) style += col.style;
            html += '<th style="' + style + '">' + col.label + '</th>';
        });
        var actionWidth = Math.min(60 + self.config.rowActions.length * 40, 220);
        html += '<th style="width:' + actionWidth + 'px;">操作</th>';
        return html;
    };
    
    // ============================================================
    //  构建字段选项（高级搜索）
    // ============================================================
    self.buildFieldOptions = function() {
        var fields = self.config.advancedFields || self.config.searchFields || [];
        var html = '';
        fields.forEach(function(f) {
            html += '<option value="' + f.value + '">' + f.label + '</option>';
        });
        return html;
    };
    
    // ============================================================
    //  高级搜索 - 添加条件
    // ============================================================
    self.addCondition = function() {
        var container = document.getElementById('conditionContainer');
        if (!container) return;
        
        self.conditionCount++;
        var row = document.createElement('div');
        row.className = 'logic-row';
        row.id = 'condition-' + self.conditionCount;
        
        row.innerHTML = `
            <select class="field-select">${self.buildFieldOptions()}</select>
            <select class="operator-select">
                <option value="contains">包含</option>
                <option value="equals">等于</option>
                <option value="starts">开头是</option>
                <option value="ends">结尾是</option>
            </select>
            <input type="text" class="value-input" placeholder="请输入值...">
            <button class="btn-remove" onclick="window._table.removeCondition('condition-${self.conditionCount}')"><i class="fas fa-times"></i></button>
        `;
        
        var fieldSelect = row.querySelector('.field-select');
        var valueInput = row.querySelector('.value-input');
        fieldSelect.addEventListener('change', function() {
            var enumOptions = self.getEnumOptions(this.value);
            if (enumOptions) {
                var select = document.createElement('select');
                select.className = 'value-input';
                select.innerHTML = enumOptions;
                valueInput.parentNode.replaceChild(select, valueInput);
            } else {
                var input = document.createElement('input');
                input.type = 'text';
                input.className = 'value-input';
                input.placeholder = '请输入值...';
                valueInput.parentNode.replaceChild(input, valueInput);
            }
        });
        
        container.appendChild(row);
    };
    
    // ============================================================
    //  获取枚举字段选项
    // ============================================================
    self.getEnumOptions = function(field) {
        var enumMap = {
            'status': '<option value="">请选择</option><option value="1">启用</option><option value="0">停用</option>',
            'role': '<option value="">请选择</option><option value="1">普通用户</option><option value="2">系统管理员</option>'
        };
        return enumMap[field] || null;
    };
    
    // ============================================================
    //  高级搜索 - 移除条件
    // ============================================================
    self.removeCondition = function(id) {
        var el = document.getElementById(id);
        if (el) el.remove();
    };
    
    // ============================================================
    //  构建高级搜索条件
    // ============================================================
    self.buildConditions = function() {
        var rows = document.querySelectorAll('#conditionContainer .logic-row');
        var conditions = [];
        rows.forEach(function(row) {
            var field = row.querySelector('.field-select');
            var operator = row.querySelector('.operator-select');
            var valueInput = row.querySelector('.value-input');
            var value = '';
            if (valueInput) {
                if (valueInput.tagName === 'SELECT') {
                    value = valueInput.value;
                } else {
                    value = valueInput.value.trim();
                }
            }
            if (field && operator && value) {
                conditions.push({
                    field: field.value,
                    operator: operator.value,
                    value: value
                });
            }
        });
        return conditions;
    };
    
    // ============================================================
    //  构建请求参数
    // ============================================================
    self.buildParams = function() {
        var params = {};
        var tab = document.querySelector('.search-tabs .tab.active');
        var tabName = tab ? tab.dataset.tab : 'quick';
        
        if (tabName === 'quick') {
            var field = document.getElementById('quickField');
            var value = document.getElementById('quickValue');
            var status = document.getElementById('quickStatus');
            if (field && value && value.value.trim()) {
                params.field = field.value;
                params.value = value.value.trim();
            }
            if (status && status.value) {
                params.status = status.value;
            }
        } else {
            var conditions = self.buildConditions();
            if (conditions.length > 0) {
                params.conditions = conditions;
                var logic = document.getElementById('logicType');
                if (logic) params.logic = logic.value;
            }
        }
        return params;
    };
    
    // ============================================================
    //  加载数据
    // ============================================================
    self.loadData = function() {
        var params = self.buildParams();
        
        if (!self.config.api || typeof self.config.api.list !== 'function') {
            console.error('API未配置或缺少 list 方法');
            return;
        }
        
        self.config.api.list(params).then(function(data) {
            self.allData = data || [];
            self.filteredData = self.allData.slice();
            self.totalPages = Math.ceil(self.filteredData.length / self.pageSize) || 1;
            if (self.currentPage > self.totalPages) self.currentPage = self.totalPages || 1;
            self.renderStats();
            self.renderTable();
            self.renderPagination();
            self.updateSearchIndicator();
            if (self.config.onLoad && typeof self.config.onLoad === 'function') {
                self.config.onLoad(self.allData);
            }
        }).catch(function(err) {
            if (self.layer) self.layer.msg('加载失败: ' + err, {icon: 5});
            self.allData = [];
            self.filteredData = [];
            self.renderStats();
            self.renderTable();
            self.renderPagination();
        });
    };
    
    // ============================================================
    //  渲染统计
    // ============================================================
    self.renderStats = function() {
        if (!self.config.stats || self.config.stats.length === 0) return;
        
        var stats = {};
        self.config.stats.forEach(function(s) {
            stats[s.id] = 0;
        });
        
        self.allData.forEach(function(row) {
            self.config.stats.forEach(function(s) {
                if (s.calc && typeof s.calc === 'function') {
                    stats[s.id] = (stats[s.id] || 0) + (s.calc(row) || 0);
                }
            });
        });
        
        self.config.stats.forEach(function(s) {
            var el = document.getElementById(s.id);
            if (el) el.textContent = stats[s.id] || 0;
        });
        
        var badge = document.getElementById('totalBadge');
        if (badge) badge.textContent = '共 ' + self.allData.length + ' 条';
    };
    
    // ============================================================
    //  获取字段值（支持嵌套，支持大小写映射）
    // ============================================================
    self.getFieldValue = function(row, field) {
        if (!field || !row) return undefined;
        
        if (row[field] !== undefined) {
            return row[field];
        }
        
        var lowerField = field.toLowerCase();
        for (var key in row) {
            if (key.toLowerCase() === lowerField) {
                return row[key];
            }
        }
        
        var commonMap = {
            'user_role': 'UserRole',
            'store_id': 'StoreId',
            'store_code': 'StoreCode',
            'store_name': 'StoreName',
            'address': 'Address',
            'contact_person': 'ContactPerson',
            'contact_phone': 'ContactPhone',
            'email': 'Email',
            'status': 'Status',
            'remarks': 'Remarks',
            'create_date': 'CreateDate',
            'update_date': 'UpdateDate',
            'fullname': 'FullName',
            'username': 'UserName',
            'phone': 'Phone',
            'contract_no': 'ContractNo',
            'counter_code': 'CounterCode',
            'counter_name': 'CounterName',
            'tenant_name': 'TenantName',
            'tenant_phone': 'TenantPhone',
            'contract_period': 'ContractPeriod',
            'charge_standard': 'ChargeStandard',
            'rent_amount': 'RentAmount',
            'deposit_amount': 'DepositAmount',
            'start_date': 'StartDate',
            'end_date': 'EndDate',
            'payment_cycle': 'PaymentCycle'
        };
        
        if (commonMap[field] !== undefined && row[commonMap[field]] !== undefined) {
            return row[commonMap[field]];
        }
        
        return undefined;
    };
    
    // ============================================================
    //  渲染表格
    // ============================================================
    self.renderTable = function() {
        var tbody = document.getElementById('tableBody');
        if (!tbody) return;
        
        var start = (self.currentPage - 1) * self.pageSize;
        var end = Math.min(start + self.pageSize, self.filteredData.length);
        var pageData = self.filteredData.slice(start, end);
        
        var totalEl = document.getElementById('totalCount');
        var total2El = document.getElementById('totalCount2');
        var pageEl = document.getElementById('currentPageDisplay');
        if (totalEl) totalEl.textContent = self.filteredData.length;
        if (total2El) total2El.textContent = self.filteredData.length;
        if (pageEl) pageEl.textContent = self.currentPage;
        
        if (pageData.length === 0) {
            var colCount = self.config.columns.length + 1;
            tbody.innerHTML = '<tr><td colspan="' + colCount + '"><div class="empty-state"><div class="empty-icon">📭</div><div class="empty-text">' +
                (self.allData.length === 0 ? '暂无数据' : '没有匹配的数据') + '</div></div></td></tr>';
            return;
        }
        
        var html = '';
        var base = (self.currentPage - 1) * self.pageSize;
        for (var i = 0; i < pageData.length; i++) {
            var row = pageData[i];
            var idx = base + i + 1;
            html += '<tr>';
            html += '<td style="color:#bbb;font-weight:500;">' + idx + '</td>';
            
            self.config.columns.forEach(function(col) {
                var value = self.getFieldValue(row, col.field);
                if (col.render && typeof col.render === 'function') {
                    value = col.render(value, row);
                } else if (col.format && typeof col.format === 'function') {
                    value = col.format(value, row);
                }
                if (value === undefined || value === null) value = '-';
                html += '<td' + (col.tdClass ? ' class="' + col.tdClass + '"' : '') + '>' + value + '</td>';
            });
            
            html += '<td><div class="action-btns">';
            self.config.rowActions.forEach(function(action) {
                var disabled = action.disabled && typeof action.disabled === 'function' ? action.disabled(row) : false;
                var disabledAttr = disabled ? ' disabled' : '';
                html += '<button class="btn-sm ' + action.class + '" onclick="window._table.' + action.handler + '(' + row.Id + ')"' + disabledAttr + '>' +
                    (action.icon ? '<i class="' + action.icon + '"></i> ' : '') + action.label + '</button>';
            });
            html += '</div></td></tr>';
        }
        tbody.innerHTML = html;
    };
    
    // ============================================================
    //  渲染分页
    // ============================================================
    self.renderPagination = function() {
        var total = self.filteredData.length;
        var controls = document.getElementById('pageControls');
        if (!controls) return;
        
        if (total <= self.pageSize) {
            controls.style.display = 'none';
            return;
        }
        controls.style.display = 'flex';
        
        var info = document.getElementById('pageInfo');
        var first = document.getElementById('pageFirst');
        var prev = document.getElementById('pagePrev');
        var next = document.getElementById('pageNext');
        var last = document.getElementById('pageLast');
        
        if (info) info.textContent = self.currentPage + ' / ' + self.totalPages;
        if (first) first.disabled = self.currentPage <= 1;
        if (prev) prev.disabled = self.currentPage <= 1;
        if (next) next.disabled = self.currentPage >= self.totalPages;
        if (last) last.disabled = self.currentPage >= self.totalPages;
    };
    
    // ============================================================
    //  分页操作
    // ============================================================
    self.goPage = function(page) {
        if (page < 1 || page > self.totalPages) return;
        self.currentPage = page;
        self.renderTable();
        self.renderPagination();
        var scroll = document.querySelector('.table-scroll');
        if (scroll) scroll.scrollTop = 0;
    };
    
    self.changePageSize = function() {
        var select = document.getElementById('pageSizeSelect');
        if (select) {
            self.pageSize = parseInt(select.value);
            self.currentPage = 1;
            self.totalPages = Math.ceil(self.filteredData.length / self.pageSize) || 1;
            self.renderTable();
            self.renderPagination();
        }
    };
    
    // ============================================================
    //  搜索操作
    // ============================================================
    self.doQuickSearch = function() {
        self.currentPage = 1;
        self.loadData();
    };
    
    self.doAdvancedSearch = function() {
        self.currentPage = 1;
        self.loadData();
    };
    
    self.refresh = function() {
        self.loadData();
        if (self.layer) self.layer.msg('刷新成功', {icon: 1, time: 800});
    };
    
    self.resetSearch = function() {
        var qv = document.getElementById('quickValue');
        var qs = document.getElementById('quickStatus');
        if (qv) qv.value = '';
        if (qs) qs.value = '';
        var container = document.getElementById('conditionContainer');
        if (container) container.innerHTML = '';
        self.conditionCount = 0;
        self.addCondition();
        self.currentPage = 1;
        self.loadData();
    };
    
    self.switchTab = function(tab) {
        document.querySelectorAll('.search-tabs .tab').forEach(function(el) {
            el.classList.toggle('active', el.dataset.tab === tab);
        });
        document.querySelectorAll('.search-panel').forEach(function(el) {
            el.classList.toggle('active', el.id === 'panel-' + tab);
        });
    };
    
    self.updateSearchIndicator = function() {
        var has = false;
        var tab = document.querySelector('.search-tabs .tab.active');
        var tabName = tab ? tab.dataset.tab : 'quick';
        
        if (tabName === 'quick') {
            var v = document.getElementById('quickValue');
            var s = document.getElementById('quickStatus');
            if ((v && v.value.trim()) || (s && s.value)) has = true;
        } else {
            var c = self.buildConditions();
            if (c.length > 0) has = true;
        }
        var indicator = document.getElementById('searchIndicator');
        if (indicator) indicator.classList.toggle('show', has);
    };
    
    // ============================================================
    //  时间更新
    // ============================================================
    self.updateTime = function() {
        var now = new Date();
        var el = document.getElementById('updateTime');
        if (el) {
            el.textContent = now.getFullYear() + '-' + 
                String(now.getMonth() + 1).padStart(2, '0') + '-' +
                String(now.getDate()).padStart(2, '0') + ' ' + 
                String(now.getHours()).padStart(2, '0') + ':' +
                String(now.getMinutes()).padStart(2, '0');
        }
    };
    
    self.bindEvents = function() {
        self.updateTime();
        setInterval(function() { self.updateTime(); }, 60000);
    };
    
    // ============================================================
    //  弹窗 - 添加
    // ============================================================
    self.showAdd = function() {
        var html = self.buildFormHtml(null, 'add');
        self.openModal('<i class="fas fa-plus"></i> 添加' + self.config.title, html);
    };
    
    // ============================================================
    //  弹窗 - 编辑
    // ============================================================
    self.showEdit = function(id) {
        if (!self.layer) {
            alert('LayUI 未加载，请刷新页面重试');
            return;
        }
        if (!self.config.api || typeof self.config.api.get !== 'function') {
            alert('API未配置 get 方法');
            return;
        }
        
        self.layer.load(1);
        self.config.api.get(id).then(function(data) {
            self.layer.closeAll('loading');
            if (!data) {
                self.layer.msg('数据不存在', {icon: 5});
                return;
            }
            if (!data.Id) {
                data.Id = id;
            }
            var html = self.buildFormHtml(data, 'edit');
            self.openModal('<i class="fas fa-edit"></i> 编辑' + self.config.title, html);
        }).catch(function(err) {
            self.layer.closeAll('loading');
            self.layer.msg('获取数据失败: ' + err, {icon: 5});
        });
    };
    
    // ============================================================
    //  构建表单HTML
    // ============================================================
    self.buildFormHtml = function(data, action) {
        var isEdit = action === 'edit';
        var html = '<div class="modal-form">';
        html += '<input type="hidden" id="editId" value="' + (isEdit ? (data ? (data.Id || '') : '') : '') + '">';
        
        self.config.formFields.forEach(function(field) {
            var value = '';
            if (isEdit && data) {
                var val = self.getFieldValue(data, field.field);
                if (val !== undefined && val !== null) {
                    value = val;
                }
            }
            if (value === undefined || value === null) value = '';
            
            var required = field.required ? '<span class="required">*</span> ' : '';
            var inputHtml = '';
            
            if (field.type === 'select') {
                var options = '';
                if (field.options && field.options.length > 0) {
                    field.options.forEach(function(opt) {
                        var selected = (value == opt.value) ? 'selected' : '';
                        options += '<option value="' + opt.value + '" ' + selected + '>' + opt.label + '</option>';
                    });
                }
                inputHtml = '<select id="' + field.id + '">' + options + '</select>';
            } else if (field.type === 'textarea') {
                inputHtml = '<textarea id="' + field.id + '" placeholder="' + (field.placeholder || '') + '">' + (value || '') + '</textarea>';
            } else if (field.type === 'number') {
                inputHtml = '<input type="number" step="0.01" id="' + field.id + '" value="' + (value || '') + '" placeholder="' + (field.placeholder || '') + '">';
            } else if (field.type === 'date') {
                var today = new Date().toISOString().split('T')[0];
                var val = value || today;
                inputHtml = '<input type="date" id="' + field.id + '" value="' + val + '">';
            } else if (field.type === 'password') {
                var ph = field.placeholder || (isEdit ? '留空则不修改' : '请输入密码');
                inputHtml = '<input type="password" id="' + field.id + '" placeholder="' + ph + '">';
                if (field.hint) {
                    inputHtml += '<div class="password-hint"><i class="fas fa-info-circle"></i> ' + field.hint + '</div>';
                }
            } else {
                var inputType = field.type || 'text';
                inputHtml = '<input type="' + inputType + '" id="' + field.id + '" value="' + (value || '') + '" placeholder="' + (field.placeholder || '') + '">';
            }
            
            html += '<div class="form-group">';
            html += '<label>' + required + field.label + '</label>';
            html += inputHtml;
            if (field.help) html += '<div class="help-text">' + field.help + '</div>';
            html += '</div>';
        });
        
        html += '<div class="form-footer">';
        html += '<button class="btn btn-default" onclick="window._table.closeModal()">取消</button>';
        html += '<button class="btn btn-primary" onclick="window._table.submitForm()"><i class="fas fa-save"></i> ' + (isEdit ? '保存' : '添加') + '</button>';
        html += '</div></div>';
        return html;
    };
    
    // ============================================================
    //  打开弹窗
    // ============================================================
    self.openModal = function(title, html) {
        if (!self.layer) {
            alert('LayUI 未加载，请刷新页面重试');
            return;
        }
        self.modalIndex = self.layer.open({
            type: 1,
            title: title,
            area: ['540px', 'auto'],
            content: html,
            shadeClose: false,
            resize: false,
            maxHeight: '90vh'
        });
    };
    
    // ============================================================
    //  关闭弹窗
    // ============================================================
    self.closeModal = function() {
        if (self.modalIndex !== null && self.modalIndex !== undefined) {
            self.layer.close(self.modalIndex);
            self.modalIndex = null;
        }
    };
    
    // ============================================================
    //  提交表单
    // ============================================================
    self.submitForm = function() {
        var id = document.getElementById('editId').value;
        var data = {};
        var valid = true;
        
        self.config.formFields.forEach(function(field) {
            var el = document.getElementById(field.id);
            if (el) {
                var value = el.value.trim();
                if (field.required && !value) {
                    if (self.layer) self.layer.msg('请输入' + field.label, {icon: 5});
                    valid = false;
                    return;
                }
                if (field.type === 'number') {
                    value = parseFloat(value) || 0;
                }
                data[field.field] = value;
            }
        });
        
        if (!valid) return;
        
        if (!self.config.api) {
            if (self.layer) self.layer.msg('API未配置', {icon: 5});
            return;
        }
        
        if (self.layer) self.layer.load(1);
        
        var promise;
        if (id) {
            data.id = parseInt(id);
            if (typeof self.config.api.update !== 'function') {
                self.layer.closeAll('loading');
                self.layer.msg('API缺少 update 方法', {icon: 5});
                return;
            }
            promise = self.config.api.update(data);
        } else {
            if (typeof self.config.api.add !== 'function') {
                self.layer.closeAll('loading');
                self.layer.msg('API缺少 add 方法', {icon: 5});
                return;
            }
            promise = self.config.api.add(data);
        }
        
        promise.then(function() {
            if (self.layer) {
                self.layer.closeAll('loading');
                self.layer.msg(id ? '更新成功' : '添加成功', {icon: 1});
            }
            self.closeModal();
            self.loadData();
        }).catch(function(err) {
            if (self.layer) {
                self.layer.closeAll('loading');
                self.layer.msg('操作失败: ' + err, {icon: 5});
            }
        });
    };
    
    // ============================================================
    //  删除
    // ============================================================
    self.showDelete = function(id) {
        self.deleteTargetId = id;
        if (!self.layer) {
            alert('LayUI 未加载，请刷新页面重试');
            return;
        }
        
        var html = `
            <div class="confirm-danger">
                <div class="icon">⚠️</div>
                <div class="title">确定要删除吗？</div>
                <div class="desc">删除后不可恢复，请谨慎操作。</div>
                <div class="btn-group">
                    <button class="btn btn-default" onclick="window._table.closeDeleteModal()">取消</button>
                    <button class="btn btn-danger" id="confirmDeleteBtn"><i class="fas fa-trash"></i> 确认删除</button>
                </div>
            </div>
        `;
        
        self.deleteModalIndex = self.layer.open({
            type: 1,
            title: '<i class="fas fa-trash" style="color:#ff4d4f;"></i> 确认删除',
            area: ['400px', 'auto'],
            content: html,
            shadeClose: true,
            resize: false,
            success: function(layero) {
                var btn = layero.find('#confirmDeleteBtn');
                if (btn.length) {
                    btn[0].onclick = function() {
                        self.confirmDelete();
                    };
                }
            }
        });
    };
    
    // ============================================================
    //  关闭删除弹窗
    // ============================================================
    self.closeDeleteModal = function() {
        if (self.deleteModalIndex !== null && self.deleteModalIndex !== undefined) {
            self.layer.close(self.deleteModalIndex);
            self.deleteModalIndex = null;
            self.deleteTargetId = null;
        }
    };
    
    // ============================================================
    //  确认删除
    // ============================================================
    self.confirmDelete = function() {
        if (!self.deleteTargetId) {
            if (self.layer) self.layer.msg('请选择要删除的数据', {icon: 5});
            return;
        }
        if (!self.config.api || typeof self.config.api.delete !== 'function') {
            if (self.layer) self.layer.msg('API缺少 delete 方法', {icon: 5});
            return;
        }
        
        if (self.layer) self.layer.load(1);
        self.config.api.delete(self.deleteTargetId).then(function() {
            if (self.layer) {
                self.layer.closeAll('loading');
                self.layer.msg('删除成功', {icon: 1});
            }
            self.closeDeleteModal();
            self.loadData();
        }).catch(function(err) {
            if (self.layer) {
                self.layer.closeAll('loading');
                self.layer.msg('删除失败: ' + err, {icon: 5});
            }
        });
    };
    
    // ============================================================
    //  导入导出功能
    // ============================================================
    
    // ===== 导出Excel =====
    self.exportExcel = function() {
        if (typeof XLSX === 'undefined') {
            if (self.layer) {
                self.layer.msg('Excel库未加载，请稍后重试', {icon: 5});
            }
            return;
        }
        
        if (!self.allData || self.allData.length === 0) {
            if (self.layer) {
                self.layer.msg('暂无数据可导出', {icon: 5});
            }
            return;
        }
        
        try {
            var exportData = [];
            var headers = [];
            
            self.config.columns.forEach(function(col) {
                headers.push(col.label);
            });
            exportData.push(headers);
            
            self.allData.forEach(function(row) {
                var rowData = [];
                self.config.columns.forEach(function(col) {
                    var value = self.getFieldValue(row, col.field);
                    if (value === undefined || value === null) value = '';
                    if (col.exportRender && typeof col.exportRender === 'function') {
                        value = col.exportRender(value, row);
                    } else if (col.render && typeof col.render === 'function') {
                        var rendered = col.render(value, row);
                        if (typeof rendered === 'string') {
                            var temp = document.createElement('div');
                            temp.innerHTML = rendered;
                            value = temp.textContent || temp.innerText || value;
                        } else {
                            value = rendered;
                        }
                    }
                    rowData.push(value);
                });
                exportData.push(rowData);
            });
            
            var wb = XLSX.utils.book_new();
            var ws = XLSX.utils.aoa_to_sheet(exportData);
            
            var colWidths = [];
            self.config.columns.forEach(function(col) {
                var width = col.width ? parseInt(col.width) : 15;
                colWidths.push({ wch: Math.max(width / 7, 12) });
            });
            ws['!cols'] = colWidths;
            
            XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
            
            var fileName = self.config.title + '_' + new Date().toISOString().slice(0, 10) + '.xlsx';
            XLSX.writeFile(wb, fileName);
            
            if (self.layer) {
                self.layer.msg('导出成功: ' + fileName, {icon: 1});
            }
        } catch (e) {
            console.error('导出失败:', e);
            if (self.layer) {
                self.layer.msg('导出失败: ' + e.message, {icon: 5});
            }
        }
    };
    
    // ===== 显示导入弹窗 =====
    self.showImportModal = function() {
        if (typeof XLSX === 'undefined') {
            if (self.layer) {
                self.layer.msg('Excel库未加载，请稍后重试', {icon: 5});
            }
            return;
        }
        
        var html = `
            <div class="modal-form" style="text-align:center;padding:20px;">
                <div style="margin-bottom:16px;">
                    <div style="font-size:48px;color:#2d6a9f;margin-bottom:8px;">📂</div>
                    <div style="font-size:15px;font-weight:500;color:#333;">导入 ${self.config.title}</div>
                    <div style="font-size:13px;color:#999;margin-top:4px;">支持 .xlsx 格式，请确保列名与模板一致</div>
                </div>
                <div style="border:2px dashed #e0e4ea;border-radius:8px;padding:30px 20px;margin-bottom:16px;cursor:pointer;" 
                     id="importDropZone" onclick="document.getElementById('importFileInput').click()">
                    <div style="font-size:36px;opacity:0.3;">📤</div>
                    <div style="font-size:14px;color:#666;margin-top:8px;">点击选择文件 或 拖拽到此区域</div>
                    <div style="font-size:12px;color:#bbb;margin-top:4px;">支持 .xlsx, .xls</div>
                </div>
                <input type="file" id="importFileInput" accept=".xlsx,.xls" style="display:none;" onchange="window._table.handleImportFile(event)">
                <div style="font-size:12px;color:#999;text-align:left;background:#f7f9fc;padding:10px;border-radius:6px;margin-bottom:12px;">
                    <div style="font-weight:500;margin-bottom:4px;">📋 导入说明：</div>
                    <div>• 第一行为列名，必须与模板一致</div>
                    <div>• 重复数据将跳过（根据唯一字段判断）</div>
                    <div>• 请先下载模板查看格式</div>
                </div>
                <div style="display:flex;gap:10px;justify-content:center;">
                    <button class="btn btn-outline" onclick="window._table.downloadTemplate()"><i class="fas fa-download"></i> 下载模板</button>
                    <button class="btn btn-default" onclick="window._table.closeImportModal()">取消</button>
                </div>
                <div id="importProgress" style="margin-top:12px;display:none;">
                    <div style="background:#f0f2f5;border-radius:6px;height:20px;overflow:hidden;">
                        <div id="importProgressBar" style="background:linear-gradient(135deg,#2d6a9f,#1a3a5c);height:100%;width:0%;transition:width 0.3s;"></div>
                    </div>
                    <div id="importStatusText" style="font-size:13px;color:#666;margin-top:4px;">处理中...</div>
                </div>
            </div>
        `;
        
        self.openImportModal(html);
    };
    
    self.openImportModal = function(html) {
        if (!self.layer) {
            alert('LayUI 未加载');
            return;
        }
        self.importModalIndex = self.layer.open({
            type: 1,
            title: '<i class="fas fa-file-import" style="color:#2d6a9f;"></i> 导入 ' + self.config.title,
            area: ['480px', 'auto'],
            content: html,
            shadeClose: true,
            resize: false,
            maxHeight: '90vh'
        });
    };
    
    self.closeImportModal = function() {
        if (self.importModalIndex !== null && self.importModalIndex !== undefined) {
            self.layer.close(self.importModalIndex);
            self.importModalIndex = null;
        }
    };
    
    // ===== 下载导入模板 =====
    self.downloadTemplate = function() {
        if (typeof XLSX === 'undefined') {
            if (self.layer) self.layer.msg('Excel库未加载', {icon: 5});
            return;
        }
        
        try {
            var templateData = [];
            var headers = [];
            var exampleRow = [];
            
            var fields = self.config.importFields || self.config.formFields;
            
            fields.forEach(function(field) {
                if (field.field === 'id' || field.field === 'Id' || 
                    field.field === 'create_date' || field.field === 'CreateDate' ||
                    field.field === 'update_date' || field.field === 'UpdateDate') {
                    return;
                }
                headers.push(field.label);
                if (field.options && field.options.length > 0) {
                    exampleRow.push(field.options[0].label);
                } else if (field.type === 'date') {
                    exampleRow.push('2026-01-01');
                } else if (field.type === 'number') {
                    exampleRow.push('0');
                } else {
                    exampleRow.push('示例数据');
                }
            });
            
            templateData.push(headers);
            templateData.push(exampleRow);
            
            var wb = XLSX.utils.book_new();
            var ws = XLSX.utils.aoa_to_sheet(templateData);
            XLSX.utils.book_append_sheet(wb, ws, '模板');
            
            var fileName = self.config.title + '_导入模板.xlsx';
            XLSX.writeFile(wb, fileName);
            
            if (self.layer) {
                self.layer.msg('模板下载成功', {icon: 1});
            }
        } catch (e) {
            console.error('下载模板失败:', e);
            if (self.layer) {
                self.layer.msg('下载模板失败: ' + e.message, {icon: 5});
            }
        }
    };
    
    // ===== 处理导入文件 =====
    self.handleImportFile = function(event) {
        var file = event.target.files[0];
        if (!file) return;
        
        var reader = new FileReader();
        reader.onload = function(e) {
            try {
                var data = new Uint8Array(e.target.result);
                var workbook = XLSX.read(data, { type: 'array' });
                var firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                var jsonData = XLSX.utils.sheet_to_json(firstSheet);
                
                if (!jsonData || jsonData.length === 0) {
                    if (self.layer) self.layer.msg('文件为空或格式不正确', {icon: 5});
                    return;
                }
                
                var progressEl = document.getElementById('importProgress');
                var progressBar = document.getElementById('importProgressBar');
                var statusText = document.getElementById('importStatusText');
                if (progressEl) progressEl.style.display = 'block';
                
                self.processImportData(jsonData, progressBar, statusText);
                
            } catch (err) {
                console.error('解析文件失败:', err);
                if (self.layer) self.layer.msg('解析文件失败: ' + err.message, {icon: 5});
            }
        };
        reader.readAsArrayBuffer(file);
        event.target.value = '';
    };
    
    // ===== 处理导入数据 =====
    self.processImportData = function(jsonData, progressBar, statusText) {
        if (!self.config.api || typeof self.config.api.add !== 'function') {
            if (self.layer) self.layer.msg('API缺少 add 方法', {icon: 5});
            return;
        }
        
        var fields = self.config.importFields || self.config.formFields;
        var total = jsonData.length;
        var successCount = 0;
        var failCount = 0;
        var errors = [];
        var index = 0;
        
        var columnMap = {};
        var sampleRow = jsonData[0];
        fields.forEach(function(field) {
            for (var key in sampleRow) {
                if (key === field.label || key === field.field) {
                    columnMap[key] = field.field;
                    break;
                }
            }
        });
        
        if (Object.keys(columnMap).length === 0) {
            for (var key in sampleRow) {
                fields.forEach(function(field) {
                    if (key === field.field || key === field.label) {
                        columnMap[key] = field.field;
                    }
                });
            }
        }
        
        function processNext() {
            if (index >= total) {
                if (progressBar) progressBar.style.width = '100%';
                if (statusText) {
                    statusText.innerHTML = '✅ 导入完成！成功 <strong>' + successCount + '</strong> 条，失败 <strong>' + failCount + '</strong> 条';
                }
                if (self.layer) {
                    self.layer.msg('导入完成！成功 ' + successCount + ' 条，失败 ' + failCount + ' 条', {icon: successCount > 0 ? 1 : 5});
                }
                if (successCount > 0) {
                    self.loadData();
                }
                if (errors.length > 0) {
                    var errorMsg = errors.slice(0, 10).join('<br>');
                    if (errors.length > 10) errorMsg += '<br>... 共 ' + errors.length + ' 条错误';
                    if (self.layer) {
                        self.layer.msg(errorMsg, {icon: 5, time: 5000});
                    }
                }
                setTimeout(function() {
                    self.closeImportModal();
                }, 1500);
                return;
            }
            
            var row = jsonData[index];
            var data = {};
            var isValid = true;
            
            for (var key in columnMap) {
                var fieldName = columnMap[key];
                var value = row[key];
                if (value !== undefined && value !== null) {
                    var fieldConfig = null;
                    fields.forEach(function(f) {
                        if (f.field === fieldName) fieldConfig = f;
                    });
                    if (fieldConfig && fieldConfig.type === 'number') {
                        data[fieldName] = parseFloat(value) || 0;
                    } else if (fieldConfig && fieldConfig.type === 'date') {
                        if (typeof value === 'number') {
                            var date = new Date((value - 25569) * 86400 * 1000);
                            data[fieldName] = date.toISOString().split('T')[0];
                        } else {
                            data[fieldName] = value;
                        }
                    } else {
                        data[fieldName] = value;
                    }
                }
            }
            
            fields.forEach(function(field) {
                if (field.required && (data[field.field] === undefined || data[field.field] === '' || data[field.field] === null)) {
                    isValid = false;
                    errors.push('第 ' + (index + 2) + ' 行: ' + field.label + ' 不能为空');
                }
            });
            
            if (!isValid) {
                failCount++;
                if (progressBar) {
                    progressBar.style.width = Math.round((index + 1) / total * 100) + '%';
                }
                if (statusText) {
                    statusText.textContent = '处理中... ' + (index + 1) + '/' + total + ' (失败: ' + failCount + ')';
                }
                index++;
                setTimeout(processNext, 50);
                return;
            }
            
            self.config.api.add(data).then(function() {
                successCount++;
            }).catch(function(err) {
                failCount++;
                errors.push('第 ' + (index + 2) + ' 行: ' + err);
            }).finally(function() {
                if (progressBar) {
                    progressBar.style.width = Math.round((index + 1) / total * 100) + '%';
                }
                if (statusText) {
                    statusText.textContent = '处理中... ' + (index + 1) + '/' + total + ' (成功: ' + successCount + ', 失败: ' + failCount + ')';
                }
                index++;
                setTimeout(processNext, 50);
            });
        }
        
        processNext();
    };
    
    // ============================================================
    //  启动
    // ============================================================
    self.init();
}