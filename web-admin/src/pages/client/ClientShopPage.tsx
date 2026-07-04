import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAllBarbershops } from '../../services/barbershops'
import { getProductsByBarbershop } from '../../services/inventory'
import { useWebCart } from '../../contexts/WebCartContext'
import { Barbershop, Product } from '../../types'
import styles from './ClientShopPage.module.css'

export default function ClientShopPage() {
  const navigate = useNavigate()
  const { addItem, items } = useWebCart()

  const [barbershops, setBarbershops] = useState<Barbershop[]>([])
  const [selectedBarbershopId, setSelectedBarbershopId] = useState<string>('')
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingProducts, setLoadingProducts] = useState(false)

  const cartCount = items.reduce((sum, i) => sum + i.quantity, 0)

  useEffect(() => {
    setLoading(true)
    getAllBarbershops()
      .then(list => {
        setBarbershops(list)
        if (list.length === 1) setSelectedBarbershopId(list[0].id)
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedBarbershopId) return
    setLoadingProducts(true)
    getProductsByBarbershop(selectedBarbershopId)
      .then(setProducts)
      .finally(() => setLoadingProducts(false))
  }, [selectedBarbershopId])

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleAdd = (product: Product) => {
    addItem(
      {
        productId: product.id,
        name: product.name,
        price: product.price,
        maxStock: product.stock,
      },
      selectedBarbershopId
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Tienda</h1>
        {cartCount > 0 && (
          <button className={styles.cartFloating} onClick={() => navigate('/client/cart')}>
            🛒 <span className={styles.cartBadge}>{cartCount}</span>
          </button>
        )}
      </div>

      {/* Selector de barbería */}
      <div className={styles.selectWrap}>
        <label className={styles.selectLabel}>Barbería</label>
        {loading ? (
          <p className={styles.muted}>Cargando barberías...</p>
        ) : (
          <select
            className={styles.select}
            value={selectedBarbershopId}
            onChange={e => { setSelectedBarbershopId(e.target.value); setSearch('') }}
          >
            <option value="">-- Selecciona una barbería --</option>
            {barbershops.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        )}
      </div>

      {selectedBarbershopId && (
        <>
          {/* Buscador */}
          <div className={styles.searchWrap}>
            <span className={styles.searchIcon}>🔍</span>
            <input
              className={styles.searchInput}
              placeholder="Buscar producto..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Grid de productos */}
          {loadingProducts ? (
            <p className={styles.muted}>Cargando productos...</p>
          ) : filtered.length === 0 ? (
            <div className={styles.empty}>
              <span>📦</span>
              <p>No hay productos disponibles</p>
            </div>
          ) : (
            <div className={styles.grid}>
              {filtered.map(product => (
                <div key={product.id} className={styles.productCard}>
                  {product.photoURL && (
                    <img src={product.photoURL} alt={product.name} className={styles.productImg} />
                  )}
                  {!product.photoURL && (
                    <div className={styles.productImgPlaceholder}>📦</div>
                  )}
                  <div className={styles.productBody}>
                    <p className={styles.productCategory}>{product.category}</p>
                    <h3 className={styles.productName}>{product.name}</h3>
                    {product.description && (
                      <p className={styles.productDesc}>{product.description}</p>
                    )}
                    <div className={styles.productFooter}>
                      <span className={styles.productPrice}>{product.price.toFixed(2)} €</span>
                      <span className={product.stock > 0 ? styles.stockOk : styles.stockOut}>
                        {product.stock > 0 ? `Stock: ${product.stock}` : 'Sin stock'}
                      </span>
                    </div>
                    <button
                      className={styles.addBtn}
                      onClick={() => handleAdd(product)}
                      disabled={product.stock === 0}
                    >
                      {product.stock === 0 ? 'Sin stock' : '+ Añadir al carrito'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {!selectedBarbershopId && !loading && (
        <div className={styles.empty}>
          <span>🏪</span>
          <p>Selecciona una barbería para ver sus productos</p>
        </div>
      )}
    </div>
  )
}
