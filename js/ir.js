// La tarjeta de la invitación (dueño, 15:07: «esta invitación debe ser del nivel máximo»): WhatsApp lee la imagen y el texto de
// esta página; al tocarla, lleva a Elixire con el fragmento (#e=…), que el navegador nunca manda a ningún servidor.
'use strict';
location.replace('/' + (/^#[A-Za-z0-9_=&.-]{1,200}$/.test(location.hash) ? location.hash : ''));
