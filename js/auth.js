import{post,get}from'./api.js';
export function user(){try{return JSON.parse(sessionStorage.getItem('deskUser')||'null')}catch{return null}}
export async function loginEmail(email,password){const d=await post('/api/auth/login',{email,password});sessionStorage.setItem('deskToken',d.token);sessionStorage.setItem('deskUser',JSON.stringify(d.user));return d.user}
export async function loginAdmin(key){const d=await post('/api/auth/admin-key',{key});sessionStorage.setItem('deskToken',d.token);sessionStorage.setItem('deskUser',JSON.stringify(d.user));return d.user}
export function logout(){sessionStorage.clear();location.href='login.html'}
export async function requireRole(roles=[]){const u=user();if(!u){location.href='login.html';return null}try{await get('/api/auth/me')}catch{return null}if(roles.length&&!roles.includes(u.role)){location.href=u.role==='customer'?'portal.html':'index.html';return null}return u}