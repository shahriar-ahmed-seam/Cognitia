// Practice demo data: extra bank questions of every type (the curated bank in questions.js is
// single choice only) and the papers a student would have built over a few weeks.
import { contestQuestions } from "./contests.js";

const CS = "Computer Science";
const MATH = "Mathematics";
const PHY = "Physics";

// Written questions with sample answers at three levels (strong, partial, weak), like the contest seed.
// breakdown rows are [criterion, awarded, max].
const written = {
  tcpHandshake: {
    type: "WRITTEN", subject: CS, topics: ["Computer Networks", "Transport Layer"], difficulty: "MEDIUM", points: 6,
    prompt: "Explain TCP's **three-way handshake**. Why isn't a two-way handshake enough?",
    answer: {
      rubric: "- 2 marks: SYN, SYN-ACK, ACK in order, with sequence numbers.\n- 2 marks: both sides agree on initial sequence numbers.\n- 2 marks: a two-way handshake can't reject old duplicate SYNs, so a stale connection could open.",
      modelAnswer: "The client sends SYN with its ISN x, the server replies SYN-ACK with its ISN y and ack x+1, the client ACKs y+1. Both sides now know each other's ISN. With only two messages the server can't tell a fresh SYN from a delayed duplicate, so an old SYN could open a connection nobody wants.",
      allowText: true, allowImages: true, maxWords: 250, maxImages: 2,
    },
    explanation: "Three messages let both sides confirm the other's initial sequence number and reject stale SYNs.",
    samples: [
      { text: "Client sends SYN (seq = x). Server replies SYN-ACK (seq = y, ack = x+1). Client sends ACK (ack = y+1). This lets both sides exchange and confirm initial sequence numbers. Two messages aren't enough: a delayed duplicate SYN from an old connection would make the server open a connection, and without the third message it can't tell it's stale.", feedback: "Complete and precise: the order, the sequence numbers, and why two messages fail.", breakdown: [["Handshake steps", 2, 2], ["Sequence numbers agreed", 2, 2], ["Why two-way fails", 2, 2]] },
      { text: "The client sends SYN, the server sends SYN-ACK and the client sends ACK. Then the connection is established. Two-way is not reliable because the client might not receive the reply.", feedback: "The steps are right, but mention the sequence numbers each side agrees on. The real problem with two messages is delayed duplicate SYNs opening stale connections.", breakdown: [["Handshake steps", 2, 2], ["Sequence numbers agreed", 0.5, 2], ["Why two-way fails", 0.5, 2]] },
      { text: "TCP uses three messages to connect so that it is more reliable than UDP.", feedback: "Name the three messages (SYN, SYN-ACK, ACK) and explain what each confirms. Look up why delayed duplicate SYNs break a two-way handshake.", breakdown: [["Handshake steps", 0, 2], ["Sequence numbers agreed", 0, 2], ["Why two-way fails", 0.5, 2]] },
    ],
  },
  normalize3nf: {
    type: "WRITTEN", subject: CS, topics: ["Database Systems", "Normalization"], difficulty: "HARD", points: 8,
    prompt: "Relation **Enrollment(StudentID, CourseID, StudentName, CourseTitle, Grade)** has the dependencies\n\n- StudentID → StudentName\n- CourseID → CourseTitle\n- StudentID, CourseID → Grade\n\nWhat is the highest normal form it's in? Decompose it into **3NF**, showing the keys.",
    answer: {
      rubric: "- 2 marks: key is (StudentID, CourseID); the relation is in 1NF only because of partial dependencies.\n- 4 marks: Student(StudentID, StudentName), Course(CourseID, CourseTitle), Enrollment(StudentID, CourseID, Grade), 1 mark each plus 1 for keys.\n- 2 marks: says the decomposition is lossless and dependency preserving.",
      modelAnswer: "Key: (StudentID, CourseID). StudentName and CourseTitle depend on part of the key, so it's only in 1NF. 3NF: Student(**StudentID**, StudentName), Course(**CourseID**, CourseTitle), Enrollment(**StudentID, CourseID**, Grade). Each dependency lives in one table, joins on the keys are lossless, and every dependency is preserved.",
      allowText: true, allowImages: true, maxWords: 300, maxImages: 3,
    },
    explanation: "Partial dependencies on a composite key break 2NF; splitting by determinant gives 3NF.",
    samples: [
      { text: "Candidate key: (StudentID, CourseID). StudentName depends only on StudentID and CourseTitle only on CourseID, which are partial dependencies, so it is in 1NF but not 2NF.\nDecomposition:\nStudent(StudentID PK, StudentName)\nCourse(CourseID PK, CourseTitle)\nEnrollment(StudentID, CourseID, Grade) with PK (StudentID, CourseID)\nThis is lossless because the common attributes are keys, and all three dependencies are preserved.", feedback: "Correct key, normal form, decomposition and justification.", breakdown: [["Key and normal form", 2, 2], ["3NF decomposition", 4, 4], ["Lossless and preserving", 2, 2]] },
      { text: "It is in 2NF. We split it into Student(StudentID, StudentName), Course(CourseID, CourseTitle) and Enrollment(StudentID, CourseID, Grade).", feedback: "The decomposition is right, but the original relation is only 1NF: StudentName and CourseTitle depend on part of the key. State the keys and why the split is lossless.", breakdown: [["Key and normal form", 0.5, 2], ["3NF decomposition", 3, 4], ["Lossless and preserving", 0, 2]] },
      { text: "It is in 3NF because every attribute depends on the key.", feedback: "StudentName depends only on StudentID, a partial dependency on the composite key, so it isn't even 2NF. Split the table by each determinant.", breakdown: [["Key and normal form", 0, 2], ["3NF decomposition", 0, 4], ["Lossless and preserving", 0, 2]] },
    ],
  },
  dijkstraTrace: {
    type: "WRITTEN", subject: CS, topics: ["Algorithms", "Graphs"], difficulty: "MEDIUM", points: 8,
    prompt: "Run **Dijkstra's algorithm** from **A** on this weighted graph and give the final distance to every vertex. Show the order in which vertices are finalized.\n\n| Edge | Weight |\n|---|---|\n| A–B | 4 |\n| A–C | 1 |\n| C–B | 2 |\n| B–D | 5 |\n| C–D | 8 |\n| D–E | 3 |",
    answer: {
      rubric: "- 3 marks: finalization order A, C, B, D, E.\n- 3 marks: distances A 0, C 1, B 3, D 8, E 11.\n- 2 marks: shows the relaxation of B through C (4 becomes 3).",
      modelAnswer: "Order: A (0), C (1), B (3, via C: 1+2 beats 4), D (8, via B: 3+5 beats 1+8), E (11). Distances: A 0, B 3, C 1, D 8, E 11.",
      allowText: true, allowImages: true, maxWords: 200, maxImages: 3,
    },
    explanation: "Always finalize the closest unvisited vertex and relax its edges.",
    samples: [
      { text: "Start A=0. Relax: B=4, C=1. Finalize C (1): B = min(4, 1+2) = 3, D = 1+8 = 9. Finalize B (3): D = min(9, 3+5) = 8. Finalize D (8): E = 11. Finalize E.\nOrder: A, C, B, D, E. Distances A 0, B 3, C 1, D 8, E 11.", feedback: "Every relaxation is shown and the distances are right.", breakdown: [["Finalization order", 3, 3], ["Final distances", 3, 3], ["Relaxation through C", 2, 2]] },
      { text: "Order A, C, B, D, E. Distances: A 0, C 1, B 4, D 9, E 12.", feedback: "The order is right, but B should be 3: A→C→B costs 1 + 2. That changes D (3 + 5 = 8) and E (11).", breakdown: [["Finalization order", 3, 3], ["Final distances", 1, 3], ["Relaxation through C", 0, 2]] },
      { text: "A to B is 4, A to C is 1, A to D is 9 and A to E is 12 using the shortest edges.", feedback: "Dijkstra needs the vertices finalized one at a time with relaxation. B is 3 via C, D is 8 and E is 11.", breakdown: [["Finalization order", 0, 3], ["Final distances", 0.5, 3], ["Relaxation through C", 0, 2]] },
    ],
  },
  masterTheorem: {
    type: "WRITTEN", subject: CS, topics: ["Algorithms", "Recurrences"], difficulty: "MEDIUM", points: 5,
    prompt: "Solve $T(n) = 4T(n/2) + n$ with the **master theorem**. Name the case and justify it.",
    answer: {
      rubric: "- 2 marks: a = 4, b = 2, f(n) = n and $n^{\\log_b a} = n^2$.\n- 2 marks: case 1 because f(n) = O(n^{2-ε}) with ε = 1.\n- 1 mark: $T(n) = \\Theta(n^2)$.",
      modelAnswer: "a = 4, b = 2, so $n^{\\log_2 4} = n^2$. f(n) = n = O(n^{2-1}), which is case 1, so $T(n) = \\Theta(n^2)$.",
      allowText: true, allowImages: true, maxWords: 150, maxImages: 2,
    },
    explanation: "Compare f(n) with n^(log_b a): here the leaves dominate.",
    samples: [
      { text: "a = 4, b = 2, f(n) = n. n^(log_2 4) = n^2. Since f(n) = n = O(n^(2-ε)) with ε = 1, this is case 1 of the master theorem. So T(n) = Θ(n^2).", feedback: "Correct parameters, case and result.", breakdown: [["Parameters and n^log_b a", 2, 2], ["Case and justification", 2, 2], ["Result", 1, 1]] },
      { text: "Using the master theorem, T(n) = Θ(n log n) because it splits in half each time.", feedback: "That's case 2, which needs f(n) = Θ(n^(log_b a)). Here n^(log_2 4) = n^2 grows faster than f(n) = n, so it's case 1 and T(n) = Θ(n^2).", breakdown: [["Parameters and n^log_b a", 0.5, 2], ["Case and justification", 0, 2], ["Result", 0, 1]] },
      { text: "T(n) = O(n^2).", feedback: "The result is right, but show a, b, n^(log_b a) and which case applies.", breakdown: [["Parameters and n^log_b a", 0, 2], ["Case and justification", 0, 2], ["Result", 1, 1]] },
    ],
  },
  eigen2x2: {
    type: "WRITTEN", subject: MATH, topics: ["Linear Algebra", "Eigenvalues"], difficulty: "EASY", points: 5,
    prompt: "Find the eigenvalues of $A = \\begin{bmatrix} 4 & 1 \\\\ 2 & 3 \\end{bmatrix}$ and an eigenvector for the larger one.",
    answer: {
      rubric: "- 2 marks: characteristic equation $\\lambda^2 - 7\\lambda + 10 = 0$.\n- 1 mark: eigenvalues 5 and 2.\n- 2 marks: eigenvector for 5, any multiple of (1, 1).",
      modelAnswer: "$\\det(A - \\lambda I) = (4-\\lambda)(3-\\lambda) - 2 = \\lambda^2 - 7\\lambda + 10 = 0$, so λ = 5 or 2. For λ = 5: $(A - 5I)v = 0$ gives $-v_1 + v_2 = 0$, so v = (1, 1).",
      allowText: true, allowImages: true, maxWords: 150, maxImages: 2,
    },
    explanation: "Solve det(A − λI) = 0, then the null space of A − λI.",
    samples: [
      { text: "det(A − λI) = (4 − λ)(3 − λ) − 2 = λ² − 7λ + 10 = 0, so λ = 5, 2. For λ = 5: A − 5I = [[-1, 1], [2, -2]], so -x + y = 0 and v = (1, 1).", feedback: "All steps correct.", breakdown: [["Characteristic equation", 2, 2], ["Eigenvalues", 1, 1], ["Eigenvector", 2, 2]] },
      { text: "λ² − 7λ + 10 = 0 so λ = 5 and 2. Eigenvector (1, 2).", feedback: "The eigenvalues are right, but (1, 2) isn't an eigenvector: A(1, 2) = (6, 8). Solve (A − 5I)v = 0 to get (1, 1).", breakdown: [["Characteristic equation", 2, 2], ["Eigenvalues", 1, 1], ["Eigenvector", 0, 2]] },
      { text: "The eigenvalues are 4 and 3, the diagonal entries.", feedback: "Only triangular matrices have their diagonal as eigenvalues. Solve det(A − λI) = 0 instead.", breakdown: [["Characteristic equation", 0, 2], ["Eigenvalues", 0, 1], ["Eigenvector", 0, 2]] },
    ],
  },
  thevenin: {
    type: "WRITTEN", subject: PHY, topics: ["Electric Circuits", "Network Theorems"], difficulty: "MEDIUM", points: 6,
    prompt: "A 12 V source in series with a 4 Ω resistor feeds terminals a–b, with a 12 Ω resistor across a–b. Find the **Thevenin equivalent** seen from a–b, then the current through a 6 Ω load connected to a–b.",
    answer: {
      rubric: "- 2 marks: $V_{th}$ = 12 × 12/(4+12) = 9 V.\n- 2 marks: $R_{th}$ = 4 ∥ 12 = 3 Ω.\n- 2 marks: load current 9/(3+6) = 1 A.",
      modelAnswer: "$V_{th} = 12 \\cdot \\frac{12}{16} = 9$ V, $R_{th} = 4 \\parallel 12 = 3$ Ω, so $I_L = \\frac{9}{3+6} = 1$ A.",
      allowText: true, allowImages: true, maxWords: 150, maxImages: 2,
    },
    explanation: "Open-circuit voltage by voltage division; resistance with the source shorted.",
    samples: [
      { text: "Vth is the open-circuit voltage: 12 × 12 / 16 = 9 V. Short the source: Rth = 4 || 12 = 48/16 = 3 Ω. With 6 Ω load: I = 9 / (3 + 6) = 1 A.", feedback: "Correct Thevenin voltage, resistance and load current.", breakdown: [["Thevenin voltage", 2, 2], ["Thevenin resistance", 2, 2], ["Load current", 2, 2]] },
      { text: "Vth = 12 V, Rth = 4 + 12 = 16 Ω, I = 12/22 = 0.55 A.", feedback: "Vth is the voltage across the 12 Ω resistor (9 V by voltage division), and Rth is 4 ∥ 12 = 3 Ω because they're in parallel once the source is shorted.", breakdown: [["Thevenin voltage", 0, 2], ["Thevenin resistance", 0, 2], ["Load current", 0.5, 2]] },
      { text: "Vth = 9 V and Rth = 3 Ω.", feedback: "Both values are right; finish with the load current, 9/(3 + 6) = 1 A.", breakdown: [["Thevenin voltage", 2, 2], ["Thevenin resistance", 2, 2], ["Load current", 0, 2]] },
    ],
  },
};

const numeric = {
  subnetHosts: {
    type: "NUMERIC", subject: CS, topics: ["Computer Networks", "Subnetting"], difficulty: "EASY",
    prompt: "How many **usable host addresses** does a /26 IPv4 subnet have?",
    answer: { value: 62, tolerance: 0, toleranceType: "ABSOLUTE", unit: "hosts" },
    explanation: "2^(32−26) = 64 addresses, minus the network and broadcast addresses: 62.",
  },
  transmissionDelay: {
    type: "NUMERIC", subject: CS, topics: ["Computer Networks", "Delay"], difficulty: "MEDIUM",
    prompt: "A 1500-byte packet is sent on a 10 Mbps link. What is the **transmission delay** in milliseconds?",
    answer: { value: 1.2, tolerance: 0.01, toleranceType: "ABSOLUTE", unit: "ms" },
    explanation: "1500 × 8 = 12,000 bits; 12,000 / 10^7 s = 1.2 ms.",
  },
  hashProbes: {
    type: "SHORT_TEXT", subject: CS, topics: ["Data Structures", "Hashing"], difficulty: "EASY",
    prompt: "What is the name for two keys hashing to the same slot?",
    answer: { accepted: ["collision", "hash collision"], caseSensitive: false },
    explanation: "A **collision**, resolved by chaining or open addressing.",
    decoys: ["overflow", "clustering"],
  },
  aciDurability: {
    type: "MULTIPLE_CHOICE", subject: CS, topics: ["Database Systems", "Transactions"], difficulty: "MEDIUM",
    prompt: "Which of these are **ACID** properties of a transaction? Select all that apply.",
    options: ["Atomicity", "Isolation", "Availability", "Durability", "Partition tolerance"],
    answer: { correct: [0, 1, 3] },
    explanation: "ACID is atomicity, consistency, isolation and durability. Availability and partition tolerance come from the CAP theorem.",
  },
  ohmsPower: {
    type: "NUMERIC", subject: PHY, topics: ["Electric Circuits", "Power"], difficulty: "EASY",
    prompt: "A 220 V supply drives a 1100 W heater. What current does it draw, in amperes?",
    answer: { value: 5, tolerance: 0.01, toleranceType: "ABSOLUTE", unit: "A" },
    explanation: "I = P / V = 1100 / 220 = 5 A.",
  },
  probabilityDice: {
    type: "NUMERIC", subject: MATH, topics: ["Probability and Statistics", "Basic Probability"], difficulty: "EASY",
    prompt: "Two fair dice are rolled. What is the probability that the sum is 7? Give a decimal to 3 places.",
    answer: { value: 0.167, tolerance: 0.001, toleranceType: "ABSOLUTE", unit: null },
    explanation: "6 of the 36 outcomes sum to 7: 6/36 = 1/6 ≈ 0.167.",
  },
};

/** Contest custom questions plus the practice extras, as bank rows (with simulation extras kept aside). */
export function practiceBankRows() {
  const all = [...Object.values(contestQuestions), ...Object.values(written), ...Object.values(numeric)];
  return all.map(({ prompt, decoys, samples, section, partialCredit, ...q }) => ({
    row: {
      type: q.type,
      question: prompt,
      options: q.options ?? null,
      answer: q.answer,
      correctAnswer: q.type === "SINGLE_CHOICE" ? q.answer.correct : null,
      explanation: q.explanation ?? null,
      points: q.type === "WRITTEN" ? q.points : null,
      subject: q.subject,
      topics: q.topics,
      difficulty: q.difficulty,
      source: "CURATED",
      isPublic: true,
    },
    extras: { decoys, samples },
  }));
}

// What the AI wrote for the student's "Transactions and indexing" class test: private rows,
// like the generator saves them (source AI, owned by the student, not in the public bank).
const aiDatabase = [
  {
    type: "SINGLE_CHOICE", subject: CS, topics: ["Database Systems", "Concurrency Control"], difficulty: "MEDIUM",
    prompt: "Under **strict two-phase locking**, when does a transaction release its exclusive locks?",
    options: ["As soon as it finishes writing the item", "Right after it acquires its last lock", "Only when it commits or aborts", "At the next checkpoint"],
    answer: { correct: 2 },
    explanation: "Strict 2PL holds exclusive locks until the transaction ends, so no other transaction reads uncommitted data and cascading aborts can't happen.",
  },
  {
    type: "TRUE_FALSE", subject: CS, topics: ["Database Systems", "Serializability"], difficulty: "EASY",
    prompt: "Every conflict-serializable schedule is also view serializable.",
    answer: { correct: 0 },
    explanation: "True. Conflict equivalence implies view equivalence; the converse fails only for schedules with blind writes.",
  },
  {
    type: "MULTIPLE_CHOICE", subject: CS, topics: ["Database Systems", "Isolation Levels"], difficulty: "MEDIUM",
    prompt: "Which anomalies can still happen at the **READ COMMITTED** isolation level? Select all that apply.",
    options: ["Dirty reads", "Non-repeatable reads", "Phantom reads"],
    answer: { correct: [1, 2] },
    explanation: "READ COMMITTED only rules out dirty reads. A row can change between two reads, and new rows can appear in a range.",
  },
  {
    type: "NUMERIC", subject: CS, topics: ["Database Systems", "Indexing"], difficulty: "MEDIUM",
    prompt: "A B+ tree has a fan-out of 100 and each leaf holds 100 keys. What is the minimum number of levels, counting the leaves, needed for **1,000,000** keys?",
    answer: { value: 3, tolerance: 0, toleranceType: "ABSOLUTE", unit: "levels" },
    explanation: "10^6 / 100 = 10,000 leaves, 100 internal nodes above them, then 1 root: 3 levels.",
  },
  {
    type: "SHORT_TEXT", subject: CS, topics: ["Database Systems", "Recovery"], difficulty: "EASY",
    prompt: "Which rule says a page's log records must reach stable storage before the page itself is written to disk? Give its usual abbreviation.",
    answer: { accepted: ["WAL", "write-ahead logging", "write ahead logging"], caseSensitive: false },
    explanation: "**WAL**, write-ahead logging. It lets recovery undo changes that reached disk before the commit.",
    decoys: ["ARIES", "checkpointing"],
  },
  {
    type: "WRITTEN", subject: CS, topics: ["Database Systems", "Serializability"], difficulty: "MEDIUM", points: 6,
    prompt: "Is the schedule **S: r1(A), r2(A), w1(A), w2(A), c1, c2** conflict serializable? Give the conflicting pairs, draw the precedence graph and justify your answer.",
    answer: {
      rubric: "- 2 marks: conflicting pairs r1(A)–w2(A), r2(A)–w1(A), w1(A)–w2(A).\n- 2 marks: precedence graph with edges T1 → T2 and T2 → T1.\n- 2 marks: the graph has a cycle, so S is not conflict serializable.",
      modelAnswer: "Conflicts on A: r1(A) before w2(A) gives T1 → T2; r2(A) before w1(A) gives T2 → T1; w1(A) before w2(A) gives T1 → T2. The precedence graph has the cycle T1 → T2 → T1, so S isn't conflict serializable. This is the lost update problem: T1's write is overwritten by T2, which read A before T1 wrote it.",
      allowText: true, allowImages: true, maxWords: 200, maxImages: 2,
    },
    explanation: "A schedule is conflict serializable exactly when its precedence graph is acyclic.",
    samples: [
      { text: "Conflicting pairs: r1(A)-w2(A) gives T1 -> T2, r2(A)-w1(A) gives T2 -> T1, w1(A)-w2(A) gives T1 -> T2. The precedence graph has edges T1 -> T2 and T2 -> T1, which is a cycle, so S is not conflict serializable. It's the lost update pattern.", feedback: "Every conflicting pair is listed, the graph is right and the cycle argument is clear.", breakdown: [["Conflicting pairs", 2, 2], ["Precedence graph", 2, 2], ["Conclusion", 2, 2]] },
      { text: "w1(A) and w2(A) conflict so there is an edge T1 -> T2. The graph has no cycle so S is conflict serializable, equivalent to T1 then T2.", feedback: "You found one edge, but r2(A) comes before w1(A), which adds T2 → T1. With both edges there's a cycle, so S isn't conflict serializable.", breakdown: [["Conflicting pairs", 1, 2], ["Precedence graph", 0.5, 2], ["Conclusion", 0, 2]] },
      { text: "It is serializable because both transactions commit at the end.", feedback: "Commit order doesn't decide this. List the conflicting operations on A, draw an edge for each, and check the graph for a cycle.", breakdown: [["Conflicting pairs", 0, 2], ["Precedence graph", 0, 2], ["Conclusion", 0, 2]] },
    ],
  },
];

/** The student's AI-written rows (without owner; the seed sets createdById). */
export function aiPaperRows() {
  return aiDatabase.map(({ prompt, decoys, samples, ...q }) => ({
    row: {
      type: q.type,
      question: prompt,
      options: q.options ?? null,
      answer: q.answer,
      correctAnswer: q.type === "SINGLE_CHOICE" ? q.answer.correct : null,
      explanation: q.explanation ?? null,
      points: q.type === "WRITTEN" ? q.points : null,
      subject: q.subject,
      topics: q.topics,
      difficulty: q.difficulty,
      source: "AI",
      isPublic: false,
    },
    extras: { decoys, samples },
  }));
}
