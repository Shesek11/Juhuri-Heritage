import apiService from './apiService';

// =====================================================
// Types & Interfaces
// =====================================================

export interface Vendor {
    id: number;
    user_id: number | null; // NULL for community-reported vendors
    name: string;
    slug: string;
    logo_url?: string;
    about_text?: string;
    about_image_url?: string;
    phone?: string;
    email?: string;
    website?: string;
    address: string;
    city?: string;
    latitude?: number;
    longitude?: number;
    is_verified: boolean;
    is_active: boolean;
    status: 'pending' | 'active' | 'suspended';
    created_at: string;
    updated_at: string;

    // Computed/joined fields
    avg_rating?: number;
    review_count?: number;
    distance_km?: number;
    owner_name?: string;

    // Nested data (for detail view)
    menu?: MenuItem[];
    hours?: OpeningHours[];
    closures?: Closure[];
    updates?: VendorUpdate[];
    reviews?: Review[];
}

export interface MenuItem {
    id: number;
    vendor_id: number;
    name: string;
    name_hebrew?: string;
    description?: string;
    category?: string; // 'appetizer', 'main', 'dessert', 'drink', etc.
    price: number;
    currency: string; // 'ILS', 'USD', etc.
    image_url?: string;
    is_available: boolean;
    stock_quantity?: number | null; // NULL = unlimited
    display_order: number;
    created_at?: string;
}

export interface OpeningHours {
    id: number;
    vendor_id: number;
    day_of_week: number; // 0=Sunday, 6=Saturday
    open_time?: string; // 'HH:MM:SS'
    close_time?: string; // 'HH:MM:SS'
    is_closed: boolean;
    notes?: string;
}

export interface Closure {
    id: number;
    vendor_id: number;
    closure_date: string; // 'YYYY-MM-DD'
    reason?: string;
    created_at?: string;
}

export interface Review {
    id: number;
    vendor_id: number;
    user_id: number;
    rating: number; // 1-5
    comment?: string;
    is_verified: boolean;
    is_hidden: boolean;
    created_at: string;
    updated_at: string;

    // Joined user info
    user_name?: string;
    user_avatar?: string;
}

export interface VendorUpdate {
    id: number;
    vendor_id: number;
    title: string;
    content?: string;
    image_url?: string;
    is_active: boolean;
    expires_at?: string | null;
    created_at: string;
    updated_at: string;
}

export interface Report {
    id: number;
    reporter_id: number;
    vendor_id?: number | null; // NULL if new vendor report
    vendor_name: string;
    vendor_address: string;
    vendor_phone?: string;
    description?: string;
    status: 'pending' | 'approved' | 'rejected' | 'merged';
    admin_notes?: string;
    reviewed_by?: number | null;
    reviewed_at?: string | null;
    created_at: string;

    // Joined data
    reporter_name?: string;
    reviewer_name?: string;
}

export interface CartItem {
    id: number;
    user_id: number;
    menu_item_id: number;
    quantity: number;
    notes?: string;
    added_at: string;

    // Joined menu item and vendor info
    item_name?: string;
    item_price?: number;
    item_currency?: string;
    item_image_url?: string;
    vendor_id?: number;
    vendor_name?: string;
    vendor_slug?: string;
}

// =====================================================
// Input Types
// =====================================================

export interface CreateVendorInput {
    name: string;
    slug: string;
    logo_url?: string;
    about_text?: string;
    about_image_url?: string;
    phone?: string;
    email?: string;
    website?: string;
    address: string;
    city?: string;
    latitude?: number;
    longitude?: number;
}

export interface UpdateVendorInput extends Partial<CreateVendorInput> {
    is_active?: boolean;
}

export interface CreateMenuItemInput {
    name: string;
    name_hebrew?: string;
    description?: string;
    category?: string;
    price: number;
    currency?: string;
    image_url?: string;
    is_available?: boolean;
    stock_quantity?: number | null;
    display_order?: number;
}

export interface UpdateMenuItemInput extends Partial<CreateMenuItemInput> {}

export interface SetHoursInput {
    hours: Array<{
        day_of_week: number;
        open_time?: string;
        close_time?: string;
        is_closed: boolean;
        notes?: string;
    }>;
}

export interface CreateClosureInput {
    closure_date: string;
    reason?: string;
}

export interface CreateReviewInput {
    rating: number; // 1-5
    comment?: string;
}

export interface CreateUpdateInput {
    title: string;
    content?: string;
    image_url?: string;
    expires_at?: string | null;
}

export interface CreateReportInput {
    vendor_id?: number | null;
    vendor_name: string;
    vendor_address: string;
    vendor_phone?: string;
    description?: string;
}

export interface UpdateReportInput {
    status: 'approved' | 'rejected' | 'merged';
    admin_notes?: string;
}

export interface AddToCartInput {
    menu_item_id: number;
    quantity: number;
    notes?: string;
}

export interface UpdateCartItemInput {
    quantity?: number;
    notes?: string;
}

// =====================================================
// Order Types
// =====================================================

export type OrderStatus = 'pending' | 'confirmed' | 'ready' | 'completed' | 'cancelled';

export interface Order {
    id: number;
    order_number: string;
    user_id: number;
    vendor_id: number;

    status: OrderStatus;
    total_price: number;
    currency: string;

    customer_name: string;
    customer_phone: string;
    customer_notes?: string;

    pickup_time?: string;

    created_at: string;
    confirmed_at?: string;
    ready_at?: string;
    completed_at?: string;
    cancelled_at?: string;
    cancellation_reason?: string;

    // Joined data
    vendor_name?: string;
    vendor_slug?: string;
    vendor_phone?: string;
    vendor_address?: string;

    // Order items
    items?: OrderItem[];
}

export interface OrderItem {
    id: number;
    order_id: number;
    menu_item_id?: number;

    item_name: string;
    item_name_hebrew?: string;
    item_description?: string;
    item_price: number;
    menu_item_name?: string;
    price_at_order?: number;
    quantity: number;
    notes?: string;
}

// =====================================================
// Notification Types
// =====================================================

export type NotificationType =
    | 'new_order'
    | 'order_confirmed'
    | 'order_ready'
    | 'order_completed'
    | 'order_cancelled'
    | 'new_review';

export interface Notification {
    id: number;
    user_id: number;
    type: NotificationType;

    order_id?: number;
    vendor_id?: number;
    review_id?: number;

    title: string;
    message?: string;

    is_read: boolean;
    created_at: string;

    // Joined data
    order_number?: string;
    vendor_name?: string;
}

// =====================================================
// Statistics Types
// =====================================================

export interface VendorStatistics {
    overview: {
        vendor_id: number;
        vendor_name: string;
        total_orders: number;
        completed_orders: number;
        cancelled_orders: number;
        total_revenue: number;
        avg_order_value: number;
        unique_customers: number;
    };
    daily_orders: Array<{
        order_date: string;
        orders_count: number;
        daily_revenue: number;
    }>;
    top_items: Array<{
        item_name: string;
        times_ordered: number;
        total_quantity: number;
        total_revenue: number;
    }>;
}

// =====================================================
// Service
// =====================================================

export const marketplaceService = {
    // =====================================================
    // VENDORS
    // =====================================================

    /**
     * Get all vendors with optional filtering
     */
    getVendors: (params?: {
        lat?: number;
        lng?: number;
        radius_km?: number;
        search?: string;
        status?: 'pending' | 'active' | 'suspended';
    }) => {
        const query = new URLSearchParams();
        if (params?.lat) query.append('lat', params.lat.toString());
        if (params?.lng) query.append('lng', params.lng.toString());
        if (params?.radius_km) query.append('radius_km', params.radius_km.toString());
        if (params?.search) query.append('search', params.search);
        if (params?.status) query.append('status', params.status);

        return apiService.get<Vendor[]>(`/marketplace/vendors?${query.toString()}`);
    },

    /**
     * Get vendor by slug (with full details: menu, hours, updates, reviews)
     */
    getVendorBySlug: (slug: string) => {
        return apiService.get<Vendor>(`/marketplace/vendors/${slug}`);
    },

    /**
     * Create a new vendor (authenticated users only)
     */
    createVendor: (data: CreateVendorInput) => {
        return apiService.post<{ success: true; vendor_id: number; slug: string }>('/marketplace/vendors', data);
    },

    /**
     * Update vendor (owner or admin only)
     */
    updateVendor: (id: number, data: UpdateVendorInput) => {
        return apiService.put(`/marketplace/vendors/${id}`, data);
    },

    /**
     * Get my vendor (returns vendor owned by current user)
     */
    getMyVendor: () => {
        return apiService.get<Vendor | null>('/marketplace/vendors/me');
    },

    // =====================================================
    // MENU ITEMS
    // =====================================================

    /**
     * Add menu item to vendor
     */
    addMenuItem: (vendorId: number, data: CreateMenuItemInput) => {
        return apiService.post<{ success: true; id: number }>(`/marketplace/vendors/${vendorId}/menu`, data);
    },

    /**
     * Update menu item
     */
    updateMenuItem: (itemId: number, data: UpdateMenuItemInput) => {
        return apiService.put(`/marketplace/menu-items/${itemId}`, data);
    },

    /**
     * Delete menu item
     */
    deleteMenuItem: (itemId: number) => {
        return apiService.delete(`/marketplace/menu-items/${itemId}`);
    },

    /**
     * Reorder menu items
     */
    reorderMenuItems: (items: Array<{ id: number; display_order: number }>) => {
        return apiService.put('/marketplace/menu-items/reorder', { items });
    },

    // =====================================================
    // OPENING HOURS
    // =====================================================

    /**
     * Set opening hours for vendor (replaces all existing hours)
     */
    setHours: (vendorId: number, data: SetHoursInput) => {
        return apiService.put(`/marketplace/vendors/${vendorId}/hours`, data);
    },

    /**
     * Add special closure date
     */
    addClosure: (vendorId: number, data: CreateClosureInput) => {
        return apiService.post<{ success: true; id: number }>(`/marketplace/vendors/${vendorId}/closures`, data);
    },

    /**
     * Remove closure
     */
    removeClosure: (closureId: number) => {
        return apiService.delete(`/marketplace/closures/${closureId}`);
    },

    // =====================================================
    // REVIEWS
    // =====================================================

    /**
     * Get reviews for vendor
     */
    getReviews: (vendorId: number, params?: { limit?: number; offset?: number }) => {
        const query = new URLSearchParams();
        if (params?.limit) query.append('limit', params.limit.toString());
        if (params?.offset) query.append('offset', params.offset.toString());

        return apiService.get<Review[]>(`/marketplace/vendors/${vendorId}/reviews?${query.toString()}`);
    },

    /**
     * Submit or update review (one per user per vendor)
     */
    submitReview: (vendorId: number, data: CreateReviewInput) => {
        return apiService.post<{ success: true; id: number }>(`/marketplace/vendors/${vendorId}/reviews`, data);
    },

    /**
     * Delete review (admin or review owner)
     */
    deleteReview: (reviewId: number) => {
        return apiService.delete(`/marketplace/reviews/${reviewId}`);
    },

    // =====================================================
    // UPDATES & PROMOTIONS
    // =====================================================

    /**
     * Get updates for vendor
     */
    getUpdates: (vendorId: number) => {
        return apiService.get<VendorUpdate[]>(`/marketplace/vendors/${vendorId}/updates`);
    },

    /**
     * Create update/promotion
     */
    createUpdate: (vendorId: number, data: CreateUpdateInput) => {
        return apiService.post<{ success: true; id: number }>(`/marketplace/vendors/${vendorId}/updates`, data);
    },

    /**
     * Update existing update
     */
    updateUpdate: (updateId: number, data: Partial<CreateUpdateInput>) => {
        return apiService.put(`/marketplace/updates/${updateId}`, data);
    },

    /**
     * Delete update
     */
    deleteUpdate: (updateId: number) => {
        return apiService.delete(`/marketplace/updates/${updateId}`);
    },

    // =====================================================
    // COMMUNITY REPORTS
    // =====================================================

    /**
     * Get all reports (admin only)
     */
    getReports: (status?: 'pending' | 'approved' | 'rejected' | 'merged') => {
        const query = status ? `?status=${status}` : '';
        return apiService.get<Report[]>(`/marketplace/reports${query}`);
    },

    /**
     * Submit report for new vendor or add info to existing
     */
    submitReport: (data: CreateReportInput) => {
        return apiService.post<{ success: true; id: number }>('/marketplace/reports', data);
    },

    /**
     * Update report status (admin only)
     */
    updateReportStatus: (reportId: number, data: UpdateReportInput) => {
        return apiService.put(`/marketplace/reports/${reportId}`, data);
    },

    // =====================================================
    // SHOPPING CART
    // =====================================================

    /**
     * Get current user's cart
     */
    getCart: () => {
        return apiService.get<CartItem[]>('/marketplace/cart');
    },

    /**
     * Add item to cart (or update quantity if exists)
     */
    addToCart: (data: AddToCartInput) => {
        return apiService.post<{ success: true; id: number }>('/marketplace/cart', data);
    },

    /**
     * Update cart item
     */
    updateCartItem: (cartItemId: number, data: UpdateCartItemInput) => {
        return apiService.put(`/marketplace/cart/${cartItemId}`, data);
    },

    /**
     * Remove item from cart
     */
    removeFromCart: (cartItemId: number) => {
        return apiService.delete(`/marketplace/cart/${cartItemId}`);
    },

    /**
     * Clear entire cart
     */
    clearCart: () => {
        return apiService.delete('/marketplace/cart');
    },

    // =====================================================
    // ADMIN OPERATIONS
    // =====================================================

    /**
     * Get all pending vendors (admin only)
     */
    getPendingVendors: () => {
        return apiService.get<Vendor[]>('/marketplace/vendors?status=pending');
    },

    /**
     * Approve vendor (admin only)
     */
    approveVendor: (vendorId: number) => {
        return apiService.put(`/marketplace/vendors/${vendorId}`, { status: 'active', is_verified: true });
    },

    /**
     * Suspend vendor (admin only)
     */
    suspendVendor: (vendorId: number) => {
        return apiService.put(`/marketplace/vendors/${vendorId}`, { status: 'suspended' });
    },

    /**
     * Hide review (admin only)
     */
    hideReview: (reviewId: number) => {
        return apiService.put(`/marketplace/reviews/${reviewId}`, { is_hidden: true });
    },

    /**
     * Verify review (admin only)
     */
    verifyReview: (reviewId: number) => {
        return apiService.put(`/marketplace/reviews/${reviewId}`, { is_verified: true });
    },

    // =====================================================
    // ORDERS
    // =====================================================

    /**
     * Create order from cart
     */
    createOrder: (data: {
        customer_name: string;
        customer_phone: string;
        customer_notes?: string;
        pickup_time?: string;
    }) => {
        return apiService.post<{
            success: true;
            orders: Array<{
                order_id: number;
                order_number: string;
                vendor_name: string;
            }>;
        }>('/marketplace/orders', data);
    },

    /**
     * Get user's orders
     */
    getMyOrders: () => {
        return apiService.get<Order[]>('/marketplace/orders');
    },

    /**
     * Get vendor's orders
     */
    getVendorOrders: (vendorId: number) => {
        return apiService.get<Order[]>(`/marketplace/vendors/${vendorId}/orders`);
    },

    /**
     * Update order status
     */
    updateOrderStatus: (orderId: number, status: OrderStatus, cancellation_reason?: string) => {
        return apiService.put(`/marketplace/orders/${orderId}`, { status, cancellation_reason });
    },

    // =====================================================
    // NOTIFICATIONS
    // =====================================================

    /**
     * Get notifications
     */
    getNotifications: (unreadOnly?: boolean) => {
        const query = unreadOnly ? '?unread_only=true' : '';
        return apiService.get<Notification[]>(`/marketplace/notifications${query}`);
    },

    /**
     * Mark notification as read
     */
    markNotificationRead: (notificationId: number) => {
        return apiService.put(`/marketplace/notifications/${notificationId}/read`, {});
    },

    /**
     * Mark all notifications as read
     */
    markAllNotificationsRead: () => {
        return apiService.put('/marketplace/notifications/read-all', {});
    },

    // =====================================================
    // STATISTICS
    // =====================================================

    /**
     * Get vendor statistics
     */
    getVendorStatistics: (vendorId: number) => {
        return apiService.get<VendorStatistics>(`/marketplace/vendors/${vendorId}/statistics`);
    }
};
