import { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Alert,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { apiGet, apiPut } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { SPACING, RADIUS } from '../theme';

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg: '#0F0F13',
  surface: '#1A1A22',
  surfaceHigh: '#24242F',
  border: '#2E2E3E',
  borderLight: '#3A3A4E',
  text: '#F0F0F8',
  textMuted: '#8888A8',
  textDim: '#55556A',
  primary: '#6366F1',       // indigo
  primaryDim: '#6366F115',
  primaryBorder: '#6366F140',
  green: '#22C55E',
  greenDim: '#22C55E18',
  greenBorder: '#22C55E40',
  red: '#EF4444',
  redDim: '#EF444418',
  redBorder: '#EF444440',
  orange: '#F97316',
  orangeDim: '#F9731618',
  purple: '#A855F7',
  purpleDim: '#A855F718',
  teal: '#14B8A6',
  tealDim: '#14B8A618',
};

const ROLE_META = {
  admin:            { label: 'Admin',             color: C.purple,  dim: C.purpleDim, icon: '👑' },
  facility_manager: { label: 'Facility Manager',  color: C.primary, dim: C.primaryDim, icon: '🏢' },
  worker:           { label: 'Worker',            color: C.orange,  dim: C.orangeDim, icon: '🛠️' },
  community_member: { label: 'Community Member',  color: C.teal,    dim: C.tealDim, icon: '🎓' },
};

const ALL_ROLES   = ['all', 'admin', 'facility_manager', 'worker', 'community_member'];
const ALL_STATUSES = ['all', 'active', 'inactive'];

const AVATAR_PALETTE = ['#6366F1','#A855F7','#14B8A6','#F97316','#22C55E','#EF4444','#3B82F6'];
function avatarColor(id = '') {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
}

function timeAgo(dateStr) {
  const d = Math.floor((Date.now() - new Date(dateStr)) / 86400000);
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  if (d < 30) return `${d}d ago`;
  if (d < 365) return `${Math.floor(d / 30)}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function AdminDashboardScreen() {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();

  const [users, setUsers]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]         = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  const [search, setSearch]           = useState('');
  const [roleFilter, setRoleFilter]   = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);

  // ── Data fetching ────────────────────────────────────────────────────────
  async function load() {
    try {
      setError(null);
      const data = await apiGet('/admin/users');
      setUsers(data.users);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { load(); }, []));
  function onRefresh() { setRefreshing(true); load(); }

  // ── Stats ────────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:    users.length,
    active:   users.filter(u => u.status === 'active').length,
    inactive: users.filter(u => u.status === 'inactive').length,
    workers:  users.filter(u => u.role === 'worker').length,
    managers: users.filter(u => u.role === 'facility_manager').length,
  }), [users]);

  // ── Filtered list ────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter(u => {
      const matchRole   = roleFilter === 'all'   || u.role   === roleFilter;
      const matchStatus = statusFilter === 'all' || u.status === statusFilter;
      const matchSearch = !q
        || u.full_name?.toLowerCase().includes(q)
        || u.email?.toLowerCase().includes(q);
      return matchRole && matchStatus && matchSearch;
    });
  }, [users, search, roleFilter, statusFilter]);

  // ── Toggle status ────────────────────────────────────────────────────────
  async function confirmToggle(u) {
    if (u.id === user.id) {
      Alert.alert('Not allowed', 'You cannot deactivate your own admin account.');
      return;
    }
    const next = u.status === 'active' ? 'inactive' : 'active';
    const action = next === 'active' ? 'Activate' : 'Deactivate';
    Alert.alert(
      `${action} Account`,
      `${action} ${u.full_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action,
          style: next === 'inactive' ? 'destructive' : 'default',
          onPress: () => toggleStatus(u, next),
        },
      ]
    );
  }

  async function toggleStatus(u, next) {
    try {
      setTogglingId(u.id);
      const data = await apiPut(`/admin/users/${u.id}/status`, { status: next });
      setUsers(prev => prev.map(x => x.id === u.id ? data.user : x));
      if (selectedUser?.id === u.id) setSelectedUser(data.user);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setTogglingId(null);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={styles.loadingText}>Loading users…</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerEyebrow}>System Admin</Text>
          <Text style={styles.headerTitle}>User Management</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable onPress={onRefresh} style={styles.iconBtn}>
            <Text style={styles.iconBtnText}>↻</Text>
          </Pressable>
          <Pressable onPress={logout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Log out</Text>
          </Pressable>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={u => u.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />
        }
        ListHeaderComponent={
          <>
            {/* ── Stats ── */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsRow}>
              <StatCard label="Total"    value={stats.total}    color={C.primary} icon="👥" />
              <StatCard label="Active"   value={stats.active}   color={C.green}   icon="✅" />
              <StatCard label="Inactive" value={stats.inactive} color={C.red}     icon="🚫" />
              <StatCard label="Workers"  value={stats.workers}  color={C.orange}  icon="🛠️" />
              <StatCard label="Managers" value={stats.managers} color={C.purple}  icon="🏢" />
            </ScrollView>

            {/* ── Error ── */}
            {error && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>⚠️  {error}</Text>
                <Pressable onPress={load}><Text style={styles.retryText}>Retry</Text></Pressable>
              </View>
            )}

            {/* ── Search ── */}
            <View style={styles.searchWrap}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name or email…"
                placeholderTextColor={C.textDim}
                value={search}
                onChangeText={setSearch}
                clearButtonMode="while-editing"
              />
              {search.length > 0 && (
                <Pressable onPress={() => setSearch('')} style={styles.clearBtn}>
                  <Text style={styles.clearBtnText}>✕</Text>
                </Pressable>
              )}
            </View>

            {/* ── Role filter ── */}
            <Text style={styles.filterLabel}>Role</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {ALL_ROLES.map(r => {
                const active = roleFilter === r;
                const meta   = ROLE_META[r];
                const color  = meta?.color ?? C.primary;
                return (
                  <Pressable
                    key={r}
                    onPress={() => setRoleFilter(r)}
                    style={[styles.chip, active && { backgroundColor: color + '25', borderColor: color }]}
                  >
                    {meta && <Text style={styles.chipIcon}>{meta.icon}</Text>}
                    <Text style={[styles.chipText, active && { color }]}>
                      {r === 'all' ? 'All Roles' : (meta?.label ?? r)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* ── Status filter ── */}
            <Text style={styles.filterLabel}>Status</Text>
            <View style={styles.filterRow}>
              {ALL_STATUSES.map(s => {
                const active = statusFilter === s;
                const color  = s === 'active' ? C.green : s === 'inactive' ? C.red : C.primary;
                return (
                  <Pressable
                    key={s}
                    onPress={() => setStatusFilter(s)}
                    style={[styles.chip, active && { backgroundColor: color + '25', borderColor: color }]}
                  >
                    {s !== 'all' && (
                      <View style={[styles.statusDot, { backgroundColor: color }]} />
                    )}
                    <Text style={[styles.chipText, active && { color }]}>
                      {s === 'all' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* ── Results count ── */}
            <Text style={styles.resultsLabel}>
              {filtered.length} {filtered.length === 1 ? 'user' : 'users'}
              {(search || roleFilter !== 'all' || statusFilter !== 'all') ? ' matching' : ' total'}
            </Text>
          </>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyTitle}>No users found</Text>
            <Text style={styles.emptySubtitle}>Try adjusting your search or filters.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <UserCard
            user={item}
            isSelf={item.id === user.id}
            toggling={togglingId === item.id}
            onPress={() => setSelectedUser(item)}
            onToggle={() => confirmToggle(item)}
          />
        )}
      />

      {/* ── User Detail Modal ── */}
      <UserDetailModal
        user={selectedUser}
        isSelf={selectedUser?.id === user.id}
        toggling={togglingId === selectedUser?.id}
        onClose={() => setSelectedUser(null)}
        onToggle={() => selectedUser && confirmToggle(selectedUser)}
      />
    </View>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, color, icon }) {
  return (
    <View style={[statStyles.card, { borderColor: color + '40' }]}>
      <View style={[statStyles.iconWrap, { backgroundColor: color + '20' }]}>
        <Text style={statStyles.icon}>{icon}</Text>
      </View>
      <Text style={[statStyles.value, { color }]}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  card: {
    width: 100, alignItems: 'center',
    backgroundColor: C.surfaceHigh,
    borderRadius: RADIUS.lg, borderWidth: 1,
    padding: SPACING.md, marginRight: SPACING.sm,
  },
  iconWrap: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  icon:  { fontSize: 18 },
  value: { fontSize: 22, fontWeight: '800', marginBottom: 2 },
  label: { fontSize: 10, color: C.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
});

// ─── UserCard ─────────────────────────────────────────────────────────────────
function UserCard({ user: u, isSelf, toggling, onPress, onToggle }) {
  const meta     = ROLE_META[u.role] ?? ROLE_META.community_member;
  const isActive = u.status === 'active';
  const aColor   = avatarColor(u.id);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [cardStyles.card, pressed && cardStyles.pressed]}>
      {/* Left accent */}
      <View style={[cardStyles.accent, { backgroundColor: meta.color }]} />

      <View style={cardStyles.body}>
        <View style={cardStyles.topRow}>
          {/* Avatar */}
          <View style={[cardStyles.avatar, { backgroundColor: aColor }]}>
            <Text style={cardStyles.avatarText}>{u.full_name?.charAt(0).toUpperCase() ?? '?'}</Text>
          </View>

          {/* Info */}
          <View style={{ flex: 1 }}>
            <View style={cardStyles.nameRow}>
              <Text style={cardStyles.name} numberOfLines={1}>{u.full_name}</Text>
              <View style={[cardStyles.statusDot, { backgroundColor: isActive ? C.green : C.red }]} />
            </View>
            <Text style={cardStyles.email} numberOfLines={1}>{u.email}</Text>
          </View>
        </View>

        <View style={cardStyles.bottomRow}>
          {/* Role badge */}
          <View style={[cardStyles.roleBadge, { backgroundColor: meta.dim, borderColor: meta.color + '50' }]}>
            <Text style={cardStyles.roleBadgeIcon}>{meta.icon}</Text>
            <Text style={[cardStyles.roleBadgeText, { color: meta.color }]}>{meta.label}</Text>
          </View>

          {/* Status badge */}
          <View style={[cardStyles.statusBadge, isActive
            ? { backgroundColor: C.greenDim, borderColor: C.greenBorder }
            : { backgroundColor: C.redDim, borderColor: C.redBorder }]}>
            <Text style={[cardStyles.statusText, { color: isActive ? C.green : C.red }]}>
              {isActive ? 'Active' : 'Inactive'}
            </Text>
          </View>

          <Text style={cardStyles.date}>{timeAgo(u.created_at)}</Text>
        </View>

        {/* Toggle button — hidden for own account */}
        {isSelf ? (
          <View style={[cardStyles.toggleBtn, cardStyles.selfBtn]}>
            <Text style={cardStyles.selfBtnText}>Your account</Text>
          </View>
        ) : (
          <Pressable
            onPress={onToggle}
            disabled={toggling}
            style={[cardStyles.toggleBtn,
              isActive
                ? { backgroundColor: C.redDim, borderColor: C.redBorder }
                : { backgroundColor: C.greenDim, borderColor: C.greenBorder },
              toggling && cardStyles.disabled,
            ]}
          >
            {toggling
              ? <ActivityIndicator size="small" color={isActive ? C.red : C.green} />
              : <Text style={[cardStyles.toggleText, { color: isActive ? C.red : C.green }]}>
                  {isActive ? 'Deactivate' : 'Activate'}
                </Text>}
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  pressed: { opacity: 0.8 },
  accent:  { width: 3 },
  body:    { flex: 1, padding: SPACING.md },
  topRow:  { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.sm },
  avatar:  {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 18 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  name:    { fontSize: 15, fontWeight: '700', color: C.text, flex: 1 },
  statusDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  email:   { fontSize: 12, color: C.textMuted },

  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm, flexWrap: 'wrap' },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: RADIUS.full, borderWidth: 1,
  },
  roleBadgeIcon: { fontSize: 11 },
  roleBadgeText: { fontSize: 11, fontWeight: '700' },
  statusBadge: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: RADIUS.full, borderWidth: 1,
  },
  statusText: { fontSize: 11, fontWeight: '700' },
  date:    { fontSize: 11, color: C.textDim, marginLeft: 'auto' },

  toggleBtn: {
    paddingVertical: 9, borderRadius: RADIUS.md,
    alignItems: 'center', borderWidth: 1, minHeight: 36,
  },
  toggleText: { fontSize: 13, fontWeight: '700' },
  disabled:   { opacity: 0.5 },
  selfBtn:    { backgroundColor: C.surfaceHigh, borderColor: C.border },
  selfBtnText: { fontSize: 12, color: C.textDim, fontWeight: '600' },
});

// ─── UserDetailModal ──────────────────────────────────────────────────────────
function UserDetailModal({ user: u, isSelf, toggling, onClose, onToggle }) {
  if (!u) return null;
  const meta     = ROLE_META[u.role] ?? ROLE_META.community_member;
  const isActive = u.status === 'active';
  const aColor   = avatarColor(u.id);

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={modalStyles.overlay} onPress={onClose}>
        <Pressable style={modalStyles.sheet} onPress={() => {}}>

          {/* Handle */}
          <View style={modalStyles.handle} />

          {/* Avatar + name */}
          <View style={modalStyles.avatarWrap}>
            <View style={[modalStyles.avatar, { backgroundColor: aColor }]}>
              <Text style={modalStyles.avatarText}>{u.full_name?.charAt(0).toUpperCase() ?? '?'}</Text>
            </View>
            <View style={[modalStyles.statusRing, { borderColor: isActive ? C.green : C.red }]} />
          </View>
          <Text style={modalStyles.name}>{u.full_name}</Text>
          <Text style={modalStyles.email}>{u.email}</Text>

          {/* Detail rows */}
          <View style={modalStyles.detailsCard}>
            <DetailRow icon={meta.icon}  label="Role"    value={meta.label}   valueColor={meta.color} />
            <View style={modalStyles.divider} />
            <DetailRow
              icon={isActive ? '✅' : '🚫'}
              label="Status"
              value={isActive ? 'Active' : 'Inactive'}
              valueColor={isActive ? C.green : C.red}
            />
            <View style={modalStyles.divider} />
            <DetailRow icon="🗓️" label="Joined"   value={new Date(u.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} />
            <View style={modalStyles.divider} />
            <DetailRow icon="🆔" label="User ID"  value={u.id.slice(0, 8) + '…'} mono />
          </View>

          {/* Action button — disabled for own account */}
          {isSelf ? (
            <View style={[modalStyles.actionBtn, modalStyles.selfActionBtn]}>
              <Text style={modalStyles.selfActionText}>🔒  You cannot deactivate your own account</Text>
            </View>
          ) : (
            <Pressable
              onPress={onToggle}
              disabled={toggling}
              style={[
                modalStyles.actionBtn,
                isActive
                  ? { backgroundColor: C.redDim, borderColor: C.redBorder }
                  : { backgroundColor: C.greenDim, borderColor: C.greenBorder },
                toggling && modalStyles.disabled,
              ]}
            >
              {toggling
                ? <ActivityIndicator color={isActive ? C.red : C.green} />
                : <Text style={[modalStyles.actionBtnText, { color: isActive ? C.red : C.green }]}>
                    {isActive ? '🚫  Deactivate Account' : '✅  Activate Account'}
                  </Text>}
            </Pressable>
          )}

          <Pressable onPress={onClose} style={modalStyles.closeBtn}>
            <Text style={modalStyles.closeBtnText}>Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function DetailRow({ icon, label, value, valueColor, mono }) {
  return (
    <View style={modalStyles.detailRow}>
      <Text style={modalStyles.detailIcon}>{icon}</Text>
      <Text style={modalStyles.detailLabel}>{label}</Text>
      <Text style={[modalStyles.detailValue, valueColor && { color: valueColor }, mono && modalStyles.mono]}
        numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: SPACING.xl, paddingBottom: 40,
    paddingTop: SPACING.md,
    borderTopWidth: 1, borderColor: C.border,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: C.border, alignSelf: 'center', marginBottom: SPACING.lg,
  },
  avatarWrap: { alignSelf: 'center', marginBottom: SPACING.md, position: 'relative' },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 32 },
  statusRing: {
    position: 'absolute', bottom: 0, right: 0,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: C.surface, borderWidth: 3,
  },
  name: { fontSize: 22, fontWeight: '800', color: C.text, textAlign: 'center', marginBottom: 4 },
  email: { fontSize: 14, color: C.textMuted, textAlign: 'center', marginBottom: SPACING.xl },

  detailsCard: {
    backgroundColor: C.surfaceHigh,
    borderRadius: RADIUS.lg, borderWidth: 1, borderColor: C.border,
    marginBottom: SPACING.lg, overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingVertical: 14,
  },
  divider: { height: 1, backgroundColor: C.border, marginHorizontal: SPACING.lg },
  detailIcon: { fontSize: 16, width: 28 },
  detailLabel: { fontSize: 14, color: C.textMuted, flex: 1 },
  detailValue: { fontSize: 14, color: C.text, fontWeight: '600' },
  mono: { fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace', fontSize: 12 },

  actionBtn: {
    paddingVertical: 16, borderRadius: RADIUS.md,
    alignItems: 'center', borderWidth: 1,
    marginBottom: SPACING.sm,
  },
  actionBtnText: { fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.5 },
  selfActionBtn: { backgroundColor: C.surfaceHigh, borderColor: C.border },
  selfActionText: { fontSize: 14, color: C.textDim, fontWeight: '600' },

  closeBtn: {
    paddingVertical: 14, borderRadius: RADIUS.md,
    alignItems: 'center', backgroundColor: C.surfaceHigh,
    borderWidth: 1, borderColor: C.border,
  },
  closeBtnText: { color: C.textMuted, fontWeight: '600', fontSize: 15 },
});

// ─── Screen styles ────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center:    { justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: C.textMuted, marginTop: SPACING.md, fontSize: 14 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: C.surface,
  },
  headerEyebrow: { fontSize: 11, fontWeight: '700', color: C.primary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 },
  headerTitle:   { fontSize: 20, fontWeight: '800', color: C.text },
  headerActions: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'center' },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.surfaceHigh, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  iconBtnText: { color: C.text, fontSize: 18, fontWeight: '700' },
  logoutBtn: {
    paddingHorizontal: SPACING.md, paddingVertical: 8,
    borderRadius: RADIUS.full, borderWidth: 1, borderColor: C.border,
    backgroundColor: C.surfaceHigh,
  },
  logoutText: { color: C.textMuted, fontSize: 12, fontWeight: '600' },

  statsRow: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.sm,
  },

  errorBanner: {
    flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: C.redDim, borderWidth: 1, borderColor: C.redBorder,
    padding: SPACING.md, marginHorizontal: SPACING.lg,
    marginBottom: SPACING.sm, borderRadius: RADIUS.md,
  },
  errorText:  { color: C.red, flex: 1, fontSize: 13 },
  retryText:  { color: C.primary, fontWeight: '700', fontSize: 13 },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: SPACING.lg, marginBottom: SPACING.sm,
    backgroundColor: C.surfaceHigh, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: C.border,
    paddingHorizontal: SPACING.md,
  },
  searchIcon:  { fontSize: 15, marginRight: SPACING.sm },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 14, color: C.text },
  clearBtn:    { padding: 4 },
  clearBtnText: { color: C.textMuted, fontSize: 14 },

  filterLabel: {
    fontSize: 11, fontWeight: '700', color: C.textMuted,
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: 6,
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  filterRow: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
    flexDirection: 'row',
    gap: SPACING.sm,
    flexWrap: 'wrap',
  },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: RADIUS.full, borderWidth: 1,
    borderColor: C.border, backgroundColor: C.surfaceHigh,
  },
  chipIcon: { fontSize: 12 },
  chipText: { fontSize: 12, color: C.textMuted, fontWeight: '600' },
  statusDot: { width: 7, height: 7, borderRadius: 4 },

  resultsLabel: {
    fontSize: 12, color: C.textDim,
    paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm,
    fontWeight: '500',
  },

  listContent: { paddingHorizontal: SPACING.lg, paddingBottom: 40 },

  empty: { alignItems: 'center', marginTop: 80 },
  emptyIcon:     { fontSize: 48, marginBottom: SPACING.md },
  emptyTitle:    { fontSize: 18, fontWeight: '700', color: C.text, marginBottom: SPACING.xs },
  emptySubtitle: { color: C.textMuted, textAlign: 'center' },
});
