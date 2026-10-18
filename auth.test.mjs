import { test } from 'node:test';
import assert from 'node:assert/strict';
import { equalPasswords, newSession, checkSession, cookieFor, getCookie, validOrigin } from '../lib/auth.js';
test('Passwortvergleich',()=>{
  assert.equal(equalPasswords('ein Geheimnis','ein Geheimnis'),true);
  assert.equal(equalPasswords('ein Geheimnis','falsch'),false);
});
test('Sitzungstoken signieren und prüfen',()=>{
  const key='eine sehr lange sichere geheimnisphrase mit 40 zeichen';
  const token=newSession(key);
  assert.equal(checkSession(token,key),true);
  assert.equal(checkSession(token+'X',key),false);
  assert.equal(checkSession(token,'anderes geheimnis'),false);
  assert.equal(getCookie('abc=x; jarvis_session='+token+'; sonst=1'),token);
  assert.match(cookieFor(token),/HttpOnly; Secure; SameSite=Strict/);
});
test('Schreibanfragen nicht von fremder Website akzeptieren',()=>{
  const origin = new Request('https://my.amplifyapp.com/api/items', {method:'POST',headers:{Origin:'https://fremd.example'}});
  assert.equal(validOrigin(origin),false);
  const own=new Request('https://my.amplifyapp.com/api/items', {method:'POST',headers:{Origin:'https://my.amplifyapp.com'}});
  assert.equal(validOrigin(own),true);
});
