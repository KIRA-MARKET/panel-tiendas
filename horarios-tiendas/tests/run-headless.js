// Runner headless para CI: lanza tests.html en Puppeteer, espera al
// resumen final y sale con código 0 si todos pasan, 1 si alguno falla.
//
// Uso local: node horarios-tiendas/tests/run-headless.js
// Uso CI:   ver .github/workflows/tests.yml

const path = require('path');
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  // Volcar consola del navegador a stdout para diagnóstico.
  page.on('console', msg => {
    const t = msg.type();
    if (t === 'error' || t === 'warning') {
      console.log('[browser ' + t + ']', msg.text());
    }
  });
  page.on('pageerror', err => {
    console.error('[pageerror]', err.message);
  });

  const url = 'file://' + path.resolve(__dirname, 'tests.html');
  await page.goto(url, { waitUntil: 'load' });

  // Esperar a que el resumen final esté pintado (no "Ejecutando…").
  await page.waitForFunction(() => {
    const sum = document.getElementById('summary');
    if (!sum || !sum.textContent) return false;
    const t = sum.textContent.trim();
    return t.length > 0 && !t.startsWith('Ejecutando');
  }, { timeout: 30000 });

  const result = await page.evaluate(() => {
    const sum = document.getElementById('summary');
    return {
      text: (sum.textContent || '').trim(),
      ok: sum.classList.contains('ok')
    };
  });

  console.log(result.text);

  // Si hubo fallos, volcar los detalles de los tests que fallaron.
  if (!result.ok) {
    const fallidos = await page.evaluate(() => {
      const out = [];
      document.querySelectorAll('.test.ko').forEach(el => out.push(el.textContent.trim()));
      return out;
    });
    for (const f of fallidos) console.log('  ' + f);
  }

  await browser.close();
  process.exit(result.ok ? 0 : 1);
})().catch(err => {
  console.error('Runner error:', err);
  process.exit(2);
});
