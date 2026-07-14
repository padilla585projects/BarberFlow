import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';
import { Alert } from '../../components/AppAlert';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuthContext } from '../../contexts/AuthContext';

const BG      = '#0A0A0A';
const SURFACE = '#141414';
const GOLD    = '#C9A84C';
const TEXT_C  = '#FFFFFF';
const MUTED   = '#888888';
const BORDER  = '#282828';
const WARNING = '#E8913A';

const CATEGORY_OPTIONS = [
  'Champu',
  'Gel',
  'Cera',
  'Aceite',
  'Crema',
  'Aftershave',
  'Perfume',
  'Accesorios',
  'Otro',
];

interface Product {
  id: string;
  barbershopId: string;
  name: string;
  description?: string;
  price: number;
  stock: number;
  category: string;
}

export function InventoryScreen() {
  const { activeBarbershopId } = useAuthContext();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [category, setCategory] = useState(CATEGORY_OPTIONS[0]);
  const [nameFocused, setNameFocused] = useState(false);
  const [priceFocused, setPriceFocused] = useState(false);
  const [stockFocused, setStockFocused] = useState(false);

  const fetchProducts = useCallback(async () => {
    if (!activeBarbershopId) return;

    try {
      const q = query(
        collection(db, 'products'),
        where('barbershopId', '==', activeBarbershopId),
      );
      const snapshot = await getDocs(q);
      const items: Product[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Product[];

      items.sort((a, b) => a.name.localeCompare(b.name));
      setProducts(items);
    } catch (err) {
      console.error('[InventoryScreen] Error fetching products:', err);
      Alert.alert('Error', 'No se pudieron cargar los productos.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeBarbershopId]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProducts();
  }, [fetchProducts]);

  const openAddModal = () => {
    setEditingProduct(null);
    setName('');
    setPrice('');
    setStock('');
    setCategory(CATEGORY_OPTIONS[0]);
    setModalVisible(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setName(product.name);
    setPrice(product.price.toString());
    setStock(product.stock.toString());
    setCategory(product.category);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingProduct(null);
  };

  const handleSave = async () => {
    if (!activeBarbershopId) return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('Error', 'El nombre del producto es obligatorio.');
      return;
    }

    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      Alert.alert('Error', 'Introduce un precio valido.');
      return;
    }

    const parsedStock = parseInt(stock, 10);
    if (isNaN(parsedStock) || parsedStock < 0) {
      Alert.alert('Error', 'Introduce un stock valido.');
      return;
    }

    setSaving(true);

    try {
      if (editingProduct) {
        await updateDoc(doc(db, 'products', editingProduct.id), {
          name: trimmedName,
          price: parsedPrice,
          stock: parsedStock,
          category,
        });

        setProducts((prev) =>
          prev.map((p) =>
            p.id === editingProduct.id
              ? { ...p, name: trimmedName, price: parsedPrice, stock: parsedStock, category }
              : p,
          ),
        );
      } else {
        const docRef = await addDoc(collection(db, 'products'), {
          barbershopId: activeBarbershopId,
          name: trimmedName,
          price: parsedPrice,
          stock: parsedStock,
          category,
        });

        const newProduct: Product = {
          id: docRef.id,
          barbershopId: activeBarbershopId,
          name: trimmedName,
          price: parsedPrice,
          stock: parsedStock,
          category,
        };

        setProducts((prev) => [...prev, newProduct].sort((a, b) => a.name.localeCompare(b.name)));
      }

      closeModal();
    } catch (err) {
      console.error('[InventoryScreen] Error saving product:', err);
      Alert.alert('Error', 'No se pudo guardar el producto.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (product: Product) => {
    Alert.alert(
      'Eliminar producto',
      `¿Seguro que quieres eliminar "${product.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'products', product.id));
              setProducts((prev) => prev.filter((p) => p.id !== product.id));
            } catch (err) {
              console.error('[InventoryScreen] Error deleting product:', err);
              Alert.alert('Error', 'No se pudo eliminar el producto.');
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={GOLD} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={GOLD}
            colors={[GOLD]}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Inventario</Text>
          <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
            <Text style={styles.addButtonText}>+ Nuevo</Text>
          </TouchableOpacity>
        </View>

        {products.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No hay productos registrados.</Text>
            <Text style={styles.emptySubtext}>
              Pulsa "+ Nuevo" para agregar el primero.
            </Text>
          </View>
        ) : (
          products.map((product) => {
            const lowStock = product.stock < 5;

            return (
              <View
                key={product.id}
                style={[styles.card, lowStock && styles.cardLowStock]}
              >
                <View style={styles.cardContent}>
                  <View style={styles.cardTopRow}>
                    <Text style={styles.productName}>{product.name}</Text>
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryBadgeText}>
                        {product.category}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.productDetails}>
                    <Text style={styles.productPrice}>
                      {product.price.toFixed(2)} {'€'}
                    </Text>
                    <Text style={styles.productDot}>{'·'}</Text>
                    <View style={styles.stockRow}>
                      {lowStock && (
                        <View style={styles.lowStockDot} />
                      )}
                      <Text
                        style={[
                          styles.productStock,
                          lowStock && styles.productStockLow,
                        ]}
                      >
                        Stock: {product.stock}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => openEditModal(product)}
                  >
                    <Text style={styles.editButtonText}>Editar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDelete(product)}
                  >
                    <Text style={styles.deleteButtonText}>Eliminar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Add / Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingProduct ? 'Editar producto' : 'Nuevo producto'}
            </Text>

            {/* Name */}
            <Text style={styles.label}>Nombre</Text>
            <TextInput
              style={[styles.input, nameFocused && styles.inputFocused]}
              value={name}
              onChangeText={setName}
              placeholder="Ej. Champu anticaspa"
              placeholderTextColor={MUTED}
              onFocus={() => setNameFocused(true)}
              onBlur={() => setNameFocused(false)}
            />

            {/* Price */}
            <Text style={styles.label}>Precio ({'€'})</Text>
            <TextInput
              style={[styles.input, priceFocused && styles.inputFocused]}
              value={price}
              onChangeText={setPrice}
              placeholder="Ej. 12.50"
              placeholderTextColor={MUTED}
              keyboardType="decimal-pad"
              onFocus={() => setPriceFocused(true)}
              onBlur={() => setPriceFocused(false)}
            />

            {/* Stock */}
            <Text style={styles.label}>Stock</Text>
            <TextInput
              style={[styles.input, stockFocused && styles.inputFocused]}
              value={stock}
              onChangeText={setStock}
              placeholder="Ej. 20"
              placeholderTextColor={MUTED}
              keyboardType="number-pad"
              onFocus={() => setStockFocused(true)}
              onBlur={() => setStockFocused(false)}
            />

            {/* Category */}
            <Text style={styles.label}>Categoria</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoryScroll}
              contentContainerStyle={styles.categoryRow}
            >
              {CATEGORY_OPTIONS.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryChip,
                    category === cat && styles.categoryChipActive,
                  ]}
                  onPress={() => setCategory(cat)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      category === cat && styles.categoryChipTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Buttons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={closeModal}
                disabled={saving}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={BG} />
                ) : (
                  <Text style={styles.saveButtonText}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  center: {
    flex: 1,
    backgroundColor: BG,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: TEXT_C,
  },
  addButton: {
    backgroundColor: GOLD,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  addButtonText: {
    color: BG,
    fontWeight: '700',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    color: MUTED,
    fontSize: 16,
    marginBottom: 6,
  },
  emptySubtext: {
    color: MUTED,
    fontSize: 13,
  },
  // Card
  card: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    marginBottom: 12,
  },
  cardLowStock: {
    borderColor: WARNING,
  },
  cardContent: {
    marginBottom: 12,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  productName: {
    color: TEXT_C,
    fontSize: 17,
    fontWeight: '600',
    flexShrink: 1,
    marginRight: 10,
  },
  categoryBadge: {
    backgroundColor: BG,
    borderWidth: 1,
    borderColor: GOLD,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  categoryBadgeText: {
    color: GOLD,
    fontSize: 12,
    fontWeight: '600',
  },
  productDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productPrice: {
    color: GOLD,
    fontSize: 15,
    fontWeight: '600',
  },
  productDot: {
    color: MUTED,
    marginHorizontal: 8,
    fontSize: 14,
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lowStockDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: WARNING,
    marginRight: 6,
  },
  productStock: {
    color: MUTED,
    fontSize: 14,
  },
  productStockLow: {
    color: WARNING,
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  editButton: {
    borderWidth: 1,
    borderColor: GOLD,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  editButtonText: {
    color: GOLD,
    fontSize: 13,
    fontWeight: '600',
  },
  deleteButton: {
    borderWidth: 1,
    borderColor: '#FF4444',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  deleteButtonText: {
    color: '#FF4444',
    fontSize: 13,
    fontWeight: '600',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: SURFACE,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
  },
  modalTitle: {
    color: TEXT_C,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
  },
  label: {
    color: MUTED,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    padding: 14,
    color: TEXT_C,
    fontSize: 15,
    marginBottom: 16,
  },
  inputFocused: {
    borderColor: GOLD,
  },
  categoryScroll: {
    marginBottom: 24,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryChip: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: BG,
  },
  categoryChipActive: {
    borderColor: GOLD,
    backgroundColor: GOLD,
  },
  categoryChipText: {
    color: MUTED,
    fontSize: 14,
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: BG,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: MUTED,
    fontSize: 15,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: GOLD,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonText: {
    color: BG,
    fontSize: 15,
    fontWeight: '700',
  },
});
