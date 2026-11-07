import React, { useCallback, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import ErrorBanner from '../components/ErrorBanner';
import ErrorState from '../components/ErrorState';
import LoadingState from '../components/LoadingState';
import PrimaryButton from '../components/PrimaryButton';
import SubjectFormModal from '../components/SubjectFormModal';

import { useData } from '../context/DataContext';
import {
  createSubject,
  deleteSubject,
  getAllSubjectsWithTaskCounts,
  updateSubject,
} from '../database';
import {
  createRequestGate,
  shouldApplyLoadResult,
} from '../utils/asyncLoad';

const theme = {
  background: '#F7F7FC',
  surface: '#FFFFFF',
  purple: '#6D4AFF',
  purpleDark: '#392278',
  soft: '#EEE9FF',
  text: '#25223B',
  muted: '#686278',
  border: '#E8E5F1',
  red: '#BA394E',
};

function SubjectItem({ subject, disabled, onEdit, onDelete }) {
  const count = Number(subject.taskCount) || 0;

  const initials = subject.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();

  return (
    <View style={styles.subjectCard}>
      <View
        style={[
          styles.subjectAccent,
          { backgroundColor: subject.color || theme.purple },
        ]}
      />

      <View style={styles.cardBody}>
        <View style={styles.subjectTop}>
          <View
            style={[
              styles.subjectIcon,
              { borderColor: subject.color || theme.purple },
            ]}
          >
            <Text style={styles.initials}>{initials}</Text>
          </View>

          <View style={styles.flex}>
            <Text style={styles.subjectName}>{subject.name}</Text>
            <Text style={styles.subjectCode}>
              {subject.code || 'No subject code'}
            </Text>
          </View>
        </View>

        <View style={styles.taskInfo}>
          <View
            style={[
              styles.subjectDot,
              { backgroundColor: subject.color || theme.purple },
            ]}
          />
          <Text style={styles.taskCount}>
            {count} linked {count === 1 ? 'task' : 'tasks'}
          </Text>
        </View>

        <View style={styles.cardActions}>
          <Pressable
            onPress={onEdit}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={`Edit ${subject.name}`}
            accessibilityState={{ disabled }}
            style={({ pressed }) => [
              styles.editButton,
              disabled && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.editText}>Edit subject</Text>
          </Pressable>

          <Pressable
            onPress={onDelete}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={`Delete ${subject.name}`}
            accessibilityState={{ disabled }}
            style={({ pressed }) => [
              styles.deleteButton,
              disabled && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.deleteText}>Delete</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export default function SubjectsScreen() {
  const { ready, refreshKey, refresh } = useData();

  const [subjects, setSubjects] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const gateRef = useRef(createRequestGate());
  const activeRef = useRef(false);
  const deletingRef = useRef(false);

  const load = useCallback(async () => {
    if (!ready || !activeRef.current) return;

    const requestId = gateRef.current.next();

    const canApply = () =>
      shouldApplyLoadResult(
        requestId,
        gateRef.current.getLatest(),
        activeRef.current,
      );

    try {
      const rows = await getAllSubjectsWithTaskCounts();

      if (!canApply()) return;

      setSubjects(rows);
      setHasLoaded(true);
      setError(null);
    } catch (err) {
      if (!canApply()) return;
      setError(err?.message || 'Could not load subjects.');
    } finally {
      if (canApply()) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [ready]);

  useFocusEffect(
    useCallback(() => {
      activeRef.current = true;
      load();

      return () => {
        activeRef.current = false;
        gateRef.current.next();
      };
    }, [load, refreshKey]),
  );

  const openAdd = () => {
    if (deletingRef.current || deleteTarget || formVisible) return;

    setEditing(null);
    setFormVisible(true);
  };

  const openEdit = (subject) => {
    if (deletingRef.current || deleteTarget || formVisible) return;

    setEditing(subject);
    setFormVisible(true);
  };

  const requestDelete = (subject) => {
    if (deletingRef.current || deleteTarget || formVisible) return;

    if (Number(subject.taskCount) > 0) {
      Alert.alert(
        'Subject has linked tasks',
        `Reassign or delete the tasks linked to "${subject.name}" before deleting this subject.`,
      );
      return;
    }

    setDeleteTarget(subject);
  };

  const onSubmit = async (values) => {
    if (editing) {
      await updateSubject(editing.id, values);
    } else {
      await createSubject(values);
    }

    refresh();
  };

  const confirmDelete = async () => {
    if (!deleteTarget || deletingRef.current) return;

    deletingRef.current = true;
    setDeleting(true);

    try {
      // The repository also checks linked tasks before deleting.
      await deleteSubject(deleteTarget.id);

      if (activeRef.current) {
        setDeleteTarget(null);
      }

      refresh();
    } catch (err) {
      if (activeRef.current) {
        setDeleteTarget(null);

        Alert.alert(
          'Cannot delete subject',
          err?.message || 'Please try again.',
        );
      }
    } finally {
      deletingRef.current = false;

      if (activeRef.current) {
        setDeleting(false);
      }
    }
  };

  const query = search.trim().toLowerCase();

  const filteredSubjects = subjects.filter((subject) => {
    const name = (subject.name || '').toLowerCase();
    const code = (subject.code || '').toLowerCase();

    return name.includes(query) || code.includes(query);
  });

  const totalTasks = subjects.reduce(
    (total, subject) => total + (Number(subject.taskCount) || 0),
    0,
  );

  const subjectsWithTasks = subjects.filter(
    (subject) => Number(subject.taskCount) > 0,
  ).length;

  const actionsDisabled =
    deleting || formVisible || Boolean(deleteTarget);

  if (!ready || (loading && !hasLoaded)) {
    return <LoadingState message="Loading your subjects…" />;
  }

  if (error && !hasLoaded) {
    return <ErrorState message={error} onRetry={load} />;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={filteredSubjects}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          load();
        }}
        ListHeaderComponent={
          <View>
            <View style={styles.hero}>
              <Text style={styles.eyebrow}>A PLACE FOR EVERY MODULE</Text>
              <Text style={styles.title}>Your subjects</Text>
              <Text style={styles.subtitle}>
                Organise your learning, one subject at a time.
              </Text>

              <View style={styles.heroStats}>
                <View style={styles.heroStat}>
                  <Text style={styles.heroNumber}>
                    {subjects.length}
                  </Text>
                  <Text style={styles.heroLabel}>Subjects</Text>
                </View>

                <View style={styles.heroStat}>
                  <Text style={styles.heroNumber}>{totalTasks}</Text>
                  <Text style={styles.heroLabel}>Linked tasks</Text>
                </View>

                <View style={styles.heroStat}>
                  <Text style={styles.heroNumber}>
                    {subjectsWithTasks}
                  </Text>
                  <Text style={styles.heroLabel}>With tasks</Text>
                </View>
              </View>
            </View>

            <ErrorBanner message={error} onRetry={load} />

            <PrimaryButton
              title="+ Add Subject"
              onPress={openAdd}
              disabled={actionsDisabled}
              style={styles.addButton}
            />

            <View style={styles.searchBox}>
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search subject name or code..."
                placeholderTextColor={theme.muted}
                style={styles.searchInput}
                autoCorrect={false}
                returnKeyType="search"
                accessibilityLabel="Search subjects by name or code"
              />

              {search.length > 0 ? (
                <Pressable
                  onPress={() => setSearch('')}
                  accessibilityRole="button"
                  accessibilityLabel="Clear subject search"
                  style={styles.clearButton}
                >
                  <Text style={styles.clearSymbol}>×</Text>
                </Pressable>
              ) : null}
            </View>

            <View style={styles.resultsRow}>
              <View style={styles.flex}>
                <Text style={styles.sectionTitle}>
                  {query ? 'Search results' : 'All subjects'}
                </Text>

                <Text style={styles.resultsText}>
                  {filteredSubjects.length} of {subjects.length} subjects
                </Text>
              </View>

              <View style={styles.countBadge}>
                <Text style={styles.badgeText}>
                  {filteredSubjects.length}
                </Text>
              </View>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <SubjectItem
            subject={item}
            disabled={actionsDisabled}
            onEdit={() => openEdit(item)}
            onDelete={() => requestDelete(item)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <EmptyState
              icon={query ? 'search-outline' : 'library-outline'}
              title={query ? 'No matching subjects' : 'Start with a subject'}
              message={
                query
                  ? 'Try another subject name or code.'
                  : 'Add your subjects, then link assignments, exams and study tasks.'
              }
            />

            {query ? (
              <PrimaryButton
                title="Clear search"
                variant="secondary"
                onPress={() => setSearch('')}
              />
            ) : null}
          </View>
        }
      />

      <SubjectFormModal
        visible={formVisible}
        mode={editing ? 'edit' : 'add'}
        initialValues={editing}
        existingSubjects={subjects}
        onSubmit={onSubmit}
        onClose={() => setFormVisible(false)}
      />

      <ConfirmDialog
        visible={Boolean(deleteTarget)}
        title="Delete subject?"
        message={
          deleteTarget
            ? `Delete "${deleteTarget.name}"? This cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        danger
        loading={deleting}
        onCancel={() => {
          if (!deletingRef.current) {
            setDeleteTarget(null);
          }
        }}
        onConfirm={confirmDelete}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.background,
  },
  list: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 36,
  },
  flex: {
    flex: 1,
  },
  hero: {
    padding: 22,
    borderRadius: 24,
    backgroundColor: theme.purpleDark,
    marginBottom: 16,
  },
  eyebrow: {
    color: '#DDD3FF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.1,
    marginBottom: 10,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    color: '#E6DFFF',
    fontSize: 13,
    lineHeight: 21,
    marginTop: 7,
  },
  heroStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 22,
  },
  heroStat: {
    flexGrow: 1,
    flexBasis: 65,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#50378F',
  },
  heroNumber: {
    color: '#FFFFFF',
    fontSize: 23,
    fontWeight: '800',
  },
  heroLabel: {
    color: '#EEE8FF',
    fontSize: 11,
    marginTop: 5,
  },
  addButton: {
    marginBottom: 16,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 15,
    minHeight: 52,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 15,
    paddingVertical: 13,
    color: theme.text,
    fontSize: 14,
  },
  clearButton: {
    minWidth: 44,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearSymbol: {
    color: theme.muted,
    fontSize: 25,
  },
  resultsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 23,
    marginBottom: 16,
  },
  sectionTitle: {
    color: theme.text,
    fontSize: 18,
    fontWeight: '700',
  },
  resultsText: {
    color: theme.muted,
    fontSize: 12,
    marginTop: 5,
  },
  countBadge: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 11,
    backgroundColor: theme.soft,
  },
  badgeText: {
    color: theme.purpleDark,
    fontSize: 12,
    fontWeight: '700',
  },
  subjectCard: {
    flexDirection: 'row',
    borderRadius: 19,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
    marginBottom: 14,
    overflow: 'hidden',
  },
  subjectAccent: {
    width: 5,
  },
  cardBody: {
    flex: 1,
    padding: 17,
  },
  subjectTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  subjectIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    borderWidth: 2,
    backgroundColor: theme.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: theme.purpleDark,
    fontSize: 17,
    fontWeight: '800',
  },
  subjectName: {
    color: theme.text,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 23,
  },
  subjectCode: {
    color: theme.muted,
    fontSize: 12,
    marginTop: 4,
  },
  taskInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 17,
  },
  subjectDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  taskCount: {
    color: theme.muted,
    fontSize: 12,
  },
  cardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
  },
  editButton: {
    flexGrow: 1,
    flexBasis: 110,
    minHeight: 44,
    paddingHorizontal: 13,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: theme.soft,
  },
  editText: {
    color: theme.purpleDark,
    fontSize: 12,
    fontWeight: '700',
  },
  deleteButton: {
    minWidth: 85,
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#FFF0F2',
  },
  deleteText: {
    color: theme.red,
    fontSize: 12,
    fontWeight: '700',
  },
  emptyCard: {
    padding: 16,
    backgroundColor: theme.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.border,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.75,
  },
});