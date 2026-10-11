const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// ── GROCERY LIST (unchanged) ─────────────────────────────────
let cart = {};
app.get('/load', (req, res) => res.json(cart));
app.post('/save', (req, res) => { cart = req.body; res.json({ ok: true }); });

// ── LISTLY WEBHOOK RELAY ─────────────────────────────────────
const RELAY_URL = 'https://rockinmoroccanfood.com/listly/webhook.php';
const RELAY_KEY = 'rm-listly-2305';
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';

async function relay(params) {
  const url = RELAY_URL + '?' + new URLSearchParams({ key: RELAY_KEY, ...params });
  const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': 'text/html' } });
  return r.status;
}

app.post('/clover', async (req, res) => {
  const p = req.body || {};

  if (p.verificationCode) {
    console.log('CLOVER VERIFICATION CODE:', p.verificationCode);
    await relay({ verify: p.verificationCode }).catch(() => {});
    return res.json({ verificationCode: p.verificationCode });
  }

  res.json({ ok: true });

  if (!p.merchants) return;
  for (const [merchantId, events] of Object.entries(p.merchants)) {
    for (const ev of events) {
      if (!ev.objectId || !ev.objectId.startsWith('O:')) continue;
      const orderId = ev.objectId.slice(2);
      try {
        const s = await relay({ m: merchantId, o: orderId });
        console.log('relayed order', orderId, 'status', s);
      } catch (e) {
        console.log('relay failed', orderId, e.message);
      }
    }
  }
});

app.get('/', (req, res) => res.send('Listly relay running'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running on port ' + PORT));
