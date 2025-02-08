const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

const token = '7975865683:AAH9iNXh5kQPtw1GtWA2Fa9Vr7SKoSnbJRw';
const bot = new TelegramBot(token);

// Установите вебхук
const webhookUrl = 'https://pricesite.onrender.com/bot'; // Замените на ваш URL
bot.setWebHook(`${webhookUrl}${token}`);

// Middleware для обработки JSON
app.use(express.json());

// Обработчик входящих сообщений
app.post(`/bot${token}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
});

// Базовая стоимость за страницу для разных типов сайтов
const BASE_COST = {
    landing: 3000,       // Лендинг
    corporate: 5000,    // Корпоративный сайт
    ecommerce: 15000,    // Интернет-магазин
};

// Дополнительные функции и их стоимость
const ADDITIONAL_FEATURES = {
    form: 2000,
    gallery: 1000,
    multi: 3000,
    seo: 2000,
    analitic:2000,
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
    if (isNaN(pages) || pages <= 0) {
        throw new Error('Количество страниц должно быть положительным числом.');
    }

    // Проверка, что тип сайта существует
    if (!BASE_COST[type]) {
        throw new Error('Неверный тип сайта.');
    }
    let cost = BASE_COST[type] * pages;

    features.forEach(feature => {
        if (ADDITIONAL_FEATURES[feature]) {
            cost += ADDITIONAL_FEATURES[feature];
        }
    });

    for (const threshold in DISCOUNTS) {
        if (pages >= parseInt(threshold)) {
            cost *= (1 - DISCOUNTS[threshold]);
            break;
        }
    }

    return Math.round(cost);
}

// Глобальный объект для хранения состояния пользователя
const userState = {};

// Функция для отправки inline-клавиатуры с выбором типа сайта
function sendTypeSelection(chatId) {
    const options = {
        reply_markup: {
            inline_keyboard: [
                [{ text: 'Лендинг', callback_data: 'landing' }],
                [{ text: 'Корпоративный', callback_data: 'corporate' }],
                [{ text: 'Интернет-магазин', callback_data: 'ecommerce' }],
            ],
        },
    };

    // Отправляем сообщение с inline-клавиатурой
    bot.sendMessage(chatId, 'Выберите тип сайта:', options);
}

// Обработчик команды /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    sendTypeSelection(chatId);
});

// Обработчик всех inline-кнопок
bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;

    // Если пользователь выбирает тип сайта
    if (['landing', 'corporate', 'ecommerce'].includes(data)) {
        // Сохраняем тип сайта в состоянии пользователя
        userState[chatId] = {
            type: data,
            features: [],
        };

        // Запрашиваем количество страниц
        bot.sendMessage(chatId, 'Введите количество страниц:');
        bot.answerCallbackQuery(query.id);
    }

    // Если пользователь выбирает дополнительные функции
    else if (['form', 'gallery', 'multi', 'seo', 'analitic', 'table', 'popup', 'map'].includes(data)) {
        // Добавляем функцию в список
        if (userState[chatId]) {
            userState[chatId].features.push(data);
            bot.answerCallbackQuery(query.id, { text: `Добавлено: ${data}` });
        }
    }

    // Если пользователь нажимает "Рассчитать стоимость"
    else if (data === 'calculate') {
        if (userState[chatId]) {
            const { type, pages, features } = userState[chatId];

            // Проверяем, что количество страниц было введено
            if (!pages) {
                bot.sendMessage(chatId, 'Пожалуйста, введите количество страниц.');
                return;
            }

            // Рассчитываем стоимость
            try {
                const cost = calculateCost(pages, type, features);
                bot.sendMessage(chatId, `Стоимость сайта: ${cost} рублей. \nВы выбрали: \nТип сайта: ${type == "landing" ? "Лендинг" : type == "corporate" ? "Корпоративный" : "Интернет магазин"} \nКоличество страниц: ${pages}\nДополнительные функции: ${features}`);

                // Предложить рассчитать снова
                const options = {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: 'Рассчитать снова', callback_data: 'restart' }],
                        ],
                    },
                };
                bot.sendMessage(chatId, 'Хотите рассчитать стоимость еще раз?', options);
            } catch (error) {
                bot.sendMessage(chatId, `Ошибка: ${error.message}`);
                sendTypeSelection(chatId); // Предложить выбрать тип сайта снова
            }

            // Очищаем состояние пользователя
            delete userState[chatId];
        } else {
            bot.sendMessage(chatId, 'Пожалуйста, сначала выберите тип сайта.');
            sendTypeSelection(chatId); // Предложить выбрать тип сайта снова
        }
        bot.answerCallbackQuery(query.id);
    }

    // Если пользователь нажимает "Рассчитать снова"
    else if (data === 'restart') {
        sendTypeSelection(chatId); // Предложить выбрать тип сайта снова
        bot.answerCallbackQuery(query.id);
    }
});

// Обработчик ввода количества страниц
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    // Проверяем, что сообщение содержит число (количество страниц)
    const pages = parseInt(text);
    if (!isNaN(pages) && pages > 0) {
        // Сохраняем количество страниц в состоянии пользователя
        if (userState[chatId]) {
            userState[chatId].pages = pages;

            // Предложить выбор дополнительных функций
            const options = {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: 'Форма обратной связи', callback_data: 'form' }],
                        [{ text: 'Галлерея/карусель', callback_data: 'gallery' }],
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
        } else {
            bot.sendMessage(chatId, 'Пожалуйста, сначала выберите тип сайта.');
            sendTypeSelection(chatId); // Предложить выбрать тип сайта снова
        }
    } else {
        bot.sendMessage(chatId, 'Пожалуйста, введите корректное число страниц.');
    }
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});