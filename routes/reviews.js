// routes/reviews.js - Product Reviews & Ratings Implementation

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { get, all, run } = require('../db');

// GET product reviews (paginated, sortable)
router.get('/products/:productId/reviews', (req, res) => {
    try {
        const { productId } = req.params;
        const { page = 1, sortBy = 'recent', limit = 5 } = req.query;
        const offset = (page - 1) * limit;

        // Sort options: recent, helpful, highest-rating, lowest-rating
        const sortMap = {
            recent: 'r.created_at DESC',
            helpful: 'r.helpful_count DESC',
            'highest-rating': 'r.rating DESC',
            'lowest-rating': 'r.rating ASC'
        };

        const orderBy = sortMap[sortBy] || sortMap.recent;

        // Get reviews - simplified query without user join (optional)
        const reviews = all(`
            SELECT 
                r.id,
                r.rating,
                r.title,
                r.comment,
                r.helpful_count,
                r.verified_purchase,
                r.created_at,
                r.user_id,
                r.product_id
            FROM reviews r
            WHERE r.product_id = ?
            ORDER BY ${orderBy}
            LIMIT ? OFFSET ?
        `, [productId, parseInt(limit), offset]);

        // Get total count
        const countResult = get(`
            SELECT COUNT(*) as total FROM reviews WHERE product_id = ?
        `, [productId]);

        // Get rating distribution
        const distribution = all(`
            SELECT 
                rating,
                COUNT(*) as count
            FROM reviews
            WHERE product_id = ?
            GROUP BY rating
            ORDER BY rating DESC
        `, [productId]);

        // Get product average rating
        const avgRating = get(`
            SELECT 
                AVG(rating) as average_rating,
                COUNT(*) as total_reviews
            FROM reviews
            WHERE product_id = ?
        `, [productId]);

        // Format distribution for response
        const ratingDistribution = {
            5: 0, 4: 0, 3: 0, 2: 0, 1: 0
        };
        if (distribution && distribution.length > 0) {
            distribution.forEach(row => {
                ratingDistribution[row.rating] = row.count;
            });
        }

        res.json({
            reviews: (reviews || []).map(r => ({
                id: r.id,
                rating: r.rating,
                title: r.title,
                comment: r.comment,
                userId: r.user_id,
                verified: r.verified_purchase,
                helpful: r.helpful_count,
                date: r.created_at
            })),
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: countResult ? countResult.total : 0,
                pages: countResult ? Math.ceil(countResult.total / limit) : 0
            },
            summary: {
                averageRating: avgRating ? parseFloat((avgRating.average_rating || 0).toFixed(1)) : 0,
                totalReviews: avgRating ? avgRating.total_reviews : 0,
                distribution: ratingDistribution
            }
        });
    } catch (error) {
        console.error('Error fetching reviews:', error);
        res.status(500).json({ error: 'Failed to fetch reviews' });
    }
});

// POST new review (authenticated users only)
router.post('/products/:productId/reviews', authenticate, (req, res) => {
    try {
        const { productId } = req.params;
        const { rating, title, comment } = req.body;
        const userId = req.user.id;

        // Validate rating (1-5)
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'Rating must be between 1 and 5' });
        }

        // Validate title and comment
        if (!title || title.trim().length < 3) {
            return res.status(400).json({ error: 'Title must be at least 3 characters' });
        }

        if (!comment || comment.trim().length < 10) {
            return res.status(400).json({ error: 'Comment must be at least 10 characters' });
        }

        // Check if user already reviewed this product
        const existingReview = get(`
            SELECT id FROM reviews 
            WHERE product_id = ? AND user_id = ?
        `, [productId, userId]);

        if (existingReview) {
            return res.status(400).json({ error: 'You have already reviewed this product' });
        }

        // Check if user purchased this product (for verified_purchase badge)
        const purchase = get(`
            SELECT COUNT(*) as count FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            WHERE oi.product_id = ? AND o.user_id = ?
            AND o.status IN ('delivered', 'completed')
        `, [productId, userId]);

        const verifiedPurchase = purchase && purchase.count > 0;

        // Insert review
        run(`
            INSERT INTO reviews (product_id, user_id, rating, title, comment, verified_purchase, created_at)
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        `, [productId, userId, rating, title, comment, verifiedPurchase ? 1 : 0]);

        // Update product average rating
        updateProductRating(productId);

        res.status(201).json({
            message: 'Review posted successfully',
            verified: verifiedPurchase
        });
    } catch (error) {
        console.error('Error posting review:', error);
        res.status(500).json({ error: 'Failed to post review' });
    }
});

// Mark review as helpful
router.post('/reviews/:reviewId/helpful', authenticate, (req, res) => {
    try {
        const { reviewId } = req.params;
        const userId = req.user.id;

        // Check if user already marked this review as helpful
        const existing = get(`
            SELECT id FROM review_helpful_votes 
            WHERE review_id = ? AND user_id = ?
        `, [reviewId, userId]);

        if (existing) {
            return res.status(400).json({ error: 'You have already marked this review' });
        }

        // Add helpful vote
        run(`
            INSERT INTO review_helpful_votes (review_id, user_id, is_helpful, created_at)
            VALUES (?, ?, 1, datetime('now'))
        `, [reviewId, userId]);

        // Update helpful count
        run(`
            UPDATE reviews 
            SET helpful_count = helpful_count + 1 
            WHERE id = ?
        `, [reviewId]);

        // Get updated count
        const result = get(`
            SELECT helpful_count FROM reviews WHERE id = ?
        `, [reviewId]);

        res.json({ 
            message: 'Marked as helpful',
            helpful_count: result ? result.helpful_count : 0
        });
    } catch (error) {
        console.error('Error marking helpful:', error);
        res.status(500).json({ error: 'Failed to mark review' });
    }
});

// Edit own review (authenticated users only)
router.put('/reviews/:reviewId', authenticate, (req, res) => {
    try {
        const { reviewId } = req.params;
        const { rating, title, comment } = req.body;
        const userId = req.user.id;

        // Check if review belongs to user
        const review = get(`
            SELECT user_id FROM reviews WHERE id = ?
        `, [reviewId]);

        if (!review) {
            return res.status(404).json({ error: 'Review not found' });
        }

        if (review.user_id !== userId) {
            return res.status(403).json({ error: 'You can only edit your own reviews' });
        }

        // Update review
        run(`
            UPDATE reviews 
            SET rating = ?, title = ?, comment = ? 
            WHERE id = ?
        `, [rating, title, comment, reviewId]);

        // Update product rating
        const productReview = get(`
            SELECT product_id FROM reviews WHERE id = ?
        `, [reviewId]);

        if (productReview) {
            updateProductRating(productReview.product_id);
        }

        res.json({ message: 'Review updated successfully' });
    } catch (error) {
        console.error('Error updating review:', error);
        res.status(500).json({ error: 'Failed to update review' });
    }
});

// Delete review (authenticated users only)
router.delete('/reviews/:reviewId', authenticate, (req, res) => {
    try {
        const { reviewId } = req.params;
        const userId = req.user.id;

        // Check if review belongs to user
        const review = get(`
            SELECT user_id, product_id FROM reviews WHERE id = ?
        `, [reviewId]);

        if (!review) {
            return res.status(404).json({ error: 'Review not found' });
        }

        if (review.user_id !== userId) {
            return res.status(403).json({ error: 'You can only delete your own reviews' });
        }

        // Delete helpful votes
        run('DELETE FROM review_helpful_votes WHERE review_id = ?', [reviewId]);

        // Delete review
        run('DELETE FROM reviews WHERE id = ?', [reviewId]);

        // Update product rating
        updateProductRating(review.product_id);

        res.json({ message: 'Review deleted successfully' });
    } catch (error) {
        console.error('Error deleting review:', error);
        res.status(500).json({ error: 'Failed to delete review' });
    }
});

// Helper function to update product rating
function updateProductRating(productId) {
    try {
        const ratingData = get(`
            SELECT 
                AVG(rating) as avg_rating,
                COUNT(*) as total_reviews
            FROM reviews
            WHERE product_id = ?
        `, [productId]);

        if (ratingData) {
            run(`
                UPDATE products 
                SET rating = ?, review_count = ? 
                WHERE id = ?
            `, [ratingData.avg_rating || 0, ratingData.total_reviews || 0, productId]);
        }
    } catch (error) {
        console.error('Error updating product rating:', error);
    }
}

module.exports = router;
