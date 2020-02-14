require('dotenv').config();

const TelegramBot = require('node-telegram-bot-api');
const ogs = require('open-graph-scraper');
const firebase = require('firebase');

const token = process.env.TELEGRAM_TOKEN;
const bot = new TelegramBot(token, { polling: true });

bot.on('message', msg => {
  if (msg.text === ('bob!' || 'Bob!')) {
    bot.sendMessage(
      msg.chat.id,
      'Hey babe. I´m awake.\nWhat do you wanna do?\n\n/Bookmark to bookmark!'
    );
  }
});

const app = firebase.initializeApp({
  apiKey: process.env.API_KEY,
  authDomain: process.env.AUTH_DOMAIN,
  databaseURL: process.env.DB_URL,
  projectId: process.env.PROJECT_ID,
  storageBucket: process.env.STORAGE_BUCKET,
  messagingSenderId: process.env.MESSAGING_SENDER_ID
});

const ref = firebase.database().ref();
const sitesRef = ref.child('sites');

let siteUrl;
bot.onText(/\/bookmark (.+)/, (msg, match) => {
  siteUrl = match[1];
  bot.sendMessage(msg.chat.id, 'Got it. In which category?', {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: 'Development',
            callback_data: 'development'
          },
          {
            text: 'Music',
            callback_data: 'music'
          },
          {
            text: 'Cute monkeys',
            callback_data: 'cute-monkeys'
          }
        ]
      ]
    }
  });
});

bot.on('callback_query', callbackQuery => {
  const message = callbackQuery.message;
  ogs({ url: siteUrl }, function(error, results) {
    if (results.success) {
      const res = JSON.parse(JSON.stringify(results.data));
      sitesRef.push().set({
        name: res.ogSiteName || '',
        title: res.ogTitle || '',
        description: res.ogDescription || '',
        url: siteUrl || '',
        thumbnail: res.ogImage.url || '',
        category: callbackQuery.data || '',
        saveDate: Date.now()
      });
      bot.sendMessage(
        message.chat.id,
        'Added "' +
          results.data.ogTitle +
          '" to category "' +
          callbackQuery.data +
          '"!'
      );
    } else {
      bot.sendMessage(
        message.chat.id,
        'Added new website, but there was no OG data!'
      );
      return sitesRef.push().set({
        url: siteUrl
      });
    }
  });
});
