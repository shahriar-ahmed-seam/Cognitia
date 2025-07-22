import { generateId } from "./mock-data"

// Extended contest management types
export interface ContestManagement {
  id: string
  contestId: string
  createdBy: string
  questions: ContestQuestion[]
  settings: ContestSettings
  status: "draft" | "published" | "archived"
  createdAt: Date
  updatedAt: Date
}

export interface ContestQuestion {
  id: string
  title: string
  description: string
  difficulty: "easy" | "medium" | "hard" | "expert"
  points: number
  timeLimit: number // in minutes
  tags: string[]
  type: "coding" | "mcq" | "short-answer"
  content?: QuestionContent
  order: number
}

export interface QuestionContent {
  // For coding questions
  starterCode?: string
  testCases?: TestCase[]
  constraints?: string
  examples?: Example[]

  // For MCQ questions
  options?: string[]
  correctAnswer?: number

  // For short answer questions
  expectedKeywords?: string[]
  maxLength?: number
}

export interface TestCase {
  input: string
  expectedOutput: string
  isHidden: boolean
}

export interface Example {
  input: string
  output: string
  explanation?: string
}

export interface ContestSettings {
  allowLateSubmission: boolean
  showLeaderboard: boolean
  allowDiscussion: boolean
  randomizeQuestions: boolean
  timeLimit?: number // overall contest time limit
  maxAttempts?: number
}

// Mock data for question bank
export const QUESTION_BANK: ContestQuestion[] = [
  {
    id: generateId(),
    title: "Two Sum",
    description:
      "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution, and you may not use the same element twice.",
    difficulty: "easy",
    points: 100,
    timeLimit: 30,
    tags: ["array", "hash-table", "two-pointers"],
    type: "coding",
    order: 1,
    content: {
      starterCode: `function twoSum(nums, target) {
    // Your code here
}`,
      testCases: [
        { input: "[2,7,11,15], 9", expectedOutput: "[0,1]", isHidden: false },
        { input: "[3,2,4], 6", expectedOutput: "[1,2]", isHidden: false },
        { input: "[3,3], 6", expectedOutput: "[0,1]", isHidden: true },
      ],
      examples: [
        {
          input: "nums = [2,7,11,15], target = 9",
          output: "[0,1]",
          explanation: "Because nums[0] + nums[1] == 9, we return [0, 1].",
        },
      ],
      constraints:
        "2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9\n-10^9 <= target <= 10^9\nOnly one valid answer exists.",
    },
  },
  {
    id: generateId(),
    title: "Valid Parentheses",
    description:
      "Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid. An input string is valid if: Open brackets must be closed by the same type of brackets. Open brackets must be closed in the correct order.",
    difficulty: "easy",
    points: 100,
    timeLimit: 20,
    tags: ["string", "stack"],
    type: "coding",
    order: 2,
    content: {
      starterCode: `function isValid(s) {
    // Your code here
}`,
      testCases: [
        { input: '"()"', expectedOutput: "true", isHidden: false },
        { input: '"()[]{}"', expectedOutput: "true", isHidden: false },
        { input: '"(]"', expectedOutput: "false", isHidden: true },
      ],
    },
  },
  {
    id: generateId(),
    title: "Binary Tree Traversal",
    description: "What is the correct order of nodes visited in an in-order traversal of a binary tree?",
    difficulty: "easy",
    points: 50,
    timeLimit: 10,
    tags: ["tree", "traversal", "binary-tree"],
    type: "mcq",
    order: 3,
    content: {
      options: ["Root, Left, Right", "Left, Root, Right", "Left, Right, Root", "Right, Root, Left"],
      correctAnswer: 1,
    },
  },
  {
    id: generateId(),
    title: "Maximum Subarray",
    description:
      "Given an integer array nums, find the contiguous subarray (containing at least one number) which has the largest sum and return its sum. A subarray is a contiguous part of an array.",
    difficulty: "medium",
    points: 200,
    timeLimit: 45,
    tags: ["array", "dynamic-programming", "divide-and-conquer"],
    type: "coding",
    order: 4,
    content: {
      starterCode: `function maxSubArray(nums) {
    // Your code here
}`,
      testCases: [
        { input: "[-2,1,-3,4,-1,2,1,-5,4]", expectedOutput: "6", isHidden: false },
        { input: "[1]", expectedOutput: "1", isHidden: false },
        { input: "[5,4,-1,7,8]", expectedOutput: "23", isHidden: true },
      ],
    },
  },
  {
    id: generateId(),
    title: "Time Complexity Analysis",
    description: "What is the time complexity of the quicksort algorithm in the average case?",
    difficulty: "medium",
    points: 75,
    timeLimit: 15,
    tags: ["algorithms", "complexity", "sorting"],
    type: "mcq",
    order: 5,
    content: {
      options: ["O(n)", "O(n log n)", "O(n²)", "O(log n)"],
      correctAnswer: 1,
    },
  },
  {
    id: generateId(),
    title: "Explain Big O Notation",
    description:
      "Briefly explain what Big O notation represents and give an example of an algorithm with O(n) time complexity.",
    difficulty: "easy",
    points: 100,
    timeLimit: 20,
    tags: ["algorithms", "complexity", "theory"],
    type: "short-answer",
    order: 6,
    content: {
      expectedKeywords: ["time complexity", "worst case", "upper bound", "linear", "O(n)"],
      maxLength: 500,
    },
  },
  {
    id: generateId(),
    title: "Longest Palindromic Substring",
    description:
      "Given a string s, return the longest palindromic substring in s. A string is palindromic if it reads the same forward and backward.",
    difficulty: "medium",
    points: 250,
    timeLimit: 40,
    tags: ["string", "dynamic-programming", "expand-around-centers"],
    type: "coding",
    order: 7,
    content: {
      starterCode: `function longestPalindrome(s) {
    // Your code here
}`,
      testCases: [
        { input: '"babad"', expectedOutput: '"bab"', isHidden: false },
        { input: '"cbbd"', expectedOutput: '"bb"', isHidden: false },
        { input: '"raceacar"', expectedOutput: '"raceacar"', isHidden: true },
      ],
    },
  },
  {
    id: generateId(),
    title: "Binary Search Implementation",
    description:
      "Implement binary search algorithm to find the target value in a sorted array. Return the index if found, otherwise return -1.",
    difficulty: "easy",
    points: 150,
    timeLimit: 25,
    tags: ["array", "binary-search", "divide-and-conquer"],
    type: "coding",
    order: 8,
    content: {
      starterCode: `function search(nums, target) {
    // Your code here
}`,
      testCases: [
        { input: "[-1,0,3,5,9,12], 9", expectedOutput: "4", isHidden: false },
        { input: "[-1,0,3,5,9,12], 2", expectedOutput: "-1", isHidden: false },
        { input: "[5], 5", expectedOutput: "0", isHidden: true },
      ],
    },
  },
  {
    id: generateId(),
    title: "Data Structure Properties",
    description:
      "Which data structure provides O(1) average time complexity for insertion, deletion, and search operations?",
    difficulty: "easy",
    points: 60,
    timeLimit: 10,
    tags: ["data-structures", "hash-table", "complexity"],
    type: "mcq",
    order: 9,
    content: {
      options: ["Array", "Linked List", "Hash Table", "Binary Search Tree"],
      correctAnswer: 2,
    },
  },
  {
    id: generateId(),
    title: "Graph Traversal Algorithms",
    description:
      "Compare and contrast Depth-First Search (DFS) and Breadth-First Search (BFS) algorithms. When would you use each?",
    difficulty: "medium",
    points: 150,
    timeLimit: 25,
    tags: ["graph", "dfs", "bfs", "traversal"],
    type: "short-answer",
    order: 10,
    content: {
      expectedKeywords: ["depth-first", "breadth-first", "stack", "queue", "shortest path", "connected components"],
      maxLength: 600,
    },
  },
]

// Mock contest management data
export const CONTEST_MANAGEMENT_DATA: ContestManagement[] = [
  {
    id: generateId(),
    contestId: "contest1",
    createdBy: "user1",
    questions: [
      QUESTION_BANK[0], // Two Sum
      QUESTION_BANK[1], // Valid Parentheses
      QUESTION_BANK[2], // Binary Tree Traversal MCQ
    ],
    settings: {
      allowLateSubmission: false,
      showLeaderboard: true,
      allowDiscussion: true,
      randomizeQuestions: false,
      timeLimit: 120, // 2 hours
      maxAttempts: 3,
    },
    status: "published",
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-16"),
  },
]

// Utility functions for contest management
export function getQuestionsByDifficulty(difficulty: string): ContestQuestion[] {
  if (difficulty === "all") return QUESTION_BANK
  return QUESTION_BANK.filter((q) => q.difficulty === difficulty)
}

export function getQuestionsByType(type: string): ContestQuestion[] {
  if (type === "all") return QUESTION_BANK
  return QUESTION_BANK.filter((q) => q.type === type)
}

export function getQuestionsByTag(tag: string): ContestQuestion[] {
  if (tag === "all") return QUESTION_BANK
  return QUESTION_BANK.filter((q) => q.tags.includes(tag))
}

export function searchQuestions(query: string): ContestQuestion[] {
  const lowercaseQuery = query.toLowerCase()
  return QUESTION_BANK.filter(
    (q) =>
      q.title.toLowerCase().includes(lowercaseQuery) ||
      q.description.toLowerCase().includes(lowercaseQuery) ||
      q.tags.some((tag) => tag.toLowerCase().includes(lowercaseQuery)),
  )
}

export function addQuestionToContest(contestId: string, questionId: string): boolean {
  const contest = CONTEST_MANAGEMENT_DATA.find((c) => c.contestId === contestId)
  const question = QUESTION_BANK.find((q) => q.id === questionId)

  if (!contest || !question) return false

  // Check if question already exists in contest
  if (contest.questions.some((q) => q.id === questionId)) return false

  contest.questions.push({
    ...question,
    order: contest.questions.length + 1,
  })
  contest.updatedAt = new Date()

  return true
}

export function removeQuestionFromContest(contestId: string, questionId: string): boolean {
  const contest = CONTEST_MANAGEMENT_DATA.find((c) => c.contestId === contestId)

  if (!contest) return false

  const questionIndex = contest.questions.findIndex((q) => q.id === questionId)
  if (questionIndex === -1) return false

  contest.questions.splice(questionIndex, 1)

  // Reorder remaining questions
  contest.questions.forEach((q, index) => {
    q.order = index + 1
  })

  contest.updatedAt = new Date()
  return true
}

export function updateContestSettings(contestId: string, settings: Partial<ContestSettings>): boolean {
  const contest = CONTEST_MANAGEMENT_DATA.find((c) => c.contestId === contestId)

  if (!contest) return false

  contest.settings = { ...contest.settings, ...settings }
  contest.updatedAt = new Date()

  return true
}

export function getContestManagement(contestId: string): ContestManagement | null {
  return CONTEST_MANAGEMENT_DATA.find((c) => c.contestId === contestId) || null
}

export function createContestManagement(contestId: string, createdBy: string): ContestManagement {
  const newManagement: ContestManagement = {
    id: generateId(),
    contestId,
    createdBy,
    questions: [],
    settings: {
      allowLateSubmission: false,
      showLeaderboard: true,
      allowDiscussion: true,
      randomizeQuestions: false,
      maxAttempts: 3,
    },
    status: "draft",
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  CONTEST_MANAGEMENT_DATA.push(newManagement)
  return newManagement
}
