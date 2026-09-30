import { NextRequest, NextResponse } from "next/server"

const MOCK_USER = {
  id: "user-1",
  name: "Shahriar",
  email: "shahriar@example.com",
  role: "STUDENT",
  bio: "Software Engineering Undergrad & AI Enthusiast",
  institution: "Department of Computer Science & Engineering",
  graduationYear: 2026,
  major: "Software Engineering",
  grade: "Senior",
  location: "Dhaka, Bangladesh",
  website: "https://github.com/shahriar",
  avatar: null,
}

const MOCK_DASHBOARD = {
  currentUser: MOCK_USER,
  stats: {
    completedTasks: 15,
    totalTasks: 20,
    studyHours: 38,
    streak: 12,
    contestsParticipated: 6,
    rank: 4,
    notesCreated: 14,
    questionsAnswered: 23,
  },
  upcomingContests: [
    {
      id: "contest-1",
      title: "Algorithmic Showdown: Dynamic Programming",
      description: "Test your mastery over complex DP and optimization problems.",
      startTime: new Date(Date.now() + 86400000).toISOString(),
      endTime: new Date(Date.now() + 93600000).toISOString(),
      difficulty: "medium",
      status: "UPCOMING",
      participants: 48,
    },
    {
      id: "contest-2",
      title: "Full-Stack System Design Sprint",
      description: "Architecture, caching, message queues, and DB scaling scenarios.",
      startTime: new Date(Date.now() + 172800000).toISOString(),
      endTime: new Date(Date.now() + 183600000).toISOString(),
      difficulty: "hard",
      status: "UPCOMING",
      participants: 32,
    },
  ],
  recentNotes: [
    {
      id: "note-1",
      title: "Distributed Systems & Raft Consensus",
      content: "Leader election, log replication, and safety properties in Raft.",
      visibility: "PUBLIC",
      tags: ["Distributed Systems", "Consensus", "Backend"],
      rating: 4.9,
      updatedAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: "note-2",
      title: "PostgreSQL Query Optimization & Indexing",
      content: "B-Tree vs GIN/GiST indexes, EXPLAIN ANALYZE interpretation, and vacuuming.",
      visibility: "PRIVATE",
      tags: ["Database", "Postgres", "SQL"],
      rating: 4.7,
      updatedAt: new Date(Date.now() - 86400000).toISOString(),
    },
  ],
  upcomingTasks: [
    {
      id: "task-1",
      title: "Complete Compiler Construction Lab 3",
      subjectArea: "Compilers",
      priority: "HIGH",
      completed: false,
      dueDate: new Date(Date.now() + 43200000).toISOString(),
      estimatedTime: 3,
    },
    {
      id: "task-2",
      title: "Review Deep Learning Attention Mechanism",
      subjectArea: "AI & ML",
      priority: "MEDIUM",
      completed: false,
      dueDate: new Date(Date.now() + 86400000).toISOString(),
      estimatedTime: 2,
    },
  ],
}

const MOCK_CONTESTS = [
  {
    id: "contest-1",
    title: "Algorithmic Showdown: Dynamic Programming",
    description: "Test your mastery over complex DP and optimization problems.",
    difficulty: "medium",
    status: "UPCOMING",
    startTime: new Date(Date.now() + 86400000).toISOString(),
    endTime: new Date(Date.now() + 93600000).toISOString(),
    participants: 48,
    totalQuestions: 5,
    totalMarks: 100,
    topics: ["Algorithms", "Dynamic Programming", "Math"],
    createdAt: new Date().toISOString(),
  },
  {
    id: "contest-2",
    title: "Full-Stack System Design Sprint",
    description: "Architecture, caching, message queues, and DB scaling scenarios.",
    difficulty: "hard",
    status: "UPCOMING",
    startTime: new Date(Date.now() + 172800000).toISOString(),
    endTime: new Date(Date.now() + 183600000).toISOString(),
    participants: 32,
    totalQuestions: 4,
    totalMarks: 120,
    topics: ["System Design", "Architecture", "Microservices"],
    createdAt: new Date().toISOString(),
  },
  {
    id: "contest-3",
    title: "Data Structures & Tree Traversal",
    description: "Binary search trees, AVL trees, and trie structures.",
    difficulty: "easy",
    status: "FINISHED",
    startTime: new Date(Date.now() - 172800000).toISOString(),
    endTime: new Date(Date.now() - 165600000).toISOString(),
    participants: 74,
    totalQuestions: 6,
    totalMarks: 100,
    topics: ["Data Structures", "Trees"],
    createdAt: new Date().toISOString(),
  },
]

const MOCK_NOTES = [
  {
    id: "note-1",
    title: "Distributed Systems & Raft Consensus",
    content: "Leader election, log replication, and safety properties in Raft.",
    visibility: "PUBLIC",
    tags: ["Distributed Systems", "Consensus", "Backend"],
    rating: 4.9,
    author: MOCK_USER,
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "note-2",
    title: "PostgreSQL Query Optimization & Indexing",
    content: "B-Tree vs GIN/GiST indexes, EXPLAIN ANALYZE interpretation, and vacuuming.",
    visibility: "PUBLIC",
    tags: ["Database", "Postgres", "SQL"],
    rating: 4.7,
    author: MOCK_USER,
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "note-3",
    title: "Modern React & Next.js Architecture",
    content: "Server components, server actions, caching heuristics and hydration optimization.",
    visibility: "PUBLIC",
    tags: ["React", "Next.js", "Frontend"],
    rating: 5.0,
    author: MOCK_USER,
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
]

const MOCK_QUESTIONS = [
  {
    id: "question-1",
    title: "How to resolve hydration mismatches when using dynamic canvas animations in Next.js 15?",
    content: "When rendering animated canvas backgrounds, SSR and CSR markup sometimes differ. What is the cleanest pattern?",
    subject: "Web Engineering",
    tags: ["Next.js", "React", "Canvas", "Performance"],
    upvotes: 18,
    downvotes: 1,
    views: 245,
    author: {
      id: "user-1",
      name: "Shahriar",
      avatar: undefined,
    },
    answers: [
      {
        id: "ans-1",
        content: "Use a mounted state check (`const [mounted, setMounted] = useState(false)`) inside `useEffect` or isolate the canvas inside a client component with `requestAnimationFrame`.",
        upvotes: 12,
        isAccepted: true,
        createdAt: new Date().toISOString(),
        author: {
          id: "user-2",
          name: "DeepMind Engineer",
        },
      },
    ],
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
]

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const fullPath = path.join("/")

  if (fullPath.includes("dashboard/me") || fullPath === "profile/me" || fullPath === "auth/me") {
    return NextResponse.json(MOCK_USER)
  }
  if (fullPath === "dashboard") {
    return NextResponse.json(MOCK_DASHBOARD)
  }
  if (fullPath.startsWith("contests")) {
    return NextResponse.json({ contests: MOCK_CONTESTS, myContests: MOCK_CONTESTS })
  }
  if (fullPath.startsWith("notes")) {
    return NextResponse.json({
      notes: MOCK_NOTES,
      groups: [
        { id: "group-1", name: "Computer Science Core", noteCount: 8 },
        { id: "group-2", name: "AI & Machine Learning", noteCount: 6 },
      ],
    })
  }
  if (fullPath.startsWith("study-plan") || fullPath.startsWith("tasks")) {
    return NextResponse.json({
      tasks: MOCK_DASHBOARD.upcomingTasks,
      studyPlans: [
        {
          id: "plan-1",
          title: "Semester Final Prep",
          tasks: MOCK_DASHBOARD.upcomingTasks,
        },
      ],
    })
  }
  if (fullPath.startsWith("qa") || fullPath.startsWith("questions")) {
    return NextResponse.json({ questions: MOCK_QUESTIONS })
  }

  return NextResponse.json({ success: true, data: [] })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const fullPath = path.join("/")

  if (fullPath.includes("login") || fullPath.includes("register") || fullPath.includes("otp")) {
    return NextResponse.json({
      token: "mock-auth-token",
      user: MOCK_USER,
      message: "Success",
    })
  }

  return NextResponse.json({
    success: true,
    message: "Operation simulated successfully (Standalone Mode)",
  })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return NextResponse.json({ success: true, user: MOCK_USER })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return NextResponse.json({ success: true })
}
