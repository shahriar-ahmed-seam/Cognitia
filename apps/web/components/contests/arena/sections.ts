import type { ArenaQuestion } from "@/lib/contests/types"

export interface SectionGroup {
  /** Section heading, or null for questions outside any section */
  name: string | null
  /** Index of the first question of the group in the arena order */
  start: number
  questions: { question: ArenaQuestion; index: number }[]
  points: number
}

/**
 * Consecutive questions with the same `section`. The API keeps each section's questions together
 * (shuffling happens inside a section), so this gives one group per section.
 */
export function groupBySection(questions: ArenaQuestion[]): SectionGroup[] {
  const groups: SectionGroup[] = []
  questions.forEach((question, index) => {
    const name = question.section?.trim() || null
    const last = groups[groups.length - 1]
    if (last && last.name === name) {
      last.questions.push({ question, index })
      last.points += question.points
    } else {
      groups.push({ name, start: index, questions: [{ question, index }], points: question.points })
    }
  })
  return groups
}

export const hasSections = (groups: SectionGroup[]) => groups.some((g) => g.name)

export const marksLabel = (points: number) => `${Number.isInteger(points) ? points : points.toFixed(2).replace(/\.?0+$/, "")} mark${points === 1 ? "" : "s"}`
