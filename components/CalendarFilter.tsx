import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native'
import { Typography, Spacing, BorderRadius } from '../constants/themeHooks'
import { useTheme } from '../contexts/ThemeContext'

interface CalendarFilterProps {
  visible: boolean
  onClose: () => void
  onDateSelect: (date: string) => void
  selectedDate?: string
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function CalendarFilter({ visible, onClose, onDateSelect, selectedDate }: CalendarFilterProps) {
  const { colors } = useTheme()
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay()
  }

  const formatDate = (day: number) => {
    const month = (currentMonth + 1).toString().padStart(2, '0')
    const dayStr = day.toString().padStart(2, '0')
    return `${currentYear}-${month}-${dayStr}`
  }

  const isToday = (day: number) => {
    const dateStr = formatDate(day)
    const todayStr = today.toISOString().split('T')[0]
    return dateStr === todayStr
  }

  const isSelected = (day: number) => {
    const dateStr = formatDate(day)
    return dateStr === selectedDate
  }

  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  const handleDateSelect = (day: number) => {
    const dateStr = formatDate(day)
    onDateSelect(dateStr)
    onClose()
  }

  const clearFilter = () => {
    onDateSelect('')
    onClose()
  }

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear)
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear)
    const days = []

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <View key={`empty-${i}`} style={styles.dayCell}>
          <View style={styles.emptyDay} />
        </View>
      )
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const isCurrentDay = isToday(day)
      const isSelectedDay = isSelected(day)

      days.push(
        <View key={day} style={styles.dayCell}>
          <TouchableOpacity
            style={[
              styles.dayButton,
              isCurrentDay && styles.todayButton,
              isSelectedDay && styles.selectedButton,
            ]}
            onPress={() => handleDateSelect(day)}
          >
            <Text style={[
              styles.dayText,
              isCurrentDay && styles.todayText,
              isSelectedDay && styles.selectedText,
            ]}>
              {day}
            </Text>
          </TouchableOpacity>
        </View>
      )
    }

    return days
  }

  const styles = createStyles(colors)

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Select Date</Text>
            <TouchableOpacity onPress={clearFilter} style={styles.clearButton}>
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <View style={styles.monthNavigation}>
              <TouchableOpacity onPress={goToPreviousMonth} style={styles.navButton}>
                <Text style={styles.navIcon}>‹</Text>
              </TouchableOpacity>
              
              <View style={styles.monthYearContainer}>
                <Text style={styles.monthText}>{MONTHS[currentMonth]}</Text>
                <Text style={styles.yearText}>{currentYear}</Text>
              </View>
              
              <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
                <Text style={styles.navIcon}>›</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.daysHeader}>
              {DAYS.map((day) => (
                <View key={day} style={styles.dayHeaderCell}>
                  <Text style={styles.dayHeaderText}>{day}</Text>
                </View>
              ))}
            </View>

            <View style={styles.calendar}>
              {renderCalendar()}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const createStyles = (colors: any) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContainer: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.lg,
    width: '90%',
    maxWidth: 380,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '40',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  closeIcon: {
    fontSize: 18,
    color: colors.textSecondary,
  },
  title: {
    fontSize: Typography.fontSizes.subheading,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  clearButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    backgroundColor: colors.primary + '15',
  },
  clearText: {
    fontSize: Typography.fontSizes.bodySmall,
    fontFamily: Typography.fontFamily.medium,
    color: colors.primary,
  },
  content: {
    padding: Spacing.lg,
  },
  monthNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary + '15',
  },
  navIcon: {
    fontSize: 24,
    color: colors.primary,
    fontFamily: Typography.fontFamily.medium,
  },
  monthYearContainer: {
    alignItems: 'center',
    flex: 1,
  },
  monthText: {
    fontSize: Typography.fontSizes.subheading,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  yearText: {
    fontSize: Typography.fontSizes.bodySmall,
    fontFamily: Typography.fontFamily.regular,
    color: colors.textSecondary,
    marginTop: 2,
  },
  daysHeader: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  dayHeaderCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  dayHeaderText: {
    fontSize: Typography.fontSizes.caption,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  calendar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.xs,
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    padding: 3,
  },
  emptyDay: {
    flex: 1,
  },
  dayButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    backgroundColor: 'transparent',
  },
  todayButton: {
    backgroundColor: colors.primary + '25',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  selectedButton: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  dayText: {
    fontSize: Typography.fontSizes.bodySmall,
    fontFamily: Typography.fontFamily.regular,
    color: colors.textPrimary,
  },
  todayText: {
    color: colors.primary,
    fontFamily: Typography.fontFamily.bold,
  },
  selectedText: {
    color: colors.surface,
    fontFamily: Typography.fontFamily.bold,
  },
})