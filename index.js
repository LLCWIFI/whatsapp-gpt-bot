require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const APP_SCRIPT_URL = process.env.APP_SCRIPT_URL;

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: { args: ['--no-sandbox', '--disable-setuid-sandbox'] }
});

client.on('qr', qr => {
  qrcode.generate(qr, { small: true });
  console.log('Escanea el QR con tu WhatsApp');
});

client.on('ready', () => {
  console.log('✅ Bot conectado a WhatsApp');
});

client.on('message', async msg => {
  if (msg.fromMe) return;

  const telefono = msg.from;
  const texto = msg.body;

  try {
    const respuesta = await consultarChatGPT(texto);
    await guardarEnSheets(telefono, texto, respuesta);
    await msg.reply(respuesta);
  } catch (error) {
    console.error('Error:', error);
    await msg.reply('Hubo un error, intenta de nuevo.');
  }
});

async function consultarChatGPT(mensaje) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: mensaje }],
    max_tokens: 500
  });
  return response.choices[0].message.content;
}

async function guardarEnSheets(telefono, entrada, salida) {
  await fetch(APP_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ telefono, entrada, salida, fecha: new Date().toISOString() })
  });
}

client.initialize();
