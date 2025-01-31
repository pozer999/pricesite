const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot('EQCLfvbkTrdUJ1wfyNI9uOdcK30z1wbWWX060mrXBNwp2Tse', { polling: true });
bot.deleteWebHook();
// Базовая стоимость за страницу для разных типов сайтов
const BASE_COST = {
    landing: 5000,       // Лендинг
    corporate: 10000,    // Корпоративный сайт
    ecommerce: 20000,    // Интернет-магазин
};

// Дополнительные функции и их стоимость
const ADDITIONAL_FEATURES = {
    payment: 10000,      // Интеграция с платежными системами
    multilingual: 15000, // Мультиязычность
    responsive: 8000,    // Адаптивный дизайн
    adminPanel: 12000,   // Админ-панель
};

// Скидки в зависимости от количества страниц
const DISCOUNTS = {
    10: 0.05,  // 5% скидка для сайтов с 10+ страницами
    20: 0.1,   // 10% скидка для сайтов с 20+ страницами
    50: 0.15,  // 15% скидка для сайтов с 50+ страницами
};

// Функция расчета стоимости
function calculateCost(pages, type, features = []) {
    // Базовая стоимость
    let cost = BASE_COST[type] * pages;

    // Добавляем стоимость дополнительных функций
    features.forEach(feature => {
        if (ADDITIONAL_FEATURES[feature]) {
            cost += ADDITIONAL_FEATURES[feature];
        }
    });

    // Применяем скидку
    for (const threshold in DISCOUNTS) {
        if (pages >= parseInt(threshold)) {
            cost *= (1 - DISCOUNTS[threshold]);
            break;
        }
    }

    return Math.round(cost); // Округляем до целого числа
}

// Обработчик команды /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const message = `
Привет! Я бот для расчета стоимости сайта.
Введите данные в формате:
<тип сайта> <количество страниц> <дополнительные функции>

Пример:
корпоративный 10 платеж мультиязычность
Доступные типы сайтов: лендинг, корпоративный, ecommerce.
Доступные функции: платеж, мультиязычность, адаптивный, админпанель.
    `;
    bot.sendMessage(chatId, message);
});

// Обработчик ввода пользователя
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    // Парсим ввод пользователя
    const parts = text.split(' ');
    const type = parts[0];
    const pages = parseInt(parts[1]);
    const features = parts.slice(2);

    // Проверяем корректность ввода
    if (!BASE_COST[type] || isNaN(pages) || pages <= 0) {
        bot.sendMessage(chatId, "Пожалуйста, введите корректные данные. Используйте формат: <тип сайта> <количество страниц> <дополнительные функции>");
        return;
    }

    // Рассчитываем стоимость
    const cost = calculateCost(pages, type, features);
    bot.sendMessage(chatId, `Стоимость сайта: ${cost} рублей.`);
});