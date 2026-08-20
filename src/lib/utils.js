import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Merge Tailwind classes without conflicts. */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

// --- Units -------------------------------------------------------------------
// The database stores metric. The coach reads whatever that client prefers, so
// conversion happens at the edge and never in the payload.

export const KG_PER_LB = 0.45359237

export const kgToLb = (kg) => (kg == null ? null : Math.round((kg / KG_PER_LB) * 10) / 10)
export const lbToKg = (lb) => (lb == null ? null : Math.round(lb * KG_PER_LB * 100) / 100)
export const cmToIn = (cm) => (cm == null ? null : Math.round((cm / 2.54) * 10) / 10)
export const inToCm = (inches) => (inches == null ? null : Math.round(inches * 2.54 * 10) / 10)

export function formatWeight(kg, units = 'imperial', { decimals = 1 } = {}) {
  if (kg == null) return '—'
  const value = units === 'imperial' ? kgToLb(kg) : kg
  return `${Number(value).toFixed(decimals)} ${units === 'imperial' ? 'lbs' : 'kg'}`
}

export function formatHeight(cm, units = 'imperial') {
  if (cm == null) return '—'
  if (units === 'metric') return `${cm} cm`
  const totalInches = cm / 2.54
  const feet = Math.floor(totalInches / 12)
  const inches = Math.round(totalInches - feet * 12)
  return `${feet}'${inches}"`
}

export function formatLength(cm, units = 'imperial') {
  if (cm == null) return '—'
  return units === 'imperial' ? `${cmToIn(cm)}"` : `${cm} cm`
}

export function formatDelta(value, suffix = '') {
  if (value == null) return '—'
  const rounded = Math.round(value * 10) / 10
  return `${rounded > 0 ? '+' : ''}${rounded}${suffix}`
}

export const formatMoney = (cents, currency = 'USD') =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format((cents ?? 0) / 100)

// --- Dates -------------------------------------------------------------------

export function formatDate(value, opts = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-GB', opts)
}

export const formatDateTime = (value) =>
  formatDate(value, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

export function daysSince(value) {
  if (!value) return null
  const then = new Date(value)
  if (Number.isNaN(then.getTime())) return null
  const ms = Date.now() - then.getTime()
  return Math.floor(ms / 86_400_000)
}

/** "3 days ago" reads faster than a date when the question is "how long?". */
export function relativeDays(value, { never = 'Never' } = {}) {
  const days = daysSince(value)
  if (days == null) return never
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return `${Math.floor(days / 30)}mo ago`
}

export function age(dateOfBirth) {
  if (!dateOfBirth) return null
  const born = new Date(dateOfBirth)
  if (Number.isNaN(born.getTime())) return null
  const now = new Date()
  let years = now.getFullYear() - born.getFullYear()
  const month = now.getMonth() - born.getMonth()
  if (month < 0 || (month === 0 && now.getDate() < born.getDate())) years -= 1
  return years
}

// --- Check-in freshness ------------------------------------------------------
// This is what the status rail down the left of each client row encodes.

export const FRESHNESS = {
  current: { rail: 'rail-current', label: 'On track', tone: 'green' },
  slipping: { rail: 'rail-slipping', label: 'Slipping', tone: 'amber' },
  stale: { rail: 'rail-stale', label: 'Needs a nudge', tone: 'red' },
  none: { rail: 'rail-none', label: 'No check-ins', tone: 'grey' },
}

export function freshness(lastCheckIn) {
  const days = daysSince(lastCheckIn)
  if (days == null) return { key: 'none', days: null, ...FRESHNESS.none }
  if (days <= 7) return { key: 'current', days, ...FRESHNESS.current }
  if (days <= 14) return { key: 'slipping', days, ...FRESHNESS.slipping }
  return { key: 'stale', days, ...FRESHNESS.stale }
}

// --- Labels ------------------------------------------------------------------

export const LEVEL_LABELS = { level_1: 'Level 1', level_2: 'Level 2', level_3: 'Level 3' }
export const GOAL_LABELS = { cut: 'Cut', maintain: 'Maintain', build: 'Build' }
export const CATEGORY_LABELS = {
  getting_started: 'Getting started',
  form_technique: 'Form & technique',
  warm_up: 'Warm-up',
  mobility: 'Mobility',
  cardio: 'Cardio',
  nutrition: 'Nutrition',
  equipment: 'Equipment',
  recovery: 'Recovery',
}
export const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export const titleCase = (value = '') =>
  value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())

export const clamp = (n, min, max) => Math.min(Math.max(n, min), max)

export const pct = (value, target) =>
  !target ? 0 : clamp(Math.round((value / target) * 100), 0, 100)

export function initials(name = '') {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('') || '?'
  )
}

/** Turn a pasted watch/share link into something an iframe will actually play. */
export function embedUrl({ provider, video_url: url } = {}) {
  if (!url) return null
  if (provider === 'youtube') {
    const id = url.match(
      /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/,
    )?.[1]
    return id ? `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1` : null
  }
  if (provider === 'vimeo') {
    const id = url.match(/vimeo\.com\/(?:video\/)?(\d{6,})/)?.[1]
    return id ? `https://player.vimeo.com/video/${id}?dnt=1` : null
  }
  return null
}