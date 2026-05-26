let currentUser = null;
let authToken = null;
let userPermissions = null;
let loginModal = null;
let addDeviceModal = null;
let editDeviceModal = null;
let addUserModal = null;
let editUserModal = null;
let createShipmentRequestModal = null;
let createReplenishmentRequestModal = null;
let editShipmentRequestModal = null;
let processShipmentModal = null;
let completeShipmentModal = null;
let currentDeviceId = null;
let currentShipmentRequestId = null;
let currentReplenishmentRequestId = null;
let currentContractId = null;
let currentInventoryId = null;
let currentMovementsData = null; // Данные для экспорта отчета по движениям
let currentCustomerName = null;  // Добавьте эту строку
let currentGalleryImages = [];
let currentGalleryIndex = 0;
// Вспомогательная функция для экранирования HTML
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
// Функция для преобразования статуса в русский текст
function getStatusText(status) {
    const statusMap = {
        'new': 'Новая',
        'processing': 'В обработке',
        'partial': 'Частично отгружена',
        'shipped': 'Отгружена',
        'completed': 'Завершена',
        'cancelled': 'Отменена'
    };
    return statusMap[status] || status;
}
function toggleTheme() {
    const body = document.body;
    const themeIcon = document.getElementById('themeIcon');
    if (body.classList.contains('light-theme')) {
        body.classList.remove('light-theme');
        themeIcon.className = 'bi bi-moon-stars';
        localStorage.setItem('atomtech_theme', 'dark');
        const navbar = document.querySelector('.navbar');
        if (navbar) {
            navbar.style.backgroundColor = '';
        }
        console.log('🌙 Переключено на темную тему');
    } else {
        body.classList.add('light-theme');
        themeIcon.className = 'bi bi-sun';
        localStorage.setItem('atomtech_theme', 'light');
        console.log('☀️ Переключено на светлую тему');
    }
    
    // Обновляем цвет легенды диаграммы
    if (window.stockChart) {
        const isLightTheme = body.classList.contains('light-theme');
        const legendColor = isLightTheme ? '#000000' : '#ffffff';
        window.stockChart.options.plugins.legend.labels.color = legendColor;
        window.stockChart.update();
    }
    
    // Обновляем цвета в приветственной карточке
    updateGreetingCardColors();
}
// Функция обновления цвета текста в приветственной карточке
function updateGreetingCardColors() {
    const greetingCard = document.querySelector('.greeting-card');
    if (!greetingCard) return;
    
    const isLightTheme = document.body.classList.contains('light-theme');
    const textColor = isLightTheme ? '#000000' : '#ffffff';
    
    const title = greetingCard.querySelector('h4');
    const subtitle = greetingCard.querySelector('p');
    const icon = greetingCard.querySelector('i');
    
    if (title) title.style.color = textColor;
    if (subtitle) subtitle.style.color = textColor;
    if (icon) icon.style.color = textColor;
}
function updateCurrentPageColors() {
    const isLightTheme = document.body.classList.contains('light-theme');
    const textColor = isLightTheme ? '#000000' : '#ffffff';
    
    const greetingTitle = document.querySelector('.greeting-card h4');
    const greetingSubtitle = document.querySelector('.greeting-card p');
    const greetingIcon = document.querySelector('.greeting-card i');
    
    if (greetingTitle) greetingTitle.style.color = textColor;
    if (greetingSubtitle) greetingSubtitle.style.color = textColor;
    if (greetingIcon) greetingIcon.style.color = textColor;
}

// Функция загрузки сохраненной темы
function loadSavedTheme() {
    const savedTheme = localStorage.getItem('atomtech_theme');
    const themeIcon = document.getElementById('themeIcon');
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        if (themeIcon) themeIcon.className = 'bi bi-sun';
        console.log('☀️ Загружена светлая тема');
    } else {
        document.body.classList.remove('light-theme');
        if (themeIcon) themeIcon.className = 'bi bi-moon-stars';
        console.log('🌙 Загружена темная тема (по умолчанию)');
    }
}

// Функция инициализации кнопки темы
function initThemeToggle() {
    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) {
        themeBtn.addEventListener('click', toggleTheme);
        console.log(' Кнопка переключения темы инициализирована');
    } else {
        console.warn(' Кнопка переключения темы не найдена');
    }
}
const API_BASE_URL = window.location.origin;

function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function isValidPhone(phone) {
    if (!phone) return true;
    const re = /^(\+375|80)(29|25|44|33)\d{7}$/;
    return re.test(phone.replace(/[^\d+]/g, ''));
}

function isValidUnp(unp) {
    if (!unp) return false;
    const re = /^\d{9}$/;
    return re.test(unp);
}

function isNotEmpty(str) {
    return str && str.trim().length > 0;
}

function isPositiveNumber(value) {
    if (value === undefined || value === null || value === '') return false;
    const num = Number(value);
    return !isNaN(num) && num > 0 && Number.isFinite(num);
}

function isNonNegativeNumber(value) {
    if (value === undefined || value === null || value === '') return false;
    const num = Number(value);
    return !isNaN(num) && num >= 0 && Number.isFinite(num);
}

function isPositiveInteger(value) {
    if (value === undefined || value === null || value === '') return false;
    const num = Number(value);
    return Number.isInteger(num) && num > 0;
}

function isNonNegativeInteger(value) {
    if (value === undefined || value === null || value === '') return false;
    const num = Number(value);
    return Number.isInteger(num) && num >= 0;
}

function isFutureDate(dateString, allowToday = true) {
    if (!dateString) return true;
    const inputDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    inputDate.setHours(0, 0, 0, 0);
    if (allowToday) {
        return inputDate >= today;
    } else {
        return inputDate > today;
    }
}

function isPastOrPresentDate(dateString) {
    if (!dateString) return true;
    const inputDate = new Date(dateString);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return inputDate <= today;
}

function isValidPrice(price) {
    if (price === undefined || price === null || price === '') return false;
    const num = Number(price);
    if (isNaN(num) || num < 0) return false;
    const priceStr = price.toString();
    const decimalPart = priceStr.split('.')[1];
    return !decimalPart || decimalPart.length <= 2;
}

function isNumberKey(evt) {
    var charCode = (evt.which) ? evt.which : evt.keyCode;
    if (charCode > 31 && (charCode < 48 || charCode > 57) && 
        charCode !== 46 && charCode !== 8 && charCode !== 9 && 
        charCode !== 13 && (charCode < 37 || charCode > 40)) {
        return false;
    }
    return true;
}

function isValidDeviceId(id) {
    const re = /^[A-Za-z0-9-]+$/;
    return re.test(id);
}

function sanitizeString(str) {
    if (!str) return '';
    return str.trim().replace(/[<>]/g, '');
}


document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Запуск приложения...');
    loadSavedTheme();
    initThemeToggle();
    await loadUserList();
    const notificationsDropdown = document.querySelector('.dropdown.me-2');
    const userDropdown = document.querySelector('.dropdown.ms-2');
    if (notificationsDropdown) notificationsDropdown.style.display = 'none';
    if (userDropdown) userDropdown.style.display = 'none';
    const savedToken = localStorage.getItem('atomtech_token');
    const savedUser = localStorage.getItem('atomtech_user');
    if (savedToken && savedUser) {
        authToken = savedToken;
        currentUser = JSON.parse(savedUser);
        updateUserInfo();
        await loadUserPermissions();
        if (notificationsDropdown) notificationsDropdown.style.display = 'block';
        if (userDropdown) userDropdown.style.display = 'block';
        loadDashboard();
    } else {
        console.log('Ожидание действий пользователя');
        const nav = document.getElementById('main-nav');
        if (nav) nav.innerHTML = '';
        document.getElementById('content').innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h5 class="mb-0">Добро пожаловать в систему!</h5>
                </div>
                <div class="card-body">
                    <p>Система управления складом приборов НПУП «АТОМТЕХ».</p>
                    <p class="text-muted">Для начала работы войдите в систему.</p>
                    <button class="btn btn-atomtech" onclick="showLoginModal()">
                        <i class="bi bi-box-arrow-in-right"></i> Войти в систему
                    </button>
                </div>
            </div>
        `;
    }
    document.getElementById('logout-btn').addEventListener('click', function(e) {
        e.preventDefault();
        logout();
    });
    checkServerConnection();
});
function renderInventoriesTable(inventories) {
    let html = '';
    
    if (inventories && inventories.length > 0) {
        inventories.forEach(i => {
            // Нормализуем статус
            let status = i.status;
            if (typeof status === 'string') {
                status = status.toLowerCase().trim();
            }
            
            // Определяем статус и класс
            let statusClass = '';
            let statusName = '';
            
            if (status === 'completed') {
                statusClass = 'bg-success';
                statusName = 'Завершена';
            } else if (status === 'draft') {
                statusClass = 'bg-secondary';
                statusName = 'Черновик';
            } else if (status === 'in_progress') {
                statusClass = 'bg-warning';
                statusName = 'В процессе';
            } else {
                statusClass = 'bg-secondary';
                statusName = i.status_name || i.status || 'Неизвестно';
            }
            
            html += `
                <tr>
                    <td><code>${escapeHtml(i.inventory_number)}</code></td>
                    <td>${new Date(i.inventory_date).toLocaleDateString()}</td>
                    <td><span class="badge ${statusClass}">${escapeHtml(statusName)}</span></td>
                    <td>${i.items_count || 0}</td>
                    <td>${i.discrepancies_count || 0}</td>
                    <td>${escapeHtml(i.created_by_name || '-')}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-info" onclick="viewInventory(${i.id})" title="Просмотр">
                            <i class="bi bi-eye"></i>
                        </button>
                     </noscript>
                </tr>
            `;
        });
    } else {
        html = '<td><td colspan="7" class="text-center">Нет инвентаризаций</td></tr>';
    }
    
    const tbody = document.querySelector('#inventoryTable tbody');
    if (tbody) {
        tbody.innerHTML = html;
    }
}
async function loadUserList() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/users/list`);
        const data = await response.json();
        if (data.success && data.users) {
            const select = document.getElementById('loginEmail');
            if (select) {
                select.innerHTML = '<option value="">Выберите пользователя...</option>';
                data.users.forEach(user => {
                    const option = document.createElement('option');
                    option.value = user.email;
                    const displayName = user.position 
                        ? `${user.full_name} (${user.position})` 
                        : user.full_name;
                    option.textContent = displayName;
                    select.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки списка пользователей:', error);
    }
}

async function checkServerConnection() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/health`);
        const data = await response.json();
        if (data.success) {
            console.log('Сервер работает:', data.service, 'версия', data.version);
            if (!data.database_connected) {
                showError('База данных не подключена!');
            }
        }
    } catch (error) {
        console.error('Сервер не отвечает:', error);
        showError('Сервер не запущен. Запустите: node server.js');
    }
}

async function loadUserPermissions() {
    if (!authToken) return;
    try {
        const response = await fetch(`${API_BASE_URL}/api/user/permissions`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await response.json();
        if (data.success) {
            userPermissions = data.permissions;
            console.log('Права пользователя загружены:', userPermissions);
            updateNavigationByRole();

            await loadNotifications();
        }
    } catch (error) {
        console.error('Ошибка загрузки прав:', error);
    }
}

function updateNavigationByRole() {
    const nav = document.getElementById('main-nav');
    if (!userPermissions) return;
    nav.innerHTML = '';
    nav.innerHTML += `
        <li class="nav-item">
            <a class="nav-link" href="#" onclick="loadDashboard()">
                <i class="bi bi-speedometer2"></i> Главная
            </a>
        </li>
    `;
    nav.innerHTML += `
        <li class="nav-item">
            <a class="nav-link" href="#" onclick="loadDevices()">
                <i class="bi bi-cpu"></i> Приборы
            </a>
        </li>
    `;
    if (userPermissions.can_view_shipment_requests) {
    nav.innerHTML += `
        <li class="nav-item">
            <a class="nav-link" href="#" onclick="loadShipmentRequests()">
                <i class="bi bi-truck"></i> Отгрузка
            </a>
        </li>
    `;
}
if (currentUser?.role === 'manager') {
    nav.innerHTML += `
        <li class="nav-item">
            <a class="nav-link" href="#" onclick="loadCustomers()">
                <i class="bi bi-people"></i> Покупатели
            </a>
        </li>
    `;
}
    if (userPermissions.can_view_replenishment_requests) {
        nav.innerHTML += `
            <li class="nav-item">
                <a class="nav-link" href="#" onclick="loadReplenishmentRequests()">
                    <i class="bi bi-box-arrow-in-down"></i> Пополнение
                </a>
            </li>
        `;
    }
    nav.innerHTML += `
        <li class="nav-item">
            <a class="nav-link" href="#" onclick="loadInventories()">
                <i class="bi bi-clipboard-data"></i> Инвентаризация
            </a>
        </li>
    `;
    nav.innerHTML += `
        <li class="nav-item">
            <a class="nav-link" href="#" onclick="loadReports()">
                <i class="bi bi-bar-chart"></i> Отчеты
            </a>
        </li>
    `;
    nav.innerHTML += `
        <li class="nav-item">
            <a class="nav-link" href="#" onclick="loadPriceList()">
                <i class="bi bi-file-earmark-spreadsheet"></i> Прайс-лист
            </a>
        </li>
    `;
    if (userPermissions.can_manage_users) {
        nav.innerHTML += `
            <li class="nav-item">
                <a class="nav-link" href="#" onclick="loadUsers()">
                    <i class="bi bi-people"></i> Пользователи
                </a>
            </li>
        `;
    }
nav.innerHTML += `
    <li class="nav-item">
        <a class="nav-link" href="#" onclick="loadWarehouseMap2D()">
            <i class="bi bi-map"></i> Схема склада
        </a>
    </li>
`;
}

let allCustomers = [];
let currentCustomerUnp = null;

async function loadCustomers() {
    if (!authToken) return;
    
    // Проверяем права (только для менеджера и админа)
    if (currentUser?.role !== 'manager' && currentUser?.role !== 'admin') {
        showError('Доступ запрещен');
        return;
    }
    
    document.getElementById('page-title').textContent = 'Покупатели';
    document.getElementById('page-actions').innerHTML = `
        <div class="input-group" style="width: 300px;">
            <input type="text" class="form-control" id="customerSearchInput" 
                   placeholder="Поиск по названию..." 
                   autocomplete="off"
                   onkeyup="searchCustomersDebounced()">
            <button class="btn btn-outline-secondary" type="button" onclick="resetCustomerSearch()">
                <i class="bi bi-x-lg"></i>
            </button>
        </div>
    `;
    
    document.getElementById('content').innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border" style="color: var(--accent);"></div>
            <p class="mt-3">Загрузка списка покупателей...</p>
        </div>
    `;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/customers`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            allCustomers = data.customers || [];
            renderCustomersList(allCustomers);
        }
    } catch (error) {
        console.error('Ошибка загрузки покупателей:', error);
        showError('Ошибка загрузки покупателей');
    }
}

function renderCustomersList(customers) {
    let html = `
        <div class="row">
            <div class="col-md-4">
                <div class="card">
                    <div class="card-header">
                        <h5 class="mb-0">Список покупателей</h5>
                    </div>
                    <div class="card-body p-0" style="max-height: 70vh; overflow-y: auto;">
                        <div class="list-group list-group-flush">
    `;
    
    if (customers && customers.length > 0) {
        customers.forEach(customer => {
            // Передаем название компании, а не УНП
            const customerName = encodeURIComponent(customer.customer_name);
            html += `
                <a href="#" class="list-group-item list-group-item-action ${currentCustomerName === customer.customer_name ? 'active' : ''}" 
                   onclick="viewCustomerHistory('${customerName}'); return false;">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <strong>${escapeHtml(customer.customer_name)}</strong>
                            <br>
                            <small class="text-muted">УНП: ${escapeHtml(customer.customer_unp || '-')}</small>
                        </div>
                        <div class="text-end">
                            <span class="badge bg-primary">${customer.total_orders} заказов</span>
                        </div>
                    </div>
                    <div class="mt-1">
                        <small>${escapeHtml(customer.customer_contact || 'Нет контакта')}</small>
                    </div>
                </a>
            `;
        });
    } else {
        html += '<div class="list-group-item text-center text-muted">Нет покупателей</div>';
    }
    
    html += `
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-md-8" id="customerHistoryContainer">
                <div class="card">
                    <div class="card-header">
                        <h5 class="mb-0">Выберите покупателя для просмотра истории</h5>
                    </div>
                    <div class="card-body text-center text-muted">
                        <i class="bi bi-people fs-1"></i>
                        <p class="mt-3">Нажмите на покупателя слева, чтобы увидеть историю взаимодействий</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('content').innerHTML = html;
}

let customerSearchTimeout;

function searchCustomersDebounced() {
    clearTimeout(customerSearchTimeout);
    customerSearchTimeout = setTimeout(() => {
        searchCustomers();
    }, 500);
}

async function searchCustomers() {
    const search = document.getElementById('customerSearchInput')?.value || '';
    
    if (!search.trim()) {
        renderCustomersList(allCustomers);
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/customers/search?q=${encodeURIComponent(search)}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            renderCustomersList(data.customers);
        }
    } catch (error) {
        console.error('Ошибка поиска:', error);
    }
}

function resetCustomerSearch() {
    const searchInput = document.getElementById('customerSearchInput');
    if (searchInput) {
        searchInput.value = '';
        renderCustomersList(allCustomers);
    }
}

async function viewCustomerHistory(customerNameEncoded) {
    // Декодируем название
    const customerName = decodeURIComponent(customerNameEncoded);
    currentCustomerName = customerName;
    
    // Обновляем активный элемент в списке
    const clickedItem = event?.target?.closest('.list-group-item');
    if (clickedItem) {
        document.querySelectorAll('.list-group-item').forEach(item => {
            item.classList.remove('active');
        });
        clickedItem.classList.add('active');
    }
    
    document.getElementById('customerHistoryContainer').innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border" style="color: var(--accent);"></div>
            <p class="mt-3">Загрузка истории...</p>
        </div>
    `;
    
    try {
        console.log('Запрос истории для покупателя:', customerName);
        
        const response = await fetch(`${API_BASE_URL}/api/customers/${encodeURIComponent(customerName)}/history`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const data = await response.json();
        console.log('Ответ сервера:', data);
        
        if (data.success) {
            if (data.orders && data.orders.length > 0) {
                renderCustomerHistory(data);
            } else {
                document.getElementById('customerHistoryContainer').innerHTML = `
                    <div class="card">
                        <div class="card-body text-center text-muted">
                            <i class="bi bi-inbox fs-1"></i>
                            <p class="mt-3">Нет заказов для покупателя "${escapeHtml(customerName)}"</p>
                        </div>
                    </div>
                `;
            }
        } else {
            document.getElementById('customerHistoryContainer').innerHTML = `
                <div class="alert alert-warning">
                    <i class="bi bi-exclamation-triangle"></i>
                    Не удалось загрузить историю покупателя. ${data.message || ''}
                </div>
            `;
        }
    } catch (error) {
        console.error('Ошибка загрузки истории:', error);
        document.getElementById('customerHistoryContainer').innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle"></i>
                Ошибка загрузки истории: ${error.message}
            </div>
        `;
    }
}
function renderCustomerHistory(data) {
    const summary = data.summary || {};
    const orders = data.orders || [];
    
    console.log('Рендеринг истории:', { summary, ordersCount: orders.length });
    
    // Статистика (компактная)
    const statsHtml = `
        <div class="row mb-4">
            <div class="col-md-3">
                <div class="card bg-primary text-white">
                    <div class="card-body text-center py-2">
                        <h4 class="mb-0">${summary.total_orders || 0}</h4>
                        <small>Всего заказов</small>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card bg-success text-white">
                    <div class="card-body text-center py-2">
                        <h4 class="mb-0">${summary.completed_orders || 0}</h4>
                        <small>Выполнено</small>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card bg-info text-white">
                    <div class="card-body text-center py-2">
                        <h4 class="mb-0">${summary.shipped_orders || 0}</h4>
                        <small>Отгружено</small>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card bg-warning text-white">
                    <div class="card-body text-center py-2">
                        <h4 class="mb-0">${(summary.total_spent || 0).toFixed(0)} руб.</h4>
                        <small>Общая сумма</small>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Таблица с историей заказов (с увеличенным отступом)
    let ordersHtml = `
        <div class="card">
            <div class="card-header" style="padding-bottom: 15px;">
                <h5 class="mb-0">История заказов</h5>
            </div>
            <div class="card-body p-0">
                <div style="height: 10px;"></div>
                <div class="table-responsive">
                    <table class="table table-hover mb-0">
                        <thead>
                            <tr>
                                <th>№ заявки</th>
                                <th>Дата</th>
                                <th>Статус</th>
                                <th>Кол-во</th>
                                <th>Сумма</th>
                                <th style="width: 50px;">Действия</th>
                            </tr>
                        </thead>
                        <tbody>
    `;
    
    if (orders.length > 0) {
        orders.forEach(order => {
            const statusClass = order.status === 'completed' ? 'bg-success' :
                               order.status === 'shipped' ? 'bg-primary' :
                               order.status === 'processing' ? 'bg-info' :
                               order.status === 'partial' ? 'bg-warning' : 'bg-secondary';
            const statusText = order.status === 'completed' ? 'Завершен' :
                              order.status === 'shipped' ? 'Отгружен' :
                              order.status === 'processing' ? 'В обработке' :
                              order.status === 'partial' ? 'Частично' : 'Новый';
            
            ordersHtml += `
                <tr>
                    <td><code>${escapeHtml(order.request_number)}</code></td>
                    <td>${new Date(order.created_at).toLocaleDateString()}</noscript>
                    <td><span class="badge ${statusClass}">${statusText}</span></noscript>
                    <td>${order.total_quantity || 0} шт.</noscript>
                    <td>${(order.total_amount || 0).toFixed(2)} руб.</noscript>
                    <td class="text-center">
                        <button class="btn btn-sm btn-outline-info" onclick="viewShipmentRequest(${order.id})" title="Просмотр заявки">
                            <i class="bi bi-eye"></i>
                        </button>
                     </noscript>
                </tr>
            `;
        });
    } else {
        ordersHtml += '<tr><td colspan="6" class="text-center">Нет заказов</noscript>';
    }
    
    ordersHtml += `
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('customerHistoryContainer').innerHTML = `
        ${statsHtml}
        ${ordersHtml}
    `;
}
function showLoginModal() {
    const emailSelect = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    if (emailSelect) emailSelect.value = '';
    if (passwordInput) {
        passwordInput.value = '';
        passwordInput.removeAttribute('autocomplete');
        passwordInput.setAttribute('autocomplete', 'off');
    }
    const loginAlert = document.getElementById('loginAlert');
    if (loginAlert) loginAlert.classList.add('d-none');
    if (!loginModal) {
        loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
    }
    loginModal.show();
}

async function performLogin() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const loginAlert = document.getElementById('loginAlert');
    loginAlert.classList.add('d-none');
    if (!email) {
        loginAlert.textContent = 'Выберите пользователя';
        loginAlert.classList.remove('d-none');
        return;
    }
    if (!password || password.trim() === '') {
        loginAlert.textContent = 'Введите пароль';
        loginAlert.classList.remove('d-none');
        return;
    }
    const sanitizedEmail = sanitizeString(email);
    const sanitizedPassword = sanitizeString(password);
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: sanitizedEmail, password: sanitizedPassword })
        });
        const data = await response.json();
        if (data.success) {
            if (typeof destroyWarehouse3D === 'function') {
                destroyWarehouse3D();
            }
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('atomtech_token', authToken);
            localStorage.setItem('atomtech_user', JSON.stringify(currentUser));
            const notificationsDropdown = document.querySelector('.dropdown.me-2');
            if (notificationsDropdown) notificationsDropdown.style.display = 'block';
            const userDropdown = document.querySelector('.dropdown.ms-2');
            if (userDropdown) userDropdown.style.display = 'block';
            updateUserInfo();
            await loadUserPermissions();
            loginModal.hide();
            loadDashboard();
        } else {
            loginAlert.textContent = data.message;
            loginAlert.classList.remove('d-none');
        }
    } catch (error) {
        loginAlert.textContent = 'Ошибка подключения к серверу';
        loginAlert.classList.remove('d-none');
    }
}

function updateUserInfo() {
    if (currentUser) {
        document.getElementById('user-name').textContent = currentUser.full_name;
        let roleText = '';
        if (currentUser.role === 'admin') roleText = 'Заведующий склада';
        else if (currentUser.role === 'manager') roleText = 'Менеджер по продажам';
        else roleText = 'Кладовщик';
        document.getElementById('user-role').textContent = roleText;
        
        // Добавляем класс для скрытия уведомлений у менеджера
        if (currentUser.role === 'manager') {
            document.body.classList.add('manager-role');
        } else {
            document.body.classList.remove('manager-role');
        }
    }
}

function logout() {
    if (typeof destroyWarehouse3D === 'function') {
        destroyWarehouse3D();
    }
    localStorage.removeItem('atomtech_token');
    localStorage.removeItem('atomtech_user');
    authToken = null;
    currentUser = null;
    userPermissions = null;
    allUsers = [];
    allInventories = [];
    allReplenishmentRequests = [];
    allShipmentRequests = [];
    currentGalleryImages = [];
    document.getElementById('user-name').textContent = 'Гость';
    document.getElementById('user-role').textContent = 'Не авторизован';
    const notificationsDropdown = document.querySelector('.dropdown.me-2');
    if (notificationsDropdown) notificationsDropdown.style.display = 'none';
    const userDropdown = document.querySelector('.dropdown.ms-2');
    if (userDropdown) userDropdown.style.display = 'none';
    const nav = document.getElementById('main-nav');
    if (nav) nav.innerHTML = '';
    const pageActions = document.getElementById('page-actions');
    if (pageActions) pageActions.innerHTML = '';
    const pageTitle = document.getElementById('page-title');
    if (pageTitle) pageTitle.textContent = 'АТОМТЕХ Склад';
    document.getElementById('content').innerHTML = `
        <div class="card">
            <div class="card-header">
                <h5 class="mb-0">Добро пожаловать в систему!</h5>
            </div>
            <div class="card-body">
                <p>Система управления складом приборов НПУП «АТОМТЕХ».</p>
                <p class="text-muted">Для начала работы войдите в систему.</p>
                <button class="btn btn-atomtech" onclick="showLoginModal()">
                    <i class="bi bi-box-arrow-in-right"></i> Войти в систему
                </button>
            </div>
        </div>
    `;
    const notificationsBadge = document.getElementById('notificationsBadge');
    if (notificationsBadge) {
        notificationsBadge.textContent = '0';
        notificationsBadge.style.display = 'none';
    }
    const notificationsList = document.getElementById('notificationsList');
    if (notificationsList) {
        notificationsList.innerHTML = `
            <div class="notifications-header">
                <h6 class="m-0">Уведомления</h6>
            </div>
            <div class="text-center py-3 text-muted">Войдите в систему для просмотра уведомлений</div>
        `;
    }
    const hiddenDivs = document.querySelectorAll('div[style="display: none;"]');
    hiddenDivs.forEach(div => {
        if (div.innerHTML.includes('categoryFilter') || 
            div.innerHTML.includes('shipmentStatusFilter') ||
            div.innerHTML.includes('replenishmentStatusFilter') ||
            div.innerHTML.includes('inventoryStatusFilter') ||
            div.innerHTML.includes('userRoleFilter')) {
            div.remove();
        }
    });
    console.log('Выход из системы выполнен');
}

function showSuccess(message) {
    showAlert(message, 'success');
}

function showError(message) {
    showAlert(message, 'danger');
}

function showWarning(message) {
    showAlert(message, 'warning');
}

function showInfo(message) {
    showAlert(message, 'info');
}

function showAlert(message, type) {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 end-0 m-3`;
    alert.style.zIndex = '9999';
    alert.style.minWidth = '300px';
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.body.appendChild(alert);
    setTimeout(() => alert.remove(), 5000);
}

function setActiveNav(index) {
    document.querySelectorAll('#main-nav .nav-link').forEach((link, i) => {
        if (i === index) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}


async function loadDashboard() {

    if (!authToken) {
        showLoginModal();
        return;
    }
    
    await loadNotifications();
    
    document.getElementById('page-title').textContent = 'Главная панель';
    document.getElementById('page-actions').innerHTML = '';
    setActiveNav(0);
    
    document.getElementById('content').innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border" style="color: var(--accent);"></div>
            <p class="mt-3">Загрузка данных...</p>
        </div>
    `;
    
    try {
        // Получаем данные пользователя
        const userInfoResponse = await fetch(`${API_BASE_URL}/api/user/info`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const userInfo = await userInfoResponse.json();
        
        // Получаем статистику
        const statsResponse = await fetch(`${API_BASE_URL}/api/dashboard/stats`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const statsData = await statsResponse.json();
        
        // Получаем последние действия пользователя
        const activityResponse = await fetch(`${API_BASE_URL}/api/user/activity?limit=20`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const activityData = await activityResponse.json();
        
        const stats = statsData.success ? statsData.stats : {};
        const user = userInfo.success ? userInfo.user : {};
        
        // Формируем приветствие в зависимости от времени суток
        const hour = new Date().getHours();
        let greeting = '';
        if (hour < 12) greeting = 'Доброе утро';
        else if (hour < 18) greeting = 'Добрый день';
        else greeting = 'Добрый вечер';
        
        // Определяем роль пользователя для отображения
        let roleName = '';
        if (user.role === 'admin') roleName = 'Заведующий склада';
        else if (user.role === 'manager') roleName = 'Менеджер по продажам';
        else roleName = 'Кладовщик';
        
        // Формируем HTML для последних действий
        let activityHtml = '';
        if (activityData.success && activityData.activities && activityData.activities.length > 0) {
            activityData.activities.forEach(a => {
                let icon = 'bi-arrow-left-right';
                let color = 'text-primary';
                if (a.type === 'Заявка на отгрузку') {
                    icon = 'bi-truck';
                    color = 'text-info';
                } else if (a.type === 'Заявка на пополнение') {
                    icon = 'bi-box-arrow-in-down';
                    color = 'text-warning';
                } else if (a.type === 'Договор') {
                    icon = 'bi-file-text';
                    color = 'text-success';
                } else if (a.type === 'Инвентаризация') {
                    icon = 'bi-clipboard-data';
                    color = 'text-secondary';
                } else if (a.type === 'Движение') {
                    icon = a.action === 'поступление' ? 'bi-arrow-down-circle text-success' : 'bi-arrow-up-circle text-danger';
                }
                
                let formattedDate = '';
                if (a.date) {
                    let dateObj;
                    if (typeof a.date === 'string') {
                        if (a.date.match(/^\d{2}\.\d{2}\.\d{4}$/)) {
                            formattedDate = a.date;
                        } else {
                            dateObj = new Date(a.date);
                            if (!isNaN(dateObj.getTime())) {
                                const day = String(dateObj.getDate()).padStart(2, '0');
                                const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                                const year = dateObj.getFullYear();
                                formattedDate = `${day}.${month}.${year}`;
                            }
                        }
                    } else if (a.date instanceof Date) {
                        const day = String(a.date.getDate()).padStart(2, '0');
                        const month = String(a.date.getMonth() + 1).padStart(2, '0');
                        const year = a.date.getFullYear();
                        formattedDate = `${day}.${month}.${year}`;
                    }
                } 
                
                let objectDisplay = '';
                if (a.type === 'Инвентаризация') {
                    objectDisplay = a.object_name || '';
                } else if (a.type === 'Заявка на пополнение') {
                    objectDisplay = a.object_name || '';
                } else if (a.type === 'Заявка на отгрузку') {
                    objectDisplay = a.object_name || '';
                } else if (a.type === 'Договор') {
                    objectDisplay = a.object_name || '';
                } else if (a.type === 'Движение') {
                    objectDisplay = a.details || '';
                } else {
                    objectDisplay = a.details || a.object_name || '';
                }
                
                activityHtml += `
                    <div class="d-flex align-items-center mb-2 pb-2 border-bottom">
                        <div class="me-2 ${color}" style="width: 30px;">
                            <i class="bi ${icon} fs-5"></i>
                        </div>
                        <div class="flex-grow-1">
                            <span class="fw-semibold">${sanitizeString(a.action)}</span>
                            <span class="text-muted mx-1">·</span>
                            <span class="small text-muted">${sanitizeString(objectDisplay)}</span>
                        </div>
                        <div class="small text-muted">
                            <i class="bi bi-calendar3 me-1"></i>${formattedDate}
                        </div>
                    </div>
                `;
            });
        } else {
            activityHtml = '<div class="text-center text-muted py-5">Нет активностей</div>';
        }
        
        // Определяем цвет текста для приветственной карточки в зависимости от темы
        const isLightTheme = document.body.classList.contains('light-theme');
        const textColor = isLightTheme ? '#000000' : '#ffffff';
        const legendColor = isLightTheme ? '#000000' : '#ffffff';
        
        // Основной HTML
        document.getElementById('content').innerHTML = `
            <div class="row">
                <!-- Приветственная карточка -->
                <div class="col-12 mb-4">
                    <div class="card greeting-card bg-gradient-primary" style="background: linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%);">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <h4 class="mb-1" style="color: ${textColor};">${greeting}, ${sanitizeString(user.full_name)}!</h4>
                                    <p class="mb-0" style="color: ${textColor}; opacity: 0.8;">${roleName} · ${new Date().toLocaleDateString('ru-RU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                </div>
                                <div class="text-center">
                                    <i class="bi bi-person-circle fs-1" style="color: ${textColor}; opacity: 0.6;"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Диаграмма состояния склада -->
                <div class="col-12 mb-4">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="mb-0"><i class="bi bi-pie-chart me-2"></i> Состояние склада</h5>
                        </div>
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-6">
                                    <canvas id="stockChart" style="max-height: 300px; width: 100%;"></canvas>
                                </div>
                                <div class="col-md-6">
                                    <div class="row text-center">
                                        <div class="col-4">
                                            <div class="border rounded p-3">
                                                <h3 class="mb-0">${stats.devices?.in_stock || 0}</h3>
                                                <small class="text-muted">В наличии</small>
                                            </div>
                                        </div>
                                        <div class="col-4">
                                            <div class="border rounded p-3">
                                                <h3 class="mb-0">${stats.devices?.low_stock || 0}</h3>
                                                <small class="text-muted">Мало на складе</small>
                                            </div>
                                        </div>
                                        <div class="col-4">
                                            <div class="border rounded p-3">
                                                <h3 class="mb-0">${stats.devices?.out_of_stock || 0}</h3>
                                                <small class="text-muted">Нет в наличии</small>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Последние действия -->
                <div class="col-12 mb-4">
                    <div class="card">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <h5 class="mb-0"><i class="bi bi-clock-history me-2"></i> Последние действия</h5>
                            <button class="btn btn-sm btn-outline-primary" onclick="loadProfile()">Все действия →</button>
                        </div>
                        <div class="card-body" style="max-height: 400px; overflow-y: auto;">
                            ${activityHtml}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Создаем круговую диаграмму состояния склада
        const stockCtx = document.getElementById('stockChart').getContext('2d');
        const stockChart = new Chart(stockCtx, {
            type: 'doughnut',
            data: {
                labels: ['В наличии', 'Мало на складе', 'Нет в наличии'],
                datasets: [{
                    data: [
                        stats.devices?.in_stock || 0,
                        stats.devices?.low_stock || 0,
                        stats.devices?.out_of_stock || 0
                    ],
                    backgroundColor: ['#28a745', '#ffc107', '#dc3545'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { 
                            color: legendColor,
                            font: {
                                size: 12
                            }
                        }
                    }
                }
            }
        });
        
        // Сохраняем ссылку на диаграмму для обновления цвета при смене темы
        window.stockChart = stockChart;
        
    } catch (error) {
        console.error('❌ ОШИБКА ЗАГРУЗКИ ДАШБОРДА:', error);
        showDashboardFallback();
    }
}

// Вспомогательная функция для форматирования времени (ИСПРАВЛЕННАЯ)
function getTimeAgo(date) {
    if (!date) return 'неизвестно';
    
    // Убеждаемся, что date - это объект Date
    const dateObj = date instanceof Date ? date : new Date(date);
    
    if (isNaN(dateObj.getTime())) return 'неизвестно';
    
    const now = new Date();
    const diffMs = now - dateObj;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'только что';
    if (diffMins < 60) return `${diffMins} мин. назад`;
    if (diffHours < 24) return `${diffHours} ч. назад`;
    if (diffDays === 1) return 'вчера';
    if (diffDays < 7) return `${diffDays} дн. назад`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} нед. назад`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} мес. назад`;
    return `${Math.floor(diffDays / 365)} г. назад`;
}


async function loadPriceList() {
    if (!authToken) return;
    document.getElementById('page-title').textContent = 'Прайс-лист';
    document.getElementById('page-actions').innerHTML = `
        <div class="btn-group">
            <button class="btn btn-success btn-sm" onclick="exportPriceList('excel')">
                <i class="bi bi-file-earmark-excel"></i> Excel
            </button>
            <button class="btn btn-info btn-sm" onclick="exportPriceList('docx')">
                <i class="bi bi-file-word"></i> DOCX
            </button>
        </div>
        ${userPermissions?.role === 'manager' || userPermissions?.role === 'admin' ? `
        <button class="btn btn-primary btn-sm ms-2" onclick="showEditPriceListModal()">
            <i class="bi bi-pencil"></i> Редактировать цены
        </button>
        ` : ''}
    `;
    document.getElementById('content').innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border" style="color: var(--accent);"></div>
            <p class="mt-3">Загрузка прайс-листа...</p>
        </div>
    `;
    try {
        const response = await fetch(`${API_BASE_URL}/api/price-list-data`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (!response.ok) {
            throw new Error(`Ошибка сервера: ${response.status}`);
        }
        const data = await response.json();
        if (data.success) {
            let html = `
                <div class="card">
                    <div class="card-header">
                        <h5 class="mb-0">Прайс-лист НПУП «АТОМТЕХ»</h5>
                        <small class="text-muted">Дата формирования: ${new Date().toLocaleDateString()}</small>
                    </div>
                    <div class="card-body">
                        <div class="table-responsive">
                            <table class="table table-hover">
                                <thead>
                                    <tr>
                                        <th>Артикул</th>
                                        <th>Наименование</th>
                                        <th>Категория</th>
                                        <th>Производитель</th>
                                        <th>Модель</th>
                                        <th>Цена (руб.)</th>
                                    </tr>
                                </thead>
                                <tbody>
            `;
            
            if (data.devices && data.devices.length > 0) {
                data.devices.forEach(item => {
                    html += `
                        <tr>
                            <td><code>${sanitizeString(item.unique_id)}</code></td>
                            <td>${sanitizeString(item.name)}</td>
                            <td>${sanitizeString(item.category || '-')}</td>
                            <td>${sanitizeString(item.manufacturer || '-')}</td>
                            <td>${sanitizeString(item.model || '-')}</td>
                            <td class="fw-bold">${isValidPrice(item.price) ? Number(item.price).toFixed(2) : '0.00'} руб.</td>
                        </tr>
                    `;
                });
            } else {
                html += '<tr><td colspan="6" class="text-center">Нет данных для отображения</td></tr>';
            }
            
            html += `
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
            document.getElementById('content').innerHTML = html;
        }
    } catch (error) {
        console.error('Ошибка загрузки прайс-листа:', error);
        showError('Ошибка загрузки прайс-листа');
    }
}

async function exportPriceList(format) {
    try {
        showInfo('Формирование прайс-листа...');
        
        const response = await fetch(`${API_BASE_URL}/api/price-list?format=${format}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (!response.ok) {
            throw new Error('Ошибка при формировании прайс-листа');
        }
        
        // Для HTML и Excel используем стандартный ответ от сервера
        if (format !== 'docx') {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            
            let ext = format;
            if (format === 'excel') ext = 'xlsx';
            else if (format === 'pdf') ext = 'pdf';
            else if (format === 'html') ext = 'html';
            
            a.download = `price_list_${new Date().toISOString().split('T')[0]}.${ext}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            showSuccess(`Прайс-лист экспортирован в ${format.toUpperCase()}`);
        } else {
            // Для DOCX получаем данные отдельно и формируем красивый документ
            await exportPriceListToDocx();
        }
        
    } catch (error) {
        console.error('Ошибка экспорта прайс-листа:', error);
        showError('Ошибка при экспорте прайс-листа: ' + error.message);
    }
}

async function exportPriceListToDocx() {
    try {
        showInfo('Формирование документа...');
        
        // Получаем данные для прайс-листа
        const response = await fetch(`${API_BASE_URL}/api/price-list-data`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const data = await response.json();
        
        if (!data.success || !data.devices || data.devices.length === 0) {
            showError('Нет данных для формирования прайс-листа');
            return;
        }
        
        const devices = data.devices;
        
        // Группируем приборы по категориям
        const groupedDevices = {};
        devices.forEach(device => {
            const category = device.category || 'Без категории';
            if (!groupedDevices[category]) {
                groupedDevices[category] = [];
            }
            groupedDevices[category].push(device);
        });
        
        // Сортируем категории
        const sortedCategories = Object.keys(groupedDevices).sort((a, b) => {
            if (a === 'Без категории') return 1;
            if (b === 'Без категории') return -1;
            return a.localeCompare(b, 'ru');
        });
        
        // Формируем HTML для таблиц по категориям
        let tablesHtml = '';
        
        for (const category of sortedCategories) {
            const categoryDevices = groupedDevices[category];
            
            // Сортируем приборы в категории по наименованию
            categoryDevices.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
            
            let rowsHtml = '';
            categoryDevices.forEach((device, index) => {
                rowsHtml += `
                    <tr>
                        <td style="border: 1px solid #ddd; padding: 8px; text-align: center; width: 5%;">${index + 1}</noscript>
                        <td style="border: 1px solid #ddd; padding: 8px; width: 15%;"><code>${sanitizeString(device.unique_id)}</code></noscript>
                        <td style="border: 1px solid #ddd; padding: 8px; width: 30%;"><strong>${sanitizeString(device.name)}</strong></noscript>
                        <td style="border: 1px solid #ddd; padding: 8px; width: 20%;">${sanitizeString(device.model || '-')}</noscript>
                        <td style="border: 1px solid #ddd; padding: 8px; width: 15%;">${sanitizeString(device.manufacturer || '-')}</noscript>
                        <td style="border: 1px solid #ddd; padding: 8px; text-align: right; width: 15%;"><strong>${(device.price || 0).toFixed(2)} руб.</strong></noscript>
                    </tr>
                `;
            });
            
            tablesHtml += `
                <div class="category-section">
                    <h2 class="category-title">
                        <i class="bi bi-tag"></i> ${sanitizeString(category)}
                    </h2>
                    <table class="price-table">
                        <thead>
                            <tr>
                                <th style="border: 1px solid #2563eb; padding: 10px; background-color: #2563eb; color: white; text-align: center; width: 5%;">№</th>
                                <th style="border: 1px solid #2563eb; padding: 10px; background-color: #2563eb; color: white; text-align: center; width: 15%;">Артикул</th>
                                <th style="border: 1px solid #2563eb; padding: 10px; background-color: #2563eb; color: white; text-align: center; width: 30%;">Наименование</th>
                                <th style="border: 1px solid #2563eb; padding: 10px; background-color: #2563eb; color: white; text-align: center; width: 20%;">Модель</th>
                                <th style="border: 1px solid #2563eb; padding: 10px; background-color: #2563eb; color: white; text-align: center; width: 15%;">Производитель</th>
                                <th style="border: 1px solid #2563eb; padding: 10px; background-color: #2563eb; color: white; text-align: center; width: 15%;">Цена, руб.</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsHtml}
                        </tbody>
                    </table>
                </div>
            `;
        }
        
        // Подсчет общей статистики
        const totalDevices = devices.length;
        const totalCategories = sortedCategories.length;
        const minPrice = Math.min(...devices.map(d => d.price || 0));
        const maxPrice = Math.max(...devices.map(d => d.price || 0));
        const avgPrice = devices.reduce((sum, d) => sum + (d.price || 0), 0) / totalDevices;
        
        const htmlContent = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <title>Прайс-лист НПУП «АТОМТЕХ»</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Times New Roman', Times, serif;
            font-size: 11pt;
            margin: 15mm 10mm;
            line-height: 1.3;
        }
        h1 {
            font-size: 20pt;
            text-align: center;
            font-weight: bold;
            margin-bottom: 10px;
            color: #000000;
        }
        .subtitle {
            text-align: center;
            margin-bottom: 5px;
            color: #555;
            font-size: 11pt;
        }
        .date {
            text-align: center;
            margin-bottom: 20px;
            color: #888;
            font-size: 10pt;
        }
        .stats-grid {
            display: flex;
            gap: 10px;
            margin: 20px 0 25px 0;
            flex-wrap: wrap;
            justify-content: center;
        }
        .stat-card {
            flex: 1;
            min-width: 120px;
            padding: 12px;
            border-radius: 8px;
            text-align: center;
            color: white;
        }
        .stat-card.devices { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        .stat-card.categories { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
        .stat-card.min-price { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
        .stat-card.max-price { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); }
        .stat-card.avg-price { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); }
        .stat-number {
            font-size: 22pt;
            font-weight: bold;
            margin: 5px 0;
        }
        .stat-label {
            font-size: 9pt;
            opacity: 0.9;
        }
        .category-section {
            margin-bottom: 30px;
            page-break-inside: avoid;
        }
        .category-title {
            font-size: 14pt;
            font-weight: bold;
            margin: 15px 0 10px 0;
            padding-bottom: 5px;
            border-bottom: 2px solid #2563eb;
            color: #2563eb;
        }
        .price-table {
            width: 100%;
            border-collapse: collapse;
            margin: 0 0 15px 0;
            font-size: 10pt;
        }
        .price-table th {
            background-color: #2563eb;
            color: white;
            padding: 8px 6px;
            border: 1px solid #1d4ed8;
            font-weight: bold;
            text-align: center;
        }
        .price-table td {
            border: 1px solid #ddd;
            padding: 6px;
            vertical-align: middle;
        }
        .price-table tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        .price-table tr:hover {
            background-color: #f0f0f0;
        }
        code {
            font-family: monospace;
            background-color: #e8e8e8;
            padding: 2px 4px;
            border-radius: 3px;
            font-size: 9pt;
        }
        .footer {
            margin-top: 25px;
            padding-top: 15px;
            border-top: 1px solid #ddd;
            text-align: center;
            font-size: 8pt;
            color: #999;
        }
        @media print {
            body {
                margin: 0;
            }
            .price-table th {
                background-color: #2563eb !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            .stat-card {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
        }
    </style>
</head>
<body>
    <h1>ПРАЙС-ЛИСТ</h1>
    <div class="subtitle">НПУП «АТОМТЕХ»</div>
    <div class="subtitle">Система управления складом</div>
    <div class="date">Дата формирования: ${new Date().toLocaleDateString('ru-RU')}</div>
    
   
    
    ${tablesHtml}
    
    <div class="footer">
        <p>© 2026 НПУП «АТОМТЕХ». Система управления складом.</p>
        <p>Актуальность цен на дату формирования документа. Для получения актуальных цен обращайтесь к менеджерам.</p>
    </div>
</body>
</html>`;
        
        const blob = new Blob([htmlContent], { type: 'application/msword' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `price_list_${new Date().toISOString().split('T')[0]}.doc`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showSuccess('Прайс-лист экспортирован в Word');
    } catch (error) {
        console.error('Ошибка экспорта прайс-листа в Word:', error);
        showError('Ошибка экспорта прайс-листа: ' + error.message);
    }
}

function showEditPriceListModal() {
    fetch(`${API_BASE_URL}/api/devices?pageSize=1000`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
    })
    .then(response => response.json())
    .then(data => {
        if (!data.success) {
            showError('Ошибка загрузки данных');
            return;
        }
        
        let devicesHtml = '';
        data.devices.forEach(device => {
            devicesHtml += `
                <tr>
                    <td><code>${sanitizeString(device.unique_id)}</code></td>
                    <td>${sanitizeString(device.name)}</td>
                    <td>${sanitizeString(device.category || '-')}</td>
                    <td>${sanitizeString(device.model || '-')}</td>
                    <td>
                        <input type="number" class="form-control form-control-sm price-input" 
                               value="${isValidPrice(device.price) ? Number(device.price).toFixed(2) : '0.00'}" 
                               data-id="${device.id}" 
                               data-unique-id="${sanitizeString(device.unique_id)}"
                               data-name="${sanitizeString(device.name)}"
                               data-category="${sanitizeString(device.category || '')}"
                               data-manufacturer="${sanitizeString(device.manufacturer || 'НПУП «АТОМТЕХ»')}"
                               data-model="${sanitizeString(device.model || '')}"
                               data-quantity="${device.quantity || 0}"
                               data-min-quantity="${device.min_quantity || 5}"
                               data-location="${sanitizeString(device.location || '')}"
                               data-shelf="${sanitizeString(device.shelf || '')}"
                               min="0" step="0.01" max="9999999.99" style="width: 120px;"
                               oninput="validatePriceInput(this)">
                    </td>
                </tr>
            `;
        });
        
        const modalHtml = `
        <div class="modal fade" id="editPriceListModal" tabindex="-1">
            <div class="modal-dialog modal-xl">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title">Редактирование прайс-листа</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                       
                        <div class="table-responsive" style="max-height: 60vh;">
                            <table class="table table-hover">
                                <thead>
                                    <tr>
                                        <th>Артикул</th>
                                        <th>Наименование</th>
                                        <th>Категория</th>
                                        <th>Модель</th>
                                        <th>Цена (руб.)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${devicesHtml}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Отмена</button>
                        <button type="button" class="btn btn-success" onclick="savePriceListChanges()">
                            <i class="bi bi-save"></i> Сохранить изменения
                        </button>
                    </div>
                </div>
            </div>
        </div>
        `;
        
        const oldModal = document.getElementById('editPriceListModal');
        if (oldModal) oldModal.remove();
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        const modal = new bootstrap.Modal(document.getElementById('editPriceListModal'));
        modal.show();
    })
    .catch(error => {
        console.error('Ошибка загрузки данных:', error);
        showError('Ошибка загрузки данных');
    });
}

function validatePriceInput(input) {
    let value = input.value.replace(',', '.');
    
    value = value.replace(/[^\d.]/g, '');
    
    const parts = value.split('.');
    if (parts.length > 2) {
        value = parts[0] + '.' + parts.slice(1).join('');
    }
    
    if (parts.length === 2 && parts[1].length > 2) {
        value = parts[0] + '.' + parts[1].substring(0, 2);
    }
    
    const num = parseFloat(value);
    if (!isNaN(num) && num > 9999999.99) {
        value = '9999999.99';
    }
    
    input.value = value;
}

async function savePriceListChanges() {
    const priceInputs = document.querySelectorAll('.price-input');
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    for (const input of priceInputs) {
        const value = input.value.trim();
        if (value === '') {
            errors.push(`Цена для прибора ${input.dataset.uniqueId} не может быть пустой`);
            input.classList.add('is-invalid');
        } else if (!isValidPrice(value)) {
            errors.push(`Некорректная цена для прибора ${input.dataset.uniqueId}`);
            input.classList.add('is-invalid');
        } else {
            input.classList.remove('is-invalid');
        }
    }
    
    if (errors.length > 0) {
        showError('Ошибки в данных:\n' + errors.join('\n'));
        return;
    }
    
    const btn = document.querySelector('#editPriceListModal .btn-success');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Сохранение...';
    
    try {
        for (const input of priceInputs) {
            const deviceId = input.dataset.id;
            const newPrice = parseFloat(input.value) || 0;
            
            try {
                const deviceResponse = await fetch(`${API_BASE_URL}/api/devices/${deviceId}`, {
                    headers: { 'Authorization': `Bearer ${authToken}` }
                });
                
                if (!deviceResponse.ok) {
                    errorCount++;
                    continue;
                }
                
                const deviceData = await deviceResponse.json();
                
                if (!deviceData.success) {
                    errorCount++;
                    continue;
                }
                
                const device = deviceData.device;
                
                const updateData = {
                    unique_id: device.unique_id,
                    name: device.name,
                    category: device.category,
                    description: device.description,
                    manufacturer: device.manufacturer,
                    model: device.model,
                    price: newPrice,
                    specifications: device.specifications,
                    quantity: device.quantity,
                    min_quantity: device.min_quantity,
                    location: device.location,
                    shelf: device.shelf,
                    stock_notes: device.stock_notes
                };
                
                const updateResponse = await fetch(`${API_BASE_URL}/api/devices/${deviceId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: JSON.stringify(updateData)
                });
                
                const result = await updateResponse.json();
                
                if (result.success) {
                    successCount++;
                } else {
                    errorCount++;
                }
            } catch (err) {
                console.error('Ошибка обновления цены для прибора', deviceId, err);
                errorCount++;
            }
            
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('editPriceListModal'));
        if (modal) modal.hide();
        
        if (errorCount === 0) {
            showSuccess(` Все цены успешно обновлены (${successCount} приборов)`);
        } else {
            showWarning(`Обновлено ${successCount} цен, ошибок: ${errorCount}`);
        }
        
        loadPriceList();
        
    } catch (error) {
        console.error('Ошибка сохранения цен:', error);
        showError('❌ Ошибка при сохранении цен: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}


async function loadDevices(page = 1) {
    if (!authToken) return;
    
    document.getElementById('page-title').textContent = 'Управление сведениями о приборах';
    document.getElementById('page-actions').innerHTML = userPermissions?.role === 'admin' ? `
        <button class="btn btn-success btn-sm" onclick="showAddDeviceModal()">
            <i class="bi bi-plus"></i> Добавить сведения о новом приборе
        </button>
    ` : '';
    
    // Скрытые поля для хранения значений фильтров (используются в applyFilters)
    // Если их нет - создаем
    if (!document.getElementById('categoryFilter')) {
        const hiddenDiv = document.createElement('div');
        hiddenDiv.style.display = 'none';
        hiddenDiv.innerHTML = `
            <input type="hidden" id="categoryFilter" value="all">
            <input type="hidden" id="stockStatusFilter" value="all">
            <input type="hidden" id="sortByFilter" value="name_asc">
            <input type="hidden" id="priceMin">
            <input type="hidden" id="priceMax">
        `;
        document.body.appendChild(hiddenDiv);
    }
    
    // Отображаем компактную панель с поиском и кнопкой фильтров
    document.getElementById('content').innerHTML = `
        <div class="card mb-3">
            <div class="card-body py-2">
                <div class="row g-2 align-items-center">
                    <div class="col-md-5">
                        <div class="input-group">
                            <input type="text" class="form-control" id="searchInput" 
                                   placeholder="Поиск по названию, артикулу, модели..." 
                                   autocomplete="off"
                                   onkeyup="applyFiltersDebounced()">
                            <button class="btn btn-outline-secondary" type="button" onclick="resetSearch()" title="Очистить">
                                <i class="bi bi-x-lg"></i>
                            </button>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <button class="btn btn-primary" onclick="showFiltersModal()">
                            <i class="bi bi-funnel"></i> Фильтры
                            <span id="activeFiltersBadge" class="badge bg-danger ms-1" style="display: none;">0</span>
                        </button>
                        <button class="btn btn-secondary ms-2" onclick="resetFilters()" title="Сбросить все фильтры">
                            <i class="bi bi-eraser"></i>
                        </button>
                    </div>
                    <div class="col-md-4 text-end">
                        <span class="text-muted" id="filterStats"></span>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Карточка с таблицей приборов -->
<div class="card mt-3">
    <div class="card-header">
        <h5 class="mb-0">Список приборов</h5>
    </div>
    <div class="card-body">
        <div class="table-responsive">
            <table class="table table-hover mb-0" id="devicesTable">
                <thead>
                    <tr>
                        <th>Артикул</th>
                        <th>Наименование</th>
                        <th>Категория</th>
                        <th>Цена</th>
                        <th>Количество (шт.)</th>
                        <th>Статус</th>
                        <th style="width: 100px;">Действия</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td colspan="7" class="text-center"><div class="spinner-border spinner-border-sm"></div> Загрузка...</td></tr>
                </tbody>
            </table>
        </div>
        <div id="paginationContainer" class="mt-3"></div>
    </div>
</div>
    `;
    
    // Загружаем категории для фильтра
    await loadCategoriesForFilter();
    
    // Обновляем бейдж активных фильтров
    updateActiveFiltersBadge();
    
    // Загружаем данные
    await applyFilters(page);
}

// Загрузка категорий для фильтра (для обратной совместимости)
async function loadCategoriesForFilter() {
    // Эта функция больше не нужна, так как категории загружаются прямо в модальном окне
    // Оставляем пустую для совместимости
    console.log('loadCategoriesForFilter вызвана (заглушка)');
}

// Показать модальное окно с фильтрами
async function showFiltersModal() {
    // Получаем текущие значения фильтров из скрытых полей
    const currentCategory = document.getElementById('categoryFilter')?.value || 'all';
    const currentStockStatus = document.getElementById('stockStatusFilter')?.value || 'all';
    const currentSortBy = document.getElementById('sortByFilter')?.value || 'name_asc';
    const currentPriceMin = document.getElementById('priceMin')?.value || '';
    const currentPriceMax = document.getElementById('priceMax')?.value || '';
    
    // Загружаем категории для модального окна
    let categoryOptions = '<option value="all">Все категории</option>';
    try {
        const response = await fetch(`${API_BASE_URL}/api/categories`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await response.json();
        if (data.success && data.categories) {
            const sortedCategories = [...data.categories].sort((a, b) => a.localeCompare(b, 'ru'));
            sortedCategories.forEach(c => {
                if (c && c.trim()) {
                    const selected = currentCategory === c ? 'selected' : '';
                    categoryOptions += `<option value="${sanitizeString(c)}" ${selected}>${sanitizeString(c)}</option>`;
                }
            });
        }
    } catch (error) {
        console.error('Ошибка загрузки категорий:', error);
    }
    
    const modalHtml = `
        <div class="modal fade" id="filtersModal" tabindex="-1" data-bs-backdrop="static">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title">
                            <i class="bi bi-funnel"></i> Фильтры и сортировка
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <!-- Категория -->
                        <div class="mb-3">
                            <label class="form-label fw-bold">Категория</label>
                            <select class="form-select" id="filterCategory">
                                ${categoryOptions}
                            </select>
                        </div>
                        
                        <!-- Статус наличия -->
                        <div class="mb-3">
                            <label class="form-label fw-bold">Наличие на складе</label>
                            <select class="form-select" id="filterStockStatus">
                                <option value="all" ${currentStockStatus === 'all' ? 'selected' : ''}>Все</option>
                                <option value="in_stock" ${currentStockStatus === 'in_stock' ? 'selected' : ''}>В наличии (> мин. запаса)</option>
                                <option value="low_stock" ${currentStockStatus === 'low_stock' ? 'selected' : ''}>Мало (≤ мин. запаса)</option>
                                <option value="out_of_stock" ${currentStockStatus === 'out_of_stock' ? 'selected' : ''}>Нет в наличии (=0)</option>
                            </select>
                        </div>
                        
                        <!-- Диапазон цен -->
                        <div class="mb-3">
                            <label class="form-label fw-bold">Диапазон цен (руб.)</label>
                            <div class="row g-2">
                                <div class="col-6">
                                    <input type="number" class="form-control" id="filterPriceMin" 
                                           placeholder="Цена от" min="0" step="100" value="${currentPriceMin}">
                                </div>
                                <div class="col-6">
                                    <input type="number" class="form-control" id="filterPriceMax" 
                                           placeholder="Цена до" min="0" step="100" value="${currentPriceMax}">
                                </div>
                            </div>
                        </div>
                        
                        <!-- Сортировка -->
                        <div class="mb-3">
                            <label class="form-label fw-bold">Сортировка</label>
                            <select class="form-select" id="filterSortBy">
                                <option value="name_asc" ${currentSortBy === 'name_asc' ? 'selected' : ''}>Название (А-Я)</option>
                                <option value="name_desc" ${currentSortBy === 'name_desc' ? 'selected' : ''}>Название (Я-А)</option>
                                <option value="price_asc" ${currentSortBy === 'price_asc' ? 'selected' : ''}>Цена (сначала дешевые)</option>
                                <option value="price_desc" ${currentSortBy === 'price_desc' ? 'selected' : ''}>Цена (сначала дорогие)</option>
                                <option value="quantity_asc" ${currentSortBy === 'quantity_asc' ? 'selected' : ''}>Количество (по возрастанию)</option>
                                <option value="quantity_desc" ${currentSortBy === 'quantity_desc' ? 'selected' : ''}>Количество (по убыванию)</option>
                                <option value="created_desc" ${currentSortBy === 'created_desc' ? 'selected' : ''}>Новые сначала</option>
                            </select>
                        </div>
                        
                        <hr>
                        
                        <div class="d-flex justify-content-between">
                            <button type="button" class="btn btn-secondary" onclick="resetFiltersAndCloseModal()">
                                <i class="bi bi-eraser"></i> Сбросить все
                            </button>
                            <div>
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Отмена</button>
                                <button type="button" class="btn btn-primary" onclick="applyFiltersFromModal()">
                                    <i class="bi bi-check-lg"></i> Применить
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Удаляем старый модал, если есть
    const oldModal = document.getElementById('filtersModal');
    if (oldModal) oldModal.remove();
    
    // Добавляем новый модал
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Показываем модальное окно
    const modal = new bootstrap.Modal(document.getElementById('filtersModal'));
    modal.show();
}

// Применить фильтры из модального окна
function applyFiltersFromModal() {
    // Получаем значения из модального окна
    const category = document.getElementById('filterCategory')?.value || 'all';
    const stockStatus = document.getElementById('filterStockStatus')?.value || 'all';
    const sortBy = document.getElementById('filterSortBy')?.value || 'name_asc';
    const priceMin = document.getElementById('filterPriceMin')?.value || '';
    const priceMax = document.getElementById('filterPriceMax')?.value || '';
    
    // Обновляем скрытые поля фильтров
    const categoryFilter = document.getElementById('categoryFilter');
    const stockStatusFilter = document.getElementById('stockStatusFilter');
    const sortByFilter = document.getElementById('sortByFilter');
    const priceMinInput = document.getElementById('priceMin');
    const priceMaxInput = document.getElementById('priceMax');
    
    if (categoryFilter) categoryFilter.value = category;
    if (stockStatusFilter) stockStatusFilter.value = stockStatus;
    if (sortByFilter) sortByFilter.value = sortBy;
    if (priceMinInput) priceMinInput.value = priceMin;
    if (priceMaxInput) priceMaxInput.value = priceMax;
    
    // Закрываем модальное окно
    const modal = bootstrap.Modal.getInstance(document.getElementById('filtersModal'));
    if (modal) modal.hide();
    
    // Обновляем бейдж активных фильтров
    updateActiveFiltersBadge();
    
    // Применяем фильтры
    applyFilters(1);
    
}

// Сброс фильтров и закрытие модального окна
function resetFiltersAndCloseModal() {
    // Сбрасываем значения в модальном окне
    const categorySelect = document.getElementById('filterCategory');
    const stockSelect = document.getElementById('filterStockStatus');
    const sortSelect = document.getElementById('filterSortBy');
    const priceMin = document.getElementById('filterPriceMin');
    const priceMax = document.getElementById('filterPriceMax');
    
    if (categorySelect) categorySelect.value = 'all';
    if (stockSelect) stockSelect.value = 'all';
    if (sortSelect) sortSelect.value = 'name_asc';
    if (priceMin) priceMin.value = '';
    if (priceMax) priceMax.value = '';
    
    // Обновляем скрытые поля
    const categoryFilter = document.getElementById('categoryFilter');
    const stockStatusFilter = document.getElementById('stockStatusFilter');
    const sortByFilter = document.getElementById('sortByFilter');
    const priceMinInput = document.getElementById('priceMin');
    const priceMaxInput = document.getElementById('priceMax');
    
    if (categoryFilter) categoryFilter.value = 'all';
    if (stockStatusFilter) stockStatusFilter.value = 'all';
    if (sortByFilter) sortByFilter.value = 'name_asc';
    if (priceMinInput) priceMinInput.value = '';
    if (priceMaxInput) priceMaxInput.value = '';
    
    // Закрываем модальное окно
    const modal = bootstrap.Modal.getInstance(document.getElementById('filtersModal'));
    if (modal) modal.hide();
    
    // Обновляем бейдж
    updateActiveFiltersBadge();
    
    // Применяем сброшенные фильтры
    applyFilters(1);
    
    showSuccess('🧹 Все фильтры сброшены');
}

// Обновление бейджа с количеством активных фильтров
function updateActiveFiltersBadge() {
    const category = document.getElementById('categoryFilter')?.value || 'all';
    const stockStatus = document.getElementById('stockStatusFilter')?.value || 'all';
    const priceMin = document.getElementById('priceMin')?.value || '';
    const priceMax = document.getElementById('priceMax')?.value || '';
    
    let activeCount = 0;
    if (category !== 'all') activeCount++;
    if (stockStatus !== 'all') activeCount++;
    if (priceMin || priceMax) activeCount++;
    
    const badge = document.getElementById('activeFiltersBadge');
    if (badge) {
        if (activeCount > 0) {
            badge.textContent = activeCount;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    }
}

// Сброс поиска
function resetSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = '';
        applyFiltersDebounced();
    }
}

// Загрузка данных для фильтров (категории, диапазон цен)
async function loadFilterData() {
    console.log('🔄 Загрузка данных для фильтров...');
    
    try {
        // Загружаем категории
        console.log('📡 Запрос категорий...');
        const categoriesResponse = await fetch(`${API_BASE_URL}/api/categories`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        console.log('📡 Ответ по категориям:', categoriesResponse.status);
        const categoriesData = await categoriesResponse.json();
        console.log('📦 Данные категорий:', categoriesData);
        
        if (categoriesData.success && categoriesData.categories) {
            const categorySelect = document.getElementById('categoryFilter');
            console.log('🔍 Найден select для категорий:', categorySelect);
            
            if (categorySelect) {
                let options = '<option value="all">Все категории</option>';
                // Сортируем категории для удобства
                const sortedCategories = [...categoriesData.categories].sort((a, b) => 
                    a.localeCompare(b, 'ru')
                );
                console.log('📋 Отсортированные категории:', sortedCategories);
                
                sortedCategories.forEach(c => {
                    if (c && c.trim()) {
                        options += `<option value="${sanitizeString(c)}">${sanitizeString(c)}</option>`;
                    }
                });
                categorySelect.innerHTML = options;
                console.log('Категории загружены, всего:', sortedCategories.length);
            } else {
                console.error('Элемент categoryFilter не найден в DOM');
            }
        } else {
            console.error('Ошибка в данных категорий:', categoriesData);
        }
        
        // Загружаем диапазон цен (для подсказки)
        console.log('📡 Запрос диапазона цен...');
        const priceRangeResponse = await fetch(`${API_BASE_URL}/api/price-range`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const priceRangeData = await priceRangeResponse.json();
        console.log('📦 Данные цен:', priceRangeData);
        
        if (priceRangeData.success) {
            const priceMinInput = document.getElementById('priceMin');
            const priceMaxInput = document.getElementById('priceMax');
            
            if (priceMinInput) {
                priceMinInput.placeholder = `от ${Math.floor(priceRangeData.minPrice)}`;
                console.log('✅ Установлен placeholder для min цены');
            }
            if (priceMaxInput) {
                priceMaxInput.placeholder = `до ${Math.ceil(priceRangeData.maxPrice)}`;
                console.log('✅ Установлен placeholder для max цены');
            }
        }
        
    } catch (error) {
        console.error('❌ Ошибка загрузки данных для фильтров:', error);
        showError('Ошибка загрузки категорий: ' + error.message);
    }
}

// Debounce для поиска (чтобы не делать запрос при каждом нажатии)
let searchTimeout;

function applyFiltersDebounced() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        applyFilters(1);
    }, 500);
}

// Основная функция применения фильтров
async function applyFilters(page = 1) {
    if (!authToken) return;
    
    // Обновляем бейдж активных фильтров
    updateActiveFiltersBadge();
    
    // Собираем значения фильтров
    const search = document.getElementById('searchInput')?.value || '';
    const category = document.getElementById('categoryFilter')?.value || 'all';
    const stockStatus = document.getElementById('stockStatusFilter')?.value || 'all';
    const sortByRaw = document.getElementById('sortByFilter')?.value || 'name_asc';
    const priceMin = document.getElementById('priceMin')?.value || '';
    const priceMax = document.getElementById('priceMax')?.value || '';
    
    // Преобразуем sortBy в параметры для API
    let sortBy = 'name';
    let sortOrder = 'ASC';
    
    switch(sortByRaw) {
        case 'name_asc': sortBy = 'name'; sortOrder = 'ASC'; break;
        case 'name_desc': sortBy = 'name'; sortOrder = 'DESC'; break;
        case 'price_asc': sortBy = 'price'; sortOrder = 'ASC'; break;
        case 'price_desc': sortBy = 'price'; sortOrder = 'DESC'; break;
        case 'quantity_asc': sortBy = 'quantity'; sortOrder = 'ASC'; break;
        case 'quantity_desc': sortBy = 'quantity'; sortOrder = 'DESC'; break;
        case 'created_desc': sortBy = 'created_at'; sortOrder = 'DESC'; break;
        default: sortBy = 'name'; sortOrder = 'ASC';
    }
    
    // Показываем индикатор загрузки
    const tbody = document.querySelector('#devicesTable tbody');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center"><div class="spinner-border spinner-border-sm"></div> Загрузка...</td></tr>';
    }
    
    try {
        // Строим URL с параметрами
        let url = `${API_BASE_URL}/api/devices?page=${page}&pageSize=50&sortBy=${sortBy}&sortOrder=${sortOrder}`;
        
        if (search) url += `&search=${encodeURIComponent(search)}`;
        if (category && category !== 'all') url += `&category=${encodeURIComponent(category)}`;
        if (stockStatus && stockStatus !== 'all') url += `&stockStatus=${stockStatus}`;
        if (priceMin && !isNaN(parseFloat(priceMin))) url += `&minPrice=${parseFloat(priceMin)}`;
        if (priceMax && !isNaN(parseFloat(priceMax))) url += `&maxPrice=${parseFloat(priceMax)}`;
        
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            updateDevicesTable(data, page);
            updatePagination(data, page);
            updateFilterStats(data);
        } else {
            throw new Error(data.message || 'Ошибка загрузки');
        }
    } catch (error) {
        console.error('Ошибка применения фильтров:', error);
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Ошибка загрузки данных</td></tr>';
        }
        showError('Ошибка загрузки данных: ' + error.message);
    }
}

// Обновление таблицы с приборами
function updateDevicesTable(data, currentPage) {
    const tbody = document.querySelector('#devicesTable tbody');
    if (!tbody) return;
    
    let html = '';
    
    if (data.devices && data.devices.length > 0) {
        data.devices.forEach(d => {
            const statusClass = d.quantity === 0 ? 'badge-out-of-stock' :
                              d.quantity <= d.min_quantity ? 'badge-low-stock' : 'badge-in-stock';
            const statusText = d.quantity === 0 ? 'Нет' :
                             d.quantity <= d.min_quantity ? 'Мало' : 'Есть';
            
            html += `
                <tr>
                    <td><code>${sanitizeString(d.unique_id)}</code></td>
                    <td><strong>${sanitizeString(d.name)}</strong><br><small class="text-muted">${sanitizeString(d.model || '')}</small></td>
                    <td>${sanitizeString(d.category || '-')}</td>
                    <td class="text-end">${d.price ? Number(d.price).toFixed(2) : '0.00'} руб.</td>
                    <td class="text-center fw-bold">${d.quantity}</td>
                    <td><span class="badge ${statusClass}">${statusText}</span></td>
                    <td>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-info" onclick="viewDevice(${d.id})" title="Просмотр">
                                <i class="bi bi-eye"></i>
                            </button>
                            ${userPermissions?.role === 'admin' ? `
                            <button class="btn btn-outline-primary" onclick="showEditDeviceModal(${d.id})" title="Редактировать">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-outline-danger" onclick="deleteDevice(${d.id})" title="Архивировать">
                                        <i class="bi bi-archive"></i>
                                    </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `;
        });
    } else {
        html = '<tr><td colspan="7" class="text-center text-muted">🔍 Ничего не найдено. Попробуйте изменить параметры поиска.</td></tr>';
    }
    
    tbody.innerHTML = html;
}

// Обновление пагинации
function updatePagination(data, currentPage) {
    const container = document.getElementById('paginationContainer');
    if (!container) return;
    
    const totalPages = Math.ceil((data.total || 0) / (data.pageSize || 50));
    
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let html = '<nav><ul class="pagination justify-content-center">';
    
    // Кнопка "Первая"
    html += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="applyFilters(1)">« Первая</a>
    </li>`;
    
    // Кнопка "Предыдущая"
    html += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="applyFilters(${currentPage - 1})">‹ Назад</a>
    </li>`;
    
    // Номера страниц (показываем максимум 5)
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    
    if (endPage - startPage < 4) {
        startPage = Math.max(1, endPage - 4);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        html += `<li class="page-item ${i === currentPage ? 'active' : ''}">
            <a class="page-link" href="#" onclick="applyFilters(${i})">${i}</a>
        </li>`;
    }
    
    // Кнопка "Следующая"
    html += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="applyFilters(${currentPage + 1})">Вперед ›</a>
    </li>`;
    
    // Кнопка "Последняя"
    html += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="applyFilters(${totalPages})">Последняя »</a>
    </li>`;
    
    html += '</ul></nav>';
    
    container.innerHTML = html;
}

// Обновление статистики фильтрации
function updateFilterStats(data) {
    const container = document.getElementById('filterStats');
    if (!container) return;
    
    const total = data.total || 0;
    const shown = data.devices?.length || 0;
    
    if (total > 0) {
        container.innerHTML = `<i class="bi bi-database"></i> Найдено: ${total} приборов`;
    } else {
        container.innerHTML = `<i class="bi bi-search"></i> Ничего не найдено`;
    }
}

// Сброс всех фильтров
function resetFilters() {
    // Очищаем все поля фильтров
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const stockStatusFilter = document.getElementById('stockStatusFilter');
    const sortByFilter = document.getElementById('sortByFilter');
    const priceMin = document.getElementById('priceMin');
    const priceMax = document.getElementById('priceMax');
    
    if (searchInput) searchInput.value = '';
    if (categoryFilter) categoryFilter.value = 'all';
    if (stockStatusFilter) stockStatusFilter.value = 'all';
    if (sortByFilter) sortByFilter.value = 'name_asc';
    if (priceMin) priceMin.value = '';
    if (priceMax) priceMax.value = '';
    
    // Обновляем бейдж
    updateActiveFiltersBadge();
    
    // Применяем сброшенные фильтры
    applyFilters(1);
    
}



async function viewDevice(deviceId) {
    currentDeviceId = deviceId;
    
    document.getElementById('page-title').textContent = 'Детали прибора';
    document.getElementById('page-actions').innerHTML = `
        <button class="btn btn-secondary btn-sm" onclick="loadDevices()">
            <i class="bi bi-arrow-left"></i> Назад
        </button>
    `;
    
    document.getElementById('content').innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border" style="color: var(--accent);"></div>
            <p class="mt-3">Загрузка данных...</p>
        </div>
    `;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/devices/${deviceId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            const device = data.device;
            
            let imagesData = { success: false, images: [] };
            try {
                const imagesResponse = await fetch(`${API_BASE_URL}/api/devices/${deviceId}/images`, {
                    headers: { 'Authorization': `Bearer ${authToken}` }
                });
                if (imagesResponse.ok) {
                    imagesData = await imagesResponse.json();
                }
            } catch (error) {
                console.error('Ошибка загрузки галереи:', error);
                imagesData = { success: false, images: [] };
            }
            
            let pdfProspectHtml = '';
            let galleryHtml = '';
            
            if (imagesData.success && imagesData.images && imagesData.images.length > 0) {
                imagesData.images.forEach(img => {
                    const isPdf = img.is_pdf;
                    const imageUrl = `${API_BASE_URL}/api/images/${img.id}`;
                    
                    const deleteButton = userPermissions?.role === 'admin' 
                        ? `<button class="btn btn-sm btn-outline-danger mt-2" onclick="deleteImage(${img.id})">
                             <i class="bi bi-trash"></i> Удалить
                           </button>`
                        : '';
                    
                    const imageCard = `
                        <div class="col-md-4 mb-3">
                            <div class="card h-100">
                                <div class="card-img-top" style="height: 150px; overflow: hidden; cursor: pointer;" onclick="showGallery(${deviceId}, ${img.id})">
                                    ${isPdf ? `
                                        <div class="d-flex align-items-center justify-content-center h-100 bg-secondary bg-opacity-25">
                                            <i class="bi bi-file-pdf" style="font-size: 3rem; color: #dc3545;"></i>
                                        </div>
                                    ` : `
                                        <img src="${imageUrl}" style="width: 100%; height: 100%; object-fit: cover;" alt="${sanitizeString(img.description || img.image_name)}">
                                    `}
                                </div>
                                <div class="card-body p-2 text-center">
                                    <p class="small text-muted mb-1">${sanitizeString(img.description || '')}</p>
                                    ${deleteButton}
                                </div>
                            </div>
                        </div>
                    `;
                    
                    if (userPermissions?.role === 'admin') {
                        if (img.image_type === 'prospect_pdf' || (img.image_type === 'prospect' && isPdf)) {
                            pdfProspectHtml += imageCard;
                        } else {
                            galleryHtml += imageCard;
                        }
                    }
                });
            }
            
            const addButtonsHtml = userPermissions?.role === 'admin' ? `
                <div class="row mb-4">
                    <div class="col-12">
                        <div class="btn-group">
                            <button class="btn btn-primary" onclick="showUploadImageModal(${device.id}, 'gallery')">
                                <i class="bi bi-plus-circle"></i> Добавить фото в галерею
                            </button>
                            <button class="btn btn-success" onclick="showUploadImageModal(${device.id}, 'prospect')">
                                <i class="bi bi-plus-circle"></i> Добавить рекламный проспект
                            </button>
                        </div>
                    </div>
                </div>
            ` : '';
            
            const filesSectionHtml = userPermissions?.role === 'admin' ? `
                <div class="card mb-4">
                    <div class="card-header">
                        <h5 class="mb-0">Рекламный проспект</h5>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            ${pdfProspectHtml || '<p class="text-muted">Нет рекламного проспекта</p>'}
                        </div>
                    </div>
                </div>
                
                <div class="card mb-4">
                    <div class="card-header">
                        <h5 class="mb-0">Галерея</h5>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            ${galleryHtml || '<p class="text-muted">Нет фотографий в галерее</p>'}
                        </div>
                    </div>
                </div>
            ` : '';
            
            const galleryButtonHtml = imagesData.images && imagesData.images.length > 0 ? `
            <div class="card mb-4">
                <div class="card-body text-center">
                    <button class="btn btn-outline-info w-100" onclick="showGallery(${device.id}, ${imagesData.images[0].id})">
                        <i class="bi bi-images"></i> Открыть всю галерею (${imagesData.images.length})
                    </button>
                </div>
            </div>
            ` : '';
            
            document.getElementById('content').innerHTML = `
                <div class="row">
                    <div class="col-md-8">
                        <div class="card mb-4">
                            <div class="card-header">
                                <h5 class="mb-0">${sanitizeString(device.name)}</h5>
                            </div>
                            <div class="card-body">
                                <div class="row">
                                    <div class="col-md-6">
                                        <p><strong>Артикул:</strong> <code>${sanitizeString(device.unique_id)}</code></p>
                                        <p><strong>Категория:</strong> ${sanitizeString(device.category || '-')}</p>
                                        <p><strong>Производитель:</strong> ${sanitizeString(device.manufacturer || '-')}</p>
                                        <p><strong>Модель:</strong> ${sanitizeString(device.model || '-')}</p>
                                        <p><strong>Цена:</strong> ${isValidPrice(device.price) ? Number(device.price).toFixed(2) : '0'} руб.</p>
                                    </div>
                                    <div class="col-md-6">
                                        <p><strong>Количество:</strong> 
                                            <span class="${device.quantity === 0 ? 'text-danger' : device.quantity <= device.min_quantity ? 'text-warning' : 'text-success'} fw-bold">
                                                ${device.quantity} шт.
                                            </span>
                                        </p>
                                        <p><strong>Минимальный запас:</strong> ${device.min_quantity} шт.</p>
                                    <p><strong>Местоположение:</strong> ${sanitizeString(device.location || 'Не указано')}</p>                        
                                    </div>
                                </div>
                                <p><strong>Описание:</strong> ${sanitizeString(device.description || '-')}</p>
                                <p><strong>Примечания:</strong> ${sanitizeString(device.stock_notes || '-')}</p>
                            </div>
                        </div>
                        
                        <div class="card mb-4">
                            <div class="card-header">
                                <h5 class="mb-0">История движений</h5>
                            </div>
                            <div class="card-body" id="movementsList">
                                <div class="text-center">
                                    <div class="spinner-border spinner-border-sm"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-md-4">
                        ${addButtonsHtml}
                        
                        ${filesSectionHtml}
                        
                        ${galleryButtonHtml}
                        
                        <div class="card mt-4">
                            <div class="card-header">
                                <h5 class="mb-0">Действия</h5>
                            </div>
                            <div class="card-body">
                                <button class="btn btn-warning w-100 mb-2" onclick="showIssueModal(${device.id}, '${sanitizeString(device.name)}')">
                                    <i class="bi bi-dash-circle"></i> Списание
                                </button>
                                ${userPermissions?.role === 'admin' ? `
                                <button class="btn btn-primary w-100 mb-2" onclick="showEditDeviceModal(${device.id})">
                                    <i class="bi bi-pencil"></i> Редактировать
                                </button>
                                <button class="btn btn-danger w-100 mb-2" onclick="deleteDevice(${device.id})">
                                    <i class="bi bi-trash"></i> Удалить
                                </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            loadMovements(deviceId);
        }
    } catch (error) {
        console.error('Ошибка загрузки прибора:', error);
        showError('Ошибка загрузки данных прибора');
    }
}

async function loadMovements(deviceId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/devices/${deviceId}/movements`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            let html = '<div class="table-responsive"><table class="table table-sm">';
            html += '<thead><tr><th>Дата</th><th>Тип</th><th>Изменение</th><th>Остаток</th><th>Кто</th></tr></thead><tbody>';
            
            if (data.movements && data.movements.length > 0) {
                data.movements.forEach(m => {
                    const changeClass = m.quantity_change > 0 ? 'text-success' : 'text-danger';
                    // Форматируем дату без времени
                    const formattedDate = new Date(m.movement_date).toLocaleDateString('ru-RU');
                    
                    html += `
                        <tr>
                            <td>${formattedDate}</noscript>
                            <td>${escapeHtml(m.movement_type || '')}</noscript>
                            <td class="${changeClass}">${m.quantity_change > 0 ? '+' : ''}${m.quantity_change || 0}</noscript>
                            <td>${m.new_quantity || 0}</noscript>
                            <td>${escapeHtml(m.performed_by_name || '-')}</noscript>
                        </tr>
                    `;
                });
            } else {
                html += '<tr><td colspan="5" class="text-center">Нет движений</noscript>';
            }
            
            html += '</tbody></table></div>';
            document.getElementById('movementsList').innerHTML = html;
        }
    } catch (error) {
        console.error('Ошибка загрузки движений:', error);
        document.getElementById('movementsList').innerHTML = '<div class="alert alert-danger">Ошибка загрузки истории движений</div>';
    }
}


function showGallery(deviceId, startImageId) {
    fetch(`${API_BASE_URL}/api/devices/${deviceId}/gallery?limit=100`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.success && data.images && data.images.length > 0) {
            currentGalleryImages = data.images;
            
            currentGalleryIndex = currentGalleryImages.findIndex(img => img.id === startImageId);
            if (currentGalleryIndex === -1) currentGalleryIndex = 0;
            
            showGalleryModal();
        } else {
            showInfo('Нет файлов для отображения');
        }
    })
    .catch(error => {
        console.error('Ошибка загрузки галереи:', error);
        showError('Ошибка загрузки галереи: ' + error.message);
    });
}

function showGalleryModal() {
    const modalHtml = `
    <div class="modal fade" id="galleryModal" tabindex="-1" data-bs-backdrop="static">
        <div class="modal-dialog modal-xl modal-dialog-centered">
            <div class="modal-content bg-dark">
                <div class="modal-header border-secondary">
                    <h5 class="modal-title text-white">
                        <span id="galleryCounter">${currentGalleryIndex + 1} / ${currentGalleryImages.length}</span>
                        <span id="galleryType" class="ms-2 badge bg-info"></span>
                    </h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body p-0" style="min-height: 70vh; display: flex; align-items: center; justify-content: center; background-color: #000;">
                    <div id="galleryContent" class="text-center w-100">
                        <div class="spinner-border text-light" role="status">
                            <span class="visually-hidden">Загрузка...</span>
                        </div>
                    </div>
                </div>
                <div class="modal-footer border-secondary d-flex justify-content-between">
                    <div>
                        <span id="galleryDescription" class="text-white-50"></span>
                    </div>
                    <div class="btn-group">
                        <button class="btn btn-outline-light" onclick="previousGalleryImage()" ${currentGalleryImages.length <= 1 ? 'disabled' : ''}>
                            <i class="bi bi-chevron-left"></i> Назад
                        </button>
                        <button class="btn btn-outline-light" onclick="nextGalleryImage()" ${currentGalleryImages.length <= 1 ? 'disabled' : ''}>
                            Вперед <i class="bi bi-chevron-right"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `;
    
    const oldModal = document.getElementById('galleryModal');
    if (oldModal) oldModal.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    const modal = new bootstrap.Modal(document.getElementById('galleryModal'));
    modal.show();
    
    loadGalleryImage(currentGalleryIndex);
}

function loadGalleryImage(index) {
    if (index < 0 || index >= currentGalleryImages.length) return;
    
    const image = currentGalleryImages[index];
    const content = document.getElementById('galleryContent');
    const counter = document.getElementById('galleryCounter');
    const typeSpan = document.getElementById('galleryType');
    const description = document.getElementById('galleryDescription');
    
    counter.textContent = `${index + 1} / ${currentGalleryImages.length}`;
    typeSpan.textContent = image.type_name;
    description.textContent = sanitizeString(image.description || '');
    
    if (image.is_pdf) {
        content.innerHTML = `
            <iframe src="${API_BASE_URL}/api/images/${image.id}" 
                    style="width: 100%; height: 70vh; border: none;" 
                    allowfullscreen>
            </iframe>
        `;
    } else {
        content.innerHTML = `
            <img src="${API_BASE_URL}/api/images/${image.id}" 
                 class="img-fluid" 
                 style="max-height: 70vh; max-width: 100%; object-fit: contain;"
                 alt="${sanitizeString(image.description || image.image_name)}">
        `;
    }
}

function previousGalleryImage() {
    if (currentGalleryIndex > 0) {
        currentGalleryIndex--;
        loadGalleryImage(currentGalleryIndex);
    }
}

function nextGalleryImage() {
    if (currentGalleryIndex < currentGalleryImages.length - 1) {
        currentGalleryIndex++;
        loadGalleryImage(currentGalleryIndex);
    }
}

async function loadCategoriesForSelect(selectedCategory = '', targetSelectId = 'categorySelect') {
    try {
        console.log(`Загрузка категорий для селекта: ${targetSelectId}`);
        
        const response = await fetch(`${API_BASE_URL}/api/categories`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            let targetSelect = document.getElementById(targetSelectId);
            if (!targetSelect) {
                targetSelect = document.querySelector(`select[name="${targetSelectId}"]`);
                if (!targetSelect) {
                    console.error(`Селект с ID ${targetSelectId} или name="${targetSelectId}" не найден`);
                    return;
                }
            }
            
            let options = '<option value="">Выберите категорию</option>';
            
            if (data.categories && data.categories.length > 0) {
                const sortedCategories = data.categories.sort((a, b) => 
                    a.localeCompare(b, 'ru')
                );
                
                sortedCategories.forEach(category => {
                    const sanitized = sanitizeString(category);
                    const isSelected = selectedCategory && 
                        (sanitized.trim().toLowerCase() === selectedCategory.trim().toLowerCase());
                    
                    const selected = isSelected ? 'selected' : '';
                    options += `<option value="${sanitized}" ${selected}>${sanitized}</option>`;
                });
            }
            
            targetSelect.innerHTML = options;
            
            if (selectedCategory) {
                const exactMatch = Array.from(targetSelect.options).find(
                    opt => opt.value === selectedCategory
                );
                
                if (exactMatch) {
                    targetSelect.value = selectedCategory;
                } else {
                    const caseInsensitiveMatch = Array.from(targetSelect.options).find(
                        opt => opt.value.toLowerCase() === selectedCategory.toLowerCase()
                    );
                    
                    if (caseInsensitiveMatch) {
                        targetSelect.value = caseInsensitiveMatch.value;
                    }
                }
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки категорий:', error);
    }
}

function showAddCategoryModal(sourceModalId) {
    const oldModal = document.getElementById('addCategoryModal');
    if (oldModal) oldModal.remove();
    
    const modalHtml = `
    <div class="modal fade" id="addCategoryModal" tabindex="-1" data-bs-backdrop="static">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header bg-primary text-white">
                    <h5 class="modal-title">
                        <i class="bi bi-plus-circle"></i> Добавить новую категорию
                    </h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Закрыть"></button>
                </div>
                <form id="addCategoryForm" novalidate>
                    <div class="modal-body">
                        <div class="mb-3">
                            <label class="form-label required">Название категории</label>
                            <input type="text" class="form-control" id="newCategoryName" required 
                                   placeholder="Например: Дозиметры, Спектрометры, Индикаторы"
                                   maxlength="100"
                                   pattern="[A-Za-zА-Яа-я0-9\\s-]+"
                                   title="Только буквы, цифры, пробелы и дефисы"
                                   autocomplete="off"
                                   oninput="this.value = this.value.replace(/[<>]/g, '')">
                            <div class="form-text">Только буквы, цифры, пробелы и дефисы. Максимум 100 символов.</div>
                            <div class="invalid-feedback">Пожалуйста, введите название категории</div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Отмена</button>
                        <button type="submit" class="btn btn-primary">
                            <i class="bi bi-check-lg"></i> Добавить категорию
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    const modalElement = document.getElementById('addCategoryModal');
    const modal = new bootstrap.Modal(modalElement);
    
    const form = document.getElementById('addCategoryForm');
    const input = document.getElementById('newCategoryName');
    
    input.value = '';
    form.classList.remove('was-validated');
    
    setTimeout(() => input.focus(), 300);
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            return;
        }
        
        const categoryName = sanitizeString(input.value);
        
        if (!categoryName) {
            showError('Введите название категории');
            return;
        }
        
        if (categoryName.length > 100) {
            showError('Название категории не может быть длиннее 100 символов');
            return;
        }
        
        const btn = e.target.querySelector('button[type="submit"]');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Добавление...';
        
        try {
            const mainSelect = document.querySelector(`#${sourceModalId} select[name="category"]`);
            
            if (!mainSelect) {
                throw new Error('Селект категорий не найден');
            }
            
            let exists = false;
            for (let i = 0; i < mainSelect.options.length; i++) {
                if (mainSelect.options[i].value.toLowerCase() === categoryName.toLowerCase()) {
                    exists = true;
                    break;
                }
            }
            
            if (!exists) {
                const newOption = document.createElement('option');
                newOption.value = categoryName;
                newOption.textContent = categoryName;
                newOption.selected = true;
                mainSelect.appendChild(newOption);
                
                showSuccess(`Категория "${categoryName}" успешно добавлена`);
            } else {
                mainSelect.value = categoryName;
                showInfo(`Категория "${categoryName}" уже существует`);
            }
            
            modal.hide();
            
        } catch (error) {
            console.error('Ошибка при добавлении категории:', error);
            showError('Ошибка при добавлении категории: ' + error.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    });
    
    modalElement.addEventListener('hidden.bs.modal', function() {
        this.remove();
    });
    
    modal.show();
}

async function showAddDeviceModal() {
    const modalHtml = `
    <div class="modal fade" id="addDeviceModal" tabindex="-1">
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header bg-success text-white">
                    <h5 class="modal-title">Добавить сведения о новом приборе</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <form id="addDeviceForm" novalidate>
                    <div class="modal-body">
                       
                        
                        <div class="row">
                            <div class="col-md-6 mb-3">
                                <label class="form-label required">Артикул</label>
                                <input type="text" class="form-control" name="unique_id" id="deviceUniqueId" required 
                                       pattern="[A-Za-z0-9-]+" 
                                       title="Только буквы, цифры и дефисы"
                                       maxlength="50"
                                       autocomplete="off"
                                       oninput="validateDeviceId(this); checkDeviceIdUnique(this)"
                                       onblur="checkDeviceIdUnique(this)">
                                <div id="uniqueIdFeedback" class="invalid-feedback"></div>
                                <div id="uniqueIdValid" class="valid-feedback"></div>
                            </div>
                            <div class="col-md-6 mb-3">
                                <label class="form-label required">Наименование</label>
                                <input type="text" class="form-control" name="name" required 
                                       maxlength="255"
                                       autocomplete="off"
                                       oninput="this.value = this.value.replace(/[<>]/g, '')">
                                <div class="invalid-feedback">Введите наименование прибора</div>
                            </div>
                        </div>
                        
                        <div class="row">
                            <div class="col-md-6 mb-3">
                                <label class="form-label required">Категория</label>
                                <div class="input-group">
                                    <select class="form-select" name="category" id="addDeviceCategorySelect" required>
                                        <option value="">-- Выберите категорию --</option>
                                    </select>
                                    <button class="btn btn-outline-primary" type="button" onclick="showAddCategoryModal('addDeviceModal')">
                                        <i class="bi bi-plus"></i>
                                    </button>
                                </div>
                                <div class="invalid-feedback">Пожалуйста, выберите категорию</div>
                            </div>
                            <div class="col-md-6 mb-3">
                                <label class="form-label">Производитель</label>
                                <input type="text" class="form-control" name="manufacturer" value="НПУП «АТОМТЕХ»"
                                       maxlength="255"
                                       autocomplete="off"
                                       oninput="this.value = this.value.replace(/[<>]/g, '')">
                            </div>
                        </div>
                        
                        <div class="row">
                            <div class="col-md-6 mb-3">
                                <label class="form-label required">Модель</label>
                                <input type="text" class="form-control" name="model" required
                                       maxlength="100"
                                       autocomplete="off"
                                       oninput="this.value = this.value.replace(/[<>]/g, '')">
                                <div class="invalid-feedback">Введите модель прибора</div>
                            </div>
                            
                        </div>
                        
                        <div class="mb-3">
                            <label class="form-label">Описание</label>
                            <textarea class="form-control" name="description" rows="2" maxlength="1000"
                                      autocomplete="off"
                                      oninput="this.value = this.value.replace(/[<>]/g, '')"></textarea>
                        </div>
                        
                        <div class="mb-3">
                            <label class="form-label">Примечания</label>
                            <textarea class="form-control" name="stock_notes" rows="2" maxlength="500"
                                      autocomplete="off"
                                      oninput="this.value = this.value.replace(/[<>]/g, '')"></textarea>
                        </div>
                        
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Отмена</button>
                        <button type="submit" class="btn btn-success" id="submitDeviceBtn">Добавить</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
    `;
    
    const oldModal = document.getElementById('addDeviceModal');
    if (oldModal) oldModal.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Загружаем категории и устанавливаем выбранный option
    await loadCategoriesForSelect('', 'addDeviceCategorySelect');
    
    // Убеждаемся, что выбран пустой option
    const categorySelect = document.getElementById('addDeviceCategorySelect');
    if (categorySelect && categorySelect.options.length > 0) {
        categorySelect.selectedIndex = 0;
    }
    
    const modal = new bootstrap.Modal(document.getElementById('addDeviceModal'));
    
    window.checkDeviceIdUnique = async function(input) {
        const uniqueId = input.value.trim();
        const feedback = document.getElementById('uniqueIdFeedback');
        const validFeedback = document.getElementById('uniqueIdValid');
        const submitBtn = document.getElementById('submitDeviceBtn');
        
        input.classList.remove('is-invalid', 'is-valid');
        feedback.textContent = '';
        validFeedback.textContent = '';
        
        if (!uniqueId) {
            input.classList.add('is-invalid');
            feedback.textContent = 'Введите ID прибора';
            if (submitBtn) submitBtn.disabled = true;
            return false;
        }
        
        if (!isValidDeviceId(uniqueId)) {
            input.classList.add('is-invalid');
            feedback.textContent = 'ID может содержать только буквы, цифры и дефисы';
            if (submitBtn) submitBtn.disabled = true;
            return false;
        }
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/devices?search=${encodeURIComponent(uniqueId)}`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            
            const data = await response.json();
            
            if (data.success && data.devices) {
                const exists = data.devices.some(d => 
                    d.unique_id.toLowerCase() === uniqueId.toLowerCase()
                );
                
                if (exists) {
                    input.classList.add('is-invalid');
                    feedback.textContent = `Прибор с ID "${uniqueId}" уже существует`;
                    if (submitBtn) submitBtn.disabled = true;
                    return false;
                } else {
                    input.classList.add('is-valid');
                    validFeedback.textContent = 'ID доступен';
                    if (submitBtn) submitBtn.disabled = false;
                    return true;
                }
            }
        } catch (error) {
            console.error('Ошибка проверки уникальности ID:', error);
            if (submitBtn) submitBtn.disabled = false;
            return true;
        }
    };
    
    document.getElementById('addDeviceForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const form = e.target;
        const uniqueIdInput = document.getElementById('deviceUniqueId');
        
        // Дополнительная проверка категории
        const category = document.querySelector('#addDeviceCategorySelect')?.value;
        if (!category || category === '') {
            showError('Выберите категорию прибора');
            document.getElementById('addDeviceCategorySelect').classList.add('is-invalid');
            return;
        } else {
            document.getElementById('addDeviceCategorySelect').classList.remove('is-invalid');
        }
        
        // Дополнительная проверка модели
        const model = document.querySelector('input[name="model"]')?.value;
        if (!model || model.trim() === '') {
            showError('Введите модель прибора');
            document.querySelector('input[name="model"]').classList.add('is-invalid');
            return;
        } else {
            document.querySelector('input[name="model"]').classList.remove('is-invalid');
        }
        
        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            return;
        }
        
        const isUnique = await window.checkDeviceIdUnique(uniqueIdInput);
        if (!isUnique) {
            return;
        }
        
        const formData = new FormData(e.target);
        const data = {};
        formData.forEach((value, key) => data[key] = sanitizeString(value));
        
        if (!isValidDeviceId(data.unique_id)) {
            showError('ID может содержать только буквы, цифры и дефисы');
            return;
        }
        
        data.price = 0;
        data.quantity = 0;
        data.min_quantity = 5;
        
        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Добавление...';
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/devices`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (result.success) {
                modal.hide();
                showSuccess('Сведения о приборе добавлены');
                loadDevices();
            } else {
                if (result.message && result.message.includes('UNIQUE KEY')) {
                    showError(`Прибор с артикулом "${data.unique_id}" уже существует`);
                    uniqueIdInput.classList.add('is-invalid');
                    document.getElementById('uniqueIdFeedback').textContent = `ID "${data.unique_id}" уже занят`;
                } else {
                    showError(result.message || 'Ошибка при добавлении прибора');
                }
                btn.disabled = false;
                btn.innerHTML = 'Добавить';
            }
        } catch (error) {
            showError('Ошибка сети: ' + error.message);
            btn.disabled = false;
            btn.innerHTML = 'Добавить';
        }
    });
    
    modal.show();
}

async function showEditDeviceModal(deviceId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/devices/${deviceId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await response.json();
        
        if (!data.success) {
            showError('Не удалось загрузить данные прибора');
            return;
        }
        
        const device = data.device;
        
        const modalHtml = `
        <div class="modal fade" id="editDeviceModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title">Редактировать сведения о приборе</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <form id="editDeviceForm" novalidate>
                        <div class="modal-body">
                           
                            
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label required">Артикул</label>
                                    <input type="text" class="form-control" name="unique_id" value="${sanitizeString(device.unique_id)}" required 
                                           pattern="[A-Za-z0-9-]+"
                                           maxlength="50"
                                           autocomplete="off"
                                           oninput="validateDeviceId(this)">
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label required">Наименование</label>
                                    <input type="text" class="form-control" name="name" value="${sanitizeString(device.name)}" required
                                           maxlength="255"
                                           autocomplete="off"
                                           oninput="this.value = this.value.replace(/[<>]/g, '')">
                                </div>
                            </div>
                            
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label required">Категория</label>
                                    <div class="input-group">
                                        <select class="form-select" name="category" id="editDeviceCategorySelect" required>
                                            <option value="">-- Выберите категорию --</option>
                                        </select>
                                        <button class="btn btn-outline-primary" type="button" onclick="showAddCategoryModal('editDeviceModal')">
                                            <i class="bi bi-plus"></i>
                                        </button>
                                    </div>
                                    <div class="invalid-feedback">Пожалуйста, выберите категорию</div>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Производитель</label>
                                    <input type="text" class="form-control" name="manufacturer" value="${sanitizeString(device.manufacturer || '')}"
                                           maxlength="255"
                                           autocomplete="off"
                                           oninput="this.value = this.value.replace(/[<>]/g, '')">
                                </div>
                            </div>
                            
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label required">Модель</label>
                                    <input type="text" class="form-control" name="model" value="${sanitizeString(device.model || '')}" required
                                           maxlength="100"
                                           autocomplete="off"
                                           oninput="this.value = this.value.replace(/[<>]/g, '')">
                                    <div class="invalid-feedback">Введите модель прибора</div>
                                </div>
                               
                            </div>
                            
                            <div class="mb-3">
                                <label class="form-label">Описание</label>
                                <textarea class="form-control" name="description" rows="2" maxlength="1000"
                                          autocomplete="off"
                                          oninput="this.value = this.value.replace(/[<>]/g, '')">${sanitizeString(device.description || '')}</textarea>
                            </div>
                            
                            <div class="mb-3">
                                <label class="form-label">Примечания</label>
                                <textarea class="form-control" name="stock_notes" rows="2" maxlength="500"
                                          autocomplete="off"
                                          oninput="this.value = this.value.replace(/[<>]/g, '')">${sanitizeString(device.stock_notes || '')}</textarea>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Отмена</button>
                            <button type="submit" class="btn btn-primary">Сохранить изменения</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
        `;
        
        const oldModal = document.getElementById('editDeviceModal');
        if (oldModal) oldModal.remove();
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        await loadCategoriesForSelect(device.category || '', 'editDeviceCategorySelect');
        
        // Убеждаемся, что выбранная категория отображается корректно
        const categorySelect = document.getElementById('editDeviceCategorySelect');
        if (categorySelect && device.category) {
            for (let i = 0; i < categorySelect.options.length; i++) {
                if (categorySelect.options[i].value === device.category) {
                    categorySelect.selectedIndex = i;
                    break;
                }
            }
        }
        
        const modal = new bootstrap.Modal(document.getElementById('editDeviceModal'));
        
        document.getElementById('editDeviceForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const form = e.target;
            
            // Дополнительная проверка категории
            const category = document.querySelector('#editDeviceCategorySelect')?.value;
            if (!category || category === '') {
                showError('Выберите категорию прибора');
                document.getElementById('editDeviceCategorySelect').classList.add('is-invalid');
                return;
            } else {
                document.getElementById('editDeviceCategorySelect').classList.remove('is-invalid');
            }
            
            // Дополнительная проверка модели
            const model = document.querySelector('input[name="model"]')?.value;
            if (!model || model.trim() === '') {
                showError('Введите модель прибора');
                document.querySelector('input[name="model"]').classList.add('is-invalid');
                return;
            } else {
                document.querySelector('input[name="model"]').classList.remove('is-invalid');
            }
            
            if (!form.checkValidity()) {
                form.classList.add('was-validated');
                return;
            }
            
            const formData = new FormData(e.target);
            const data = {};
            formData.forEach((value, key) => data[key] = sanitizeString(value));
            
            if (!isValidDeviceId(data.unique_id)) {
                showError('ID может содержать только буквы, цифры и дефисы');
                return;
            }
            
            data.price = device.price || 0;
            data.quantity = device.quantity || 0;
            data.min_quantity = device.min_quantity || 5;
            
            const btn = e.target.querySelector('button[type="submit"]');
            const originalText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Сохранение...';
            
            try {
                const response = await fetch(`${API_BASE_URL}/api/devices/${deviceId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: JSON.stringify(data)
                });
                
                const result = await response.json();
                
                if (result.success) {
                    modal.hide();
                    showSuccess('Сведения о приборе успешно обновлены');
                    if (currentDeviceId === deviceId) {
                        viewDevice(deviceId);
                    } else {
                        loadDevices();
                    }
                } else {
                    showError('❌ ' + (result.message || 'Ошибка при обновлении'));
                    btn.disabled = false;
                    btn.innerHTML = originalText;
                }
            } catch (error) {
                console.error('Ошибка:', error);
                showError('❌ Ошибка сети: ' + error.message);
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
        });
        
        modal.show();
    } catch (error) {
        console.error('Ошибка загрузки данных прибора:', error);
        showError('Ошибка загрузки данных прибора');
    }
}
async function deleteDevice(deviceId) {
    if (!confirm('Вы уверены, что хотите архивировать прибор?\n\nПосле архивации все данные (история движений, заявки) будут сохранены.')) return;
    
    const btn = event.target;
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Архивация...';
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/devices/${deviceId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showSuccess('Прибор архивирован');
            
            if (currentDeviceId === deviceId) {
                loadDevices();
            } else {
                loadDevices();
            }
        } else {
            showError((data.message || 'Ошибка при архивации'));
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    } catch (error) {
        console.error('Ошибка архивации:', error);
        showError('Ошибка сети: ' + error.message);
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

function validateDeviceId(input) {
    input.value = input.value.replace(/[^A-Za-z0-9-]/g, '');
}

function showUploadImageModal(deviceId, defaultType = 'gallery') {
    const modalHtml = `
    <div class="modal fade" id="uploadImageModal" tabindex="-1">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header bg-primary text-white">
                    <h5 class="modal-title">
                        <i class="bi bi-upload"></i> ${defaultType === 'prospect' ? 'Загрузка рекламного проспекта' : 'Загрузка изображения в галерею'}
                    </h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <form id="uploadImageForm" enctype="multipart/form-data">
                    <div class="modal-body">
                        <input type="hidden" id="uploadDeviceId" value="${deviceId}">
                        <input type="hidden" id="imageType" value="${defaultType}">
                        
                        <div class="mb-3">
                            <label class="form-label">Выберите файл</label>
                            <input type="file" class="form-control" id="imageFile" 
                                   accept="${defaultType === 'prospect' ? '.pdf' : 'image/jpeg,image/png,image/gif,image/webp'}" required>
                            <div class="form-text">
                                ${defaultType === 'prospect' 
                                    ? 'Загрузите PDF файл рекламного проспекта' 
                                    : 'Поддерживаются: JPG, PNG, GIF, WEBP (максимум 10 МБ)'}
                            </div>
                        </div>
                        
                        <div class="mb-3">
                            <label class="form-label">Описание</label>
                            <textarea class="form-control" id="imageDescription" rows="2" 
                                      placeholder="Краткое описание файла" maxlength="500"></textarea>
                        </div>
                        
                        <div id="filePreview" class="text-center d-none">
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Отмена</button>
                        <button type="submit" class="btn btn-primary">
                            <i class="bi bi-upload"></i> Загрузить
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
    `;
    
    const oldModal = document.getElementById('uploadImageModal');
    if (oldModal) oldModal.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Превью файла
    document.getElementById('imageFile').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 10 * 1024 * 1024) {
                showError('Файл слишком большой. Максимум 10 МБ');
                this.value = '';
                return;
            }
            
            const fileType = file.type;
            const preview = document.getElementById('filePreview');
            
            if (fileType.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    preview.innerHTML = `<img src="${e.target.result}" class="img-fluid rounded" style="max-height: 200px;">`;
                    preview.classList.remove('d-none');
                };
                reader.readAsDataURL(file);
            } else if (fileType === 'application/pdf') {
                preview.innerHTML = `
                    <div class="alert alert-info">
                        <i class="bi bi-file-pdf fs-1 text-danger"></i>
                        <p>${escapeHtml(file.name)}</p>
                    </div>
                `;
                preview.classList.remove('d-none');
            } else {
                preview.classList.add('d-none');
            }
        }
    });
    
    const modal = new bootstrap.Modal(document.getElementById('uploadImageModal'));
    
    document.getElementById('uploadImageForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const file = document.getElementById('imageFile').files[0];
        if (!file) {
            showError('Выберите файл');
            return;
        }
        
        if (file.size > 10 * 1024 * 1024) {
            showError('Файл слишком большой. Максимум 10 МБ');
            return;
        }
        
        const imageType = document.getElementById('imageType').value;
        
        // Проверяем соответствие типа файла выбранной категории
        if (imageType === 'prospect' && file.type !== 'application/pdf') {
            showError('Для рекламного проспекта нужно загрузить PDF файл');
            return;
        }
        
        if (imageType === 'gallery' && !file.type.startsWith('image/')) {
            showError('Для галереи нужно загрузить изображение (JPG, PNG, GIF, WEBP)');
            return;
        }
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('imageType', imageType);
        formData.append('description', escapeHtml(document.getElementById('imageDescription').value));
        
        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Загрузка...';
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/devices/${deviceId}/images`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`
                },
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                modal.hide();
                showSuccess(result.message);
                if (currentDeviceId) {
                    viewDevice(currentDeviceId);
                }
            } else {
                showError('Ошибка: ' + result.message);
                btn.disabled = false;
                btn.innerHTML = 'Загрузить';
            }
        } catch (error) {
            showError('Ошибка сети: ' + error.message);
            btn.disabled = false;
            btn.innerHTML = 'Загрузить';
        }
    });
    
    modal.show();
}

async function deleteImage(imageId) {
    if (!confirm('Удалить файл?')) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/images/${imageId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showSuccess('Файл удален');
            if (currentDeviceId) {
                viewDevice(currentDeviceId);
            }
        }
    } catch (error) {
        showError('Ошибка удаления');
    }
}

function showIssueModal(deviceId, deviceName) {
    const modalHtml = `
    <div class="modal fade" id="issueModal" tabindex="-1">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header bg-warning text-white">
                    <h5 class="modal-title">Списание количества прибора</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <form id="issueForm" novalidate>
                    <div class="modal-body">
                        <p>Прибор: <strong>${sanitizeString(deviceName)}</strong></p>
                        

                        <div class="mb-3">
                            <label class="form-label required">Количество</label>
                            <input type="number" class="form-control" id="issueQuantity" min="1" value="1" required 
                                oninput="validatePositiveInteger(this)"
                                onkeypress="return isNumberKey(event)"
                                maxlength="5"
                                onkeydown="if(this.value.length >= 7 && event.keyCode !== 8) return false;">
                            <div class="invalid-feedback">Введите положительное целое число </div>
                        </div>
                        
                        <div class="mb-3">
                            <label class="form-label required">Причина</label>
                            <select class="form-select" id="issueReason" required>
                                <option value="">Выберите причину</option>
                                <option value="брак">Брак</option>
                                <option value="повреждение">Повреждение</option>
                                <option value="устаревание">Устаревание</option>
                                <option value="выдача">Выдача сотруднику</option>
                                <option value="другое">Другое</option>
                            </select>
                        </div>
                        
                        <div class="mb-3">
                            <label class="form-label">Примечания</label>
                            <textarea class="form-control" id="issueNotes" rows="2" maxlength="500"></textarea>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Отмена</button>
                        <button type="submit" class="btn btn-warning">Списать</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
    `;
    
    const oldModal = document.getElementById('issueModal');
    if (oldModal) oldModal.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    const modal = new bootstrap.Modal(document.getElementById('issueModal'));
    
    document.getElementById('issueForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const form = e.target;
        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            return;
        }
        
        const quantity = parseInt(document.getElementById('issueQuantity').value);
        const reason = document.getElementById('issueReason').value;
        const notes = sanitizeString(document.getElementById('issueNotes').value);
        
        if (!isPositiveInteger(quantity)) {
            showError('Количество должно быть положительным целым числом');
            return;
        }
        
        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Обработка...';
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/stock/update`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    deviceId: deviceId,
                    quantityChange: -quantity,
                    movementType: 'списание',
                    notes: `Причина: ${reason}. ${notes}`
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                modal.hide();
                showSuccess('Списание выполнено');
                if (currentDeviceId) {
                    viewDevice(currentDeviceId);
                }
            } else {
                showError(result.message);
                btn.disabled = false;
                btn.innerHTML = 'Списать';
            }
        } catch (error) {
            showError('Ошибка сети');
            btn.disabled = false;
            btn.innerHTML = 'Списать';
        }
    });
    
    modal.show();
}

function validatePositiveInteger(input) {
    let value = parseInt(input.value);
    if (isNaN(value) || value < 1) {
        input.value = 1;
    }
}


async function loadReplenishmentRequests() {
    if (!authToken || !userPermissions?.can_view_replenishment_requests) {
        showError('Доступ запрещен');
        return;
    }
    
    document.getElementById('page-title').textContent = 'Заявки на пополнение';
    document.getElementById('page-actions').innerHTML = `
    ${(userPermissions.can_create_replenishment_requests || currentUser?.role === 'admin') ? `
    <button class="btn btn-success btn-sm" onclick="showCreateReplenishmentRequestModal()">
        <i class="bi bi-plus"></i> Новая заявка
    </button>
    ` : ''}
`;
    
    // Скрытые поля для хранения значений фильтров
    if (!document.getElementById('replenishmentStatusFilter')) {
        const hiddenDiv = document.createElement('div');
        hiddenDiv.style.display = 'none';
        hiddenDiv.innerHTML = `
            <input type="hidden" id="replenishmentStatusFilter" value="all">
            <input type="hidden" id="replenishmentDateFrom">
            <input type="hidden" id="replenishmentDateTo">
        `;
        document.body.appendChild(hiddenDiv);
    }
    
    document.getElementById('content').innerHTML = `
        <div class="card mb-3">
            <div class="card-body py-2">
                <div class="row g-2 align-items-center">
                    <div class="col-md-5">
                        <div class="d-flex gap-2">
                            <input type="text" class="form-control" id="replenishmentSearchInput" 
                                   placeholder="Поиск по номеру, прибору..." 
                                   autocomplete="off"
                                   onkeyup="applyReplenishmentFiltersDebounced()">
                            <button class="btn btn-outline-secondary" type="button" onclick="resetReplenishmentSearch()" title="Очистить">
                                <i class="bi bi-x-lg"></i>
                            </button>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <button class="btn btn-primary" onclick="showReplenishmentFiltersModal()">
                            <i class="bi bi-funnel"></i> Фильтры
                            <span id="replenishmentActiveFiltersBadge" class="badge bg-danger ms-1" style="display: none;">0</span>
                        </button>
                        <button class="btn btn-secondary ms-2" onclick="resetReplenishmentFilters()" title="Сбросить все фильтры">
                            <i class="bi bi-eraser"></i>
                        </button>
                    </div>
                    <div class="col-md-4 text-end">
                        <span class="text-muted" id="replenishmentFilterStats"></span>
                    </div>
                </div>
            </div>
        </div>
        <div class="text-center py-5">
            <div class="spinner-border" style="color: var(--accent);"></div>
            <p class="mt-3">Загрузка заявок...</p>
        </div>
    `;
    
    try {
        // Для сотрудника - показываем только pending заявки
        let url = `${API_BASE_URL}/api/replenishment-requests`;
        if (currentUser?.role === 'employee') {
            url += '?status=pending';
        }

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Сохраняем все заявки для фильтрации
            allReplenishmentRequests = data.requests || [];
            
            let html = `
                <div class="card mb-3">
                    <div class="card-body py-2">
                        <div class="row g-2 align-items-center">
                            <div class="col-md-5">
                                <div class="d-flex gap-2">
                                    <input type="text" class="form-control" id="replenishmentSearchInput" 
                                           placeholder="Поиск по номеру, прибору..." 
                                           autocomplete="off"
                                           onkeyup="applyReplenishmentFiltersDebounced()">
                                    <button class="btn btn-outline-secondary" type="button" onclick="resetReplenishmentSearch()" title="Очистить">
                                        <i class="bi bi-x-lg"></i>
                                    </button>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <button class="btn btn-primary" onclick="showReplenishmentFiltersModal()">
                                    <i class="bi bi-funnel"></i> Фильтры
                                    <span id="replenishmentActiveFiltersBadge" class="badge bg-danger ms-1" style="display: none;">0</span>
                                </button>
                                <button class="btn btn-secondary ms-2" onclick="resetReplenishmentFilters()" title="Сбросить все фильтры">
                                    <i class="bi bi-eraser"></i>
                                </button>
                            </div>
                            <div class="col-md-4 text-end">
                                <span class="text-muted" id="replenishmentFilterStats"></span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="card">
                    <div class="card-header">
                        <h5 class="mb-0">Список заявок на пополнение</h5>
                    </div>
                    <div class="card-body">
                        <div class="table-responsive">
                            <table class="table table-hover" id="replenishmentRequestsTable">
                                <thead>
                                    <tr>
                                        <th>Номер</th>
                                        <th>Прибор</th>
                                        <th>Количество (шт.)</th>
                                        <th>Причина</th>
                                        <th>Статус</th>
                                        <th>Создал</th>
                                        <th>Дата</th>
                                        <th>Документы</th>
                                        <th>Действия</th>
                                    </tr>
                                </thead>
                                <tbody>
            `;
            
            if (allReplenishmentRequests.length > 0) {
                allReplenishmentRequests.forEach(r => {
                    let statusClass = '';
                    let statusText = '';
                    
                    switch(r.status) {
                        case 'pending':
                            statusClass = 'bg-warning';
                            statusText = 'Ожидает';
                            break;
                         case 'processing':
        statusClass = 'bg-info';
        statusText = 'В процессе';
        break;
                        case 'completed':
                            statusClass = 'bg-success';
                            statusText = 'Выполнена';
                            break;
                        case 'rejected':
                            statusClass = 'bg-danger';
                            statusText = 'Отклонена';
                            break;
                        default:
                            statusClass = 'bg-secondary';
                            statusText = r.status;
                    }
                    
                    html += `
                        <tr>
                            <td><code>${sanitizeString(r.request_number)}</code></td>
                            <td>${sanitizeString(r.device_name)} (${sanitizeString(r.device_unique_id)})</td>
                            <td>${r.quantity_requested}</td>
                            <td>${sanitizeString(r.reason || '-')}</td>
                            <td><span class="badge ${statusClass}">${statusText}</span></td>
                            <td>${sanitizeString(r.created_by_name)}</td>
                            <td>${new Date(r.created_at).toLocaleDateString()}</td>
                            <td>
                                ${r.status === 'completed' ? `
                                <button class="btn btn-sm btn-outline-info" onclick="showReplenishmentDocuments(${r.id})" title="Документы">
                                    <i class="bi bi-file-text"></i>
                                </button>
                                ` : '-'}
                            </td>
                            <td>
                                <button class="btn btn-sm btn-outline-info" onclick="viewReplenishmentRequest(${r.id})" title="Просмотр">
                                    <i class="bi bi-eye"></i>
                                </button>
                                ${userPermissions?.role === 'admin' && (r.status === 'pending' || r.status === 'processing') ? `
    <button class="btn btn-sm btn-outline-success" onclick="showFulfillReplenishmentModal(${r.id})" title="Выполнить">
        <i class="bi bi-check-circle"></i>
    </button>
    ${r.status === 'pending' ? `
    <button class="btn btn-sm btn-outline-danger" onclick="rejectReplenishmentRequest(${r.id})" title="Отклонить">
        <i class="bi bi-x-circle"></i>
    </button>
    ` : ''}
` : ''}
                                ${userPermissions?.role === 'admin' && (r.status === 'completed' || r.status === 'rejected') ? `
                                <button class="btn btn-sm btn-outline-danger" onclick="deleteReplenishmentRequest(${r.id})" title="Удалить">
                                    <i class="bi bi-trash"></i>
                                </button>
                                ` : ''}
                            </td>
                        </tr>
                    `;
                });
            } else {
                html += '<td><td colspan="9" class="text-center">Нет заявок</td></tr>';
            }
            
            html += `
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
            document.getElementById('content').innerHTML = html;
            
            // Обновляем статистику
            const statsSpan = document.getElementById('replenishmentFilterStats');
            if (statsSpan) {
                statsSpan.innerHTML = `Всего: ${allReplenishmentRequests.length} заявок`;
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки заявок:', error);
        showError('Ошибка загрузки заявок');
    }
}

let replenishmentSearchTimeout;
let allReplenishmentRequests = [];

function applyReplenishmentFiltersDebounced() {
    clearTimeout(replenishmentSearchTimeout);
    replenishmentSearchTimeout = setTimeout(() => {
        filterReplenishmentRequests();
    }, 500);
}

function filterReplenishmentRequests() {
    const search = (document.getElementById('replenishmentSearchInput')?.value || '').toLowerCase();
    const status = document.getElementById('replenishmentStatusFilter')?.value || 'all';
    const dateFrom = document.getElementById('replenishmentDateFrom')?.value || '';
    const dateTo = document.getElementById('replenishmentDateTo')?.value || '';
    
    let filtered = [...allReplenishmentRequests];
    
    if (search) {
        filtered = filtered.filter(r => 
            (r.request_number && r.request_number.toLowerCase().includes(search)) ||
            (r.device_name && r.device_name.toLowerCase().includes(search)) ||
            (r.device_unique_id && r.device_unique_id.toLowerCase().includes(search))
        );
    }
    
    if (status !== 'all') {
        filtered = filtered.filter(r => r.status === status);
    }
    
    if (dateFrom) {
        filtered = filtered.filter(r => {
            const date = new Date(r.created_at).toISOString().split('T')[0];
            return date >= dateFrom;
        });
    }
    if (dateTo) {
        filtered = filtered.filter(r => {
            const date = new Date(r.created_at).toISOString().split('T')[0];
            return date <= dateTo;
        });
    }
    
    renderReplenishmentRequestsTable(filtered);
    
    const statsSpan = document.getElementById('replenishmentFilterStats');
    if (statsSpan) {
        statsSpan.innerHTML = `Найдено: ${filtered.length} заявок`;
    }
}

function renderReplenishmentRequestsTable(requests) {
    let html = '';
    
    if (requests && requests.length > 0) {
        requests.forEach(r => {
            let statusClass = '';
            let statusText = '';
            
            switch(r.status) {
                case 'pending': statusClass = 'bg-warning'; statusText = 'Ожидает'; break;
                case 'processing': statusClass = 'bg-info'; statusText = 'В процессе'; break;  // ← добавлен processing
                case 'completed': statusClass = 'bg-success'; statusText = 'Выполнена'; break;
                case 'rejected': statusClass = 'bg-danger'; statusText = 'Отклонена'; break;
                default: statusClass = 'bg-secondary'; statusText = r.status;
            }
            
            html += `
                <tr>
                    <td><code>${sanitizeString(r.request_number)}</code></td>
                    <td>${sanitizeString(r.device_name)} (${sanitizeString(r.device_unique_id)})</noscript>
                    <td>${r.quantity_requested}</noscript>
                    <td>${sanitizeString(r.reason || '-')}</noscript>
                    <td><span class="badge ${statusClass}">${statusText}</span></noscript>
                    <td>${sanitizeString(r.created_by_name)}</noscript>
                    <td>${new Date(r.created_at).toLocaleDateString()}</noscript>
                    <td>
                        ${r.status === 'completed' ? `
                        <button class="btn btn-sm btn-outline-info" onclick="showReplenishmentDocuments(${r.id})" title="Документы">
                            <i class="bi bi-file-text"></i>
                        </button>
                        ` : '-'}
                    </noscript>
                    <td>
                        <button class="btn btn-sm btn-outline-info" onclick="viewReplenishmentRequest(${r.id})" title="Просмотр">
                            <i class="bi bi-eye"></i>
                        </button>
                        ${userPermissions?.role === 'admin' && (r.status === 'pending' || r.status === 'processing') ? `
                            <button class="btn btn-sm btn-outline-success" onclick="showFulfillReplenishmentModal(${r.id})" title="Выполнить">
                                <i class="bi bi-check-circle"></i>
                            </button>
                            ${r.status === 'pending' ? `
                            <button class="btn btn-sm btn-outline-danger" onclick="rejectReplenishmentRequest(${r.id})" title="Отклонить">
                                <i class="bi bi-x-circle"></i>
                            </button>
                            ` : ''}
                        ` : ''}
                        ${userPermissions?.role === 'admin' && (r.status === 'completed' || r.status === 'rejected') ? `
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteReplenishmentRequest(${r.id})" title="Удалить">
                            <i class="bi bi-trash"></i>
                        </button>
                        ` : ''}
                    </noscript>
                </tr>
            `;
        });
    } else {
        html = '<tr><td colspan="9" class="text-center">Нет заявок</noscript>';
    }
    
    const tbody = document.querySelector('#replenishmentRequestsTable tbody');
    if (tbody) {
        tbody.innerHTML = html;
    }
}

function updateReplenishmentActiveFiltersBadge() {
    let activeCount = 0;
    
    // Для админа - считаем статус
    if (currentUser?.role !== 'employee') {
        const status = document.getElementById('replenishmentStatusFilter')?.value || 'all';
        if (status !== 'all') activeCount++;
    }
    
    const dateFrom = document.getElementById('replenishmentDateFrom')?.value || '';
    const dateTo = document.getElementById('replenishmentDateTo')?.value || '';
    if (dateFrom) activeCount++;
    if (dateTo) activeCount++;
    
    const badge = document.getElementById('replenishmentActiveFiltersBadge');
    if (badge) {
        if (activeCount > 0) {
            badge.textContent = activeCount;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    }
}

function showReplenishmentFiltersModal() {
    const currentStatus = document.getElementById('replenishmentStatusFilter')?.value || 'all';
    const currentDateFrom = document.getElementById('replenishmentDateFrom')?.value || '';
    const currentDateTo = document.getElementById('replenishmentDateTo')?.value || '';
    
    // Формируем список статусов в зависимости от роли
    let statusOptions = '';
    
    if (currentUser?.role === 'employee') {
        // Для сотрудника - убираем фильтр по статусам вообще
        statusOptions = `<option value="all">Все статусы</option>`;
    } else {
        // Для админа - только ожидает, выполнена, отклонена
        statusOptions = `
            <option value="all" ${currentStatus === 'all' ? 'selected' : ''}>Все</option>
            <option value="pending" ${currentStatus === 'pending' ? 'selected' : ''}>Ожидает</option>
            <option value="processing" ${currentStatus === 'processing' ? 'selected' : ''}>В процессе</option>
            <option value="completed" ${currentStatus === 'completed' ? 'selected' : ''}>Выполнена</option>
            <option value="rejected" ${currentStatus === 'rejected' ? 'selected' : ''}>Отклонена</option>
        `;
    }
    
    // Для сотрудника - скрываем блок со статусами
    const statusBlockStyle = currentUser?.role === 'employee' ? 'style="display: none;"' : '';
    
    const modalHtml = `
        <div class="modal fade" id="replenishmentFiltersModal" tabindex="-1" data-bs-backdrop="static">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title"><i class="bi bi-funnel"></i> Фильтры заявок на пополнение</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3" ${statusBlockStyle}>
                            <label class="form-label fw-bold">Статус заявки</label>
                            <select class="form-select" id="filterReplenishmentStatus">
                                ${statusOptions}
                            </select>
                        </div>
                        <div class="mb-3">
                            <label class="form-label fw-bold">Период создания</label>
                            <div class="row g-2">
                                <div class="col-6">
                                    <input type="date" class="form-control" id="filterReplenishmentDateFrom" value="${currentDateFrom}" placeholder="Дата от">
                                </div>
                                <div class="col-6">
                                    <input type="date" class="form-control" id="filterReplenishmentDateTo" value="${currentDateTo}" placeholder="Дата до">
                                </div>
                            </div>
                        </div>
                        <hr>
                        <div class="d-flex justify-content-between">
                            <button type="button" class="btn btn-secondary" onclick="resetReplenishmentFiltersAndCloseModal()">
                                <i class="bi bi-eraser"></i> Сбросить все
                            </button>
                            <div>
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Отмена</button>
                                <button type="button" class="btn btn-primary" onclick="applyReplenishmentFiltersFromModal()">
                                    <i class="bi bi-check-lg"></i> Применить
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const oldModal = document.getElementById('replenishmentFiltersModal');
    if (oldModal) oldModal.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = new bootstrap.Modal(document.getElementById('replenishmentFiltersModal'));
    modal.show();
}

function applyReplenishmentFiltersFromModal() {
    let status = 'all';
    
    // Для админа - берем статус из модального окна
    if (currentUser?.role !== 'employee') {
        status = document.getElementById('filterReplenishmentStatus')?.value || 'all';
    }
    
    const dateFrom = document.getElementById('filterReplenishmentDateFrom')?.value || '';
    const dateTo = document.getElementById('filterReplenishmentDateTo')?.value || '';
    
    document.getElementById('replenishmentStatusFilter').value = status;
    document.getElementById('replenishmentDateFrom').value = dateFrom;
    document.getElementById('replenishmentDateTo').value = dateTo;
    
    const modal = bootstrap.Modal.getInstance(document.getElementById('replenishmentFiltersModal'));
    if (modal) modal.hide();
    
    updateReplenishmentActiveFiltersBadge();
    filterReplenishmentRequests();
}

function resetReplenishmentFilters() {
    // Для админа - сбрасываем статус
    if (currentUser?.role !== 'employee') {
        document.getElementById('replenishmentStatusFilter').value = 'all';
    }
    
    document.getElementById('replenishmentDateFrom').value = '';
    document.getElementById('replenishmentDateTo').value = '';
    document.getElementById('replenishmentSearchInput').value = '';
    
    updateReplenishmentActiveFiltersBadge();
    filterReplenishmentRequests();
}

function resetReplenishmentFiltersAndCloseModal() {
    // Для админа - сбрасываем статус в модальном окне
    if (currentUser?.role !== 'employee') {
        const statusSelect = document.getElementById('filterReplenishmentStatus');
        if (statusSelect) statusSelect.value = 'all';
    }
    
    const dateFrom = document.getElementById('filterReplenishmentDateFrom');
    const dateTo = document.getElementById('filterReplenishmentDateTo');
    if (dateFrom) dateFrom.value = '';
    if (dateTo) dateTo.value = '';
    
    applyReplenishmentFiltersFromModal();
}

function resetReplenishmentSearch() {
    const searchInput = document.getElementById('replenishmentSearchInput');
    if (searchInput) {
        searchInput.value = '';
        filterReplenishmentRequests();
    }
}

function showCreateReplenishmentRequestModal() {
    if (!userPermissions?.can_create_replenishment_requests && currentUser?.role !== 'admin') {
        showError('Доступ запрещен');
        return;
    }
    
    fetch(`${API_BASE_URL}/api/devices`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
    })
    .then(response => response.json())
    .then(data => {
        let deviceOptions = '';
        if (data.success && data.devices) {
            data.devices.forEach(d => {
                deviceOptions += `<option value="${d.id}" data-min="${d.min_quantity || 5}" data-stock="${d.quantity || 0}">${sanitizeString(d.unique_id)} - ${sanitizeString(d.name)} (в наличии: ${d.quantity || 0}, мин. запас: ${d.min_quantity || 5})</option>`;
            });
        }
        
        const modalHtml = `
        <div class="modal fade" id="createReplenishmentRequestModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header bg-success text-white">
                        <h5 class="modal-title">Новая заявка на пополнение</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <form id="createReplenishmentRequestForm" novalidate>
                        <div class="modal-body">
                            
                            
                            <h6 class="mb-3">Позиции для пополнения</h6>
                            <div id="replenishmentItems">
                                <div class="row mb-2 item-row">
                                    <div class="col-md-6">
                                        <select class="form-select device-select" required>
                                            <option value="">Выберите прибор</option>
                                            ${deviceOptions}
                                        </select>
                                        <div class="stock-info mt-1 small text-muted"></div>
                                    </div>
                                    <div class="col-md-3">
                                        <div class="input-group">
                                            <input type="number" class="form-control quantity-input" placeholder="Количество" min="1" max="9999999" value="1" step="1" required
                                                oninput="validatePositiveInteger(this); window.limitQuantityDigits(this, 7)"
                                                onkeypress="return isNumberKey(event)">
                                            <span class="input-group-text">шт</span>
                                        </div>
                                        <div class="invalid-feedback">Введите положительное целое число (не более 7 цифр)</div>
                                    </div>
                                    <div class="col-md-2">
                                        <input type="text" class="form-control reason-input" placeholder="Причина" maxlength="500">
                                    </div>
                                    <div class="col-md-1">
                                        <button type="button" class="btn btn-outline-danger remove-item" disabled>×</button>
                                    </div>
                                </div>
                            </div>
                            
                            <button type="button" class="btn btn-sm btn-outline-primary mt-2" id="addReplenishmentItem">
                                <i class="bi bi-plus"></i> Добавить еще прибор
                            </button>
                            
                            <div class="mb-3 mt-4">
                                <label class="form-label">Общие примечания</label>
                                <textarea class="form-control" id="replenishmentCommonNotes" rows="2" 
                                          placeholder="Общие примечания к заявке" maxlength="1000"></textarea>
                            </div>
                            
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Отмена</button>
                            <button type="submit" class="btn btn-success">Создать заявку</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
        `;
        
        const oldModal = document.getElementById('createReplenishmentRequestModal');
        if (oldModal) oldModal.remove();
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Функция ограничения количества цифр
        window.limitQuantityDigits = function(input, maxDigits) {
            let value = input.value;
            if (value.length > maxDigits) {
                input.value = value.slice(0, maxDigits);
            }
            if (parseInt(input.value) > 9999999) {
                input.value = 9999999;
            }
        };
        
        function updateStockInfo(select, infoEl) {
            const selected = select.options[select.selectedIndex];
            const stock = selected.dataset.stock || 0;
            const minStock = selected.dataset.min || 5;
            
            if (select.value) {
                infoEl.innerHTML = `В наличии: <strong>${stock}</strong> шт. Мин. запас: <strong>${minStock}</strong> шт.`;
                infoEl.className = stock == 0 ? 'stock-info mt-1 small text-danger' : 'stock-info mt-1 small text-muted';
            } else {
                infoEl.innerHTML = '';
            }
        }
        
        const firstRow = document.querySelector('#replenishmentItems .item-row');
        const firstSelect = firstRow.querySelector('.device-select');
        const firstInfo = firstRow.querySelector('.stock-info');
        const firstQuantity = firstRow.querySelector('.quantity-input');
        
        firstSelect.addEventListener('change', function() {
            updateStockInfo(this, firstInfo);
        });
        
        firstQuantity.addEventListener('input', function() {
            validatePositiveInteger(this);
            window.limitQuantityDigits(this, 7);
        });
        
        document.getElementById('addReplenishmentItem').addEventListener('click', function() {
            const container = document.getElementById('replenishmentItems');
            const firstRow = container.querySelector('.item-row');
            const newRow = firstRow.cloneNode(true);
            
              newRow.querySelectorAll('select, input').forEach(el => {
                if (el.tagName === 'SELECT') {
                    el.value = '';
                } else if (el.classList.contains('quantity-input')) {
                    el.value = '1';
                } else {
                    el.value = '';
                }
                el.classList.remove('is-invalid');
            });
            newRow.querySelector('.stock-info').innerHTML = '';
            
            // Убираем disabled у кнопки удаления для новых строк
            const removeBtn = newRow.querySelector('.remove-item');
            if (removeBtn) {
                removeBtn.disabled = false;
            }
            
            container.appendChild(newRow);
            
            const newSelect = newRow.querySelector('.device-select');
            const newInfo = newRow.querySelector('.stock-info');
            const newQuantity = newRow.querySelector('.quantity-input');
            
            newSelect.addEventListener('change', function() {
                updateStockInfo(this, newInfo);
            });
            
            newQuantity.addEventListener('input', function() {
                validatePositiveInteger(this);
                window.limitQuantityDigits(this, 7);
            });
            
            newQuantity.addEventListener('keypress', function(e) {
                return isNumberKey(e);
            });
            
            newRow.querySelector('.remove-item').addEventListener('click', function() {
                const rows = document.querySelectorAll('#replenishmentItems .item-row');
                if (rows.length > 1) {
                    this.closest('.item-row').remove();
                }
            });
        });
        
        document.addEventListener('click', function(e) {
            if (e.target.classList.contains('remove-item')) {
                const rows = document.querySelectorAll('#replenishmentItems .item-row');
                if (rows.length > 1) {
                    e.target.closest('.item-row').remove();
                }
            }
        });
        
        const modal = new bootstrap.Modal(document.getElementById('createReplenishmentRequestModal'));
        
        document.getElementById('createReplenishmentRequestForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const form = e.target;
            form.classList.add('was-validated');
            
            const items = [];
            const rows = document.querySelectorAll('#replenishmentItems .item-row');
            const commonNotes = sanitizeString(document.getElementById('replenishmentCommonNotes').value);
            let hasErrors = false;
            
            for (const row of rows) {
                const deviceSelect = row.querySelector('.device-select');
                const quantityInput = row.querySelector('.quantity-input');
                const reasonInput = row.querySelector('.reason-input');
                
                const deviceId = deviceSelect.value;
                const quantity = quantityInput.value;
                const reason = sanitizeString(reasonInput.value);
                
                if (!deviceId) {
                    deviceSelect.classList.add('is-invalid');
                    hasErrors = true;
                } else {
                    deviceSelect.classList.remove('is-invalid');
                }
                
                if (!quantity || !isPositiveInteger(quantity) || parseInt(quantity) > 9999999) {
                    quantityInput.classList.add('is-invalid');
                    hasErrors = true;
                } else {
                    quantityInput.classList.remove('is-invalid');
                }
                
                if (!hasErrors) {
                    items.push({
                        deviceId: parseInt(deviceId),
                        quantity: parseInt(quantity),
                        reason: reason || null
                    });
                }
            }
            
            if (hasErrors) {
                showError('Пожалуйста, исправьте ошибки в форме');
                return;
            }
            
            if (items.length === 0) {
                showError('Добавьте хотя бы одну позицию');
                return;
            }
            
            const btn = e.target.querySelector('button[type="submit"]');
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Создание...';
            
            try {
                let successCount = 0;
                let errorCount = 0;
                
                for (const item of items) {
                    const response = await fetch(`${API_BASE_URL}/api/replenishment-requests`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${authToken}`
                        },
                        body: JSON.stringify({
                            deviceId: item.deviceId,
                            quantity: item.quantity,
                            reason: item.reason,
                            notes: commonNotes
                        })
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        successCount++;
                    } else {
                        errorCount++;
                        console.error('Ошибка для прибора', item.deviceId, result.message);
                    }
                }
                
                modal.hide();
                
                if (errorCount === 0) {
                    showSuccess(`Все ${successCount} заявок успешно созданы`);
                } else {
                    showWarning(`Создано ${successCount} заявок, ошибок: ${errorCount}`);
                }
                
                loadReplenishmentRequests();
                
            } catch (error) {
                showError('Ошибка сети');
                btn.disabled = false;
                btn.innerHTML = 'Создать заявку';
            }
        });
        
        modal.show();
    })
    .catch(error => {
        console.error('Ошибка загрузки приборов:', error);
        showError('Ошибка загрузки данных');
    });
}

async function viewReplenishmentRequest(requestId) {
    currentReplenishmentRequestId = requestId;
    
    document.getElementById('page-title').textContent = 'Детали заявки на пополнение';
    document.getElementById('page-actions').innerHTML = `
        <button class="btn btn-secondary btn-sm" onclick="loadReplenishmentRequests()">
            <i class="bi bi-arrow-left"></i> Назад
        </button>
    `;
    
    document.getElementById('content').innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border" style="color: var(--accent);"></div>
            <p class="mt-3">Загрузка...</p>
        </div>
    `;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/replenishment-requests/${requestId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            const r = data.request;
            
            let statusClass = '';
            let statusText = '';
            
            switch(r.status) {
                case 'pending':
                    statusClass = 'bg-warning';
                    statusText = 'Ожидает';
                    break;
                case 'processing':
                    statusClass = 'bg-info';
                    statusText = 'В процессе';
                    break;
                case 'completed':
                    statusClass = 'bg-success';
                    statusText = 'Выполнена';
                    break;
                case 'rejected':
                    statusClass = 'bg-danger';
                    statusText = 'Отклонена';
                    break;
                default:
                    statusClass = 'bg-secondary';
                    statusText = r.status;
            }
            
            const fulfilledQuantity = r.fulfilled_quantity || 0;
            const remainingQuantity = r.remaining_quantity !== undefined ? r.remaining_quantity : (r.quantity_requested - fulfilledQuantity);
            
            // Основная информация
            let mainHtml = `
                <div class="row">
                    <div class="col-md-8">
                        <div class="card mb-4">
                            <div class="card-header">
                                <h5 class="mb-0">Заявка ${sanitizeString(r.request_number)}</h5>
                            </div>
                            <div class="card-body">
                                <div class="row">
                                    <div class="col-md-6">
                                        <p><strong>Прибор:</strong> ${sanitizeString(r.device_name)} (${sanitizeString(r.device_unique_id)})</p>
                                        <p><strong>Категория:</strong> ${sanitizeString(r.device_category || '-')}</p>
                                        <p><strong>Заказано:</strong> ${r.quantity_requested} шт.</p>
                                        ${fulfilledQuantity > 0 ? `<p><strong>Уже поступило:</strong> <span class="text-success">${fulfilledQuantity} шт.</span></p>` : ''}
                                        ${remainingQuantity > 0 && r.status !== 'completed' ? `<p><strong>Осталось к поставке:</strong> <span class="fw-bold">${remainingQuantity} шт.</span></p>` : ''}
                                    </div>
                                    <div class="col-md-6">
                                        <p><strong>Статус:</strong> <span class="badge ${statusClass}">${statusText}</span></p>
                                        <p><strong>Создал:</strong> ${sanitizeString(r.created_by_name)}</p>
<p><strong>Дата:</strong> ${new Date(r.created_at).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <p><strong>Причина:</strong> ${sanitizeString(r.reason || '-')}</p>
                                <p><strong>Примечания:</strong> ${sanitizeString(r.notes || '-')}</p>
                                
                                ${r.approved_by_name ? `
                                <hr>
                                <h6>Обработка</h6>
                                <p><strong>Обработал:</strong> ${sanitizeString(r.approved_by_name)}</p>
<p><strong>Дата обработки:</strong> ${new Date(r.approved_at).toLocaleDateString()}</p>
                                ` : ''}
                                
                                ${r.completed_at ? `
<p><strong>Дата выполнения:</strong> ${new Date(r.completed_at).toLocaleDateString()}</p>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-md-4">
                        <div class="card">
                            <div class="card-header">
                                <h5 class="mb-0">Действия</h5>
                            </div>
                            <div class="card-body">
                                ${userPermissions?.role === 'admin' && (r.status === 'pending' || r.status === 'processing') ? `
                                <button class="btn btn-success w-100 mb-2" onclick="showFulfillReplenishmentModal(${r.id})">
                                    <i class="bi bi-check-circle"></i> Выполнить
                                </button>
                                ${r.status === 'pending' ? `
                                <button class="btn btn-danger w-100 mb-2" onclick="rejectReplenishmentRequest(${r.id})">
                                    <i class="bi bi-x-circle"></i> Отклонить
                                </button>
                                ` : ''}
                                ` : ''}
                                
                                ${userPermissions?.role === 'admin' && (r.status === 'completed' || r.status === 'rejected') ? `
                                <button class="btn btn-danger w-100 mb-2" onclick="deleteReplenishmentRequest(${r.id})">
                                    <i class="bi bi-trash"></i> Удалить сведения о заявке
                                </button>
                                ` : ''}
                                
                                ${(r.status === 'completed' || fulfilledQuantity > 0) ? `
                                <button class="btn btn-info w-100 mb-2" onclick="showReplenishmentDocuments(${r.id})">
                                    <i class="bi bi-files"></i> Документы поставок
                                </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Получаем и отображаем все ТТН-1 по этой заявке
            // Получаем и отображаем все ТТН-1 по этой заявке
let documentsHtml = '';
try {
    const docsResponse = await fetch(`${API_BASE_URL}/api/replenishment-requests/${requestId}/documents`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const docsData = await docsResponse.json();
    
    if (docsData.success && docsData.documents && docsData.documents.length > 0) {
        documentsHtml = `
            <div class="card mt-4">
                <div class="card-header bg-info text-white">
                    <h6 class="mb-0">
                        <i class="bi bi-files me-2"></i> 
                        Сформированные документы (${docsData.documents.length})
                    </h6>
                </div>
                <div class="card-body">
                    <div class="list-group">
        `;
        
        docsData.documents.forEach((doc, index) => {
            const docDate = doc.document_date ? new Date(doc.document_date).toLocaleDateString('ru-RU') : 'дата не указана';
            const docNumber = doc.document_number || '№ не указан';
            
            documentsHtml += `
                <div class="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                        <span class="badge bg-secondary me-2">${index + 1}</span>
                        <i class="bi bi-file-text me-2 text-info"></i>
                        <strong>${sanitizeString(doc.document_type_name)}</strong>
                        <br>
                        <small class="document-number-text" style="color: inherit; opacity: 0.8;">№ ${sanitizeString(docNumber)} от ${docDate}</small>
                    </div>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-outline-primary" onclick="exportReplenishmentDocumentByNumber(${requestId}, '${docNumber}', 'html')" title="Просмотр">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-info" onclick="exportReplenishmentDocumentByNumber(${requestId}, '${docNumber}', 'docx')" title="Скачать DOCX">
                            <i class="bi bi-file-word"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        
        documentsHtml += `
                    </div>
                </div>
            </div>
        `;
    }
} catch (err) {
    console.error('Ошибка загрузки документов:', err);
    documentsHtml = `
        <div class="card mt-4">
            <div class="card-header bg-warning text-dark">
                <h6 class="mb-0">
                    <i class="bi bi-exclamation-triangle me-2"></i>
                    Ошибка загрузки документов
                </h6>
            </div>
            <div class="card-body text-center text-muted">
                Не удалось загрузить список документов.
            </div>
        </div>
    `;
}
            
            document.getElementById('content').innerHTML = mainHtml + documentsHtml;
        }
    } catch (error) {
        console.error('Ошибка загрузки заявки:', error);
        showError('Ошибка загрузки заявки');
    }
}
async function exportReplenishmentDocumentByNumber(requestId, documentNumber, format) {
    try {
        showInfo('Формирование документа...');
        
        const response = await fetch(`${API_BASE_URL}/api/replenishment-requests/${requestId}/export-document?type=ttn1&format=${format}&documentNumber=${encodeURIComponent(documentNumber)}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (!response.ok) {
            throw new Error('Ошибка при формировании документа');
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        let ext = format;
        if (format === 'excel') ext = 'xlsx';
        else if (format === 'docx') ext = 'docx';
        else if (format === 'html') ext = 'html';
        
        a.download = `TTN1_${documentNumber}.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showSuccess(`Документ экспортирован в ${format.toUpperCase()}`);
    } catch (error) {
        console.error('Ошибка экспорта:', error);
        showError('Ошибка экспорта документа: ' + error.message);
    }
}

async function rejectReplenishmentRequest(requestId) {
        const reason = prompt('Укажите причину отклонения заявки (необязательно):');

    if (!confirm('Отклонить заявку?')) return;
    
    const btn = event.target;
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Отклонение...';
    
   try {
        const response = await fetch(`${API_BASE_URL}/api/replenishment-requests/${requestId}/reject`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ reason: reason || '' })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showSuccess('Заявка отклонена');
            loadReplenishmentRequests();
        } else {
            showError(data.message);
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    } catch (error) {
        showError('Ошибка отклонения');
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

async function deleteReplenishmentRequest(requestId) {
    if (!confirm('Вы уверены, что хотите удалить сведения о заявке? Это действие нельзя отменить.')) return;
    
    const btn = event.target;
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Удаление...';
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/replenishment-requests/${requestId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showSuccess('Заявка удалена');
            loadReplenishmentRequests();
        } else {
            showError(data.message || 'Ошибка при удалении заявки');
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    } catch (error) {
        showError('Ошибка сети');
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

async function showReplenishmentDocuments(requestId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/replenishment-requests/${requestId}/documents`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const data = await response.json();
        
        if (data.success && data.documents && data.documents.length > 0) {
            displayReplenishmentDocumentsModal(data.documents, requestId);
        } else {
            showInfo('Для этой заявки еще нет сгенерированных документов');
        }
    } catch (error) {
        console.error('Ошибка загрузки документов:', error);
        showError('Ошибка загрузки документов');
    }
}

function displayReplenishmentDocumentsModal(documents, requestId) {
    window.currentReplenishmentRequestId = requestId;
    
    let docsHtml = '';
    documents.forEach((doc, index) => {
        const docDate = doc.document_date ? new Date(doc.document_date).toLocaleDateString() : 'Дата не указана';
        
        docsHtml += `
            <div class="list-group-item">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <span class="badge bg-secondary me-2">${index + 1}</span>
                        <i class="bi bi-file-text me-2 fs-5"></i>
                        <strong>${sanitizeString(doc.document_type_name)}</strong>
                        <br>
                        <small style="color: #000000; opacity: 0.7;">№ ${sanitizeString(doc.document_number)} от ${docDate}</small>
                    </div>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-outline-primary" onclick="exportReplenishmentDocumentByNumber(${requestId}, '${doc.document_number}', 'html')" title="Просмотр">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-info" onclick="exportReplenishmentDocumentByNumber(${requestId}, '${doc.document_number}', 'docx')" title="Скачать DOCX">
                            <i class="bi bi-file-word"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    
    const modalHtml = `
        <div class="modal fade" id="replenishmentDocumentsModal" tabindex="-1" data-bs-backdrop="static">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header bg-info text-white">
                        <h5 class="modal-title">
                            <i class="bi bi-files"></i> Документы по пополнению
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="list-group">
                            ${docsHtml}
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Закрыть</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const oldModal = document.getElementById('replenishmentDocumentsModal');
    if (oldModal) oldModal.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = new bootstrap.Modal(document.getElementById('replenishmentDocumentsModal'));
    modal.show();
}

async function exportReplenishmentDocument(docId, format) {
    try {
        const requestId = window.currentReplenishmentRequestId;
        
        if (!requestId) {
            showError('Не удалось определить заявку для экспорта');
            return;
        }
        const docType = docId === 1 ? 'tn' : 'ttn';
        
        showInfo('Формирование документа...');
        
        const response = await fetch(`${API_BASE_URL}/api/replenishment-requests/${requestId}/export-document?type=${docType}&format=${format}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (!response.ok) {
            throw new Error('Ошибка при формировании документа');
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        let ext = format;
        if (format === 'excel') ext = 'xlsx';
        else if (format === 'docx') ext = 'docx';
        
        a.download = `replenishment_${docType}_${requestId}.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showSuccess(`Документ экспортирован в ${format.toUpperCase()}`);
    } catch (error) {
        console.error('Ошибка экспорта:', error);
        showError('Ошибка экспорта документа: ' + error.message);
    }
}


let shipmentSearchTimeout;
let allShipmentRequests = []; // Храним все заявки

function applyShipmentFiltersDebounced() {
    clearTimeout(shipmentSearchTimeout);
    shipmentSearchTimeout = setTimeout(() => {
        filterShipmentRequests();
    }, 500);
}

// Фильтрация заявок на клиенте
function filterShipmentRequests() {
    const search = (document.getElementById('shipmentSearchInput')?.value || '').toLowerCase();
    const status = document.getElementById('shipmentStatusFilter')?.value || 'all';
    const dateFrom = document.getElementById('shipmentDateFrom')?.value || '';
    const dateTo = document.getElementById('shipmentDateTo')?.value || '';
    
    let filtered = [...allShipmentRequests];
    
    // Фильтр по поиску
    if (search) {
        filtered = filtered.filter(r => 
            (r.request_number && r.request_number.toLowerCase().includes(search)) ||
            (r.customer_name && r.customer_name.toLowerCase().includes(search)) ||
            (r.contract_number && r.contract_number.toLowerCase().includes(search))
        );
    }
    
    // Фильтр по статусу
    if (status !== 'all') {
        filtered = filtered.filter(r => r.status === status);
    }
    
    // Фильтр по дате
    if (dateFrom) {
        filtered = filtered.filter(r => {
            const date = new Date(r.created_at).toISOString().split('T')[0];
            return date >= dateFrom;
        });
    }
    if (dateTo) {
        filtered = filtered.filter(r => {
            const date = new Date(r.created_at).toISOString().split('T')[0];
            return date <= dateTo;
        });
    }
    
    // Обновляем таблицу
    renderShipmentRequestsTable(filtered);
    
    // Обновляем статистику
    const statsSpan = document.getElementById('shipmentFilterStats');
    if (statsSpan) {
        statsSpan.innerHTML = `Найдено: ${filtered.length} заявок`;
    }
}

// Отрисовка таблицы заявок
function renderShipmentRequestsTable(requests) {
    let html = '';
    
    if (requests && requests.length > 0) {
        requests.forEach(r => {
            let statusClass = '';
            let statusText = '';
            
            switch(r.status) {
                case 'new': statusClass = 'bg-secondary'; statusText = 'Новая'; break;
                case 'processing': statusClass = 'bg-info'; statusText = 'В обработке'; break;
                case 'partial': statusClass = 'bg-warning'; statusText = 'Частично отгружена'; break;
                case 'shipped': statusClass = 'bg-primary'; statusText = 'Отгружена'; break;
                case 'completed': statusClass = 'bg-success'; statusText = 'Завершена'; break;
                case 'cancelled': statusClass = 'bg-danger'; statusText = 'Отменена'; break;
                default: statusClass = 'bg-secondary'; statusText = r.status;
            }
            
            const canEditDelete = currentUser && currentUser.role === 'manager' && r.status === 'new';
            
            html += `
                <tr>
                    <td><code>${sanitizeString(r.request_number)}</code></td>
                    <td>${sanitizeString(r.assigned_to_name || '-')}</td>
                    <td>${sanitizeString(r.customer_name)}</td>
                    <td class="text-end">${r.total_amount ? Number(r.total_amount).toFixed(2) : '0'} руб.</td>
                    <td><span class="badge ${statusClass}">${statusText}</span></td>
                    <td>${sanitizeString(r.created_by_name || '-')}</td>
                    <td>${new Date(r.created_at).toLocaleDateString()}</td>
                    <td>${r.contract_number ? `<code>${sanitizeString(r.contract_number)}</code>` : '-'}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-info" onclick="viewShipmentRequest(${r.id})" title="Просмотр">
                            <i class="bi bi-eye"></i>
                        </button>
                        ${userPermissions?.can_process_shipment_requests && r.status === 'new' && !r.assigned_to ? `
                        <button class="btn btn-sm btn-outline-warning" onclick="showProcessShipmentModal(${r.id})" title="Взять в работу">
                            <i class="bi bi-play"></i>
                        </button>
                        ` : ''}
                        ${userPermissions?.can_process_shipment_requests && (r.status === 'processing' || r.status === 'partial') ? `
                        <button class="btn btn-sm btn-outline-success" onclick="showCompleteShipmentModal(${r.id})" title="Завершить отгрузку">
                            <i class="bi bi-check-circle"></i>
                        </button>
                        ` : ''}
                        ${canEditDelete ? `
                        <button class="btn btn-sm btn-outline-primary" onclick="editShipmentRequest(${r.id})" title="Редактировать">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteShipmentRequest(${r.id})" title="Удалить">
                            <i class="bi bi-trash"></i>
                        </button>
                        ` : ''}
                    </td>
                </tr>
            `;
        });
    } else {
        html = '<tr><td colspan="9" class="text-center">Нет заявок</td></tr>';
    }
    
    const tbody = document.querySelector('#shipmentRequestsTable tbody');
    if (tbody) {
        tbody.innerHTML = html;
    }
}

// Обновленная функция loadShipmentRequests
async function loadShipmentRequests() {
    if (!authToken || !userPermissions?.can_view_shipment_requests) {
         showError('Доступ запрещен');
         return;
     }
    
     document.getElementById('page-title').textContent = 'Заявки на отгрузку';
     document.getElementById('page-actions').innerHTML = `
         ${userPermissions.can_create_shipment_requests ? `
         <button class="btn btn-success btn-sm" onclick="showCreateShipmentRequestModal()">
             <i class="bi bi-plus"></i> Новая заявка
         </button>
         ` : ''}
     `;
    
     // Скрытые поля для хранения значений фильтров
     if (!document.getElementById('shipmentStatusFilter')) {
         const hiddenDiv = document.createElement('div');
         hiddenDiv.style.display = 'none';
         hiddenDiv.innerHTML = `
             <input type="hidden" id="shipmentStatusFilter" value="all">
             <input type="hidden" id="shipmentSortBy" value="created_desc">
             <input type="hidden" id="shipmentDateFrom">
             <input type="hidden" id="shipmentDateTo">
         `;
         document.body.appendChild(hiddenDiv);
     }
    
     document.getElementById('content').innerHTML = `
         <div class="card mb-3">
             <div class="card-body py-2">
                 <div class="row g-2 align-items-center">
                     <div class="col-md-5">
                         <div class="d-flex gap-2">
                             <input type="text" class="form-control" id="shipmentSearchInput" 
                                    placeholder="Поиск по номеру, покупателю, договору..." 
                                    autocomplete="off"
                                    onkeyup="applyShipmentFiltersDebounced()">
                             <button class="btn btn-outline-secondary" type="button" onclick="resetShipmentSearch()" title="Очистить">
                                 <i class="bi bi-x-lg"></i>
                             </button>
                         </div>
                     </div>
                     <div class="col-md-3">
                         <button class="btn btn-primary" onclick="showShipmentFiltersModal()">
                             <i class="bi bi-funnel"></i> Фильтры
                            <span id="shipmentActiveFiltersBadge" class="badge bg-danger ms-1" style="display: none;">0</span>
                         </button>
                         <button class="btn btn-secondary ms-2" onclick="resetShipmentFilters()" title="Сбросить все фильтры">
                             <i class="bi bi-eraser"></i>
                         </button>
                     </div>
                     <div class="col-md-4 text-end">
                         <span class="text-muted" id="shipmentFilterStats"></span>
                     </div>
                 </div>
             </div>
         </div>
        
         <div class="card">
             <div class="card-header">
                 <h5 class="mb-0">Список заявок на отгрузку</h5>
             </div>
             <div class="card-body">
                 <div class="table-responsive">
                     <table class="table table-hover" id="shipmentRequestsTable">
                         <thead>
                             <tr>
                                 <th>Номер</th>
                                 <th>Ответственный</th>
                                 <th>Покупатель</th>
                                 <th>Сумма</th>
                                 <th>Статус</th>
                                 <th>Создал</th>
                                 <th>Дата</th>
                                 <th>Договор</th>
                                 <th>Действия</th>
                             </tr>
                         </thead>
                         <tbody>
                             <tr><td colspan="9" class="text-center"><div class="spinner-border spinner-border-sm"></div> Загрузка...</td></tr>
                         </tbody>
                     </table>
                </div>
            </div>
         </div>
     `;
    
     try {
         const response = await fetch(`${API_BASE_URL}/api/shipment-requests?userRole=${currentUser?.role}`, {
             headers: { 'Authorization': `Bearer ${authToken}` }
         });
        
        const data = await response.json();
        
         if (data.success) {
//             // Сохраняем все заявки
             allShipmentRequests = data.requests || [];
            
//             // Отрисовываем таблицу
             renderShipmentRequestsTable(allShipmentRequests);
            
//             // Обновляем статистику
             const statsSpan = document.getElementById('shipmentFilterStats');
             if (statsSpan) {
                 statsSpan.innerHTML = `Всего: ${allShipmentRequests.length} заявок`;
             }
         }
     } catch (error) {
         console.error('Ошибка загрузки заявок:', error);
         showError('Ошибка загрузки заявок');
     }
 }

function updateShipmentActiveFiltersBadge() {
    const status = document.getElementById('shipmentStatusFilter')?.value || 'all';
    const dateFrom = document.getElementById('shipmentDateFrom')?.value || '';
    const dateTo = document.getElementById('shipmentDateTo')?.value || '';
    
    let activeCount = 0;
    if (status !== 'all') activeCount++;
    if (dateFrom) activeCount++;
    if (dateTo) activeCount++;
    
    const badge = document.getElementById('shipmentActiveFiltersBadge');
    if (badge) {
        if (activeCount > 0) {
            badge.textContent = activeCount;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    }
}
function showShipmentFiltersModal() {
    const currentStatus = document.getElementById('shipmentStatusFilter')?.value || 'all';
    const currentDateFrom = document.getElementById('shipmentDateFrom')?.value || '';
    const currentDateTo = document.getElementById('shipmentDateTo')?.value || '';
    
    // Формируем список статусов в зависимости от роли
    let statusOptions = '';
    
    if (currentUser?.role === 'employee') {
        // Для сотрудника - только новые и в обработке, частично отгружена
        statusOptions = `
            <option value="all" ${currentStatus === 'all' ? 'selected' : ''}>Все</option>
            <option value="new" ${currentStatus === 'new' ? 'selected' : ''}>Новая</option>
            <option value="processing" ${currentStatus === 'processing' ? 'selected' : ''}>В обработке</option>
            <option value="partial" ${currentStatus === 'partial' ? 'selected' : ''}>Частично отгружена</option>
        `;
    } else {
        // Для админа и менеджера - все статусы
        statusOptions = `
            <option value="all" ${currentStatus === 'all' ? 'selected' : ''}>Все</option>
            <option value="new" ${currentStatus === 'new' ? 'selected' : ''}>Новая</option>
            <option value="processing" ${currentStatus === 'processing' ? 'selected' : ''}>В обработке</option>
            <option value="partial" ${currentStatus === 'partial' ? 'selected' : ''}>Частично отгружена</option>
            <option value="shipped" ${currentStatus === 'shipped' ? 'selected' : ''}>Отгружена</option>
        `;
    }
    
    const modalHtml = `
        <div class="modal fade" id="shipmentFiltersModal" tabindex="-1" data-bs-backdrop="static">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title"><i class="bi bi-funnel"></i> Фильтры заявок</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <label class="form-label fw-bold">Статус заявки</label>
                            <select class="form-select" id="filterShipmentStatus">
                                ${statusOptions}
                            </select>
                        </div>
                        <div class="mb-3">
                            <label class="form-label fw-bold">Период создания</label>
                            <div class="row g-2">
                                <div class="col-6">
                                    <input type="date" class="form-control" id="filterShipmentDateFrom" value="${currentDateFrom}" placeholder="Дата от">
                                </div>
                                <div class="col-6">
                                    <input type="date" class="form-control" id="filterShipmentDateTo" value="${currentDateTo}" placeholder="Дата до">
                                </div>
                            </div>
                        </div>
                        <hr>
                        <div class="d-flex justify-content-between">
                            <button type="button" class="btn btn-secondary" onclick="resetShipmentFiltersAndCloseModal()">
                                <i class="bi bi-eraser"></i> Сбросить все
                            </button>
                            <div>
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Отмена</button>
                                <button type="button" class="btn btn-primary" onclick="applyShipmentFiltersFromModal()">
                                    <i class="bi bi-check-lg"></i> Применить
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const oldModal = document.getElementById('shipmentFiltersModal');
    if (oldModal) oldModal.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = new bootstrap.Modal(document.getElementById('shipmentFiltersModal'));
    modal.show();
}

function applyShipmentFiltersFromModal() {
    const status = document.getElementById('filterShipmentStatus')?.value || 'all';
    const dateFrom = document.getElementById('filterShipmentDateFrom')?.value || '';
    const dateTo = document.getElementById('filterShipmentDateTo')?.value || '';
    
    document.getElementById('shipmentStatusFilter').value = status;
    document.getElementById('shipmentDateFrom').value = dateFrom;
    document.getElementById('shipmentDateTo').value = dateTo;
    
    const modal = bootstrap.Modal.getInstance(document.getElementById('shipmentFiltersModal'));
    if (modal) modal.hide();
    
    updateShipmentActiveFiltersBadge();
    filterShipmentRequests();
}

function resetShipmentFilters() {
    document.getElementById('shipmentStatusFilter').value = 'all';
    document.getElementById('shipmentDateFrom').value = '';
    document.getElementById('shipmentDateTo').value = '';
    document.getElementById('shipmentSearchInput').value = '';
    
    updateShipmentActiveFiltersBadge();
    filterShipmentRequests();
}

function resetShipmentFiltersAndCloseModal() {
    document.getElementById('filterShipmentStatus').value = 'all';
    document.getElementById('filterShipmentDateFrom').value = '';
    document.getElementById('filterShipmentDateTo').value = '';
    applyShipmentFiltersFromModal();
}

function resetShipmentSearch() {
    const searchInput = document.getElementById('shipmentSearchInput');
    if (searchInput) {
        searchInput.value = '';
        filterShipmentRequests();
    }
}

async function deleteShipmentRequest(requestId) {
    if (!confirm('Вы уверены, что хотите удалить сведения о заявке? Это действие нельзя отменить.')) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/shipment-requests/${requestId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showSuccess('Заявка удалена');
            loadShipmentRequests();
        } else {
            showError(data.message || 'Ошибка при удалении заявки');
        }
    } catch (error) {
        console.error('Ошибка удаления заявки:', error);
        showError('Ошибка удаления заявки: ' + error.message);
    }
}

async function editShipmentRequest(requestId) {
    if (!authToken) {
        showError('Не авторизован');
        return;
    }
    
    try {
        // Получаем данные заявки
        const response = await fetch(`${API_BASE_URL}/api/shipment-requests/${requestId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const data = await response.json();
        
        if (!data.success) {
            showError('Ошибка загрузки данных заявки');
            return;
        }
        
        const request = data.request;
        const items = data.items || [];
        
        // Проверяем, можно ли редактировать
        if (request.status !== 'new') {
            showError('Редактирование возможно только для новых заявок');
            return;
        }
        
        if (request.assigned_to) {
            showError('Редактирование невозможно: заявка уже взята в работу');
            return;
        }
        
        // Загружаем список приборов
        const devicesResponse = await fetch(`${API_BASE_URL}/api/devices?pageSize=1000`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const devicesData = await devicesResponse.json();
        
        let deviceOptions = '';
        if (devicesData.success && devicesData.devices) {
            devicesData.devices.forEach(d => {
                deviceOptions += `<option value="${d.id}" data-price="${d.price || 0}" data-stock="${d.quantity || 0}">${escapeHtml(d.unique_id)} - ${escapeHtml(d.name)} (в наличии: ${d.quantity || 0})</option>`;
            });
        }
        
        // Формируем HTML для позиций с "шт" и "руб"
        let itemsHtml = '';
        items.forEach((item, index) => {
            itemsHtml += `
                <div class="row mb-2 item-row" data-index="${index}">
                    <div class="col-md-5">
                        <select class="form-select device-select" required>
                            <option value="">Выберите прибор</option>
                            ${deviceOptions.replace(`value="${item.device_id}"`, `value="${item.device_id}" selected`)}
                        </select>
                        <div class="invalid-feedback">Выберите прибор</div>
                    </div>
                    <div class="col-md-2">
                        <div class="input-group">
                            <input type="number" class="form-control quantity-input" value="${item.quantity_requested}" min="1" max="9999999" step="1" required
                                   oninput="validatePositiveInteger(this); window.limitQuantityDigits(this, 7)"
                                   onkeypress="return isNumberKey(event)">
                            <span class="input-group-text">шт</span>
                        </div>
                        <div class="invalid-feedback">Введите положительное целое число (не более 7 цифр)</div>
                    </div>
                    <div class="col-md-2">
                        <div class="input-group">
                            <input type="number" class="form-control price-input" value="${item.price_per_unit}" step="0.01" min="0.01" required readonly>
                            <span class="input-group-text">руб</span>
                        </div>
                        <div class="invalid-feedback">Цена автоматически берется из прибора</div>
                    </div>
                    <div class="col-md-2">
                        <span class="form-control-plaintext stock-info">${item.quantity_shipped || 0} отгружено</span>
                    </div>
                    <div class="col-md-1">
                        <button type="button" class="btn btn-outline-danger remove-item" ${items.length === 1 ? 'disabled' : ''}>×</button>
                    </div>
                </div>
            `;
        });
        
        // Форматируем даты
        let requiredDateValue = '';
        if (request.required_date) {
            const date = new Date(request.required_date);
            if (!isNaN(date.getTime())) {
                requiredDateValue = date.toISOString().split('T')[0];
            }
        }
        
        // Определяем need_vehicle
        const needVehicle = request.need_vehicle === 1 || request.need_vehicle === true;
        
        // Разбираем автомобиль на марку и номер (если есть)
        let vehicleMake = '';
        let vehicleNumber = '';
        let trailerMake = '';
        let trailerNumber = '';
        let driverLastName = '';
        let driverFirstName = '';
        let driverMiddleName = '';
        
        if (needVehicle && request.vehicle_number) {
            const vehicleFull = request.vehicle_number;
            const lastSpaceIndex = vehicleFull.lastIndexOf(' ');
            if (lastSpaceIndex > 0) {
                vehicleMake = vehicleFull.substring(0, lastSpaceIndex);
                vehicleNumber = vehicleFull.substring(lastSpaceIndex + 1);
            } else {
                vehicleMake = vehicleFull;
                vehicleNumber = '';
            }
        }
        
        if (needVehicle && request.trailer_number) {
            const trailerFull = request.trailer_number;
            const lastSpaceIndex = trailerFull.lastIndexOf(' ');
            if (lastSpaceIndex > 0) {
                trailerMake = trailerFull.substring(0, lastSpaceIndex);
                trailerNumber = trailerFull.substring(lastSpaceIndex + 1);
            } else {
                trailerMake = trailerFull;
                trailerNumber = '';
            }
        }
        
        console.log('Данные водителя из БД:', {
    driver_last_name: request.driver_last_name,
    driver_first_name: request.driver_first_name,
    driver_middle_name: request.driver_middle_name
});

if (needVehicle) {
    driverLastName = request.driver_last_name || '';
    driverFirstName = request.driver_first_name || '';
    driverMiddleName = request.driver_middle_name || '';
}
        
        // Извлекаем телефон без префикса +375
        let phoneValue = '';
        if (request.customer_phone) {
            phoneValue = request.customer_phone.replace('+375', '');
        }
        
        // Получаем реквизиты
        let bankAccountValue = request.buyer_bank_account || '';
        let bankCodeValue = request.buyer_bank_code || '';
        let bankNameValue = request.buyer_bank_name || '';
        const buyerLegalAddressValue = request.buyer_legal_address || request.customer_address || '';
        
        // Формируем блок данных автомобиля (если нужен)
        let vehicleBlockHtml = '';
        if (needVehicle) {
            vehicleBlockHtml = `
                <div class="border rounded p-3 mb-3" style="background-color: rgba(37, 99, 235, 0.1);">
                    <h6 class="mb-3"><i class="bi bi-truck"></i> Данные автомобиля</h6>
                    <div class="row">
                        <div class="col-md-6 mb-2">
                            <label class="form-label required">Марка автомобиля</label>
                            <input type="text" class="form-control" id="editVehicleMake" name="vehicle_make" 
                                   value="${escapeHtml(vehicleMake)}" placeholder="МАЗ-5440" maxlength="50" required>
                            <div class="invalid-feedback">Введите марку автомобиля</div>
                        </div>
                        <div class="col-md-6 mb-2">
                            <label class="form-label required">Госномер автомобиля</label>
                            <input type="text" class="form-control" id="editVehicleNumber" name="vehicle_number" 
                                   value="${escapeHtml(vehicleNumber)}" placeholder="АА1234-7" maxlength="20" required>
                            <div class="invalid-feedback">Введите госномер автомобиля</div>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-md-6 mb-2">
                            <label class="form-label required">Марка прицепа</label>
                            <input type="text" class="form-control" id="editTrailerMake" name="trailer_make" 
                                   value="${escapeHtml(trailerMake)}" placeholder="МАЗ-856100" maxlength="50" required>
                            <div class="invalid-feedback">Введите марку прицепа</div>
                        </div>
                        <div class="col-md-6 mb-2">
                            <label class="form-label required">Госномер прицепа</label>
                            <input type="text" class="form-control" id="editTrailerNumber" name="trailer_number" 
                                   value="${escapeHtml(trailerNumber)}" placeholder="АА5678-7" maxlength="20" required>
                            <div class="invalid-feedback">Введите госномер прицепа</div>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-md-6 mb-2">
                            <label class="form-label required">К путевому листу №</label>
                            <input type="text" class="form-control" id="editWaybillNumber" name="waybill_number" 
                                   value="${escapeHtml(request.waybill_number_ttn || '')}" placeholder="№ путевого листа" maxlength="50" required>
                            <div class="invalid-feedback">Введите номер путевого листа</div>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-md-4 mb-2">
                            <label class="form-label required">Фамилия водителя</label>
                            <input type="text" class="form-control" id="editDriverLastName" name="driver_last_name" 
                                   value="${escapeHtml(driverLastName)}" maxlength="50" required 
                                   oninput="this.value = this.value.replace(/[<>]/g, '')">
                            <div class="invalid-feedback">Введите фамилию водителя</div>
                        </div>
                        <div class="col-md-4 mb-2">
                            <label class="form-label required">Имя водителя</label>
                            <input type="text" class="form-control" id="editDriverFirstName" name="driver_first_name" 
                                   value="${escapeHtml(driverFirstName)}" maxlength="50" required 
                                   oninput="this.value = this.value.replace(/[<>]/g, '')">
                            <div class="invalid-feedback">Введите имя водителя</div>
                        </div>
                        <div class="col-md-4 mb-2">
                            <label class="form-label">Отчество водителя</label>
                            <input type="text" class="form-control" id="editDriverMiddleName" name="driver_middle_name" 
                                   value="${escapeHtml(driverMiddleName)}" maxlength="50" 
                                   oninput="this.value = this.value.replace(/[<>]/g, '')">
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-md-12 mb-2">
                            <label class="form-label required">Доверенность (номер, дата)</label>
                            <input type="text" class="form-control" id="editPowerOfAttorney" name="power_of_attorney" 
                                   value="${escapeHtml(request.power_of_attorney || '')}" placeholder="№ 123 от 01.01.2024" maxlength="100" required>
                            <div class="invalid-feedback">Введите доверенность (номер и дату)</div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        const modalHtml = `
        <div class="modal fade" id="editShipmentRequestModal" tabindex="-1" data-bs-backdrop="static">
            <div class="modal-dialog modal-xl">
                <div class="modal-content">
                    <div class="modal-header ${needVehicle ? 'bg-success' : 'bg-primary'} text-white">
                        <h5 class="modal-title">
                            <i class="bi bi-pencil"></i> Редактирование заявки ${escapeHtml(request.request_number)}
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <form id="editShipmentRequestForm" novalidate>
                        <div class="modal-body">
                            <input type="hidden" id="editRequestId" value="${requestId}">
                            <input type="hidden" name="need_vehicle" value="${needVehicle ? '1' : '0'}">
                            
                            <!-- ОСНОВНЫЕ ДАННЫЕ КЛИЕНТА -->
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label required">Организация</label>
                                    <input type="text" class="form-control" id="editCustomerName" name="customer_name" 
                                           value="${escapeHtml(request.customer_name)}" required
                                           maxlength="255" autocomplete="off" placeholder='ООО "Ромашка"'>
                                    <div class="invalid-feedback">Введите название организации</div>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label required">Контактное лицо</label>
                                    <input type="text" class="form-control" id="editCustomerContact" name="customer_contact" 
                                           value="${escapeHtml(request.customer_contact || '')}" required
                                           maxlength="255" autocomplete="off">
                                    <div class="invalid-feedback">Введите контактное лицо</div>
                                </div>
                            </div>
                            
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label required">УНП</label>
                                    <input type="text" class="form-control" id="editCustomerUnp" name="customer_unp" 
                                           value="${escapeHtml(request.customer_unp || '')}" required 
                                           pattern="\\d{9}" maxlength="9" 
                                           autocomplete="off"
                                           oninput="this.value = this.value.replace(/[^\\d]/g, '')"
                                           placeholder="123456789">
                                    <div class="invalid-feedback">УНП должен содержать ровно 9 цифр</div>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label required">Адрес (почтовый)</label>
                                    <input type="text" class="form-control" id="editCustomerAddress" name="customer_address" 
                                           value="${escapeHtml(request.customer_address || '')}" required
                                           maxlength="500" autocomplete="off"
                                           placeholder="г. Минск, ул. Примерная, д. 1">
                                    <div class="invalid-feedback">Введите адрес организации</div>
                                </div>
                            </div>
                            
                            <!-- ПОЛЯ: Телефон и Директор -->
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label required">Телефон</label>
                                    <div class="input-group">
                                        <span class="input-group-text">+375</span>
                                        <input type="tel" class="form-control" id="editCustomerPhone" name="customer_phone"
                                               value="${escapeHtml(phoneValue)}" 
                                               maxlength="9" autocomplete="off" required
                                               oninput="validatePhoneInputEdit(this)"
                                               placeholder="291234567">
                                    </div>
                                    <div class="invalid-feedback" id="editCustomerPhoneFeedback">Введите 9 цифр после +375 (например, 291234567)</div>
                                    <div class="form-text">Введите 9 цифр (код оператора + номер)</div>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label required">Директор (ФИО)</label>
                                    <input type="text" class="form-control" id="editCustomerDirector" name="customer_director" 
                                           value="${escapeHtml(request.customer_director || '')}" required
                                           maxlength="255" autocomplete="off"
                                           placeholder="Иванов Иван Иванович">
                                    <div class="invalid-feedback">Введите ФИО директора</div>
                                </div>
                            </div>
                            
                            <!-- РЕКВИЗИТЫ ПОКУПАТЕЛЯ -->
                            <div class="border rounded p-3 mb-3" style="background-color: rgba(40, 167, 69, 0.05);">
                                <h6 class="mb-3"><i class="bi bi-building"></i> Юридические реквизиты покупателя</h6>
                                <div class="row">
                                    <div class="col-md-12 mb-2">
                                        <label class="form-label required">Юридический адрес</label>
                                        <input type="text" class="form-control" id="editBuyerLegalAddress" name="buyer_legal_address" required
                                               value="${escapeHtml(buyerLegalAddressValue)}"
                                               maxlength="500" autocomplete="off" 
                                               placeholder="г. Минск, ул. Юридическая, д. 10">
                                        <div class="invalid-feedback">Введите юридический адрес</div>
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-md-6 mb-2">
                                        <label class="form-label required">Расчетный счет</label>
                                        <input type="text" class="form-control" id="editBankAccount" name="buyer_bank_account" required
                                               value="${escapeHtml(bankAccountValue)}"
                                               maxlength="28" autocomplete="off" 
                                               placeholder="BY00ABCD12345678901234567890"
                                               oninput="validateBankAccountEdit(this)"
                                               onblur="validateBankAccountEdit(this)">
                                        <div class="invalid-feedback" id="editBankAccountFeedback">Формат: BY + 2 цифры + 4 буквы + 20 цифр (всего 28)</div>
                                        <div class="form-text">Пример: BY00ABCD12345678901234567890</div>
                                    </div>
                                    <div class="col-md-6 mb-2">
                                        <label class="form-label required">Код банка (БИК/МФО)</label>
                                        <input type="text" class="form-control" id="editBankCode" name="buyer_bank_code" required
                                               value="${escapeHtml(bankCodeValue)}"
                                               maxlength="8" autocomplete="off" 
                                               placeholder="XXXXBY00"
                                               oninput="validateBankCodeEdit(this)"
                                               onblur="validateBankCodeEdit(this)">
                                        <div class="invalid-feedback" id="editBankCodeFeedback">Формат: 4 буквы + BY + 2 цифры (всего 8)</div>
                                        <div class="form-text">Пример: BPSBBY2X</div>
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-md-12 mb-2">
                                        <label class="form-label required">Наименование банка</label>
                                        <input type="text" class="form-control" id="editBankName" name="buyer_bank_name" required
                                               value="${escapeHtml(bankNameValue)}"
                                               maxlength="255" autocomplete="off" 
                                               placeholder='ОАО "Беларусбанк"'>
                                        <div class="invalid-feedback">Введите наименование банка</div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label required">Желаемая дата отгрузки</label>
                                    <input type="date" class="form-control" id="editRequiredDate" name="required_date" required
                                           value="${requiredDateValue}">
                                    <div class="invalid-feedback">Укажите желаемую дату отгрузки</div>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Примечания</label>
                                    <input type="text" class="form-control" id="editNotes" name="notes" 
                                           value="${escapeHtml(request.notes || '')}" maxlength="1000"
                                           autocomplete="off">
                                </div>
                            </div>
                            
                            ${vehicleBlockHtml}
                            
                            <h6 class="mt-4">Позиции для отгрузки</h6>
                            <div id="editShipmentItems">
                                ${itemsHtml}
                            </div>
                            
                            <button type="button" class="btn btn-sm btn-outline-primary mt-2" id="addEditShipmentItem">
                                <i class="bi bi-plus"></i> Добавить позицию
                            </button>
                            
                            <div class="mt-3 text-end">
                                <strong>Итого: <span id="editShipmentTotal">0.00</span> руб.</strong>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Отмена</button>
                            <button type="submit" class="btn ${needVehicle ? 'btn-success' : 'btn-primary'}">Сохранить изменения</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
        `;
        
        const oldModal = document.getElementById('editShipmentRequestModal');
        if (oldModal) oldModal.remove();
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
                
        window.validatePhoneInputEdit = function(input) {
            let phone = input.value.trim();
            const feedback = document.getElementById('editCustomerPhoneFeedback');
            
            const digitsOnly = phone.replace(/[^\d]/g, '');
            
            if (!digitsOnly) {
                input.classList.add('is-invalid');
                if (feedback) feedback.textContent = 'Введите номер телефона (9 цифр)';
                return false;
            }
            
            if (digitsOnly.length !== 9) {
                input.classList.add('is-invalid');
                if (feedback) feedback.textContent = `Введите ровно 9 цифр (сейчас ${digitsOnly.length})`;
                return false;
            }
            
            const firstDigit = digitsOnly.charAt(0);
            if (!['2', '3', '4', '5'].includes(firstDigit)) {
                input.classList.add('is-invalid');
                if (feedback) feedback.textContent = 'Некорректный код оператора (должен начинаться с 2,3,4,5)';
                return false;
            }
            
            input.classList.remove('is-invalid');
            input.classList.add('is-valid');
            return true;
        };
        
        window.validateBankAccountEdit = function(input) {
            const value = input.value.trim().toUpperCase();
            const feedback = document.getElementById('editBankAccountFeedback');
            
            if (!value) {
                input.classList.add('is-invalid');
                if (feedback) feedback.textContent = 'Введите расчетный счет';
                return false;
            }
            
            if (value.length !== 28) {
                input.classList.add('is-invalid');
                if (feedback) feedback.textContent = 'Расчетный счет должен содержать ровно 28 символов';
                return false;
            }
            
            if (!value.startsWith('BY')) {
                input.classList.add('is-invalid');
                if (feedback) feedback.textContent = 'Расчетный счет должен начинаться с "BY"';
                return false;
            }
            
            const thirdChar = value.charAt(2);
            const fourthChar = value.charAt(3);
            if (!/^\d$/.test(thirdChar) || !/^\d$/.test(fourthChar)) {
                input.classList.add('is-invalid');
                if (feedback) feedback.textContent = 'После "BY" должны следовать 2 цифры (например, BY00...)';
                return false;
            }
            
            const fifthToEighth = value.substring(4, 8);
            if (!/^[A-Z]{4}$/.test(fifthToEighth)) {
                input.classList.add('is-invalid');
                if (feedback) feedback.textContent = 'Символы 5-8 должны быть буквами (A-Z)';
                return false;
            }
            
            const remaining = value.substring(8);
            if (!/^\d{20}$/.test(remaining)) {
                input.classList.add('is-invalid');
                if (feedback) feedback.textContent = 'Последние 20 символов должны быть только цифрами';
                return false;
            }
            
            input.classList.remove('is-invalid');
            input.classList.add('is-valid');
            return true;
        };
        
        window.validateBankCodeEdit = function(input) {
            const value = input.value.trim().toUpperCase();
            const feedback = document.getElementById('editBankCodeFeedback');
            
            if (!value) {
                input.classList.add('is-invalid');
                if (feedback) feedback.textContent = 'Введите код банка';
                return false;
            }
            
            if (value.length !== 8) {
                input.classList.add('is-invalid');
                if (feedback) feedback.textContent = 'Код банка должен содержать ровно 8 символов';
                return false;
            }
            
            const firstFour = value.substring(0, 4);
            if (!/^[A-Z]{4}$/.test(firstFour)) {
                input.classList.add('is-invalid');
                if (feedback) feedback.textContent = 'Первые 4 символа должны быть буквами (A-Z)';
                return false;
            }
            
            const fifthSixth = value.substring(4, 6);
            if (fifthSixth !== 'BY') {
                input.classList.add('is-invalid');
                if (feedback) feedback.textContent = '5-й и 6-й символы должны быть "BY"';
                return false;
            }
            
            const lastTwo = value.substring(6, 8);
            if (!/^\d{2}$/.test(lastTwo)) {
                input.classList.add('is-invalid');
                if (feedback) feedback.textContent = 'Последние 2 символа должны быть цифрами';
                return false;
            }
            
            input.classList.remove('is-invalid');
            input.classList.add('is-valid');
            return true;
        };
        
        window.limitQuantityDigits = function(input, maxDigits) {
            let value = input.value;
            if (value.length > maxDigits) {
                input.value = value.slice(0, maxDigits);
            }
            if (parseInt(input.value) > 9999999) {
                input.value = 9999999;
            }
        };
        
        // Автоматическое форматирование телефона
        const phoneInput = document.getElementById('editCustomerPhone');
        if (phoneInput) {
            phoneInput.addEventListener('input', function(e) {
                let value = this.value.replace(/[^\d]/g, '');
                if (value.length > 9) {
                    value = value.slice(0, 9);
                }
                this.value = value;
                validatePhoneInputEdit(this);
            });
        }
        
        function updateEditShipmentTotal() {
            let total = 0;
            document.querySelectorAll('#editShipmentItems .item-row').forEach(row => {
                const quantity = parseFloat(row.querySelector('.quantity-input').value) || 0;
                const price = parseFloat(row.querySelector('.price-input').value) || 0;
                total += quantity * price;
            });
            const totalSpan = document.getElementById('editShipmentTotal');
            if (totalSpan) totalSpan.textContent = total.toFixed(2);
        }
        
        // Обработчики для существующих позиций
        document.querySelectorAll('#editShipmentItems .device-select').forEach(select => {
            select.addEventListener('change', function() {
                const selected = this.options[this.selectedIndex];
                const price = selected.dataset.price || 0;
                const row = this.closest('.item-row');
                const priceInput = row.querySelector('.price-input');
                priceInput.value = price;
                updateEditShipmentTotal();
            });
        });
        
        document.querySelectorAll('#editShipmentItems .quantity-input').forEach(input => {
            input.addEventListener('input', function() {
                window.limitQuantityDigits(this, 7);
                updateEditShipmentTotal();
            });
        });
        
        // Добавление новой позиции
        document.getElementById('addEditShipmentItem').addEventListener('click', function() {
            const container = document.getElementById('editShipmentItems');
            const newRow = document.createElement('div');
            newRow.className = 'row mb-2 item-row';
            newRow.innerHTML = `
                <div class="col-md-5">
                    <select class="form-select device-select" required>
                        <option value="">Выберите прибор</option>
                        ${deviceOptions}
                    </select>
                    <div class="invalid-feedback">Выберите прибор</div>
                </div>
                <div class="col-md-2">
                    <div class="input-group">
                        <input type="number" class="form-control quantity-input" value="1" min="1" max="9999999" step="1" required
                               oninput="validatePositiveInteger(this); window.limitQuantityDigits(this, 7)"
                               onkeypress="return isNumberKey(event)">
                        <span class="input-group-text">шт</span>
                    </div>
                    <div class="invalid-feedback">Введите положительное целое число (не более 7 цифр)</div>
                </div>
                <div class="col-md-2">
                    <div class="input-group">
                        <input type="number" class="form-control price-input" value="0" step="0.01" min="0.01" required readonly>
                        <span class="input-group-text">руб</span>
                    </div>
                    <div class="invalid-feedback">Цена автоматически берется из прибора</div>
                </div>
                <div class="col-md-2">
                    <span class="form-control-plaintext stock-info">0 отгружено</span>
                </div>
                <div class="col-md-1">
                    <button type="button" class="btn btn-outline-danger remove-item">×</button>
                </div>
            `;
            
            container.appendChild(newRow);
            
            const newQuantity = newRow.querySelector('.quantity-input');
            newQuantity.addEventListener('input', function() {
                window.limitQuantityDigits(this, 7);
                updateEditShipmentTotal();
            });
            
            newRow.querySelector('.device-select').addEventListener('change', function() {
                const selected = this.options[this.selectedIndex];
                const price = selected.dataset.price || 0;
                const row = this.closest('.item-row');
                const priceInput = row.querySelector('.price-input');
                priceInput.value = price;
                updateEditShipmentTotal();
            });
            
            newRow.querySelector('.remove-item').addEventListener('click', function() {
                const rows = document.querySelectorAll('#editShipmentItems .item-row');
                if (rows.length > 1) {
                    this.closest('.item-row').remove();
                    updateEditShipmentTotal();
                }
            });
            
            updateEditShipmentTotal();
        });
        
        // Удаление позиции
        document.querySelectorAll('#editShipmentItems .remove-item').forEach(btn => {
            btn.addEventListener('click', function() {
                const rows = document.querySelectorAll('#editShipmentItems .item-row');
                if (rows.length > 1) {
                    this.closest('.item-row').remove();
                    updateEditShipmentTotal();
                }
            });
        });
        
        updateEditShipmentTotal();
        
        const modal = new bootstrap.Modal(document.getElementById('editShipmentRequestModal'));
        
        // Обработчик отправки формы
        document.getElementById('editShipmentRequestForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const form = e.target;
            form.classList.add('was-validated');
            
            // Сохраняем значение телефона с префиксом +375
            let customerPhone = '';
            const phoneDigits = document.getElementById('editCustomerPhone')?.value || '';
            if (phoneDigits && phoneDigits.trim()) {
                customerPhone = '+375' + phoneDigits.trim();
            }
            
            const customerName = document.getElementById('editCustomerName').value;
            const customerContact = document.getElementById('editCustomerContact').value;
            const customerUnp = document.getElementById('editCustomerUnp').value;
            const customerAddress = document.getElementById('editCustomerAddress').value;
            const customerDirector = document.getElementById('editCustomerDirector')?.value || '';
            const requiredDate = document.getElementById('editRequiredDate').value;
            const needVehicle = document.querySelector('input[name="need_vehicle"]')?.value === '1';
            
            // Валидация
            if (!customerName) {
                showError('Введите название организации');
                return;
            }
            if (!customerContact) {
                showError('Введите контактное лицо');
                return;
            }
            if (!customerUnp || !/^\d{9}$/.test(customerUnp)) {
                showError('УНП должен содержать ровно 9 цифр');
                return;
            }
            if (!customerAddress) {
                showError('Введите адрес организации');
                return;
            }
            if (!customerDirector) {
                showError('Введите ФИО директора');
                return;
            }
            if (!requiredDate) {
                showError('Укажите желаемую дату отгрузки');
                return;
            }
            if (!isFutureDate(requiredDate)) {
                showError('Дата отгрузки не может быть в прошлом');
                return;
            }
            
            // Валидация телефона
            const phoneInputEl = document.getElementById('editCustomerPhone');
            if (!phoneInputEl || !phoneInputEl.value.trim()) {
                showError('Введите номер телефона');
                return;
            }
            if (!validatePhoneInputEdit(phoneInputEl)) {
                showError('Введите корректный номер телефона (9 цифр после +375)');
                return;
            }
            
            // Валидация реквизитов
            const buyerLegalAddress = document.getElementById('editBuyerLegalAddress')?.value;
            if (!buyerLegalAddress) {
                showError('Введите юридический адрес');
                return;
            }
            
            const bankAccountInputEl = document.getElementById('editBankAccount');
            if (!bankAccountInputEl || !bankAccountInputEl.value.trim()) {
                showError('Введите расчетный счет');
                return;
            }
            if (!validateBankAccountEdit(bankAccountInputEl)) {
                showError('Расчетный счет заполнен неверно');
                return;
            }
            
            const bankCodeInputEl = document.getElementById('editBankCode');
            if (!bankCodeInputEl || !bankCodeInputEl.value.trim()) {
                showError('Введите код банка');
                return;
            }
            if (!validateBankCodeEdit(bankCodeInputEl)) {
                showError('Код банка заполнен неверно');
                return;
            }
            
            const buyerBankName = document.getElementById('editBankName')?.value;
            if (!buyerBankName) {
                showError('Введите наименование банка');
                return;
            }
            
            // Валидация данных автомобиля если нужен
            if (needVehicle) {
                const vehicleMake = document.getElementById('editVehicleMake')?.value;
                const vehicleNumber = document.getElementById('editVehicleNumber')?.value;
                const trailerMake = document.getElementById('editTrailerMake')?.value;
                const trailerNumber = document.getElementById('editTrailerNumber')?.value;
                const waybillNumber = document.getElementById('editWaybillNumber')?.value;
                const driverLastName = document.getElementById('editDriverLastName')?.value;
                const driverFirstName = document.getElementById('editDriverFirstName')?.value;
                const powerOfAttorney = document.getElementById('editPowerOfAttorney')?.value;
                
                if (!vehicleMake) {
                    showError('Введите марку автомобиля');
                    return;
                }
                if (!vehicleNumber) {
                    showError('Введите госномер автомобиля');
                    return;
                }
                if (!trailerMake) {
                    showError('Введите марку прицепа');
                    return;
                }
                if (!trailerNumber) {
                    showError('Введите госномер прицепа');
                    return;
                }
                if (!waybillNumber) {
                    showError('Введите номер путевого листа');
                    return;
                }
                if (!driverLastName) {
                    showError('Введите фамилию водителя');
                    return;
                }
                if (!driverFirstName) {
                    showError('Введите имя водителя');
                    return;
                }
                if (!powerOfAttorney) {
                    showError('Введите доверенность');
                    return;
                }
            }
            
            const items = [];
            const rows = document.querySelectorAll('#editShipmentItems .item-row');
            let hasErrors = false;
            
            for (const row of rows) {
                const deviceSelect = row.querySelector('.device-select');
                const quantityInput = row.querySelector('.quantity-input');
                const priceInput = row.querySelector('.price-input');
                
                const deviceId = deviceSelect.value;
                const quantity = quantityInput.value;
                const price = priceInput.value;
                
                if (!deviceId) {
                    deviceSelect.classList.add('is-invalid');
                    hasErrors = true;
                } else {
                    deviceSelect.classList.remove('is-invalid');
                }
                
                if (!quantity || !isPositiveInteger(quantity) || parseInt(quantity) > 9999999) {
                    quantityInput.classList.add('is-invalid');
                    hasErrors = true;
                } else {
                    quantityInput.classList.remove('is-invalid');
                }
                
                if (!price || !isValidPrice(price) || parseFloat(price) <= 0) {
                    priceInput.classList.add('is-invalid');
                    hasErrors = true;
                } else {
                    priceInput.classList.remove('is-invalid');
                }
                
                if (!hasErrors) {
                    items.push({
                        deviceId: parseInt(deviceId),
                        quantity: parseInt(quantity),
                        price: parseFloat(price)
                    });
                }
            }
            
            if (hasErrors) {
                showError('Пожалуйста, исправьте ошибки в форме');
                return;
            }
            
            if (items.length === 0) {
                showError('Добавьте хотя бы одну позицию');
                return;
            }
            
            const requestData = {
                customer_name: customerName,
                customer_unp: customerUnp,
                customer_address: customerAddress,
                customer_contact: customerContact,
                customer_phone: customerPhone,
                customer_director: customerDirector,
                required_date: requiredDate,
                notes: document.getElementById('editNotes').value,
                need_vehicle: needVehicle,
                items: items,
                buyer_legal_address: buyerLegalAddress,
                buyer_bank_account: bankAccountInputEl.value,
                buyer_bank_name: buyerBankName,
                buyer_bank_code: bankCodeInputEl.value
            };
            
            if (needVehicle) {
                const vehicleMake = document.getElementById('editVehicleMake').value;
                const vehicleNumber = document.getElementById('editVehicleNumber').value;
                const trailerMake = document.getElementById('editTrailerMake').value;
                const trailerNumber = document.getElementById('editTrailerNumber').value;
                const waybillNumber = document.getElementById('editWaybillNumber').value;
                const driverLastName = document.getElementById('editDriverLastName').value;
                const driverFirstName = document.getElementById('editDriverFirstName').value;
                const driverMiddleName = document.getElementById('editDriverMiddleName').value;
                const powerOfAttorney = document.getElementById('editPowerOfAttorney').value;
                
                requestData.vehicle_number = `${vehicleMake} ${vehicleNumber}`.trim();
                requestData.trailer_number = `${trailerMake} ${trailerNumber}`.trim();
                requestData.waybill_number_ttn = waybillNumber;
                requestData.driver_last_name = driverLastName;
                requestData.driver_first_name = driverFirstName;
                requestData.driver_middle_name = driverMiddleName;
                requestData.power_of_attorney = powerOfAttorney;
            }
            
            const btn = e.target.querySelector('button[type="submit"]');
            const originalText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Сохранение...';
            
            try {
                const requestIdValue = document.getElementById('editRequestId').value;
                const updateResponse = await fetch(`${API_BASE_URL}/api/shipment-requests/${requestIdValue}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: JSON.stringify(requestData)
                });
                
                const result = await updateResponse.json();
                
                if (result.success) {
                    modal.hide();
                    showSuccess('Заявка успешно обновлена');
                    loadShipmentRequests();
                } else {
                    showError('' + (result.message || 'Ошибка при обновлении'));
                    btn.disabled = false;
                    btn.innerHTML = originalText;
                }
            } catch (error) {
                console.error('Ошибка:', error);
                showError('Ошибка сети: ' + error.message);
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
        });
        
        modal.show();
        
    } catch (error) {
        console.error('Ошибка загрузки данных для редактирования:', error);
        showError('Ошибка загрузки данных: ' + error.message);
    }
}

function showCreateShipmentRequestModal() {
    if (!userPermissions?.can_create_shipment_requests) {
        showError('Доступ запрещен');
        return;
    }
    
    // Первое модальное окно - выбор типа отгрузки
    const typeModalHtml = `
        <div class="modal fade" id="shipmentTypeModal" tabindex="-1" data-bs-backdrop="static">
            <div class="modal-dialog modal-sm modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title">
                            <i class="bi bi-truck"></i> Тип отгрузки
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body text-center py-4">
                        <div class="row g-3">
                            <div class="col-12">
                                <button class="btn btn-outline-primary w-100 py-3" onclick="showShipmentFormModal(false)">
                                    <i class="bi bi-box-seam" style="font-size: 24px;"></i><br>
                                    <strong>Без автомобиля</strong><br>
                                    <small class="text-muted">Только товарная накладная (ТН-2)</small>
                                </button>
                            </div>
                            <div class="col-12">
                                <button class="btn btn-outline-success w-100 py-3" onclick="showShipmentFormModal(true)">
                                    <i class="bi bi-truck" style="font-size: 24px;"></i><br>
                                    <strong>С автомобилем</strong><br>
                                    <small class="text-muted">Товарно-транспортная накладная (ТТН-1)</small>
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Отмена</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const oldModal = document.getElementById('shipmentTypeModal');
    if (oldModal) oldModal.remove();
    
    document.body.insertAdjacentHTML('beforeend', typeModalHtml);
    const typeModal = new bootstrap.Modal(document.getElementById('shipmentTypeModal'));
    typeModal.show();
}

function showShipmentFormModal(needVehicle) {
    // Закрываем окно выбора типа
    const typeModal = bootstrap.Modal.getInstance(document.getElementById('shipmentTypeModal'));
    if (typeModal) typeModal.hide();
    
    // Удаляем старое модальное окно, если оно существует
    const oldModal = document.getElementById('createShipmentRequestModal');
    if (oldModal) oldModal.remove();
    
    // Загружаем список приборов
    fetch(`${API_BASE_URL}/api/devices?pageSize=1000`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
    })
    .then(response => response.json())
    .then(data => {
        let deviceOptions = '';
        if (data.success && data.devices) {
            data.devices.forEach(d => {
                deviceOptions += `<option value="${d.id}" data-price="${d.price || 0}" data-stock="${d.quantity || 0}">${escapeHtml(d.unique_id)} - ${escapeHtml(d.name)} (в наличии: ${d.quantity || 0})</option>`;
            });
        }
        
        const today = new Date().toISOString().split('T')[0];
        
        // Формируем HTML в зависимости от типа отгрузки
        let vehicleBlockHtml = '';
        if (needVehicle) {
            vehicleBlockHtml = `
                <div class="border rounded p-3 mb-3" style="background-color: rgba(37, 99, 235, 0.1);">
                    <h6 class="mb-3"><i class="bi bi-truck"></i> Данные автомобиля</h6>
                    <div class="row">
                        <div class="col-md-6 mb-2">
                            <label class="form-label required">Марка автомобиля</label>
                            <input type="text" class="form-control" id="vehicleMake" name="vehicle_make" 
                                   placeholder="МАЗ-5440" maxlength="50" value="">
                            <div class="invalid-feedback">Введите марку автомобиля</div>
                        </div>
                        <div class="col-md-6 mb-2">
                            <label class="form-label required">Госномер автомобиля</label>
                            <input type="text" class="form-control" id="vehicleNumber" name="vehicle_number" 
                                   placeholder="АА1234-7" maxlength="20" value="">
                            <div class="invalid-feedback">Введите госномер автомобиля</div>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-md-6 mb-2">
                            <label class="form-label required">Марка прицепа</label>
                            <input type="text" class="form-control" id="trailerMake" name="trailer_make" 
                                   placeholder="МАЗ-856100" maxlength="50" value="">
                            <div class="invalid-feedback">Введите марку прицепа</div>
                        </div>
                        <div class="col-md-6 mb-2">
                            <label class="form-label required">Госномер прицепа</label>
                            <input type="text" class="form-control" id="trailerNumber" name="trailer_number" 
                                   placeholder="АА5678-7" maxlength="20" value="">
                            <div class="invalid-feedback">Введите госномер прицепа</div>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-md-6 mb-2">
                            <label class="form-label required">К путевому листу №</label>
                            <input type="text" class="form-control" id="waybillNumber" name="waybill_number" 
                                   placeholder="№ путевого листа" maxlength="50" value="">
                            <div class="invalid-feedback">Введите номер путевого листа</div>
                        </div>
                        <div class="col-md-6 mb-2">
                            <label class="form-label required">Фамилия водителя</label>
                            <input type="text" class="form-control" id="driverLastName" name="driver_last_name" 
                                   maxlength="50" value="" oninput="this.value = this.value.replace(/[<>]/g, '')"
                                   placeholder="Иванов">
                            <div class="invalid-feedback">Введите фамилию водителя</div>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-md-6 mb-2">
                            <label class="form-label required">Имя водителя</label>
                            <input type="text" class="form-control" id="driverFirstName" name="driver_first_name" 
                                   maxlength="50" value="" oninput="this.value = this.value.replace(/[<>]/g, '')"
                                   placeholder="Иван">
                            <div class="invalid-feedback">Введите имя водителя</div>
                        </div>
                        <div class="col-md-6 mb-2">
                            <label class="form-label">Отчество водителя</label>
                            <input type="text" class="form-control" id="driverMiddleName" name="driver_middle_name" 
                                   maxlength="50" value="" oninput="this.value = this.value.replace(/[<>]/g, '')"
                                   placeholder="Иванович">
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-md-12 mb-2">
                            <label class="form-label required">Доверенность (номер, дата)</label>
                            <input type="text" class="form-control" id="powerOfAttorney" name="power_of_attorney" 
                                   placeholder="№ 123 от 01.01.2024" maxlength="100" value="">
                            <div class="invalid-feedback">Введите доверенность (номер и дату)</div>
                        </div>
                    </div>
                </div>
            `;
        } else {
            vehicleBlockHtml = `
                <div class="alert alert-info mb-3">
                    <i class="bi bi-info-circle"></i>
                    <strong>Отгрузка без автомобиля</strong><br>
                </div>
                <input type="hidden" name="need_vehicle" value="0">
            `;
        }
        
        const modalHtml = `
            <div class="modal fade" id="createShipmentRequestModal" tabindex="-1" data-bs-backdrop="static">
                <div class="modal-dialog modal-xl">
                    <div class="modal-content">
                        <div class="modal-header ${needVehicle ? 'bg-success' : 'bg-primary'} text-white">
                            <h5 class="modal-title">
                                ${needVehicle ? '<i class="bi bi-truck"></i> Новая отгрузка (с автомобилем)' : '<i class="bi bi-box-seam"></i> Новая отгрузка (без автомобиля)'}
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <form id="createShipmentRequestForm" novalidate>
                            <div class="modal-body">
                                <input type="hidden" name="need_vehicle" value="${needVehicle ? '1' : '0'}">
                                
                                <!-- ОСНОВНЫЕ ДАННЫЕ КЛИЕНТА -->
                                <div class="row">
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label required">Организация</label>
                                        <input type="text" class="form-control customer-name-input" name="customer_name" required 
                                               maxlength="255" autocomplete="off" value=""
                                               placeholder='ООО "Ромашка"'>
                                        <div class="invalid-feedback">Введите название организации</div>
                                    </div>
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label required">Контактное лицо</label>
                                        <input type="text" class="form-control customer-contact-input" name="customer_contact" required
                                               maxlength="255" autocomplete="off" value="">
                                        <div class="invalid-feedback">Введите контактное лицо</div>
                                    </div>
                                </div>
                                
                                <div class="row">
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label required">УНП</label>
                                        <input type="text" class="form-control customer-unp-input" name="customer_unp" required 
                                               pattern="\\d{9}" maxlength="9" value=""
                                               autocomplete="off"
                                               oninput="this.value = this.value.replace(/[^\\d]/g, '')"
                                               placeholder="123456789">
                                        <div class="invalid-feedback">УНП должен содержать ровно 9 цифр</div>
                                    </div>
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label required">Адрес (почтовый)</label>
                                        <input type="text" class="form-control customer-address-input" name="customer_address" required 
                                               maxlength="500" autocomplete="off" value=""
                                               placeholder="г. Минск, ул. Примерная, д. 1">
                                        <div class="invalid-feedback">Введите адрес организации</div>
                                    </div>
                                </div>
                                
                                <!-- ПОЛЯ: Телефон и Директор -->
                                <div class="row">
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label required">Телефон</label>
                                        <div class="input-group">
                                            <span class="input-group-text">+375</span>
                                            <input type="tel" class="form-control customer-phone-input" name="customer_phone" id="customerPhone"
                                                   maxlength="9" autocomplete="off" required value=""
                                                   placeholder="291234567">
                                        </div>
                                        <div class="invalid-feedback" id="customerPhoneFeedback">Введите 9 цифр после +375 (например, 291234567)</div>
                                        <div class="form-text">Введите 9 цифр (код оператора + номер)</div>
                                    </div>
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label required">Директор (ФИО)</label>
                                        <input type="text" class="form-control customer-director-input" name="customer_director" required
                                               maxlength="255" autocomplete="off" value=""
                                               placeholder="Иванов Иван Иванович">
                                        <div class="invalid-feedback">Введите ФИО директора</div>
                                    </div>
                                </div>
                                
                                <!-- РЕКВИЗИТЫ ПОКУПАТЕЛЯ -->
                                <div class="border rounded p-3 mb-3" style="background-color: rgba(40, 167, 69, 0.05);">
                                    <h6 class="mb-3"><i class="bi bi-building"></i> Юридические реквизиты покупателя</h6>
                                    <div class="row">
                                        <div class="col-md-12 mb-2">
                                            <label class="form-label required">Юридический адрес</label>
                                            <input type="text" class="form-control buyer-legal-address-input" name="buyer_legal_address" required
                                                   maxlength="500" autocomplete="off" value=""
                                                   placeholder="г. Минск, ул. Юридическая, д. 10">
                                            <div class="invalid-feedback">Введите юридический адрес</div>
                                        </div>
                                    </div>
                                    <div class="row">
                                        <div class="col-md-6 mb-2">
                                            <label class="form-label required">Расчетный счет</label>
                                            <input type="text" class="form-control buyer-bank-account-input" name="buyer_bank_account" id="bankAccount" required
                                                   maxlength="28" autocomplete="off" value=""
                                                   placeholder="BY00ABCD12345678901234567890"
                                                   oninput="validateBankAccount(this)"
                                                   onblur="validateBankAccount(this)">
                                            <div class="invalid-feedback" id="bankAccountFeedback">Формат: BY + 2 цифры + 4 буквы + 20 цифр (всего 28)</div>
                                            <div class="form-text">Пример: BY00ABCD12345678901234567890</div>
                                        </div>
                                        <div class="col-md-6 mb-2">
                                            <label class="form-label required">Код банка (БИК/МФО)</label>
                                            <input type="text" class="form-control buyer-bank-code-input" name="buyer_bank_code" id="bankCode" required
                                                   maxlength="8" autocomplete="off" value=""
                                                   placeholder="XXXXBY00"
                                                   oninput="validateBankCode(this)"
                                                   onblur="validateBankCode(this)">
                                            <div class="invalid-feedback" id="bankCodeFeedback">Формат: 4 буквы + BY + 2 цифры (всего 8)</div>
                                            <div class="form-text">Пример: BPSBBY2X</div>
                                        </div>
                                    </div>
                                    <div class="row">
                                        <div class="col-md-12 mb-2">
                                            <label class="form-label required">Наименование банка</label>
                                            <input type="text" class="form-control buyer-bank-name-input" name="buyer_bank_name" required
                                                   maxlength="255" autocomplete="off" value=""
                                                   placeholder='ОАО "Беларусбанк"'>
                                            <div class="invalid-feedback">Введите наименование банка</div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="row">
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label required">Желаемая дата отгрузки</label>
                                        <input type="date" class="form-control required-date-input" name="required_date" required value="${today}">
                                        <div class="invalid-feedback">Укажите желаемую дату отгрузки</div>
                                    </div>
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label">Примечания</label>
                                        <input type="text" class="form-control notes-input" name="notes" maxlength="1000" value=""
                                               autocomplete="off">
                                    </div>
                                </div>
                                
                                ${vehicleBlockHtml}
                                
                                <h6 class="mt-4">Позиции для отгрузки</h6>
                                <div id="shipmentItems">
                                    <div class="row mb-2 item-row">
                                        <div class="col-md-5">
                                            <select class="form-select device-select" required>
                                                <option value="">Выберите прибор</option>
                                                ${deviceOptions}
                                            </select>
                                            <div class="invalid-feedback">Выберите прибор</div>
                                        </div>
                                        <div class="col-md-2">
                                            <div class="input-group">
                                                <input type="number" class="form-control quantity-input" placeholder="Кол-во" min="1" max="9999999" value="1" step="1" required
                                                    oninput="validatePositiveInteger(this); window.limitQuantityDigits(this, 7)"
                                                    onkeypress="return isNumberKey(event)">
                                                <span class="input-group-text">шт</span>
                                            </div>
                                            <div class="invalid-feedback">Введите положительное целое число</div>
                                        </div>
                                        <div class="col-md-2">
                                            <div class="input-group">
                                                <input type="number" class="form-control price-input" placeholder="Цена" step="0.01" min="0.01" value="0" required readonly>
                                                <span class="input-group-text">руб</span>
                                            </div>
                                            <div class="invalid-feedback">Цена автоматически подставляется</div>
                                        </div>
                                        <div class="col-md-2">
                                            <span class="form-control-plaintext stock-info">0 шт.</span>
                                        </div>
                                        <div class="col-md-1">
                                            <button type="button" class="btn btn-outline-danger remove-item" disabled>×</button>
                                        </div>
                                    </div>
                                </div>
                                
                                <button type="button" class="btn btn-sm btn-outline-primary mt-2" id="addShipmentItem">
                                    <i class="bi bi-plus"></i> Добавить позицию
                                </button>
                                
                                <div class="mt-3 text-end">
                                    <strong>Итого: <span id="shipmentTotal">0.00</span> руб.</strong>
                                </div>
                                
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Отмена</button>
                                <button type="submit" class="btn ${needVehicle ? 'btn-success' : 'btn-primary'}">Создать заявку</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
                
        window.validatePhoneInput = function(input) {
            let phone = input.value.trim();
            const feedback = document.getElementById('customerPhoneFeedback');
            
            const digitsOnly = phone.replace(/[^\d]/g, '');
            
            if (!digitsOnly) {
                input.classList.add('is-invalid');
                if (feedback) feedback.textContent = 'Введите номер телефона (9 цифр)';
                return false;
            }
            
            if (digitsOnly.length !== 9) {
                input.classList.add('is-invalid');
                if (feedback) feedback.textContent = `Введите ровно 9 цифр (сейчас ${digitsOnly.length})`;
                return false;
            }
            
            const firstDigit = digitsOnly.charAt(0);
            if (!['2', '3', '4', '5'].includes(firstDigit)) {
                input.classList.add('is-invalid');
                if (feedback) feedback.textContent = 'Некорректный код оператора (должен начинаться с 2,3,4,5)';
                return false;
            }
            
            input.classList.remove('is-invalid');
            input.classList.add('is-valid');
            return true;
        };
        
        window.validateBankAccount = function(input) {
            const value = input.value.trim().toUpperCase();
            const feedback = document.getElementById('bankAccountFeedback');
            
            if (!value) {
                input.classList.add('is-invalid');
                if (feedback) feedback.textContent = 'Введите расчетный счет';
                return false;
            }
            
            if (value.length !== 28) {
                input.classList.add('is-invalid');
                if (feedback) feedback.textContent = 'Расчетный счет должен содержать ровно 28 символов';
                return false;
            }
            
            if (!value.startsWith('BY')) {
                input.classList.add('is-invalid');
                if (feedback) feedback.textContent = 'Расчетный счет должен начинаться с "BY"';
                return false;
            }
            
            const thirdChar = value.charAt(2);
            const fourthChar = value.charAt(3);
            if (!/^\d$/.test(thirdChar) || !/^\d$/.test(fourthChar)) {
                input.classList.add('is-invalid');
                if (feedback) feedback.textContent = 'После "BY" должны следовать 2 цифры (например, BY00...)';
                return false;
            }
            
            const fifthToEighth = value.substring(4, 8);
            if (!/^[A-Z]{4}$/.test(fifthToEighth)) {
                input.classList.add('is-invalid');
                if (feedback) feedback.textContent = 'Символы 5-8 должны быть буквами (A-Z)';
                return false;
            }
            
            const remaining = value.substring(8);
            if (!/^\d{20}$/.test(remaining)) {
                input.classList.add('is-invalid');
                if (feedback) feedback.textContent = 'Последние 20 символов должны быть только цифрами';
                return false;
            }
            
            input.classList.remove('is-invalid');
            input.classList.add('is-valid');
            return true;
        };
        
        window.validateBankCode = function(input) {
            const value = input.value.trim().toUpperCase();
            const feedback = document.getElementById('bankCodeFeedback');
            
            if (!value) {
                input.classList.add('is-invalid');
                if (feedback) feedback.textContent = 'Введите код банка';
                return false;
            }
            
            if (value.length !== 8) {
                input.classList.add('is-invalid');
                if (feedback) feedback.textContent = 'Код банка должен содержать ровно 8 символов';
                return false;
            }
            
            const firstFour = value.substring(0, 4);
            if (!/^[A-Z]{4}$/.test(firstFour)) {
                input.classList.add('is-invalid');
                if (feedback) feedback.textContent = 'Первые 4 символа должны быть буквами (A-Z)';
                return false;
            }
            
            const fifthSixth = value.substring(4, 6);
            if (fifthSixth !== 'BY') {
                input.classList.add('is-invalid');
                if (feedback) feedback.textContent = '5-й и 6-й символы должны быть "BY"';
                return false;
            }
            
            const lastTwo = value.substring(6, 8);
            if (!/^\d{2}$/.test(lastTwo)) {
                input.classList.add('is-invalid');
                if (feedback) feedback.textContent = 'Последние 2 символа должны быть цифрами';
                return false;
            }
            
            input.classList.remove('is-invalid');
            input.classList.add('is-valid');
            return true;
        };
        
        window.limitQuantityDigits = function(input, maxDigits) {
            let value = input.value;
            if (value.length > maxDigits) {
                input.value = value.slice(0, maxDigits);
            }
            if (parseInt(input.value) > 9999999) {
                input.value = 9999999;
            }
        };
        
        // Автоматическое форматирование телефона
        const phoneInput = document.getElementById('customerPhone');
        if (phoneInput) {
            phoneInput.addEventListener('input', function(e) {
                let value = this.value.replace(/[^\d]/g, '');
                if (value.length > 9) {
                    value = value.slice(0, 9);
                }
                this.value = value;
                validatePhoneInput(this);
            });
            phoneInput.setAttribute('autocomplete', 'off');
        }
        
        
        // Обновление цены и информации в строке
        function updateDeviceInfoInRow(row) {
            const select = row.querySelector('.device-select');
            const selectedOption = select.options[select.selectedIndex];
            const price = selectedOption?.dataset?.price || 0;
            const stock = selectedOption?.dataset?.stock || 0;
            
            const priceInput = row.querySelector('.price-input');
            const stockInfo = row.querySelector('.stock-info');
            
            if (priceInput) {
                priceInput.value = price;
            }
            if (stockInfo) {
                stockInfo.textContent = stock + ' шт.';
                stockInfo.className = stock == 0 ? 'form-control-plaintext text-danger' : 'form-control-plaintext';
            }
            
            updateShipmentTotal();
        }
        
        // Пересчет общей суммы
        function updateShipmentTotal() {
            let total = 0;
            document.querySelectorAll('#shipmentItems .item-row').forEach(row => {
                const quantity = parseFloat(row.querySelector('.quantity-input')?.value) || 0;
                const price = parseFloat(row.querySelector('.price-input')?.value) || 0;
                total += quantity * price;
            });
            const totalSpan = document.getElementById('shipmentTotal');
            if (totalSpan) totalSpan.textContent = total.toFixed(2);
        }
        
        // Обновление состояния кнопок удаления
        function updateRemoveButtons() {
            const rows = document.querySelectorAll('#shipmentItems .item-row');
            rows.forEach((row, index) => {
                const removeBtn = row.querySelector('.remove-item');
                if (removeBtn) {
                    removeBtn.disabled = (rows.length === 1);
                }
            });
        }
        
        // Добавление новой строки с товаром
        function addNewItemRow() {
            const container = document.getElementById('shipmentItems');
            const newRow = document.createElement('div');
            newRow.className = 'row mb-2 item-row';
            newRow.innerHTML = `
                <div class="col-md-5">
                    <select class="form-select device-select" required>
                        <option value="">Выберите прибор</option>
                        ${deviceOptions}
                    </select>
                    <div class="invalid-feedback">Выберите прибор</div>
                </div>
                <div class="col-md-2">
                    <div class="input-group">
                        <input type="number" class="form-control quantity-input" placeholder="Кол-во" min="1" max="9999999" step="1" value="1" required
                               oninput="validatePositiveInteger(this); window.limitQuantityDigits(this, 7)"
                               onkeypress="return isNumberKey(event)">
                        <span class="input-group-text">шт</span>
                    </div>
                    <div class="invalid-feedback">Введите положительное целое число (не более 7 цифр)</div>
                </div>
                <div class="col-md-2">
                    <div class="input-group">
                        <input type="number" class="form-control price-input" placeholder="Цена" step="0.01" min="0.01" value="0" required readonly>
                        <span class="input-group-text">руб</span>
                    </div>
                    <div class="invalid-feedback">Цена автоматически берется из прибора</div>
                </div>
                <div class="col-md-2">
                    <span class="form-control-plaintext stock-info">0 шт.</span>
                </div>
                <div class="col-md-1">
                    <button type="button" class="btn btn-outline-danger remove-item">×</button>
                </div>
            `;
            
            container.appendChild(newRow);
            
            // Добавляем обработчики для новой строки
            const newSelect = newRow.querySelector('.device-select');
            newSelect.addEventListener('change', function() {
                updateDeviceInfoInRow(this.closest('.item-row'));
            });
            
            const newQuantity = newRow.querySelector('.quantity-input');
            newQuantity.addEventListener('input', function() {
                window.limitQuantityDigits(this, 7);
                updateShipmentTotal();
            });
            
            newRow.querySelector('.remove-item').addEventListener('click', function() {
                const allRows = document.querySelectorAll('#shipmentItems .item-row');
                if (allRows.length > 1) {
                    this.closest('.item-row').remove();
                    updateShipmentTotal();
                    updateRemoveButtons();
                }
            });
            
            updateRemoveButtons();
            updateShipmentTotal();
        }
        
        // Инициализация первой строки
        const firstRow = document.querySelector('#shipmentItems .item-row');
        if (firstRow) {
            const firstSelect = firstRow.querySelector('.device-select');
            if (firstSelect) {
                firstSelect.addEventListener('change', function() {
                    updateDeviceInfoInRow(this.closest('.item-row'));
                });
            }
            
            const firstQuantity = firstRow.querySelector('.quantity-input');
            if (firstQuantity) {
                firstQuantity.addEventListener('input', function() {
                    window.limitQuantityDigits(this, 7);
                    updateShipmentTotal();
                });
            }
        }
        
        // Кнопка добавления позиции
        const addItemBtn = document.getElementById('addShipmentItem');
        if (addItemBtn) {
            addItemBtn.addEventListener('click', addNewItemRow);
        }
        
        // Инициализация кнопок удаления для всех строк
        function initRemoveButtons() {
            document.querySelectorAll('#shipmentItems .item-row .remove-item').forEach(btn => {
                btn.addEventListener('click', function() {
                    const rows = document.querySelectorAll('#shipmentItems .item-row');
                    if (rows.length > 1) {
                        this.closest('.item-row').remove();
                        updateShipmentTotal();
                        updateRemoveButtons();
                    }
                });
            });
        }
        
        initRemoveButtons();
        updateRemoveButtons();
        updateShipmentTotal();
        
        
        const modalElement = document.getElementById('createShipmentRequestModal');
        const modal = new bootstrap.Modal(modalElement);
        const form = document.getElementById('createShipmentRequestForm');
        
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formEl = e.target;
            formEl.classList.add('was-validated');
            
            // Сохраняем значение телефона с префиксом +375
            let customerPhone = '';
            const phoneDigits = document.querySelector('.customer-phone-input')?.value || '';
            if (phoneDigits && phoneDigits.trim()) {
                customerPhone = '+375' + phoneDigits.trim();
            }
            
            const customerName = document.querySelector('.customer-name-input').value;
            const customerContact = document.querySelector('.customer-contact-input').value;
            const customerUnp = document.querySelector('.customer-unp-input').value;
            const customerAddress = document.querySelector('.customer-address-input').value;
            const customerDirector = document.querySelector('.customer-director-input')?.value || '';
            const requiredDate = document.querySelector('.required-date-input').value;
            const needVehicle = document.querySelector('input[name="need_vehicle"]').value === '1';
            
            // Валидация телефона
            const phoneInputEl = document.querySelector('.customer-phone-input');
            if (!phoneInputEl || !phoneInputEl.value.trim()) {
                showError('Введите номер телефона');
                return;
            }
            if (!validatePhoneInput(phoneInputEl)) {
                showError('Введите корректный номер телефона (9 цифр после +375)');
                return;
            }
            
            // Валидация директора
            if (!customerDirector) {
                showError('Введите ФИО директора');
                return;
            }
            
            // Валидация юридического адреса
            const buyerLegalAddress = document.querySelector('.buyer-legal-address-input')?.value;
            if (!buyerLegalAddress) {
                showError('Введите юридический адрес');
                return;
            }
            
            // Валидация расчетного счета
            const bankAccountInput = document.querySelector('.buyer-bank-account-input');
            if (!bankAccountInput || !bankAccountInput.value.trim()) {
                showError('Введите расчетный счет');
                return;
            }
            if (!validateBankAccount(bankAccountInput)) {
                showError('Расчетный счет заполнен неверно');
                return;
            }
            
            // Валидация кода банка
            const bankCodeInput = document.querySelector('.buyer-bank-code-input');
            if (!bankCodeInput || !bankCodeInput.value.trim()) {
                showError('Введите код банка');
                return;
            }
            if (!validateBankCode(bankCodeInput)) {
                showError('Код банка заполнен неверно');
                return;
            }
            
            // Валидация наименования банка
            const buyerBankName = document.querySelector('.buyer-bank-name-input')?.value;
            if (!buyerBankName) {
                showError('Введите наименование банка');
                return;
            }
            
            if (!customerName) {
                showError('Введите название организации');
                return;
            }
            
            if (!customerContact) {
                showError('Введите контактное лицо');
                return;
            }
            
            if (!customerUnp || !/^\d{9}$/.test(customerUnp)) {
                showError('УНП должен содержать ровно 9 цифр');
                return;
            }
            
            if (!customerAddress) {
                showError('Введите адрес организации');
                return;
            }
            
            if (!requiredDate) {
                showError('Укажите желаемую дату отгрузки');
                return;
            }
            if (!isFutureDate(requiredDate)) {
                showError('Дата отгрузки не может быть в прошлом');
                return;
            }
            
            // Валидация данных автомобиля если нужен
            if (needVehicle) {
                const vehicleMake = document.getElementById('vehicleMake')?.value;
                const vehicleNumber = document.getElementById('vehicleNumber')?.value;
                const trailerMake = document.getElementById('trailerMake')?.value;
                const trailerNumber = document.getElementById('trailerNumber')?.value;
                const waybillNumber = document.getElementById('waybillNumber')?.value;
                const driverLastName = document.getElementById('driverLastName')?.value || '';
                const driverFirstName = document.getElementById('driverFirstName')?.value || '';
                const driverMiddleName = document.getElementById('driverMiddleName')?.value || '';
                const powerOfAttorney = document.getElementById('powerOfAttorney')?.value;
                
                if (!vehicleMake) {
                    showError('Введите марку автомобиля');
                    return;
                }
                if (!vehicleNumber) {
                    showError('Введите госномер автомобиля');
                    return;
                }
                if (!trailerMake) {
                    showError('Введите марку прицепа');
                    return;
                }
                if (!trailerNumber) {
                    showError('Введите госномер прицепа');
                    return;
                }
                if (!waybillNumber) {
                    showError('Введите номер путевого листа');
                    return;
                }
                if (!driverLastName) {
                    showError('Введите фамилию водителя');
                    return;
                }
                if (!driverFirstName) {
                    showError('Введите имя водителя');
                    return;
                }
                if (!powerOfAttorney) {
                    showError('Введите доверенность');
                    return;
                }
            }
            
            const items = [];
            const rows = document.querySelectorAll('#shipmentItems .item-row');
            let hasErrors = false;
            
            for (const row of rows) {
                const deviceSelect = row.querySelector('.device-select');
                const quantityInput = row.querySelector('.quantity-input');
                const priceInput = row.querySelector('.price-input');
                
                const deviceId = deviceSelect.value;
                const quantity = quantityInput.value;
                const price = priceInput.value;
                
                if (!deviceId) {
                    deviceSelect.classList.add('is-invalid');
                    hasErrors = true;
                } else {
                    deviceSelect.classList.remove('is-invalid');
                }
                
                if (!quantity || !isPositiveInteger(quantity) || parseInt(quantity) > 9999999) {
                    quantityInput.classList.add('is-invalid');
                    hasErrors = true;
                } else {
                    quantityInput.classList.remove('is-invalid');
                }
                
                if (!price || !isValidPrice(price) || parseFloat(price) <= 0) {
                    priceInput.classList.add('is-invalid');
                    hasErrors = true;
                } else {
                    priceInput.classList.remove('is-invalid');
                }
                
                if (!hasErrors) {
                    items.push({
                        deviceId: parseInt(deviceId),
                        quantity: parseInt(quantity),
                        price: parseFloat(price)
                    });
                }
            }
            
            if (hasErrors) {
                showError('Пожалуйста, исправьте ошибки в форме');
                return;
            }
            
            if (items.length === 0) {
                showError('Добавьте хотя бы одну позицию');
                return;
            }
            
            const requestData = {
                customer_name: customerName,
                customer_unp: customerUnp,
                customer_address: customerAddress,
                customer_contact: customerContact,
                customer_phone: customerPhone,
                customer_director: customerDirector,
                required_date: requiredDate,
                notes: document.querySelector('.notes-input')?.value || '',
                need_vehicle: needVehicle,
                items: items,
                buyer_legal_address: buyerLegalAddress,
                buyer_bank_account: bankAccountInput.value,
                buyer_bank_name: buyerBankName,
                buyer_bank_code: bankCodeInput.value
            };
            
            if (needVehicle) {
                const fullVehicleNumber = `${document.getElementById('vehicleMake').value} ${document.getElementById('vehicleNumber').value}`.trim();
                const fullTrailerNumber = `${document.getElementById('trailerMake').value} ${document.getElementById('trailerNumber').value}`.trim();
                
                requestData.vehicle_number = fullVehicleNumber;
                requestData.trailer_number = fullTrailerNumber;
                requestData.waybill_number_ttn = document.getElementById('waybillNumber').value;
                requestData.driver_last_name = document.getElementById('driverLastName').value;
                requestData.driver_first_name = document.getElementById('driverFirstName').value;
                requestData.driver_middle_name = document.getElementById('driverMiddleName').value;
                requestData.power_of_attorney = document.getElementById('powerOfAttorney').value;
            }
            
            const btn = e.target.querySelector('button[type="submit"]');
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Создание...';
            
            try {
                const response = await fetch(`${API_BASE_URL}/api/shipment-requests`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: JSON.stringify(requestData)
                });
                
                const result = await response.json();
                
                if (result.success) {
                    modal.hide();
                    showSuccess(`Заявка создана.`);
                    // Очищаем кэш и перезагружаем список
                    allShipmentRequests = [];
                    await loadShipmentRequests();
                } else {
                    showError(result.message);
                    btn.disabled = false;
                    btn.innerHTML = 'Создать заявку';
                }
            } catch (error) {
                showError('Ошибка сети: ' + error.message);
                btn.disabled = false;
                btn.innerHTML = 'Создать заявку';
            }
        });
        
        modal.show();
        
        // При закрытии модального окна удаляем его из DOM
        modalElement.addEventListener('hidden.bs.modal', function() {
            modalElement.remove();
        });
        
    })
    .catch(error => {
        console.error('Ошибка загрузки приборов:', error);
        showError('Ошибка загрузки данных');
    });
}

async function viewShipmentRequest(requestId) {
    if (!userPermissions?.can_view_shipment_requests) {
        showError('Доступ запрещен');
        return;
    }
    
    currentShipmentRequestId = requestId;
    
    document.getElementById('page-title').textContent = 'Детали заявки на отгрузку';
    document.getElementById('page-actions').innerHTML = `
        <button class="btn btn-secondary btn-sm" onclick="loadShipmentRequests()">
            <i class="bi bi-arrow-left"></i> Назад
        </button>
    `;
    
    document.getElementById('content').innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border" style="color: var(--accent);"></div>
            <p class="mt-3">Загрузка...</p>
        </div>
    `;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/shipment-requests/${requestId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            const r = data.request;
            const items = data.items || [];
            
            let statusClass = '';
            let statusText = '';
            
            switch(r.status) {
                case 'new':
                    statusClass = 'bg-secondary';
                    statusText = 'Новая';
                    break;
                case 'processing':
                    statusClass = 'bg-info';
                    statusText = 'В обработке';
                    break;
                case 'partial':
                    statusClass = 'bg-warning';
                    statusText = 'Частично отгружена';
                    break;
                case 'shipped':
                    statusClass = 'bg-primary';
                    statusText = 'Отгружена';
                    break;
                case 'completed':
                    statusClass = 'bg-success';
                    statusText = 'Завершена';
                    break;
                case 'cancelled':
                    statusClass = 'bg-danger';
                    statusText = 'Отменена';
                    break;
                default:
                    statusClass = 'bg-secondary';
                    statusText = r.status;
            }
            
            let itemsHtml = '';
            items.forEach((item, index) => {
                const itemStatusClass = item.status === 'shipped' ? 'bg-success' : 
                                        item.status === 'partial' ? 'bg-warning' : 'bg-secondary';
                const itemStatusText = item.status === 'shipped' ? 'Отгружено' : 
                                       item.status === 'partial' ? 'Частично' : 'Ожидает';
                
                itemsHtml += `
                    <tr>
                        <td>${index + 1}</td>
                        <td><code>${sanitizeString(item.unique_id)}</code></td>
                        <td>${sanitizeString(item.device_name)}</noscript>
                        <td>${item.quantity_requested}</noscript>
                        <td>${item.quantity_shipped || 0}</noscript>
                        <td>${isValidPrice(item.price_per_unit) ? Number(item.price_per_unit).toFixed(2) : '0'} руб.</noscript>
                        <td>${((item.quantity_requested || 0) * (item.price_per_unit || 0)).toFixed(2)} руб.</noscript>
                        <td><span class="badge ${itemStatusClass}">${itemStatusText}</span></noscript>
                    </tr>
                `;
            });
            
            // Формируем блок с назначением сотрудника (только для админа и только для новых заявок)
            let assignBlock = '';
            if (userPermissions?.role === 'admin' && r.status === 'new' && !r.assigned_to) {
                assignBlock = `
                    <div class="card mb-4">
                        <div class="card-header bg-primary text-white">
                            <h5 class="mb-0">Назначение ответственного</h5>
                        </div>
                        <div class="card-body">
                            <div class="mb-3">
                                <label class="form-label fw-bold">Выберите сотрудника:</label>
                                <select class="form-select" id="assignEmployeeSelect">
                                    <option value="">Загрузка сотрудников...</option>
                                </select>
                            </div>
                            <button class="btn btn-primary w-100" onclick="assignShipmentRequest(${r.id})">
                                <i class="bi bi-person-plus"></i> Назначить ответственного
                            </button>
                        </div>
                    </div>
                `;
                // Загружаем список доступных сотрудников
                loadEmployeesForAssign();
            }
            
            // Блок с информацией о назначенном сотруднике
            let assignedInfoBlock = '';
            if (r.assigned_to_name) {
                assignedInfoBlock = `
                    <div class="card mb-4">
                        <div class="card-header bg-success text-white">
                            <h5 class="mb-0">Ответственный сотрудник</h5>
                        </div>
                        <div class="card-body">
                            <div class="alert alert-info mb-0">
                                <i class="bi bi-person-check"></i> 
                                <strong>Назначен:</strong> ${sanitizeString(r.assigned_to_name)}
                            </div>
                        </div>
                    </div>
                `;
            }
            
            document.getElementById('content').innerHTML = `
                <div class="row">
                    <div class="col-md-8">
                        <div class="card mb-4">
                            <div class="card-header">
                                <h5 class="mb-0">Заявка ${sanitizeString(r.request_number)}</h5>
                            </div>
                            <div class="card-body">
                                <div class="row">
                                    <div class="col-md-6">
                                        <p><strong>Клиент:</strong> ${sanitizeString(r.customer_name)}</p>
                                        <p><strong>УНП:</strong> ${sanitizeString(r.customer_unp || '-')}</p>
                                        <p><strong>Адрес:</strong> ${sanitizeString(r.customer_address || '-')}</p>
                                        <p><strong>Контакты:</strong> ${sanitizeString(r.customer_contact || '-')}</p>
                                    </div>
                                    <div class="col-md-6">
                                        <p><strong>Статус:</strong> <span class="badge ${statusClass}">${statusText}</span></p>
                                        <p><strong>Создал:</strong> ${sanitizeString(r.created_by_name || '-')}</p>
                                        <p><strong>Дата:</strong> ${new Date(r.created_at).toLocaleDateString()}</p>
                                        <p><strong>Желаемая дата:</strong> ${r.required_date ? new Date(r.required_date).toLocaleDateString() : '-'}</p>
                                    </div>
                                </div>
                                <p><strong>Примечания:</strong> ${sanitizeString(r.notes || '-')}</p>
                                
                                <h6 class="mt-4">Позиции к отгрузке</h6>
                                <div class="table-responsive">
                                    <table class="table table-sm">
                                        <thead>
                                            <tr>
                                                <th>№</th>
                                                <th>Артикул</th>
                                                <th>Прибор</th>
                                                <th>Заказано</th>
                                                <th>Отгружено</th>
                                                <th>Цена</th>
                                                <th>Сумма</th>
                                                <th>Статус</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${itemsHtml}
                                        </tbody>
                                    </table>
                                </div>
                                
                                ${r.vehicle_number ? `
                                <h6 class="mt-4">Данные для отгрузки</h6>
                                <div class="card p-3 mb-3" style="background-color: var(--table-bg); border: 1px solid var(--table-border); color: var(--white);">
                                    <div class="row mb-2">
                                        <div class="col-md-3 fw-bold" style="color: var(--white);">Автомобиль:</div>
                                        <div class="col-md-9" style="color: var(--white);">${sanitizeString(r.vehicle_number)}</div>
                                    </div>
                                    <div class="row mb-2">
                                        <div class="col-md-3 fw-bold" style="color: var(--white);">Дата отгрузки:</div>
                                        <div class="col-md-9" style="color: var(--white);">${r.shipping_date ? new Date(r.shipping_date).toLocaleDateString() : (r.completed_at ? new Date(r.completed_at).toLocaleDateString() : '-')}</div>
                                    </div>
                                </div>
                                ` : ''}
                                
                                ${r.waybill_number || r.ttn_number ? `
                                <h6 class="mt-4">Документ отгрузки</h6>
                                <div class="card p-3 mb-3" style="background-color: var(--table-bg); border: 1px solid var(--table-border); color: var(--white);">
                                    ${r.need_vehicle ? `
                                        <div class="row mb-2">
                                            <div class="col-md-3 fw-bold" style="color: var(--white);">ТТН-1 номер:</div>
                                            <div class="col-md-9" style="color: var(--white);">
                                                <code style="color: var(--white); background-color: var(--medium-gray); padding: 2px 6px; border-radius: 4px;">${sanitizeString(r.ttn_number)}</code>
                                            </div>
                                        </div>
                                    ` : `
                                        <div class="row mb-2">
                                            <div class="col-md-3 fw-bold" style="color: var(--white);">ТН-2 номер:</div>
                                            <div class="col-md-9" style="color: var(--white);">
                                                <code style="color: var(--white); background-color: var(--medium-gray); padding: 2px 6px; border-radius: 4px;">${sanitizeString(r.waybill_number)}</code>
                                            </div>
                                        </div>
                                    `}
                                </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-md-4">
                        ${assignBlock}
                        ${assignedInfoBlock}
                        
                        <div class="card">
                            <div class="card-header">
                                <h5 class="mb-0">Договор</h5>
                            </div>
                            <div class="card-body">
                                ${r.contract_number ? `
                                <p><strong>Номер:</strong> <code>${sanitizeString(r.contract_number)}</code></p>
                                <p><strong>Действует до:</strong> 31.12.2026</p>
                                ${userPermissions?.role !== 'employee' ? `
                                <button class="btn btn-outline-primary w-100" onclick="viewContractByRequest(${r.id})">
                                    <i class="bi bi-eye"></i> Просмотр договора
                                </button>
                                ` : `
                                <div class="alert alert-warning">
                                    <i class="bi bi-exclamation-triangle"></i> Доступ запрещен
                                </div>
                                `}
                                ` : '<p class="text-muted">Договор не сформирован</p>'}
                            </div>
                        </div>
                        
                        <div class="card mt-3">
                            <div class="card-header">
                                <h5 class="mb-0">Действия</h5>
                            </div>
                            <div class="card-body">
                                ${userPermissions?.can_process_shipment_requests && r.status === 'new' && !r.assigned_to ? `
                                <button class="btn btn-warning w-100 mb-2" onclick="showProcessShipmentModal(${r.id})">
                                    <i class="bi bi-play"></i> Взять в работу
                                </button>
                                ` : ''}
                                
                                ${userPermissions?.can_process_shipment_requests && (r.status === 'processing' || r.status === 'partial') ? `
                                <button class="btn btn-success w-100 mb-2" onclick="showCompleteShipmentModal(${r.id})">
                                    <i class="bi bi-check-circle"></i> ${r.status === 'partial' ? 'Догрузить' : 'Завершить отгрузку'}
                                </button>
                                ` : ''}
                                
                                <button class="btn btn-outline-info w-100 mb-2" onclick="showShipmentDocuments(${r.id})">
                                    <i class="bi bi-files"></i> Документы
                                </button>
                                
                                ${userPermissions?.role === 'manager' && r.status === 'new' && r.created_by === currentUser?.id ? `
                                <button class="btn btn-outline-primary w-100 mb-2" onclick="editShipmentRequest(${r.id})">
                                    <i class="bi bi-pencil"></i> Редактировать
                                </button>
                                <button class="btn btn-outline-danger w-100 mb-2" onclick="deleteShipmentRequest(${r.id})">
                                    <i class="bi bi-trash"></i> Удалить
                                </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Ошибка загрузки заявки:', error);
        showError('Ошибка загрузки заявки');
    }
}

async function loadEmployeesForAssign() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/users/available-employees`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const data = await response.json();
        
        if (data.success && data.employees) {
            const select = document.getElementById('assignEmployeeSelect');
            if (select) {
                if (data.employees.length === 0) {
                    select.innerHTML = '<option value="">Нет доступных сотрудников (все заняты)</option>';
                } else {
                    select.innerHTML = '<option value="">Выберите сотрудника...</option>';
                    data.employees.forEach(emp => {
                        const option = document.createElement('option');
                        option.value = emp.id;
                        let activeText = '';
                        if (emp.active_requests_count > 0) {
                            activeText = ` (активных заявок: ${emp.active_requests_count})`;
                        }
                        option.textContent = `${emp.full_name}${activeText}`;
                        select.appendChild(option);
                    });
                }
            }
        } else {
            const select = document.getElementById('assignEmployeeSelect');
            if (select) {
                select.innerHTML = '<option value="">Ошибка загрузки сотрудников</option>';
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки сотрудников:', error);
        const select = document.getElementById('assignEmployeeSelect');
        if (select) {
            select.innerHTML = '<option value="">Ошибка загрузки сотрудников</option>';
        }
    }
}

// Функция назначения заявки
async function assignShipmentRequest(requestId) {
    const select = document.getElementById('assignEmployeeSelect');
    const assignedTo = select?.value;
    
    if (!assignedTo) {
        showError('Выберите сотрудника');
        return;
    }
    
    if (!confirm('Назначить этого сотрудника ответственным за отгрузку?')) return;
    
    const btn = event.target;
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Назначение...';
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/shipment-requests/${requestId}/assign`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ assignedTo: parseInt(assignedTo) })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showSuccess(' Сотрудник назначен, уведомление отправлено');
            viewShipmentRequest(requestId); // Обновляем страницу
        } else {
            showError(data.message);
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    } catch (error) {
        console.error('Ошибка назначения:', error);
        showError('Ошибка назначения: ' + error.message);
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

function showProcessShipmentModal(requestId) {
    const modalHtml = `
    <div class="modal fade" id="processShipmentModal" tabindex="-1">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header bg-warning text-white">
                    <h5 class="modal-title">Начало отгрузки</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <form id="processShipmentForm">
                    <div class="modal-body">
                        <input type="hidden" id="processShipmentId" value="${requestId}">
                        
                        <p>Вы уверены, что хотите взять эту заявку в работу?</p>
                        <p class="text-muted small">После подтверждения заявка перейдет в статус "В обработке" и станет доступна для отгрузки.</p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Отмена</button>
                        <button type="submit" class="btn btn-warning">Взять в работу</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
    `;
    
    const oldModal = document.getElementById('processShipmentModal');
    if (oldModal) oldModal.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    const modal = new bootstrap.Modal(document.getElementById('processShipmentModal'));
    
    document.getElementById('processShipmentForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const requestId = document.getElementById('processShipmentId').value;
        
        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Обработка...';
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/shipment-requests/${requestId}/process`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({})
            });
            
            const result = await response.json();
            
            if (result.success) {
                modal.hide();
                showSuccess('Заявка принята в обработку');
                viewShipmentRequest(requestId);
            } else {
                showError(result.message);
                btn.disabled = false;
                btn.innerHTML = 'Взять в работу';
            }
        } catch (error) {
            showError('Ошибка сети');
            btn.disabled = false;
            btn.innerHTML = 'Взять в работу';
        }
    });
    
    modal.show();
}

function showCompleteShipmentModal(requestId) {
    const modalHtml = `
    <div class="modal fade" id="completeShipmentModal" tabindex="-1">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header bg-success text-white">
                    <h5 class="modal-title">Завершение отгрузки</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <form id="completeShipmentForm">
                    <div class="modal-body">
                        <input type="hidden" id="completeShipmentId" value="${requestId}">
                        
                        <p>Вы уверены, что хотите завершить отгрузку?</p>
                        <p class="text-muted small">Система автоматически проверит наличие товаров на складе и выполнит отгрузку.</p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Отмена</button>
                        <button type="submit" class="btn btn-success">Завершить отгрузку</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
    `;
    
    const oldModal = document.getElementById('completeShipmentModal');
    if (oldModal) oldModal.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    const modal = new bootstrap.Modal(document.getElementById('completeShipmentModal'));
    
    document.getElementById('completeShipmentForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const requestId = document.getElementById('completeShipmentId').value;
        
        const btn = e.target.querySelector('button[type="submit"]');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Проверка...';
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/shipment-requests/${requestId}/complete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({})
            });
            
            const result = await response.json();
            
            if (result.success) {
                modal.hide();
                
                if (result.status === 'shipped') {
                    showSuccess('Отгрузка выполнена полностью. Документы сформированы.');
                } else if (result.status === 'partial') {
                    showWarning('Отгрузка выполнена частично. Документы сформированы на отгруженные позиции.');
                } else if (result.status === 'processing') {
                    showError('На складе нет соответствующих приборов. Отгрузка не выполнена.');
                } else {
                    showSuccess(result.message || 'Отгрузка завершена');
                }
                
                viewShipmentRequest(requestId);
            } else {
                showError(result.message || 'Ошибка при завершении отгрузки');
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
        } catch (error) {
            showError('Ошибка сети: ' + error.message);
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    });
    
    modal.show();
}

async function showShipmentDocuments(requestId) {
    try {
        showInfo('Загрузка документов...');
        
        const response = await fetch(`${API_BASE_URL}/api/shipment-requests/${requestId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            const request = data.request;
            const documents = [];
            
            // ✅ ТОЛЬКО ОДИН ДОКУМЕНТ в зависимости от need_vehicle
            if (request.need_vehicle === 1 || request.need_vehicle === true) {
                // Нужен автомобиль → ТОЛЬКО ТТН-1
                if (request.ttn_number) {
                    documents.push({
                        id: 2,
                        document_type: 'waybill_ttn1',
                        document_type_name: 'Товарно-транспортная накладная (ТТН-1)',
                        document_number: request.ttn_number,
                        document_date: request.completed_at,
                        reference_id: requestId,
                        reference_type: 'shipment'
                    });
                }
            } else {
                // НЕ нужен автомобиль → ТОЛЬКО ТН-2
                if (request.waybill_number) {
                    documents.push({
                        id: 1,
                        document_type: 'invoice_tn2',
                        document_type_name: 'Товарная накладная (ТН-2)',
                        document_number: request.waybill_number,
                        document_date: request.completed_at,
                        reference_id: requestId,
                        reference_type: 'shipment'
                    });
                }
            }
            
            if (documents.length > 0) {
                displayDocumentsModal(documents, requestId);
            } else {
                showInfo('Документы будут сформированы после завершения отгрузки');
            }
        }
    } catch (error) {
        console.error('❌ Ошибка загрузки документов:', error);
        showError('Ошибка загрузки документов: ' + error.message);
    }
}
function displayDocumentsModal(documents, requestId) {
    window.currentShipmentRequestId = requestId;
    
    let docsHtml = '';
    if (documents && documents.length > 0) {
        documents.forEach(doc => {
            let docIcon = 'bi-file-text';
            let docTypeClass = '';
            
            if (doc.document_type === 'invoice_tn2') {
                docIcon = 'bi-receipt';
                docTypeClass = 'tn2-document';
            } else if (doc.document_type === 'waybill_ttn1') {
                docIcon = 'bi-truck';
                docTypeClass = 'ttn1-document';
            }
            
            const docDate = doc.document_date ? new Date(doc.document_date).toLocaleDateString() : 'Дата не указана';
            
            docsHtml += `
                <div class="list-group-item" id="document-${doc.id}">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <i class="bi ${docIcon} me-2 fs-5"></i>
                            <strong class="document-type">${sanitizeString(doc.document_type_name)}</strong>
                            <br>
<small class="document-number" style="color: #000000; opacity: 0.9;">№ ${sanitizeString(doc.document_number)} от ${docDate}</small>                        </div>
                        <div class="btn-group">
                            <button class="btn btn-sm btn-outline-primary" onclick="exportDocument(${doc.id}, 'html')" title="Просмотр">
                                <i class="bi bi-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-info" onclick="exportDocument(${doc.id}, 'docx')" title="Скачать DOCX">
                                <i class="bi bi-file-word"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
    } else {
        docsHtml = '<div class="list-group-item text-center text-muted">Нет сгенерированных документов</div>';
    }
    
    const modalHtml = `
        <div class="modal fade" id="documentsModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header bg-info text-white">
                        <h5 class="modal-title">
                            <i class="bi bi-files"></i> Документы по заявке
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="list-group">
                            ${docsHtml}
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Закрыть</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const oldModal = document.getElementById('documentsModal');
    if (oldModal) oldModal.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = new bootstrap.Modal(document.getElementById('documentsModal'));
    modal.show();
}

async function exportDocument(docId, format) {
    try {
        const requestId = window.currentShipmentRequestId;
        
        if (!requestId) {
            showError('Не удалось определить заявку для экспорта');
            return;
        }
        
        // Получаем данные заявки
        const requestResponse = await fetch(`${API_BASE_URL}/api/shipment-requests/${requestId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const requestData = await requestResponse.json();
        
        if (!requestData.success) {
            throw new Error('Не удалось получить данные заявки');
        }
        
        const request = requestData.request;
        
        // ✅ Определяем тип документа по need_vehicle
        let docType = '';
        let docNumber = '';
        
        if (request.need_vehicle === 1 || request.need_vehicle === true) {
            docType = 'ttn1';
            docNumber = request.ttn_number;
        } else {
            docType = 'tn2';
            docNumber = request.waybill_number;
        }
        
        if (!docNumber) {
            showError('Документ еще не сформирован');
            return;
        }
        
        showInfo('Формирование документа...');
        
        const response = await fetch(`${API_BASE_URL}/api/shipment-requests/${requestId}/export-document?type=${docType}&format=${format}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Ошибка экспорта');
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        let ext = format;
        if (format === 'excel') ext = 'xlsx';
        else if (format === 'docx') ext = 'docx';
        
        a.download = `${docType}_${docNumber}.${ext}`;
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showSuccess(`Документ экспортирован в ${format.toUpperCase()}`);
    } catch (error) {
        console.error('Ошибка экспорта:', error);
        showError('Ошибка экспорта документа: ' + error.message);
    }
}

async function viewContractByRequest(requestId) {
    if (currentUser.role === 'employee') {
        showError('Доступ запрещен');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/shipment-requests/${requestId}/contracts`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const data = await response.json();
        
        if (data.success && data.contracts && data.contracts.length > 0) {
            viewContract(data.contracts[0].id);
        } else {
            showInfo('Договор не найден');
        }
    } catch (error) {
        console.error('Ошибка загрузки договора:', error);
        showError('Ошибка загрузки договора');
    }
}

async function viewContract(contractId) {
    if (currentUser.role === 'employee') {
        showError('Доступ запрещен');
        return;
    }
    
    currentContractId = contractId;
    
    document.getElementById('page-title').textContent = 'Договор';
    document.getElementById('page-actions').innerHTML = `
        <button class="btn btn-secondary btn-sm" onclick="viewShipmentRequest(${currentShipmentRequestId})">
            <i class="bi bi-arrow-left"></i> Назад к заявке
        </button>
        <div class="btn-group ms-2">
            <button class="btn btn-outline-secondary btn-sm" onclick="exportContract(${contractId}, 'html')" title="Просмотр в браузере">
                <i class="bi bi-eye"></i> Просмотр
            </button>
            <button class="btn btn-info btn-sm" onclick="exportContract(${contractId}, 'docx')">
                <i class="bi bi-file-word"></i> DOCX
            </button>
        </div>
    `;
    
    document.getElementById('content').innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border" style="color: var(--accent);"></div>
            <p class="mt-3">Загрузка договора...</p>
        </div>
    `;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/contracts/${contractId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            const c = data.contract;
            
            const statusClass = c.status === 'active' ? 'bg-success' :
                               c.status === 'draft' ? 'bg-secondary' : 'bg-danger';
            
            const statusText = c.status === 'active' ? 'Активен' :
                              c.status === 'draft' ? 'Черновик' : 'Отменен';
            
            // Убираем блок с позициями договора
            document.getElementById('content').innerHTML = `
                <div class="row">
                    <div class="col-md-12">
                        <div class="card mb-4">
                            <div class="card-header">
                                <h5 class="mb-0">Договор № ${sanitizeString(c.contract_number)}</h5>
                            </div>
                            <div class="card-body">
                                <div class="row">
                                    <div class="col-md-6">
                                        <p><strong>Заявка:</strong> ${sanitizeString(c.request_number)}</p>
                                        <p><strong>Клиент:</strong> ${sanitizeString(c.customer_name)}</p>
                                        <p><strong>УНП:</strong> ${sanitizeString(c.customer_unp || '-')}</p>
                                        <p><strong>Адрес:</strong> ${sanitizeString(c.customer_address || '-')}</p>
                                    </div>
                                    <div class="col-md-6">
                                        <p><strong>Дата договора:</strong> ${new Date(c.contract_date).toLocaleDateString()}</p>
                                        <p><strong>Действует до:</strong> 31.12.2026</p>
                                        <p><strong>Статус:</strong> <span class="badge ${statusClass}">${statusText}</span></p>
                                        <p><strong>Сумма:</strong> ${c.order_amount ? Number(c.order_amount).toFixed(2) : '0'} руб.</p>
                                    </div>
                                </div>
                                <p><strong>Примечания:</strong> ${sanitizeString(c.notes || '-')}</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Ошибка загрузки договора:', error);
        showError('Ошибка загрузки договора');
    }
}

async function exportContract(contractId, format) {
    try {
        showInfo('Подготовка файла к скачиванию...');
        
        const response = await fetch(`${API_BASE_URL}/api/contracts/${contractId}/export?format=${format}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Ошибка экспорта');
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        let ext = format;
        if (format === 'excel') ext = 'xlsx';
        else if (format === 'docx') ext = 'docx';
        else if (format === 'html') ext = 'html';
        
        a.download = `contract_${contractId}.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showSuccess(`Договор экспортирован в ${format.toUpperCase()}`);
    } catch (error) {
        console.error('Ошибка экспорта:', error);
        showError('Ошибка экспорта: ' + error.message);
    }
}


async function loadUsers() {
    if (!authToken || !userPermissions?.can_manage_users) {
        showError('Доступ запрещен');
        return;
    }
    
    document.getElementById('page-title').textContent = 'Управление сведениями о пользователях';
    document.getElementById('page-actions').innerHTML = `
        <button class="btn btn-success btn-sm" onclick="showAddUserModal()">
            <i class="bi bi-plus"></i> Новая запись пользователя
        </button>
    `;
    
    // Скрытые поля для хранения значений фильтров
    if (!document.getElementById('userRoleFilter')) {
        const hiddenDiv = document.createElement('div');
        hiddenDiv.style.display = 'none';
        hiddenDiv.innerHTML = `
            <input type="hidden" id="userRoleFilter" value="all">
            <input type="hidden" id="userStatusFilter" value="all">
        `;
        document.body.appendChild(hiddenDiv);
    }
    
    document.getElementById('content').innerHTML = `
        <div class="card mb-3">
            <div class="card-body py-2">
                <div class="row g-2 align-items-center">
                    <div class="col-md-5">
                        <div class="d-flex gap-2">
                            <input type="text" class="form-control" id="userSearchInput" 
                                   placeholder="Поиск по ФИО, email..." 
                                   autocomplete="off"
                                   onkeyup="applyUserFiltersDebounced()">
                            <button class="btn btn-outline-secondary" type="button" onclick="resetUserSearch()" title="Очистить">
                                <i class="bi bi-x-lg"></i>
                            </button>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <button class="btn btn-primary" onclick="showUserFiltersModal()">
                            <i class="bi bi-funnel"></i> Фильтры
                            <span id="userActiveFiltersBadge" class="badge bg-danger ms-1" style="display: none;">0</span>
                        </button>
                        <button class="btn btn-secondary ms-2" onclick="resetUserFilters()" title="Сбросить все фильтры">
                            <i class="bi bi-eraser"></i>
                        </button>
                    </div>
                    <div class="col-md-4 text-end">
                        <span class="text-muted" id="userFilterStats"></span>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="card">
            <div class="card-header">
                <h5 class="mb-0">Список пользователей</h5>
            </div>
            <div class="card-body">
                <div class="table-responsive">
                    <table class="table table-hover" id="usersTable">
                        <thead>
                            <tr>
                                <th>Email</th>
                                <th>ФИО</th>
                                <th>Роль</th>
                                <th>Телефон</th>
                                <th>Статус</th>
                                <th>Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr><td colspan="7" class="text-center"><div class="spinner-border spinner-border-sm"></div> Загрузка...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/users`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            allUsers = data.users || [];
            renderUsersTable(allUsers);
            
            const statsSpan = document.getElementById('userFilterStats');
            if (statsSpan) {
                statsSpan.innerHTML = `Всего: ${allUsers.length} пользователей`;
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки пользователей:', error);
        showError('Ошибка загрузки пользователей');
    }
}


let userSearchTimeout;
let allUsers = [];

function applyUserFiltersDebounced() {
    clearTimeout(userSearchTimeout);
    userSearchTimeout = setTimeout(() => {
        filterUsers();
    }, 500);
}

function filterUsers() {
    const search = (document.getElementById('userSearchInput')?.value || '').toLowerCase();
    const role = document.getElementById('userRoleFilter')?.value || 'all';
    const status = document.getElementById('userStatusFilter')?.value || 'all';
    
    let filtered = [...allUsers];
    
    if (search) {
        filtered = filtered.filter(u => {
            const fullName = `${u.last_name || ''} ${u.first_name || ''}${u.middle_name ? ' ' + u.middle_name : ''}`.toLowerCase();
            return (u.email && u.email.toLowerCase().includes(search)) ||
                   (fullName.includes(search)) ||
                   (u.phone && u.phone.toLowerCase().includes(search));
        });
    }
    
    if (role !== 'all') {
        filtered = filtered.filter(u => u.role === role);
    }
    
    if (status !== 'all') {
        const isActive = status === 'active';
        filtered = filtered.filter(u => u.is_active === isActive);
    }
    
    renderUsersTable(filtered);
    
    const statsSpan = document.getElementById('userFilterStats');
    if (statsSpan) {
        statsSpan.innerHTML = `Найдено: ${filtered.length} пользователей`;
    }
}

function renderUsersTable(users) {
    let html = '';
    
    if (users && users.length > 0) {
        users.forEach(u => {
            const roleClass = u.role === 'admin' ? 'bg-danger' : 
                             u.role === 'manager' ? 'bg-warning' : 'bg-primary';
            const roleText = u.role === 'admin' ? 'Заведующий склада' : 
                            u.role === 'manager' ? 'Менеджер по продажам' : 'Кладовщик';
            const statusClass = u.is_active ? 'bg-success' : 'bg-secondary';
            const statusText = u.is_active ? 'Активен' : 'Неактивен';
            
            // Формируем ФИО из полей
            const fullName = `${u.last_name || ''} ${u.first_name || ''}${u.middle_name ? ' ' + u.middle_name : ''}`.trim();
            
            html += `
                <tr>
                    <td>${escapeHtml(u.email)}</noscript>
                    <td>${escapeHtml(fullName || u.full_name || '-')}</noscript>
                    <td><span class="badge ${roleClass}">${roleText}</span></noscript>
                    <td>${escapeHtml(u.phone || '-')}</noscript>
                    <td><span class="badge ${statusClass}">${statusText}</span></noscript>
                    <td class="text-end">
                        <button class="btn btn-sm btn-outline-primary" onclick="showEditUserModal(${u.id})" title="Редактировать">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-warning" onclick="showResetPasswordModal(${u.id})" title="Сброс пароля">
                            <i class="bi bi-key"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="archiveUser(${u.id})" title="Архивировать">
                            <i class="bi bi-archive"></i>
                        </button>
                    </noscript>
                </table>
            `;
        });
    } else {
        html = '<tr><td colspan="6" class="text-center">Нет пользователей</noscript>';
    }
    
    const tbody = document.querySelector('#usersTable tbody');
    if (tbody) {
        tbody.innerHTML = html;
    }
}

function updateUserActiveFiltersBadge() {
    const role = document.getElementById('userRoleFilter')?.value || 'all';
    const status = document.getElementById('userStatusFilter')?.value || 'all';
    
    let activeCount = 0;
    if (role !== 'all') activeCount++;
    if (status !== 'all') activeCount++;
    
    const badge = document.getElementById('userActiveFiltersBadge');
    if (badge) {
        if (activeCount > 0) {
            badge.textContent = activeCount;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    }
}

function showUserFiltersModal() {
    const currentRole = document.getElementById('userRoleFilter')?.value || 'all';
    const currentStatus = document.getElementById('userStatusFilter')?.value || 'all';
    
    const modalHtml = `
        <div class="modal fade" id="userFiltersModal" tabindex="-1" data-bs-backdrop="static">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title"><i class="bi bi-funnel"></i> Фильтры пользователей</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <label class="form-label fw-bold">Роль</label>
                            <select class="form-select" id="filterUserRole">
                                <option value="all" ${currentRole === 'all' ? 'selected' : ''}>Все</option>
                                <option value="admin" ${currentRole === 'admin' ? 'selected' : ''}>Заведующий склада</option>
                                <option value="manager" ${currentRole === 'manager' ? 'selected' : ''}>Менеджер по продажам</option>
                                <option value="employee" ${currentRole === 'employee' ? 'selected' : ''}>Кладовщик</option>
                            </select>
                        </div>
                        <div class="mb-3">
                            <label class="form-label fw-bold">Статус</label>
                            <select class="form-select" id="filterUserStatus">
                                <option value="all" ${currentStatus === 'all' ? 'selected' : ''}>Все</option>
                                <option value="active" ${currentStatus === 'active' ? 'selected' : ''}>Активен</option>
                                <option value="inactive" ${currentStatus === 'inactive' ? 'selected' : ''}>Неактивен</option>
                            </select>
                        </div>
                        <hr>
                        <div class="d-flex justify-content-between">
                            <button type="button" class="btn btn-secondary" onclick="resetUserFiltersAndCloseModal()">
                                <i class="bi bi-eraser"></i> Сбросить все
                            </button>
                            <div>
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Отмена</button>
                                <button type="button" class="btn btn-primary" onclick="applyUserFiltersFromModal()">
                                    <i class="bi bi-check-lg"></i> Применить
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const oldModal = document.getElementById('userFiltersModal');
    if (oldModal) oldModal.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = new bootstrap.Modal(document.getElementById('userFiltersModal'));
    modal.show();
}

function applyUserFiltersFromModal() {
    const role = document.getElementById('filterUserRole')?.value || 'all';
    const status = document.getElementById('filterUserStatus')?.value || 'all';
    
    document.getElementById('userRoleFilter').value = role;
    document.getElementById('userStatusFilter').value = status;
    
    const modal = bootstrap.Modal.getInstance(document.getElementById('userFiltersModal'));
    if (modal) modal.hide();
    
    updateUserActiveFiltersBadge();
    filterUsers();
}

function resetUserFilters() {
    document.getElementById('userRoleFilter').value = 'all';
    document.getElementById('userStatusFilter').value = 'all';
    document.getElementById('userSearchInput').value = '';
    
    updateUserActiveFiltersBadge();
    filterUsers();
}

function resetUserFiltersAndCloseModal() {
    document.getElementById('filterUserRole').value = 'all';
    document.getElementById('filterUserStatus').value = 'all';
    applyUserFiltersFromModal();
}

function resetUserSearch() {
    const searchInput = document.getElementById('userSearchInput');
    if (searchInput) {
        searchInput.value = '';
        filterUsers();
    }
}

function showAddUserModal() {
    const modalHtml = `
    <div class="modal fade" id="addUserModal" tabindex="-1" data-bs-backdrop="static">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header bg-success text-white">
                    <h5 class="modal-title">Новый пользователь</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <form id="addUserForm" novalidate>
                    <div class="modal-body">
                        <div class="mb-3">
                            <label class="form-label required">Email</label>
                            <input type="email" class="form-control" name="email" id="userEmail" required 
                                   maxlength="100" autocomplete="off">
                            <div class="invalid-feedback">Введите корректный email</div>
                        </div>
                        
                        <div class="mb-3">
                            <label class="form-label required">Пароль</label>
                            <input type="password" class="form-control" name="password" id="userPassword" required 
                                   minlength="6" maxlength="100" autocomplete="new-password">
                            <div class="invalid-feedback">Пароль должен быть не менее 6 символов</div>
                        </div>
                        
                        <div class="row">
                            <div class="col-md-4 mb-3">
                                <label class="form-label required">Фамилия</label>
                                <input type="text" class="form-control" name="last_name" required 
                                       maxlength="50" autocomplete="off">
                                <div class="invalid-feedback">Введите фамилию</div>
                            </div>
                            <div class="col-md-4 mb-3">
                                <label class="form-label required">Имя</label>
                                <input type="text" class="form-control" name="first_name" required 
                                       maxlength="50" autocomplete="off">
                                <div class="invalid-feedback">Введите имя</div>
                            </div>
                            <div class="col-md-4 mb-3">
                                <label class="form-label">Отчество</label>
                                <input type="text" class="form-control" name="middle_name" 
                                       maxlength="50" autocomplete="off">
                            </div>
                        </div>
                        
                        <div class="mb-3">
                            <label class="form-label required">Роль</label>
                            <select class="form-select" name="role" required>
                                <option value="employee">Кладовщик</option>
                                <option value="manager">Менеджер по продажам</option>
                                <option value="admin">Заведующий склада</option>
                            </select>
                        </div>
                        
                        <div class="mb-3">
                            <label class="form-label">Телефон</label>
                            <div class="input-group">
                                <span class="input-group-text">+375</span>
                                <input type="tel" class="form-control" name="phone" id="userPhone"
                                       maxlength="9" autocomplete="off" placeholder="291234567"
                                       oninput="validatePhoneInput(this)"
                                       onkeypress="return isNumberKey(event)">
                            </div>
                            <div class="invalid-feedback" id="phoneFeedback">Введите 9 цифр (код оператора + номер)</div>
                            <div class="form-text">Введите 9 цифр после +375 (например: 291234567)</div>
                        </div>
                        
                        <div class="mb-3">
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" id="sendEmailCheckbox" checked>
                                <label class="form-check-label" for="sendEmailCheckbox">
                                    <strong>📧 Отправить письмо с учетными данными</strong>
                                </label>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Отмена</button>
                        <button type="submit" class="btn btn-success">Создать пользователя</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
    `;
    
    const oldModal = document.getElementById('addUserModal');
    if (oldModal) oldModal.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    const modal = new bootstrap.Modal(document.getElementById('addUserModal'));
    
    document.getElementById('addUserForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const form = e.target;
        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            return;
        }
        
        // Проверка телефона
        const phoneInput = document.getElementById('userPhone');
        let phoneValue = phoneInput.value.trim();
        if (phoneValue && phoneValue.length !== 9) {
            showError('Телефон должен содержать ровно 9 цифр после +375');
            return;
        }
        
        const formData = new FormData(e.target);
        const data = {};
        formData.forEach((value, key) => data[key] = escapeHtml(value));
        
        // Добавляем +375 к телефону если заполнен
        if (data.phone && data.phone.trim()) {
            data.phone = '+375' + data.phone.trim();
        } else {
            data.phone = null;
        }
        
        data.sendEmail = document.getElementById('sendEmailCheckbox').checked;
        
        const btn = e.target.querySelector('button[type="submit"]');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Создание...';
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (result.success) {
                modal.hide();
                showSuccess(result.message);
                loadUsers();
                loadUserList();
            } else {
                showError(result.message);
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
        } catch (error) {
            showError('Ошибка сети: ' + error.message);
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    });
    
    modal.show();
}

async function showEditUserModal(userId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/users`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const data = await response.json();
        const user = data.users.find(u => u.id === userId);
        
        if (!user) {
            showError('Пользователь не найден');
            return;
        }
        
        // Извлекаем телефон без +375
        let phoneNumberOnly = '';
        if (user.phone && user.phone.startsWith('+375')) {
            phoneNumberOnly = user.phone.substring(4);
        } else if (user.phone) {
            phoneNumberOnly = user.phone.replace(/[^\d]/g, '');
            if (phoneNumberOnly.length > 9) phoneNumberOnly = phoneNumberOnly.slice(-9);
        }
        
        const modalHtml = `
        <div class="modal fade" id="editUserModal" tabindex="-1" data-bs-backdrop="static">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title">Редактировать пользователя</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <form id="editUserForm" novalidate>
                        <div class="modal-body">
                            <div class="mb-3">
                                <label class="form-label required">Email</label>
                                <input type="email" class="form-control" name="email" id="editUserEmail" 
                                       value="${escapeHtml(user.email)}" required 
                                       maxlength="100" autocomplete="off">
                                <div class="invalid-feedback">Введите корректный email</div>
                            </div>
                            
                            <div class="row">
                                <div class="col-md-4 mb-3">
                                    <label class="form-label required">Фамилия</label>
                                    <input type="text" class="form-control" name="last_name" value="${escapeHtml(user.last_name || '')}" required maxlength="50">
                                </div>
                                <div class="col-md-4 mb-3">
                                    <label class="form-label required">Имя</label>
                                    <input type="text" class="form-control" name="first_name" value="${escapeHtml(user.first_name || '')}" required maxlength="50">
                                </div>
                                <div class="col-md-4 mb-3">
                                    <label class="form-label">Отчество</label>
                                    <input type="text" class="form-control" name="middle_name" value="${escapeHtml(user.middle_name || '')}" maxlength="50">
                                </div>
                            </div>
                            
                            <div class="mb-3">
                                <label class="form-label required">Роль</label>
                                <select class="form-select" name="role" required>
                                    <option value="employee" ${user.role === 'employee' ? 'selected' : ''}>Кладовщик</option>
                                    <option value="manager" ${user.role === 'manager' ? 'selected' : ''}>Менеджер по продажам</option>
                                    <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Заведующий склада</option>
                                </select>
                            </div>
                            
                            <div class="mb-3">
                                <label class="form-label">Телефон</label>
                                <div class="input-group">
                                    <span class="input-group-text">+375</span>
                                    <input type="tel" class="form-control" name="phone" id="editUserPhone"
                                           maxlength="9" autocomplete="off" placeholder="291234567"
                                           value="${phoneNumberOnly}"
                                           oninput="validateEditPhoneInput(this)"
                                           onkeypress="return isNumberKey(event)">
                                </div>
                                <div class="invalid-feedback" id="editPhoneFeedback">Введите 9 цифр (код оператора + номер)</div>
                                <div class="form-text">Введите 9 цифр после +375 (например: 291234567)</div>
                            </div>
                            
                            <div class="mb-3">
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" name="is_active" id="isActive" ${user.is_active ? 'checked' : ''}>
                                    <label class="form-check-label" for="isActive">Активен</label>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Отмена</button>
                            <button type="submit" class="btn btn-primary">Сохранить изменения</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
        `;
        
        const oldModal = document.getElementById('editUserModal');
        if (oldModal) oldModal.remove();
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Функция валидации телефона
        window.validateEditPhoneInput = function(input) {
            let value = input.value.replace(/[^\d]/g, '');
            if (value.length > 9) value = value.slice(0, 9);
            input.value = value;
            
            const feedback = document.getElementById('editPhoneFeedback');
            
            if (!value) {
                input.classList.remove('is-invalid');
                input.classList.remove('is-valid');
                return true;
            }
            
            if (value.length !== 9) {
                input.classList.add('is-invalid');
                if (feedback) feedback.textContent = `Введите ровно 9 цифр (сейчас ${value.length})`;
                return false;
            }
            
            const firstDigit = value.charAt(0);
            if (!['2', '3', '4', '5'].includes(firstDigit)) {
                input.classList.add('is-invalid');
                if (feedback) feedback.textContent = 'Некорректный код оператора (должен начинаться с 2,3,4,5)';
                return false;
            }
            
            input.classList.remove('is-invalid');
            input.classList.add('is-valid');
            return true;
        };
        
        const modal = new bootstrap.Modal(document.getElementById('editUserModal'));
        
        document.getElementById('editUserForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const form = e.target;
            
            // Проверка email
            const emailInput = document.getElementById('editUserEmail');
            const email = emailInput.value.trim();
            if (!isValidEmail(email)) {
                showError('Введите корректный email');
                emailInput.classList.add('is-invalid');
                return;
            }
            
            // Проверка телефона
            const phoneValue = document.getElementById('editUserPhone').value;
            if (phoneValue && phoneValue.length !== 9) {
                showError('Телефон должен содержать ровно 9 цифр после +375');
                return;
            }
            
            if (!form.checkValidity()) {
                form.classList.add('was-validated');
                return;
            }
            
            const formData = new FormData(e.target);
            const data = {};
            formData.forEach((value, key) => data[key] = escapeHtml(value));
            data.is_active = document.getElementById('isActive').checked ? 1 : 0;
            
            // Добавляем +375 к телефону если заполнен
            if (data.phone && data.phone.trim()) {
                data.phone = '+375' + data.phone.trim();
            } else {
                data.phone = null;
            }
            
            const btn = e.target.querySelector('button[type="submit"]');
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Сохранение...';
            
            try {
                const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: JSON.stringify(data)
                });
                
                const result = await response.json();
                
                if (result.success) {
                    modal.hide();
                    showSuccess('Пользователь обновлен');
                    loadUsers();
                    loadUserList();
                } else {
                    showError(result.message);
                    btn.disabled = false;
                    btn.innerHTML = 'Сохранить изменения';
                }
            } catch (error) {
                showError('Ошибка сети: ' + error.message);
                btn.disabled = false;
                btn.innerHTML = 'Сохранить изменения';
            }
        });
        
        modal.show();
    } catch (error) {
        console.error('Ошибка:', error);
        showError('Ошибка загрузки данных пользователя');
    }
}

function showResetPasswordModal(userId) {
    const modalHtml = `
    <div class="modal fade" id="resetPasswordModal" tabindex="-1">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header bg-warning text-white">
                    <h5 class="modal-title">Сброс пароля</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <form id="resetPasswordForm" novalidate>
                    <div class="modal-body">
                        <div class="alert alert-info">
                            <i class="bi bi-info-circle"></i> Новый пароль должен быть не менее 6 символов.
                        </div>
                        <div class="mb-3">
                            <label class="form-label required">Новый пароль</label>
                            <input type="password" class="form-control" name="newPassword" id="newPassword" required 
                                   minlength="6" pattern=".{6,}" autocomplete="new-password">
                            <div class="invalid-feedback">Пароль должен быть не менее 6 символов</div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Отмена</button>
                        <button type="submit" class="btn btn-warning">Сбросить пароль</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
    `;
    
    const oldModal = document.getElementById('resetPasswordModal');
    if (oldModal) oldModal.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    const modal = new bootstrap.Modal(document.getElementById('resetPasswordModal'));
    
    document.getElementById('resetPasswordForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const form = e.target;
        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            return;
        }
        
        const newPassword = document.querySelector('input[name="newPassword"]').value;
        
        if (newPassword.length < 6) {
            showError('Пароль должен быть не менее 6 символов');
            return;
        }
        
        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Сброс...';
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/users/${userId}/reset-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({ newPassword })
            });
            
            const result = await response.json();
            
            if (result.success) {
                modal.hide();
                showSuccess('Пароль сброшен');
            } else {
                showError(result.message);
                btn.disabled = false;
                btn.innerHTML = 'Сбросить пароль';
            }
        } catch (error) {
            showError('Ошибка сети');
            btn.disabled = false;
            btn.innerHTML = 'Сбросить пароль';
        }
    });
    
    modal.show();
}

// Переименуйте и измените функцию
async function archiveUser(userId) {
    if (!confirm('Вы уверены, что хотите архивировать пользователя?')) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showSuccess('Пользователь архивирован');
            loadUsers(); // Обновляем список пользователей
            loadUserList(); // Обновляем список для входа
        } else {
            showError(data.message);
        }
    } catch (error) {
        console.error('Ошибка архивации пользователя:', error);
        showError('Ошибка архивации пользователя: ' + error.message);
    }
}


async function loadInventories() {
    if (!authToken) return;
    
    document.getElementById('page-title').textContent = 'Инвентаризация';
    
    document.getElementById('page-actions').innerHTML = `
        <button class="btn btn-success btn-sm" onclick="showCreateInventoryModal()">
            <i class="bi bi-plus"></i> Новая инвентаризация
        </button>
    `;
    
    // Скрытые поля для хранения значений фильтров
    if (!document.getElementById('inventoryStatusFilter')) {
        const hiddenDiv = document.createElement('div');
        hiddenDiv.style.display = 'none';
        hiddenDiv.innerHTML = `
            <input type="hidden" id="inventoryStatusFilter" value="all">
            <input type="hidden" id="inventoryDateFrom">
            <input type="hidden" id="inventoryDateTo">
        `;
        document.body.appendChild(hiddenDiv);
    }
    
    document.getElementById('content').innerHTML = `
        <div class="card mb-3">
            <div class="card-body py-2">
                <div class="row g-2 align-items-center">
                    <div class="col-md-5">
                        <div class="d-flex gap-2">
                            <input type="text" class="form-control" id="inventorySearchInput" 
                                   placeholder="Поиск по номеру инвентаризации..." 
                                   autocomplete="off"
                                   onkeyup="applyInventoryFiltersDebounced()">
                            <button class="btn btn-outline-secondary" type="button" onclick="resetInventorySearch()" title="Очистить">
                                <i class="bi bi-x-lg"></i>
                            </button>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <button class="btn btn-primary" onclick="showInventoryFiltersModal()">
                            <i class="bi bi-funnel"></i> Фильтры
                            <span id="inventoryActiveFiltersBadge" class="badge bg-danger ms-1" style="display: none;">0</span>
                        </button>
                        <button class="btn btn-secondary ms-2" onclick="resetInventoryFilters()" title="Сбросить все фильтры">
                            <i class="bi bi-eraser"></i>
                        </button>
                    </div>
                    <div class="col-md-4 text-end">
                        <span class="text-muted" id="inventoryFilterStats"></span>
                    </div>
                </div>
            </div>
        </div>
        <div class="text-center py-5">
            <div class="spinner-border" style="color: var(--accent);"></div>
            <p class="mt-3">Загрузка...</p>
        </div>
    `;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/inventory`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (!response.ok) {
            throw new Error(`Ошибка сервера: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            // Сохраняем все инвентаризации для фильтрации
            allInventories = data.inventories || [];
            
            let html = `
                <div class="card mb-3">
                    <div class="card-body py-2">
                        <div class="row g-2 align-items-center">
                            <div class="col-md-5">
                                <div class="d-flex gap-2">
                                    <input type="text" class="form-control" id="inventorySearchInput" 
                                           placeholder="Поиск по номеру инвентаризации..." 
                                           autocomplete="off"
                                           onkeyup="applyInventoryFiltersDebounced()">
                                    <button class="btn btn-outline-secondary" type="button" onclick="resetInventorySearch()" title="Очистить">
                                        <i class="bi bi-x-lg"></i>
                                    </button>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <button class="btn btn-primary" onclick="showInventoryFiltersModal()">
                                    <i class="bi bi-funnel"></i> Фильтры
                                    <span id="inventoryActiveFiltersBadge" class="badge bg-danger ms-1" style="display: none;">0</span>
                                </button>
                                <button class="btn btn-secondary ms-2" onclick="resetInventoryFilters()" title="Сбросить все фильтры">
                                    <i class="bi bi-eraser"></i>
                                </button>
                            </div>
                            <div class="col-md-4 text-end">
                                <span class="text-muted" id="inventoryFilterStats"></span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="card">
                    <div class="card-header">
                        <h5 class="mb-0">Список инвентаризаций</h5>
                    </div>
                    <div class="card-body">
                        <div class="table-responsive">
                            <table class="table table-hover" id="inventoryTable">
                                <thead>
                                    <tr>
                                        <th>Номер</th>
                                        <th>Дата</th>
                                        <th>Статус</th>
                                        <th>Всего приборов (шт.)</th>
                                        <th>Расхождений</th>
                                        <th>Создал</th>
                                        <th>Действия</th>
                                    </tr>
                                </thead>
                                <tbody>
            `;
            
            if (allInventories.length > 0) {
                allInventories.forEach(i => {
                    const statusClass = i.status === 'completed' ? 'bg-success' :
                                       i.status === 'in_progress' ? 'bg-warning' : 'bg-secondary';
                    
                    html += `
                        <tr>
                            <td><code>${sanitizeString(i.inventory_number)}</code></td>
                            <td>${new Date(i.inventory_date).toLocaleDateString()}</td>
                            <td><span class="badge ${statusClass}">${sanitizeString(i.status_name)}</span></td>
                            <td>${i.items_count || 0}</td>
                            <td>${i.discrepancies_count || 0}</td>
                            <td>${sanitizeString(i.created_by_name || '-')}</td>
                            <td>
                                <button class="btn btn-sm btn-outline-info" onclick="viewInventory(${i.id})" title="Просмотр">
                                    <i class="bi bi-eye"></i>
                                </button>
                                ${userPermissions?.role === 'admin' && (i.status === 'completed' || i.status === 'draft') ? `
<button class="btn btn-sm btn-outline-danger" onclick="deleteInventory(${i.id})" title="Удалить">
    <i class="bi bi-trash"></i>
</button>
` : ''}
                            </td>
                        </tr>
                    `;
                });
            } else {
                html += '<tr><td colspan="7" class="text-center">Нет инвентаризаций</td>';
            }
            
            html += `
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
            document.getElementById('content').innerHTML = html;
            
            // Обновляем статистику
            const statsSpan = document.getElementById('inventoryFilterStats');
            if (statsSpan) {
                statsSpan.innerHTML = `Всего: ${allInventories.length} инвентаризаций`;
            }
        } else {
            throw new Error(data.message || 'Ошибка загрузки данных');
        }
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        document.getElementById('content').innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle"></i> 
                Не удалось загрузить инвентаризации. Ошибка: ${error.message}
                <br><br>
                <button class="btn btn-primary" onclick="loadInventories()">
                    <i class="bi bi-arrow-repeat"></i> Повторить
                </button>
            </div>
        `;
    }
}


let inventorySearchTimeout;
let allInventories = [];

function applyInventoryFiltersDebounced() {
    clearTimeout(inventorySearchTimeout);
    inventorySearchTimeout = setTimeout(() => {
        filterInventories();
    }, 500);
}

function filterInventories() {
    const search = (document.getElementById('inventorySearchInput')?.value || '').toLowerCase();
    const status = document.getElementById('inventoryStatusFilter')?.value || 'all';
    const dateFrom = document.getElementById('inventoryDateFrom')?.value || '';
    const dateTo = document.getElementById('inventoryDateTo')?.value || '';
    
    let filtered = [...allInventories];
    
    if (search) {
        filtered = filtered.filter(i => 
            i.inventory_number && i.inventory_number.toLowerCase().includes(search)
        );
    }
    
    if (status !== 'all') {
        filtered = filtered.filter(i => i.status === status);
    }
    
    if (dateFrom) {
        filtered = filtered.filter(i => {
            const date = new Date(i.inventory_date).toISOString().split('T')[0];
            return date >= dateFrom;
        });
    }
    if (dateTo) {
        filtered = filtered.filter(i => {
            const date = new Date(i.inventory_date).toISOString().split('T')[0];
            return date <= dateTo;
        });
    }
    
    renderInventoriesTable(filtered);
    
    const statsSpan = document.getElementById('inventoryFilterStats');
    if (statsSpan) {
        statsSpan.innerHTML = `Найдено: ${filtered.length} инвентаризаций`;
    }
}


function updateInventoryActiveFiltersBadge() {
    const status = document.getElementById('inventoryStatusFilter')?.value || 'all';
    const dateFrom = document.getElementById('inventoryDateFrom')?.value || '';
    const dateTo = document.getElementById('inventoryDateTo')?.value || '';
    
    let activeCount = 0;
    if (status !== 'all') activeCount++;
    if (dateFrom) activeCount++;
    if (dateTo) activeCount++;
    
    const badge = document.getElementById('inventoryActiveFiltersBadge');
    if (badge) {
        if (activeCount > 0) {
            badge.textContent = activeCount;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    }
}

function showInventoryFiltersModal() {
    const currentStatus = document.getElementById('inventoryStatusFilter')?.value || 'all';
    const currentDateFrom = document.getElementById('inventoryDateFrom')?.value || '';
    const currentDateTo = document.getElementById('inventoryDateTo')?.value || '';
    
    const modalHtml = `
        <div class="modal fade" id="inventoryFiltersModal" tabindex="-1" data-bs-backdrop="static">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title"><i class="bi bi-funnel"></i> Фильтры инвентаризаций</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <label class="form-label fw-bold">Статус</label>
                            <select class="form-select" id="filterInventoryStatus">
                                <option value="all" ${currentStatus === 'all' ? 'selected' : ''}>Все</option>
                                <option value="draft" ${currentStatus === 'draft' ? 'selected' : ''}>Черновик</option>
                                <option value="completed" ${currentStatus === 'completed' ? 'selected' : ''}>Завершена</option>
                            </select>
                        </div>
                        <div class="mb-3">
                            <label class="form-label fw-bold">Период создания</label>
                            <div class="row g-2">
                                <div class="col-6">
                                    <input type="date" class="form-control" id="filterInventoryDateFrom" value="${currentDateFrom}" placeholder="Дата от">
                                </div>
                                <div class="col-6">
                                    <input type="date" class="form-control" id="filterInventoryDateTo" value="${currentDateTo}" placeholder="Дата до">
                                </div>
                            </div>
                        </div>
                        <hr>
                        <div class="d-flex justify-content-between">
                            <button type="button" class="btn btn-secondary" onclick="resetInventoryFiltersAndCloseModal()">
                                <i class="bi bi-eraser"></i> Сбросить все
                            </button>
                            <div>
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Отмена</button>
                                <button type="button" class="btn btn-primary" onclick="applyInventoryFiltersFromModal()">
                                    <i class="bi bi-check-lg"></i> Применить
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const oldModal = document.getElementById('inventoryFiltersModal');
    if (oldModal) oldModal.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = new bootstrap.Modal(document.getElementById('inventoryFiltersModal'));
    modal.show();
}

function applyInventoryFiltersFromModal() {
    const status = document.getElementById('filterInventoryStatus')?.value || 'all';
    const dateFrom = document.getElementById('filterInventoryDateFrom')?.value || '';
    const dateTo = document.getElementById('filterInventoryDateTo')?.value || '';
    
    document.getElementById('inventoryStatusFilter').value = status;
    document.getElementById('inventoryDateFrom').value = dateFrom;
    document.getElementById('inventoryDateTo').value = dateTo;
    
    const modal = bootstrap.Modal.getInstance(document.getElementById('inventoryFiltersModal'));
    if (modal) modal.hide();
    
    updateInventoryActiveFiltersBadge();
    filterInventories();
}

function resetInventoryFilters() {
    document.getElementById('inventoryStatusFilter').value = 'all';
    document.getElementById('inventoryDateFrom').value = '';
    document.getElementById('inventoryDateTo').value = '';
    document.getElementById('inventorySearchInput').value = '';
    
    updateInventoryActiveFiltersBadge();
    filterInventories();
}

function resetInventoryFiltersAndCloseModal() {
    document.getElementById('filterInventoryStatus').value = 'all';
    document.getElementById('filterInventoryDateFrom').value = '';
    document.getElementById('filterInventoryDateTo').value = '';
    applyInventoryFiltersFromModal();
}

function resetInventorySearch() {
    const searchInput = document.getElementById('inventorySearchInput');
    if (searchInput) {
        searchInput.value = '';
        filterInventories();
    }
}

function showCreateInventoryModal() {
    const today = new Date().toISOString().split('T')[0];
    
    // Материально ответственное лицо (скрытое поле)
    const responsiblePersonName = 'Иванов И.И.';
    const responsiblePersonPosition = 'Заведующий склада';
    const responsiblePerson = `${responsiblePersonName} (${responsiblePersonPosition})`;
    
    const modalHtml = `
    <div class="modal fade" id="createInventoryModal" tabindex="-1">
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header bg-success text-white">
                    <h5 class="modal-title">Новая инвентаризация</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <form id="createInventoryForm" novalidate>
                    <div class="modal-body">
                        <!-- Скрытые поля -->
                        <input type="hidden" id="inventoryDate" value="${today}">
                        <input type="hidden" id="inventoryStartDate" value="${today}">
                        <input type="hidden" id="inventoryEndDate" value="${today}">
                        <input type="hidden" id="responsiblePerson" value="${responsiblePerson}">
                        
                        <!-- Данные приказа (ОБЯЗАТЕЛЬНЫЕ) -->
                        <div class="row">
                            <div class="col-md-6 mb-3">
                                <label class="form-label required">Номер приказа</label>
                                <input type="text" class="form-control" id="orderNumber" 
                                       placeholder="№ приказа" maxlength="50" required>
                                <div class="invalid-feedback">Введите номер приказа</div>
                            </div>
                            <div class="col-md-6 mb-3">
                                <label class="form-label required">Дата приказа</label>
                                <input type="date" class="form-control" id="orderDate" max="${today}" required>
                                <div class="invalid-feedback">Выберите дату приказа</div>
                            </div>
                        </div>
                        
                        <!-- Председатель комиссии (ОБЯЗАТЕЛЬНЫЙ) -->
                        <div class="mb-3">
                            <label class="form-label required">Председатель комиссии</label>
                            <div class="row">
                                <div class="col-md-8 mb-2">
                                    <input type="text" class="form-control" id="commissionChairmanName" 
                                           placeholder="ФИО председателя" maxlength="255" required>
                                    <div class="invalid-feedback">Введите ФИО председателя</div>
                                </div>
                                <div class="col-md-4">
                                    <input type="text" class="form-control" id="commissionChairmanPosition" 
                                           placeholder="Должность" maxlength="100" required>
                                    <div class="invalid-feedback">Введите должность</div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Члены комиссии (ОБЯЗАТЕЛЬНЫЕ - минимум 1) -->
                        <div class="mb-3">
                            <label class="form-label required">Члены комиссии</label>
                            <div id="commissionMembersContainer">
                                <div class="row mb-2 member-row">
                                    <div class="col-md-8">
                                        <input type="text" class="form-control member-name" 
                                               placeholder="ФИО члена комиссии" maxlength="255" required>
                                        <div class="invalid-feedback">Введите ФИО члена комиссии</div>
                                    </div>
                                    <div class="col-md-3">
                                        <input type="text" class="form-control member-position" 
                                               placeholder="Должность" maxlength="100" required>
                                        <div class="invalid-feedback">Введите должность</div>
                                    </div>
                                    <div class="col-md-1">
                                        <button type="button" class="btn btn-outline-danger remove-member" disabled style="width: 100%;">×</button>
                                    </div>
                                </div>
                            </div>
                            <button type="button" class="btn btn-sm btn-outline-primary mt-1" id="addMemberBtn">
                                <i class="bi bi-plus"></i> Добавить члена комиссии
                            </button>
                        </div>
                        
                        <!-- Примечания -->
                        <div class="mb-3">
                            <label class="form-label">Примечания</label>
                            <textarea class="form-control" id="inventoryNotes" rows="2" 
                                      placeholder="Основание для инвентаризации, дополнительные сведения" maxlength="1000"></textarea>
                        </div>
                        
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Отмена</button>
                        <button type="submit" class="btn btn-success">Создать инвентаризацию</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
    `;
    
    const oldModal = document.getElementById('createInventoryModal');
    if (oldModal) oldModal.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Функция проверки наличия хотя бы одного члена комиссии
    function validateCommissionMembers() {
        const rows = document.querySelectorAll('#commissionMembersContainer .member-row');
        let isValid = true;
        
        rows.forEach(row => {
            const nameInput = row.querySelector('.member-name');
            const positionInput = row.querySelector('.member-position');
            
            if (!nameInput.value.trim()) {
                nameInput.classList.add('is-invalid');
                isValid = false;
            } else {
                nameInput.classList.remove('is-invalid');
            }
            
            if (!positionInput.value.trim()) {
                positionInput.classList.add('is-invalid');
                isValid = false;
            } else {
                positionInput.classList.remove('is-invalid');
            }
        });
        
        return isValid && rows.length > 0;
    }
    
    // Функция обновления кнопок удаления
    function updateRemoveButtons() {
        const rows = document.querySelectorAll('#commissionMembersContainer .member-row');
        rows.forEach((row, idx) => {
            const btn = row.querySelector('.remove-member');
            if (btn) {
                btn.disabled = rows.length === 1;
            }
        });
    }
    
    // Добавление нового члена комиссии
    document.getElementById('addMemberBtn').addEventListener('click', function() {
        const container = document.getElementById('commissionMembersContainer');
        const newRow = document.createElement('div');
        newRow.className = 'row mb-2 member-row';
        newRow.innerHTML = `
            <div class="col-md-8">
                <input type="text" class="form-control member-name" placeholder="ФИО члена комиссии" maxlength="255" required>
                <div class="invalid-feedback">Введите ФИО члена комиссии</div>
            </div>
            <div class="col-md-3">
                <input type="text" class="form-control member-position" placeholder="Должность" maxlength="100" required>
                <div class="invalid-feedback">Введите должность</div>
            </div>
            <div class="col-md-1">
                <button type="button" class="btn btn-outline-danger remove-member" style="width: 100%;">×</button>
            </div>
        `;
        container.appendChild(newRow);
        
        newRow.querySelector('.remove-member').addEventListener('click', function() {
            newRow.remove();
            updateRemoveButtons();
        });
        
        updateRemoveButtons();
    });
    
    // Обработчики для существующих кнопок удаления
    document.querySelectorAll('#commissionMembersContainer .remove-member').forEach(btn => {
        btn.addEventListener('click', function() {
            const row = this.closest('.member-row');
            row.remove();
            updateRemoveButtons();
        });
    });
    
    updateRemoveButtons();
    
    const modal = new bootstrap.Modal(document.getElementById('createInventoryModal'));
    
    // Обработка отправки формы
    document.getElementById('createInventoryForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const form = e.target;
        
        // Валидация обязательных полей
        let isValid = true;
        
        // Проверка номера приказа
        const orderNumber = document.getElementById('orderNumber');
        if (!orderNumber.value.trim()) {
            orderNumber.classList.add('is-invalid');
            isValid = false;
        } else {
            orderNumber.classList.remove('is-invalid');
        }
        
        // Проверка даты приказа
        const orderDate = document.getElementById('orderDate');
        if (!orderDate.value) {
            orderDate.classList.add('is-invalid');
            isValid = false;
        } else {
            orderDate.classList.remove('is-invalid');
        }
        
        // Проверка председателя
        const chairmanName = document.getElementById('commissionChairmanName');
        const chairmanPosition = document.getElementById('commissionChairmanPosition');
        
        if (!chairmanName.value.trim()) {
            chairmanName.classList.add('is-invalid');
            isValid = false;
        } else {
            chairmanName.classList.remove('is-invalid');
        }
        
        if (!chairmanPosition.value.trim()) {
            chairmanPosition.classList.add('is-invalid');
            isValid = false;
        } else {
            chairmanPosition.classList.remove('is-invalid');
        }
        
        // Проверка членов комиссии
        if (!validateCommissionMembers()) {
            isValid = false;
            showError('Добавьте хотя бы одного члена комиссии и заполните все поля');
        }
        
        if (!isValid) {
            showError('Пожалуйста, заполните все обязательные поля');
            return;
        }
        
        // Собираем председателя комиссии
        const commissionChairman = `${chairmanName.value.trim()} (${chairmanPosition.value.trim()})`;
        
        // Собираем членов комиссии
        const commissionMembers = [];
        document.querySelectorAll('#commissionMembersContainer .member-row').forEach(row => {
            const name = row.querySelector('.member-name').value.trim();
            const position = row.querySelector('.member-position').value.trim();
            if (name && position) {
                commissionMembers.push(`${name} (${position})`);
            }
        });
        
        // Получаем значение из скрытого поля
        const responsiblePerson = document.getElementById('responsiblePerson').value;
        
        const data = {
            inventoryDate: document.getElementById('inventoryDate').value,
            orderNumber: orderNumber.value.trim(),
            orderDate: orderDate.value,
            commissionChairman: commissionChairman,
            commissionMembers: commissionMembers,
            inventoryStartDate: document.getElementById('inventoryStartDate').value,
            inventoryEndDate: document.getElementById('inventoryEndDate').value,
            responsiblePerson: responsiblePerson,
            notes: sanitizeString(document.getElementById('inventoryNotes').value) || null
        };
        
        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Создание...';
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/inventory`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (result.success) {
                modal.hide();
                showSuccess('Инвентаризация создана');
                loadInventories();
            } else {
                showError('❌ ' + (result.message || 'Ошибка при создании'));
                btn.disabled = false;
                btn.innerHTML = 'Создать инвентаризацию';
            }
        } catch (error) {
            console.error('Ошибка:', error);
            showError('❌ Ошибка сети: ' + error.message);
            btn.disabled = false;
            btn.innerHTML = 'Создать инвентаризацию';
        }
    });
    
    modal.show();
}

function validateNonNegativeInteger(input) {
    let value = parseInt(input.value);
    if (isNaN(value) || value < 0) {
        input.value = 0;
    }
}
async function viewInventory(inventoryId) {
    currentInventoryId = inventoryId;
    
    document.getElementById('page-title').textContent = 'Инвентаризация';
    document.getElementById('content').innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border" style="color: var(--accent);"></div>
            <p class="mt-3">Загрузка...</p>
        </div>
    `;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/inventory/${inventoryId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (!response.ok) {
            throw new Error(`Ошибка сервера: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            const inv = data.inventory;
            const items = data.items || [];
            
            // Определяем, есть ли расхождения (после того как items загружены)
            let hasDiscrepancies = false;
            if (items && items.length > 0) {
                hasDiscrepancies = items.some(item => item.difference !== 0);
            }
            
            // Определяем, завершена ли инвентаризация
            const isCompleted = inv.status === 'completed';
            
            // Формируем кнопки экспорта ТОЛЬКО если инвентаризация завершена
            let actionButtons = `
                <button class="btn btn-secondary btn-sm" onclick="loadInventories()">
                    <i class="bi bi-arrow-left"></i> Назад
                </button>
            `;
            
            // Добавляем кнопки экспорта только для завершенных инвентаризаций
            if (isCompleted) {
                actionButtons += `
                <div class="btn-group ms-2">
                    <button class="btn btn-success btn-sm dropdown-toggle" data-bs-toggle="dropdown">
                        <i class="bi bi-file-earmark-spreadsheet"></i> Экспорт
                    </button>
                    <ul class="dropdown-menu">
                        <li class="dropdown-header"><strong>📋 Инвентаризационная опись</strong></li>
                        <li><a class="dropdown-item" href="#" onclick="exportInventoryDocument(${inventoryId}, 'inventory_list', 'html'); return false;">
                            <i class="bi bi-eye"></i> Просмотр (HTML)
                        </a></li>
                        <li><a class="dropdown-item" href="#" onclick="exportInventoryDocument(${inventoryId}, 'inventory_list', 'docx'); return false;">
                            <i class="bi bi-file-word"></i> Word (DOCX)
                        </a></li>
                `;
                
                // Показываем раздел со сличительной ведомостью ТОЛЬКО если есть расхождения
                if (hasDiscrepancies) {
                    actionButtons += `
                        <li><hr class="dropdown-divider"></li>
                        <li class="dropdown-header"><strong>📊 Сличительная ведомость</strong></li>
                        <li><a class="dropdown-item" href="#" onclick="exportInventoryDocument(${inventoryId}, 'comparison_sheet', 'html'); return false;">
                            <i class="bi bi-eye"></i> Просмотр (HTML)
                        </a></li>
                        <li><a class="dropdown-item" href="#" onclick="exportInventoryDocument(${inventoryId}, 'comparison_sheet', 'docx'); return false;">
                            <i class="bi bi-file-word"></i> Word (DOCX)
                        </a></li>
                    `;
                }
                
                actionButtons += `
                    </ul>
                </div>
                `;
            }
            
            document.getElementById('page-actions').innerHTML = actionButtons;
            
            // Парсим членов комиссии из JSON
            let commissionMembersList = [];
            if (inv.commission_members) {
                try {
                    commissionMembersList = JSON.parse(inv.commission_members);
                } catch(e) {
                    commissionMembersList = [];
                }
            }
            
            const statusClass = inv.status === 'completed' ? 'bg-success' :
                               inv.status === 'in_progress' ? 'bg-warning' : 'bg-secondary';
            
            // Формируем HTML для информации об инвентаризации
            let infoHtml = `
                <div class="card mb-4">
                    <div class="card-header">
                        <h5 class="mb-0">Инвентаризация ${escapeHtml(inv.inventory_number)}</h5>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-4">
                                <p><strong>Дата инвентаризации:</strong> ${new Date(inv.inventory_date).toLocaleDateString()}</p>
                                <p><strong>Статус:</strong> <span class="badge ${statusClass}">${escapeHtml(inv.status_name)}</span></p>
                            </div>
                            <div class="col-md-4">
                                <p><strong>Создал:</strong> ${escapeHtml(inv.created_by_name || '-')}</p>
<p><strong>Дата создания:</strong> ${new Date(inv.created_at).toLocaleDateString()}</p>
                            </div>
                            <div class="col-md-4">
                                <p><strong>Завершил:</strong> ${escapeHtml(inv.completed_by_name || '-')}</p>
<p><strong>Дата завершения:</strong> ${inv.completed_at ? new Date(inv.completed_at).toLocaleDateString() : '-'}</p>
                            </div>
                        </div>
                        
                        ${inv.order_number || inv.order_date ? `
                        <hr>
                        <div class="row">
                            <div class="col-md-6">
                                <p><strong>Номер приказа:</strong> ${escapeHtml(inv.order_number || '-')}</p>
                            </div>
                            <div class="col-md-6">
                                <p><strong>Дата приказа:</strong> ${inv.order_date ? new Date(inv.order_date).toLocaleDateString() : '-'}</p>
                            </div>
                        </div>
                        ` : ''}
                        
                        ${inv.inventory_start_date || inv.inventory_end_date ? `
                        <div class="row">
                            <div class="col-md-6">
                                <p><strong>Дата начала:</strong> ${inv.inventory_start_date ? new Date(inv.inventory_start_date).toLocaleDateString() : '-'}</p>
                            </div>
                            <div class="col-md-6">
                                <p><strong>Дата окончания:</strong> ${inv.inventory_end_date ? new Date(inv.inventory_end_date).toLocaleDateString() : '-'}</p>
                            </div>
                        </div>
                        ` : ''}
                        
                        ${inv.commission_chairman ? `
                        <hr>
                        <div class="row">
                            <div class="col-md-12">
                                <p><strong>Председатель комиссии:</strong> ${escapeHtml(inv.commission_chairman)}</p>
                            </div>
                        </div>
                        ` : ''}
                        
                        ${commissionMembersList.length > 0 ? `
                        <div class="row">
                            <div class="col-md-12">
                                <p><strong>Члены комиссии:</strong></p>
                                <ul>
                                    ${commissionMembersList.map(m => `<li>${escapeHtml(m)}</li>`).join('')}
                                </ul>
                            </div>
                        </div>
                        ` : ''}
                        
                        ${inv.responsible_person ? `
                        <div class="row">
                            <div class="col-md-12">
                                <p><strong>Материально ответственное лицо:</strong> ${escapeHtml(inv.responsible_person)}</p>
                            </div>
                        </div>
                        ` : ''}
                        
                        ${inv.notes ? `
                        <hr>
                        <p><strong>Примечания:</strong> ${escapeHtml(inv.notes)}</p>
                        ` : ''}
                        
                        ${inv.status !== 'completed' ? `
<div class="mt-3 d-flex gap-2 flex-wrap">
    <button class="btn btn-primary" onclick="saveInventoryProgress(${inv.id})" id="saveInventoryBtn">
        <i class="bi bi-save"></i> Сохранить изменения
    </button>
    <button class="btn btn-success" onclick="completeInventory(${inv.id})" id="completeInventoryBtn">
        <i class="bi bi-check-circle"></i> Завершить инвентаризацию
    </button>
    <small class="text-muted ms-2">Введите фактические количества. Можно сохранять промежуточные результаты и продолжать позже.</small>
</div>
` : ''}

${userPermissions?.role === 'admin' && (inv.status === 'completed' || inv.status === 'draft') ? `
<div class="mt-3">
    <button class="btn btn-danger" onclick="deleteInventory(${inv.id})">
        <i class="bi bi-trash"></i> Удалить сведения инвентаризации
    </button>
</div>
` : ''}
                    </div>
                </div>
            `;
            
            // Формируем таблицу позиций
let itemsHtml = '';
let totalBookQuantity = 0;
let totalActualQuantity = 0;
let totalDiscrepancies = 0;

items.forEach(item => {
    const isEditable = inv.status !== 'completed';
    const diffValue = item.difference;
    const diffClass = diffValue > 0 ? 'text-success' : (diffValue < 0 ? 'text-danger' : '');
    const diffSign = diffValue > 0 ? '+' : '';
    
    totalBookQuantity += item.book_quantity;
    totalActualQuantity += item.actual_quantity || 0;
    if (diffValue !== 0) totalDiscrepancies++;
    
const savedValue = (item.actual_quantity !== null && item.actual_quantity !== undefined && item.actual_quantity > 0) ? item.actual_quantity : '';    
itemsHtml += `
        <tr data-item-id="${item.id}">
            <td><code>${escapeHtml(item.unique_id)}</code></td>
            <td><strong>${escapeHtml(item.name)}</strong><br><small class="text-muted">${escapeHtml(item.model || '')}</small></td>
            <td class="text-center">${item.book_quantity}</noscript></td>
            <td>
                <input type="number" class="form-control actual-quantity" 
                       value="${savedValue}" 
                       placeholder="Введите количество"
                       ${!isEditable ? 'disabled' : ''}
                       min="0" step="1"
                       style="width: 100%; min-width: 120px; text-align: center;"
                       oninput="validateNonNegativeInteger(this); updateRowDifference(this); updateTotalDiscrepancies()"
                       onkeypress="return isNumberKey(event)">
            </noscript>
            <td class="difference-cell fw-bold ${diffClass} text-center">
                ${savedValue ? (parseInt(savedValue) - item.book_quantity) : '0'}
            </noscript>
            <td class="text-end">${((savedValue || item.actual_quantity || 0) * (item.price || 0)).toFixed(2)}</noscript>
        </tr>
    `;
});
            
            // Итоговая строка
            itemsHtml += `
                <tr class="table-active fw-bold">
                    <td colspan="2" class="text-end">ИТОГО:</td>
                    <td class="text-end">${totalBookQuantity}</td>
                    <td class="text-end">${totalActualQuantity}</td>
                    <td class="text-end ${totalActualQuantity - totalBookQuantity > 0 ? 'text-success' : (totalActualQuantity - totalBookQuantity < 0 ? 'text-danger' : '')}">
                        ${totalActualQuantity - totalBookQuantity > 0 ? '+' : ''}${totalActualQuantity - totalBookQuantity}
                    </td>
                    <td class="text-end">${items.reduce((sum, i) => sum + (i.actual_quantity * i.price), 0).toFixed(2)}</td>
                    <td></td>
                </tr>
            `;
            
            // Собираем полный HTML
            document.getElementById('content').innerHTML = `
                ${infoHtml}
                
                <div class="card">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">Позиции</h5>
                        <span class="badge ${totalDiscrepancies > 0 ? 'bg-warning' : 'bg-success'}">
                            Расхождений: ${totalDiscrepancies}
                        </span>
                    </div>
                    <div class="card-body">
                        <div class="table-responsive">
                            <table class="table table-hover inventory-table">
                                <thead>
                                    <tr>
                                        <th>Артикул</th>
                                        <th>Наименование</th>
                                        <th>По учету (шт.)</th>
                                        <th>Фактически (шт.)</th>
                                        <th>Разница (шт.)</th>
                                        <th>Сумма (руб.)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${itemsHtml}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
            
            // Добавляем обработчики для динамического подсчета разницы (только для незавершенных)
            if (inv.status !== 'completed') {
                function updateRowDifference(row) {
                    const bookCell = row.querySelector('td:nth-child(3)');
                    const actualInput = row.querySelector('.actual-quantity');
                    const diffCell = row.querySelector('.difference-cell');
                    const notesInput = row.querySelector('.item-notes');
                    
                    if (bookCell && actualInput && diffCell) {
                        const bookQuantity = parseInt(bookCell.textContent) || 0;
                        const actualQuantity = parseInt(actualInput.value) || 0;
                        const difference = actualQuantity - bookQuantity;
                        
                        diffCell.textContent = difference;
                        diffCell.className = `difference-cell fw-bold ${difference > 0 ? 'text-success' : difference < 0 ? 'text-danger' : ''}`;
                        
                        if (actualInput.value && parseInt(actualInput.value) !== bookQuantity) {
                            row.style.backgroundColor = 'rgba(255, 193, 7, 0.1)';
                        } else {
                            row.style.backgroundColor = '';
                        }
                        
                        if (notesInput) {
                            notesInput.style.backgroundColor = 'rgba(255, 193, 7, 0.2)';
                        }
                    }
                }
                
                function updateTotalDiscrepancies() {
                    let count = 0;
                    document.querySelectorAll('.inventory-table tbody tr:not(.table-active)').forEach(row => {
                        const bookCell = row.querySelector('td:nth-child(3)');
                        const actualInput = row.querySelector('.actual-quantity');
                        if (bookCell && actualInput) {
                            const bookQuantity = parseInt(bookCell.textContent) || 0;
                            const actualQuantity = parseInt(actualInput.value) || 0;
                            if (actualQuantity !== bookQuantity) {
                                count++;
                            }
                        }
                    });
                    const badge = document.querySelector('.card-header .badge');
                    if (badge) {
                        badge.textContent = `Расхождений: ${count}`;
                        badge.className = `badge ${count > 0 ? 'bg-warning' : 'bg-success'}`;
                    }
                }
                
                document.querySelectorAll('.actual-quantity').forEach(input => {
                    input.addEventListener('input', function() {
                        const row = this.closest('tr');
                        updateRowDifference(row);
                        updateTotalDiscrepancies();
                    });
                    
                    input.addEventListener('blur', function() {
                        if (this.value && parseInt(this.value) < 0) {
                            this.value = 0;
                            const event = new Event('input', { bubbles: true });
                            this.dispatchEvent(event);
                        }
                    });
                });
                
                document.querySelectorAll('.item-notes').forEach(input => {
                    input.addEventListener('input', function() {
                        this.style.backgroundColor = 'rgba(255, 193, 7, 0.2)';
                    });
                });
                
                document.querySelectorAll('.inventory-table tbody tr:not(.table-active)').forEach(row => {
                    updateRowDifference(row);
                });
            }
            
        } else {
            throw new Error(data.message || 'Ошибка загрузки данных');
        }
    } catch (error) {
        console.error('❌ Ошибка загрузки:', error);
        document.getElementById('content').innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle"></i> 
                Не удалось загрузить инвентаризацию. Ошибка: ${escapeHtml(error.message)}
                <br><br>
                <button class="btn btn-primary" onclick="loadInventories()">
                    <i class="bi bi-arrow-repeat"></i> Вернуться к списку
                </button>
            </div>
        `;
    }
}
// Сохранение промежуточных результатов инвентаризации (без завершения)
async function saveInventoryProgress(inventoryId) {
    const btn = document.getElementById('saveInventoryBtn');
    if (!btn) return;
    
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Сохранение...';
    
    let savedCount = 0;
    let errorCount = 0;
    const errors = [];
    
    try {
        // Получаем все строки таблицы с приборами
        const rows = document.querySelectorAll('.inventory-table tbody tr:not(.table-active)');
        
        if (rows.length === 0) {
            showWarning('Нет данных для сохранения');
            btn.disabled = false;
            btn.innerHTML = originalText;
            return;
        }
        
        // Сохраняем каждую позицию
        for (const row of rows) {
            const itemId = row.dataset.itemId;
            if (!itemId) continue;
            
            const actualInput = row.querySelector('.actual-quantity');
            const notesInput = row.querySelector('.item-notes');
            
            // Получаем введенное значение
            let actualQuantity = null;
            if (actualInput && actualInput.value !== undefined && actualInput.value !== '') {
                actualQuantity = parseInt(actualInput.value) || 0;
            }
            
            // Если значение не введено - пропускаем
            if (actualQuantity === null) continue;
            
            const notes = notesInput ? notesInput.value : '';
            
            try {
                const response = await fetch(`${API_BASE_URL}/api/inventory/items/${itemId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: JSON.stringify({
                        actualQuantity: actualQuantity,
                        notes: notes
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    savedCount++;
                    
                    // Обновляем отображаемое значение в строке
                    const quantityCell = row.querySelector('td:nth-child(3)'); // ячейка с "По учету"
                    const bookQuantity = parseInt(quantityCell?.textContent) || 0;
                    const difference = actualQuantity - bookQuantity;
                    const diffCell = row.querySelector('.difference-cell');
                    
                    if (diffCell) {
                        diffCell.textContent = difference;
                        diffCell.className = `difference-cell fw-bold ${difference > 0 ? 'text-success' : difference < 0 ? 'text-danger' : ''}`;
                    }
                    
                    // Обновляем сумму
                    const priceCell = row.querySelector('td:nth-child(6)'); // ячейка с ценой
                    const price = parseFloat(priceCell?.textContent) || 0;
                    const sumCell = row.querySelector('td:nth-child(7)'); // ячейка с суммой
                    if (sumCell) {
                        sumCell.textContent = (actualQuantity * price).toFixed(2);
                    }
                    
                    // Визуальная индикация успешного сохранения
                    if (actualInput) {
                        actualInput.style.transition = 'all 0.3s ease';
                        actualInput.style.backgroundColor = 'rgba(40, 167, 69, 0.2)';
                        actualInput.style.borderColor = '#28a745';
                        setTimeout(() => {
                            if (actualInput) {
                                actualInput.style.backgroundColor = '';
                                actualInput.style.borderColor = '';
                            }
                        }, 1500);
                    }
                } else {
                    errorCount++;
                    errors.push(`Ошибка при сохранении: ${data.message || 'неизвестная ошибка'}`);
                }
            } catch (err) {
                errorCount++;
                errors.push(`Ошибка сети: ${err.message}`);
                console.error('Ошибка сохранения для itemId', itemId, err);
            }
            
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        // Если что-то сохранили, обновляем статус инвентаризации на "in_progress"
        if (savedCount > 0) {
            try {
                // Обновляем статус инвентаризации через API
                const statusResponse = await fetch(`${API_BASE_URL}/api/inventory/${inventoryId}`, {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${authToken}` }
                });
                
                const invData = await statusResponse.json();
                
                // Если статус "draft" - меняем на "in_progress"
                if (invData.success && invData.inventory && invData.inventory.status === 'draft') {
                    // Обновляем статус через прямой запрос (нужно добавить эндпоинт)
                    await updateInventoryStatus(inventoryId, 'in_progress');
                }
            } catch (statusErr) {
                console.warn('Не удалось обновить статус:', statusErr);
            }
        }
        
        // Показываем результат
        if (savedCount > 0 && errorCount === 0) {
            showSuccess(`Сохранено ${savedCount} позиций.`);
            
            // Обновляем счетчик расхождений в заголовке
            updateDiscrepanciesBadge();
            
        } else if (savedCount > 0 && errorCount > 0) {
            showWarning(`Сохранено ${savedCount} позиций, ошибок: ${errorCount}`);
            
        } else if (savedCount === 0 && errorCount === 0) {
            showInfo('Нет изменений для сохранения. Введите фактические количества и нажмите "Сохранить".');
            
        } else {
            showError(`❌ Ошибка при сохранении. ${errors[0] || 'Попробуйте еще раз.'}`);
        }
        
    } catch (error) {
        console.error('❌ Ошибка сохранения:', error);
        showError('❌ Ошибка при сохранении: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

// Функция обновления статуса инвентаризации
async function updateInventoryStatus(inventoryId, newStatus) {
    try {
        // Отправляем запрос на обновление статуса
        const response = await fetch(`${API_BASE_URL}/api/inventory/${inventoryId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ status: newStatus })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Обновляем отображение статуса на странице
            const statusBadge = document.querySelector('.card-header .badge, .card-body .badge');
            if (statusBadge) {
                if (newStatus === 'in_progress') {
                    statusBadge.textContent = 'В процессе';
                    statusBadge.className = 'badge bg-warning';
                }
            }
            
            // Обновляем заголовок страницы
            const pageTitle = document.getElementById('page-title');
            if (pageTitle && pageTitle.textContent.includes('Черновик')) {
                pageTitle.textContent = pageTitle.textContent.replace('Черновик', 'В процессе');
            }
            
            return true;
        }
        return false;
    } catch (error) {
        console.error('Ошибка обновления статуса:', error);
        return false;
    }
}

// Функция обновления бейджа с количеством расхождений
function updateDiscrepanciesBadge() {
    let discrepanciesCount = 0;
    const rows = document.querySelectorAll('.inventory-table tbody tr:not(.table-active)');
    
    rows.forEach(row => {
        const bookCell = row.querySelector('td:nth-child(3)');
        const actualInput = row.querySelector('.actual-quantity');
        
        if (bookCell && actualInput) {
            const bookQuantity = parseInt(bookCell.textContent) || 0;
            const actualQuantity = parseInt(actualInput.value) || 0;
            if (actualQuantity !== bookQuantity) {
                discrepanciesCount++;
            }
        }
    });
    
    const badge = document.querySelector('.card-header .badge');
    if (badge) {
        badge.textContent = `Расхождений: ${discrepanciesCount}`;
        badge.className = `badge ${discrepanciesCount > 0 ? 'bg-warning' : 'bg-success'}`;
    }
}

async function completeInventory(inventoryId) {
    if (!confirm('Завершить инвентаризацию?')) {
        return;
    }
    
    const btn = document.getElementById('completeInventoryBtn');
    if (!btn) return;
    
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Завершение...';
    
    try {
        // Сохраняем все введенные фактические количества
        const rows = document.querySelectorAll('#content tbody tr');
        for (const row of rows) {
            const itemId = row.dataset.itemId;
            const actualInput = row.querySelector('.actual-quantity');
            const notesInput = row.querySelector('.item-notes');
            
            if (actualInput && actualInput.value !== undefined) {
                const actualQuantity = parseInt(actualInput.value) || 0;
                const notes = notesInput ? notesInput.value : '';
                
                await fetch(`${API_BASE_URL}/api/inventory/items/${itemId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: JSON.stringify({
                        actualQuantity: actualQuantity,
                        notes: notes
                    })
                });
            }
        }
        
        // Завершаем инвентаризацию
        const response = await fetch(`${API_BASE_URL}/api/inventory/${inventoryId}/complete`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showSuccess('Инвентаризация завершена');
            
            
            // Обновляем страницу
            viewInventory(inventoryId);
        } else {
            showError('❌ ' + (data.message || 'Ошибка при завершении'));
        }
    } catch (error) {
        console.error('❌ Ошибка:', error);
        showError('❌ Ошибка: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

// Новая функция для экспорта документов инвентаризации
async function exportInventoryDocuments(inventoryId) {
    try {
        showInfo('📄 Формирование документов инвентаризации...');
        
        // Всегда экспортируем инвентаризационную опись
        const inventoryResponse = await fetch(`${API_BASE_URL}/api/inventory/${inventoryId}/export-document?type=inventory_list&format=html`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (inventoryResponse.ok) {
            const blob = await inventoryResponse.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `inventory_list_${inventoryId}.html`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            showSuccess('📋 Инвентаризационная опись сформирована');
        }
        
        // Проверяем, есть ли расхождения
        const discrepanciesResponse = await fetch(`${API_BASE_URL}/api/inventory/${inventoryId}/export-document?type=comparison_sheet&format=html`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (discrepanciesResponse.ok) {
            const blob = await discrepanciesResponse.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `comparison_sheet_${inventoryId}.html`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            showSuccess('📊 Сличительная ведомость сформирована');
        }
        
    } catch (error) {
        console.error('Ошибка экспорта документов:', error);
        showWarning('Документы не были сформированы автоматически, но вы можете скачать их вручную из карточки инвентаризации');
    }
}

// script.js - Функция отображения информации о расхождениях (без создания заявок)
function showDiscrepanciesInfo(data) {
    let discrepanciesHtml = '';
    
    data.discrepancies.forEach(item => {
        const typeClass = item.discrepancy_type === 'shortage' ? 'text-danger' : 'text-success';
        const typeText = item.discrepancy_type === 'shortage' ? '📉 Недостача' : '📈 Излишек';
        const bgClass = item.discrepancy_type === 'shortage' ? 'bg-danger bg-opacity-10' : 'bg-success bg-opacity-10';
        
        discrepanciesHtml += `
            <div class="list-group-item ${bgClass}">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <strong>${sanitizeString(item.name)}</strong>
                        <br>
                        <small class="text-muted">${sanitizeString(item.unique_id)}</small>
                        <br>
                        <small>По учету: ${item.book_quantity} | Фактически: ${item.actual_quantity}</small>
                    </div>
                    <div class="text-end">
                        <span class="fw-bold ${typeClass}">${typeText}</span>
                        <br>
                        <span class="badge ${item.discrepancy_type === 'shortage' ? 'bg-danger' : 'bg-success'} fs-6">
                            ${Math.abs(item.difference)} шт.
                        </span>
                        <br>
                        <small class="text-muted">${item.discrepancy_value.toFixed(2)} руб.</small>
                    </div>
                </div>
            </div>
        `;
    });
    
    const modalHtml = `
        <div class="modal fade" id="discrepanciesModal" tabindex="-1" data-bs-backdrop="static">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header bg-warning text-dark">
                        <h5 class="modal-title">
                            <i class="bi bi-exclamation-triangle"></i> Расхождения в инвентаризации
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="alert alert-warning">
                            <i class="bi bi-info-circle"></i>
                            <strong>Инвентаризация завершена.</strong><br>
                            Обнаружено расхождений: <strong>${data.discrepanciesCount}</strong><br>
                            📉 Недостача: <strong class="text-danger">${data.shortageCount}</strong> позиций | 
                            📈 Излишек: <strong class="text-success">${data.surplusCount}</strong> позиций
                        </div>
                        
                        <h6 class="mt-3">📋 Детали расхождений:</h6>
                        <div class="list-group mb-3" style="max-height: 400px; overflow-y: auto;">
                            ${discrepanciesHtml}
                        </div>
                        
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-primary" data-bs-dismiss="modal">Закрыть</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const oldModal = document.getElementById('discrepanciesModal');
    if (oldModal) oldModal.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = new bootstrap.Modal(document.getElementById('discrepanciesModal'));
    modal.show();
}

async function deleteInventory(inventoryId) {
    let confirmMessage = 'Вы уверены, что хотите удалить сведения этой инвентаризации? Это действие нельзя отменить.';
    
    if (!confirm(confirmMessage)) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/inventory/${inventoryId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showSuccess('Инвентаризация удалена');
            loadInventories();
        } else {
            showError(data.message || 'Ошибка при удалении');
        }
    } catch (error) {
        console.error('Ошибка удаления инвентаризации:', error);
        showError('Ошибка удаления: ' + error.message);
    }
}

async function exportInventory(inventoryId, format) {
    if (!authToken) return;
    
    try {
        showInfo('Подготовка файла к скачиванию...');
        
        const response = await fetch(`${API_BASE_URL}/api/inventory/${inventoryId}/export?format=${format}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Ошибка экспорта');
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        let ext = format;
        if (format === 'excel') ext = 'xlsx';
        else if (format === 'docx') ext = 'docx';
        
        a.download = `inventory_${inventoryId}_${new Date().toISOString().split('T')[0]}.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showSuccess(`Инвентаризация экспортирована в ${format.toUpperCase()}`);
    } catch (error) {
        console.error('Ошибка экспорта инвентаризации:', error);
        showError('Ошибка экспорта: ' + error.message);
    }
}

async function loadProfile() {
    if (!authToken) return;
    
    document.getElementById('page-title').textContent = 'Профиль пользователя';
    document.getElementById('page-actions').innerHTML = '';
    
    document.getElementById('content').innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border" style="color: var(--accent);"></div>
            <p class="mt-3">Загрузка...</p>
        </div>
    `;
    
    try {
        const infoResponse = await fetch(`${API_BASE_URL}/api/user/info`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const infoData = await infoResponse.json();
        
        const statsResponse = await fetch(`${API_BASE_URL}/api/user/stats`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const statsData = await statsResponse.json();
        
        const activityResponse = await fetch(`${API_BASE_URL}/api/user/activity`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const activityData = await activityResponse.json();
        
        if (infoData.success) {
            const user = infoData.user;
            const stats = statsData.success ? statsData.stats : {};
            
            // Формируем полное ФИО
            const fullName = `${user.last_name || ''} ${user.first_name || ''}${user.middle_name ? ' ' + user.middle_name : ''}`.trim();
            
            // Формируем HTML для последних действий
            let activityHtml = '';
            if (activityData.success && activityData.activities && activityData.activities.length > 0) {
                activityData.activities.forEach(a => {
                    let icon = 'bi-arrow-left-right';
                    if (a.type === 'Заявка на отгрузку') icon = 'bi-truck';
                    else if (a.type === 'Заявка на пополнение') icon = 'bi-box-arrow-in-down';
                    else if (a.type === 'Договор') icon = 'bi-file-text';
                    else if (a.type === 'Инвентаризация') icon = 'bi-clipboard-data';
                    
                    let formattedDate = '';
                    if (a.date) {
                        let dateObj;
                        if (typeof a.date === 'string') {
                            if (a.date.match(/^\d{2}\.\d{2}\.\d{4}$/)) {
                                formattedDate = a.date;
                            } else {
                                dateObj = new Date(a.date);
                                if (!isNaN(dateObj.getTime())) {
                                    const day = String(dateObj.getDate()).padStart(2, '0');
                                    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                                    const year = dateObj.getFullYear();
                                    formattedDate = `${day}.${month}.${year}`;
                                }
                            }
                        } else if (a.date instanceof Date) {
                            const day = String(a.date.getDate()).padStart(2, '0');
                            const month = String(a.date.getMonth() + 1).padStart(2, '0');
                            const year = a.date.getFullYear();
                            formattedDate = `${day}.${month}.${year}`;
                        }
                    }
                    
                    let objectDisplay = '';
                    if (a.type === 'Инвентаризация') {
                        objectDisplay = a.object_name || '';
                    } else if (a.type === 'Заявка на пополнение') {
                        objectDisplay = a.object_name || '';
                    } else if (a.type === 'Заявка на отгрузку') {
                        objectDisplay = a.object_name || '';
                    } else if (a.type === 'Договор') {
                        objectDisplay = a.object_name || '';
                    } else if (a.type === 'Движение') {
                        objectDisplay = a.details || '';
                    } else {
                        objectDisplay = a.details || a.object_name || '';
                    }
                    
                    activityHtml += `
                        <tr>
                            <td>${formattedDate}</noscript>
                            <td><i class="bi ${icon} me-2"></i>${escapeHtml(a.type)}</noscript>
                            <td>${escapeHtml(a.action)}</noscript>
                            <td>${escapeHtml(objectDisplay)}</noscript>
                        </tr>
                    `;
                });
            } else {
                activityHtml = '<tr><td colspan="4" class="text-center">Нет активности</noscript>';
            }
            
            document.getElementById('content').innerHTML = `
                <div class="row">
                    <div class="col-md-4">
                        <div class="card mb-4">
                            <div class="card-body text-center">
                                <i class="bi bi-person-circle" style="font-size: 5rem; color: var(--accent);"></i>
                                <h4 class="mt-3">${escapeHtml(fullName)}</h4>
                                <p class="text-muted">${escapeHtml(user.email)}</p>
                                <span class="badge ${user.role === 'admin' ? 'bg-danger' : user.role === 'manager' ? 'bg-warning' : 'bg-primary'}">
                                    ${user.role === 'admin' ? 'Заведующий склада' : user.role === 'manager' ? 'Менеджер по продажам' : 'Кладовщик'}
                                </span>
                            </div>
                        </div>
                        
                        <div class="card">
                            <div class="card-header">
                                <h5 class="mb-0">Статистика</h5>
                            </div>
                            <div class="card-body">
                                <div class="row text-center">
                                    <div class="col-6 mb-3">
                                        <h3>${stats.devices_added || 0}</h3>
                                        <p class="text-muted">Приборов</p>
                                    </div>
                                    <div class="col-6 mb-3">
                                        <h3>${stats.total_operations || 0}</h3>
                                        <p class="text-muted">Операций</p>
                                    </div>
                                    <div class="col-6 mb-3">
                                        <h3>${stats.shipment_requests_created || 0}</h3>
                                        <p class="text-muted">Отгрузок создано</p>
                                    </div>
                                    <div class="col-6 mb-3">
                                        <h3>${stats.shipment_requests_processed || 0}</h3>
                                        <p class="text-muted">Отгрузок обработано</p>
                                    </div>
                                    <div class="col-6 mb-3">
                                        <h3>${stats.replenishment_requests || 0}</h3>
                                        <p class="text-muted">Заявок на пополнение</p>
                                    </div>
                                    <div class="col-6 mb-3">
                                        <h3>${stats.contracts_created || 0}</h3>
                                        <p class="text-muted">Договоров</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-md-8">
                        <div class="card">
                            <div class="card-header">
                                <h5 class="mb-0">Информация</h5>
                            </div>
                            <div class="card-body">
                                <table class="table">
                                    <tr>
                                        <th width="200">Телефон:</th>
                                        <td>${escapeHtml(user.phone || 'Не указан')}</noscript>
                                    </tr>
                                    <tr>
                                        <th>Дата регистрации:</th>
                                        <td>${new Date(user.created_at).toLocaleDateString()}</noscript>
                                    </tr>
                                    <tr>
                                        <th>Последний вход:</th>
                                        <td>${user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Не выполнялся'}</noscript>
                                    </tr>
                                </table>
                            </div>
                        </div>
                        
                        <div class="card mt-4">
                            <div class="card-header">
                                <h5 class="mb-0">Последние действия</h5>
                            </div>
                            <div class="card-body">
                                <div class="table-responsive">
                                    <table class="table table-sm">
                                        <thead>
                                            <tr>
                                                <th>Дата</th>
                                                <th>Тип</th>
                                                <th>Действие</th>
                                                <th>Детали</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${activityHtml}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Ошибка загрузки профиля:', error);
        showError('Ошибка загрузки профиля');
    }
}


async function loadReports() {
    if (!authToken) return;
    
    document.getElementById('page-title').textContent = 'Отчеты';
    document.getElementById('page-actions').innerHTML = '';
    
    document.getElementById('content').innerHTML = `
        <div class="row">
            <div class="col-md-4 mb-4">
                <div class="card h-100">
                    <div class="card-header bg-primary text-white">
                        <h5 class="mb-0">Состояние склада</h5>
                    </div>
                    <div class="card-body">
                        <p>Текущие остатки всех приборов с указанием статуса наличия.</p>
                        <button class="btn btn-primary w-100" onclick="showStockReport()">
                            <i class="bi bi-eye"></i> Просмотреть
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="col-md-4 mb-4">
                <div class="card h-100">
                    <div class="card-header bg-info text-white">
                        <h5 class="mb-0">Заказы сегодня/завтра</h5>
                    </div>
                    <div class="card-body">
                        <p>Заказы на сегодня и планируемые поставки на завтра.</p>
                        <button class="btn btn-info w-100" onclick="showOrdersReport()">
                            <i class="bi bi-eye"></i> Просмотреть
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="col-md-4 mb-4">
                <div class="card h-100">
                    <div class="card-header bg-success text-white">
                        <h5 class="mb-0">Продажи за период</h5>
                    </div>
                    <div class="card-body">
                        <p>Анализ продаж с группировкой по дням/неделям/месяцам.</p>
                        <button class="btn btn-success w-100" onclick="showSalesReport()">
                            <i class="bi bi-eye"></i> Просмотреть
                        </button>
                    </div>
                </div>
            </div>

            <div class="col-md-4 mb-4">
    <div class="card h-100">
        <div class="card-header bg-secondary text-white">
            <h5 class="mb-0">Движения товаров</h5>
        </div>
        <div class="card-body">
            <p>Отчет по движениям товаров за выбранный период с фильтрацией по прибору и типу движения.</p>
            <button class="btn btn-secondary w-100" onclick="showMovementsReport()">
                            <i class="bi bi-eye"></i> Просмотреть
            </button>
        </div>
    </div>
</div>
        </div>
    `;
}


async function showMovementsReport() {
    // Получаем список приборов для фильтра
    let devicesList = '<option value="all">Все приборы</option>';
    try {
        const response = await fetch(`${API_BASE_URL}/api/reports/devices-list`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await response.json();
        if (data.success && data.devices) {
            data.devices.forEach(d => {
                devicesList += `<option value="${d.id}">${sanitizeString(d.unique_id)} - ${sanitizeString(d.name)}</option>`;
            });
        }
    } catch (error) {
        console.error('Ошибка загрузки приборов:', error);
    }
    
    const today = new Date().toISOString().split('T')[0];
    const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    
    const modalHtml = `
        <div class="modal fade" id="movementsReportModal" tabindex="-1" data-bs-backdrop="static">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header bg-secondary text-white">
                        <h5 class="modal-title">
                            <i class="bi bi-arrow-left-right"></i> Отчет по движениям товаров
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <label class="form-label fw-bold">Начальная дата</label>
                            <input type="date" class="form-control" id="movementsStartDate" value="${firstDay}">
                        </div>
                        <div class="mb-3">
                            <label class="form-label fw-bold">Конечная дата</label>
                            <input type="date" class="form-control" id="movementsEndDate" value="${today}">
                        </div>
                        <div class="mb-3">
                            <label class="form-label fw-bold">Прибор</label>
                            <select class="form-select" id="movementsDeviceFilter">
                                ${devicesList}
                            </select>
                        </div>
                        <div class="mb-3">
                            <label class="form-label fw-bold">Тип движения</label>
                            <select class="form-select" id="movementsTypeFilter">
                                <option value="all">Все</option>
                                <option value="поступление">Поступление</option>
                                <option value="отгрузка по заявке">Отгрузка</option>
                                <option value="списание">Списание</option>
                            </select>
                        </div>
                        <hr>
                        <div class="d-flex justify-content-end gap-2">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Отмена</button>
                            <button type="button" class="btn btn-primary" onclick="generateMovementsReport()">
                                <i class="bi bi-file-earmark-text"></i> Сформировать
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const oldModal = document.getElementById('movementsReportModal');
    if (oldModal) oldModal.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = new bootstrap.Modal(document.getElementById('movementsReportModal'));
    modal.show();
}

async function generateMovementsReport() {
    const startDate = document.getElementById('movementsStartDate').value;
    const endDate = document.getElementById('movementsEndDate').value;
    const deviceId = document.getElementById('movementsDeviceFilter').value;
    const movementType = document.getElementById('movementsTypeFilter').value;
    
    if (!startDate || !endDate) {
        showError('Укажите начальную и конечную дату');
        return;
    }
    
    if (new Date(startDate) > new Date(endDate)) {
        showError('Начальная дата не может быть больше конечной');
        return;
    }
    
    const modal = bootstrap.Modal.getInstance(document.getElementById('movementsReportModal'));
    if (modal) modal.hide();
    
    document.getElementById('content').innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border" style="color: var(--accent);"></div>
            <p class="mt-3">Формирование отчета...</p>
        </div>
    `;
    
    try {
        let url = `${API_BASE_URL}/api/reports/movements?start_date=${startDate}&end_date=${endDate}`;
        if (deviceId && deviceId !== 'all') url += `&device_id=${deviceId}`;
        
        if (movementType && movementType !== 'all') {
            let typeValue = '';
            switch(movementType) {
                case 'поступление':
                    typeValue = 'поступление';
                    break;
                case 'отгрузка по заявке':
                    typeValue = 'отгрузка по заявке';
                    break;
                case 'списание':
                    typeValue = 'списание';
                    break;
                default:
                    typeValue = movementType;
            }
            url += `&movement_type=${encodeURIComponent(typeValue)}`;
        }
        
        console.log('📡 Запрос к API:', url);
        
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const data = await response.json();
        console.log('📦 Получены данные:', data);
        
        if (data.success) {
            // СОХРАНЯЕМ ДАННЫЕ В ГЛОБАЛЬНУЮ ПЕРЕМЕННУЮ
            window.currentMovementsData = {
                movements: data.movements || [],
                stats: data.stats || { total_movements: 0, total_incoming: 0, total_outgoing: 0, devices_count: 0 },
                start_date: startDate,
                end_date: endDate,
                deviceId: deviceId,
                movementType: movementType
            };
            console.log('💾 Данные сохранены в window.currentMovementsData:', window.currentMovementsData);
            
            let movementsHtml = '';
            
            if (data.movements && data.movements.length > 0) {
                data.movements.forEach(m => {
                    const changeClass = m.quantity_change > 0 ? 'text-success' : 'text-danger';
                    const changeSign = m.quantity_change > 0 ? '+' : '';
                    
                    let movementTypeText = '';
                    switch(m.movement_type) {
                        case 'поступление':
                        case 'поступление по заявке':
                            movementTypeText = 'Поступление';
                            break;
                        case 'отгрузка по заявке':
                            movementTypeText = 'Отгрузка';
                            break;
                        case 'списание':
                            movementTypeText = 'Списание';
                            break;
                        default:
                            movementTypeText = m.movement_type || '-';
                    }
                    
                    movementsHtml += `
                        <tr>
                            <td>${new Date(m.movement_date).toLocaleString()}</noscript>
                            <td><code>${sanitizeString(m.unique_id || '-')}</code><br><small class="text-muted">${sanitizeString(m.device_name || '-')}</small></noscript>
                            <td>${movementTypeText}</noscript>
                            <td class="${changeClass} fw-bold text-center">${changeSign}${m.quantity_change || 0}</noscript>
                            <td>${m.previous_quantity || 0} → ${m.new_quantity || 0}</noscript>
                            <td>${sanitizeString(m.performed_by_name || '-')}</noscript>
                            <td>${sanitizeString(m.document_number || '-')}</noscript>
                            <td>${sanitizeString(m.notes || '-')}</noscript>
                        </tr>
                    `;
                });
            } else {
                movementsHtml = '<tr><td colspan="8" class="text-center">Нет движений за выбранный период</noscript>';
            }
            
            let movementTypeDisplay = '';
            if (movementType && movementType !== 'all') {
                switch(movementType) {
                    case 'поступление':
                        movementTypeDisplay = 'Поступление';
                        break;
                    case 'отгрузка по заявке':
                        movementTypeDisplay = 'Отгрузка';
                        break;
                    case 'списание':
                        movementTypeDisplay = 'Списание';
                        break;
                }
            }
            
            document.getElementById('content').innerHTML = `
                <div class="card mb-4">
                    <div class="card-header bg-secondary text-white d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">
                            <i class="bi bi-arrow-left-right me-2"></i> 
                            Отчет по движениям товаров
                        </h5>
                        <div>
                            <button class="btn btn-sm btn-light me-2" onclick="showMovementsReport()">
                                <i class="bi bi-pencil"></i> Новый отчет
                            </button>
                            <button class="btn btn-sm btn-success me-2" onclick="exportMovementsReport('excel')">
                                <i class="bi bi-file-earmark-excel"></i> Excel
                            </button>
                            <button class="btn btn-sm btn-info" onclick="exportMovementsReport('docx')">
                                <i class="bi bi-file-word"></i> DOCX
                            </button>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="row mb-4">
                            <div class="col-md-3">
                                <div class="card bg-primary text-white">
                                    <div class="card-body text-center">
                                        <h3>${data.stats?.total_movements || 0}</h3>
                                        <p>Всего операций</p>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="card bg-success text-white">
                                    <div class="card-body text-center">
                                        <h3>${data.stats?.total_incoming || 0}</h3>
                                        <p>Поступление (шт.)</p>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="card bg-danger text-white">
                                    <div class="card-body text-center">
                                        <h3>${data.stats?.total_outgoing || 0}</h3>
                                        <p>Отгрузка + Списание (шт.)</p>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="card bg-info text-white">
                                    <div class="card-body text-center">
                                        <h3>${data.stats?.devices_count || 0}</h3>
                                        <p>Приборов затронуто (шт.)</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="alert alert-info">
                            <i class="bi bi-info-circle"></i>
                            <strong>Период:</strong> ${new Date(data.start_date).toLocaleDateString()} - ${new Date(data.end_date).toLocaleDateString()}
                            ${deviceId && deviceId !== 'all' ? ` | <strong>Прибор:</strong> фильтр применен` : ''}
                            ${movementType && movementType !== 'all' ? ` | <strong>Тип:</strong> ${movementTypeDisplay}` : ''}
                        </div>
                        
                        <div class="table-responsive">
                            <table class="table table-hover" id="movementsReportTable">
                                <thead>
                                    <tr>
                                        <th>Дата</th>
                                        <th>Прибор</th>
                                        <th>Тип</th>
                                        <th>Изменение (шт.)</th>
                                        <th>Остаток (шт.)</th>
                                        <th>Кто</th>
                                        <th>Документ</th>
                                        <th>Примечание</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${movementsHtml}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
        } else {
            showError(data.message || 'Ошибка формирования отчета');
        }
    } catch (error) {
        console.error('Ошибка формирования отчета:', error);
        showError('Ошибка формирования отчета: ' + error.message);
    }
}


async function exportMovementsToExcel(data) {
    try {
        console.log('📊 Начало экспорта в Excel, данных:', data.movements.length);
        
        // Проверяем наличие XLSX
        if (typeof XLSX === 'undefined') {
            showInfo('Загрузка библиотеки Excel...');
            await loadScript('https://cdn.sheetjs.com/xlsx-0.20.2/package/dist/xlsx.full.min.js');
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        if (typeof XLSX === 'undefined') {
            throw new Error('Библиотека Excel не загрузилась');
        }
        
        const workbook = XLSX.utils.book_new();
        
        // Заголовок
        const worksheet_data = [
            ['ОТЧЕТ ПО ДВИЖЕНИЯМ ТОВАРОВ'],
            [`Период: ${new Date(data.start_date).toLocaleDateString('ru-RU')} - ${new Date(data.end_date).toLocaleDateString('ru-RU')}`],
            [`Дата формирования: ${new Date().toLocaleDateString('ru-RU')}`],
            [],
            ['Дата', 'Артикул', 'Прибор', 'Тип', 'Изменение', 'Было', 'Стало', 'Кто выполнил', 'Документ', 'Примечание']
        ];
        
        // Данные
        for (const m of data.movements) {
            let movementTypeText = '';
            if (m.movement_type === 'поступление' || m.movement_type === 'поступление по заявке') {
                movementTypeText = 'Поступление';
            } else if (m.movement_type === 'отгрузка по заявке') {
                movementTypeText = 'Отгрузка';
            } else if (m.movement_type === 'списание') {
                movementTypeText = 'Списание';
            } else {
                movementTypeText = m.movement_type || '-';
            }
            
            worksheet_data.push([
                m.movement_date ? new Date(m.movement_date).toLocaleString() : '-',
                String(m.unique_id || '-'),
                String(m.device_name || '-'),
                movementTypeText,
                (m.quantity_change > 0 ? '+' : '') + (m.quantity_change || 0),
                m.previous_quantity || 0,
                m.new_quantity || 0,
                String(m.performed_by_name || '-'),
                String(m.document_number || '-'),
                String(m.notes || '-')
            ]);
        }
        
        // Итоги
        worksheet_data.push([]);
        worksheet_data.push(['ИТОГО:']);
        worksheet_data.push([`Всего операций: ${data.stats?.total_movements || 0}`]);
        worksheet_data.push([`Поступление: ${data.stats?.total_incoming || 0} шт.`]);
        worksheet_data.push([`Отгрузка + Списание: ${data.stats?.total_outgoing || 0} шт.`]);
        worksheet_data.push([`Приборов затронуто: ${data.stats?.devices_count || 0}`]);
        
        // Создаем лист
        const worksheet = XLSX.utils.aoa_to_sheet(worksheet_data);
        
        // Настройка ширины колонок
        worksheet['!cols'] = [
            { wch: 19 }, // Дата
            { wch: 15 }, // Артикул
            { wch: 30 }, // Прибор
            { wch: 12 }, // Тип
            { wch: 10 }, // Изменение
            { wch: 8 },  // Было
            { wch: 8 },  // Стало
            { wch: 20 }, // Кто выполнил
            { wch: 20 }, // Документ
            { wch: 30 }  // Примечание
        ];
        
        // Объединение ячеек для заголовка
        worksheet['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } },
            { s: { r: 1, c: 0 }, e: { r: 1, c: 9 } },
            { s: { r: 2, c: 0 }, e: { r: 2, c: 9 } }
        ];
        
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Движения товаров');
        
        // Записываем файл
        const excelBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
        const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `movements_report_${data.start_date}_${data.end_date}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showSuccess('Отчет по движениям экспортирован в Excel');
    } catch (error) {
        console.error('Ошибка экспорта в Excel:', error);
        showError('Ошибка экспорта в Excel: ' + error.message);
    }}
async function exportMovementsToDocx(data) {
    try {
        console.log('Начало экспорта в Word, данных:', data.movements.length);
        
        // Формируем HTML для таблицы
        let tableRows = '';
        let index = 1;
        
        for (const m of data.movements) {
            let movementTypeText = '';
            let movementIcon = '';
            
            if (m.movement_type === 'поступление' || m.movement_type === 'поступление по заявке') {
                movementTypeText = 'Поступление';
            } else if (m.movement_type === 'отгрузка по заявке') {
                movementTypeText = 'Отгрузка';
            } else if (m.movement_type === 'списание') {
                movementTypeText = 'Списание';
            } else {
                movementTypeText = m.movement_type || '-';
            }
            
            const changeClass = m.quantity_change > 0 ? 'change-positive' : 'change-negative';
            const changeSign = m.quantity_change > 0 ? '+' : '';
            
            tableRows += `
                <tr>
                    <td style="border: 1px solid #ccc; padding: 6px; text-align: center;">${index++}</noscript>
                    <td style="border: 1px solid #ccc; padding: 6px;">${m.movement_date ? new Date(m.movement_date).toLocaleString() : '-'}</noscript>
                    <td style="border: 1px solid #ccc; padding: 6px;"><code>${sanitizeString(m.unique_id || '-')}</code></noscript>
                    <td style="border: 1px solid #ccc; padding: 6px;">${sanitizeString(m.device_name || '-')}</noscript>
                    <td style="border: 1px solid #ccc; padding: 6px; text-align: center;">${movementIcon} ${movementTypeText}</noscript>
                    <td style="border: 1px solid #ccc; padding: 6px; text-align: center;" class="${changeClass}">${changeSign}${m.quantity_change || 0}</noscript>
                    <td style="border: 1px solid #ccc; padding: 6px; text-align: center;">${m.previous_quantity || 0} → ${m.new_quantity || 0}</noscript>
                    <td style="border: 1px solid #ccc; padding: 6px;">${sanitizeString(m.performed_by_name || '-')}</noscript>
                    <td style="border: 1px solid #ccc; padding: 6px;">${sanitizeString(m.document_number || '-')}</noscript>
                    <td style="border: 1px solid #ccc; padding: 6px;">${sanitizeString(m.notes || '-')}</noscript>
                </tr>
            `;
        }
        
        const htmlContent = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <title>Отчет по движениям товаров</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Times New Roman', Times, serif; font-size: 9pt; margin: 12mm 8mm; line-height: 1.2; }
        h1 { font-size: 16pt; text-align: center; font-weight: bold; margin-bottom: 8px; color: #000000; }
        .subtitle { text-align: center; margin-bottom: 3px; color: #555; font-size: 9pt; }
        .info-block { margin: 6px 0 10px 0; padding: 6px 8px; background-color: #e9ecef; border-radius: 4px; font-size: 8pt; border-left: 3px solid #6c757d; }
        .info-row { margin: 2px 0; }
        .info-label { font-weight: bold; display: inline-block; width: 90px; }
        table { width: 100%; border-collapse: collapse; margin: 6px 0 0 0; font-size: 8pt; table-layout: fixed; }
        th { background-color: #6c757d; color: white; padding: 5px 3px; border: 1px solid #5a6268; font-weight: bold; text-align: center; font-size: 8pt; }
        td { border: 1px solid #ccc; padding: 4px 3px; vertical-align: middle; word-wrap: break-word; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        code { font-family: monospace; background-color: #e8e8e8; padding: 1px 3px; border-radius: 2px; font-size: 7pt; }
        .change-positive { color: #28a745; font-weight: bold; }
        .change-negative { color: #dc3545; font-weight: bold; }
        .footer { margin-top: 12px; padding-top: 8px; border-top: 1px solid #ddd; text-align: center; font-size: 7pt; color: #999; }
        
        /* Ширина колонок */
        th:nth-child(1) { width: 4%; }
        th:nth-child(2) { width: 14%; }
        th:nth-child(3) { width: 10%; }
        th:nth-child(4) { width: 18%; }
        th:nth-child(5) { width: 9%; }
        th:nth-child(6) { width: 7%; }
        th:nth-child(7) { width: 9%; }
        th:nth-child(8) { width: 10%; }
        th:nth-child(9) { width: 9%; }
        th:nth-child(10) { width: 10%; }
        
        @media print { 
            body { margin: 0; } 
            th { background-color: #6c757d !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; } 
        }
    </style>
</head>
<body>
    <h1>ОТЧЕТ ПО ДВИЖЕНИЯМ ТОВАРОВ</h1>
    <div class="subtitle">НПУП «АТОМТЕХ»</div>
    <div class="subtitle">Дата формирования: ${new Date().toLocaleDateString('ru-RU')}</div>
    
    <div class="info-block">
        <div class="info-row"><span class="info-label">Период:</span> ${new Date(data.start_date).toLocaleDateString('ru-RU')} - ${new Date(data.end_date).toLocaleDateString('ru-RU')}</div>
    </div>
    
    <table>
        <thead>
            <tr>
                <th>№</th>
                <th>Дата</th>
                <th>Артикул</th>
                <th>Прибор</th>
                <th>Тип</th>
                <th>Изменение</th>
                <th>Остаток</th>
                <th>Кто</th>
                <th>Документ</th>
                <th>Примечание</th>
            </tr>
        </thead>
        <tbody>
            ${tableRows}
        </tbody>
    </table>
    
    <div class="footer">
        <p>© 2026 НПУП «АТОМТЕХ». Система управления складом.</p>
    </div>
</body>
</html>`;
        
        const blob = new Blob([htmlContent], { type: 'application/msword' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `movements_report_${data.start_date}_${data.end_date}.doc`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showSuccess('Отчет по движениям экспортирован в Word');
    } catch (error) {
        console.error('Ошибка экспорта в Word:', error);
        showError('Ошибка экспорта в Word: ' + error.message);
    }
}
async function exportMovementsReport(format) {
    try {
        // Используем window.currentMovementsData
        const data = window.currentMovementsData;
        
        console.log('📤 Экспорт, данные из window.currentMovementsData:', data);
        
        if (!data) {
            showError('Нет данных для экспорта. Сначала сформируйте отчет.');
            return;
        }
        
        if (!data.movements || data.movements.length === 0) {
            showError('Нет данных для экспорта. Отчет не содержит движений.');
            return;
        }
        
        console.log(`📊 Экспорт ${format}, найдено движений: ${data.movements.length}`);
        
        showInfo('Подготовка отчета к скачиванию...');
        
        if (format === 'excel') {
            await exportMovementsToExcel(data);
        } else if (format === 'docx') {
            await exportMovementsToDocx(data);
        }
        
    } catch (error) {
        console.error('Ошибка экспорта:', error);
        showError('Ошибка экспорта: ' + error.message);
    }
}

async function showStockReport() {
    document.getElementById('content').innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border" style="color: var(--accent);"></div>
            <p class="mt-3">Загрузка отчета...</p>
        </div>
    `;
    
    try {
        const categoriesResponse = await fetch(`${API_BASE_URL}/api/categories`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const categoriesData = await categoriesResponse.json();
        
        let categoryOptions = '<option value="all">Все категории</option>';
        if (categoriesData.success) {
            categoriesData.categories.forEach(c => {
                categoryOptions += `<option value="${sanitizeString(c)}">${sanitizeString(c)}</option>`;
            });
        }
        
        const response = await fetch(`${API_BASE_URL}/api/reports/stock-status`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            let html = `
                <div class="card">
                    <div class="card-header">
                        <div class="row">
                            <div class="col-md-6">
                                <h5 class="mb-0">Отчет по состоянию склада</h5>
                            </div>
                            <div class="col-md-6">
                                <div class="d-flex gap-2">
                                    <select class="form-select form-select-sm" id="stockCategoryFilter">
                                        ${categoryOptions}
                                    </select>
                                    <select class="form-select form-select-sm" id="stockStatusFilter">
                                        <option value="all">Все статусы</option>
                                        <option value="in_stock">В наличии</option>
                                        <option value="low_stock">Мало</option>
                                        <option value="out_of_stock">Нет</option>
                                    </select>
                                    <button class="btn btn-sm btn-primary" onclick="applyStockFilters()">
                                        <i class="bi bi-filter"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="table-responsive">
                            <table class="table table-hover" id="stockReportTable">
                                <thead>
                                    <tr>
                                        <th>Артикул</th>
                                        <th>Наименование</th>
                                        <th>Категория</th>
                                        <th>Количество (шт.)</th>
                                        <th>Мин. запас (шт.)</th>
                                        <th>Статус</th>
                                        <th>Местоположение</th>
                                        <th>Нехватка</th>
                                    </tr>
                                </thead>
                                <tbody>
            `;
            
            data.data.forEach(item => {
                const statusClass = item.quantity === 0 ? 'badge-out-of-stock' :
                                  item.quantity <= item.min_quantity ? 'badge-low-stock' : 'badge-in-stock';
                const statusText = item.quantity === 0 ? 'Нет' :
                                 item.quantity <= item.min_quantity ? 'Мало' : 'Есть';
                
                html += `
                    <tr>
                        <td><code>${sanitizeString(item.unique_id)}</code></td>
                        <td>${sanitizeString(item.name)}</td>
                        <td>${sanitizeString(item.category || '-')}</td>
                        <td class="fw-bold">${item.quantity}</td>
                        <td>${item.min_quantity}</td>
                        <td><span class="${statusClass}">${statusText}</span></td>
                        <td>${sanitizeString(item.location ? `${item.location} ${item.shelf || ''}` : '-')}</td>
                        <td class="${item.shortage > 0 ? 'text-danger' : ''}">${item.shortage > 0 ? item.shortage : '-'}</td>
                    </tr>
                `;
            });
            
            html += `
                                </tbody>
                            </table>
                        </div>
                        
                        <div class="mt-3">
                            <div class="btn-group">
                                <button class="btn btn-success" onclick="exportReport('stock', 'excel')">
                                    <i class="bi bi-file-earmark-excel"></i> Excel
                                </button>
                                <button class="btn btn-info" onclick="exportReport('stock', 'docx')">
                                    <i class="bi bi-file-word"></i> DOCX
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.getElementById('content').innerHTML = html;
        }
    } catch (error) {
        console.error('Ошибка загрузки отчета:', error);
        showError('Ошибка загрузки отчета');
    }
}


async function showOrdersReport() {
    document.getElementById('content').innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border" style="color: var(--accent);"></div>
            <p class="mt-3">Загрузка отчета...</p>
        </div>
    `;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/reports/orders`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            // Функция для преобразования статуса в русский текст
            function getStatusText(status) {
                const statusMap = {
                    'new': 'Новая',
                    'processing': 'В обработке',
                    'partial': 'Частично отгружена',
                    'shipped': 'Отгружена',
                    'completed': 'Завершена',
                    'cancelled': 'Отменена'
                };
                return statusMap[status] || status;
            }
            
            // Функция для получения CSS-класса статуса
            function getStatusClass(status) {
                const classMap = {
                    'new': 'bg-secondary',
                    'processing': 'bg-info',
                    'partial': 'bg-warning',
                    'shipped': 'bg-primary',
                    'completed': 'bg-success',
                    'cancelled': 'bg-danger'
                };
                return classMap[status] || 'bg-secondary';
            }
            
            let todayHtml = '';
            if (data.today_orders && data.today_orders.length > 0) {
                data.today_orders.forEach(order => {
                    const statusText = getStatusText(order.status);
                    const statusClass = getStatusClass(order.status);
                    todayHtml += `
                        <tr>
                            <td><code>${sanitizeString(order.request_number)}</code></td>
                            <td>${sanitizeString(order.customer_name)}</noscript>
                            <td>${order.items_count || 0}</td>
                            <td>${order.total_quantity || 0}</noscript>
                            <td>${order.total_amount ? Number(order.total_amount).toFixed(2) : '0'} руб.</td>
                            <td><span class="badge ${statusClass}">${statusText}</span></td>
                        </tr>
                    `;
                });
            } else {
                todayHtml = '<tr><td colspan="6" class="text-center">Нет заказов за сегодня</noscript>';
            }
            
            let tomorrowHtml = '';
            if (data.tomorrow_shipments && data.tomorrow_shipments.length > 0) {
                data.tomorrow_shipments.forEach(order => {
                    const statusText = getStatusText(order.status);
                    const statusClass = getStatusClass(order.status);
                    tomorrowHtml += `
                        <tr>
                            <td><code>${sanitizeString(order.request_number)}</code></td>
                            <td>${sanitizeString(order.customer_name)}</noscript>
                            <td>${order.items_count || 0}</noscript>
                            <td>${order.total_quantity || 0}</noscript>
                            <td>${order.total_amount ? Number(order.total_amount).toFixed(2) : '0'} руб.</td>
                            <td><span class="badge ${statusClass}">${statusText}</span></td>
                        </tr>
                    `;
                });
            } else {
                tomorrowHtml = '<tr><td colspan="6" class="text-center">Нет поставок на завтра</noscript>';
            }
            
            document.getElementById('content').innerHTML = `
                <div class="row">
                    <div class="col-md-6">
                        <div class="card mb-4">
                            <div class="card-header bg-info text-white">
                                <h5 class="mb-0">Заказы на сегодня</h5>
                            </div>
                            <div class="card-body">
                                <div class="alert alert-info">
                                    <strong>Всего заказов:</strong> ${data.summary?.today_orders_count || 0} | 
                                    <strong>Товаров:</strong> ${data.summary?.today_total_quantity || 0} | 
                                    <strong>Сумма:</strong> ${data.summary?.today_total_amount ? Number(data.summary.today_total_amount).toFixed(2) : '0'} руб.
                                </div>
                                <div class="table-responsive">
                                    <table class="table table-sm">
                                        <thead>
                                            <tr>
                                                <th>Номер</th>
                                                <th>Клиент</th>
                                                <th>Позиций (шт.)</th>
                                                <th>Количество (шт.)</th>
                                                <th>Сумма</th>
                                                <th>Статус</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${todayHtml}
                                        </tbody>
                                    </table>
                                </div>
                                <div class="mt-3">
                                    <div class="btn-group">
                                        <button class="btn btn-success btn-sm" onclick="exportReport('orders-today', 'excel')">
                                            <i class="bi bi-file-earmark-excel"></i> Excel
                                        </button>
                                        <button class="btn btn-info btn-sm" onclick="exportReport('orders-today', 'docx')">
                                            <i class="bi bi-file-word"></i> DOCX
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-md-6">
                        <div class="card mb-4">
                            <div class="card-header bg-warning text-white">
                                <h5 class="mb-0">Поставки на завтра</h5>
                            </div>
                            <div class="card-body">
                                <div class="alert alert-warning">
                                    <strong>Всего заказов:</strong> ${data.summary?.tomorrow_orders_count || 0} | 
                                    <strong>Товаров:</strong> ${data.summary?.tomorrow_total_quantity || 0} | 
                                    <strong>Сумма:</strong> ${data.summary?.tomorrow_total_amount ? Number(data.summary.tomorrow_total_amount).toFixed(2) : '0'} руб.
                                </div>
                                <div class="table-responsive">
                                    <table class="table table-sm">
                                        <thead>
                                            <tr>
                                                <th>Номер</th>
                                                <th>Клиент</th>
                                                <th>Позиций (шт.)</th>
                                                <th>Количество (шт.)</th>
                                                <th>Сумма</th>
                                                <th>Статус</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${tomorrowHtml}
                                        </tbody>
                                    </table>
                                </div>
                                <div class="mt-3">
                                    <div class="btn-group">
                                        <button class="btn btn-success btn-sm" onclick="exportReport('orders-tomorrow', 'excel')">
                                            <i class="bi bi-file-earmark-excel"></i> Excel
                                        </button>
                                        <button class="btn btn-info btn-sm" onclick="exportReport('orders-tomorrow', 'docx')">
                                            <i class="bi bi-file-word"></i> DOCX
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } else {
            showOrdersReportFallback();
        }
    } catch (error) {
        console.error('Ошибка загрузки отчета:', error);
        showOrdersReportFallback();
    }
}

function showOrdersReportFallback() {
    document.getElementById('content').innerHTML = `
        <div class="alert alert-warning">
            <i class="bi bi-exclamation-triangle"></i>
            Не удалось загрузить отчет по заказам. Попробуйте позже.
        </div>
        <button class="btn btn-primary" onclick="showOrdersReport()">
            <i class="bi bi-arrow-repeat"></i> Повторить
        </button>
    `;
}

async function showSalesReport() {
    const today = new Date().toISOString().split('T')[0];
    const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    
    const modalHtml = `
        <div class="modal fade" id="salesReportModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header bg-success text-white">
                        <h5 class="modal-title">
                            <i class="bi bi-graph-up"></i> Отчет по продажам за период
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <label class="form-label fw-bold">Начальная дата</label>
                            <input type="date" class="form-control" id="salesStartDate" value="${firstDay}"
                                   max="${today}">
                        </div>
                        <div class="mb-3">
                            <label class="form-label fw-bold">Конечная дата</label>
                            <input type="date" class="form-control" id="salesEndDate" value="${today}"
                                   max="${today}">
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Отмена</button>
                        <button type="button" class="btn btn-success" onclick="generateSalesReport()">Сформировать</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const oldModal = document.getElementById('salesReportModal');
    if (oldModal) oldModal.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = new bootstrap.Modal(document.getElementById('salesReportModal'));
    modal.show();
}

async function generateSalesReport() {
    const startDate = document.getElementById('salesStartDate').value;
    const endDate = document.getElementById('salesEndDate').value;
    
    if (!startDate || !endDate) {
        showError('Укажите начальную и конечную дату');
        return;
    }
    
    if (new Date(startDate) > new Date(endDate)) {
        showError('Начальная дата не может быть больше конечной');
        return;
    }
    
    const modal = bootstrap.Modal.getInstance(document.getElementById('salesReportModal'));
    modal.hide();
    
    document.getElementById('content').innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border" style="color: var(--accent);"></div>
            <p class="mt-3">Формирование отчета...</p>
        </div>
    `;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/reports/sales?start_date=${startDate}&end_date=${endDate}&group_by=day`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            let detailsHtml = '';
            if (data.details && data.details.length > 0) {
                data.details.forEach(item => {
                    detailsHtml += `
                        <tr>
                            <td><code>${sanitizeString(item.request_number)}</code></td>
                            <td>${sanitizeString(item.customer_name)}</noscript>
                            <td>${new Date(item.date).toLocaleDateString('ru-RU')}</noscript>
                            <td>${item.items_count || 0}</noscript>
                            <td>${item.total_quantity || 0}</noscript>
                            <td>${item.total_amount ? Number(item.total_amount).toFixed(2) : '0'} руб.</noscript>
                        </tr>
                    `;
                });
            } else {
                detailsHtml = '<tr><td colspan="6" class="text-center">Нет продаж за выбранный период</noscript>';
            }
            
            document.getElementById('content').innerHTML = `
                <div class="card mb-4">
                    <div class="card-header bg-success text-white d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">
                            <i class="bi bi-graph-up me-2"></i> 
                            Отчет по продажам за период ${startDate} - ${endDate}
                        </h5>
                        <div>
                            <button class="btn btn-sm btn-light me-2" onclick="showSalesReport()">
                                <i class="bi bi-pencil"></i> Новый отчет
                            </button>
                            <button class="btn btn-sm btn-success me-2" onclick="exportSalesReport('excel')">
                                <i class="bi bi-file-earmark-excel"></i> Excel
                            </button>
                            <button class="btn btn-sm btn-info" onclick="exportSalesReport('docx')">
                                <i class="bi bi-file-word"></i> DOCX
                            </button>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="row mb-4">
                            <div class="col-md-3">
                                <div class="card bg-primary text-white">
                                    <div class="card-body text-center">
                                        <h3>${data.total?.total_orders || 0}</h3>
                                        <p>Заказов</p>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="card bg-info text-white">
                                    <div class="card-body text-center">
                                        <h3>${data.total?.total_quantity || 0}</h3>
                                        <p>Товаров (шт.)</p>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="card bg-warning text-white">
                                    <div class="card-body text-center">
                                        <h3>${data.total?.total_amount ? Number(data.total.total_amount).toFixed(2) : '0'} руб.</h3>
                                        <p>Сумма</p>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="card bg-secondary text-white">
                                    <div class="card-body text-center">
                                        <h3>${data.details?.length || 0}</h3>
                                        <p>Позиций (шт.)</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="alert alert-info">
                            <i class="bi bi-info-circle"></i>
                            <strong>Период:</strong> ${new Date(startDate).toLocaleDateString('ru-RU')} - ${new Date(endDate).toLocaleDateString('ru-RU')}
                        </div>
                        
                        <div class="table-responsive">
                            <table class="table table-hover" id="salesReportTable">
                                <thead>
                                    <tr>
                                        <th>Номер заявки</th>
                                        <th>Покупатель</th>
                                        <th>Дата</th>
                                        <th>Позиций (шт.)</th>
                                        <th>Товаров (шт.)</th>
                                        <th>Сумма</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${detailsHtml}
                                </tbody>
                                <tfoot>
                                    <tr class="table-active fw-bold">
                                        <td colspan="5" class="text-end">ИТОГО:</td>
                                        <td>${data.total?.total_amount ? Number(data.total.total_amount).toFixed(2) : '0'} руб.</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Ошибка формирования отчета:', error);
        showError('Ошибка формирования отчета');
    }
}

async function exportSalesReport(format) {
    try {
        const startDate = document.getElementById('salesStartDate')?.value;
        const endDate = document.getElementById('salesEndDate')?.value;
        
        if (!startDate || !endDate) {
            showError('Сначала сформируйте отчет');
            return;
        }
        
        showInfo('Подготовка отчета к скачиванию...');
        
        // Получаем данные для отчета
        const response = await fetch(`${API_BASE_URL}/api/reports/sales?start_date=${startDate}&end_date=${endDate}&group_by=day`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (!response.ok) {
            throw new Error('Ошибка при получении данных');
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || 'Ошибка получения данных');
        }
        
        if (format === 'excel') {
            await exportSalesToExcel(data, startDate, endDate);
        } else if (format === 'docx') {
            await exportSalesToDocx(data, startDate, endDate);
        }
        
    } catch (error) {
        console.error('Ошибка экспорта:', error);
        showError('Ошибка экспорта: ' + error.message);
    }
}
async function exportSalesToExcel(data, startDate, endDate) {
    try {
        if (typeof XLSX === 'undefined') {
            showInfo('Загрузка библиотеки Excel...');
            await loadScript('https://cdn.sheetjs.com/xlsx-0.20.2/package/dist/xlsx.full.min.js');
        }
        
        const workbook = XLSX.utils.book_new();
        
        const worksheet_data = [
            ['ОТЧЕТ ПО ПРОДАЖАМ'],
            [`Период: ${new Date(startDate).toLocaleDateString('ru-RU')} - ${new Date(endDate).toLocaleDateString('ru-RU')}`],
            [`Дата формирования: ${new Date().toLocaleDateString('ru-RU')}`],
            [],
            ['Номер заявки', 'Покупатель', 'Дата', 'Позиций', 'Кол-во товаров', 'Сумма (руб.)']
        ];
        
        data.details.forEach(item => {
            worksheet_data.push([
                sanitizeString(item.request_number),
                sanitizeString(item.customer_name),
                new Date(item.date).toLocaleDateString('ru-RU'),
                item.items_count || 0,
                item.total_quantity || 0,
                (item.total_amount || 0).toFixed(2)
            ]);
        });
        
        worksheet_data.push([]);
        worksheet_data.push(['ИТОГО:', '', '', '', data.total?.total_quantity || 0, (data.total?.total_amount || 0).toFixed(2)]);
        
        const worksheet = XLSX.utils.aoa_to_sheet(worksheet_data);
        
        // Настройка ширины колонок
        worksheet['!cols'] = [
            { wch: 20 }, // Номер заявки
            { wch: 35 }, // Клиент
            { wch: 12 }, // Дата
            { wch: 10 }, // Позиций
            { wch: 12 }, // Кол-во товаров
            { wch: 15 }  // Сумма
        ];
        
        // Объединение ячеек для заголовка
        if (!worksheet['!merges']) worksheet['!merges'] = [];
        worksheet['!merges'].push(
            { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
            { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },
            { s: { r: 2, c: 0 }, e: { r: 2, c: 5 } }
        );
        
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Отчет по продажам');
        
        const excelBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
        const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sales_report_${startDate}_${endDate}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showSuccess('Отчет по продажам экспортирован в Excel');
    } catch (error) {
        console.error('Ошибка экспорта в Excel:', error);
        showError('Ошибка экспорта в Excel: ' + error.message);
    }
}

async function exportSalesToDocx(data, startDate, endDate) {
    try {
        showInfo('Формирование документа...');
        
        // Формируем HTML для таблицы
        let tableRows = '';
        data.details.forEach((item, index) => {
            tableRows += `
                <tr>
                    <td style="border: 1px solid #ccc; padding: 6px; text-align: center;">${index + 1}</noscript>
                    <td style="border: 1px solid #ccc; padding: 6px;"><code>${sanitizeString(item.request_number)}</code></noscript>
                    <td style="border: 1px solid #ccc; padding: 6px;">${sanitizeString(item.customer_name)}</noscript>
                    <td style="border: 1px solid #ccc; padding: 6px; text-align: center;">${new Date(item.date).toLocaleDateString('ru-RU')}</noscript>
                    <td style="border: 1px solid #ccc; padding: 6px; text-align: center;">${item.items_count || 0}</noscript>
                    <td style="border: 1px solid #ccc; padding: 6px; text-align: center;">${item.total_quantity || 0}</noscript>
                    <td style="border: 1px solid #ccc; padding: 6px; text-align: right;">${(item.total_amount || 0).toFixed(2)}</noscript>
                </tr>
            `;
        });
        
        const htmlContent = `
            <!DOCTYPE html>
            <html lang="ru">
            <head>
                <meta charset="UTF-8">
                <title>Отчет по продажам</title>
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    body {
                        font-family: 'Times New Roman', Times, serif;
                        font-size: 10pt;
                        margin: 15mm 10mm;
                        line-height: 1.2;
                    }
                    h1 {
                        font-size: 18pt;
                        text-align: center;
                        font-weight: bold;
                        margin-bottom: 10px;
                        color: #000000;
                    }
                    .subtitle {
                        text-align: center;
                        margin-bottom: 3px;
                        color: #555;
                        font-size: 10pt;
                    }
                    .info-block {
                        margin: 8px 0 15px 0;
                        padding: 8px 10px;
                        background-color: #e8f5e9;
                        border-radius: 5px;
                        font-size: 9pt;
                        border-left: 4px solid #28a745;
                    }
                    .info-row {
                        margin: 2px 0;
                    }
                    .info-label {
                        font-weight: bold;
                        display: inline-block;
                        width: 100px;
                    }
                    
                    /* Таблица */
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 8px 0 0 0;
                        font-size: 9pt;
                        table-layout: fixed;
                    }
                    th {
                        background-color: #28a745;
                        color: white;
                        padding: 8px 6px;
                        border: 1px solid #1e7e34;
                        font-weight: bold;
                        text-align: center;
                        font-size: 9pt;
                    }
                    td {
                        border: 1px solid #ccc;
                        padding: 6px;
                        vertical-align: middle;
                        word-wrap: break-word;
                    }
                    tr:nth-child(even) {
                        background-color: #f9f9f9;
                    }
                    tr:hover {
                        background-color: #f0f0f0;
                    }
                    code {
                        font-family: monospace;
                        background-color: #e8e8e8;
                        padding: 2px 4px;
                        border-radius: 3px;
                        font-size: 8pt;
                    }
                    .total-row {
                        background-color: #e8f5e9;
                        font-weight: bold;
                    }
                    .footer {
                        margin-top: 15px;
                        padding-top: 10px;
                        border-top: 1px solid #ddd;
                        text-align: center;
                        font-size: 8pt;
                        color: #999;
                    }
                    
                    /* Ширина колонок */
                    th:nth-child(1) { width: 5%; }
                    th:nth-child(2) { width: 15%; }
                    th:nth-child(3) { width: 25%; }
                    th:nth-child(4) { width: 12%; }
                    th:nth-child(5) { width: 8%; }
                    th:nth-child(6) { width: 8%; }
                    th:nth-child(7) { width: 12%; }
                    
                    @media print {
                        body {
                            margin: 0;
                        }
                        th {
                            background-color: #28a745 !important;
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                        }
                    }
                </style>
            </head>
            <body>
                <h1>ОТЧЕТ ПО ПРОДАЖАМ</h1>
                <div class="subtitle">НПУП «АТОМТЕХ»</div>
                <div class="subtitle">Дата формирования: ${new Date().toLocaleDateString('ru-RU')}</div>
                
                <div class="info-block">
                    <div class="info-row"><span class="info-label">Период:</span> ${new Date(startDate).toLocaleDateString('ru-RU')} - ${new Date(endDate).toLocaleDateString('ru-RU')}</div>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th>№</th>
                            <th>Номер заявки</th>
                            <th>Покупатель</th>
                            <th>Дата</th>
                            <th>Позиций</th>
                            <th>Кол-во</th>
                            <th>Сумма (руб.)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                        <tr class="total-row">
                            <td colspan="6" style="text-align: right; font-weight: bold;">ИТОГО:</noscript>
                            <td style="text-align: right; font-weight: bold;">${(data.total?.total_amount || 0).toFixed(2)}</noscript>
                         </tr>
                    </tbody>
                </table>
                
                <div class="footer">
                    <p>© 2026 НПУП «АТОМТЕХ». Система управления складом.</p>
                </div>
            </body>
            </html>
        `;
        
        const blob = new Blob([htmlContent], { type: 'application/msword' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sales_report_${startDate}_${endDate}.doc`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showSuccess('Отчет по продажам экспортирован в Word');
    } catch (error) {
        console.error('Ошибка экспорта в Word:', error);
        showError('Ошибка экспорта в Word: ' + error.message);
    }
}
async function applyStockFilters() {
    const category = document.getElementById('stockCategoryFilter').value;
    const status = document.getElementById('stockStatusFilter').value;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/reports/stock-status?category=${category}&status=${status}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            let html = '';
            data.data.forEach(item => {
                const statusClass = item.quantity === 0 ? 'badge-out-of-stock' :
                                  item.quantity <= item.min_quantity ? 'badge-low-stock' : 'badge-in-stock';
                const statusText = item.quantity === 0 ? 'Нет' :
                                 item.quantity <= item.min_quantity ? 'Мало' : 'Есть';
                
                html += `
                    <tr>
                        <td><code>${sanitizeString(item.unique_id)}</code></td>
                        <td>${sanitizeString(item.name)}</td>
                        <td>${sanitizeString(item.category || '-')}</td>
                        <td class="fw-bold">${item.quantity}</td>
                        <td>${item.min_quantity}</td>
                        <td><span class="${statusClass}">${statusText}</span></td>
                        <td>${sanitizeString(item.location ? `${item.location} ${item.shelf || ''}` : '-')}</td>
                        <td class="${item.shortage > 0 ? 'text-danger' : ''}">${item.shortage > 0 ? item.shortage : '-'}</td>
                    </tr>
                `;
            });
            
            document.querySelector('#stockReportTable tbody').innerHTML = html;
        }
    } catch (error) {
        console.error('Ошибка применения фильтров:', error);
        showError('Ошибка применения фильтров');
    }
}

async function exportReport(type, format, startDate = null, endDate = null) {
    try {
        showInfo('Подготовка отчета к скачиванию...');
        
        if (type === 'orders-today') {
            const response = await fetch(`${API_BASE_URL}/api/reports/orders`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            
            if (!response.ok) {
                throw new Error('Ошибка при получении данных');
            }
            
            const data = await response.json();
            
            if (format === 'excel') {
                await exportOrdersToExcel(data.today_orders || [], 'Заказы на сегодня');
            } else if (format === 'docx') {
                await exportOrdersToDocx(data.today_orders || [], 'Заказы на сегодня');
            }
            return;
            
        } else if (type === 'orders-tomorrow') {
            const response = await fetch(`${API_BASE_URL}/api/reports/orders`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            
            if (!response.ok) {
                throw new Error('Ошибка при получении данных');
            }
            
            const data = await response.json();
            
            if (format === 'excel') {
                await exportOrdersToExcel(data.tomorrow_shipments || [], 'Поставки на завтра');
            } else if (format === 'docx') {
                await exportOrdersToDocx(data.tomorrow_shipments || [], 'Поставки на завтра');
            }
            return;
            
        } else if (type === 'stock') {
            // Получаем текущие фильтры для отчета по складу
            const category = document.getElementById('stockCategoryFilter')?.value || 'all';
            const status = document.getElementById('stockStatusFilter')?.value || 'all';
            
            // Получаем данные для отчета
            const response = await fetch(`${API_BASE_URL}/api/reports/stock-status?category=${category}&status=${status}`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            
            if (!response.ok) {
                throw new Error('Ошибка при получении данных');
            }
            
            const data = await response.json();
            
            if (format === 'excel') {
                await exportStockToExcel(data.data || [], category, status);
            } else if (format === 'docx') {
                await exportStockToDocx(data.data || [], category, status);
            }
            return;
            
        } else if (type === 'sales' && startDate && endDate) {
            const url = `${API_BASE_URL}/api/reports/export?type=${type}&format=${format}&start_date=${startDate}&end_date=${endDate}`;
            
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Ошибка при формировании отчета: ${response.status} ${errorText}`);
            }
            
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            
            let ext = format;
            if (format === 'excel') ext = 'xlsx';
            else if (format === 'docx') ext = 'docx';
            
            a.download = `${type}_report_${startDate}_${endDate}.${ext}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(downloadUrl);
            
            showSuccess(`Отчет экспортирован в ${format.toUpperCase()}`);
        }
        
    } catch (error) {
        console.error('Ошибка экспорта отчета:', error);
        showError('Ошибка экспорта отчета: ' + error.message);
    }
}

async function exportStockToExcel(stockData, category, status) {
    try {
        if (typeof XLSX === 'undefined') {
            showInfo('Загрузка библиотеки Excel...');
            await loadScript('https://cdn.sheetjs.com/xlsx-0.20.2/package/dist/xlsx.full.min.js');
        }
        
        const workbook = XLSX.utils.book_new();
        
        // Формируем заголовок с информацией о фильтрах
        let categoryText = category === 'all' ? 'Все категории' : category;
        let statusText = status === 'all' ? 'Все статусы' : 
                        status === 'in_stock' ? 'В наличии' :
                        status === 'low_stock' ? 'Мало на складе' : 'Нет в наличии';
        
        // Функция для получения статуса на русском
        function getStockStatusText(quantity, minQuantity) {
            if (quantity === 0) return 'Нет в наличии';
            if (quantity <= minQuantity) return 'Мало на складе';
            return 'В наличии';
        }
        
        const worksheet_data = [
            ['ОТЧЕТ ПО СОСТОЯНИЮ СКЛАДА'],
            [`Дата формирования: ${new Date().toLocaleDateString('ru-RU')}`],
            [`Категория: ${categoryText}`],
            [`Статус наличия: ${statusText}`],
            [],
            ['№', 'Артикул', 'Наименование', 'Категория', 'Модель', 'Цена (руб.)', 'Количество', 'Мин. запас', 'Статус', 'Местоположение', 'Нехватка']
        ];
        
        // Добавляем данные
        stockData.forEach((item, index) => {
            const statusText = getStockStatusText(item.quantity, item.min_quantity);
            const shortage = item.quantity < item.min_quantity ? item.min_quantity - item.quantity : 0;
            
            worksheet_data.push([
                index + 1,
                sanitizeString(item.unique_id),
                sanitizeString(item.name),
                sanitizeString(item.category || '-'),
                sanitizeString(item.model || '-'),
                (item.price || 0).toFixed(2),
                item.quantity || 0,
                item.min_quantity || 5,
                statusText,
                sanitizeString(item.location ? `${item.location} ${item.shelf || ''}` : '-'),
                shortage > 0 ? shortage : '-'
            ]);
        });
        
        // Добавляем итоговую строку
        const totalQuantity = stockData.reduce((sum, item) => sum + (item.quantity || 0), 0);
        const totalDevices = stockData.length;
        const outOfStock = stockData.filter(item => item.quantity === 0).length;
        const lowStock = stockData.filter(item => item.quantity > 0 && item.quantity <= item.min_quantity).length;
        
        worksheet_data.push([]);
        worksheet_data.push(['ИТОГО:']);
        worksheet_data.push([`Всего приборов: ${totalDevices}`]);
        worksheet_data.push([`Общее количество на складе: ${totalQuantity} шт.`]);
        worksheet_data.push([`Нет в наличии: ${outOfStock}`]);
        worksheet_data.push([`Мало на складе: ${lowStock}`]);
        
        // Создаем worksheet
        const worksheet = XLSX.utils.aoa_to_sheet(worksheet_data);
        
        
        // Функция для применения стиля к ячейке
        function setBorder(cellAddress) {
            if (!worksheet[cellAddress]) {
                worksheet[cellAddress] = { t: 's', v: '' };
            }
            worksheet[cellAddress].s = {
                border: {
                    top: { style: 'thin', color: { rgb: "000000" } },
                    bottom: { style: 'thin', color: { rgb: "000000" } },
                    left: { style: 'thin', color: { rgb: "000000" } },
                    right: { style: 'thin', color: { rgb: "000000" } }
                }
            };
        }
        
        // Определяем диапазон данных
        const startRow = 5; // строка с заголовками таблицы (0-индекс)
        const endRow = startRow + stockData.length + 1; // последняя строка с данными
        const startCol = 0; // колонка A
        const endCol = 10; // колонка K (11 колонок)
        
        // Применяем границы ко всем ячейкам в диапазоне
        for (let r = startRow; r <= endRow; r++) {
            for (let c = startCol; c <= endCol; c++) {
                const cellAddress = XLSX.utils.encode_cell({ r: r, c: c });
                setBorder(cellAddress);
            }
        }
        
        // Применяем границы к итоговым строкам
        const totalStartRow = endRow + 3; // строка "ИТОГО:"
        for (let r = totalStartRow; r <= totalStartRow + 5; r++) {
            for (let c = startCol; c <= endCol; c++) {
                const cellAddress = XLSX.utils.encode_cell({ r: r, c: c });
                if (worksheet[cellAddress]) {
                    setBorder(cellAddress);
                }
            }
        }
        
        // Настройка ширины колонок
        worksheet['!cols'] = [
            { wch: 5 },   // №
            { wch: 15 },  // Артикул
            { wch: 35 },  // Наименование
            { wch: 15 },  // Категория
            { wch: 15 },  // Модель
            { wch: 12 },  // Цена
            { wch: 10 },  // Количество
            { wch: 10 },  // Мин. запас
            { wch: 18 },  // Статус
            { wch: 20 },  // Местоположение
            { wch: 10 }   // Нехватка
        ];
        
        // Объединение ячеек для заголовка
        if (!worksheet['!merges']) worksheet['!merges'] = [];
        worksheet['!merges'].push(
            { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } },  // Заголовок ОТЧЕТ ПО СОСТОЯНИЮ СКЛАДА
            { s: { r: 1, c: 0 }, e: { r: 1, c: 10 } },  // Дата формирования
            { s: { r: 2, c: 0 }, e: { r: 2, c: 10 } },  // Категория
            { s: { r: 3, c: 0 }, e: { r: 3, c: 10 } }   // Статус наличия
        );
        
        // Жирный шрифт для заголовков
        const headerRow = 5;
        for (let c = startCol; c <= endCol; c++) {
            const cellAddress = XLSX.utils.encode_cell({ r: headerRow, c: c });
            if (worksheet[cellAddress]) {
                worksheet[cellAddress].s = {
                    ...worksheet[cellAddress].s,
                    font: { bold: true, sz: 11, name: 'Times New Roman' },
                    fill: { fgColor: { rgb: "2E75B6" }, patternType: "solid" },
                    alignment: { horizontal: 'center', vertical: 'center' }
                };
            }
        }
        
        // Жирный шрифт для итоговых строк
        for (let r = totalStartRow; r <= totalStartRow + 5; r++) {
            for (let c = startCol; c <= endCol; c++) {
                const cellAddress = XLSX.utils.encode_cell({ r: r, c: c });
                if (worksheet[cellAddress]) {
                    worksheet[cellAddress].s = {
                        ...worksheet[cellAddress].s,
                        font: { bold: true, sz: 10, name: 'Times New Roman' }
                    };
                }
            }
        }
        
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Состояние склада');
        
        const excelBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
        const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `stock_report_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showSuccess('Отчет по складу экспортирован в Excel');
    } catch (error) {
        console.error('Ошибка экспорта в Excel:', error);
        showError('Ошибка экспорта в Excel: ' + error.message);
    }
}

async function exportStockToDocx(stockData, category, status) {
    try {
        showInfo('Формирование документа...');
        
        // Формируем текст фильтров
        let categoryText = category === 'all' ? 'Все категории' : category;
        let statusText = status === 'all' ? 'Все статусы' : 
                        status === 'in_stock' ? 'В наличии' :
                        status === 'low_stock' ? 'Мало на складе' : 'Нет в наличии';
        
        // Функция для получения статуса на русском
        function getStockStatusText(quantity, minQuantity) {
            if (quantity === 0) return 'Нет';
            if (quantity <= minQuantity) return 'Мало';
            return 'Есть';
        }
        
        // Функция для получения CSS-класса статуса
        function getStockStatusClass(quantity, minQuantity) {
            if (quantity === 0) return 'status-out';
            if (quantity <= minQuantity) return 'status-low';
            return 'status-in';
        }
        
        // Подсчет статистики
        const totalQuantity = stockData.reduce((sum, item) => sum + (item.quantity || 0), 0);
        const totalDevices = stockData.length;
        const outOfStock = stockData.filter(item => item.quantity === 0).length;
        const lowStock = stockData.filter(item => item.quantity > 0 && item.quantity <= item.min_quantity).length;
        
        // Формируем HTML для таблицы
        let tableRows = '';
        stockData.forEach((item, index) => {
            const statusText = getStockStatusText(item.quantity, item.min_quantity);
            const statusClass = getStockStatusClass(item.quantity, item.min_quantity);
            
            tableRows += `
                <tr>
                    <td style="border: 1px solid #ccc; padding: 6px; text-align: center; font-size: 12pt;">${index + 1}</noscript>
                    <td style="border: 1px solid #ccc; padding: 6px; font-size: 12pt;"><code style="font-size: 11pt;">${sanitizeString(item.unique_id)}</code></td>
                    <td style="border: 1px solid #ccc; padding: 6px; font-size: 12pt;">${sanitizeString(item.name.length > 40 ? item.name.substring(0, 37) + '...' : item.name)}</noscript>
                    <td style="border: 1px solid #ccc; padding: 6px; font-size: 12pt;">${sanitizeString(item.category || '-')}</noscript>
                    <td style="border: 1px solid #ccc; padding: 6px; text-align: right; font-size: 12pt;">${(item.price || 0).toFixed(2)}</noscript>
                    <td style="border: 1px solid #ccc; padding: 6px; text-align: center; font-size: 12pt; font-weight: bold;">${item.quantity || 0}</noscript>
                    <td style="border: 1px solid #ccc; padding: 6px; text-align: center; font-size: 12pt;">${item.min_quantity || 5}</noscript>
                    <td style="border: 1px solid #ccc; padding: 6px; text-align: center; font-size: 12pt;"><span class="${statusClass}" style="padding: 4px 10px; border-radius: 12px; font-size: 11pt; font-weight: bold;">${statusText}</span></noscript>
                    <td style="border: 1px solid #ccc; padding: 6px; font-size: 12pt;">${sanitizeString(item.location ? `${item.location}` : '-')}</noscript>
                </tr>
            `;
        });
        
        const htmlContent = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <title>Отчет по состоянию склада</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Times New Roman', Times, serif;
            font-size: 10pt;
            margin: 15mm 10mm;
            line-height: 1.3;
        }
        h1 {
            font-size: 13pt;
            text-align: center;
            font-weight: bold;
            margin-bottom: 10px;
            color: #000000;
        }
        .subtitle {
            text-align: center;
            margin-bottom: 3px;
            color: #555;
            font-size: 12pt;
        }
        .info-block {
            margin: 8px auto 5px auto;
            padding: 8px 10px;
            background-color: #f5f5f5;
            border-radius: 4px;
            font-size: 12pt;
            width: 90%;
            text-align: left;
        }
        .info-row {
            margin: 2px 0;
            font-size: 12pt;
        }
        .info-label {
            font-weight: bold;
            display: inline-block;
            width: 140px;
            font-size: 12pt;
        }
        
        /* Таблица - центрирование */
        .table-container {
            width: 100%;
            text-align: center;
            margin: 10px 0 0 0;
        }
        table {
            width: 90%;
            border-collapse: collapse;
            margin: 0 auto;
            font-size: 10pt;
            table-layout: fixed;
        }
        th {
            background-color: #2563eb;
            color: white;
            padding: 8px 6px;
            border: 1px solid #1d4ed8;
            font-weight: bold;
            text-align: center;
            font-size: 10pt;
        }
        td {
            border: 1px solid #ccc;
            padding: 6px;
            vertical-align: middle;
            word-wrap: break-word;
            font-size: 10pt;
        }
        tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        tr:hover {
            background-color: #f0f0f0;
        }
        code {
            font-family: monospace;
            background-color: #e8e8e8;
            padding: 2px 4px;
            border-radius: 3px;
            font-size: 11pt;
        }
        .status-in {
            background-color: #28a745;
            color: white;
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 11pt;
            font-weight: bold;
            display: inline-block;
        }
        .status-low {
            background-color: #ffc107;
            color: #333;
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 11pt;
            font-weight: bold;
            display: inline-block;
        }
        .status-out {
            background-color: #dc3545;
            color: white;
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 11pt;
            font-weight: bold;
            display: inline-block;
        }
        .footer {
            margin-top: 20px;
            padding-top: 10px;
            border-top: 1px solid #ddd;
            text-align: center;
            font-size: 11pt;
            color: #999;
        }
        
        /* Ширина колонок */
        th:nth-child(1) { width: 5%; }
        th:nth-child(2) { width: 12%; }
        th:nth-child(3) { width: 28%; }
        th:nth-child(4) { width: 10%; }
        th:nth-child(5) { width: 10%; }
        th:nth-child(6) { width: 5%; }
        th:nth-child(7) { width: 5%; }
        th:nth-child(8) { width: 8%; }
        th:nth-child(9) { width: 13%; }
        
        @media print {
            body {
                margin: 0;
            }
            .no-print {
                display: none;
            }
            th {
                background-color: #2563eb !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
        }
    </style>
</head>
<body>
    <h1>ОТЧЕТ ПО СОСТОЯНИЮ СКЛАДА</h1>
    <div class="subtitle">НПУП «АТОМТЕХ»</div>
    <div class="subtitle">Дата формирования: ${new Date().toLocaleDateString('ru-RU')}</div>
    
    <div class="info-block">
        <div class="info-row"><span class="info-label">Категория:</span> ${categoryText}</div>
        <div class="info-row"><span class="info-label">Статус наличия:</span> ${statusText}</div>
        <div class="info-row"><span class="info-label">Всего приборов:</span> ${totalDevices}</div>
        <div class="info-row"><span class="info-label">Общее количество:</span> ${totalQuantity} шт.</div>
        <div class="info-row"><span class="info-label">Нет в наличии:</span> ${outOfStock}</div>
        <div class="info-row"><span class="info-label">Мало на складе:</span> ${lowStock}</div>
    </div>
    
    <div class="table-container">
        <table>
            <thead>
                <tr>
                    <th>№</th>
                    <th>Артикул</th>
                    <th>Наименование</th>
                    <th>Категория</th>
                    <th>Цена, руб.</th>
                    <th>Кол-во</th>
                    <th>Мин.</th>
                    <th>Статус</th>
                    <th>Местоположение</th>
                </tr>
            </thead>
            <tbody>
                ${tableRows}
            </tbody>
        </table>
    </div>
    
    <div class="footer">
        <p>© 2026 НПУП «АТОМТЕХ». Система управления складом.</p>
        <p>Актуальность данных на дату формирования отчета.</p>
    </div>
</body>
</html>`;
        
        const blob = new Blob([htmlContent], { type: 'application/msword' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `stock_report_${new Date().toISOString().split('T')[0]}.doc`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showSuccess('Отчет по складу экспортирован в Word');
    } catch (error) {
        console.error('Ошибка экспорта в Word:', error);
        showError('Ошибка экспорта в Word: ' + error.message);
    }
}

async function exportOrdersToExcel(orders, title) {
    try {
        if (typeof XLSX === 'undefined') {
            showInfo('Загрузка библиотеки Excel...');
            await loadScript('https://cdn.sheetjs.com/xlsx-0.20.2/package/dist/xlsx.full.min.js');
        }
        
        const workbook = XLSX.utils.book_new();
        
        const worksheet_data = [
            [title],
            [`Дата формирования: ${new Date().toLocaleDateString()}`],
            [],
            ['Номер заявки', 'Клиент', 'Позиций', 'Кол-во товаров', 'Сумма', 'Статус']
        ];
        
        orders.forEach(order => {
            // Преобразуем статус в русский
            const statusText = getStatusText(order.status);
            
            worksheet_data.push([
                sanitizeString(order.request_number),
                sanitizeString(order.customer_name),
                order.items_count || 0,
                order.total_quantity || 0,
                (order.total_amount || 0).toFixed(2) + ' руб.',
                statusText
            ]);
        });
        
        const worksheet = XLSX.utils.aoa_to_sheet(worksheet_data);
        
        // Настройка ширины колонок
        worksheet['!cols'] = [
            { wch: 20 }, // Номер заявки
            { wch: 35 }, // Клиент
            { wch: 10 }, // Позиций
            { wch: 12 }, // Кол-во товаров
            { wch: 15 }, // Сумма
            { wch: 20 }  // Статус
        ];
        
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Отчет');
        
        const excelBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
        const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `orders_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showSuccess('Отчет экспортирован в Excel');
    } catch (error) {
        console.error('Ошибка экспорта в Excel:', error);
        showError('Ошибка экспорта в Excel: ' + error.message);
    }
}

async function exportOrdersToDocx(orders, title) {
    try {
        showInfo('Формирование DOCX...');
        
        let htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>${title}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 40px; }
                    h1 { text-align: center; color: #333; }
                    .date { text-align: center; margin-bottom: 30px; color: #666; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th { background-color: #f2f2f2; font-weight: bold; text-align: left; padding: 10px; border: 1px solid #ddd; }
                    td { padding: 8px 10px; border: 1px solid #ddd; }
                    tr:nth-child(even) { background-color: #f9f9f9; }
                </style>
            </head>
            <body>
                <h1>${title}</h1>
                <div class="date">Дата формирования: ${new Date().toLocaleDateString()}</div>
                <table>
                    <thead>
                        <tr>
                            <th>№</th>
                            <th>Номер заявки</th>
                            <th>Клиент</th>
                            <th>Позиций</th>
                            <th>Кол-во</th>
                            <th>Сумма</th>
                            <th>Статус</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        orders.forEach((order, index) => {
            // Преобразуем статус в русский
            const statusText = getStatusText(order.status);
            
            htmlContent += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${sanitizeString(order.request_number)}</noscript>
                    <td>${sanitizeString(order.customer_name)}</noscript>
                    <td>${order.items_count || 0}</noscript>
                    <td>${order.total_quantity || 0}</noscript>
                    <td>${(order.total_amount || 0).toFixed(2)} руб.</td>
                    <td>${statusText}</noscript>
                </tr>
            `;
        });
        
        htmlContent += `
                    </tbody>
                </table>
            </body>
            </html>
        `;
        
        const blob = new Blob([htmlContent], { type: 'application/msword' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `orders_${new Date().toISOString().split('T')[0]}.doc`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showSuccess('Отчет экспортирован в DOC');
    } catch (error) {
        console.error('Ошибка экспорта в DOC:', error);
        showError('Ошибка экспорта в DOC: ' + error.message);
    }
}

function loadScript(src) {
    return new Promise((resolve, reject) => {
        const existingScript = document.querySelector(`script[src="${src}"]`);
        if (existingScript) {
            resolve();
            return;
        }
        
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

async function loadNotifications() {
    if (!authToken) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/notifications`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Обновляем бейдж
            const badge = document.getElementById('notificationsBadge');
            if (data.unreadCount > 0) {
                badge.textContent = data.unreadCount > 99 ? '99+' : data.unreadCount;
                badge.style.display = 'inline-block';
            } else {
                badge.style.display = 'none';
            }
            
            // Формируем список уведомлений
            let notificationsHtml = '';
            
            if (data.notifications.length === 0) {
                notificationsHtml = '<div class="text-center text-muted py-4">Нет уведомлений</div>';
            } else {
                data.notifications.forEach(notif => {
                    const unreadClass = notif.is_read ? '' : 'unread';
                    // Обрезаем длинные сообщения
                    let shortMessage = notif.message;
                    if (shortMessage.length > 80) {
                        shortMessage = shortMessage.substring(0, 80) + '...';
                    }
                    
                    notificationsHtml += `
                        <li class="notification-item ${unreadClass}" data-id="${notif.id}" data-read="${notif.is_read}">
                            <div class="notification-content" onclick="markNotificationRead(${notif.id})">
                                <div class="notification-title">${sanitizeString(notif.title)}</div>
                                <div class="notification-message">${sanitizeString(shortMessage)}</div>
<div class="notification-time">${notif.created_at_formatted}</div>
                            </div>
                            <button class="notification-delete" onclick="deleteNotification(event, ${notif.id})" title="Удалить">
                                <i class="bi bi-x-lg"></i>
                            </button>
                        </li>
                    `;
                });
            }
            
            // Собираем полный HTML с прокруткой
            const listHtml = `
                <div class="notifications-header">
                    <h6>Уведомления</h6>
                </div>
                <div class="notifications-wrapper">
                    <ul class="list-unstyled mb-0">
                        ${notificationsHtml}
                    </ul>
                </div>
                ${data.notifications.length > 0 ? `
                <div class="notifications-footer">
                    <a href="#" onclick="markAllNotificationsRead()" class="text-muted small">Отметить все как прочитанные</a>
                </div>
                ` : ''}
            `;
            
            document.getElementById('notificationsList').innerHTML = listHtml;
        }
    } catch (error) {
        console.error('Ошибка загрузки уведомлений:', error);
    }
}
// Удаление уведомления
async function deleteNotification(event, notificationId) {
    event.stopPropagation(); // Чтобы не сработал клик по контенту
    
    if (!confirm('Удалить уведомление?')) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/notifications/${notificationId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showSuccess('Уведомление удалено');
            await loadNotifications(); // Обновляем список
        } else {
            showError(data.message || 'Ошибка удаления');
        }
    } catch (error) {
        console.error('Ошибка удаления уведомления:', error);
        showError('Ошибка удаления');
    }
}

// Отметка уведомления как прочитанного
async function markNotificationRead(notificationId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/notifications/${notificationId}/read`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Обновляем список
            await loadNotifications();
        }
    } catch (error) {
        console.error('Ошибка отметки уведомления:', error);
    }
}

// Отметка всех уведомлений как прочитанных
async function markAllNotificationsRead() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/notifications/read-all`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            await loadNotifications();
            showSuccess('Все уведомления отмечены как прочитанные');
        }
    } catch (error) {
        console.error('Ошибка отметки уведомлений:', error);
    }
}

// Периодическая проверка новых уведомлений (каждые 30 секунд)
setInterval(() => {
    if (authToken) {
        loadNotifications();
    }
}, 30000);


let schematicUnplacedDevices = [];
let schematicRacks = [];
let schematicSelectedDevice = null;
let schematicSelectedRack = null;
let schematicSelectedCell = null;
let schematicPanelCollapsed = false;


let activeTooltip = null;
let tooltipTimeout = null;

function showCellTooltip(element, text) {
    if (tooltipTimeout) {
        clearTimeout(tooltipTimeout);
        tooltipTimeout = null;
    }
    
    if (activeTooltip) {
        activeTooltip.remove();
        activeTooltip = null;
    }
    
    const tooltip = document.createElement('div');
    tooltip.className = 'cell-tooltip';
    tooltip.textContent = text;
    document.body.appendChild(tooltip);
    
    const rect = element.getBoundingClientRect();
    let left = rect.left + rect.width / 2;
    let top = rect.top - tooltip.offsetHeight - 8;
    
    const tooltipRect = tooltip.getBoundingClientRect();
    if (left - tooltipRect.width / 2 < 10) {
        left = 10 + tooltipRect.width / 2;
    } else if (left + tooltipRect.width / 2 > window.innerWidth - 10) {
        left = window.innerWidth - tooltipRect.width / 2 - 10;
    }
    
    if (top < 10) {
        top = rect.bottom + 8;
        tooltip.classList.add('tooltip-bottom');
    }
    
    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
    
    activeTooltip = tooltip;
}

function hideCellTooltip() {
    if (activeTooltip) {
        activeTooltip.remove();
        activeTooltip = null;
    }
}

function scheduleHideTooltip() {
    if (tooltipTimeout) {
        clearTimeout(tooltipTimeout);
    }
    tooltipTimeout = setTimeout(() => {
        hideCellTooltip();
    }, 200);
}


async function loadWarehouseMap2D() {
    if (!authToken) {
        showError('Не авторизован');
        return;
    }
    
    document.getElementById('page-title').textContent = 'Схема склада';
    document.getElementById('page-actions').innerHTML = `
        <button class="btn btn-secondary btn-sm" onclick="loadDashboard()">
            <i class="bi bi-arrow-left"></i> Назад
        </button>
        <button class="btn btn-warning btn-sm ms-2" onclick="cancelSchematicSelection()">
            <i class="bi bi-x-circle"></i> Отменить выбор
        </button>
    `;
    
    document.getElementById('content').innerHTML = `
        <div class="warehouse-schematic">
            <div class="schematic-legend">
                <div><span class="legend-dot occupied"></span> Занято</div>
                <div><span class="legend-dot free"></span> Свободно</div>
                <div><span class="legend-dot selected"></span> Выбрано</div>
                <div><i class="bi bi-cursor-fill" style="color: #f59e0b;"></i> Кликните на ячейку</div>
                <div><i class="bi bi-plus-circle" style="color: #10b981;"></i> Можно добавить</div>
            </div>
            
            <div class="schematic-grid">
                <div class="warehouse-canvas" id="schematicCanvas">
                    <div class="text-center py-5">
                        <div class="spinner-border text-primary"></div>
                        <p class="mt-3">Загрузка схемы...</p>
                    </div>
                </div>
                
                <div>
                    <div class="selection-panel mb-3">
                        <div class="selection-header" onclick="toggleSchematicPanel()">
                            <h5><i class="bi bi-box-seam me-2"></i> Неразмещенные приборы</h5>
                            <i class="bi bi-chevron-down" id="schematicPanelIcon"></i>
                        </div>
                        <div class="selection-content" id="schematicUnplacedList">
                            <div class="text-center py-4">
                                <div class="spinner-border spinner-border-sm"></div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="selection-panel">
                        <div class="selection-header" style="background: #6b7280;">
                            <h5><i class="bi bi-clock-history me-2"></i> История перемещений</h5>
                        </div>
                        <div class="history-list-schematic" id="schematicHistoryList">
                            <div class="text-center py-4">
                                <div class="spinner-border spinner-border-sm"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    await loadSchematicData();
}

async function loadSchematicData() {
    try {
        await Promise.all([
            loadSchematicUnplacedDevices(),
            loadSchematicRacks(),
            loadSchematicHistory()
        ]);
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        showError('Ошибка загрузки данных схемы склада');
    }
}

async function loadSchematicUnplacedDevices() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/warehouse/unplaced-devices`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await response.json();
        if (data.success) {
            schematicUnplacedDevices = data.devices || [];
            renderSchematicUnplacedList();
        } else {
            document.getElementById('schematicUnplacedList').innerHTML = '<div class="text-center py-4 text-muted">❌ Ошибка загрузки</div>';
        }
    } catch (error) {
        console.error('Ошибка:', error);
        document.getElementById('schematicUnplacedList').innerHTML = '<div class="text-center py-4 text-muted">❌ Ошибка загрузки</div>';
    }
}

async function loadSchematicRacks() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/warehouse/rack-cells`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await response.json();
        
        // Конфигурация рядов - 5 стеллажей в ряду
        const rowsConfig = [
            { name: 'Ряд 1', racks: ['A1', 'A2', 'A3', 'A4', 'A5'] },
            { name: 'Ряд 2', racks: ['B1', 'B2', 'B3', 'B4', 'B5'] },
            { name: 'Ряд 3', racks: ['C1', 'C2', 'C3', 'C4', 'C5'] },
            { name: 'Ряд 4', racks: ['D1', 'D2', 'D3', 'D4', 'D5'] },
            { name: 'Ряд 5', racks: ['E1', 'E2', 'E3', 'E4', 'E5'] }
        ];
        
        // Создаем карту занятых ячеек
        const occupiedCells = {};
        if (data.success && data.cells) {
            data.cells.forEach(cell => {
                const key = `${cell.rack_name}_${cell.cell_level}_${cell.cell_column}`;
                occupiedCells[key] = {
                    deviceId: cell.device_id,
                    deviceName: cell.name,
                    quantity: cell.quantity
                };
            });
        }
        
        // Строим структуру стеллажей
        schematicRacks = [];
        for (const row of rowsConfig) {
            const racks = [];
            for (const rackName of row.racks) {
                const cells = [];
                let totalQuantity = 0;
                let uniqueDevices = new Set();
                let deviceIdInRack = null;
                let deviceNameInRack = null;
                
                for (let level = 1; level <= 3; level++) {
                    for (let col = 1; col <= 3; col++) {
                        const key = `${rackName}_${level}_${col}`;
                        const occupied = !!occupiedCells[key];
                        const deviceId = occupiedCells[key]?.deviceId || null;
                        const deviceName = occupiedCells[key]?.deviceName || null;
                        const quantity = occupiedCells[key]?.quantity || 0;
                        
                        cells.push({
                            level: level,
                            column: col,
                            occupied: occupied,
                            deviceId: deviceId,
                            deviceName: deviceName,
                            quantity: quantity
                        });
                        
                        if (occupied) {
                            totalQuantity += quantity;
                            if (deviceId) {
                                uniqueDevices.add(deviceId);
                                deviceIdInRack = deviceId;
                                deviceNameInRack = deviceName;
                            }
                        }
                    }
                }
                
                racks.push({
                    name: rackName,
                    cells: cells,
                    totalQuantity: totalQuantity,
                    isOccupied: totalQuantity > 0,
                    uniqueDevicesCount: uniqueDevices.size,
                    deviceIdInRack: deviceIdInRack,
                    deviceNameInRack: deviceNameInRack
                });
            }
            schematicRacks.push({ rowName: row.name, racks: racks });
        }
        
        renderSchematicMap();
    } catch (error) {
        console.error('Ошибка:', error);
        document.getElementById('schematicCanvas').innerHTML = '<div class="text-center py-5 text-danger">❌ Ошибка загрузки схемы</div>';
    }
}

async function loadSchematicHistory() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/warehouse/placement-history?limit=50`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await response.json();
        if (data.success) {
            renderSchematicHistory(data.history || []);
        } else {
            document.getElementById('schematicHistoryList').innerHTML = '<div class="text-center py-4 text-muted">❌ Ошибка загрузки истории</div>';
        }
    } catch (error) {
        console.error('Ошибка загрузки истории:', error);
        document.getElementById('schematicHistoryList').innerHTML = '<div class="text-center py-4 text-muted">❌ Ошибка загрузки истории</div>';
    }
}

function renderSchematicMap() {
    const container = document.getElementById('schematicCanvas');
    if (!container) return;
    
    let html = '';
    
    for (const row of schematicRacks) {
        html += `
            <div class="warehouse-row">
                <div class="row-label">
                    <i class="bi bi-grid-3x3-gap-fill"></i> ${row.rowName}
                </div>
                <div class="racks-container">
        `;
        
        for (const rack of row.racks) {
            const occupiedClass = rack.isOccupied ? 'occupied' : '';
            const selectedClass = schematicSelectedRack === rack.name ? 'selected' : '';
            const isMixed = rack.uniqueDevicesCount > 1;
            
            html += `
                <div class="rack-schematic ${occupiedClass} ${selectedClass}" data-rack="${rack.name}" data-device-id="${rack.deviceIdInRack || ''}">
                    <div class="rack-header">
                        <div class="rack-name">${escapeHtml(rack.name)}</div>
                    </div>
            `;
            
            // Информация о приборе на стеллаже
            if (rack.isOccupied && !isMixed && rack.deviceNameInRack) {
                html += `
                    <div class="rack-device-info">
                        <div class="rack-device-name">${escapeHtml(rack.deviceNameInRack)}</div>
                        <div class="rack-device-quantity">${rack.totalQuantity} шт.</div>
                    </div>
                `;
            } else if (isMixed) {
                html += `
                    <div class="rack-device-info">
                        <div class="rack-device-name" style="color: #f59e0b;">⚠️ РАЗНЫЕ ПРИБОРЫ</div>
                        <div class="rack-device-quantity">${rack.totalQuantity} шт.</div>
                    </div>
                `;
            } else {
                html += `
                    <div class="rack-empty">
                        <i class="bi bi-box"></i>
                        <div>Свободно</div>
                    </div>
                `;
            }
            
            // Сетка ячеек
            html += `<div class="rack-shelves">`;
            for (let level = 1; level <= 3; level++) {
                const levelCells = rack.cells.filter(c => c.level === level);
                html += `
                    <div class="shelf-level">
                        <div class="level-label">${level}</div>
                        <div class="shelf-cells">
                `;
                
                for (const cell of levelCells) {
                    const cellClass = cell.occupied ? 'occupied' : '';
                    const isSelected = schematicSelectedCell === `${rack.name}_${cell.level}_${cell.column}`;
                    
                    html += `
                        <div class="cell ${cellClass} ${isSelected ? 'selected' : ''}"
                             data-rack="${rack.name}" 
                             data-level="${cell.level}" 
                             data-col="${cell.column}"
                             data-device-id="${cell.deviceId || ''}"
                             data-device-name="${escapeHtml(cell.deviceName || '')}"
                             data-quantity="${cell.quantity || 0}"
                             data-occupied="${cell.occupied}"
                             onclick="onCellClick(this, '${rack.name}', ${cell.level}, ${cell.column}, ${cell.deviceId || 'null'}, '${escapeHtml(cell.deviceName || '')}', ${cell.quantity || 0}, ${cell.occupied})">
                        </div>
                    `;
                }
                html += `</div></div>`;
            }
            html += `</div>`;
            
            html += `
                    <div class="rack-footer">
                        ${rack.totalQuantity > 0 ? `<span class="total-quantity">${rack.totalQuantity} шт.</span>` : 'Свободно'}
                    </div>
                </div>
            `;
        }
        html += `</div></div>`;
    }
    
    container.innerHTML = html;
    
    // Добавляем тултипы
    setTimeout(() => {
        const allCells = document.querySelectorAll('.cell');
        allCells.forEach(cell => {
            cell.removeEventListener('mouseenter', cell._mouseEnterHandler);
            cell.removeEventListener('mouseleave', cell._mouseLeaveHandler);
            
            const isOccupied = cell.classList.contains('occupied');
            const rackName = cell.dataset.rack || '?';
            const level = cell.dataset.level || '?';
            const col = cell.dataset.col || '?';
            const deviceName = cell.dataset.deviceName || '';
            const quantity = cell.dataset.quantity || '0';
            
            let tooltipText = '';
            if (isOccupied && deviceName) {
                tooltipText = `${deviceName} | ${quantity} шт. | ${rackName} | Ур.${level} Кол.${col}`;
            } else {
                tooltipText = `Свободно | ${rackName} | Ур.${level} Кол.${col}`;
            }
            
            const mouseEnterHandler = () => showCellTooltip(cell, tooltipText);
            const mouseLeaveHandler = () => scheduleHideTooltip();
            
            cell._mouseEnterHandler = mouseEnterHandler;
            cell._mouseLeaveHandler = mouseLeaveHandler;
            
            cell.addEventListener('mouseenter', mouseEnterHandler);
            cell.addEventListener('mouseleave', mouseLeaveHandler);
        });
    }, 100);
}

function renderSchematicUnplacedList() {
    const container = document.getElementById('schematicUnplacedList');
    
    if (!schematicUnplacedDevices.length) {
        container.innerHTML = `
            <div class="text-center py-4">
                <i class="bi bi-check-circle-fill text-success" style="font-size: 32px;"></i>
                <p class="mt-2 text-muted">Все приборы размещены</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    schematicUnplacedDevices.forEach(device => {
        const isSelected = schematicSelectedDevice && schematicSelectedDevice.id === device.id;
        html += `
            <div class="unplaced-item-schematic ${isSelected ? 'selected' : ''}" onclick="selectSchematicDevice(${device.id})">
                <div class="unplaced-item-name">${escapeHtml(device.name)}</div>
                <div class="unplaced-item-details">${escapeHtml(device.unique_id)} | ${device.category || 'Без категории'}</div>
                <div class="unplaced-quantity-badge">Не размещено: ${device.unplaced_quantity} шт.</div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function renderSchematicHistory(history) {
    const container = document.getElementById('schematicHistoryList');
    
    if (!history.length) {
        container.innerHTML = `
            <div class="text-center py-4">
                <i class="bi bi-inbox" style="font-size: 32px; opacity: 0.5;"></i>
                <p class="mt-2 text-muted">История пуста</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    history.slice(0, 50).forEach(item => {
        const icon = item.action_type === 'placed' ? '📦' : '🔄';
        let locationText = '';
        
        if (item.rack_name) {
            locationText = `на ${item.rack_name}`;
            if (item.cell_level && item.cell_column) {
                locationText += ` (уровень ${item.cell_level}, колонка ${item.cell_column})`;
            }
        }
        
        // Форматируем дату без времени
        const formattedDate = new Date(item.performed_at).toLocaleDateString('ru-RU');
        
        html += `
            <div class="history-item-schematic">
                <div class="history-device-name">${icon} ${escapeHtml(item.device_name)}</div>
                <div class="history-action">
                    ${item.action_type === 'placed' ? 'Размещено' : 'Перемещено'} 
                    ${locationText}
                    (${item.quantity_change} шт.)
                </div>
                <div class="history-time">
                    <i class="bi bi-calendar3"></i> ${formattedDate}
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function selectSchematicDevice(deviceId) {
    const device = schematicUnplacedDevices.find(d => d.id === deviceId);
    if (!device) return;
    
    schematicSelectedDevice = device;
    schematicSelectedRack = null;
    schematicSelectedCell = null;
    
    renderSchematicUnplacedList();
    renderSchematicMap();
    
    // Ищем, где уже размещен этот прибор
    let foundRacks = [];
    for (const row of schematicRacks) {
        for (const rack of row.racks) {
            if (rack.deviceIdInRack === deviceId) {
                foundRacks.push(rack.name);
            }
        }
    }
    
    if (foundRacks.length > 0) {
        showInfo(`Этот прибор уже размещен на стеллажах: ${foundRacks.join(', ')}. Вы можете добавить еще в эти же стеллажи или выбрать другие.`);
        
        // Подсвечиваем стеллажи, где уже есть этот прибор
        setTimeout(() => {
            foundRacks.forEach(rackName => {
                const rackElement = document.querySelector(`.rack-schematic[data-rack="${rackName}"]`);
                if (rackElement) {
                    rackElement.style.boxShadow = '0 0 15px #10b981';
                    rackElement.style.transition = 'box-shadow 0.3s';
                    setTimeout(() => {
                        if (rackElement) rackElement.style.boxShadow = '';
                    }, 2000);
                }
            });
        }, 100);
    } else {
        showInfo(`Выбран: ${device.name} (${device.unplaced_quantity} шт.). Кликните на ячейку для размещения.`);
    }
}



function refreshSchematicMap() {
    showInfo('🔄 Обновление...');
    loadSchematicData();
}

function cancelSchematicSelection() {
    schematicSelectedDevice = null;
    schematicSelectedRack = null;
    schematicSelectedCell = null;
    renderSchematicUnplacedList();
    renderSchematicMap();
    showInfo('Выбор отменен');
}

function toggleSchematicPanel() {
    schematicPanelCollapsed = !schematicPanelCollapsed;
    const content = document.querySelector('.selection-content');
    const icon = document.getElementById('schematicPanelIcon');
    
    if (schematicPanelCollapsed) {
        if (content) content.classList.add('collapsed');
        if (icon) {
            icon.classList.remove('bi-chevron-down');
            icon.classList.add('bi-chevron-right');
        }
    } else {
        if (content) content.classList.remove('collapsed');
        if (icon) {
            icon.classList.remove('bi-chevron-right');
            icon.classList.add('bi-chevron-down');
        }
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}


let currentMoveFromCell = null;
let currentMoveDevice = null;

function showMoveToCellModal(fromRack, fromLevel, fromColumn, deviceId, deviceName, currentQuantity) {
    // Сохраняем информацию об исходной ячейке
    currentMoveFromCell = {
        rack: fromRack,
        level: fromLevel,
        column: fromColumn,
        quantity: currentQuantity
    };
    currentMoveDevice = {
        id: deviceId,
        name: deviceName
    };
    
    // Загружаем доступные ячейки
    fetchAvailableCells(deviceId, fromRack, fromLevel, fromColumn);
    
    const modalHtml = `
        <div class="modal fade" id="moveToCellModal" tabindex="-1" data-bs-backdrop="static">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header" style="background: linear-gradient(135deg, var(--accent), var(--accent-hover));">
                        <h5 class="modal-title text-white">
                            <i class="bi bi-arrow-left-right"></i> Перемещение прибора
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="alert alert-info mb-3">
                            <i class="bi bi-info-circle"></i>
                            <strong>Перемещение:</strong> ${escapeHtml(deviceName)}<br>
                            <strong>Из:</strong> ${fromRack} (ур.${fromLevel}, кол.${fromColumn}) — ${currentQuantity} шт.
                        </div>
                        
                        <div class="mb-3">
                            <label class="form-label fw-bold">Количество для перемещения:</label>
                            <input type="number" class="form-control" id="moveQuantity" 
                                   value="${currentQuantity}" min="1" max="${currentQuantity}" step="1"
                                   style="width: 150px;">
                        </div>
                        
                        <div class="mb-3">
                            <label class="form-label fw-bold">Выберите целевую ячейку:</label>
                            <div id="availableCellsContainer" class="border rounded p-3" style="max-height: 400px; overflow-y: auto;">
                                <div class="text-center py-4">
                                    <div class="spinner-border spinner-border-sm"></div> Загрузка...
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Отмена</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const oldModal = document.getElementById('moveToCellModal');
    if (oldModal) oldModal.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = new bootstrap.Modal(document.getElementById('moveToCellModal'));
    modal.show();
    
    modal._element.addEventListener('hidden.bs.modal', function() {
        currentMoveFromCell = null;
        currentMoveDevice = null;
    });
}

async function fetchAvailableCells(deviceId, excludeRack, excludeLevel, excludeColumn) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/warehouse/available-cells?deviceId=${deviceId}&excludeRack=${excludeRack}&excludeLevel=${excludeLevel}&excludeColumn=${excludeColumn}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            renderAvailableCells(data.racks);
        } else {
            document.getElementById('availableCellsContainer').innerHTML = `
                <div class="alert alert-danger">Ошибка загрузки ячеек</div>
            `;
        }
    } catch (error) {
        console.error('Ошибка:', error);
        document.getElementById('availableCellsContainer').innerHTML = `
            <div class="alert alert-danger">Ошибка загрузки ячеек: ${error.message}</div>
        `;
    }
}

function renderAvailableCells(racks) {
    const container = document.getElementById('availableCellsContainer');
    
    if (Object.keys(racks).length === 0) {
        container.innerHTML = `
            <div class="alert alert-warning text-center">
                <i class="bi bi-exclamation-triangle"></i> Нет доступных ячеек для перемещения
            </div>
        `;
        return;
    }
    
    let html = '';
    
    // Сортируем стеллажи по имени
    const sortedRacks = Object.keys(racks).sort();
    
    for (const rackName of sortedRacks) {
        const cells = racks[rackName];
        
        html += `
            <div class="mb-3">
                <div class="fw-bold mb-2" style="background: var(--table-header-bg); padding: 8px; border-radius: 6px;">
                    <i class="bi bi-building"></i> Стеллаж ${rackName}
                </div>
                <div class="rack-cells-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
        `;
        
        // Сортируем ячейки по уровню и колонке
        const sortedCells = cells.sort((a, b) => {
            if (a.cell_level !== b.cell_level) return a.cell_level - b.cell_level;
            return a.cell_column - b.cell_column;
        });
        
        for (const cell of sortedCells) {
            let cellClass = '';
            let disabled = false;
            let onclick = '';
            let badgeClass = '';
            let badgeText = '';
            
            if (cell.cell_status === 'other_device') {
                cellClass = 'bg-danger bg-opacity-10';
                disabled = true;
                badgeClass = 'bg-danger';
                badgeText = 'Занято';
            } else if (cell.cell_status === 'same_device') {
                cellClass = 'bg-success bg-opacity-10 border-success';
                badgeClass = 'bg-success';
                badgeText = `${cell.current_quantity}/10 шт.`;
                onclick = `selectTargetCell('${rackName}', ${cell.cell_level}, ${cell.cell_column}, ${cell.current_quantity || 0})`;
            } else {
                cellClass = 'bg-secondary bg-opacity-10';
                badgeClass = 'bg-secondary';
                badgeText = 'Свободно';
                onclick = `selectTargetCell('${rackName}', ${cell.cell_level}, ${cell.cell_column}, 0)`;
            }
            
            html += `
                <div class="cell-card p-2 rounded ${cellClass}" style="border: 1px solid var(--table-border); cursor: ${disabled ? 'not-allowed' : 'pointer'};" 
                     onclick="${disabled ? '' : onclick}">
                    <div class="text-center">
                        <div class="fw-bold">Ур.${cell.cell_level} / Кол.${cell.cell_column}</div>
                        <span class="badge ${badgeClass} mt-1">${badgeText}</span>
                    </div>
                </div>
            `;
        }
        
        html += `</div></div>`;
    }
    
    container.innerHTML = html;
}

async function selectTargetCell(rackName, level, column, currentQuantity) {
    if (!currentMoveFromCell || !currentMoveDevice) {
        showError('Ошибка: источник перемещения не определен');
        return;
    }
    
    const quantity = parseInt(document.getElementById('moveQuantity')?.value || currentMoveFromCell.quantity);
    
    if (isNaN(quantity) || quantity < 1 || quantity > currentMoveFromCell.quantity) {
        showError(`Введите количество от 1 до ${currentMoveFromCell.quantity}`);
        return;
    }
    
    // Проверка на превышение лимита ячейки (10 шт.)
    const newTotal = currentQuantity + quantity;
    if (newTotal > 10) {
        showError(`В ячейке максимум 10 шт. Сейчас там ${currentQuantity} шт., вы пытаетесь добавить ${quantity} шт. (будет ${newTotal} шт.)`);
        return;
    }
    
    if (!confirm(`Переместить ${quantity} шт. прибора "${currentMoveDevice.name}"\nИз: ${currentMoveFromCell.rack} (ур.${currentMoveFromCell.level}, кол.${currentMoveFromCell.column})\nВ: ${rackName} (ур.${level}, кол.${column})?`)) {
        return;
    }
    
    const btn = event?.target;
    const originalText = btn?.innerHTML;
    if (btn) btn.disabled = true;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/warehouse/move-between-cells`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                deviceId: currentMoveDevice.id,
                fromRack: currentMoveFromCell.rack,
                fromLevel: currentMoveFromCell.level,
                fromColumn: currentMoveFromCell.column,
                toRack: rackName,
                toLevel: level,
                toColumn: column,
                quantity: quantity
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showSuccess(data.message);
            
            // Закрываем модальное окно
            const modal = bootstrap.Modal.getInstance(document.getElementById('moveToCellModal'));
            if (modal) modal.hide();
            
            // Обновляем схему склада
            await loadSchematicData();
        } else {
            showError(data.message);
        }
    } catch (error) {
        console.error('Ошибка перемещения:', error);
        showError('Ошибка перемещения: ' + error.message);
    } finally {
        if (btn) {
            btn.disabled = false;
            if (originalText) btn.innerHTML = originalText;
        }
    }
}


let selectedSourceCell = null;      
let selectedTargetCell = null;    
let isMoveModeActive = false;    

function onCellClick(cellElement, rackName, level, column, deviceId, deviceName, quantity, isOccupied) {
    // Если режим выбора целевой ячейки активен
    if (isMoveModeActive && selectedSourceCell) {
        selectTargetCellForMove(rackName, level, column, quantity, deviceId, deviceName, isOccupied);
        return;
    }
    
    // Если ячейка занята - показываем меню действий
    if (isOccupied && deviceId) {
        showCellActionMenu(cellElement, rackName, level, column, deviceId, deviceName, quantity);
        return;
    }
    
    // Если ячейка свободна и выбран прибор для размещения
    if (!isOccupied && schematicSelectedDevice) {
        showPlaceDeviceDialog(rackName, level, column);
        return;
    }
    
    // Если ячейка свободна, но прибор не выбран
    if (!isOccupied && !schematicSelectedDevice) {
        showError('❌ Сначала выберите прибор из списка неразмещенных!');
        return;
    }
}

function showPlaceDeviceDialog(rackName, level, column) {
    let rack = null;
    for (const row of schematicRacks) {
        const found = row.racks.find(r => r.name === rackName);
        if (found) {
            rack = found;
            break;
        }
    }
    if (!rack) return;
    
    const cell = rack.cells.find(c => c.level === level && c.column === column);
    if (!cell) return;
    
    if (cell.occupied) {
        showError(`❌ Ячейка занята прибором "${cell.deviceName}"!`);
        return;
    }
    
    if (rack.isOccupied && rack.deviceIdInRack !== schematicSelectedDevice.id) {
        showError(`❌ Стеллаж ${rackName} уже занят прибором "${rack.deviceNameInRack}"! Нельзя смешивать разные приборы.`);
        return;
    }
    
    schematicSelectedRack = rackName;
    schematicSelectedCell = `${rackName}_${level}_${column}`;
    renderSchematicMap();
    
    const maxAvailable = schematicSelectedDevice.unplaced_quantity;
    
    const modalHtml = `
        <div class="modal fade" id="schematicPlacementModal" tabindex="-1" data-bs-backdrop="static">
            <div class="modal-dialog modal-sm modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header" style="background: linear-gradient(135deg, var(--accent), var(--accent-hover));">
                        <h5 class="modal-title text-white">
                            <i class="bi bi-box-seam"></i> Размещение прибора
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="text-center mb-3">
                            <i class="bi bi-cube" style="font-size: 48px; color: var(--accent);"></i>
                        </div>
                        <table class="table table-sm">
                            <tr><th>Прибор:</th><td>${escapeHtml(schematicSelectedDevice.name)}</td></tr>
                            <tr><th>Стеллаж:</th><td>${rackName}</td></tr>
                            <tr><th>Позиция:</th><td>Ур.${level}, Кол.${column}</td></tr>
                            <tr><th>Доступно:</th><td>${schematicSelectedDevice.unplaced_quantity} шт.</td></tr>
                        </table>
                        <div class="mb-3">
                            <label class="form-label fw-bold">Количество:</label>
                            <input type="number" class="form-control text-center" id="placementQuantity" 
                                   value="${maxAvailable}" min="1" max="${maxAvailable}" step="1"
                                   style="font-size: 20px; font-weight: bold;">
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Отмена</button>
                        <button type="button" class="btn btn-primary" id="confirmPlacementBtn">
                            <i class="bi bi-check-lg"></i> Разместить
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const oldModal = document.getElementById('schematicPlacementModal');
    if (oldModal) oldModal.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modalElement = document.getElementById('schematicPlacementModal');
    const modal = new bootstrap.Modal(modalElement);
    
    document.getElementById('confirmPlacementBtn').onclick = async function() {
        const quantity = parseInt(document.getElementById('placementQuantity').value);
        
        if (isNaN(quantity) || quantity < 1 || quantity > maxAvailable) {
            showError(`Введите количество от 1 до ${maxAvailable}`);
            return;
        }
        
        modal.hide();
        showInfo(`📦 Размещение ${quantity} шт. ...`);
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/warehouse/place-device`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    deviceId: schematicSelectedDevice.id,
                    rackName: rackName,
                    quantity: quantity
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                await updateDeviceLocation(schematicSelectedDevice.id);
                if (data.remaining > 0) {
                    showWarning(`⚠️ ${data.message}`);
                    await loadSchematicData();
                    showInfo(`💡 Осталось разместить ${data.remaining} шт.`);
                } else {
                    showSuccess(` ${data.message}`);
                    schematicSelectedDevice = null;
                    schematicSelectedRack = null;
                    schematicSelectedCell = null;
                    await loadSchematicData();
                }
            } else {
                showError(` ${data.message}`);
            }
        } catch (error) {
            console.error('Ошибка:', error);
            showError(' Ошибка при размещении');
        }
    };
    
    modal.show();
    modalElement.addEventListener('hidden.bs.modal', function() { modalElement.remove(); });
}

function showCellActionMenu(cellElement, rackName, level, column, deviceId, deviceName, quantity) {
    const existingMenu = document.querySelector('.cell-action-menu');
    if (existingMenu) existingMenu.remove();
    
    const rect = cellElement.getBoundingClientRect();
    
    const menu = document.createElement('div');
    menu.className = 'cell-action-menu';
    menu.innerHTML = `
        <div class="cell-action-menu-content">
            <div class="cell-action-header">
                <strong>${escapeHtml(deviceName)}</strong><br>
                <small>${rackName} | Ур.${level} Кол.${column} | ${quantity} шт.</small>
            </div>
            <div class="cell-action-buttons">
                <button class="btn btn-warning btn-sm move-action-btn">
                    <i class="bi bi-arrow-left-right"></i> Переместить
                </button>
                <button class="btn btn-danger btn-sm remove-action-btn">
                    <i class="bi bi-box-arrow-right"></i> Изъять
                </button>
                <button class="btn btn-secondary btn-sm cancel-action-btn">
                    <i class="bi bi-x-lg"></i>
                </button>
            </div>
        </div>
    `;
    
    menu.style.position = 'fixed';
    menu.style.left = `${rect.left + rect.width / 2}px`;
    menu.style.top = `${rect.top - 10}px`;
    menu.style.transform = 'translateX(-50%) translateY(-100%)';
    menu.style.zIndex = '10000';
    
    document.body.appendChild(menu);
    
    menu.querySelector('.move-action-btn').onclick = (e) => {
        e.stopPropagation();
        menu.remove();
        startMoveMode(rackName, level, column, deviceId, deviceName, quantity);
    };
    
    menu.querySelector('.remove-action-btn').onclick = (e) => {
        e.stopPropagation();
        menu.remove();
        showRemoveFromCellModal(rackName, level, column, deviceId, deviceName, quantity);
    };
    
    menu.querySelector('.cancel-action-btn').onclick = (e) => {
        e.stopPropagation();
        menu.remove();
    };
    
    const closeMenu = (e) => {
        if (!menu.contains(e.target)) {
            menu.remove();
            document.removeEventListener('click', closeMenu);
        }
    };
    setTimeout(() => document.addEventListener('click', closeMenu), 100);
}

function startMoveMode(rackName, level, column, deviceId, deviceName, quantity) {
    selectedSourceCell = { 
        rack: rackName, 
        level: level, 
        column: column, 
        deviceId: deviceId, 
        deviceName: deviceName, 
        quantity: parseInt(quantity) 
    };
    isMoveModeActive = true;
    
    showInfo(`🔄 Режим перемещения: кликните на целевую ячейку для "${deviceName}"`);
}

function addMoveModeCancelButton() {
    const existingBtn = document.querySelector('.move-mode-cancel-btn');
    if (existingBtn) existingBtn.remove();
    
    const btn = document.createElement('div');
    btn.className = 'move-mode-cancel-btn';
    btn.innerHTML = `<button class="btn btn-secondary" onclick="cancelMoveMode()"><i class="bi bi-x-circle"></i> Отменить перемещение</button>`;
    btn.style.position = 'fixed';
    btn.style.bottom = '20px';
    btn.style.right = '20px';
    btn.style.zIndex = '10000';
    document.body.appendChild(btn);
}

function cancelMoveMode(silent = false) {
    isMoveModeActive = false;
    selectedSourceCell = null;
    selectedTargetCell = null;
    clearCellHighlights();
    if (!silent) {
        showInfo('Режим перемещения отменен');
    }
}

function onTargetCellClick(event) {
    event.stopPropagation();
    const cell = event.currentTarget;
    const rackName = cell.dataset.rack;
    const level = parseInt(cell.dataset.level);
    const column = parseInt(cell.dataset.col);
    const isOccupied = cell.classList.contains('occupied');
    const currentQuantity = parseInt(cell.dataset.quantity) || 0;
    const deviceIdInCell = cell.dataset.deviceId ? parseInt(cell.dataset.deviceId) : null;
    
    selectTargetCellForMove(rackName, level, column, currentQuantity, deviceIdInCell, isOccupied);
}

function selectTargetCellForMove(rackName, level, column, currentQuantity, deviceIdInCell, isOccupied) {
    if (!selectedSourceCell) {
        cancelMoveMode();
        return;
    }
    
    const sourceQty = parseInt(selectedSourceCell.quantity);
    const targetCurrentQty = parseInt(currentQuantity) || 0;
    
    // Проверка: нельзя перемещать в ту же ячейку
    if (selectedSourceCell.rack === rackName && 
        selectedSourceCell.level === level && 
        selectedSourceCell.column === column) {
        showError('❌ Нельзя переместить прибор в ту же ячейку');
        return;
    }
    
    // Получаем информацию о целевом стеллаже
    let targetRack = null;
    for (const row of schematicRacks) {
        const found = row.racks.find(r => r.name === rackName);
        if (found) {
            targetRack = found;
            break;
        }
    }
    
    if (targetRack) {
        // Если в целевом стеллаже уже есть приборы
        if (targetRack.isOccupied && targetRack.deviceIdInRack) {
            // И это НЕ тот же прибор, который мы перемещаем
            if (targetRack.deviceIdInRack !== selectedSourceCell.deviceId) {
                showError(`❌ Стеллаж ${rackName} уже занят прибором "${targetRack.deviceNameInRack}"! Нельзя смешивать разные приборы в одном стеллаже.`);
                return;
            }
        }
    }
    
    // Проверка: если ячейка занята другим прибором
    if (isOccupied && deviceIdInCell && parseInt(deviceIdInCell) !== selectedSourceCell.deviceId) {
        showError('❌ Целевая ячейка занята другим прибором');
        return;
    }
    
    // Сохраняем целевую ячейку
    selectedTargetCell = {
        rack: rackName, 
        level: level, 
        column: column,
        currentQuantity: targetCurrentQty,
        isOccupied: isOccupied
    };
    
    // Показываем диалог с выбором количества
    showMoveQuantityDialog();
}

function showMoveQuantityDialog() {
    if (!selectedSourceCell || !selectedTargetCell) return;
    
    const maxMove = parseInt(selectedSourceCell.quantity);
    
    const modalHtml = `
        <div class="modal fade" id="moveQuantityModal" tabindex="-1" data-bs-backdrop="static">
            <div class="modal-dialog modal-sm modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header" style="background: linear-gradient(135deg, var(--accent), var(--accent-hover));">
                        <h5 class="modal-title text-white"><i class="bi bi-arrow-left-right"></i> Перемещение прибора</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="alert alert-info mb-3">
                            <strong>${escapeHtml(selectedSourceCell.deviceName)}</strong><br>
                            <small>Из: ${selectedSourceCell.rack} (ур.${selectedSourceCell.level}, кол.${selectedSourceCell.column}) — ${selectedSourceCell.quantity} шт.</small><br>
                            <small>В: ${selectedTargetCell.rack} (ур.${selectedTargetCell.level}, кол.${selectedTargetCell.column})</small>
                        </div>
                        <div class="mb-3">
                            <label class="form-label fw-bold">Количество для перемещения:</label>
                            <input type="number" class="form-control text-center" id="moveQuantity" 
                                   value="${maxMove}" min="1" max="${maxMove}" step="1"
                                   style="font-size: 20px; font-weight: bold;">
                            <div class="form-text">Доступно: ${selectedSourceCell.quantity} шт.</div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Отмена</button>
                        <button type="button" class="btn btn-primary" id="confirmMoveBtn"><i class="bi bi-check-lg"></i> Переместить</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const oldModal = document.getElementById('moveQuantityModal');
    if (oldModal) oldModal.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modalElement = document.getElementById('moveQuantityModal');
    const modal = new bootstrap.Modal(modalElement);
    
    const confirmHandler = async function() {
        const quantityInput = document.getElementById('moveQuantity');
        const quantity = parseInt(quantityInput.value);
        
        if (isNaN(quantity) || quantity < 1 || quantity > maxMove) {
            showError(`Введите количество от 1 до ${maxMove}`);
            return;
        }
        
        modal.hide();
        
        showInfo(`🔄 Перемещение ${quantity} шт. ...`);
        
        // СОХРАНЯЕМ КОПИИ ДО ОЧИСТКИ
        const sourceCellCopy = { ...selectedSourceCell };
        const targetCellCopy = { ...selectedTargetCell };
        const wasMoveModeActive = isMoveModeActive;
        
        const requestData = {
            deviceId: sourceCellCopy.deviceId,
            fromRack: sourceCellCopy.rack,
            fromLevel: sourceCellCopy.level,
            fromColumn: sourceCellCopy.column,
            toRack: targetCellCopy.rack,
            toLevel: targetCellCopy.level,
            toColumn: targetCellCopy.column,
            quantity: quantity
        };
        
        // Очищаем состояние перемещения
        isMoveModeActive = false;
        selectedSourceCell = null;
        selectedTargetCell = null;
        clearCellHighlights();
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/warehouse/move-between-cells`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
                body: JSON.stringify(requestData)
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Обновляем местоположение прибора
                await updateDeviceLocation(sourceCellCopy.deviceId);
                
                showSuccess(` ${data.message}`);
                await loadSchematicData();
            } else {
                showError(`${data.message}`);
                // Восстанавливаем режим при ошибке
                if (wasMoveModeActive) {
                    isMoveModeActive = true;
                    selectedSourceCell = sourceCellCopy;
                    selectedTargetCell = targetCellCopy;
                    highlightAvailableCells(
                        sourceCellCopy.deviceId, 
                        sourceCellCopy.rack, 
                        sourceCellCopy.level, 
                        sourceCellCopy.column
                    );
                }
            }
        } catch (error) {
            console.error('Ошибка:', error);
            showError('Ошибка перемещения: ' + error.message);
        }
    };
    
    document.getElementById('confirmMoveBtn').onclick = confirmHandler;
    
    modalElement.addEventListener('hidden.bs.modal', function() {
        modalElement.remove();
    });
    
    modal.show();
}

function showRemoveFromCellModal(rackName, level, column, deviceId, deviceName, currentQuantity) {
    const modalHtml = `
        <div class="modal fade" id="removeFromCellModal" tabindex="-1" data-bs-backdrop="static">
            <div class="modal-dialog modal-sm modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header" style="background: linear-gradient(135deg, #dc3545, #c82333);">
                        <h5 class="modal-title text-white"><i class="bi bi-box-arrow-right"></i> Изъятие прибора</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        
                        <table class="table table-sm">
                            <tr><th>Прибор:</th><td>${escapeHtml(deviceName)}</td></tr>
                            <tr><th>Стеллаж:</th><td>${rackName}</td></tr>
                            <tr><th>Позиция:</th><td>Ур.${level}, Кол.${column}</td></tr>
                            <tr><th>В ячейке:</th><td>${currentQuantity} шт.</td></tr>
                        </table>
                        <div class="mb-3">
                            <label class="form-label fw-bold">Количество:</label>
                            <input type="number" class="form-control" id="removeQuantity" value="${currentQuantity}" min="1" max="${currentQuantity}" step="1">
                        </div>
                        <div class="mb-3">
                            <label class="form-label fw-bold">Причина:</label>
                            <select class="form-select" id="removeReason">
                                <option value="">Выберите причину...</option>
                                <option value="перемещение на другой склад">Перемещение на другой склад</option>
                                <option value="брак / повреждение">Брак / Повреждение</option>
                                <option value="списание">Списание</option>
                                <option value="возврат поставщику">Возврат поставщику</option>
                                <option value="выдача сотруднику">Выдача сотруднику</option>
                                <option value="другое">Другое</option>
                            </select>
                        </div>
                        <div class="mb-3" id="removeReasonOtherBlock" style="display: none;">
                            <label class="form-label">Укажите причину:</label>
                            <input type="text" class="form-control" id="removeReasonOther" maxlength="200">
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Отмена</button>
                        <button type="button" class="btn btn-danger" id="confirmRemoveBtn"><i class="bi bi-box-arrow-right"></i> Изъять</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const oldModal = document.getElementById('removeFromCellModal');
    if (oldModal) oldModal.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modalElement = document.getElementById('removeFromCellModal');
    const modal = new bootstrap.Modal(modalElement);
    
    const reasonSelect = document.getElementById('removeReason');
    const otherBlock = document.getElementById('removeReasonOtherBlock');
    
    reasonSelect.addEventListener('change', function() {
        otherBlock.style.display = this.value === 'другое' ? 'block' : 'none';
    });
    
    document.getElementById('confirmRemoveBtn').onclick = async function() {
        const quantity = parseInt(document.getElementById('removeQuantity').value);
        let reason = document.getElementById('removeReason').value;
        
        if (reason === 'другое') {
            reason = document.getElementById('removeReasonOther').value;
            if (!reason) { showError('Укажите причину изъятия'); return; }
        }
        
        if (isNaN(quantity) || quantity < 1 || quantity > currentQuantity) {
            showError(`Введите количество от 1 до ${currentQuantity}`);
            return;
        }
        
        const btn = this;
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Изъятие...';
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/warehouse/remove-from-cell`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
                body: JSON.stringify({ rackName: rackName, level: level, column: column, quantity: quantity, reason: reason || null })
            });
            
            const data = await response.json();
            
            if (data.success) {
                await updateDeviceLocation(deviceId);
                modal.hide();
                showSuccess(`Изъято ${quantity} шт. со стеллажа ${rackName}`);
                await loadSchematicData();
            } else {
                showError(data.message);
            }
        } catch (error) {
            console.error('Ошибка изъятия:', error);
            showError('Ошибка изъятия: ' + error.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    };
    
    modal.show();
    modalElement.addEventListener('hidden.bs.modal', function() { modalElement.remove(); });
}
function highlightAvailableCells(deviceId, excludeRack, excludeLevel, excludeColumn) {
    // Функция не используется - подсветка убрана
    console.log('highlightAvailableCells вызвана (заглушка)');
}

function clearCellHighlights() {
    // Функция не используется
    console.log('clearCellHighlights вызвана (заглушка)');
    
    // Удаляем кнопку отмены, если есть
    const cancelBtn = document.querySelector('.move-mode-cancel-btn');
    if (cancelBtn) cancelBtn.remove();
}



function addMoveModeCancelButton() {
    const existingBtn = document.querySelector('.move-mode-cancel-btn');
    if (existingBtn) existingBtn.remove();
    
    const btn = document.createElement('div');
    btn.className = 'move-mode-cancel-btn';
    btn.innerHTML = `<button class="btn btn-secondary" onclick="cancelMoveMode()"><i class="bi bi-x-circle"></i> Отменить перемещение</button>`;
    btn.style.position = 'fixed';
    btn.style.bottom = '20px';
    btn.style.right = '20px';
    btn.style.zIndex = '10000';
    document.body.appendChild(btn);
}

async function updateDeviceLocation(deviceId) {
    if (!authToken) return false;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/warehouse/update-device-location`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ deviceId: deviceId })
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log(`Местоположение для прибора ${deviceId} обновлено: ${data.location}`);
            return true;
        } else {
            console.error('Ошибка обновления местоположения:', data.message);
            return false;
        }
    } catch (error) {
        console.error('Ошибка:', error);
        return false;
    }
}

async function updateAllDeviceLocations() {
    if (!authToken) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/warehouse/update-all-device-locations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log(`${data.message}`);
        }
    } catch (error) {
        console.error('Ошибка массового обновления:', error);
    }
}


async function showFulfillReplenishmentModal(requestId) {
    const response = await fetch(`${API_BASE_URL}/api/replenishment-requests/${requestId}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    const data = await response.json();
    
    if (!data.success) {
        showError('Ошибка загрузки данных заявки');
        return;
    }
    
    const request = data.request;
    
    // НАДЕЖНОЕ ВЫЧИСЛЕНИЕ ОСТАТКА
    const requestedQuantity = parseInt(request.quantity_requested) || 0;
    const fulfilledQuantity = parseInt(request.fulfilled_quantity) || 0;
    
    // Если остаток не пришел с сервера - вычисляем сами
    let remainingQuantity = parseInt(request.remaining_quantity);
    if (isNaN(remainingQuantity) || remainingQuantity < 0) {
        remainingQuantity = requestedQuantity - fulfilledQuantity;
    }
    
    console.log('🔢 Данные заявки:', {
        requested: requestedQuantity,
        fulfilled: fulfilledQuantity,
        remaining: remainingQuantity,
        fromDB_remaining: request.remaining_quantity
    });
    
    // Если остаток 0 или меньше - заявка выполнена
    if (remainingQuantity <= 0) {
        showWarning('Эта заявка уже полностью выполнена');
        return;
    }
    
    const modalHtml = `
        <div class="modal fade" id="fulfillReplenishmentModal" tabindex="-1" data-bs-backdrop="static">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header bg-success text-white">
                        <h5 class="modal-title">
                            <i class="bi bi-box-arrow-in-down"></i> Поступление товара
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="alert alert-info">
                            <strong>Заявка №${escapeHtml(request.request_number)}</strong><br>
                            Прибор: ${escapeHtml(request.device_name)} (${escapeHtml(request.device_unique_id)})<br>
                            <hr class="my-2">
                            <div><strong>Заказано:</strong> ${requestedQuantity} шт.</div>
                            <div><strong>Уже поступило:</strong> <span class="text-success">${fulfilledQuantity} шт.</span></div>
                            <div><strong>Осталось к поставке:</strong> <span class="fw-bold text-primary">${remainingQuantity} шт.</span></div>
                        </div>
                        
                        <div class="mb-3">
                            <label class="form-label required">Фактически поступило (шт.)</label>
                            <input type="number" class="form-control" id="fulfillQuantity" 
                                   min="1" max="${remainingQuantity}" step="1" value="${remainingQuantity}" required>
                            <div class="invalid-feedback">Введите количество от 1 до ${remainingQuantity}</div>
                        </div>
                        
                        <div class="mb-3">
                            <label class="form-label">Примечание к поставке</label>
                            <textarea class="form-control" id="fulfillNotes" rows="2" 
                                      maxlength="500"></textarea>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Отмена</button>
                        <button type="button" class="btn btn-success" id="confirmFulfillBtn">
                            <i class="bi bi-check-lg"></i> Принять товар
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const oldModal = document.getElementById('fulfillReplenishmentModal');
    if (oldModal) oldModal.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Добавляем обработчик для динамического обновления остатка
    const quantityInput = document.getElementById('fulfillQuantity');
    if (quantityInput) {
        quantityInput.addEventListener('input', function() {
            let val = parseInt(this.value);
            if (isNaN(val)) val = 1;
            if (val > remainingQuantity) {
                this.value = remainingQuantity;
                showError(`Максимальное количество для поставки: ${remainingQuantity} шт.`);
            }
            if (val < 1) this.value = 1;
        });
    }
    
    const modal = new bootstrap.Modal(document.getElementById('fulfillReplenishmentModal'));
    
    document.getElementById('confirmFulfillBtn').onclick = async function() {
        const quantity = parseInt(document.getElementById('fulfillQuantity').value);
        const notes = document.getElementById('fulfillNotes').value;
        
        if (isNaN(quantity) || quantity < 1 || quantity > remainingQuantity) {
            showError(`Введите количество от 1 до ${remainingQuantity}`);
            return;
        }
        
        const btn = this;
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Обработка...';
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/replenishment-requests/${requestId}/fulfill`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    actualQuantity: quantity,
                    notes: notes
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                modal.hide();
                
                if (result.status === 'completed') {
                    showSuccess(`Заявка полностью выполнена! Всего поступило: ${result.fulfilledQuantity} шт.`);
                } else {
                    showSuccess(`Принято ${quantity} шт. Осталось к поставке: ${result.remainingQuantity} шт.`);
                }
                
                
                
                await loadReplenishmentRequests();
                if (currentReplenishmentRequestId === requestId) {
                    await viewReplenishmentRequest(requestId);
                }
            } else {
                showError(result.message || 'Ошибка выполнения заявки');
            }
        } catch (error) {
            console.error('Ошибка:', error);
            showError('Ошибка выполнения: ' + error.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    };
    
    modal.show();
}
// Функция экспорта документа инвентаризации
window.exportInventoryDocument = async function(inventoryId, docType, format) {
    if (!authToken) {
        showError('Не авторизован');
        return;
    }
    
    try {
        showInfo('📄 Формирование документа...');
        
        const response = await fetch(`${API_BASE_URL}/api/inventory/${inventoryId}/export-document?type=${docType}&format=${format}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage;
            try {
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.message;
            } catch(e) {
                errorMessage = errorText || 'Ошибка экспорта';
            }
            throw new Error(errorMessage);
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        let ext = format;
        if (format === 'excel') ext = 'xlsx';
        else if (format === 'docx') ext = 'docx';
        else if (format === 'html') ext = 'html';
        
        const typeName = docType === 'inventory_list' ? 'inventory_list' : 'comparison_sheet';
        a.download = `${typeName}_${inventoryId}.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showSuccess(`Документ экспортирован в ${format.toUpperCase()}`);
    } catch (error) {
        console.error('Ошибка экспорта:', error);
        showError('Ошибка экспорта: ' + error.message);
    }
};

// Функция экспорта инвентаризации (старая, для совместимости)
window.exportInventory = async function(inventoryId, format) {
    await window.exportInventoryDocument(inventoryId, 'inventory_list', format);
};
// Экспорт функций справочной системы
window.showHelpSystem = showHelpSystem;
window.filterHelpContent = filterHelpContent;
// Экспорт в глобальную область
window.onCellClick = onCellClick;
window.cancelMoveMode = cancelMoveMode;
window.selectSchematicDevice = selectSchematicDevice;
window.selectSchematicCell = selectSchematicCell;
window.refreshSchematicMap = refreshSchematicMap;
window.cancelSchematicSelection = cancelSchematicSelection;
window.toggleSchematicPanel = toggleSchematicPanel;
window.showCellTooltip = showCellTooltip;
window.scheduleHideTooltip = scheduleHideTooltip;
// Экспортируем новые функции в глобальную область
window.showMoveToCellModal = showMoveToCellModal;
window.showRemoveFromCellModal = showRemoveFromCellModal;
window.selectTargetCell = selectTargetCell;
window.renderAvailableCells = renderAvailableCells;
window.fetchAvailableCells = fetchAvailableCells;
// Экспорт функций в глобальную область
window.showFulfillReplenishmentModal = showFulfillReplenishmentModal;
window.rejectReplenishmentRequest = rejectReplenishmentRequest;
window.deleteReplenishmentRequest = deleteReplenishmentRequest;
window.viewReplenishmentRequest = viewReplenishmentRequest;
window.showReplenishmentDocuments = showReplenishmentDocuments;
window.exportReplenishmentDocumentByNumber = exportReplenishmentDocumentByNumber;