require('dotenv').config();

const { Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);


const line = require('@line/bot-sdk');
const express = require('express');

// create LINE SDK config from env variables
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

// create LINE SDK client
const client = new line.Client(config);

// create Express app
// about Express itself: https://expressjs.com/
const app = express();

// register a webhook handler with middleware
// about the middleware, please refer to doc
app.post('/callback', line.middleware(config), (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

// event handler
async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    // ignore non-text-message event
    return Promise.resolve(null);
  }
  var echo;
  try {
    var maxTokens = 300;
    var receiveMsg = event.message.text || '';
    var matchedTokenPattern = receiveMsg.match(/^#(\d+)字\n/);
    if (matchedTokenPattern != null) {
      maxTokens = matchedTokenPattern[1] * 1;
      receiveMsg = receiveMsg.replace(/^#(\d+)字\n/,'').trim();
    }
    const completion = await openai.createCompletion({
      model: "text-davinci-003",
      prompt: event.message.text,
      max_tokens: maxTokens,
    });
    // create a echoing text message
    echo = { type: 'text', text: completion.data.choices[0].text.trim() };
  } catch (e) {
    echo = { type: 'text', text: '你問得太難，唔識答( ´•̥̥̥ω•̥̥̥` )' };
  }

  // use reply API
  return client.replyMessage(event.replyToken, echo);
}

// listen on port
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`listening on ${port}`);
});