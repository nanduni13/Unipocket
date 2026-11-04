import React, { useCallback, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import EmptyState from '../components/EmptyState';
import ErrorBanner from '../components/ErrorBanner';
import ErrorState from '../components/ErrorState';
import LoadingState from '../components/LoadingState';
import PrimaryButton from '../components/PrimaryButton';
import TaskCard from '../components/TaskCard';
import TaskFormModal from '../components/TaskFormModal';

import { useData } from '../context/DataContext';
import { useForegroundAndMidnightRefresh } from '../hooks/useForegroundAndMidnightRefresh';
import {
  createTask,
  getAllSubjects,
  getAssignmentsAndExams,
} from '../database';
import {
  createRequestGate,
  shouldApplyLoadResult,
} from '../utils/asyncLoad';
import { filterAssignmentsAndExams } from '../utils/filters';
import { ALLOWED_TYPES } from '../utils/taskTypes';

const STATUS_OPTIONS = [
  { key: 'all', label: 'All statuses' },
  { key: 'pending', label: 'Pending' },
  { key: 'completed', label: 'Completed' },
];

const TYPE_OPTIONS = [
  { key: 'all', label: 'All types' },
  { key: 'assignment', label: 'Assignment' },
  { key: 'exam', label: 'Exam' },
];

const theme = {
  background: '#F7F7FC',
  surface: '#FFFFFF',
  purple: '#6D4AFF',
  purpleDark: '#392278',
  soft: '#EEE9FF',
  text: '#25223B',
  muted: '#686278',
  border: '#E8E5F1',
};

function FilterChip({ label, selected, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        pressed && styles.pressed,
      ]}
    >
      <Text
        style={[styles.chipText, selected && styles.chipTextSelected]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function ActiveFilter({ label, onRemove }) {
  return (
    <Pressable
      onPress={onRemove}
      accessibilityRole="button"
      accessibilityLabel={`Remove filter: ${label}`}
      style={({ pressed }) => [
        styles.activeChip,
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.activeText}>{label}</Text>
      <Text style={styles.activeClose}>×</Text>
    </Pressable>
  );
}

export default function AssignmentsScreen() {
  const navigation = useNavigation();
  const { ready, refreshKey, refresh } = useData();

  const [tasks, setTasks] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [subjectId, setSubjectId] = useState('all');
  const [status, setStatus] = useState('all');
  const [type, setType] = useState('all');
  const [filtersVisible, setFiltersVisible] = useState(false);

  const [formVisible, setFormVisible] = useState(false);
  const [formType, setFormType] = useState('assignment');

  const gateRef = useRef(createRequestGate());
  const activeRef = useRef(false);

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
      const [taskRows, subjectRows] = await Promise.all([
        getAssignmentsAndExams(),
        getAllSubjects(),
      ]);

      if (!canApply()) return;

      setTasks(taskRows);
      setSubjects(subjectRows);
      setHasLoaded(true);
      setError(null);

      // A deleted subject must not leave an invisible stale filter.
      setSubjectId((current) => {
        if (current === 'all') return current;

        return subjectRows.some(
          (subject) => Number(subject.id) === Number(current),
        )
          ? current
          : 'all';
      });
    } catch (err) {
      if (!canApply()) return;
      setError(err?.message || 'Could not load assignments.');
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

  useForegroundAndMidnightRefresh(load);

  const filtered = filterAssignmentsAndExams(tasks, {
    search,
    subjectId,
    status,
    type,
  });

  const selectedSubject = subjects.find(
    (subject) => Number(subject.id) === Number(subjectId),
  );

  const filterCount =
    Number(subjectId !== 'all') +
    Number(status !== 'all') +
    Number(type !== 'all');

  const hasCriteria = Boolean(search.trim()) || filterCount > 0;

  const pendingCount = tasks.filter(
    (task) => task.status === 'pending',
  ).length;

  const completedCount = tasks.filter(
    (task) => task.status === 'completed',
  ).length;

  const clearFilters = () => {
    setSearch('');
    setSubjectId('all');
    setStatus('all');
    setType('all');
  };

  const openAdd = (nextType) => {
    setFormType(nextType);
    setFormVisible(true);
  };

  const onSave = async (payload) => {
    await createTask(payload);
    refresh();
  };

  if (!ready || (loading && !hasLoaded)) {
    return <LoadingState message="Loading your assignments…" />;
  }

  if (error && !hasLoaded) {
    return <ErrorState message={error} onRetry={load} />;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={filtered}
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
              <Text style={styles.eyebrow}>STAY ONE STEP AHEAD</Text>
              <Text style={styles.title}>Assignments & Exams</Text>
              <Text style={styles.subtitle}>
                Keep every deadline in one place.
              </Text>

              <View style={styles.heroStats}>
                <View style={styles.heroStat}>
                  <Text style={styles.heroNumber}>{pendingCount}</Text>
                  <Text style={styles.heroStatLabel}>Pending</Text>
                </View>

                <View style={styles.heroStat}>
                  <Text style={styles.heroNumber}>{completedCount}</Text>
                  <Text style={styles.heroStatLabel}>Completed</Text>
                </View>

                <View style={styles.heroStat}>
                  <Text style={styles.heroNumber}>{tasks.length}</Text>
                  <Text style={styles.heroStatLabel}>Total</Text>
                </View>
              </View>
            </View>

            <ErrorBanner message={error} onRetry={load} />

            <View style={styles.addRow}>
              <PrimaryButton
                title="+ Assignment"
                onPress={() => openAdd('assignment')}
                style={styles.addButton}
              />
              <PrimaryButton
                title="+ Exam"
                variant="secondary"
                onPress={() => openAdd('exam')}
                style={styles.addButton}
              />
            </View>

            <View style={styles.searchRow}>
              <View style={styles.searchBox}>
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search by title..."
                  placeholderTextColor={theme.muted}
                  style={styles.searchInput}
                  accessibilityLabel="Search assignments and exams"
                  autoCorrect={false}
                  returnKeyType="search"
                />

                {search.length > 0 ? (
                  <Pressable
                    onPress={() => setSearch('')}
                    accessibilityRole="button"
                    accessibilityLabel="Clear search"
                    style={styles.clearSearch}
                  >
                    <Text style={styles.clearSymbol}>×</Text>
                  </Pressable>
                ) : null}
              </View>

              <Pressable
                onPress={() => setFiltersVisible((visible) => !visible)}
                accessibilityRole="button"
                accessibilityState={{ expanded: filtersVisible }}
                style={[
                  styles.filterButton,
                  (filtersVisible || filterCount > 0) &&
                    styles.filterButtonSelected,
                ]}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    (filtersVisible || filterCount > 0) &&
                      styles.filterButtonTextSelected,
                  ]}
                >
                  {filtersVisible ? 'Hide' : 'Filters'}
                  {filterCount > 0 ? ` (${filterCount})` : ''}
                </Text>
              </Pressable>
            </View>

            {filtersVisible ? (
              <View style={styles.filterPanel}>
                <Text style={styles.filterLabel}>Subject</Text>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={styles.horizontalChips}
                >
                  <FilterChip
                    label="All subjects"
                    selected={subjectId === 'all'}
                    onPress={() => setSubjectId('all')}
                  />

                  {subjects.map((subject) => (
                    <FilterChip
                      key={subject.id}
                      label={subject.name}
                      selected={
                        Number(subjectId) === Number(subject.id)
                      }
                      onPress={() => setSubjectId(subject.id)}
                    />
                  ))}
                </ScrollView>

                <Text style={styles.filterLabel}>Status</Text>
                <View style={styles.chipRow}>
                  {STATUS_OPTIONS.map((option) => (
                    <FilterChip
                      key={option.key}
                      label={option.label}
                      selected={status === option.key}
                      onPress={() => setStatus(option.key)}
                    />
                  ))}
                </View>

                <Text style={styles.filterLabel}>Type</Text>
                <View style={styles.chipRow}>
                  {TYPE_OPTIONS.map((option) => (
                    <FilterChip
                      key={option.key}
                      label={option.label}
                      selected={type === option.key}
                      onPress={() => setType(option.key)}
                    />
                  ))}
                </View>
              </View>
            ) : null}

            {hasCriteria ? (
              <View style={styles.activeFilters}>
                {search.trim() ? (
                  <ActiveFilter
                    label={`Search: ${search.trim()}`}
                    onRemove={() => setSearch('')}
                  />
                ) : null}

                {selectedSubject ? (
                  <ActiveFilter
                    label={selectedSubject.name}
                    onRemove={() => setSubjectId('all')}
                  />
                ) : null}

                {status !== 'all' ? (
                  <ActiveFilter
                    label={status === 'pending' ? 'Pending' : 'Completed'}
                    onRemove={() => setStatus('all')}
                  />
                ) : null}

                {type !== 'all' ? (
                  <ActiveFilter
                    label={type === 'exam' ? 'Exam' : 'Assignment'}
                    onRemove={() => setType('all')}
                  />
                ) : null}
              </View>
            ) : null}

            <View style={styles.resultsRow}>
              <View style={styles.resultsText}>
                <Text style={styles.resultsTitle}>
                  {hasCriteria ? 'Search results' : 'Your tasks'}
                </Text>
                <Text style={styles.resultsSubtitle}>
                  {filtered.length} of {tasks.length} items
                </Text>
              </View>

              {hasCriteria ? (
                <Pressable
                  onPress={clearFilters}
                  accessibilityRole="button"
                  accessibilityLabel="Clear search and all filters"
                  style={styles.clearAllButton}
                >
                  <Text style={styles.clearAllText}>Clear all</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <TaskCard
            task={item}
            onPress={() =>
              navigation.navigate('TaskDetails', { taskId: item.id })
            }
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <EmptyState
              icon={hasCriteria ? 'search-outline' : 'calendar-outline'}
              title={hasCriteria ? 'No matching tasks' : 'Your list is ready'}
              message={
                hasCriteria
                  ? 'Try another title or remove a filter.'
                  : 'Add your first assignment or exam to get started.'
              }
            />

            {hasCriteria ? (
              <PrimaryButton
                title="Clear search and filters"
                variant="secondary"
                onPress={clearFilters}
              />
            ) : null}
          </View>
        }
      />

      <TaskFormModal
        visible={formVisible}
        mode="add"
        defaultType={formType}
        subjects={subjects}
        allowedTypes={ALLOWED_TYPES.assignments}
        onSubmit={onSave}
        onClose={() => setFormVisible(false)}
        onCreateSubject={() => {
          setFormVisible(false);
          navigation.navigate('Subjects');
        }}
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
    letterSpacing: 1.3,
    marginBottom: 10,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: '#E6DFFF',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 7,
  },
  heroStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 22,
  },
  heroStat: {
    flexGrow: 1,
    flexBasis: 65,
    backgroundColor: '#50378F',
    padding: 12,
    borderRadius: 14,
  },
  heroNumber: {
    color: '#FFFFFF',
    fontSize: 23,
    fontWeight: '800',
  },
  heroStatLabel: {
    color: '#EEE8FF',
    fontSize: 11,
    marginTop: 4,
  },
  addRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 18,
  },
  addButton: {
    flexGrow: 1,
    flexBasis: 135,
  },
  searchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  searchBox: {
    flexGrow: 1,
    flexBasis: 190,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 15,
    minHeight: 50,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: theme.text,
  },
  clearSearch: {
    minWidth: 44,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearSymbol: {
    color: theme.muted,
    fontSize: 25,
  },
  filterButton: {
    paddingHorizontal: 15,
    paddingVertical: 13,
    minHeight: 50,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButtonSelected: {
    backgroundColor: theme.purple,
    borderColor: theme.purple,
  },
  filterButtonText: {
    color: theme.text,
    fontSize: 13,
    fontWeight: '700',
  },
  filterButtonTextSelected: {
    color: '#FFFFFF',
  },
  filterPanel: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 18,
    padding: 15,
    marginBottom: 12,
  },
  filterLabel: {
    color: theme.muted,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 9,
  },
  horizontalChips: {
    gap: 8,
    paddingBottom: 15,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    minHeight: 44,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 13,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: theme.background,
    maxWidth: 240,
  },
  chipSelected: {
    backgroundColor: theme.soft,
    borderColor: theme.purple,
  },
  chipText: {
    color: theme.muted,
    fontSize: 12,
  },
  chipTextSelected: {
    color: theme.purpleDark,
    fontWeight: '700',
  },
  activeFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 5,
  },
  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    maxWidth: '100%',
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: theme.soft,
  },
  activeText: {
    flexShrink: 1,
    color: theme.purpleDark,
    fontSize: 12,
    fontWeight: '600',
  },
  activeClose: {
    color: theme.purpleDark,
    fontSize: 20,
  },
  resultsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 14,
    marginBottom: 16,
  },
  resultsText: {
    flex: 1,
  },
  resultsTitle: {
    color: theme.text,
    fontSize: 18,
    fontWeight: '700',
  },
  resultsSubtitle: {
    color: theme.muted,
    fontSize: 12,
    marginTop: 4,
  },
  clearAllButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  clearAllText: {
    color: theme.purple,
    fontSize: 12,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: theme.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.border,
  },
  pressed: {
    opacity: 0.75,
  },
});