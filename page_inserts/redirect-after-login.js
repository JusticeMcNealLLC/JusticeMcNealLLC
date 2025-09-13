// /js/page_inserts/redirect-after-login.js
import { getSb } from '/js/shared/api.js';
import { APP } from '/js/shared/config.js';

const HOME = (APP?.basePath || '/') + 'index.html';
const sb = getSb();

// If already signed in, go straight to Home
sb.auth.getSession().then(({ data }) => {
  if (data?.session) location.replace(HOME);
});

// On future sign-ins, send to Home
sb.auth.onAuthStateChange((_event, session) => {
  if (session) location.replace(HOME); // replace() avoids "Back" returning to login
});
