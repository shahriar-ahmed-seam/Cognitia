// Contest demo data: custom questions (all five types) and contests in every lifecycle state.
// Times are relative to the moment the seed runs, so live and upcoming contests stay meaningful.

const INSTITUTION = "Bangladesh University of Engineering and Technology";

// ---------- custom questions ----------
// Shape matches ContestQuestion. `decoys` are plausible wrong answers used to simulate attempts.

const q = {
  offsetBits: {
    type: "NUMERIC", subject: "Computer Science", topics: ["Operating Systems", "Paging"], difficulty: "EASY", points: 2,
    prompt: "A system uses 32-bit logical addresses and 4 KB pages. How many bits of a logical address form the **page offset**?",
    answer: { value: 12, tolerance: 0, toleranceType: "ABSOLUTE", unit: "bits" },
    explanation: "4 KB = 2^12 bytes, so the low 12 bits address a byte within a page.",
  },
  pageTableSize: {
    type: "NUMERIC", subject: "Computer Science", topics: ["Operating Systems", "Paging"], difficulty: "MEDIUM", points: 3,
    prompt: "A single-level page table has 4-byte entries. With 32-bit logical addresses and 4 KB pages, how large is one process's page table?",
    answer: { value: 4, tolerance: 0, toleranceType: "ABSOLUTE", unit: "MB" },
    explanation: "There are 2^32 / 2^12 = 2^20 pages, so the table has 2^20 entries of 4 bytes each: 4 MB.",
  },
  eat: {
    type: "NUMERIC", subject: "Computer Science", topics: ["Operating Systems", "Paging"], difficulty: "MEDIUM", points: 3,
    prompt: "The TLB hit ratio is 80%, a TLB lookup takes 20 ns and a memory access takes 100 ns. What is the effective memory access time with a single-level page table?",
    answer: { value: 140, tolerance: 0.5, toleranceType: "ABSOLUTE", unit: "ns" },
    explanation: "EAT = 0.8 × (20 + 100) + 0.2 × (20 + 100 + 100) = 96 + 44 = **140 ns**.",
  },
  lruFaults: {
    type: "NUMERIC", subject: "Computer Science", topics: ["Operating Systems", "Page Replacement"], difficulty: "HARD", points: 3,
    prompt: "Using **LRU** with 3 frames, how many page faults occur for this reference string?\n\n`7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2, 1, 2, 0, 1, 7, 0, 1`",
    answer: { value: 12, tolerance: 0, toleranceType: "ABSOLUTE", unit: "faults" },
    explanation: "Tracing the string gives 12 faults for LRU. For comparison, FIFO gives 15 and OPT gives 9.",
  },
  stackAlgorithms: {
    type: "MULTIPLE_CHOICE", subject: "Computer Science", topics: ["Operating Systems", "Page Replacement"], difficulty: "MEDIUM", points: 3, partialCredit: true,
    prompt: "Which page-replacement algorithms are **stack algorithms**, and so never show Belady's anomaly? Select all that apply.",
    options: ["LRU", "FIFO", "Optimal (OPT)", "Second chance (clock)"],
    answer: { correct: [0, 2] },
    explanation: "LRU and OPT keep the pages for n frames as a subset of the pages for n + 1 frames. FIFO and clock don't have that inclusion property.",
  },
  beladyTrueFalse: {
    type: "TRUE_FALSE", subject: "Computer Science", topics: ["Operating Systems", "Page Replacement"], difficulty: "EASY", points: 1,
    prompt: "Under FIFO page replacement, adding more frames always reduces the number of page faults.",
    answer: { correct: 1 },
    explanation: "False. Belady's anomaly: with `1,2,3,4,1,2,5,1,2,3,4,5`, FIFO gives 9 faults with 3 frames and 10 with 4.",
  },
  thrashing: {
    type: "SHORT_TEXT", subject: "Computer Science", topics: ["Operating Systems", "Virtual Memory"], difficulty: "EASY", points: 2,
    prompt: "What is the term for a system that spends more time servicing page faults than executing processes? (one word)",
    answer: { accepted: ["thrashing"], caseSensitive: false },
    decoys: ["paging", "swapping", "starvation"],
    explanation: "**Thrashing.** It happens when the working sets of running processes don't fit in memory.",
  },
  pteFields: {
    type: "MULTIPLE_CHOICE", subject: "Computer Science", topics: ["Operating Systems", "Paging"], difficulty: "MEDIUM", points: 3, partialCredit: true,
    prompt: "Which of these are usually stored in a page table entry? Select all that apply.",
    options: ["Frame number", "Valid/invalid bit", "Dirty (modified) bit", "Process priority"],
    answer: { correct: [0, 1, 2] },
    explanation: "A PTE holds the frame number and status bits such as valid, dirty, referenced and protection. Priority belongs to the PCB.",
  },
  virtualMemory: {
    type: "SINGLE_CHOICE", subject: "Computer Science", topics: ["Operating Systems", "Virtual Memory"], difficulty: "EASY", points: 1,
    prompt: "Which technique lets a process use a logical address space larger than the installed physical memory?",
    options: ["Virtual memory with demand paging", "Contiguous allocation", "Segmentation without paging", "Increasing the TLB size"],
    answer: { correct: 0 },
    explanation: "Demand paging keeps only the needed pages in memory and loads the rest on a page fault.",
  },
  k10Edges: {
    type: "NUMERIC", subject: "Computer Science", topics: ["Algorithms", "Graphs"], difficulty: "EASY", points: 2,
    prompt: "How many edges does the complete graph $K_{10}$ have?",
    answer: { value: 45, tolerance: 0, toleranceType: "ABSOLUTE", unit: null },
    explanation: "$\\binom{10}{2} = \\frac{10 \\cdot 9}{2} = 45$.",
  },
  stableSorts: {
    type: "MULTIPLE_CHOICE", subject: "Computer Science", topics: ["Algorithms", "Sorting"], difficulty: "MEDIUM", points: 3, partialCredit: true,
    prompt: "Which of these sorting algorithms are **stable** in their standard textbook form? Select all that apply.",
    options: ["Merge sort", "Insertion sort", "Quick sort", "Heap sort", "Bubble sort"],
    answer: { correct: [0, 1, 4] },
    explanation: "Merge, insertion and bubble sort keep equal keys in their original order. Standard quick sort and heap sort do not.",
  },
  bellmanFord: {
    type: "SHORT_TEXT", subject: "Computer Science", topics: ["Algorithms", "Graphs"], difficulty: "MEDIUM", points: 2,
    prompt: "Name the single-source shortest-path algorithm that works with negative edge weights (but no negative cycles).",
    answer: { accepted: ["Bellman-Ford", "Bellman Ford", "BellmanFord"], caseSensitive: false },
    decoys: ["Dijkstra", "Floyd-Warshall", "Prim"],
    explanation: "**Bellman-Ford** relaxes every edge V − 1 times, in O(VE). A further pass detects negative cycles.",
  },
  maxComparisons: {
    type: "NUMERIC", subject: "Computer Science", topics: ["Algorithms", "Complexity"], difficulty: "MEDIUM", points: 2,
    prompt: "What is the minimum number of comparisons needed, in the worst case, to find the maximum of 16 distinct numbers?",
    answer: { value: 15, tolerance: 0, toleranceType: "ABSOLUTE", unit: null },
    explanation: "Every element except the maximum must lose at least one comparison: n − 1 = 15.",
  },
  subnet27: {
    type: "NUMERIC", subject: "Computer Science", topics: ["Computer Networks", "Subnetting"], difficulty: "EASY", points: 2,
    prompt: "How many usable host addresses does a `/27` IPv4 subnet have?",
    answer: { value: 30, tolerance: 0, toleranceType: "ABSOLUTE", unit: "hosts" },
    explanation: "5 host bits give 2^5 = 32 addresses, minus network and broadcast: 30.",
  },
  arp: {
    type: "SHORT_TEXT", subject: "Computer Science", topics: ["Computer Networks", "Link Layer"], difficulty: "EASY", points: 1,
    prompt: "Which protocol resolves an IPv4 address to a MAC address on a LAN? Give the acronym.",
    answer: { accepted: ["ARP"], caseSensitive: false },
    decoys: ["DNS", "DHCP", "RARP"],
    explanation: "**ARP** (Address Resolution Protocol) broadcasts a request and caches the reply.",
  },
  tcpOrder: {
    type: "TRUE_FALSE", subject: "Computer Science", topics: ["Computer Networks", "TCP"], difficulty: "EASY", points: 1,
    prompt: "TCP delivers the byte stream to the application in order, even when segments arrive out of order.",
    answer: { correct: 0 },
    explanation: "True. TCP buffers out-of-order segments and uses sequence numbers to reassemble the stream.",
  },
  mux32: {
    type: "NUMERIC", subject: "Computer Science", topics: ["Digital Logic", "Combinational Circuits"], difficulty: "EASY", points: 1,
    prompt: "How many select lines does a 32-to-1 multiplexer need?",
    answer: { value: 5, tolerance: 0, toleranceType: "ABSOLUTE", unit: null },
    explanation: "2^5 = 32 inputs, so 5 select lines.",
  },
  dFlipFlop: {
    type: "TRUE_FALSE", subject: "Computer Science", topics: ["Digital Logic", "Sequential Circuits"], difficulty: "EASY", points: 1,
    prompt: "A positive-edge-triggered D flip-flop changes its output only on the rising edge of the clock.",
    answer: { correct: 0 },
    explanation: "True. That's the difference from a level-sensitive latch.",
  },
  nfr: {
    type: "MULTIPLE_CHOICE", subject: "Computer Science", topics: ["Software Engineering", "Requirements"], difficulty: "MEDIUM", points: 3, partialCredit: true,
    prompt: "Which of these are **non-functional** requirements? Select all that apply.",
    options: ["95% of requests complete within 2 seconds", "Students can reset their password by email", "Data is backed up every 24 hours", "Admins can export results as CSV"],
    answer: { correct: [0, 2] },
    explanation: "Performance and backup policies describe qualities of the system. Password reset and CSV export are features.",
  },
  sprint: {
    type: "SHORT_TEXT", subject: "Computer Science", topics: ["Software Engineering", "Agile"], difficulty: "EASY", points: 1,
    prompt: "In Scrum, what is the fixed-length development iteration called?",
    answer: { accepted: ["sprint"], caseSensitive: false },
    decoys: ["iteration", "release", "increment"],
    explanation: "A **sprint**, usually one to four weeks long.",
  },
  cyclomatic: {
    type: "NUMERIC", subject: "Computer Science", topics: ["Software Engineering", "Testing"], difficulty: "MEDIUM", points: 2,
    prompt: "A control-flow graph has 11 edges, 9 nodes and 1 connected component. What is its cyclomatic complexity?",
    answer: { value: 4, tolerance: 0, toleranceType: "ABSOLUTE", unit: null },
    explanation: "V(G) = E − N + 2P = 11 − 9 + 2 = 4.",
  },
  binomial: {
    type: "NUMERIC", subject: "Mathematics", topics: ["Discrete Mathematics", "Combinatorics"], difficulty: "EASY", points: 2,
    prompt: "Evaluate $\\binom{10}{3}$.",
    answer: { value: 120, tolerance: 0, toleranceType: "ABSOLUTE", unit: null },
    explanation: "$\\frac{10 \\cdot 9 \\cdot 8}{3!} = 120$.",
  },
  determinant: {
    type: "NUMERIC", subject: "Mathematics", topics: ["Linear Algebra", "Determinants"], difficulty: "EASY", points: 2,
    prompt: "Find $\\det \\begin{bmatrix} 2 & 1 \\\\ 1 & 3 \\end{bmatrix}$.",
    answer: { value: 5, tolerance: 0, toleranceType: "ABSOLUTE", unit: null },
    explanation: "$2 \\cdot 3 - 1 \\cdot 1 = 5$.",
  },
  trapezoid: {
    type: "NUMERIC", subject: "Mathematics", topics: ["Numerical Methods", "Integration"], difficulty: "MEDIUM", points: 3,
    prompt: "Approximate $\\int_0^1 x^2\\,dx$ with the trapezoidal rule using $n = 2$ subintervals. Give three decimal places.",
    answer: { value: 0.375, tolerance: 0.001, toleranceType: "ABSOLUTE", unit: null },
    explanation: "h = 0.5, so (h/2)[f(0) + 2f(0.5) + f(1)] = 0.25 × (0 + 0.5 + 1) = 0.375. The exact value is 1/3.",
  },
  engineers: {
    type: "NUMERIC", subject: "Mathematics", topics: ["Aptitude", "Work and Time"], difficulty: "EASY", points: 2,
    prompt: "12 engineers finish a task in 10 days. Working at the same rate, how many days would 8 engineers take?",
    answer: { value: 15, tolerance: 0, toleranceType: "ABSOLUTE", unit: "days" },
    explanation: "The task is 120 engineer-days, and 120 / 8 = 15.",
  },
  parseTree: {
    type: "SINGLE_CHOICE", subject: "Computer Science", topics: ["Compilers", "Parsing"], difficulty: "EASY", points: 1,
    prompt: "Which phase of a compiler builds the parse tree?",
    options: ["Lexical analysis", "Syntax analysis", "Code optimization", "Code generation"],
    answer: { correct: 1 },
    explanation: "The parser (syntax analysis) builds the parse tree from the token stream.",
  },
  symbolTable: {
    type: "SHORT_TEXT", subject: "Computer Science", topics: ["Compilers", "Semantic Analysis"], difficulty: "EASY", points: 1,
    prompt: "What data structure does a compiler use to store identifiers and their attributes (type, scope, location)?",
    answer: { accepted: ["symbol table"], caseSensitive: false },
    explanation: "The **symbol table**, usually a hash table per scope.",
  },
  ll1: {
    type: "TRUE_FALSE", subject: "Computer Science", topics: ["Compilers", "Parsing"], difficulty: "MEDIUM", points: 2,
    prompt: "Every LL(1) grammar is also LR(1).",
    answer: { correct: 0 },
    explanation: "True. LL(1) grammars are a proper subset of LR(1) grammars.",
  },

  // ---------- synchronization and deadlocks (objective part) ----------
  semaphoreValue: {
    type: "NUMERIC", subject: "Computer Science", topics: ["Operating Systems", "Synchronization"], difficulty: "EASY", points: 2,
    section: "Part A: Objective",
    prompt: "A counting semaphore starts at **3**. Processes perform 5 `wait()` and 2 `signal()` operations, and nobody stays blocked. What is the semaphore's value afterwards?",
    answer: { value: 0, tolerance: 0, toleranceType: "ABSOLUTE", unit: null },
    explanation: "Each wait decrements and each signal increments: 3 − 5 + 2 = 0.",
  },
  spinlock: {
    type: "TRUE_FALSE", subject: "Computer Science", topics: ["Operating Systems", "Synchronization"], difficulty: "MEDIUM", points: 1,
    section: "Part A: Objective",
    prompt: "On a **single-core** CPU, a spinlock is a good way to protect a critical section that is held for a long time.",
    answer: { correct: 1 },
    explanation: "False. The waiting thread burns its whole time slice spinning, and the lock holder can't run until it's preempted.",
  },
  interrupts: {
    type: "SINGLE_CHOICE", subject: "Computer Science", topics: ["Operating Systems", "Synchronization"], difficulty: "MEDIUM", points: 2,
    section: "Part A: Objective",
    prompt: "Disabling interrupts is used to protect a critical section. On a **multiprocessor**, which requirement does it fail?",
    options: ["Mutual exclusion", "Progress", "Bounded waiting", "None, it works on multiprocessors too"],
    answer: { correct: 0 },
    explanation: "Disabling interrupts only affects the current core, so a thread on another core can still enter the critical section.",
  },
  prevention: {
    type: "MULTIPLE_CHOICE", subject: "Computer Science", topics: ["Operating Systems", "Deadlocks"], difficulty: "MEDIUM", points: 3,
    section: "Part A: Objective", partialCredit: true,
    prompt: "Which of these are deadlock **prevention** techniques? Select all that apply.",
    options: [
      "Number the resources and always request them in increasing order",
      "Request every resource a process needs before it starts",
      "Run the Banker's algorithm before granting each request",
      "Abort one process in the cycle",
    ],
    answer: { correct: [0, 1] },
    explanation: "Ordering resources breaks circular wait and all-at-once requests break hold and wait. The Banker's algorithm is **avoidance**; aborting a process is **recovery**.",
  },
  ragCycle: {
    type: "TRUE_FALSE", subject: "Computer Science", topics: ["Operating Systems", "Deadlocks"], difficulty: "EASY", points: 1,
    section: "Part A: Objective",
    prompt: "If every resource type has a **single instance**, a cycle in the resource-allocation graph means the system is deadlocked.",
    answer: { correct: 0 },
    explanation: "True. With single-instance resources a cycle is both necessary and sufficient for deadlock.",
  },

  // ---------- written questions ----------
  // `samples` are typed answers at three quality levels with the grade a careful examiner gives;
  // breakdown rows are [criterion, awarded, max]. The seed uses them to simulate grading.
  raceCondition: {
    type: "WRITTEN", subject: "Computer Science", topics: ["Operating Systems", "Synchronization"], difficulty: "MEDIUM", points: 5,
    section: "Part B: Written",
    prompt: "Two threads each run `count = count + 1` **1000 times** on a shared variable that starts at 0.\n\n1. Explain why the final value can be **less than 2000**.\n2. Show how a **mutex** fixes it, and why the fix works.\n\nType your answer, or attach a photo of your working.",
    answer: {
      rubric: "- 2 marks: count = count + 1 is not atomic (load, add, store); a concrete interleaving where an update is lost.\n- 2 marks: a mutex acquired before the read and released after the write.\n- 1 mark: why it works: mutual exclusion, only one thread in the read-modify-write at a time, so the result is exactly 2000.",
      modelAnswer: "`count = count + 1` is three machine steps: load count into a register, add 1, store it back. If thread A loads 5 and thread B also loads 5 before A stores, both store 6 and one increment is lost. That can happen many times, so the result can be anything up to 2000.\n\n```\nlock(m)\ncount = count + 1\nunlock(m)\n```\n\nThe mutex turns the read-modify-write into a critical section. Only one thread can hold `m`, so increments can't interleave and the final value is exactly 2000.",
      allowText: true, allowImages: true, maxWords: 300, maxImages: 3,
    },
    explanation: "The increment is a read-modify-write race. Wrapping it in lock/unlock makes it mutually exclusive.",
    samples: [
      {
        text: "count = count + 1 is not atomic. It compiles to three steps: load count into a register, add 1, and store it back. If thread A loads 5, then thread B also loads 5 before A stores, both store 6 and one increment is lost. This can happen many times, so the result can be anywhere below 2000.\n\nFix:\nlock(m)\ncount = count + 1\nunlock(m)\n\nThe mutex makes the read-modify-write a critical section. Only one thread can hold m at a time, so no increment can interleave with another and the final value is exactly 2000.",
        feedback: "Clear explanation of the lost update with a concrete interleaving, and a correct mutex fix with the reason it works.",
        breakdown: [["Explains the lost update", 2, 2], ["Correct mutex fix", 2, 2], ["Why the fix works", 1, 1]],
      },
      {
        text: "Both threads use the same variable at the same time so the value gets overwritten. This is a race condition. We can use a mutex lock so only one thread changes count at a time:\nmutex.lock(); count++; mutex.unlock();",
        feedback: "The fix is right, but show why updates are lost: count = count + 1 is a load, an add and a store, and two threads can interleave between them. Also say why the lock guarantees exactly 2000.",
        breakdown: [["Explains the lost update", 1, 2], ["Correct mutex fix", 2, 2], ["Why the fix works", 0, 1]],
      },
      {
        text: "Because the threads run in parallel the CPU might skip some increments. Making the variable volatile or using a mutex will fix it.",
        feedback: "You spotted the race, but not why increments are lost, and volatile doesn't make count++ atomic. Put the increment between lock and unlock.",
        breakdown: [["Explains the lost update", 0.5, 2], ["Correct mutex fix", 0.5, 2], ["Why the fix works", 0, 1]],
      },
    ],
  },
  coffman: {
    type: "WRITTEN", subject: "Computer Science", topics: ["Operating Systems", "Deadlocks"], difficulty: "EASY", points: 4,
    section: "Part B: Written",
    prompt: "State and briefly explain the **four necessary conditions** for a deadlock.",
    answer: {
      rubric: "1 mark for each condition, named and explained correctly:\n\n- Mutual exclusion\n- Hold and wait\n- No preemption\n- Circular wait\n\nA condition that is only named, with no explanation, gets 0.25.",
      modelAnswer: "1. **Mutual exclusion**: at least one resource is non-shareable.\n2. **Hold and wait**: a process holds a resource while waiting for another.\n3. **No preemption**: resources are released only voluntarily by their holder.\n4. **Circular wait**: a cycle of processes, each waiting for a resource the next one holds.",
      allowText: true, allowImages: true, maxWords: 250, maxImages: 2,
    },
    explanation: "Mutual exclusion, hold and wait, no preemption and circular wait must all hold at once.",
    samples: [
      {
        text: "1. Mutual exclusion: at least one resource is non-shareable, so only one process can use it at a time.\n2. Hold and wait: a process holds at least one resource while waiting to acquire others.\n3. No preemption: a resource can only be released voluntarily by the process holding it.\n4. Circular wait: there is a cycle P0 -> P1 -> ... -> Pn -> P0 where each process waits for a resource held by the next.\nAll four must hold at the same time for a deadlock to occur.",
        feedback: "All four conditions named and explained precisely.",
        breakdown: [["Mutual exclusion", 1, 1], ["Hold and wait", 1, 1], ["No preemption", 1, 1], ["Circular wait", 1, 1]],
      },
      {
        text: "Mutual exclusion, hold and wait, no preemption and circular wait. Mutual exclusion means resources can't be shared. Circular wait means processes wait for each other in a loop.",
        feedback: "All four are named, but hold and wait and no preemption need an explanation: a process holding resources while requesting more, and resources that can't be taken away from their holder.",
        breakdown: [["Mutual exclusion", 1, 1], ["Hold and wait", 0.25, 1], ["No preemption", 0.25, 1], ["Circular wait", 1, 1]],
      },
      {
        text: "Deadlock happens when two processes wait for each other forever. For example P1 has the printer and wants the scanner, and P2 has the scanner and wants the printer. This is circular wait.",
        feedback: "A good example of circular wait, but the question asks for all four conditions. Mutual exclusion, hold and wait and no preemption are missing.",
        breakdown: [["Mutual exclusion", 0, 1], ["Hold and wait", 0, 1], ["No preemption", 0, 1], ["Circular wait", 1, 1]],
      },
    ],
  },
  bankers: {
    type: "WRITTEN", subject: "Computer Science", topics: ["Operating Systems", "Deadlocks", "Banker's Algorithm"], difficulty: "HARD", points: 6,
    section: "Part B: Written",
    prompt: "A system has three resource types A, B and C. **Available = (3, 3, 2)**.\n\n| Process | Allocation (A B C) | Max (A B C) |\n|---|---|---|\n| P0 | 0 1 0 | 7 5 3 |\n| P1 | 2 0 0 | 3 2 2 |\n| P2 | 3 0 2 | 9 0 2 |\n| P3 | 2 1 1 | 2 2 2 |\n| P4 | 0 0 2 | 4 3 3 |\n\nUsing the **Banker's safety algorithm**, is this state safe? Show the Need matrix and each step. A photo of handwritten working is fine.",
    answer: {
      rubric: "- 2 marks: correct Need = Max − Allocation for all five processes.\n- 3 marks: runs the safety algorithm step by step, updating Work = Work + Allocation after each process.\n- 1 mark: concludes the state is safe with a valid safe sequence. Any valid sequence (e.g. <P1, P3, P4, P2, P0> or <P1, P3, P4, P0, P2>) gets full marks.",
      modelAnswer: "Need: P0 (7,4,3), P1 (1,2,2), P2 (6,0,0), P3 (0,1,1), P4 (4,3,1).\n\nWork = (3,3,2) → P1 → (5,3,2) → P3 → (7,4,3) → P4 → (7,4,5) → P2 → (10,4,7) → P0 → (10,5,7).\n\nEvery process can finish, so the state is **safe**: <P1, P3, P4, P2, P0>.",
      allowText: true, allowImages: true, maxWords: 400, maxImages: 4,
    },
    explanation: "Need = Max − Allocation, then repeatedly pick a process whose Need fits in Work. <P1, P3, P4, P2, P0> is one safe sequence.",
    samples: [
      {
        text: "Need = Max - Allocation:\nP0 (7,4,3), P1 (1,2,2), P2 (6,0,0), P3 (0,1,1), P4 (4,3,1)\n\nWork = (3,3,2)\nP1: Need (1,2,2) <= Work, so Work = (3,3,2) + (2,0,0) = (5,3,2)\nP3: (0,1,1) <= (5,3,2), Work = (7,4,3)\nP4: (4,3,1) <= (7,4,3), Work = (7,4,5)\nP2: (6,0,0) <= (7,4,5), Work = (10,4,7)\nP0: (7,4,3) <= (10,4,7), Work = (10,5,7)\n\nAll processes can finish, so the state is safe. Safe sequence: <P1, P3, P4, P2, P0>.",
        feedback: "Correct Need matrix, every Work update is right, and the safe sequence is valid.",
        breakdown: [["Need matrix", 2, 2], ["Safety algorithm steps", 3, 3], ["Conclusion and safe sequence", 1, 1]],
      },
      {
        text: "Need: P0 = 743, P1 = 122, P2 = 600, P3 = 011, P4 = 431.\nWork = 332. P1 can run, Work = 532. P3 can run, Work = 543. P4 needs 431, ok, Work = 545. P0 needs 743, not possible. P2 needs 600, not possible. So the system is unsafe.",
        feedback: "The Need matrix is right. After P3 finishes, Work should be (5,3,2) + (2,1,1) = (7,4,3), not (5,4,3); that slip made P0 and P2 look blocked. The state is actually safe, for example <P1, P3, P4, P2, P0>.",
        breakdown: [["Need matrix", 2, 2], ["Safety algorithm steps", 1.5, 3], ["Conclusion and safe sequence", 0, 1]],
      },
      {
        text: "P0 needs 7,4,3 which is more than available 3,3,2 so P0 has to wait. The other processes are also holding resources, so this will lead to a deadlock. The state is unsafe.",
        feedback: "The safety algorithm tries every process, not only P0. P1's Need (1,2,2) fits in Work (3,3,2), and continuing from there gives the safe sequence <P1, P3, P4, P2, P0>.",
        breakdown: [["Need matrix", 0.5, 2], ["Safety algorithm steps", 0.5, 3], ["Conclusion and safe sequence", 0, 1]],
      },
    ],
  },
  thrashingExplain: {
    type: "WRITTEN", subject: "Computer Science", topics: ["Operating Systems", "Virtual Memory"], difficulty: "MEDIUM", points: 4,
    prompt: "What is **thrashing**? Describe **two** ways an operating system can prevent it.",
    answer: {
      rubric: "- 2 marks: processes have fewer frames than their working sets, so they page-fault constantly; the system spends its time paging and CPU utilization collapses.\n- 2 marks: two valid OS techniques, 1 mark each: working-set model, page-fault frequency (PFF) control, lowering the degree of multiprogramming (suspending processes), local page replacement. More RAM or a faster CPU isn't an OS technique.",
      modelAnswer: "Thrashing happens when processes don't have enough frames for their working sets: they fault on almost every access, the paging device is saturated and CPU utilization drops. Prevention: the **working-set model** (allocate frames for each working set, suspend a process when total demand exceeds memory) and **page-fault frequency control** (add frames when a process faults too often, take them away when it faults rarely).",
      allowText: true, allowImages: false, maxWords: 200,
    },
    explanation: "Thrashing is paging overload. The working-set model and page-fault frequency control keep it in check.",
    samples: [
      {
        text: "Thrashing is when a process doesn't have enough frames for its working set, so it page-faults constantly. The system spends most of its time swapping pages in and out and CPU utilization collapses; the scheduler may make it worse by admitting more processes. Prevention: (1) the working-set model: give each process enough frames for its working set and suspend a process if total demand exceeds the frames. (2) Page-fault frequency control: keep each process's fault rate between an upper and lower bound by adding or removing frames.",
        feedback: "Precise definition, including why CPU use drops, and two correct techniques explained well.",
        breakdown: [["Definition of thrashing", 2, 2], ["Two prevention techniques", 2, 2]],
      },
      {
        text: "Thrashing means there are too many page faults so the system becomes very slow. We can prevent it by adding more RAM or by using a better page replacement algorithm like LRU.",
        feedback: "Right idea, but explain the cause: processes have fewer frames than their working sets, so paging dominates and CPU use drops. More RAM isn't an OS technique and LRU alone doesn't stop thrashing; use the working-set model or page-fault frequency control.",
        breakdown: [["Definition of thrashing", 1.5, 2], ["Two prevention techniques", 0.5, 2]],
      },
      {
        text: "Thrashing is when the CPU is overloaded because too many processes are running. We can prevent it with a faster CPU.",
        feedback: "Thrashing is about memory, not CPU load: processes keep page-faulting because they lack frames. Look at the working-set model and page-fault frequency control.",
        breakdown: [["Definition of thrashing", 0.5, 2], ["Two prevention techniques", 0, 2]],
      },
    ],
  },
};

export const contestQuestions = q;

// ---------- contests ----------

const standardRules = `- Use only a calculator and blank paper. Notes and websites aren't allowed.
- Don't discuss the questions with anyone until the contest ends.
- Use **Ask a question** in the contest for clarifications. Public answers are shown to everyone.`;

/**
 * @typedef {object} SeedContest
 * `state`: results | review | grading | live | upcoming | draft | cancelled
 *   (grading: ended and finalized, results wait until every written answer is graded)
 * `participants`: [key, status, extra] where status is registered | submitted | in_progress
 * `owner` (default admin) and `team`: [key, "EDITOR" | "GRADER"] form the organizing team
 * `writtenState`: how submitted written answers were graded: graded | mixed | review
 */
export function contestDefinitions({ atDay, later, now, MINUTE, DAY }) {
  return [
    {
      key: "algo10", state: "results",
      title: "Weekly Algorithms Challenge #10", kind: "CHALLENGE", difficulty: "MEDIUM", isRated: true,
      summary: "Sorting, recurrences and graph basics in 40 minutes.",
      description: "The weekly challenge series covers one algorithms theme each week. This round focused on **sorting and recurrences**.\n\nTop three finishers get a shout-out in the CSE 3-2 group.",
      hostName: "BUET CSE Programming Club", subjects: ["Computer Science"], topics: ["Algorithms", "Data Structures"],
      start: atDay(-35, 21), minutes: 40,
      bank: [{ topics: ["Algorithms", "Data Structures"], count: 8 }],
      participants: [["student", "submitted"], ["arif", "submitted"], ["fahim", "submitted"], ["anika", "submitted"], ["rakib", "submitted"], ["zarif", "submitted"], ["mahir", "submitted"], ["shafin", "submitted"], ["rafid", "submitted"], ["tanzim", "submitted"]],
    },
    {
      key: "algo11", state: "results",
      title: "Weekly Algorithms Challenge #11", kind: "CHALLENGE", difficulty: "MEDIUM", isRated: true,
      summary: "Dynamic programming and greedy strategies. Eight questions, 45 minutes.",
      description: "This week's theme was **dynamic programming vs greedy**. Expect questions on complexity, correctness arguments and classic problems.",
      hostName: "BUET CSE Programming Club", subjects: ["Computer Science"], topics: ["Algorithms", "Dynamic Programming"],
      start: atDay(-21, 21), minutes: 45,
      bank: [{ topics: ["Algorithms", "Data Structures"], count: 7 }], custom: [q.maxComparisons],
      participants: [["student", "submitted"], ["arif", "submitted"], ["fahim", "submitted"], ["anika", "submitted"], ["zarif", "submitted"], ["mahir", "submitted"], ["tahmid", "submitted"], ["raisa", "submitted"], ["tanzim", "submitted"], ["sabbir", "submitted"], ["nusrat", "registered"]],
    },
    {
      key: "dlQuiz", state: "results",
      title: "Digital Logic Quiz Night", kind: "QUIZ", difficulty: "EASY", isRated: true,
      summary: "Gates, Boolean algebra, flip-flops and pipelining. A warm-up for the sessional viva.",
      description: "A relaxed evening quiz before the **CSE 3-1 sessional viva**. Ten short questions on combinational and sequential circuits, plus a little architecture.",
      hostName: "IEEE BUET Student Branch", subjects: ["Computer Science"], topics: ["Digital Logic", "Computer Architecture"],
      start: atDay(-14, 21), minutes: 45,
      bank: [{ topics: ["Digital Logic", "Computer Architecture"], count: 8 }], custom: [q.mux32, q.dFlipFlop],
      participants: [["tanvir", "submitted"], ["sadia", "submitted"], ["anika", "submitted"], ["nusrat", "submitted"], ["arif", "submitted"], ["samiha", "submitted"], ["proma", "submitted"], ["adnan", "submitted"], ["ishrat", "submitted"], ["lamia", "submitted"]],
    },
    {
      key: "osNet", state: "results",
      title: "OS and Networks Sprint", kind: "CHALLENGE", difficulty: "MEDIUM", isRated: true, negativeMarking: 0.25,
      summary: "Memory management, scheduling, TCP and subnetting. Negative marking applies.",
      description: "A one-hour sprint across **CSE 313** and **CSE 321**.\n\n### Syllabus\n- Scheduling, deadlocks, paging and page replacement\n- Subnetting, TCP, routing and the link layer\n\nWrong answers cost a quarter of the question's marks, so skip what you don't know.",
      hostName: "BUET CSE Programming Club", subjects: ["Computer Science"], topics: ["Operating Systems", "Computer Networks"],
      start: atDay(-7, 20), minutes: 60, rules: standardRules,
      // Skip bank questions that duplicate the custom ARP and subnetting questions
      bank: [{ topics: ["Operating Systems"], count: 5 }, { topics: ["Computer Networks"], excludeTopics: ["Link Layer", "Subnetting"], count: 5 }],
      custom: [q.subnet27, q.arp, q.tcpOrder],
      announcements: [{ at: 12 * MINUTE, title: "About the TCP question", body: "In the congestion-control question, \"fast recovery\" refers to TCP Reno. The answer key is unchanged." }],
      participants: [["student", "submitted"], ["tasnim", "submitted"], ["arif", "submitted"], ["anika", "submitted"], ["rakib", "submitted"], ["mehjabin", "submitted"], ["fahim", "submitted"], ["zarif", "submitted"], ["mahir", "submitted"], ["nabila", "submitted"], ["shafin", "submitted"], ["farzana", "submitted"], ["rafid", "submitted"], ["mushfiq", "submitted"], ["raisa", "submitted"], ["nusrat", "registered"]],
    },
    {
      key: "seQuiz", state: "review",
      title: "Software Engineering Case Quiz", kind: "QUIZ", difficulty: "MEDIUM", resultsMode: "MANUAL",
      summary: "Requirements, agile process and testing, based on the CSE 307 case study.",
      description: "Questions are drawn from the **CSE 307 term project case study**. Results are published after the course teacher reviews them.",
      hostName: "CSE 307, Section A", subjects: ["Computer Science"], topics: ["Software Engineering"],
      start: later(now, -150 * MINUTE), minutes: 30,
      bank: [{ topics: ["Software Engineering"], count: 5 }], custom: [q.nfr, q.sprint, q.cyclomatic],
      participants: [["student", "submitted"], ["nusrat", "submitted"], ["anika", "submitted"], ["tasnim", "submitted"], ["arif", "submitted"], ["mehjabin", "submitted"], ["tanzim", "submitted"], ["rakib", "registered"]],
    },
    {
      key: "algo12", state: "live",
      title: "Weekly Algorithms Challenge #12", kind: "CHALLENGE", difficulty: "HARD", isRated: true,
      summary: "Graphs, stability of sorts and lower bounds. Harder than usual this week.",
      description: "This week mixes **graph algorithms** with a few lower-bound questions.\n\nNumeric answers are whole numbers. Multiple-select questions give partial credit.",
      hostName: "BUET CSE Programming Club", subjects: ["Computer Science"], topics: ["Algorithms", "Graphs"],
      start: later(now, -25 * MINUTE), minutes: 180, rules: standardRules,
      bank: [{ topics: ["Algorithms", "Data Structures"], count: 8 }], custom: [q.k10Edges, q.stableSorts, q.bellmanFord],
      announcements: [{ at: 2 * MINUTE, title: "Welcome to Challenge #12", body: "All numeric answers are whole numbers. Good luck!" }],
      clarifications: [
        { by: "arif", at: 9 * MINUTE, question: "For the K10 question, is the graph simple (no self-loops or parallel edges)?", answer: "Yes. It's a simple undirected graph.", isPublic: true, customKey: "k10Edges" },
        { by: "zarif", at: 18 * MINUTE, question: "For the stable sorting question, do you mean the standard textbook implementations?", customKey: "stableSorts" },
      ],
      participants: [["student", "registered"], ["tasnim", "registered"], ["arif", "in_progress", { answered: 6, startAfter: 1 }], ["fahim", "submitted", { startAfter: 0 }], ["anika", "submitted", { startAfter: 2 }], ["zarif", "in_progress", { answered: 4, startAfter: 3 }], ["mahir", "submitted", { startAfter: 1 }], ["tahmid", "submitted", { startAfter: 4 }], ["shafin", "in_progress", { answered: 2, startAfter: 10 }]],
    },
    {
      key: "mockCt", state: "live",
      title: "CSE 313 Mock CT-3: Memory Management", kind: "MOCK_EXAM", difficulty: "MEDIUM", timing: "FLEXIBLE", durationMinutes: 30,
      negativeMarking: 0.25, liveStandings: false, visibility: "INSTITUTION", institution: INSTITUTION,
      summary: "Take-home mock for CT-3. Start any time before Thursday night; you get 30 minutes once you begin.",
      description: "A timed mock that mirrors the real **CT-3** syllabus: paging, TLBs, page tables and page replacement.\n\n- The window stays open for three days. Your 30-minute timer starts when you press **Start**.\n- Numeric answers accept small rounding differences where noted.\n- Standings and solutions are published when the window closes.",
      hostName: "CSE 313, Section A", subjects: ["Computer Science"], topics: ["Operating Systems", "Paging", "Page Replacement"],
      start: atDay(-1, 18), end: atDay(2, 23, 59), rules: standardRules,
      custom: [q.offsetBits, q.pageTableSize, q.eat, q.lruFaults, q.stackAlgorithms, q.beladyTrueFalse, q.thrashing, q.pteFields, q.virtualMemory, q.thrashingExplain],
      writtenGrading: "AI_ASSISTED", writtenState: "review",
      announcements: [{ at: 30 * MINUTE, title: "Calculators are fine", body: "Use a calculator freely. Round numeric answers to whole numbers unless the question says otherwise." }],
      participants: [["student", "registered"], ["mehjabin", "registered"], ["tasnim", "submitted", { startAt: atDay(-1, 20, 10), used: 26 * MINUTE }], ["anika", "submitted", { startAt: atDay(0, 7, 30), used: 29 * MINUTE }], ["rakib", "in_progress", { startAt: later(now, -10 * MINUTE), answered: 4 }]],
    },
    {
      key: "dbSpeed", state: "upcoming",
      title: "Database Systems Speed Round", kind: "QUIZ", difficulty: "MEDIUM",
      summary: "Seven quick questions on SQL, normalization and transactions. 45 minutes.",
      description: "A short round to prepare for the **DBMS quiz** next week. Expect SQL, normalization and transactions.",
      hostName: "BUET CSE Programming Club", subjects: ["Computer Science"], topics: ["Database Systems"],
      start: atDay(2, 20), minutes: 45,
      bank: [{ topics: ["Database Systems"], count: 7 }],
      participants: [["mehjabin", "registered"], ["nusrat", "registered"], ["tasnim", "registered"], ["lamia", "registered"], ["farzana", "registered"]],
    },
    {
      key: "sectionA", state: "upcoming",
      title: "Section A Practice Quiz: Computer Networks", kind: "QUIZ", difficulty: "EASY", visibility: "PRIVATE", accessCode: "SECA-2025",
      summary: "Private practice for Section A before the networks CT. Ask Tasnim for the access code.",
      description: "Private to **CSE 3-2 Section A**. It's a short, low-pressure practice before the networks class test.",
      hostName: "CSE 3-2 Section A", subjects: ["Computer Science"], topics: ["Computer Networks"],
      start: atDay(1, 21), minutes: 30,
      bank: [{ topics: ["Computer Networks"], count: 5 }],
      // Run by the class representative, with a classmate helping
      owner: "tasnim", team: [["mehjabin", "EDITOR"]],
      participants: [["rakib", "registered"], ["nusrat", "registered"]],
    },
    {
      key: "aptitude", state: "upcoming",
      title: "BUET CSE Fest 2025: Aptitude Round", kind: "APTITUDE", difficulty: "MEDIUM", visibility: "INSTITUTION", institution: INSTITUTION,
      capacity: 150,
      summary: "Selection round for the CSE Fest problem-solving team. BUET students only.",
      description: "The aptitude round picks the **CSE Fest 2025** problem-solving team. It covers quantitative reasoning and core CS fundamentals.\n\nThe top 20 move on to the onsite round.",
      hostName: "BUET CSE Society", subjects: ["Computer Science", "Mathematics"], topics: ["Aptitude", "Data Structures", "Algorithms"],
      start: atDay(4, 15), minutes: 60, registrationClosesAt: atDay(3, 23, 59),
      bank: [{ topics: ["Data Structures"], count: 4 }, { topics: ["Algorithms"], count: 3 }], custom: [q.engineers],
      participants: [["tasnim", "registered"], ["arif", "registered"], ["tanzim", "registered"], ["samiha", "registered"]],
    },
    {
      key: "olympiad", state: "upcoming",
      title: "Inter-University Engineering Math Olympiad: Preliminary Round", kind: "OLYMPIAD", difficulty: "HARD", isRated: true,
      negativeMarking: 0.25, capacity: 300,
      summary: "Online preliminary for the national engineering math olympiad. Open to every university.",
      description: "The preliminary round of the **Inter-University Engineering Math Olympiad**. The top 50 are invited to the national round in Dhaka.\n\n### Syllabus\n- Linear algebra and discrete mathematics\n- Probability and statistics\n- Calculus and numerical methods",
      hostName: "Engineering Mathematics Society of Bangladesh", subjects: ["Mathematics"], topics: ["Linear Algebra", "Probability and Statistics", "Numerical Methods"],
      start: atDay(6, 19), minutes: 90, registrationClosesAt: atDay(5, 23, 59), rules: standardRules,
      bank: [{ subject: "Mathematics", count: 10 }], custom: [q.binomial, q.determinant, q.trapezoid],
      announcements: [{ at: -2 * DAY, title: "Syllabus and calculators", body: "The syllabus is listed on the overview tab. Non-programmable scientific calculators are allowed." }],
      participants: [["fahim", "registered"], ["ishrat", "registered"], ["mahir", "registered"], ["nabila", "registered"], ["shafin", "registered"], ["farzana", "registered"], ["adnan", "registered"]],
    },
    {
      key: "signals", state: "cancelled",
      title: "Signals and Systems Quiz", kind: "QUIZ", difficulty: "MEDIUM",
      summary: "Convolution, Fourier series and the Laplace transform.",
      description: "A practice quiz for EEE and CSE students taking signals and systems this term.",
      hostName: "IEEE BUET Student Branch", subjects: ["Physics"], topics: ["Electric Circuits"],
      start: atDay(1, 20), minutes: 40,
      cancelReason: "The organizing teacher is away this week. A new date will be announced in the group.",
      bank: [{ subject: "Physics", count: 5 }],
      participants: [["sadia", "registered"], ["student", "registered"], ["tanvir", "registered"]],
    },
    {
      key: "compilers", state: "draft",
      title: "Compiler Design Quiz", kind: "QUIZ", difficulty: "EASY",
      summary: "Lexing, parsing and symbol tables for CSE 309.",
      description: "Draft quiz for CSE 309. More questions to come.",
      hostName: "CSE 309", subjects: ["Computer Science"], topics: ["Compilers"],
      start: atDay(10, 20), minutes: 30,
      custom: [q.parseTree, q.symbolTable, q.ll1],
      team: [["tasnim", "EDITOR"]],
      participants: [],
    },
    {
      key: "syncCt", state: "results",
      title: "CSE 313 Written CT-2: Process Synchronization", kind: "MOCK_EXAM", difficulty: "MEDIUM",
      writtenGrading: "AI_ASSISTED", writtenState: "graded", team: [["rakib", "GRADER"]],
      summary: "Objective questions plus a written race-condition problem, graded against a rubric.",
      description: "A class test in the real **CT format**: a short objective part, then a written problem you answer in your own words or on paper.\n\n- Part A is graded automatically.\n- Part B is graded against the rubric by the AI grader, and every grade is checked by a teacher before results go out.",
      hostName: "CSE 313, Section A", subjects: ["Computer Science"], topics: ["Operating Systems", "Synchronization"],
      start: atDay(-4, 10), minutes: 45, rules: standardRules,
      custom: [q.semaphoreValue, q.spinlock, q.interrupts, q.raceCondition],
      participants: [["student", "submitted"], ["arif", "submitted"], ["anika", "submitted"], ["fahim", "submitted"], ["nusrat", "submitted"], ["mehjabin", "submitted"], ["tanzim", "submitted"], ["sadia", "submitted"], ["tanvir", "submitted"]],
    },
    {
      key: "deadlockCt", state: "grading",
      title: "CSE 313 Written Quiz: Deadlocks", kind: "MOCK_EXAM", difficulty: "HARD",
      writtenGrading: "AI_ASSISTED", writtenState: "mixed", team: [["rakib", "GRADER"]],
      summary: "Deadlock conditions and the Banker's algorithm. Written answers are being graded.",
      description: "Two objective questions and two written problems. Show every step of the Banker's algorithm: working earns marks even if the conclusion is wrong.\n\nResults are published once every written answer is graded.",
      hostName: "CSE 313, Section A", subjects: ["Computer Science"], topics: ["Operating Systems", "Deadlocks"],
      start: later(now, -150 * MINUTE), minutes: 60, rules: standardRules,
      custom: [q.prevention, q.ragCycle, q.coffman, q.bankers],
      participants: [["student", "submitted"], ["arif", "submitted"], ["anika", "submitted"], ["fahim", "submitted"], ["nusrat", "submitted"], ["mehjabin", "submitted"], ["tanzim", "submitted"], ["sadia", "submitted"], ["tanvir", "submitted"], ["samiha", "submitted"]],
    },
  ];
}
