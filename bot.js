const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const app = express();
const PORT = process.env.PORT || 10000;

const token = '7975865683:AAH9iNXh5kQPtw1GtWA2Fa9Vr7SKoSnbJRw'; // Замените на ваш токен
const bot = new TelegramBot(token, { polling: true }); // Используем polling для локальной разработки

// Middleware для обработки JSON
app.use(express.json());

// Базовая стоимость за страницу для разных типов сайтов
const BASE_COST = {
    landing: 3000,       // Лендинг
    corporate: 5000,    // Корпоративный сайт
    ecommerce: 15000,    // Интернет-магазин
};

// Сопоставление русских названий с английскими ключами
const TYPE_MAPPING = {
    'лендинг': 'landing',
    'корпоративный': 'corporate',
    'интернет-магазин': 'ecommerce',
};

// Дополнительные функции и их стоимость
const ADDITIONAL_FEATURES = {
    form: { name: 'Форма обратной связи', cost: 2000 },
    gallery: { name: 'Галерея/карусель', cost: 1000 },
    multi: { name: 'Мультиязычность', cost: 3000 },
    seo: { name: 'SEO-оптимизация', cost: 2000 },
    analitic: { name: 'Аналитика (Яндекс Метрика)', cost: 2000 },
    table: { name: 'Таблица', cost: 2000 },
    map: { name: 'Карта', cost: 2000 },
    popup: { name: 'Модальное окно', cost: 1000 },
};

// Скидки в зависимости от количества страниц
const DISCOUNTS = {
    10: 0.05,  // 5% скидка для сайтов с 10+ страницами
    20: 0.1,   // 10% скидка для сайтов с 20+ страницами
    50: 0.15,  // 15% скидка для сайтов с 50+ страницами
};

// Функция расчета стоимости
function calculateCost(pages, type, features = []) {
    console.log(`Расчет стоимости: pages=${pages}, type=${type}, features=${features}`);
    if (isNaN(pages) || pages <= 0) {
        throw new Error('Количество страниц должно быть положительным числом.');
    }

    const englishType = TYPE_MAPPING[type.toLowerCase()];
    if (!englishType || !BASE_COST[englishType]) {
        throw new Error('Неверный тип сайта.');
    }

    let cost = BASE_COST[englishType] * pages;

    features.forEach(feature => {
        if (ADDITIONAL_FEATURES[feature]) {
            cost += ADDITIONAL_FEATURES[feature].cost;
        }
    });

    for (const threshold in DISCOUNTS) {
        if (pages >= parseInt(threshold)) {
            cost *= (1 - DISCOUNTS[threshold]);
            break;
        }
    }

    console.log(`Рассчитанная стоимость: ${cost} рублей`);
    return Math.round(cost);
}

// Хранение данных пользователя
const userData = {};

// Обработчик команды /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    console.log(`Команда /start получена от chatId: ${chatId}`);

    const options = {
        reply_markup: {
            inline_keyboard: [
                [{ text: 'Лендинг', callback_data: 'type_лендинг' }],
                [{ text: 'Корпоративный', callback_data: 'type_корпоративный' }],
                [{ text: 'Интернет-магазин', callback_data: 'type_интернет-магазин' }],
            ],
        },
    };
    bot.sendMessage(chatId, 'Выберите тип сайта:', options);
});

// Обработчик callback_query
bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;
    console.log(`Callback_query получен от chatId: ${chatId}, данные: ${data}`);

    if (data.startsWith('type_')) {
        // Пользователь выбрал тип сайта
        const type = data.replace('type_', '');
        console.log(`Тип сайта выбран: ${type}`);
        userData[chatId] = { type: type, features: [] };
        bot.sendMessage(chatId, 'Введите количество страниц:');
    } else if (data === 'calculate') {
        // Пользователь нажал "Рассчитать стоимость"
        try {
            console.log(`Расчет стоимости для chatId: ${chatId}`);
            const cost = calculateCost(userData[chatId].pages, userData[chatId].type, userData[chatId].features);
            bot.sendMessage(chatId, `Стоимость сайта: ${cost} рублей.`);
        } catch (error) {
            console.error(`Ошибка при расчете стоимости: ${error.message}`);
            bot.sendMessage(chatId, `Ошибка: ${error.message}`);
        }
    } else {
        // Пользователь выбрал дополнительную функцию
        const feature = data;
        if (ADDITIONAL_FEATURES[feature]) {
            userData[chatId].features.push(feature);
            const featureName = ADDITIONAL_FEATURES[feature].name;
            const featureCost = ADDITIONAL_FEATURES[feature].cost;
            bot.answerCallbackQuery(query.id, { text: `Добавлено: ${featureName} (+${featureCost} руб)` });
            console.log(`Добавлена функция: ${featureName} для chatId: ${chatId}`);
        }
    }
});

// Обработчик сообщений (для ввода количества страниц)
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    console.log(`Получено сообщение от chatId: ${chatId}, текст: ${text}`);

    if (userData[chatId] && !userData[chatId].pages) {
        const pages = parseInt(text);
        if (isNaN(pages) || pages <= 0) {
            console.log(`Некорректное количество страниц: ${text}`);
            bot.sendMessage(chatId, 'Пожалуйста, введите корректное число страниц.');
            return;
        }
        console.log(`Количество страниц выбрано: ${pages}`);
        userData[chatId].pages = pages;

        // Создаем inline-клавиатуру для выбора дополнительных функций
        const inlineKeyboard = Object.keys(ADDITIONAL_FEATURES).map(feature => {
            const featureName = ADDITIONAL_FEATURES[feature].name;
            const featureCost = ADDITIONAL_FEATURES[feature].cost;
            return [{ text: `${featureName} (+${featureCost} руб)`, callback_data: feature }];
        });
        inlineKeyboard.push([{ text: 'Рассчитать стоимость', callback_data: 'calculate' }]);

        const options = {
            reply_markup: {
                inline_keyboard: inlineKeyboard,
            },
        };
        console.log(`Отправка клавиатуры с дополнительными функциями для chatId: ${chatId}`);
        bot.sendMessage(chatId, 'Выберите дополнительные функции:', options);
    }
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});