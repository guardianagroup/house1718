// Elixire · idioma: español (el de la página) e inglés (dueño, 19 nov 2026: «solamente en inglés y en español, me parece perfecto»).
// Cada texto lleva data-t; el español sale del propio HTML y el inglés de aquí. La elección se recuerda en este navegador.
'use strict';
(() => {
  const EN = {
    tuCodigo: 'YOUR CODE',
    daselo: 'Give it to the other person through a different channel. It expires in 10 minutes and works only once.',
    esperando: 'Waiting for the other person',
    copiar: 'Copy the code', copiado: 'Copied',
    cancelar: 'Cancel', volver: 'Back', entrar: 'Enter',
    tengoTitulo: 'I HAVE A CODE',
    tengoTexto: 'The 16 characters you were given. Once inside, you will both see the same four words.',
    faltan: 'Characters missing: the code has 16.',
    lema: 'An armoured vault for your conversations.',
    crear: 'Create a code', tengo: 'I have a code',
    nota: 'No account · No phone number',
    botonInfo: 'Elixire', botonAcceso: 'Access',
    verificar: 'Verify this page',
    cerrar: 'Close',
    tabPorque: 'Why it exists', tabEscucha: 'How you are overheard', tabComparacion: 'Compared', tabProtege: 'What it protects',
    porqueIntro: 'Money is rarely stolen today by breaking encryption. It is stolen by pretending to be someone else: an executive, a supplier, the bank itself. Convinced, the victim authorises the payment.',
    d1c: '2.77 billion dollars', d1t: 'Fake executives and changed bank details', d1p: 'An email that looks like it comes from the boss or a supplier asks for payment to a different account. In the US alone, 2024, across 21,442 complaints.', d1f: 'FBI · IC3 REPORT 2024',
    d2c: '25.6 million dollars', d2t: 'A cloned executive on a video call', d2p: 'In Hong Kong, an Arup employee made 15 transfers after a meeting in which everyone else was fake, created with artificial intelligence.', d2f: 'ARUP · HONG KONG POLICE · 2024',
    d3c: '450.7 million pounds', d3t: 'Payments authorised under deception', d3p: 'Victims send the money themselves, convinced by someone posing as their bank, the police or an adviser. United Kingdom, 2024.', d3f: 'UK FINANCE · 2025',
    d4c: '2.95 billion dollars', d4t: 'Impersonation', d4p: 'Someone poses as an agency, a company or a relative, and asks for money. United States, 2024.', d4f: 'FTC · 2025',
    d5c: '16.6 billion dollars', d5t: 'A record', d5p: 'Internet crime losses reported in the US in 2024: 33% more than the year before.',
    porEsoTitulo: 'THAT IS WHY ELIXIRE EXISTS',
    porEso1: 'Who is on the other side is not decided by a voice, a face or an email: it is checked with a key.',
    porEso2: 'What you write and send is encrypted on your device, and only the other device can open it.',
    porEso3: 'If someone steps in the middle or changes keys, the session is cut and you are warned.',
    porEso4: 'No tool can stop someone paying outside the agreed channel. The rule is simple: no important payment without confirming it in Elixire.',
    escuchaIntro: 'A call from Vodafone to Orange is only encrypted between each phone and its mast. Inside each carrier, and between them, it can be listened to.',
    tuTelefono: 'Your phone', antena: 'Mast', redOperadoras: 'Network between carriers', suTelefono: 'Their phone',
    r1: '<b>1 · Fake mast.</b> It poses as your carrier’s and can force 2G, which is far weaker.',
    r2: '<b>2 · Inside the carrier.</b> Lawful-interception systems can be attacked. In 2024 it emerged that they had been.',
    r3: '<b>3 · Between carriers.</b> SS7 and Diameter can divert calls and texts without properly checking who is asking.',
    r4: '<b>4 · On the phone.</b> Spyware such as Pegasus sees everything before it is encrypted.',
    enElixire: 'IN ELIXIRE', tuEquipo: 'Your device', rele: 'Relay · sees only bytes', suEquipo: 'Their device',
    enElixireTexto: 'What you write is encrypted on your device and only the other device holds the key to open it. If your device is infected, whoever controls it sees your screen: no tool can fix that.',
    f1: 'Always end-to-end encrypted', si: 'Yes', no: 'No', soloSecretos: 'Only in secret chats',
    f2: 'Asks for your phone number', f3: 'Where the conversation stays', f3wa: 'On the phone and in backups', f3tg: 'On their servers', f3sg: 'On the phone', f3el: 'Nowhere once closed',
    f4: 'Checking nobody is in the middle', opcional: 'Optional', f4el: 'Mandatory: four words',
    pieTabla: 'Public information from each service, November 2026.',
    p1t: 'Hybrid post-quantum encryption', p1p: 'ML-KEM-1024 with ECDH P-384, and ML-DSA-87 with ECDSA P-384 signatures. Reading a conversation would mean breaking classical and post-quantum cryptography at once.',
    p2t: 'Nobody in the middle unnoticed', p2p: 'On entering, both people see the same four words, committed before the exchange. If someone steps in, they do not match.',
    p3t: 'Keys that keep changing', p3p: 'A different key for every message and new keys every five minutes: what came before cannot be read with the new ones.',
    p4t: 'Constant traffic', p4p: 'While the conversation is open, frames of the same size leave at a fixed rhythm: from outside, nobody can tell when you write.',
    p5t: 'Nothing stored', p5p: 'No account, no phone number. The conversation lives only in the memory of the two tabs: close them and it is gone.',
    p6t: 'Coming soon', p6p: 'Video calls with identity checked by key and a random liveness test. Signed delivery records. Transfers of up to 1 TB.',
    limite: 'What no tool can promise, neither can we: if a device is infected, whoever controls it sees what you see. Elixire warns you of everything it can detect and never promises the impossible.',
    accesoTitulo: 'Private access',
    accesoTexto: 'Elixire is not sold in a shop. It is offered privately to individuals, law firms, clinics and companies that need the highest level of protection for what they say and send.',
    pruebasTitulo: 'TRIAL PERIOD', pruebasTexto: 'During the trial, access is open: create a code and share it.',
  };
  const TITULO = { es: 'Elixire · Una cámara acorazada para tus conversaciones', en: 'Elixire · An armoured vault for your conversations' };
  const ES = {}; // lo original de la página, para volver al español
  let actual = 'es';
  for (const el of document.querySelectorAll('[data-t]')) { const k = el.dataset.t; if (!(k in ES)) ES[k] = el.innerHTML; }
  ES.copiado = 'Copiado'; ES.faltan = 'Faltan símbolos: el código tiene 16.';
  const t = (k) => (actual === 'en' ? EN[k] : ES[k]) || ES[k] || EN[k] || k;
  function pon(idioma) {
    actual = idioma === 'en' ? 'en' : 'es';
    document.documentElement.lang = actual; document.title = TITULO[actual];
    for (const el of document.querySelectorAll('[data-t]')) { const v = t(el.dataset.t); if (el.innerHTML !== v) el.innerHTML = v; }
    for (const b of document.querySelectorAll('[data-idioma]')) b.setAttribute('aria-pressed', String(b.dataset.idioma === actual));
    try { localStorage.setItem('elixire-idioma', actual); } catch (_) {}
    document.dispatchEvent(new CustomEvent('elixire-idioma', { detail: { idioma: actual } }));
  }
  let guardado = null; try { guardado = localStorage.getItem('elixire-idioma'); } catch (_) {}
  const inicial = guardado || ((navigator.language || 'es').toLowerCase().startsWith('es') ? 'es' : 'en');
  for (const b of document.querySelectorAll('[data-idioma]')) b.addEventListener('click', () => pon(b.dataset.idioma));
  window.ElixireIdioma = { t, pon, actual: () => actual };
  if (inicial !== 'es') pon(inicial);
})();
