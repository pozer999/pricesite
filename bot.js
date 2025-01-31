const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const app = express();

const token = '7975865683:AAEd1-_43PQtpYpns-3xy77W-L9S1hoEqFc';

// Создаем экземпляр бота
const bot = new TelegramBot(token, { polling: true });

// Обработчик команды /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "Привет! Я бот для расчета стоимости сайта. Введите количество страниц и тип сайта (например, '5 лендинг').");
});

// Обработчик ввода пользователя
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    // Пример простого парсинга ввода
    const match = text.match(/^(\d+)\s+(лендинг|корпоративный|интернет-магазин)$/i);

    if (match) {
        const pages = parseInt(match[1]);
        const type = match[2].toLowerCase();

        // Расчет стоимости
        const cost = calculateCost(pages, type);
        bot.sendMessage(chatId, `Стоимость сайта: ${cost} рублей.`);
    } else {
        bot.sendMessage(chatId, "Пожалуйста, введите корректные данные (например, '5 лендинг').");
    }
});

// Функция расчета стоимости
function calculateCost(pages, type) {
    let baseCost = 0;

    switch (type) {
        case 'лендинг':
            baseCost = 5000;
            break;
        case 'корпоративный':
            baseCost = 10000;
            break;
        case 'интернет-магазин':
            baseCost = 20000;
            break;
        default:
            baseCost = 0;
    }

    return baseCost * pages;
}

// Запуск сервера (опционально)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});