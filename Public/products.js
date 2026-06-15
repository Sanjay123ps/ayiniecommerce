const PRODUCTS = {
  masala: [
    { id:1,  name:'Mutton Masala / Kuruma Masala', price:135, unit:'250g',  rating:5, category:'Masala',      emoji:'🌶️', badge:'Best Seller' },
    { id:2,  name:'Paruppu Podi',                  price:60,  unit:'100g',  rating:5, category:'Powder',      emoji:'🫙' },
    { id:3,  name:'Chilli Powder',                 price:50,  unit:'100g',  rating:5, category:'Masala',      emoji:'🌶️', badge:'Popular' },
    { id:4,  name:'Malli Powder (Coriander)',       price:40,  unit:'100g',  rating:5, category:'Powder',      emoji:'🌿' },
    { id:5,  name:'Idli Podi',                     price:140, unit:'250g',  rating:5, category:'Powder',      emoji:'🫙', badge:'Best Seller' },
    { id:6,  name:'Idli Podi',                     price:60,  unit:'100g',  rating:5, category:'Powder',      emoji:'🫙' },
    { id:7,  name:'Sambar Podi',                   price:135, unit:'250g',  rating:5, category:'Powder',      emoji:'🥘' },
    { id:8,  name:'Karuveppilai Podi',             price:60,  unit:'100g',  rating:5, category:'Powder',      emoji:'🌿' },
    { id:9,  name:'Chicken Masala',                price:70,  unit:'100g',  rating:5, category:'Masala',      emoji:'🌶️' },
    { id:10, name:'Instant Rasam Podi',            price:80,  unit:'100g',  rating:5, category:'Powder',      emoji:'🥘' },
  ],
  millets: [
    { id:11, name:'Pepper (Milagu)',               price:47,  unit:'50g',   rating:5, category:'Spice',       emoji:'🫘' },
    { id:12, name:'Cardamom (Elakkai)',            price:200, unit:'50g',   rating:5, category:'Spice',       emoji:'🫘' },
    { id:13, name:'Fenugreek (Vendhayam)',         price:30,  unit:'250g',  rating:5, category:'Spice',       emoji:'🌿' },
    { id:14, name:'Urad Dal (Ulundhu)',            price:75,  unit:'500g',  rating:5, category:'Legume',      emoji:'🫘' },
    { id:15, name:'Cumin Seed (Seeragam)',         price:45,  unit:'100g',  rating:5, category:'Spice',       emoji:'🫘' },
    { id:16, name:'Double Beans',                  price:40,  unit:'250g',  rating:5, category:'Legume',      emoji:'🫘' },
    { id:17, name:'Ragi',                          price:70,  unit:'1kg',   rating:5, category:'Millet',      emoji:'🌾', badge:'Iron Rich' },
    { id:18, name:'Ragi',                          price:40,  unit:'500g',  rating:5, category:'Millet',      emoji:'🌾', badge:'Iron Rich' },
    { id:19, name:'Black Gram (Ulundhu)',          price:65,  unit:'500g',  rating:5, category:'Legume',      emoji:'🫘' },
    { id:20, name:'Samai (Little Millet)',         price:60,  unit:'500g',  rating:5, category:'Millet',      emoji:'🌾' },
    { id:21, name:'Ellu (Sesame)',                 price:120, unit:'500g',  rating:5, category:'Seeds',       emoji:'🫘' },
    { id:22, name:'Pearl Millet (Naattu Kambu)',   price:50,  unit:'500g',  rating:5, category:'Millet',      emoji:'🌾' },
    { id:23, name:'Barnyard Millet (Kuthiravali)', price:60,  unit:'500g',  rating:5, category:'Millet',      emoji:'🌾', badge:'Healthy' },
    { id:24, name:'Horse Gram (Kollu)',            price:55,  unit:'500g',  rating:5, category:'Legume',      emoji:'🫘' },
    { id:25, name:'Sundal',                        price:110, unit:'1kg',   rating:5, category:'Legume',      emoji:'🫘' },
    { id:26, name:'Sundal',                        price:55,  unit:'500g',  rating:5, category:'Legume',      emoji:'🫘' },
    { id:27, name:'Greengram (Paasi Payiru)',      price:70,  unit:'500g',  rating:5, category:'Legume',      emoji:'🫘' },
    { id:28, name:'Soya Chunks (Big)',             price:30,  unit:'250g',  rating:5, category:'Legume',      emoji:'🫘' },
    { id:29, name:'Soya Chunks (Small)',           price:30,  unit:'250g',  rating:5, category:'Legume',      emoji:'🫘' },
    { id:30, name:'Solam (Sorghum)',               price:30,  unit:'500g',  rating:5, category:'Grain',       emoji:'🌽' },
  ],
  oil: [
    { id:31, name:'Coconut Oil',                   price:450, unit:'1lt',   rating:5, category:'Oil',         emoji:'🥥', badge:'Cold Press' },
    { id:32, name:'Coconut Oil',                   price:230, unit:'500ml', rating:5, category:'Oil',         emoji:'🥥', badge:'Cold Press' },
    { id:33, name:'Castor Oil (Vilakku Ennai)',    price:75,  unit:'250ml', rating:5, category:'Oil',         emoji:'🌾' },
    { id:34, name:'Castor Oil (Vilakku Ennai)',    price:150, unit:'500ml', rating:5, category:'Oil',         emoji:'🌾' },
    { id:35, name:'Groundnut Oil',                 price:140, unit:'500ml', rating:5, category:'Oil',         emoji:'🥜', badge:'Traditional' },
    { id:36, name:'Groundnut Oil',                 price:275, unit:'1lt',   rating:5, category:'Oil',         emoji:'🥜', badge:'Traditional' },
    { id:37, name:'Gingelly Oil (Nallennai)',      price:250, unit:'500ml', rating:5, category:'Oil',         emoji:'🌾' },
  ],
  flour: [
    { id:38, name:'Kavuni Barley Kanji Mix',       price:125, unit:'250g',  rating:5, category:'Flour',       emoji:'🌾', description:'Nutritious kanji mix made from kavuni rice and barley.' },
    { id:39, name:'Wheat Kurunai (Kottai Kambu)',  price:35,  unit:'500g',  rating:5, category:'Flour',       emoji:'🌾', description:'Traditional pearl millet broken wheat for porridge.' },
    { id:40, name:'Karuppu Kavuni Kurunai',        price:140, unit:'500g',  rating:5, category:'Flour',       emoji:'🌾', description:'Stone-ground black kavuni rice flour, rich in antioxidants.' },
    { id:41, name:'Millet Dosa Mix',               price:100, unit:'500g',  rating:5, category:'Flour',       emoji:'🌾', description:'Ready-to-use millet dosa batter mix for crispy healthy dosas.' },
    { id:42, name:'Multigrain Health Mix',         price:150, unit:'250g',  rating:5, category:'Flour',       emoji:'🌾', description:'Power-packed blend of multiple grains and millets.' },
    { id:43, name:'Kambu Kurunai',                 price:40,  unit:'500g',  rating:5, category:'Flour',       emoji:'🌾', description:'Pure pearl millet flour for koozh, porridge and traditional recipes.' },
    { id:44, name:'Wheat Flour (Gothumai)',        price:60,  unit:'1kg',   rating:5, category:'Flour',       emoji:'🌾', description:'Fresh stone-ground whole wheat flour for chapati and roti.' },
  ],
  noodles: [
    { id:45, name:'Millet Noodles (Varagu)',            price:60,  unit:'200g',  rating:5, category:'Noodles', emoji:'🍜', description:'Healthy kodo millet noodles — nutritious alternative to maida.' },
    { id:46, name:'Semiya (Ragi / Tomato / Kambu)',     price:25,  unit:'225g',  rating:5, category:'Semiya',  emoji:'🍜', description:'Traditional semiya in ragi, tomato and kambu flavours.' },
    { id:47, name:'Wheat Noodles (Gothumai)',           price:160, unit:'Big',   rating:5, category:'Noodles', emoji:'🍜', description:'Whole wheat noodles in a large pack for family meals.' },
    { id:48, name:'Millet Noodles (Kuthiravali)',       price:60,  unit:'200g',  rating:5, category:'Noodles', emoji:'🍜', description:'Barnyard millet noodles, light on digestion.' },
    { id:49, name:'Millet Noodles (Multigrain)',        price:60,  unit:'200g',  rating:5, category:'Noodles', emoji:'🍜', description:'Blend of multiple millets for a wholesome everyday meal.' },
    { id:50, name:'Millet Noodles (Thinai)',            price:60,  unit:'200g',  rating:5, category:'Noodles', emoji:'🍜', description:'Foxtail millet noodles — traditional grain, modern convenience.' },
    { id:51, name:'Millet Noodles (Sikappuvaragu)',     price:60,  unit:'200g',  rating:5, category:'Noodles', emoji:'🍜', description:'Red kodo millet noodles, rare and nutritious.' },
    { id:52, name:'Millet Noodles (Samai)',             price:60,  unit:'200g',  rating:5, category:'Noodles', emoji:'🍜', description:'Little millet noodles, easy to cook and rich in fibre.' },
    { id:53, name:'Millet Noodles (Kambu)',             price:60,  unit:'200g',  rating:5, category:'Noodles', emoji:'🍜', description:'Pearl millet noodles — high in iron.' },
    { id:54, name:'Millet Noodles (Ragi)',              price:60,  unit:'200g',  rating:5, category:'Noodles', emoji:'🍜', description:'Finger millet noodles packed with calcium.' },
  ],
  soap: [
    { id:55, name:'Herbal Hair Oil',               price:175, unit:'200g',  rating:5, category:'Hair Care',   emoji:'💧', badge:'Natural' },
    { id:56, name:'Nalangu Maavu Soap',            price:70,  unit:'bar',   rating:5, category:'Soap',        emoji:'🧼', badge:'Traditional' },
    { id:57, name:'Multhanimetti Soap',            price:70,  unit:'bar',   rating:5, category:'Soap',        emoji:'🧼' },
    { id:58, name:'Vettiver Soap',                 price:70,  unit:'bar',   rating:5, category:'Soap',        emoji:'🧼' },
    { id:59, name:'Kuppaimeni Soap',               price:70,  unit:'bar',   rating:5, category:'Soap',        emoji:'🧼' },
    { id:60, name:'Sandal Leaf Soap',              price:70,  unit:'bar',   rating:5, category:'Soap',        emoji:'🧼' },
    { id:61, name:'Bathing Soap',                  price:70,  unit:'bar',   rating:5, category:'Soap',        emoji:'🧼' },
    { id:62, name:'Sandal Soap',                   price:70,  unit:'bar',   rating:5, category:'Soap',        emoji:'🧼', badge:'Luxury' },
    { id:63, name:'Arisi Maavu Soap',              price:70,  unit:'bar',   rating:5, category:'Soap',        emoji:'🧼' },
  ],
};

function renderProducts(products, query) {
  const q = (query || '').toLowerCase().trim();
  const filtered = q ? products.filter(p =>
    p.name.toLowerCase().includes(q) ||
    (p.desc || p.description || '').toLowerCase().includes(q) ||
    (p.category || '').toLowerCase().includes(q)
  ) : products;

  if (!filtered.length) {
    return `<div class="empty-state" style="grid-column:1/-1">
              <div class="icon">🔍</div>
              <h3>No results for "${query}"</h3>
              <p>Try a different keyword.</p>
            </div>`;
  }

  return filtered.map(p => {
    const desc = p.desc || p.description || '';
    const badge = p.badge ? `<span class="product-badge">${p.badge}</span>` : '';
    const stars = '★'.repeat(p.rating || 5);
    return `
      <div class="product-card" id="card-${p.id}">
        ${badge}
        <div class="product-emoji">${p.emoji || '🌿'}</div>
        <h3 class="product-name" style="padding:14px 16px 0;font-size:1rem;line-height:1.3;">${p.name}</h3>
        ${desc ? `<p class="product-desc" style="padding:4px 16px 0;font-size:.78rem;">${desc}</p>` : ''}
        <p class="product-unit" style="padding:3px 16px 0;">${p.unit || ''}</p>
        <div class="product-rating" style="padding:4px 16px 2px;">${stars}</div>
        <div class="product-footer" style="padding:0 16px 16px;">
          <span class="product-price">₹${p.price}</span>
          <div class="qty-add-row">
            <div class="qty-controls card-qty">
              <button class="qty-btn" onclick="changeCardQty(${p.id}, -1)">−</button>
              <span class="qty-num" id="qty-${p.id}">1</span>
              <button class="qty-btn" onclick="changeCardQty(${p.id}, +1)">+</button>
            </div>
            <button class="btn btn-primary add-to-cart-btn"
                    id="atc-${p.id}"
                    onclick="addToCart(${p.id}, '${p.name.replace(/'/g, "\\'")}')">
              🛒 Add to Cart
            </button>
          </div>
        </div>
      </div>`;
  }).join('');
}

function changeCardQty(productId, delta) {
  const el = document.getElementById('qty-' + productId);
  if (!el) return;
  let val = parseInt(el.textContent) + delta;
  if (val < 1) val = 1;
  if (val > 99) val = 99;
  el.textContent = val;
}

async function addToCart(productId, name) {
  if (typeof Auth === 'undefined' || typeof Auth.isLoggedIn !== 'function' || !Auth.isLoggedIn()) {
    window.location.href = 'login.html';
    return;
  }
  const qtyEl = document.getElementById('qty-' + productId);
  const btn   = document.getElementById('atc-' + productId);
  const qty   = parseInt(qtyEl ? qtyEl.textContent : 1);
  btn.disabled = true;
  btn.textContent = 'Adding…';
  try {
    await CartAPI.add(productId, qty);
    btn.textContent = '✅ Added!';
    btn.style.background = '#16a34a';
    if (typeof updateCartBadge === 'function') updateCartBadge();
    if (typeof showToast === 'function') showToast(`${name} added to cart!`);
    setTimeout(() => {
      btn.textContent = '🛒 Add to Cart';
      btn.style.background = '';
      btn.disabled = false;
      if (qtyEl) qtyEl.textContent = '1';
    }, 1500);
  } catch (e) {
    btn.textContent = '❌ ' + (e.message || 'Failed');
    if (typeof showToast === 'function') showToast(e.message || 'Could not add to cart', true);
    setTimeout(() => {
      btn.textContent = '🛒 Add to Cart';
      btn.disabled = false;
    }, 1800);
  }
}
