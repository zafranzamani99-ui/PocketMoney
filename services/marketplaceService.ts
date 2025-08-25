// PocketMoney Marketplace Service
// Handles supplier discovery, group purchasing, and B2B marketplace functionality

import { supabase } from '../lib/supabase';

export interface Supplier {
  id: string;
  user_id: string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: any;
  business_registration?: string;
  payment_terms?: string;
  rating: number;
  verification_status: 'pending' | 'verified' | 'rejected';
  verification_documents?: any;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  user_id: string;
  sku?: string;
  name: string;
  description?: string;
  category_id?: string;
  unit_price?: number;
  cost_price?: number;
  currency_id?: string;
  stock_quantity: number;
  low_stock_threshold: number;
  supplier_id?: string;
  product_images?: string[];
  attributes?: any;
  tags?: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MarketplaceListing {
  id: string;
  seller_id: string;
  product_id: string;
  listing_type: 'product' | 'service' | 'excess_inventory';
  price: number;
  currency_id?: string;
  minimum_order_quantity: number;
  availability_status: 'available' | 'out_of_stock' | 'discontinued';
  visibility: 'public' | 'private' | 'group_only';
  marketplace_category?: string;
  listing_images?: string[];
  shipping_info?: any;
  expires_at?: string;
  featured: boolean;
  views_count: number;
  created_at: string;
  updated_at: string;
}

export interface GroupPurchase {
  id: string;
  organizer_id: string;
  product_id: string;
  title: string;
  description?: string;
  target_quantity: number;
  current_quantity: number;
  unit_price: number;
  group_price: number;
  currency_id?: string;
  start_date: string;
  end_date?: string;
  status: 'active' | 'completed' | 'cancelled' | 'expired';
  minimum_participants: number;
  current_participants: number;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrder {
  id: string;
  user_id: string;
  supplier_id?: string;
  po_number: string;
  status: 'draft' | 'sent' | 'confirmed' | 'delivered' | 'cancelled';
  total_amount?: number;
  currency_id?: string;
  expected_delivery_date?: string;
  actual_delivery_date?: string;
  notes?: string;
  terms_conditions?: string;
  created_at: string;
  updated_at: string;
}

class MarketplaceService {
  // ============================================================================
  // SUPPLIER MANAGEMENT
  // ============================================================================

  async createSupplier(supplierData: Omit<Supplier, 'id' | 'created_at' | 'updated_at'>): Promise<Supplier | null> {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .insert(supplierData)
        .select()
        .single();

      if (error) {
        console.error('Error creating supplier:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error creating supplier:', error);
      return null;
    }
  }

  async getSuppliers(userId: string, filters?: {
    search?: string;
    verification_status?: string;
    rating_min?: number;
    tags?: string[];
  }): Promise<Supplier[]> {
    try {
      let query = supabase
        .from('suppliers')
        .select('*')
        .eq('user_id', userId)
        .order('rating', { ascending: false });

      if (filters?.search) {
        query = query.ilike('name', `%${filters.search}%`);
      }

      if (filters?.verification_status) {
        query = query.eq('verification_status', filters.verification_status);
      }

      if (filters?.rating_min) {
        query = query.gte('rating', filters.rating_min);
      }

      if (filters?.tags && filters.tags.length > 0) {
        query = query.contains('tags', filters.tags);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching suppliers:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      return [];
    }
  }

  async discoverSuppliers(searchParams: {
    category?: string;
    location?: string;
    rating_min?: number;
    price_range?: [number, number];
    tags?: string[];
    limit?: number;
    offset?: number;
  }): Promise<Supplier[]> {
    try {
      let query = supabase
        .from('suppliers')
        .select('*')
        .eq('verification_status', 'verified')
        .order('rating', { ascending: false });

      if (searchParams.rating_min) {
        query = query.gte('rating', searchParams.rating_min);
      }

      if (searchParams.tags && searchParams.tags.length > 0) {
        query = query.contains('tags', searchParams.tags);
      }

      if (searchParams.limit) {
        query = query.limit(searchParams.limit);
      }

      if (searchParams.offset) {
        query = query.range(searchParams.offset, searchParams.offset + (searchParams.limit || 20) - 1);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error discovering suppliers:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error discovering suppliers:', error);
      return [];
    }
  }

  async updateSupplierRating(supplierId: string, newRating: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('suppliers')
        .update({ rating: newRating })
        .eq('id', supplierId);

      if (error) {
        console.error('Error updating supplier rating:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error updating supplier rating:', error);
      return false;
    }
  }

  // ============================================================================
  // PRODUCT MANAGEMENT
  // ============================================================================

  async createProduct(productData: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<Product | null> {
    try {
      const { data, error } = await supabase
        .from('products')
        .insert(productData)
        .select()
        .single();

      if (error) {
        console.error('Error creating product:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error creating product:', error);
      return null;
    }
  }

  async getProducts(userId: string, filters?: {
    search?: string;
    category_id?: string;
    supplier_id?: string;
    low_stock_only?: boolean;
    active_only?: boolean;
  }): Promise<Product[]> {
    try {
      let query = supabase
        .from('products')
        .select('*')
        .eq('user_id', userId)
        .order('name');

      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,sku.ilike.%${filters.search}%`);
      }

      if (filters?.category_id) {
        query = query.eq('category_id', filters.category_id);
      }

      if (filters?.supplier_id) {
        query = query.eq('supplier_id', filters.supplier_id);
      }

      if (filters?.low_stock_only) {
        query = query.lt('stock_quantity', supabase.raw('low_stock_threshold'));
      }

      if (filters?.active_only !== false) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching products:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching products:', error);
      return [];
    }
  }

  async updateProductStock(productId: string, newQuantity: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('products')
        .update({ stock_quantity: newQuantity })
        .eq('id', productId);

      if (error) {
        console.error('Error updating product stock:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error updating product stock:', error);
      return false;
    }
  }

  // ============================================================================
  // MARKETPLACE LISTINGS
  // ============================================================================

  async createMarketplaceListing(listingData: Omit<MarketplaceListing, 'id' | 'created_at' | 'updated_at' | 'views_count'>): Promise<MarketplaceListing | null> {
    try {
      const { data, error } = await supabase
        .from('marketplace_listings')
        .insert({ ...listingData, views_count: 0 })
        .select()
        .single();

      if (error) {
        console.error('Error creating marketplace listing:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error creating marketplace listing:', error);
      return null;
    }
  }

  async getMarketplaceListings(filters?: {
    search?: string;
    category?: string;
    price_range?: [number, number];
    location?: string;
    seller_rating_min?: number;
    listing_type?: string;
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    try {
      let query = supabase
        .from('marketplace_with_products')
        .select('*')
        .eq('availability_status', 'available')
        .eq('visibility', 'public')
        .order('created_at', { ascending: false });

      if (filters?.search) {
        query = query.or(`product_name.ilike.%${filters.search}%,product_description.ilike.%${filters.search}%,seller_name.ilike.%${filters.search}%`);
      }

      if (filters?.category) {
        query = query.eq('marketplace_category', filters.category);
      }

      if (filters?.price_range) {
        query = query.gte('price', filters.price_range[0]).lte('price', filters.price_range[1]);
      }

      if (filters?.seller_rating_min) {
        query = query.gte('supplier_rating', filters.seller_rating_min);
      }

      if (filters?.listing_type) {
        query = query.eq('listing_type', filters.listing_type);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching marketplace listings:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching marketplace listings:', error);
      return [];
    }
  }

  async incrementListingViews(listingId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('marketplace_listings')
        .update({ views_count: supabase.raw('views_count + 1') })
        .eq('id', listingId);

      if (error) {
        console.error('Error incrementing listing views:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error incrementing listing views:', error);
      return false;
    }
  }

  // ============================================================================
  // GROUP PURCHASING
  // ============================================================================

  async createGroupPurchase(groupPurchaseData: Omit<GroupPurchase, 'id' | 'created_at' | 'updated_at' | 'current_quantity' | 'current_participants'>): Promise<GroupPurchase | null> {
    try {
      const { data, error } = await supabase
        .from('group_purchases')
        .insert({
          ...groupPurchaseData,
          current_quantity: 0,
          current_participants: 0
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating group purchase:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error creating group purchase:', error);
      return null;
    }
  }

  async getGroupPurchases(filters?: {
    status?: string;
    category?: string;
    price_range?: [number, number];
    ending_soon?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<GroupPurchase[]> {
    try {
      let query = supabase
        .from('group_purchases')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      } else {
        query = query.eq('status', 'active');
      }

      if (filters?.ending_soon) {
        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
        query = query.lte('end_date', threeDaysFromNow.toISOString());
      }

      if (filters?.price_range) {
        query = query.gte('group_price', filters.price_range[0]).lte('group_price', filters.price_range[1]);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching group purchases:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching group purchases:', error);
      return [];
    }
  }

  async joinGroupPurchase(groupPurchaseId: string, participantId: string, quantity: number): Promise<boolean> {
    try {
      // First get the group purchase details
      const { data: groupPurchase, error: fetchError } = await supabase
        .from('group_purchases')
        .select('group_price')
        .eq('id', groupPurchaseId)
        .single();

      if (fetchError || !groupPurchase) {
        console.error('Error fetching group purchase:', fetchError);
        return false;
      }

      const commitmentAmount = groupPurchase.group_price * quantity;

      const { error } = await supabase
        .from('group_purchase_participants')
        .insert({
          group_purchase_id: groupPurchaseId,
          participant_id: participantId,
          quantity: quantity,
          commitment_amount: commitmentAmount,
          status: 'committed'
        });

      if (error) {
        console.error('Error joining group purchase:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error joining group purchase:', error);
      return false;
    }
  }

  async getGroupPurchaseParticipants(groupPurchaseId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('group_purchase_participants')
        .select(`
          *,
          participant:users(id, business_name)
        `)
        .eq('group_purchase_id', groupPurchaseId);

      if (error) {
        console.error('Error fetching group purchase participants:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching group purchase participants:', error);
      return [];
    }
  }

  // ============================================================================
  // PURCHASE ORDERS
  // ============================================================================

  async createPurchaseOrder(poData: Omit<PurchaseOrder, 'id' | 'created_at' | 'updated_at'>): Promise<PurchaseOrder | null> {
    try {
      // Generate PO number if not provided
      if (!poData.po_number) {
        const timestamp = Date.now();
        poData.po_number = `PO-${timestamp}`;
      }

      const { data, error } = await supabase
        .from('purchase_orders')
        .insert(poData)
        .select()
        .single();

      if (error) {
        console.error('Error creating purchase order:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error creating purchase order:', error);
      return null;
    }
  }

  async getPurchaseOrders(userId: string, filters?: {
    status?: string;
    supplier_id?: string;
    date_range?: [string, string];
  }): Promise<PurchaseOrder[]> {
    try {
      let query = supabase
        .from('purchase_orders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.supplier_id) {
        query = query.eq('supplier_id', filters.supplier_id);
      }

      if (filters?.date_range) {
        query = query.gte('created_at', filters.date_range[0]).lte('created_at', filters.date_range[1]);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching purchase orders:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
      return [];
    }
  }

  async updatePurchaseOrderStatus(poId: string, newStatus: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('purchase_orders')
        .update({ status: newStatus })
        .eq('id', poId);

      if (error) {
        console.error('Error updating purchase order status:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error updating purchase order status:', error);
      return false;
    }
  }

  // ============================================================================
  // ANALYTICS AND INSIGHTS
  // ============================================================================

  async getMarketplaceAnalytics(userId: string): Promise<any> {
    try {
      // Get listing performance
      const { data: listingStats, error: listingError } = await supabase
        .from('marketplace_listings')
        .select('views_count, availability_status')
        .eq('seller_id', userId);

      // Get supplier performance
      const { data: supplierStats, error: supplierError } = await supabase
        .from('suppliers')
        .select('rating, verification_status')
        .eq('user_id', userId);

      // Get group purchase participation
      const { data: groupStats, error: groupError } = await supabase
        .from('group_purchase_participants')
        .select('quantity, commitment_amount, status')
        .eq('participant_id', userId);

      if (listingError || supplierError || groupError) {
        console.error('Error fetching marketplace analytics:', { listingError, supplierError, groupError });
        return null;
      }

      const analytics = {
        listings: {
          total: listingStats?.length || 0,
          active: listingStats?.filter(l => l.availability_status === 'available').length || 0,
          total_views: listingStats?.reduce((sum, l) => sum + (l.views_count || 0), 0) || 0,
          average_views: listingStats?.length ? (listingStats.reduce((sum, l) => sum + (l.views_count || 0), 0) / listingStats.length) : 0
        },
        suppliers: {
          total: supplierStats?.length || 0,
          verified: supplierStats?.filter(s => s.verification_status === 'verified').length || 0,
          average_rating: supplierStats?.length ? (supplierStats.reduce((sum, s) => sum + (s.rating || 0), 0) / supplierStats.length) : 0
        },
        groupPurchases: {
          participated: groupStats?.length || 0,
          total_committed: groupStats?.reduce((sum, g) => sum + (g.commitment_amount || 0), 0) || 0,
          successful: groupStats?.filter(g => g.status === 'paid').length || 0
        }
      };

      return analytics;
    } catch (error) {
      console.error('Error getting marketplace analytics:', error);
      return null;
    }
  }

  async getSupplierRecommendations(userId: string, category?: string): Promise<Supplier[]> {
    try {
      // Get user's current suppliers for collaborative filtering
      const { data: userSuppliers } = await supabase
        .from('suppliers')
        .select('id')
        .eq('user_id', userId);

      const userSupplierIds = userSuppliers?.map(s => s.id) || [];

      // Find suppliers used by similar businesses
      let query = supabase
        .from('suppliers')
        .select('*')
        .eq('verification_status', 'verified')
        .gte('rating', 4.0)
        .not('id', 'in', `(${userSupplierIds.join(',')})`)
        .order('rating', { ascending: false })
        .limit(10);

      if (category) {
        query = query.contains('tags', [category]);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error getting supplier recommendations:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting supplier recommendations:', error);
      return [];
    }
  }
}

export const marketplaceService = new MarketplaceService();