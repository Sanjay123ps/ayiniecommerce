const API_BASE = 'http://localhost:5000/api';

const Auth = {
  getToken  : () => localStorage.getItem('ayini_token'),
  getUser   : () => JSON.parse(localStorage.getItem('ayini_user') || 'null'),
  isLoggedIn: () => !!localStorage.getItem('ayini_token'),
  setSession(token, user) {
    localStorage.setItem('ayini_token', token);
    localStorage.setItem('ayini_user', JSON.stringify(user));
  },
  logout() {
    localStorage.removeItem('ayini_token');
    localStorage.removeItem('ayini_user');
    window.location.href = 'login.html';
  }
};

async function apiFetch(endpoint, options = {}) {
  const token = Auth.getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res  = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw { status: res.status, message: data.error || 'Request failed' };
  return data;
}

const AuthAPI = {
  login   : (email, password)              => apiFetch('/auth/login',          { method:'POST', body:JSON.stringify({email,password}) }),
  register: (name, email, password, phone) => apiFetch('/auth/register',       { method:'POST', body:JSON.stringify({name,email,password,phone}) }),
  me      : ()                             => apiFetch('/auth/me'),
  forgot  : (email)                        => apiFetch('/auth/forgot-password', { method:'POST', body:JSON.stringify({email}) }),
};

const CartAPI = {
  get   : ()                     => apiFetch('/cart'),
  add   : (product_id, quantity) => apiFetch('/cart',               { method:'POST',   body:JSON.stringify({product_id,quantity}) }),
  update: (product_id, quantity) => apiFetch(`/cart/${product_id}`, { method:'PUT',    body:JSON.stringify({quantity}) }),
  remove: (product_id)           => apiFetch(`/cart/${product_id}`, { method:'DELETE' }),
  clear : ()                     => apiFetch('/cart',               { method:'DELETE' }),
  coupon: (code)                 => apiFetch('/cart/coupon',        { method:'POST',   body:JSON.stringify({code}) }),
};

const OrdersAPI = {
  place : (address_id, payment_method, extra) => apiFetch('/orders',      { method:'POST', body:JSON.stringify({address_id,payment_method,...extra}) }),
  mine  : ()                                  => apiFetch('/orders/my'),
  get   : (id)                                => apiFetch(`/orders/${id}`),
};

const AddressAPI = {
  getAll: ()     => apiFetch('/addresses'),
  add   : (data) => apiFetch('/addresses', { method:'POST', body:JSON.stringify(data) }),
};

const ContactAPI = {
  send: (name, email, phone, subject, message) => apiFetch('/contact', { method:'POST', body:JSON.stringify({name,email,phone,subject,message}) }),
};

const WishlistAPI = {
  get   : ()           => apiFetch('/wishlist'),
  add   : (product_id) => apiFetch('/wishlist',              { method:'POST',   body:JSON.stringify({product_id}) }),
  remove: (product_id) => apiFetch(`/wishlist/${product_id}`,{ method:'DELETE' }),
};

function showToast(message, isError = false) {
  let toast = document.getElementById('ayiniToast') || document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'ayiniToast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.className = 'toast' + (isError ? ' error' : '');
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3500);
}

async function updateCartBadge() {
  const badge = document.getElementById('cartBadge');
  if (!badge || !Auth.isLoggedIn()) { if(badge) badge.textContent = '0'; return; }
  try {
    const cart = await CartAPI.get();
    badge.textContent = cart.item_count || 0;
  } catch { badge.textContent = '0'; }
}

document.addEventListener('DOMContentLoaded', () => {
  const loginLink = document.getElementById('loginLink');
  if (loginLink && Auth.isLoggedIn()) {
    const user = Auth.getUser();
    loginLink.textContent = `Hi, ${user?.name?.split(' ')[0] || 'You'}`;
    loginLink.href = '#';
    loginLink.onclick = (e) => { e.preventDefault(); if (confirm('Logout?')) Auth.logout(); };
  }
  updateCartBadge();
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
  }, { threshold: 0.1 });
  document.querySelectorAll('.fade-up').forEach(el => obs.observe(el));
});