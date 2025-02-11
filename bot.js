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
    landing: 2000,       // Лендинг
    catalog: 3000,       // Каталог
    blog: 4000,         // Блог
    corporate: 5000,    // Корпоративный сайт
    ecommerce: 10000,    // Интернет-магазин
};

// Дополнительные функции и их стоимость
const ADDITIONAL_FEATURES = {
    nav: 300,
    footer: 300,
    form: 1500,
    gallery: 500,
    articale: 100,
    queryAndSort: 1500,
    multi: 1000,
    seo: 300,
    analitic: 700,
    table: 1000,
    map: 1000,
    popup: 700,
    video: 500,
    logo: 1000, 
};

// Скидки в зависимости от количества страниц
const DISCOUNTS = {
    5: 0.05,  // 5% скидка для сайтов с 10+ страницами
    10: 0.1,   // 10% скидка для сайтов с 20+ страницами
    20: 0.15,  // 15% скидка для сайтов с 50+ страницами
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
                [{ text: 'Лендинг | 2000 руб/стр', callback_data: 'landing' }],
[{ text: 'Блог | 4000 руб/стр', callback_data: 'blog' }],
[{ text: 'Каталог | 3000 руб/стр', callback_data: 'catalog' }],
                [{ text: 'Корпоративный | 5000 руб/стр', callback_data: 'corporate' }],
                [{ text: 'Интернет-магазин | 10000 руб/стр', callback_data: 'ecommerce' }],
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

bot.onText('/help', (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, '`Лендинг (Landing Page)`\nОписание: Одностраничный сайт, предназначенный для презентации продукта, услуги или акции. Часто используется для сбора контактных данных или продажи.\n`Каталог`\nОписание: Сайт с перечнем товаров или услуг без возможности покупки онлайн.\n`Блог`\nОписание: Сайт для публикации статей, новостей или личных записей. Часто используется для SEO-продвижения. \n`Корпоративный сайт`\nОписание: Сайт для представления компании, её услуг, продуктов, новостей и контактов. Часто включает несколько страниц и разделов.\n`Интернет-магазин`\nОписание: Сайт для продажи товаров или услуг онлайн. Включает каталог товаров, корзину, оплату и доставку.')});

// Обработчик всех inline-кнопок
bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;

    // Если пользователь выбирает тип сайта
    if (['landing', 'blog', 'catalog', 'corporate', 'ecommerce'].includes(data)) {
        // Сохраняем тип сайта в состоянии пользователя
        userState[chatId] = {
            type: data,
            features: [],
        };
bot.sendMessage(chatId, '1 СТРАНИЦА = 4 СЕКЦИИ\nЕсли секций на одной странице больше 4, то добавляем еще страницу\nФутер не считаем');
        bot.sendMessage(chatId, 'Скидка за количество страниц: \nОт 5 страниц: 5%\nОт 10 страниц: 10%\nОт 20 страниц: 15%');
        // Запрашиваем количество страниц
        bot.sendMessage(chatId, 'Введите количество страниц:');
        bot.answerCallbackQuery(query.id);
    }

    // Если пользователь выбирает дополнительные функции
    else if (['nav', 'footer', 'form', 'gallery', 'article', 'queryAndSort', 'multi', 'seo', 'analitic', 'table', 'popup', 'map', 'video', 'logo'].includes(data)) {
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
                bot.sendMessage(chatId, `Стоимость сайта: ${cost} рублей. \nВы выбрали: \nТип сайта: ${type == "landing" ? "Лендинг" : type == "blog" ? 'Блог' : type == "catalog"? 'Каталог' : type == "corporate" ? "Корпоративный" : "Интернет-магазин"} \nКоличество страниц: ${pages}\nДополнительные функции: ${features.length ? '\n •' : ''} ${features.join("\n • ")}`);
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
     [{ text: 'Хедер с навигацией | 300 руб/шт', callback_data: 'nav' }],
  [{ text: 'Футер | 300 руб/шт', callback_data: 'footer' }],
                        [{ text: 'Форма обратной связи | 1500 руб/шт', callback_data: 'form' }],
                        [{ text: 'Галерея/карусель | 500 руб/шт', callback_data: 'gallery' }],
[{ text: 'Страница статьи/новости/продукта | 100 руб/шт', callback_data: 'article' }],
[{ text: 'Поиск и сортировка | 1500 руб/шт', callback_data: 'queryAndSort' }],
                        [{ text: 'Мультиязычность | 1000 руб/стр', callback_data: 'multi' }],
                        [{ text: 'SEO-оптимизация | 300 руб/стр', callback_data: 'seo' }],
                        [{ text: 'Аналитика (Яндекс метрика) | 700 руб', callback_data: 'analitic' }],
                        [{ text: 'Таблица | 1000 руб/шт', callback_data: 'table' }],
                        [{ text: 'Карта | 1000 руб/шт', callback_data: 'map' }],
                        [{ text: 'Модальное окно | 700 руб/шт', callback_data: 'popup' }],
[{ text: 'Размещение видео | 500 руб/шт', callback_data: 'video' }],
[{ text: 'Создание логотипа | 1000 руб/шт', callback_data: 'logo' }],
                        [{ text: 'Рассчитать стоимость', callback_data: 'calculate' }],
                    ],
                },
            };
            bot.sendMessage(chatId, 'Выберите дополнительные функции:\nМожно выбрать несколько штук каждой функции нажимая несколько раз', options);
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