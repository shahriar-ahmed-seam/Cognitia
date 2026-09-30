// Question bank for model tests and contests.
// Subjects match the options offered by the web app ("Computer Science", "Mathematics", "Physics").
// Each entry: [topics, difficulty, question, options, correctIndex, explanation]

const CS = "Computer Science";
const MATH = "Mathematics";
const PHY = "Physics";

const bank = {
  [CS]: [
    // Operating Systems
    [["Operating Systems", "CPU Scheduling"], "EASY", "Which CPU scheduling algorithm can starve long-running processes?", ["First-Come First-Served", "Shortest Job First", "Round Robin", "FCFS with aging"], 1, "If short jobs keep arriving, SJF keeps postponing long jobs. Aging (raising priority over time) is the usual fix."],
    [["Operating Systems", "Paging"], "MEDIUM", "A system uses 32-bit logical addresses and 4 KB pages. How many entries does a single-level page table have?", ["2^12", "2^20", "2^22", "2^32"], 1, "4 KB = 2^12 bytes, so 12 bits are the offset and the remaining 20 bits index the page table: 2^20 entries."],
    [["Operating Systems", "Deadlocks"], "MEDIUM", "Which of the following is NOT one of the four necessary conditions for deadlock?", ["Mutual exclusion", "Hold and wait", "Preemption", "Circular wait"], 2, "The condition is NO preemption. Allowing preemption actually breaks deadlock."],
    [["Operating Systems", "Page Replacement"], "HARD", "With 3 frames and reference string 1,2,3,4,1,2,5,1,2,3,4,5, how many page faults does FIFO produce?", ["8", "9", "10", "12"], 1, "FIFO gives 9 faults with 3 frames and 10 with 4 frames. This is the classic Belady's anomaly example."],
    [["Operating Systems", "Processes"], "EASY", "What does a context switch save and restore?", ["Only the process's page table", "The CPU state of a process (registers, program counter)", "The whole contents of main memory", "Every open file of every process"], 1, "The kernel saves the running process's CPU context into its PCB and loads the next process's context."],
    [["Operating Systems", "Deadlocks"], "MEDIUM", "In the Banker's algorithm, a state is safe if:", ["No process holds any resource", "There is an order in which every process can finish", "Available resources exceed the total maximum demand", "All processes request resources at the same time"], 1, "A safe sequence must exist in which each process's remaining need can be met by available plus released resources."],
    [["Operating Systems", "Synchronization"], "MEDIUM", "Peterson's solution guarantees which properties for two processes?", ["Mutual exclusion only", "Mutual exclusion, progress and bounded waiting", "Progress only", "Deadlock freedom but not mutual exclusion"], 1, "Peterson's algorithm satisfies all three requirements of the critical-section problem for two processes."],
    [["Operating Systems", "Paging"], "HARD", "TLB hit ratio is 90%, TLB lookup takes 10 ns and a memory access takes 100 ns. What is the effective access time with a single-level page table?", ["110 ns", "120 ns", "130 ns", "200 ns"], 1, "EAT = 0.9 x (10 + 100) + 0.1 x (10 + 100 + 100) = 99 + 21 = 120 ns."],
    [["Operating Systems", "Processes"], "EASY", "Which system call creates a new process in UNIX?", ["exec()", "fork()", "wait()", "exit()"], 1, "fork() duplicates the calling process. exec() replaces the current process image; it does not create a new process."],
    [["Operating Systems", "Processes"], "HARD", "A program calls fork() three times in a row (no conditions). How many processes exist in total, including the original?", ["3", "4", "6", "8"], 3, "Each fork doubles the number of processes: 2^3 = 8."],

    // Computer Networks
    [["Computer Networks", "OSI Model"], "EASY", "Which OSI layer is responsible for routing packets between networks?", ["Data link", "Network", "Transport", "Session"], 1, "The network layer (IP) handles logical addressing and routing."],
    [["Computer Networks", "Link Layer"], "EASY", "Which protocol maps an IPv4 address to a MAC address on a LAN?", ["DNS", "DHCP", "ARP", "ICMP"], 2, "ARP broadcasts a request for the MAC address that owns a given IP address."],
    [["Computer Networks", "Subnetting"], "MEDIUM", "How many usable host addresses does a /26 IPv4 subnet have?", ["30", "62", "64", "126"], 1, "A /26 leaves 6 host bits: 2^6 = 64 addresses, minus network and broadcast = 62."],
    [["Computer Networks", "TCP"], "EASY", "What are the three segments of TCP's connection handshake?", ["SYN, SYN-ACK, ACK", "SYN, ACK, FIN", "SYN, FIN, ACK", "ACK, SYN, SYN-ACK"], 0, "Client sends SYN, server replies SYN-ACK, client confirms with ACK."],
    [["Computer Networks", "Congestion Control"], "HARD", "In TCP Reno, what happens to the congestion window after three duplicate ACKs?", ["It resets to 1 MSS and slow start begins", "It is halved and fast recovery begins", "It doubles", "It stays the same"], 1, "Three duplicate ACKs signal mild congestion: Reno halves cwnd and enters fast recovery instead of slow start."],
    [["Computer Networks", "Transport Layer"], "EASY", "Which statement about UDP is correct?", ["It guarantees in-order delivery", "It is connection-oriented", "It has low overhead and no delivery guarantee", "It performs congestion control"], 2, "UDP is connectionless with an 8-byte header and no reliability, ordering or congestion control."],
    [["Computer Networks", "Performance"], "HARD", "A 10 Mbps link has a one-way propagation delay of 20 ms. What is its bandwidth-delay product?", ["20,000 bits", "200,000 bits", "2,000,000 bits", "25,000 bits"], 1, "10 x 10^6 bits/s x 0.02 s = 200,000 bits (25 KB) can be in flight one way."],
    [["Computer Networks", "Application Layer"], "MEDIUM", "Which port does HTTPS use by default?", ["80", "21", "443", "8080"], 2, "HTTP uses 80 and HTTPS (HTTP over TLS) uses 443."],
    [["Computer Networks", "Routing"], "MEDIUM", "OSPF is best described as a:", ["Distance-vector protocol", "Link-state protocol", "Path-vector protocol", "Static routing protocol"], 1, "OSPF floods link-state advertisements and runs Dijkstra on the full topology. BGP is path-vector, RIP is distance-vector."],

    // Database Systems
    [["Database Systems", "SQL"], "EASY", "Which SQL clause filters groups after aggregation?", ["WHERE", "HAVING", "ORDER BY", "GROUP BY"], 1, "WHERE filters rows before grouping; HAVING filters the groups produced by GROUP BY."],
    [["Database Systems", "Normalization"], "MEDIUM", "A relation is in BCNF if, for every non-trivial functional dependency X -> Y:", ["Y is a prime attribute", "X is a superkey", "X is a candidate key and Y is non-prime", "Y is a subset of X"], 1, "BCNF requires the left side of every non-trivial FD to be a superkey."],
    [["Database Systems", "Transactions"], "EASY", "Which ACID property ensures that a committed transaction survives a crash?", ["Atomicity", "Consistency", "Isolation", "Durability"], 3, "Durability: once committed, changes are persisted (usually through the write-ahead log)."],
    [["Database Systems", "Transactions"], "MEDIUM", "Which isolation level prevents dirty reads but still allows non-repeatable reads?", ["Read Uncommitted", "Read Committed", "Repeatable Read", "Serializable"], 1, "Read Committed only shows committed data, but a row read twice can change between reads."],
    [["Database Systems", "Concurrency Control"], "HARD", "Basic two-phase locking (2PL) guarantees:", ["Freedom from deadlock", "Conflict-serializable schedules", "No cascading aborts", "That no transaction ever waits"], 1, "2PL guarantees conflict serializability. It can still deadlock, and only strict 2PL avoids cascading aborts."],
    [["Database Systems", "Indexing"], "MEDIUM", "Why are B+ trees preferred over binary search trees for disk-based indexes?", ["They use less memory per key", "Their high fan-out keeps the tree shallow, so fewer disk reads are needed", "They never need rebalancing", "They support only equality search"], 1, "Each node fills a disk page with many keys, so lookups touch only 3-4 pages even for millions of rows."],
    [["Database Systems", "Relational Algebra"], "HARD", "A natural join of R(A, B) and S(B, C) where B has no common values produces:", ["The Cartesian product of R and S", "An empty relation", "R unchanged", "An error"], 1, "A natural join keeps only tuples that agree on B. With no matching values, the result is empty."],

    // Algorithms
    [["Algorithms", "Sorting"], "EASY", "What is the worst-case time complexity of Quick Sort?", ["O(n log n)", "O(n^2)", "O(n)", "O(log n)"], 1, "When the pivot is always the smallest or largest element (e.g. sorted input with first-element pivot), the recursion depth becomes n."],
    [["Algorithms", "Graphs"], "EASY", "Dijkstra's algorithm may give wrong shortest paths when the graph has:", ["Cycles", "Negative edge weights", "Undirected edges", "More than 1000 vertices"], 1, "Dijkstra finalizes a vertex assuming no later path can be shorter, which negative edges violate. Use Bellman-Ford instead."],
    [["Algorithms", "Recurrences"], "MEDIUM", "Solve the recurrence T(n) = 2T(n/2) + n.", ["O(n)", "O(n log n)", "O(n^2)", "O(log n)"], 1, "Master theorem case 2: a = 2, b = 2, f(n) = n = n^(log_b a), so T(n) = O(n log n)."],
    [["Algorithms", "Complexity"], "MEDIUM", "Which of these problems is NP-complete?", ["Single-source shortest path", "Minimum spanning tree", "3-SAT", "Sorting"], 2, "3-SAT is NP-complete (Cook-Levin plus reduction). The others have polynomial-time algorithms."],
    [["Algorithms", "Graphs"], "MEDIUM", "What is the time complexity of Floyd-Warshall on a graph with V vertices?", ["O(V^2)", "O(V^3)", "O(V^2 log V)", "O(E log V)"], 1, "Three nested loops over all vertices: O(V^3)."],
    [["Algorithms", "Dynamic Programming"], "HARD", "The 0/1 knapsack DP runs in O(nW). Why is it not a polynomial-time algorithm?", ["It uses recursion", "W is exponential in the number of bits used to represent it", "n can be negative", "It needs O(n^2) memory"], 1, "The running time depends on the numeric value W, not its input length log W. This is called pseudo-polynomial time."],
    [["Algorithms", "Greedy"], "MEDIUM", "Kruskal's algorithm builds a minimum spanning tree by:", ["Growing one tree from a start vertex", "Adding the cheapest edge that does not form a cycle", "Removing the most expensive edge in every cycle", "Running BFS from every vertex"], 1, "Kruskal sorts edges by weight and uses union-find to skip edges that would create a cycle."],
    [["Algorithms", "Dynamic Programming"], "HARD", "What is the time complexity of the standard DP for the longest common subsequence of strings of length m and n?", ["O(m + n)", "O(mn)", "O(2^(m+n))", "O(m log n)"], 1, "The DP table has (m+1)(n+1) cells, each filled in O(1)."],

    // Data Structures
    [["Data Structures", "Trees"], "EASY", "What is the maximum number of nodes in a binary tree of height h (root at height 0)?", ["2^h", "2^h - 1", "2^(h+1) - 1", "h^2"], 2, "Level i holds at most 2^i nodes; summing 2^0 ... 2^h gives 2^(h+1) - 1."],
    [["Data Structures", "Heaps"], "HARD", "Building a binary heap from an unsorted array of n elements with bottom-up heapify takes:", ["O(n)", "O(n log n)", "O(log n)", "O(n^2)"], 0, "Most nodes are near the leaves and sift down only a little; the total work sums to O(n)."],
    [["Data Structures", "Trees"], "EASY", "What height does an AVL tree with n nodes guarantee?", ["O(n)", "O(log n)", "O(sqrt n)", "O(1)"], 1, "AVL rotations keep subtree heights within 1 of each other, bounding height by about 1.44 log2 n."],
    [["Data Structures", "Hashing"], "MEDIUM", "Which open-addressing strategy suffers most from primary clustering?", ["Separate chaining", "Linear probing", "Double hashing", "Cuckoo hashing"], 1, "Linear probing fills consecutive slots, so occupied runs grow and attract more collisions."],
    [["Data Structures", "Stacks and Queues"], "EASY", "Which data structure does breadth-first search use?", ["Stack", "Queue", "Priority queue", "Hash table"], 1, "BFS visits vertices in order of distance, which a FIFO queue provides. DFS uses a stack."],

    // Digital Logic and Computer Architecture
    [["Digital Logic", "Combinational Circuits"], "EASY", "How many select lines does an 8-to-1 multiplexer need?", ["2", "3", "4", "8"], 1, "2^3 = 8 inputs, so 3 select lines."],
    [["Digital Logic", "Logic Gates"], "EASY", "Which gate is a universal gate?", ["XOR", "NAND", "XNOR", "AND"], 1, "Any Boolean function can be built from NAND gates alone (NOR is also universal)."],
    [["Digital Logic", "Boolean Algebra"], "MEDIUM", "The Boolean expression A + A'B simplifies to:", ["A", "B", "A + B", "AB"], 2, "A + A'B = (A + A')(A + B) = A + B."],
    [["Computer Architecture", "Pipelining"], "MEDIUM", "A 5-stage pipeline with no stalls executes 100 instructions. How many clock cycles does this take?", ["100", "104", "105", "500"], 1, "The first instruction takes k = 5 cycles, then one completes per cycle: k + n - 1 = 104."],
    [["Computer Architecture", "Cache"], "HARD", "A 64 KB, 4-way set-associative cache has 64-byte blocks. How many sets does it have?", ["64", "128", "256", "1024"], 2, "64 KB / 64 B = 1024 blocks; 1024 / 4 ways = 256 sets."],
    [["Computer Architecture", "Microprocessors"], "MEDIUM", "In the Intel 8086, the 20-bit physical address is formed as:", ["Segment + Offset", "Segment x 16 + Offset", "Segment x 256 + Offset", "Offset x 16 + Segment"], 1, "The 16-bit segment is shifted left by 4 bits (x 16) and the offset is added."],
    [["Digital Logic", "Sequential Circuits"], "MEDIUM", "What distinguishes a flip-flop from a latch?", ["A flip-flop has no clock input", "A flip-flop is edge-triggered while a latch is level-sensitive", "A latch stores two bits", "A latch cannot be built from NAND gates"], 1, "A latch follows its input while enabled; a flip-flop samples only at a clock edge."],

    // Theory of Computation
    [["Theory of Computation", "Regular Languages"], "MEDIUM", "Which language is NOT regular?", ["Strings over {a,b} with an even number of a's", "{a^n b^n | n >= 0}", "Strings ending in 'ab'", "(ab)*"], 1, "Recognizing a^n b^n requires unbounded counting; the pumping lemma shows it is not regular."],
    [["Theory of Computation", "Decidability"], "HARD", "Which problem is undecidable?", ["Whether a DFA accepts the empty language", "Whether two DFAs are equivalent", "Whether a Turing machine halts on a given input", "Whether a CFG generates a given string"], 2, "The halting problem is undecidable. The other three have algorithms."],
    [["Theory of Computation", "Automata"], "EASY", "Nondeterministic pushdown automata are equivalent in power to:", ["Regular expressions", "Context-free grammars", "Turing machines", "Finite automata"], 1, "NPDAs recognize exactly the context-free languages."],

    // Software Engineering
    [["Software Engineering", "Agile"], "EASY", "In Scrum, who owns the product backlog and maximizes product value?", ["Scrum Master", "Product Owner", "Development Team", "Stakeholders"], 1, "The Product Owner orders the backlog; the Scrum Master coaches the process."],
    [["Software Engineering", "Design Patterns"], "EASY", "Which design pattern ensures a class has only one instance?", ["Factory", "Observer", "Singleton", "Adapter"], 2, "Singleton restricts instantiation to one object and provides a global access point."],
    [["Software Engineering", "Testing"], "MEDIUM", "Which testing technique derives test cases from the internal structure of the code?", ["Black-box testing", "White-box testing", "Acceptance testing", "Beta testing"], 1, "White-box (structural) testing uses knowledge of paths, branches and conditions in the code."],
    [["Software Engineering", "Testing"], "MEDIUM", "Cyclomatic complexity of a control-flow graph with E edges, N nodes and P connected components is:", ["E - N + 2P", "E + N - 2P", "N - E + P", "2E - N"], 0, "McCabe's metric: V(G) = E - N + 2P. It equals the number of linearly independent paths."],
    [["Software Engineering", "Requirements"], "HARD", "Which of these is a non-functional requirement?", ["Users can reset their password by email", "The dashboard loads within 2 seconds on a 3G connection", "Admins can export contest results as CSV", "Students can upload PDF notes"], 1, "Performance targets describe how well the system works, not what it does."],
  ],

  [MATH]: [
    [["Linear Algebra", "Determinants"], "EASY", "What is the determinant of the matrix [[2, 3], [1, 4]]?", ["5", "11", "-5", "8"], 0, "2 x 4 - 3 x 1 = 5."],
    [["Linear Algebra", "Eigenvalues"], "MEDIUM", "A 3x3 matrix has eigenvalues 1, 2 and 3. What is its determinant?", ["6", "3", "0", "9"], 0, "The determinant is the product of the eigenvalues: 1 x 2 x 3 = 6."],
    [["Linear Algebra", "Rank"], "EASY", "A non-zero 4x4 matrix whose rows are all multiples of the first row has rank:", ["0", "1", "2", "4"], 1, "All rows lie in the span of one vector, so the rank is 1."],
    [["Linear Algebra", "Eigenvalues"], "MEDIUM", "Which statement holds for every real symmetric matrix?", ["All eigenvalues are real", "All eigenvalues are positive", "It is always invertible", "Its eigenvectors are never orthogonal"], 0, "The spectral theorem: real symmetric matrices have real eigenvalues and an orthonormal eigenbasis."],
    [["Probability and Statistics", "Basic Probability"], "EASY", "Two fair dice are rolled. What is the probability that the sum is 7?", ["1/6", "1/12", "7/36", "1/36"], 0, "6 of the 36 outcomes sum to 7: 6/36 = 1/6."],
    [["Probability and Statistics", "Bayes Theorem"], "HARD", "A test is 99% accurate for a disease with 1% prevalence. If someone tests positive, the chance they have the disease is closest to:", ["99%", "90%", "50%", "1%"], 2, "P = (0.99 x 0.01) / (0.99 x 0.01 + 0.01 x 0.99) = 0.5. Low prevalence makes false positives as common as true ones."],
    [["Probability and Statistics", "Distributions"], "MEDIUM", "For a Poisson distribution with mean lambda, the variance is:", ["lambda", "lambda^2", "sqrt(lambda)", "1/lambda"], 0, "A Poisson distribution's mean and variance are both lambda."],
    [["Probability and Statistics", "Distributions"], "MEDIUM", "X ~ Normal(mean 50, sd 10). About what fraction of values lie between 30 and 70?", ["68%", "95%", "99.7%", "50%"], 1, "30 to 70 is within two standard deviations of the mean: about 95%."],
    [["Discrete Mathematics", "Graph Theory"], "EASY", "How many edges does the complete graph K6 have?", ["12", "15", "30", "36"], 1, "n(n - 1)/2 = 6 x 5 / 2 = 15."],
    [["Discrete Mathematics", "Combinatorics"], "EASY", "In how many ways can 5 distinct books be arranged on a shelf?", ["25", "60", "120", "720"], 2, "5! = 120."],
    [["Discrete Mathematics", "Combinatorics"], "MEDIUM", "How many 8-bit strings contain exactly three 1s?", ["24", "56", "70", "336"], 1, "Choose the positions of the 1s: C(8, 3) = 56."],
    [["Discrete Mathematics", "Logic"], "EASY", "The contrapositive of 'If p then q' is:", ["If q then p", "If not p then not q", "If not q then not p", "p and not q"], 2, "The contrapositive negates and swaps both parts, and is logically equivalent to the original."],
    [["Calculus", "Differentiation"], "EASY", "What is the derivative of x sin(x)?", ["cos(x)", "x cos(x) + sin(x)", "x cos(x)", "-x sin(x)"], 1, "Product rule: (x)' sin(x) + x (sin x)' = sin(x) + x cos(x)."],
    [["Calculus", "Laplace Transform"], "MEDIUM", "The Laplace transform of e^(at) is:", ["1/(s + a)", "1/(s - a)", "s/(s^2 + a^2)", "a/(s^2 + a^2)"], 1, "Integral of e^(at) e^(-st) from 0 to infinity = 1/(s - a), valid for s > a."],
    [["Numerical Methods", "Root Finding"], "MEDIUM", "What is the order of convergence of Newton-Raphson near a simple root?", ["Linear", "Quadratic", "Cubic", "About 1.618"], 1, "The error roughly squares each iteration. The secant method converges with order about 1.618."],
    [["Numerical Methods", "Integration"], "HARD", "The trapezoidal rule integrates exactly every polynomial of degree at most:", ["0", "1", "2", "3"], 1, "It fits straight lines, so it is exact for linear functions. Simpson's 1/3 rule is exact up to degree 3."],
    [["Numerical Methods", "Linear Systems"], "HARD", "Gauss-Seidel iteration is guaranteed to converge when the coefficient matrix is:", ["Singular", "Strictly diagonally dominant", "Upper triangular with zero diagonal", "Any square matrix"], 1, "Strict diagonal dominance (or symmetric positive definiteness) is a sufficient condition."],
  ],

  [PHY]: [
    [["Electromagnetism", "Units"], "EASY", "What is the SI unit of capacitance?", ["Henry", "Farad", "Tesla", "Weber"], 1, "Capacitance is measured in farads (coulomb per volt)."],
    [["Electric Circuits", "Resistors"], "EASY", "Three 6-ohm resistors are connected in parallel. What is the equivalent resistance?", ["18 ohm", "2 ohm", "3 ohm", "6 ohm"], 1, "1/R = 3 x 1/6 = 1/2, so R = 2 ohm."],
    [["Electric Circuits", "Transients"], "EASY", "The time constant of an RC circuit is:", ["R/C", "RC", "1/(RC)", "C/R"], 1, "tau = RC. After one time constant a charging capacitor reaches about 63% of the supply voltage."],
    [["Electric Circuits", "AC Circuits"], "MEDIUM", "At resonance in a series RLC circuit:", ["Impedance is maximum", "Current is minimum", "Inductive and capacitive reactances are equal", "Power factor is zero"], 2, "XL = XC, so they cancel. Impedance is minimum (just R) and current is maximum."],
    [["Semiconductors", "Doping"], "MEDIUM", "Doping silicon with phosphorus produces:", ["A p-type semiconductor", "An n-type semiconductor", "An insulator", "An intrinsic semiconductor"], 1, "Phosphorus has five valence electrons, so it donates free electrons."],
    [["Semiconductors", "Diodes"], "EASY", "A silicon diode's forward voltage drop at typical currents is about:", ["0.1 V", "0.3 V", "0.7 V", "1.5 V"], 2, "About 0.7 V for silicon and 0.3 V for germanium."],
    [["Electromagnetism", "Induction"], "MEDIUM", "Faraday's law says the induced EMF in a loop is proportional to:", ["The magnetic field strength", "The rate of change of magnetic flux through the loop", "The area of the loop only", "The resistance of the loop"], 1, "EMF = -d(flux)/dt."],
    [["Electromagnetism", "Electrostatics"], "MEDIUM", "Gauss's law relates the electric flux through a closed surface to:", ["The total current enclosed", "The enclosed charge divided by epsilon-zero", "The rate of change of magnetic flux", "The surface area only"], 1, "Flux = Q_enclosed / epsilon_0."],
    [["Electric Circuits", "AC Circuits"], "MEDIUM", "The RMS value of a sinusoidal voltage with a 311 V peak is about:", ["156 V", "220 V", "311 V", "440 V"], 1, "V_rms = V_peak / sqrt(2) = 311 / 1.414, about 220 V (Bangladesh mains)."],
    [["Waves and Optics", "Interference"], "MEDIUM", "In Young's double-slit experiment, increasing the slit separation makes the fringe spacing:", ["Larger", "Smaller", "Unchanged", "Zero"], 1, "Fringe spacing = lambda D / d, so a larger d gives narrower fringes."],
    [["Electric Circuits", "Network Theorems"], "HARD", "Thevenin's theorem replaces a linear network, seen from two terminals, with:", ["A current source in parallel with a resistor", "A voltage source in series with a resistor", "A single resistor", "A voltage source in parallel with a capacitor"], 1, "Thevenin: V_th in series with R_th. The Norton equivalent is a current source in parallel with a resistor."],
    [["Semiconductors", "Transistors"], "HARD", "A BJT in the active region has:", ["Both junctions forward-biased", "Base-emitter forward-biased and base-collector reverse-biased", "Both junctions reverse-biased", "Base-emitter reverse-biased and base-collector forward-biased"], 1, "Active mode (used for amplification) forward-biases BE and reverse-biases BC. Both forward is saturation."],
    [["Electric Circuits", "Kirchhoff Laws"], "HARD", "Kirchhoff's current law is a consequence of conservation of:", ["Energy", "Charge", "Momentum", "Magnetic flux"], 1, "Charge cannot accumulate at a node, so current in equals current out. KVL follows from conservation of energy."],
  ],
};

// Deterministic shuffle so the correct option isn't always in the same position.
// Numeric option lists keep their natural order.
function hash(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

function shuffleOptions(question, options, correctIndex) {
  if (options.every((option) => /^[-\d]/.test(option))) return { options, correctAnswer: correctIndex };
  const order = options.map((_, i) => i);
  let seed = hash(question);
  for (let i = order.length - 1; i > 0; i--) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const j = seed % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return { options: order.map((i) => options[i]), correctAnswer: order.indexOf(correctIndex) };
}

export const questionBank = Object.entries(bank).flatMap(([subject, rows]) =>
  rows.map(([topics, difficulty, question, options, correctIndex, explanation]) => ({
    subject,
    topics,
    difficulty,
    question,
    ...shuffleOptions(question, options, correctIndex),
    explanation,
  }))
);
