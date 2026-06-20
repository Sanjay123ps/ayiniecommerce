// routes/search.js - Search with Filters & Sorting Implementation

const express = require('express');
const router = express.Router();
const { get, all } = require('../db');

// Advanced product search with filters and sorting
router.get('/search', (req, res) => {
    try {
        const {
            q = '',           // Search query
            category = '',    // Filter by category
            priceMin = 0,    // Minimum price
            priceMax = 10000, // Maximum price
            sortBy = 'relevance', // Sort option
            page = 1,         // Pagination
            limit = 12        // Items per page
        } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);
        const sanitizedQuery = q.trim().toLowerCase();

        // Build WHERE clause dynamically
        const whereClauses = ['p.active = 1']; // Only show active items
        const params = [];

        // Search in product name and description
        if (sanitizedQuery.length > 0) {
            whereClauses.push('(LOWER(p.name) LIKE ? OR LOWER(p.description) LIKE ?)');
            const searchTerm = `%${sanitizedQuery}%`;
            params.push(searchTerm, searchTerm);
        }

        // Filter by category
        if (category && category.length > 0) {
            whereClauses.push('p.category = ?');
            params.push(category);
        }

        // Filter by price range
        if (priceMin && priceMin > 0) {
            whereClauses.push('p.price >= ?');
            params.push(parseFloat(priceMin));
        }

        if (priceMax && priceMax < 10000) {
            whereClauses.push('p.price <= ?');
            params.push(parseFloat(priceMax));
        }

        const whereClause = whereClauses.join(' AND ');

        // Build ORDER BY clause
        const sortMap = {
            relevance: 'CASE WHEN LOWER(p.name) LIKE ? THEN 0 ELSE 1 END, p.rating DESC',
            price_asc: 'p.price ASC',
            price_desc: 'p.price DESC',
            rating: 'p.rating DESC',
            newest: 'p.created_at DESC',
            bestselling: 'p.sales_count DESC'
        };

        let orderBy = sortMap[sortBy] || sortMap.relevance;
        
        // Add search term to params for relevance sorting
        if (sortBy === 'relevance' && sanitizedQuery.length > 0) {
            params.push(`${sanitizedQuery}%`);
        }

        // Get total count for pagination
        const countQuery = `
            SELECT COUNT(*) as total FROM products p
            WHERE ${whereClause}
        `;
        const countParams = sanitizedQuery.length > 0 && sortBy === 'relevance' 
            ? params.slice(0, -1) // Remove last param (relevance search term)
            : params;

        const countResult = get(countQuery, countParams);
        const total = countResult ? countResult.total : 0;
        const totalPages = Math.ceil(total / parseInt(limit));

        // Get products - removed image column which doesn't exist
        const searchQuery = `
            SELECT 
                p.id,
                p.name,
                p.price,
                p.category,
                p.unit,
                p.emoji,
                p.rating,
                p.review_count,
                p.active,
                p.badge,
                CASE 
                    WHEN p.rating >= 4.5 THEN 'bestseller'
                    WHEN p.price < 50 THEN 'affordable'
                    ELSE NULL
                END as badge_override
            FROM products p
            WHERE ${whereClause}
            ORDER BY ${orderBy}
            LIMIT ? OFFSET ?
        `;

        const finalParams = [
            ...params,
            parseInt(limit),
            offset
        ];

        const products = all(searchQuery, finalParams);

        // Get available filters (facets) for this search
        const facets = getSearchFacets(category, priceMin, priceMax);

        res.json({
            success: true,
            data: {
                products: (products || []).map(p => ({
                    id: p.id,
                    name: p.name,
                    price: p.price,
                    category: p.category,
                    unit: p.unit,
                    emoji: p.emoji,
                    rating: parseFloat((p.rating || 0).toFixed(1)),
                    reviews: p.review_count || 0,
                    badge: p.badge || p.badge_override
                })),
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: total,
                    totalPages: totalPages,
                    hasNext: parseInt(page) < totalPages,
                    hasPrev: parseInt(page) > 1
                },
                facets: facets,
                searchQuery: {
                    q: q,
                    category: category,
                    priceRange: {
                        min: parseFloat(priceMin),
                        max: parseFloat(priceMax)
                    }
                }
            }
        });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Search failed. Please try again.' 
        });
    }
});

// Get search facets (available filters)
router.get('/search/facets', (req, res) => {
    try {
        const { category = '', priceMin = 0, priceMax = 10000 } = req.query;

        // Build WHERE clause based on current filters
        const whereClauses = ['p.active = 1'];
        const params = [];

        if (category && category.length > 0) {
            whereClauses.push('p.category = ?');
            params.push(category);
        }

        if (priceMin && priceMin > 0) {
            whereClauses.push('p.price >= ?');
            params.push(parseFloat(priceMin));
        }

        if (priceMax && priceMax < 10000) {
            whereClauses.push('p.price <= ?');
            params.push(parseFloat(priceMax));
        }

        const whereClause = whereClauses.join(' AND ');

        // Get categories with product count
        const categories = all(`
            SELECT 
                category,
                COUNT(*) as count,
                MIN(price) as minPrice,
                MAX(price) as maxPrice
            FROM products
            WHERE ${whereClause}
            GROUP BY category
            ORDER BY count DESC
        `, params);

        // Get price ranges
        const priceRanges = [
            { label: 'Under ₹250', min: 0, max: 250, count: 0 },
            { label: '₹250 - ₹500', min: 250, max: 500, count: 0 },
            { label: '₹500 - ₹1000', min: 500, max: 1000, count: 0 },
            { label: '₹1000 - ₹2000', min: 1000, max: 2000, count: 0 },
            { label: 'Above ₹2000', min: 2000, max: 10000, count: 0 }
        ];

        for (const range of priceRanges) {
            const countQuery = `
                SELECT COUNT(*) as count FROM products
                WHERE price >= ? AND price < ? AND ${whereClause}
            `;
            const result = get(countQuery, [range.min, range.max, ...params]);
            range.count = result ? result.count : 0;
        }

        // Get ratings
        const ratings = [
            { label: '⭐⭐⭐⭐⭐ (4.5+)', min: 4.5, count: 0 },
            { label: '⭐⭐⭐⭐ (4.0+)', min: 4, count: 0 },
            { label: '⭐⭐⭐ (3.0+)', min: 3, count: 0 },
            { label: '⭐⭐ (2.0+)', min: 2, count: 0 }
        ];

        for (const rating of ratings) {
            const countQuery = `
                SELECT COUNT(*) as count FROM products
                WHERE rating >= ? AND ${whereClause}
            `;
            const result = get(countQuery, [rating.min, ...params]);
            rating.count = result ? result.count : 0;
        }

        res.json({
            success: true,
            facets: {
                categories: (categories || []).map(c => ({
                    name: c.category,
                    count: c.count,
                    priceRange: { min: c.minPrice, max: c.maxPrice }
                })),
                priceRanges: priceRanges.filter(p => p.count > 0),
                ratings: ratings.filter(r => r.count > 0),
                sortOptions: [
                    { value: 'relevance', label: 'Most Relevant' },
                    { value: 'price_asc', label: 'Price: Low to High' },
                    { value: 'price_desc', label: 'Price: High to Low' },
                    { value: 'rating', label: 'Highest Rated' },
                    { value: 'newest', label: 'Newest Arrivals' },
                    { value: 'bestselling', label: 'Best Sellers' }
                ]
            }
        });
    } catch (error) {
        console.error('Facets error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to load filters' 
        });
    }
});

// Auto-complete suggestions
router.get('/search/suggestions', (req, res) => {
    try {
        const { q = '' } = req.query;

        if (q.length < 2) {
            return res.json({ suggestions: [] });
        }

        const searchTerm = `${q}%`;

        // Get product name suggestions
        const productSuggestions = all(`
            SELECT DISTINCT name as suggestion
            FROM products
            WHERE LOWER(name) LIKE LOWER(?)
            AND active = 1
            ORDER BY review_count DESC
            LIMIT 5
        `, [searchTerm]);

        // Get category suggestions
        const categorySuggestions = all(`
            SELECT DISTINCT category as suggestion
            FROM products
            WHERE LOWER(category) LIKE LOWER(?)
            AND active = 1
            LIMIT 3
        `, [searchTerm]);

        res.json({
            suggestions: [
                ...(productSuggestions || []).map(p => ({
                    text: p.suggestion,
                    type: 'product'
                })),
                ...(categorySuggestions || []).map(c => ({
                    text: c.suggestion,
                    type: 'category'
                }))
            ]
        });
    } catch (error) {
        console.error('Suggestions error:', error);
        res.status(500).json({ suggestions: [] });
    }
});

// Helper function to get search facets
function getSearchFacets(category, priceMin, priceMax) {
    const whereClauses = ['active = 1'];
    const params = [];

    if (category && category.length > 0) {
        whereClauses.push('category = ?');
        params.push(category);
    }

    const whereClause = whereClauses.join(' AND ');

    // Get all categories with counts
    const categories = all(`
        SELECT category, COUNT(*) as count
        FROM products
        WHERE ${whereClause}
        GROUP BY category
        ORDER BY count DESC
    `, params);

    return {
        categories: categories || [],
        priceRanges: [
            { label: 'Under ₹250', min: 0, max: 250 },
            { label: '₹250 - ₹500', min: 250, max: 500 },
            { label: '₹500 - ₹1000', min: 500, max: 1000 },
            { label: '₹1000 - ₹2000', min: 1000, max: 2000 },
            { label: 'Above ₹2000', min: 2000, max: 10000 }
        ]
    };
}

module.exports = router;
