import { useEffect, useState } from 'react'
import { getAllUsers, updateUserRole } from '../../services/users'
import { getAllBarbershops } from '../../services/barbershops'
import { User, UserRole, Barbershop } from '../../types'
import styles from './UsersPage.module.css'

const ROLE_LABELS: Record<UserRole, string> = {
  client: 'Cliente',
  barber: 'Barbero',
  owner: 'Dueño',
  developer: 'Developer',
}

const ROLE_ORDER: UserRole[] = ['developer', 'owner', 'barber', 'client']

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [barbershops, setBarbershops] = useState<Barbershop[]>([])
  const [loading, setLoading] = useState(true)
  const [editingUid, setEditingUid] = useState<string | null>(null)
  const [editRole, setEditRole] = useState<UserRole>('client')
  const [editBarbershopId, setEditBarbershopId] = useState('')
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  const load = async () => {
    setLoading(true)
    const [u, b] = await Promise.all([getAllUsers(), getAllBarbershops()])
    setUsers(u)
    setBarbershops(b)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const startEdit = (user: User) => {
    setEditingUid(user.uid)
    setEditRole(user.role)
    setEditBarbershopId(user.barbershopId ?? '')
  }

  const saveEdit = async () => {
    if (!editingUid) return
    setSaving(true)
    const needsBarbershop = editRole === 'barber' || editRole === 'owner'
    await updateUserRole(editingUid, editRole, needsBarbershop ? editBarbershopId : undefined)
    await load()
    setEditingUid(null)
    setSaving(false)
  }

  const filtered = users.filter(u =>
    u.displayName.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role))

  const roleColor: Record<UserRole, string> = {
    developer: '#fff',
    owner: '#c9a84c',
    barber: '#60a5fa',
    client: '#666',
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Usuarios</h1>
          <p className={styles.sub}>{users.length} usuarios registrados</p>
        </div>
        <input
          className={styles.search}
          placeholder="Buscar por nombre o email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className={styles.loading}>Cargando...</div>
      ) : (
        <div className={styles.table}>
          <div className={styles.tableHead}>
            <span>Usuario</span>
            <span>Email</span>
            <span>Rol</span>
            <span>Barbería</span>
            <span>Acciones</span>
          </div>

          {filtered.map(user => (
            <div key={user.uid} className={styles.row}>
              <div className={styles.userCell}>
                {user.photoURL
                  ? <img src={user.photoURL} alt="" className={styles.avatar} />
                  : <div className={styles.avatarFallback}>{user.displayName[0]}</div>
                }
                <span className={styles.userName}>{user.displayName}</span>
              </div>

              <span className={styles.email}>{user.email}</span>

              {editingUid === user.uid ? (
                <select
                  className={styles.roleSelect}
                  value={editRole}
                  onChange={e => setEditRole(e.target.value as UserRole)}
                >
                  {ROLE_ORDER.map(r => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
              ) : (
                <span className={styles.roleBadge} style={{ color: roleColor[user.role] }}>
                  {ROLE_LABELS[user.role]}
                </span>
              )}

              {editingUid === user.uid ? (
                (editRole === 'barber' || editRole === 'owner') ? (
                  <select
                    className={styles.roleSelect}
                    value={editBarbershopId}
                    onChange={e => setEditBarbershopId(e.target.value)}
                  >
                    <option value="">Sin asignar</option>
                    {barbershops.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                ) : <span className={styles.email}>—</span>
              ) : (
                <span className={styles.email}>
                  {user.barbershopId
                    ? barbershops.find(b => b.id === user.barbershopId)?.name ?? '—'
                    : '—'
                  }
                </span>
              )}

              <div className={styles.actions}>
                {editingUid === user.uid ? (
                  <>
                    <button className={styles.saveBtn} onClick={saveEdit} disabled={saving}>
                      {saving ? '...' : 'Guardar'}
                    </button>
                    <button className={styles.cancelBtn} onClick={() => setEditingUid(null)}>
                      Cancelar
                    </button>
                  </>
                ) : (
                  <button className={styles.editBtn} onClick={() => startEdit(user)}>
                    Editar rol
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
