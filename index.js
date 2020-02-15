require('dotenv').config();
//Telegram
const TelegramBot = require('node-telegram-bot-api');
//OpenGraph
const ogs = require('open-graph-scraper');
//Firebase
const firebase = require('firebase');
// Hue
const v3 = require('node-hue-api').v3;
const LightState = v3.lightStates.LightState;

const USERNAME = process.env.HUE_API_KEY;
const LIGHT_ID = [1, 2, 3, 4, 5, 6];
const token = process.env.TELEGRAM_TOKEN;
const bot = new TelegramBot(token, { polling: true });

bot.on('message', msg => {
  if (msg.text === ('bob!' || 'Bob!')) {
    bot.sendMessage(
      msg.chat.id,
      'Hey babe. I´m awake.\nWhat do you wanna do?\n\n/Bookmark to bookmark!\n/hue! to randomize Hue lights.'
    );
  } else if (msg.text === ('/hue' || '/hue!')) {
    v3.discovery
      .nupnpSearch()
      .then(searchResults => {
        // const host = searchResults[0].ipaddress;
        const host = process.env.HUE_IP;
        return v3.api.createLocal(host).connect(USERNAME);
      })
      .then(api => {
        // Hue
        LIGHT_ID.map((light, i) => {
          var hueMin = 0;
          var hueMax = 65535;
          const hueRandom =
            Math.floor(Math.random() * (+hueMax - +hueMin)) + +hueMin;
          // Brightness
          var brightnessMin = 0;
          var brightnessMax = 100;
          const brightnessRandom =
            Math.floor(Math.random() * (+brightnessMax - +brightnessMin)) +
            +brightnessMin;
          // Saturation
          var satMin = 100;
          var satMax = 254;
          const satRandom =
            Math.floor(Math.random() * (+satMax - +satMin)) + +satMin;
          // Using a LightState object to build the desired state
          const state = new LightState()
            .on()
            .brightness(brightnessRandom)
            .hue(hueRandom)
            .sat(satRandom);
          console.log('saturation: ', satRandom);
          console.log('brightness: ', brightnessRandom);
          console.log('hue :', hueRandom);
          api.lights.setLightState(light, state);
        });
        bot.sendMessage(msg.chat.id, 'Your hue lights has been randomized!');
      })
      .catch(err => {
        console.log(err);
      });
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
