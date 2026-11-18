import { describe, expect, it } from 'vitest'
import { announcementContent, announcementLoop, parseAnnouncements } from './announcements'

describe('parseAnnouncements', () => {
  it('reads the saved messages in order and skips empty fields', () => {
    expect(parseAnnouncements({ messages: ['Get upto 45% off on combos', '', '  Free shipping above ₹499 ', '   '] }))
      .toEqual(['Get upto 45% off on combos', 'Free shipping above ₹499'])
  })

  it('reads older saves (one text, a message per line) and keeps commas inside a message', () => {
    expect(parseAnnouncements({ text: 'Buy 2 get 1 free\r\nOrders above ₹1,000 ship free' }))
      .toEqual(['Buy 2 get 1 free', 'Orders above ₹1,000 ship free'])
    expect(parseAnnouncements({ text: 'Get upto 45% off on combos' })).toEqual(['Get upto 45% off on combos'])
  })

  it('handles missing content', () => {
    expect(parseAnnouncements(null)).toEqual([])
    expect(parseAnnouncements({})).toEqual([])
  })
})

describe('announcementLoop', () => {
  it('cycles through every message before repeating', () => {
    expect(announcementLoop(['A', 'B', 'C'])).toEqual(['A', 'B', 'C', 'A', 'B', 'C'])
    expect(announcementLoop(['A', 'B', 'C', 'D'])).toEqual(['A', 'B', 'C', 'D', 'A', 'B', 'C', 'D'])
  })

  it('repeats a single message to fill the strip', () => {
    expect(announcementLoop(['Only one'])).toEqual(Array(6).fill('Only one'))
  })

  it('shows nothing when every field is empty', () => {
    expect(announcementLoop([])).toEqual([])
  })
})

describe('announcementContent', () => {
  it('saves the messages and the same text one per line', () => {
    expect(announcementContent(['A', ' ', 'B'])).toEqual({ messages: ['A', 'B'], text: 'A\nB' })
  })
})
