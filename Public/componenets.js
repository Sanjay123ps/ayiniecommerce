// FRONTEND COMPONENTS - Pure Vanilla JavaScript

// ============================================
// COMPONENT 1: ReviewStars.js
// ============================================
class ReviewStars {
    constructor(rating, reviewCount, onRatingChange = null) {
        this.rating = rating;
        this.reviewCount = reviewCount;
        this.onRatingChange = onRatingChange;
        this.hoverRating = 0;
    }

    render() {
        const container = document.createElement('div');
        container.className = 'review-stars-container';
        container.innerHTML = `
            <div class="stars-display">
                <div class="stars" id="stars-rating">
                    ${this.getStarElements()}
                </div>
                <div class="rating-text">
                    <span class="rating-value">${this.rating.toFixed(1)}</span>
                    <span class="out-of">out of 5</span>
                    <span class="review-count">(${this.reviewCount} reviews)</span>
                </div>
            </div>
        `;

        // Add event listeners if editable
        if (this.onRatingChange) {
            const stars = container.querySelectorAll('.star');
            stars.forEach((star, index) => {
                star.addEventListener('click', () => {
                    this.onRatingChange(index + 1);
                });
                star.addEventListener('mouseover', () => {
                    this.hoverRating = index + 1;
                    this.updateStarDisplay(container, this.hoverRating);
                });
            });

            container.addEventListener('mouseleave', () => {
                this.hoverRating = 0;
                this.updateStarDisplay(container, this.rating);
            });
        }

        return container;
    }

    getStarElements() {
        let stars = '';
        for (let i = 1; i <= 5; i++) {
            const isFilled = i <= Math.round(this.rating);
            stars += `<span class="star ${isFilled ? 'filled' : ''}">★</span>`;
        }
        return stars;
    }

    updateStarDisplay(container, rating) {
        const stars = container.querySelectorAll('.star');
        stars.forEach((star, index) => {
            if (index < rating) {
                star.classList.add('filled');
            } else {
                star.classList.remove('filled');
            }
        });
    }
}

// ============================================
// COMPONENT 2: ReviewsList.js
// ============================================
class ReviewsList {
    constructor(productId, apiBaseUrl = '/api') {
        this.productId = productId;
        this.apiBaseUrl = apiBaseUrl;
        this.currentPage = 1;
        this.sortBy = 'recent';
        this.reviews = [];
        this.pagination = {};
    }

    async load() {
        try {
            const response = await fetch(
                `${this.apiBaseUrl}/products/${this.productId}/reviews?` +
                `page=${this.currentPage}&sortBy=${this.sortBy}`
            );
            const data = await response.json();
            this.reviews = data.reviews;
            this.pagination = data.pagination;
            this.summary = data.summary;
        } catch (error) {
            console.error('Error loading reviews:', error);
        }
    }

    render() {
        const container = document.createElement('div');
        container.className = 'reviews-container';

        // Summary section
        const summary = document.createElement('div');
        summary.className = 'reviews-summary';
        summary.innerHTML = `
            <div class="average-rating">
                <div class="rating-number">${this.summary.averageRating}</div>
                <div class="rating-stars">
                    ${this.getStarRating(this.summary.averageRating)}
                </div>
                <div class="total-reviews">${this.summary.totalReviews} ratings</div>
            </div>
            <div class="rating-distribution">
                ${this.getRatingDistribution()}
            </div>
        `;

        // Sort dropdown
        const controls = document.createElement('div');
        controls.className = 'reviews-controls';
        controls.innerHTML = `
            <select class="sort-dropdown" id="sortBy">
                <option value="recent">Most Recent</option>
                <option value="helpful">Most Helpful</option>
                <option value="highest-rating">Highest Rating</option>
                <option value="lowest-rating">Lowest Rating</option>
            </select>
        `;

        // Reviews list
        const reviewsList = document.createElement('div');
        reviewsList.className = 'reviews-list';
        reviewsList.innerHTML = this.reviews.map(review => `
            <div class="review-item">
                <div class="review-header">
                    <div class="reviewer-info">
                        <span class="reviewer-name">${review.author}</span>
                        ${review.verified ? '<span class="verified-badge">✓ Verified Purchase</span>' : ''}
                    </div>
                    <span class="review-date">${this.formatDate(review.date)}</span>
                </div>
                <div class="review-rating">${this.getStarRating(review.rating)}</div>
                <div class="review-title">${review.title}</div>
                <div class="review-comment">${this.linkifyText(review.comment)}</div>
                <div class="review-footer">
                    <button class="helpful-btn" data-review-id="${review.id}">
                        👍 Helpful (${review.helpful})
                    </button>
                </div>
            </div>
        `).join('');

        // Pagination
        const pagination = document.createElement('div');
        pagination.className = 'reviews-pagination';
        pagination.innerHTML = `
            <button class="prev-btn" ${this.currentPage === 1 ? 'disabled' : ''}>← Previous</button>
            <span class="page-info">Page ${this.pagination.page} of ${this.pagination.pages}</span>
            <button class="next-btn" ${this.currentPage >= this.pagination.pages ? 'disabled' : ''}>Next →</button>
        `;

        // Assemble
        container.appendChild(summary);
        container.appendChild(controls);
        container.appendChild(reviewsList);
        container.appendChild(pagination);

        // Event listeners
        container.querySelector('#sortBy').addEventListener('change', (e) => {
            this.sortBy = e.target.value;
            this.currentPage = 1;
            this.load().then(() => {
                container.replaceWith(this.render());
            });
        });

        container.querySelectorAll('.helpful-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const reviewId = e.target.dataset.reviewId;
                await this.markHelpful(reviewId);
            });
        });

        container.querySelector('.prev-btn').addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.load().then(() => {
                    container.replaceWith(this.render());
                });
            }
        });

        container.querySelector('.next-btn').addEventListener('click', () => {
            if (this.currentPage < this.pagination.pages) {
                this.currentPage++;
                this.load().then(() => {
                    container.replaceWith(this.render());
                });
            }
        });

        return container;
    }

    getRatingDistribution() {
        const { distribution } = this.summary;
        const total = Object.values(distribution).reduce((a, b) => a + b, 0);
        
        let html = '';
        for (let i = 5; i >= 1; i--) {
            const count = distribution[i];
            const percentage = total > 0 ? (count / total * 100).toFixed(0) : 0;
            html += `
                <div class="distribution-row">
                    <span>${i}★</span>
                    <div class="progress-bar">
                        <div class="progress" style="width: ${percentage}%"></div>
                    </div>
                    <span>${count}</span>
                </div>
            `;
        }
        return html;
    }

    getStarRating(rating) {
        let stars = '';
        for (let i = 1; i <= 5; i++) {
            stars += `<span class="star ${i <= rating ? 'filled' : ''}">★</span>`;
        }
        return stars;
    }

    async markHelpful(reviewId) {
        try {
            const response = await fetch(
                `${this.apiBaseUrl}/reviews/${reviewId}/helpful`,
                { method: 'POST' }
            );
            const data = await response.json();
            // Update UI
            document.querySelector(`[data-review-id="${reviewId}"]`).textContent = 
                `👍 Helpful (${data.helpful_count})`;
        } catch (error) {
            console.error('Error marking helpful:', error);
        }
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const days = Math.floor((now - date) / (1000 * 60 * 60 * 24));
        
        if (days === 0) return 'Today';
        if (days === 1) return 'Yesterday';
        if (days < 7) return `${days} days ago`;
        if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
        return date.toLocaleDateString();
    }

    linkifyText(text) {
        return text.replace(/\n/g, '<br>');
    }
}

// ============================================
// COMPONENT 3: SearchBar.js with Autocomplete
// ============================================
class SearchBar {
    constructor(apiBaseUrl = '/api') {
        this.apiBaseUrl = apiBaseUrl;
        this.searchInput = null;
        this.suggestionsDropdown = null;
        this.debounceTimer = null;
    }

    render() {
        const container = document.createElement('div');
        container.className = 'search-bar-container';
        container.innerHTML = `
            <div class="search-box">
                <input 
                    type="text" 
                    id="searchInput" 
                    class="search-input"
                    placeholder="Search products..."
                    autocomplete="off"
                >
                <button class="search-btn">🔍</button>
                <div class="suggestions-dropdown" id="suggestionsDropdown"></div>
            </div>
        `;

        this.searchInput = container.querySelector('#searchInput');
        this.suggestionsDropdown = container.querySelector('#suggestionsDropdown');

        // Event listeners
        this.searchInput.addEventListener('input', (e) => {
            this.handleInput(e.target.value);
        });

        this.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.performSearch(this.searchInput.value);
            }
        });

        container.querySelector('.search-btn').addEventListener('click', () => {
            this.performSearch(this.searchInput.value);
        });

        return container;
    }

    handleInput(value) {
        clearTimeout(this.debounceTimer);

        if (value.length < 2) {
            this.suggestionsDropdown.style.display = 'none';
            return;
        }

        this.debounceTimer = setTimeout(() => {
            this.fetchSuggestions(value);
        }, 300);
    }

    async fetchSuggestions(query) {
        try {
            const response = await fetch(
                `${this.apiBaseUrl}/search/suggestions?q=${encodeURIComponent(query)}`
            );
            const data = await response.json();
            this.showSuggestions(data.suggestions);
        } catch (error) {
            console.error('Error fetching suggestions:', error);
        }
    }

    showSuggestions(suggestions) {
        if (suggestions.length === 0) {
            this.suggestionsDropdown.style.display = 'none';
            return;
        }

        this.suggestionsDropdown.innerHTML = suggestions.map(s => `
            <div class="suggestion-item" data-suggestion="${s.text}">
                <span class="suggestion-icon">${s.type === 'product' ? '📦' : '📁'}</span>
                <span class="suggestion-text">${s.text}</span>
            </div>
        `).join('');

        this.suggestionsDropdown.style.display = 'block';

        // Click handlers
        this.suggestionsDropdown.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', () => {
                this.searchInput.value = item.dataset.suggestion;
                this.performSearch(item.dataset.suggestion);
            });
        });
    }

    performSearch(query) {
        window.location.href = `/search?q=${encodeURIComponent(query)}`;
    }
}

// ============================================
// COMPONENT 4: FilterSidebar.js
// ============================================
class FilterSidebar {
    constructor(facets, onFilterChange) {
        this.facets = facets;
        this.onFilterChange = onFilterChange;
        this.selectedFilters = {
            categories: [],
            priceRange: { min: 0, max: 10000 },
            ratings: []
        };
    }

    render() {
        const sidebar = document.createElement('div');
        sidebar.className = 'filter-sidebar';
        sidebar.innerHTML = `
            <div class="filters">
                <h3>Filters</h3>
                
                <!-- Category Filter -->
                <div class="filter-group">
                    <h4>Category</h4>
                    <div class="filter-options">
                        ${this.facets.categories.map((cat, idx) => `
                            <label class="checkbox-filter">
                                <input type="checkbox" value="${cat.name}" class="category-filter">
                                <span>${cat.name} (${cat.count})</span>
                            </label>
                        `).join('')}
                    </div>
                </div>

                <!-- Price Range Filter -->
                <div class="filter-group">
                    <h4>Price Range</h4>
                    <div class="price-filter">
                        <input type="range" min="0" max="10000" step="50" 
                               class="price-slider" id="priceMin" value="0">
                        <input type="range" min="0" max="10000" step="50" 
                               class="price-slider" id="priceMax" value="10000">
                        <div class="price-display">
                            ₹<span id="minPrice">0</span> - ₹<span id="maxPrice">10000</span>
                        </div>
                    </div>
                </div>

                <!-- Rating Filter -->
                <div class="filter-group">
                    <h4>Rating</h4>
                    <div class="filter-options">
                        ${this.facets.ratings.map(rating => `
                            <label class="checkbox-filter">
                                <input type="checkbox" value="${rating.min}" class="rating-filter">
                                <span>${rating.label} (${rating.count})</span>
                            </label>
                        `).join('')}
                    </div>
                </div>

                <button class="clear-filters">Clear All Filters</button>
            </div>
        `;

        // Event listeners
        sidebar.querySelectorAll('.category-filter').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.selectedFilters.categories = Array.from(
                    sidebar.querySelectorAll('.category-filter:checked')
                ).map(c => c.value);
                this.onFilterChange(this.selectedFilters);
            });
        });

        const minInput = sidebar.querySelector('#priceMin');
        const maxInput = sidebar.querySelector('#priceMax');

        minInput.addEventListener('input', () => {
            this.selectedFilters.priceRange.min = parseInt(minInput.value);
            sidebar.querySelector('#minPrice').textContent = minInput.value;
            this.onFilterChange(this.selectedFilters);
        });

        maxInput.addEventListener('input', () => {
            this.selectedFilters.priceRange.max = parseInt(maxInput.value);
            sidebar.querySelector('#maxPrice').textContent = maxInput.value;
            this.onFilterChange(this.selectedFilters);
        });

        sidebar.querySelectorAll('.rating-filter').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.selectedFilters.ratings = Array.from(
                    sidebar.querySelectorAll('.rating-filter:checked')
                ).map(c => parseFloat(c.value));
                this.onFilterChange(this.selectedFilters);
            });
        });

        sidebar.querySelector('.clear-filters').addEventListener('click', () => {
            this.selectedFilters = {
                categories: [],
                priceRange: { min: 0, max: 10000 },
                ratings: []
            };
            sidebar.querySelectorAll('input[type="checkbox"]').forEach(c => {
                c.checked = false;
            });
            minInput.value = 0;
            maxInput.value = 10000;
            sidebar.querySelector('#minPrice').textContent = '0';
            sidebar.querySelector('#maxPrice').textContent = '10000';
            this.onFilterChange(this.selectedFilters);
        });

        return sidebar;
    }
}

// ============================================
// USAGE EXAMPLES
// ============================================

/*
// 1. Display reviews on product page
const reviewsList = new ReviewsList(productId, '/api');
await reviewsList.load();
document.querySelector('#reviews-section').appendChild(reviewsList.render());

// 2. Add search bar
const searchBar = new SearchBar('/api');
document.querySelector('header').appendChild(searchBar.render());

// 3. Add filters on search results
const filterSidebar = new FilterSidebar(facets, (filters) => {
    // Re-fetch products with new filters
    console.log('Filters changed:', filters);
});
document.querySelector('.sidebar').appendChild(filterSidebar.render());
*/
