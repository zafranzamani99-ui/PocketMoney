// Supplier Card Component for Marketplace
// Displays supplier information with rating, verification status, and quick actions

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

const { width: screenWidth } = Dimensions.get('window');

export interface Supplier {
  id: string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: any;
  business_registration?: string;
  payment_terms?: string;
  rating: number;
  verification_status: 'pending' | 'verified' | 'rejected';
  tags?: string[];
  total_products?: number;
  response_time?: string;
  minimum_order?: number;
  currency?: string;
  created_at: string;
}

interface SupplierCardProps {
  supplier: Supplier;
  onPress?: () => void;
  onContactPress?: () => void;
  onFavoritePress?: () => void;
  isFavorite?: boolean;
  showQuickActions?: boolean;
  compact?: boolean;
}

export const SupplierCard: React.FC<SupplierCardProps> = ({
  supplier,
  onPress,
  onContactPress,
  onFavoritePress,
  isFavorite = false,
  showQuickActions = true,
  compact = false
}) => {
  const { colors } = useTheme();
  
  const getVerificationColor = () => {
    switch (supplier.verification_status) {
      case 'verified':
        return colors.success;
      case 'rejected':
        return colors.error;
      default:
        return colors.warning;
    }
  };
  
  const getVerificationIcon = () => {
    switch (supplier.verification_status) {
      case 'verified':
        return '✓';
      case 'rejected':
        return '✗';
      default:
        return '⏳';
    }
  };
  
  const renderRatingStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Text key={`star-${i}`} style={[styles.star, { color: colors.warning }]}>
          ★
        </Text>
      );
    }
    
    if (hasHalfStar) {
      stars.push(
        <Text key="half-star" style={[styles.star, { color: colors.warning }]}>
          ☆
        </Text>
      );
    }
    
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Text key={`empty-${i}`} style={[styles.star, { color: colors.textSecondary }]}>
          ☆
        </Text>
      );
    }
    
    return stars;
  };
  
  if (compact) {
    return (
      <TouchableOpacity
        style={[styles.compactCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.compactContent}>
          <View style={styles.compactHeader}>
            <Text style={[styles.compactName, { color: colors.text }]} numberOfLines={1}>
              {supplier.name}
            </Text>
            <View style={[styles.verificationBadge, { backgroundColor: getVerificationColor() }]}>
              <Text style={styles.verificationIcon}>
                {getVerificationIcon()}
              </Text>
            </View>
          </View>
          
          <View style={styles.compactRating}>
            {renderRatingStars(supplier.rating)}
            <Text style={[styles.ratingText, { color: colors.textSecondary }]}>
              ({supplier.rating.toFixed(1)})
            </Text>
          </View>
          
          {supplier.tags && supplier.tags.length > 0 && (
            <View style={styles.compactTags}>
              {supplier.tags.slice(0, 2).map((tag, index) => (
                <View key={index} style={[styles.tag, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.tagText, { color: colors.primary }]}>
                    {tag}
                  </Text>
                </View>
              ))}
              {supplier.tags.length > 2 && (
                <Text style={[styles.moreTagsText, { color: colors.textSecondary }]}>
                  +{supplier.tags.length - 2}
                </Text>
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }
  
  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.supplierInfo}>
          <View style={styles.nameContainer}>
            <Text style={[styles.supplierName, { color: colors.text }]} numberOfLines={1}>
              {supplier.name}
            </Text>
            <View style={[styles.verificationBadge, { backgroundColor: getVerificationColor() }]}>
              <Text style={styles.verificationIcon}>
                {getVerificationIcon()}
              </Text>
            </View>
          </View>
          
          {supplier.contact_person && (
            <Text style={[styles.contactPerson, { color: colors.textSecondary }]} numberOfLines={1}>
              Contact: {supplier.contact_person}
            </Text>
          )}
        </View>
        
        {showQuickActions && (
          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={onFavoritePress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={[styles.favoriteIcon, { color: isFavorite ? colors.error : colors.textSecondary }]}>
              {isFavorite ? '❤️' : '🤍'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      
      {/* Rating and Stats */}
      <View style={styles.ratingContainer}>
        <View style={styles.rating}>
          {renderRatingStars(supplier.rating)}
          <Text style={[styles.ratingText, { color: colors.textSecondary }]}>
            ({supplier.rating.toFixed(1)})
          </Text>
        </View>
        
        <View style={styles.stats}>
          {supplier.total_products && (
            <Text style={[styles.statText, { color: colors.textSecondary }]}>
              {supplier.total_products} products
            </Text>
          )}
          {supplier.response_time && (
            <Text style={[styles.statText, { color: colors.textSecondary }]}>
              • {supplier.response_time} response
            </Text>
          )}
        </View>
      </View>
      
      {/* Address */}
      {supplier.address && (
        <View style={styles.addressContainer}>
          <Text style={[styles.addressIcon, { color: colors.textSecondary }]}>📍</Text>
          <Text style={[styles.addressText, { color: colors.textSecondary }]} numberOfLines={1}>
            {typeof supplier.address === 'string' 
              ? supplier.address 
              : `${supplier.address.city || ''}, ${supplier.address.state || ''}`}
          </Text>
        </View>
      )}
      
      {/* Payment Terms and Minimum Order */}
      <View style={styles.termsContainer}>
        {supplier.payment_terms && (
          <View style={styles.termItem}>
            <Text style={[styles.termLabel, { color: colors.textSecondary }]}>Payment:</Text>
            <Text style={[styles.termValue, { color: colors.text }]}>{supplier.payment_terms}</Text>
          </View>
        )}
        
        {supplier.minimum_order && (
          <View style={styles.termItem}>
            <Text style={[styles.termLabel, { color: colors.textSecondary }]}>Min Order:</Text>
            <Text style={[styles.termValue, { color: colors.text }]}>
              {supplier.currency || 'RM'}{supplier.minimum_order.toLocaleString()}
            </Text>
          </View>
        )}
      </View>
      
      {/* Tags */}
      {supplier.tags && supplier.tags.length > 0 && (
        <View style={styles.tagsContainer}>
          {supplier.tags.slice(0, 4).map((tag, index) => (
            <View key={index} style={[styles.tag, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.tagText, { color: colors.primary }]}>
                {tag}
              </Text>
            </View>
          ))}
          {supplier.tags.length > 4 && (
            <Text style={[styles.moreTagsText, { color: colors.textSecondary }]}>
              +{supplier.tags.length - 4} more
            </Text>
          )}
        </View>
      )}
      
      {/* Quick Actions */}
      {showQuickActions && (
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.primaryActionButton, { backgroundColor: colors.primary }]}
            onPress={onPress}
          >
            <Text style={[styles.actionButtonText, { color: colors.white }]}>
              View Details
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryActionButton, { borderColor: colors.primary }]}
            onPress={onContactPress}
          >
            <Text style={[styles.actionButtonText, { color: colors.primary }]}>
              Contact
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  compactCard: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  supplierInfo: {
    flex: 1,
    marginRight: 12,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  supplierName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  verificationBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verificationIcon: {
    fontSize: 12,
    color: 'white',
    fontWeight: 'bold',
  },
  contactPerson: {
    fontSize: 12,
  },
  favoriteButton: {
    padding: 4,
  },
  favoriteIcon: {
    fontSize: 18,
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  star: {
    fontSize: 14,
    marginRight: 1,
  },
  ratingText: {
    fontSize: 12,
    marginLeft: 4,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 12,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  addressIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  addressText: {
    fontSize: 12,
    flex: 1,
  },
  termsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  termItem: {
    flex: 1,
  },
  termLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  termValue: {
    fontSize: 12,
    fontWeight: '500',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    gap: 6,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '500',
  },
  moreTagsText: {
    fontSize: 10,
    alignSelf: 'center',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  primaryActionButton: {
    // backgroundColor set dynamically
  },
  secondaryActionButton: {
    borderWidth: 1,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Compact styles
  compactContent: {
    // All content in compact mode
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  compactName: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  compactRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  compactTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
});