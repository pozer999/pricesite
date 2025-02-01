// 7975865683:AAH9iNXh5kQPtw1GtWA2Fa9Vr7SKoSnbJRw
// https://pricesite.onrender.com/bot
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const app = express();
const PORT = process.env.PORT || 10000;

const token = '7975865683:AAH9iNXh5kQPtw1GtWA2Fa9Vr7SKoSnbJRw'; // Замените на ваш токен
const bot = new TelegramBot(token);

// Установите вебхук
const webhookUrl = 'https://pricesite.onrender.com/bot'; // Замените на ваш URL
bot.setWebHook(`${webhookUrl}${token}`);

// Middleware для обработки JSON
app.use(express.json());

// Базовая стоимость за страницу для разных типов сайтов
const BASE_COST = {
    landing: 5000,       // Лендинг
    corporate: 10000,    // Корпоративный сайт
    ecommerce: 20000,    // Интернет-магазин
};

// Сопоставление русских названий с английскими ключами
const TYPE_MAPPING = {
    'лендинг': 'landing',
    'корпоративный': 'corporate',
    'интернет-магазин': 'ecommerce',
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
    // Проверка, что pages — число
    if (isNaN(pages) || pages <= 0) {
        throw new Error('Количество страниц должно быть положительным числом.');
    }

    // Преобразуем тип сайта в английский ключ
    const englishType = TYPE_MAPPING[type.toLowerCase()];

    // Проверка, что тип сайта существует
    if (!englishType || !BASE_COST[englishType]) {
        throw new Error('Неверный тип сайта.');
    }

    // Базовая стоимость
    let cost = BASE_COST[englishType] * pages;

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
    const options = {
        reply_markup: {
            keyboard: [['Лендинг', 'Корпоративный', 'Интернет-магазин']],
            one_time_keyboard: true,
        },
    };
    bot.sendMessage(chatId, 'Выберите тип сайта:', options);
});

// Обработчик выбора типа сайта
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (['Лендинг', 'Корпоративный', 'Интернет-магазин'].includes(text)) {
        // Сохраняем тип сайта
        bot.sendMessage(chatId, 'Введите количество страниц:');
        bot.once('message', (msg) => {
            const pages = parseInt(msg.text);

            if (isNaN(pages) || pages <= 0) {
                bot.sendMessage(chatId, 'Пожалуйста, введите корректное число страниц.');
                return;
            }

            // Предложить выбор дополнительных функций
            const options = {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: 'Платежная система', callback_data: 'payment' }],
                        [{ text: 'Мультиязычность', callback_data: 'multilingual' }],
                        [{ text: 'Адаптивный дизайн', callback_data: 'responsive' }],
                        [{ text: 'Админ-панель', callback_data: 'adminPanel' }],
                        [{ text: 'Рассчитать стоимость', callback_data: 'calculate' }],
                    ],
                },
            };
            bot.sendMessage(chatId, 'Выберите дополнительные функции:', options);

            // Сохраняем данные для расчета
            const userData = {
                type: text.toLowerCase(),
                pages: pages,
                features: [],
            };

            // Обработчик выбора функций
            bot.on('callback_query', (query) => {
                const data = query.data;
                const chatId = query.message.chat.id;

                if (data === 'calculate') {
                    try {
                        // Рассчитать стоимость
                        const cost = calculateCost(userData.pages, userData.type, userData.features);
                        bot.sendMessage(chatId, `Стоимость сайта: ${cost} рублей.`);
                    } catch (error) {
                        bot.sendMessage(chatId, `Ошибка: ${error.message}`);
                    }
                } else {
                    // Добавить функцию в список
                    userData.features.push(data);
                    bot.answerCallbackQuery(query.id, { text: `Добавлено: ${data}` });
                }
            });
        });
    } else {
        bot.sendMessage(chatId, 'Пожалуйста, выберите тип сайта из предложенных вариантов.');
    }
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});