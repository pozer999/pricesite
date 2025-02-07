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
    form: 2000,      // Интеграция с платежными системами
    gallery: 1000, // Мультиязычность
    multi: 3000,    // Адаптивный дизайн
    seo: 2000,   // Админ-панель
    analitic: 2000,   // Админ-панель
    table: 2000,
    map: 2000,
    popup: 1000,
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
        console.log('Количество страниц должно быть положительным числом');
        throw new Error('Количество страниц должно быть положительным числом.');
    }

    // Преобразуем тип сайта в английский ключ
    const englishType = TYPE_MAPPING[type.toLowerCase()];

    // Проверка, что тип сайта существует
    if (!englishType || !BASE_COST[englishType]) {
        console.log('Неверный тип сайта');
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
            keyboard: [['landing', 'corporate', 'ecommerce']],
            one_time_keyboard: true,
        },
    };
    console.log("Тип сайта выбран: ", options);
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
            console.log("Количество страниц выбрано: ", pages);

            if (isNaN(pages) || pages <= 0) {
                bot.sendMessage(chatId, 'Пожалуйста, введите корректное число страниц.');
                return;
            }

            // Предложить выбор дополнительных функций
            const options = {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: 'Форма обратной связи', callback_data: 'form' }],
                        [{ text: 'Галерея/карусель', callback_data: 'gallery' }],
                        [{ text: 'Мультиязычность', callback_data: 'multi' }],
                        [{ text: 'SEO-оптимизация', callback_data: 'seo' }],
                        [{ text: 'Аналитика(Яндекс метрика)', callback_data: 'analitic' }],
                        [{ text: 'Таблица', callback_data: 'table' }],
                        [{ text: 'Карта', callback_data: 'map' }],
                        [{ text: 'Модальное окно', callback_data: 'popup' }],
                        [{ text: 'Рассчитать стоимость', callback_data: 'calculate' }],
                    ],
                },
            };
            console.log("Доп.функции выбраны: ", options);

            bot.sendMessage(chatId, 'Выберите дополнительные функции:', options);

            // Сохраняем данные для расчета
            const userData = {};

            bot.on('message', (msg) => {
                const chatId = msg.chat.id;
                const text = msg.text;
            
                if (!userData[chatId]) {
                    userData[chatId] = {};
                }
            
                if (['Лендинг', 'Корпоративный', 'Интернет-магазин'].includes(text)) {
                    userData[chatId].type = text.toLowerCase();
                    bot.sendMessage(chatId, 'Введите количество страниц:');
                    bot.once('message', (msg) => {
                        const pages = parseInt(msg.text);
                        if (isNaN(pages) || pages <= 0) {
                            bot.sendMessage(chatId, 'Пожалуйста, введите корректное число страниц.');
                            return;
                        }
                        userData[chatId].pages = pages;
                        userData[chatId].features = [];
            
                        const options = {
                            reply_markup: {
                                inline_keyboard: [
                                    [{ text: 'Форма обратной связи', callback_data: 'form' }],
                                    [{ text: 'Галерея/карусель', callback_data: 'gallery' }],
                                    [{ text: 'Мультиязычность', callback_data: 'multi' }],
                                    [{ text: 'SEO-оптимизация', callback_data: 'seo' }],
                                    [{ text: 'Аналитика(Яндекс метрика)', callback_data: 'analitic' }],
                                    [{ text: 'Таблица', callback_data: 'table' }],
                                    [{ text: 'Карта', callback_data: 'map' }],
                                    [{ text: 'Модальное окно', callback_data: 'popup' }],
                                    [{ text: 'Рассчитать стоимость', callback_data: 'calculate' }],
                                ],
                            },
                        };
                        bot.sendMessage(chatId, 'Выберите дополнительные функции:', options);
                    });
                }
            });
            
            bot.on('callback_query', (query) => {
                const data = query.data;
                const chatId = query.message.chat.id;
            
                if (data === 'calculate') {
                    try {
                        const cost = calculateCost(userData[chatId].pages, userData[chatId].type, userData[chatId].features);
                        bot.sendMessage(chatId, `Стоимость сайта: ${cost} рублей.`);
                    } catch (error) {
                        console.log("Возникла ошибка: ", error);
                        bot.sendMessage(chatId, `Ошибка: ${error.message}`);
                    }
                } else {
                    userData[chatId].features.push(data);
                    bot.answerCallbackQuery(query.id, { text: `Добавлено: ${data} `});
                }
            });
        });
    } else {
        console.log("Пожалуйста, выберите тип сайта из предложенных вариантов.");
        bot.sendMessage(chatId, 'Пожалуйста, выберите тип сайта из предложенных вариантов.');
    }
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});