import apiService from './apiService';

export interface MenuItem {
    id: number;
    vendor_id: number;
    title: string;
    description: string;
    price: string; // Decimal comes as string
    image_url: string;
    is_available: boolean;
    category: 'main' | 'side' | 'dessert' | 'drink';
}

export interface Vendor {
    id: number;
    user_id: number;
    business_name: string;
    description: string;
    phone: string;
    address: string;
    latitude: number;
    longitude: number;
    is_active: boolean;
    is_open: boolean;
    opening_hours: any;
    delivery_radius_km: string;
    cover_image: string;
    rating: string;
    review_count: number;
    owner_name: string;
    owner_avatar: string;
    distance_km?: number;
    menu?: MenuItem[];
}

export interface CreateVendorInput {
    business_name: string;
    description: string;
    phone: string;
    address: string;
    latitude: number;
    longitude: number;
    cover_image: string;
}

export interface InquiryInput {
    vendor_id: number;
    message: string;
    items?: number[]; // Menu Item IDs
}

export const marketplaceService = {
    getVendors: (params?: { lat?: number; lng?: number; radius_km?: number; search?: string }) => {
        const query = new URLSearchParams();
        if (params?.lat) query.append('lat', params.lat.toString());
        if (params?.lng) query.append('lng', params.lng.toString());
        if (params?.radius_km) query.append('radius_km', params.radius_km.toString());
        if (params?.search) query.append('search', params.search);

        return apiService.get<Vendor[]>(`/marketplace/vendors?${query.toString()}`);
    },

    getVendorById: (id: number) => {
        return apiService.get<Vendor>(`/marketplace/vendors/${id}`);
    },

    createVendor: (data: CreateVendorInput) => {
        return apiService.post<{ success: true; vendor_id: number }>('/marketplace/vendors', data);
    },

    updateVendor: (id: number, data: Partial<Vendor>) => {
        return apiService.put(`/marketplace/vendors/${id}`, data);
    },

    addMenuItem: (vendorId: number, data: Partial<MenuItem>) => {
        return apiService.post(`/marketplace/vendors/${vendorId}/menu`, data);
    },

    sendInquiry: (data: InquiryInput) => {
        return apiService.post('/marketplace/inquiries', data);
    },

    getInquiries: (vendorId: number) => {
        return apiService.get(`/marketplace/vendors/${vendorId}/inquiries`);
    }
};
