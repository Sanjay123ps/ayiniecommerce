// db-migrations.js - Database Schema Updates for Ayini Ecommerce

const initializeTables = (db) => {
    try {
        console.log('🔧 Running database migrations...\n');

        // ============================================
        // 1. REVIEWS TABLE
        // ============================================
        db.run(`
            CREATE TABLE IF NOT EXISTS reviews (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
                title TEXT NOT NULL,
                comment TEXT NOT NULL,
                helpful_count INTEGER DEFAULT 0,
                verified_purchase BOOLEAN DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(product_id) REFERENCES products(id),
                FOREIGN KEY(user_id) REFERENCES users(id),
                UNIQUE(product_id, user_id)
            )
        `);
        console.log('✓ Created reviews table');

        // ============================================
        // 2. REVIEW HELPFUL VOTES TABLE
        // ============================================
        db.run(`
            CREATE TABLE IF NOT EXISTS review_helpful_votes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                review_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                is_helpful BOOLEAN DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(review_id) REFERENCES reviews(id),
                FOREIGN KEY(user_id) REFERENCES users(id),
                UNIQUE(review_id, user_id)
            )
        `);
        console.log('✓ Created review_helpful_votes table');

        // ============================================
        // 3. VIEWED PRODUCTS TABLE
        // ============================================
        db.run(`
            CREATE TABLE IF NOT EXISTS user_viewed_products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                product_id INTEGER NOT NULL,
                viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id),
                FOREIGN KEY(product_id) REFERENCES products(id)
            )
        `);
        console.log('✓ Created user_viewed_products table');

        // ============================================
        // 4. WISHLIST TABLE
        // ============================================
        db.run(`
            CREATE TABLE IF NOT EXISTS wishlist (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                product_id INTEGER NOT NULL,
                added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id),
                FOREIGN KEY(product_id) REFERENCES products(id),
                UNIQUE(user_id, product_id)
            )
        `);
        console.log('✓ Created wishlist table');

        // ============================================
        // 5. RELATED PRODUCTS TABLE
        // ============================================
        db.run(`
            CREATE TABLE IF NOT EXISTS product_relationships (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_id INTEGER NOT NULL,
                related_product_id INTEGER NOT NULL,
                relationship_type TEXT CHECK(relationship_type IN ('similar', 'frequently_bought')),
                weight REAL DEFAULT 1.0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(product_id) REFERENCES products(id),
                FOREIGN KEY(related_product_id) REFERENCES products(id)
            )
        `);
        console.log('✓ Created product_relationships table');

        // ============================================
        // 6. ORDER STATUS TIMELINE TABLE
        // ============================================
        db.run(`
            CREATE TABLE IF NOT EXISTS order_status_timeline (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id INTEGER NOT NULL,
                status TEXT NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                notes TEXT,
                tracking_id TEXT,
                FOREIGN KEY(order_id) REFERENCES orders(id)
            )
        `);
        console.log('✓ Created order_status_timeline table');

        // ============================================
        // 7. COUPONS TABLE
        // ============================================
        db.run(`
            CREATE TABLE IF NOT EXISTS coupons (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT UNIQUE NOT NULL,
                discount_percentage REAL,
                discount_amount REAL,
                max_uses INTEGER,
                current_uses INTEGER DEFAULT 0,
                min_order_value REAL DEFAULT 0,
                valid_from TIMESTAMP,
                valid_until TIMESTAMP,
                is_active BOOLEAN DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✓ Created coupons table');

        // ============================================
        // 8. COUPON USAGE TABLE
        // ============================================
        db.run(`
            CREATE TABLE IF NOT EXISTS coupon_usage (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                coupon_id INTEGER NOT NULL,
                user_id INTEGER,
                order_id INTEGER,
                discount_amount REAL,
                used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(coupon_id) REFERENCES coupons(id),
                FOREIGN KEY(user_id) REFERENCES users(id),
                FOREIGN KEY(order_id) REFERENCES orders(id)
            )
        `);
        console.log('✓ Created coupon_usage table');

        // ============================================
        // 9. LOYALTY POINTS TABLE
        // ============================================
        db.run(`
            CREATE TABLE IF NOT EXISTS loyalty_points (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER UNIQUE NOT NULL,
                points_balance INTEGER DEFAULT 0,
                points_earned INTEGER DEFAULT 0,
                points_redeemed INTEGER DEFAULT 0,
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
        `);
        console.log('✓ Created loyalty_points table');

        // ============================================
        // 10. LOYALTY TRANSACTIONS TABLE
        // ============================================
        db.run(`
            CREATE TABLE IF NOT EXISTS loyalty_transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                transaction_type TEXT CHECK(transaction_type IN ('earned', 'redeemed', 'expired')),
                points INTEGER NOT NULL,
                reason TEXT,
                order_id INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id),
                FOREIGN KEY(order_id) REFERENCES orders(id)
            )
        `);
        console.log('✓ Created loyalty_transactions table');

        // ============================================
        // 11. REFERRAL CODES TABLE
        // ============================================
        db.run(`
            CREATE TABLE IF NOT EXISTS referral_codes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER UNIQUE NOT NULL,
                code TEXT UNIQUE NOT NULL,
                referred_count INTEGER DEFAULT 0,
                earned_amount REAL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
        `);
        console.log('✓ Created referral_codes table');

        // ============================================
        // 12. REFERRAL TRACKING TABLE
        // ============================================
        db.run(`
            CREATE TABLE IF NOT EXISTS referral_tracking (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                referrer_id INTEGER NOT NULL,
                referred_user_id INTEGER NOT NULL,
                status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'completed')),
                reward_given BOOLEAN DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(referrer_id) REFERENCES users(id),
                FOREIGN KEY(referred_user_id) REFERENCES users(id)
            )
        `);
        console.log('✓ Created referral_tracking table');

        // ============================================
        // 13. PUSH SUBSCRIPTIONS TABLE
        // ============================================
        db.run(`
            CREATE TABLE IF NOT EXISTS push_subscriptions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                push_subscription TEXT NOT NULL,
                active BOOLEAN DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
        `);
        console.log('✓ Created push_subscriptions table');

        // ============================================
        // 14. ALTER PRODUCTS TABLE - Add new columns
        // ============================================
        try {
            db.run('ALTER TABLE products ADD COLUMN rating REAL DEFAULT 0');
        } catch (e) {
            // Column might already exist
        }

        try {
            db.run('ALTER TABLE products ADD COLUMN review_count INTEGER DEFAULT 0');
        } catch (e) {
            // Column might already exist
        }

        try {
            db.run('ALTER TABLE products ADD COLUMN sales_count INTEGER DEFAULT 0');
        } catch (e) {
            // Column might already exist
        }

        try {
            db.run('ALTER TABLE products ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
        } catch (e) {
            // Column might already exist
        }

        console.log('✓ Updated products table');

        // ============================================
        // 15. ALTER ADDRESSES TABLE - Enhance structure
        // ============================================
        try {
            db.run(`
                CREATE TABLE IF NOT EXISTS addresses_new (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    address_type TEXT DEFAULT 'home',
                    full_name TEXT NOT NULL,
                    phone TEXT NOT NULL,
                    street_address TEXT NOT NULL,
                    city TEXT NOT NULL,
                    state TEXT NOT NULL,
                    postal_code TEXT NOT NULL,
                    country TEXT DEFAULT 'India',
                    is_default BOOLEAN DEFAULT 0,
                    is_active BOOLEAN DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(user_id) REFERENCES users(id)
                )
            `);

            // Migrate data if old addresses table exists
            db.run('INSERT INTO addresses_new SELECT * FROM addresses');
            db.run('DROP TABLE addresses');
            db.run('ALTER TABLE addresses_new RENAME TO addresses');

            console.log('✓ Updated addresses table');
        } catch (e) {
            // Table might already be in new format
        }

        // ============================================
        // 16. CREATE INDEXES FOR PERFORMANCE
        // ============================================
        createIndexes(db);

        console.log('\n✅ Database migrations completed successfully!\n');
    } catch (error) {
        console.error('❌ Migration error:', error);
        throw error;
    }
};

// Create performance indexes
const createIndexes = (db) => {
    const indexes = [
        // Reviews
        'CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id)',
        'CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating)',
        'CREATE INDEX IF NOT EXISTS idx_reviews_created ON reviews(created_at DESC)',

        // Viewed products
        'CREATE INDEX IF NOT EXISTS idx_viewed_products_user ON user_viewed_products(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_viewed_products_time ON user_viewed_products(viewed_at DESC)',

        // Wishlist
        'CREATE INDEX IF NOT EXISTS idx_wishlist_user ON wishlist(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_wishlist_product ON wishlist(product_id)',

        // Products
        'CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)',
        'CREATE INDEX IF NOT EXISTS idx_products_price ON products(price)',
        'CREATE INDEX IF NOT EXISTS idx_products_rating ON products(rating DESC)',
        'CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock)',

        // Orders
        'CREATE INDEX IF NOT EXISTS idx_order_status_timeline_order ON order_status_timeline(order_id)',
        'CREATE INDEX IF NOT EXISTS idx_order_status_timeline_status ON order_status_timeline(status)',

        // Coupons
        'CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code)',
        'CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons(is_active, valid_until)',

        // Loyalty
        'CREATE INDEX IF NOT EXISTS idx_loyalty_user ON loyalty_points(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_loyalty_trans_user ON loyalty_transactions(user_id)',

        // Referral
        'CREATE INDEX IF NOT EXISTS idx_referral_code ON referral_codes(code)',
        'CREATE INDEX IF NOT EXISTS idx_referral_referrer ON referral_tracking(referrer_id)',
        'CREATE INDEX IF NOT EXISTS idx_referral_status ON referral_tracking(status)'
    ];

    indexes.forEach(indexQuery => {
        try {
            db.run(indexQuery);
        } catch (e) {
            // Index might already exist
        }
    });

    console.log('✓ Created performance indexes');
};

// Export for use in server initialization
module.exports = { initializeTables, createIndexes };

// ============================================
// USAGE IN server.js
// ============================================
/*
const initializeTables = require('./db-migrations');

// After database connection
initializeTables(db);
*/

// ============================================
// SQL UTILITY QUERIES FOR MAINTENANCE
// ============================================

/*
-- Check database size and table info
SELECT name, COUNT(*) as rows FROM sqlite_master WHERE type='table' GROUP BY name;

-- Vacuum and optimize database
VACUUM;
ANALYZE;

-- Check for indexes
SELECT name FROM sqlite_master WHERE type='index';

-- Find duplicates in reviews
SELECT product_id, user_id, COUNT(*) 
FROM reviews 
GROUP BY product_id, user_id 
HAVING COUNT(*) > 1;

-- Get rating statistics
SELECT 
    p.name,
    p.rating,
    p.review_count,
    COUNT(r.id) as actual_count,
    AVG(r.rating) as calculated_avg
FROM products p
LEFT JOIN reviews r ON p.id = r.product_id
GROUP BY p.id;

-- Cleanup old viewed products (older than 90 days)
DELETE FROM user_viewed_products 
WHERE viewed_at < datetime('now', '-90 days');

-- Recalculate product ratings
UPDATE products p
SET rating = (
    SELECT AVG(rating) FROM reviews WHERE product_id = p.id
),
review_count = (
    SELECT COUNT(*) FROM reviews WHERE product_id = p.id
);
*/
