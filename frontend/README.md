# frontend
 
Aquest projecte és el frontend d'Alerta Roja, fet amb Vue 3 i Vite.
 
## Configuració recomanada de l'IDE
 
[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (i desactiva Vetur).
 
## Configuració recomanada del navegador
 
- Navegadors basats en Chromium (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Activa Custom Object Formatter a les DevTools de Chrome](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Activa Custom Object Formatter a les DevTools de Firefox](https://fxdx.dev/firefox-devtools-custom-object-formatters/)
## Personalitzar la configuració
 
Consulta la [referència de configuració de Vite](https://vite.dev/config/).
 
## Posada en marxa del projecte
 
```sh
npm install
```
 
### Compilar i recarregar en calent per a desenvolupament
 
```sh
npm run dev
```
 
## Per què Vue Router
 
Alerta Roja és una SPA (Single Page Application) amb diverses pantalles: entrada,
hangar, nau i informe. Fem servir Vue Router per organitzar-les i controlar-ne l'accés.
 
- **Una ruta per pantalla:** `/` (entrada), `/hangar`, `/nave/:roomId` i
  `/informe`. L'usuari canvia de vista sense recarregar la pàgina i els botons
  enrere i endavant del navegador funcionen amb normalitat.
- **Rutes dinàmiques:** `/nave/:roomId` dona a cada sala la seva pròpia URL, que
  es pot compartir perquè un altre jugador entri a la mateixa nau.
- **Protecció de rutes:** les rutes `/hangar`, `/nave/:roomId` i `/informe`
  duen `meta: { necesitaNombre: true }`. El guard `router.beforeEach` consulta
  l'store d'usuari (Pinia) i, si no hi ha nom, redirigeix a l'entrada. Així
  ningú arriba a la nau sense haver-se identificat.
- **Rutes desconegudes:** la ruta comodí `/:pathMatch(.*)*` redirigeix a `/`, de
  manera que una URL incorrecta mai deixa la pantalla en blanc.
- **Càrrega diferida:** `NaveView` s'importa amb `import()`, de manera que el
  codi de la nau (la part més pesada, amb Phaser) només es descarrega quan el
  jugador hi entra.
Es fa servir `createWebHistory`, que genera URLs netes sense `#`. Perquè
funcioni en recarregar la pàgina, nginx retorna `index.html` a les rutes que no
existeixen com a fitxer (`try_files` a `nginx.conf`).

