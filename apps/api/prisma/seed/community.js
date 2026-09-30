// Community demo data: spaces for a BUET CSE section (courses, department, the section's private
// group, clubs, topics, study groups), posts of every type, answers, votes, follows and profiles.
import { createPdf } from "./pdf.js";
import { gradientArt } from "./png.js";
import { newMediaId, storageKeyFor, storeBuffer } from "../../src/lib/storage.js";
import { DEFAULT_POST_POLICY, normalizeTags } from "../../src/modules/community/engine.js";
import { recomputeReputation } from "../../src/modules/community/reputation.js";
import { qaThreads } from "./content.js";

const BUET = "Bangladesh University of Engineering and Technology";

// Profile details: usernames, headlines, links, skills
export const profiles = {
  admin: { username: "drfarhana", headline: "Assistant Professor, CSE, BUET. Operating systems and distributed systems.", skills: ["Operating Systems", "Distributed Systems", "Teaching"], links: { website: "https://example.edu/~farhana" } },
  student: { username: "nafis", headline: "L3-T2 CSE, BUET. Operating systems and backend.", skills: ["C", "Linux", "Node.js", "PostgreSQL"], links: { github: "https://github.com/nafis-demo" }, cover: "sky" },
  tasnim: { username: "tasnim", headline: "CR, Section A (CSE '21). Posts every CT date first.", skills: ["Organizing", "Networks", "Python"] },
  arif: { username: "arif", headline: "Competitive programmer, Codeforces Expert. Ask me about DP.", skills: ["C++", "Algorithms", "Dynamic Programming", "Graphs"], links: { github: "https://github.com/arif-demo", codeforces: "https://codeforces.com/profile/arif-demo" }, cover: "violet" },
  mehjabin: { username: "mehjabin", headline: "Databases and data engineering. Neat notes, always PDF.", skills: ["SQL", "PostgreSQL", "Data modeling"] },
  rakib: { username: "rakib", headline: "Networks lab helper. Wireshark enthusiast.", skills: ["Networking", "Wireshark", "Linux"] },
  anika: { username: "anika", headline: "Building an OS-level scheduler for fun.", skills: ["C", "Operating Systems", "Rust"], cover: "emerald" },
  fahim: { username: "fahim", headline: "Math minor. Numerical methods nerd.", skills: ["Numerical Methods", "MATLAB", "Python"] },
  nusrat: { username: "nusrat", headline: "Software engineering and UI design.", skills: ["Figma", "React", "UX research"] },
  tanvir: { username: "tanvir", headline: "Microprocessors, embedded systems and the Robotics Circle.", skills: ["Arduino", "ROS", "Embedded C"] },
  sadia: { username: "sadia", headline: "EEE, taking CSE electives this term.", skills: ["Signals", "MATLAB"] },
  zarif: { username: "zarif", headline: "CUET CSE. ICPC regional 2025.", skills: ["C++", "Number theory"] },
  rafid: { username: "rafid", headline: "IUT CSE, final year. SWE intern at a Dhaka startup.", skills: ["Go", "Kubernetes", "System design"] },
  mahir: { username: "mahir", headline: "KUET CSE. Applying for MS in the US.", skills: ["Machine Learning", "Python"] },
};

// key: [role, members...]. Members join ACTIVE unless listed in `pending` / `invited`.
export const spaces = [
  {
    key: "os", slug: "cse-313-operating-systems", name: "CSE 313: Operating Systems", kind: "COURSE", visibility: "INSTITUTION", courseCode: "CSE 313", isOfficial: true, color: "sky",
    tagline: "Processes, memory, file systems. Questions, notes and CT prep.",
    description: "The course space for **CSE 313, Level 3 Term 2**. Ask anything about the syllabus, share notes and past questions, and find CT dates.\n\nDr. Farhana Haque moderates with two student helpers.",
    rules: "1. Search before you ask: most CT questions have been answered.\n2. Show your working when asking about numericals.\n3. No sharing of ongoing assignment solutions. Explain the method instead.\n4. Be kind. Everyone is learning.",
    owner: "admin", moderators: ["tasnim", "anika"], members: ["student", "arif", "mehjabin", "rakib", "fahim", "nusrat", "tanvir", "tanzim"],
  },
  {
    key: "net", slug: "cse-321-computer-networks", name: "CSE 321: Computer Networks", kind: "COURSE", visibility: "INSTITUTION", courseCode: "CSE 321", isOfficial: true, color: "emerald",
    tagline: "Layers, TCP, routing and the lab.",
    description: "Course space for **CSE 321** and its sessional. Lab report questions welcome.",
    rules: "1. Put the lab number in the title for lab questions.\n2. Paste packet captures as text or screenshots, not phone photos of the screen.",
    owner: "admin", moderators: ["rakib"], members: ["student", "tasnim", "arif", "sadia", "anika", "nusrat"],
  },
  {
    key: "db", slug: "cse-315-database-systems", name: "CSE 315: Database Systems", kind: "COURSE", visibility: "INSTITUTION", courseCode: "CSE 315", isOfficial: true, color: "amber",
    tagline: "SQL, normalization, transactions and the term project.",
    description: "Course space for **CSE 315**. Term project teams: post your schema questions here.",
    owner: "admin", moderators: ["mehjabin"], members: ["student", "tasnim", "nusrat", "fahim", "anika"],
  },
  {
    key: "dept", slug: "buet-cse", name: "BUET CSE", kind: "DEPARTMENT", visibility: "INSTITUTION", isOfficial: true, color: "violet",
    tagline: "Department notices, seminars and everything CSE at BUET.",
    description: "The department's space. Official notices come from moderators; anyone in the department can post questions, events and discussions.",
    rules: "1. Keep it about CSE at BUET.\n2. Events need a date, place and who can attend.\n3. Selling or promoting paid services isn't allowed.",
    owner: "admin", moderators: ["tasnim"], members: ["student", "arif", "mehjabin", "rakib", "anika", "fahim", "nusrat", "tanvir", "sadia", "samiha", "tanzim"],
  },
  {
    key: "section", slug: "cse-21-section-a", name: "CSE '21 Section A", kind: "BATCH", visibility: "PRIVATE", joinPolicy: "REQUEST", color: "fuchsia",
    tagline: "Our section: CT dates, class changes and lab groups.",
    description: "Private space for Section A of the 2021 batch. The CR posts announcements; polls decide make-up classes.",
    postPolicy: { ANNOUNCEMENT: "MODERATORS", EVENT: "MODERATORS" },
    owner: "tasnim", moderators: [], members: ["student", "arif", "mehjabin", "rakib", "anika", "fahim", "nusrat", "tanvir"], pending: ["tanzim"],
  },
  {
    key: "cp", slug: "competitive-programming", name: "Competitive Programming", kind: "TOPIC", visibility: "PUBLIC", color: "indigo",
    tagline: "Problems, editorials and contest prep across universities.",
    description: "For everyone preparing for ICPC, NCPC and online contests. Share problems, ask for hints (not full solutions), and find practice partners.",
    rules: "1. Ask for hints before full solutions.\n2. Link the problem.\n3. No spoilers for running contests.",
    owner: "arif", moderators: ["zarif"], members: ["student", "rakib", "tanvir", "mahir", "shafin", "rafid", "raisa", "sabbir", "ishrat", "lamia"],
  },
  {
    key: "higher", slug: "higher-studies", name: "Higher Studies and Scholarships", kind: "TOPIC", visibility: "PUBLIC", color: "teal",
    tagline: "MS and PhD applications, GRE, IELTS and scholarship deadlines.",
    description: "Share deadlines, SOP advice and funding news. Seniors who went through it: your posts help the most.",
    owner: "admin", moderators: ["mahir"], members: ["student", "mehjabin", "anika", "rafid", "farzana", "adnan", "samiha", "ishrat"],
  },
  {
    key: "jobs", slug: "internships-and-jobs", name: "Internships and Jobs", kind: "TOPIC", visibility: "PUBLIC", color: "rose",
    tagline: "Openings, interview experiences and career fairs.",
    description: "Post openings with the deadline and how to apply. Interview experiences are welcome; don't share questions you promised to keep private.",
    owner: "rafid", moderators: [], members: ["student", "arif", "nusrat", "tasnim", "mahir", "raisa", "shafin", "zarif", "lamia"],
  },
  {
    key: "robotics", slug: "robotics-circle", name: "Robotics Circle", kind: "CLUB", visibility: "PUBLIC", isOfficial: true, color: "amber",
    tagline: "Build robots, run workshops, go to competitions.",
    description: "A student club for robotics and embedded systems. Workshops most weekends; everyone can join, no experience needed.",
    owner: "tanvir", moderators: ["sadia"], members: ["student", "rakib", "proma", "nabila", "samiha", "adnan"],
  },
  {
    key: "studyGroup", slug: "os-ct3-study-group", name: "OS CT-3 Study Group", kind: "GROUP", visibility: "PRIVATE", joinPolicy: "REQUEST", color: "sky",
    tagline: "Three of us, every night at 10 until the CT.",
    description: "Small group for CT-3 prep. We split chapters and quiz each other.",
    owner: "student", moderators: [], members: ["anika", "fahim"], pending: ["tanvir"],
  },
];

// Old Q&A threads go to the space that fits their subject
const threadSpace = {
  "Operating Systems": "os",
  "Computer Networks": "net",
  "Database Systems": "db",
  "Data Structures": "dept",
  Algorithms: "cp",
  "Digital Logic": "dept",
  "Study Tips": "os",
};
// Which answer (by index) the asker accepted
const accepted = {
  "Why does FIFO show Belady's anomaly but LRU never does?": 0,
  "How many times does this print? fork() inside a loop": 0,
  "Which subnet mask do I need for 500 hosts?": 0,
  "Segmentation fault when deleting the head of a linked list": 0,
  "Is Dijkstra greedy or dynamic programming?": 0,
};

const AI_TLB_ANSWER = `They're related but not the same thing.

- The **virtual address space** is the range of addresses a process *can* use, for example $0$ to $2^{48}-1$ on x86-64. It's a view, not a data structure.
- The **page table** is the data structure the OS keeps (and the MMU walks) to map each virtual page that's actually in use to a physical frame, with permission bits.

A quick way to see the difference: a process can reserve a huge virtual region with \`mmap\` while the page table stays almost empty, because entries are only filled when pages are touched (demand paging).

**Size check** for a one-level table: with 32-bit addresses and 4 KB pages there are $2^{32} / 2^{12} = 2^{20}$ virtual pages, so $2^{20}$ entries. At 4 bytes each that's 4 MB per process, which is why real systems use multi-level tables.

For the CT, a good one-liner: *the address space is what the process sees; the page table is how the OS makes that view real.*`;

/** Posts beyond the migrated Q&A threads. `at` is how long ago; `event.start` is [dayOffset, hour, minute]. */
export function communityPosts() {
  return [
    // ---------- announcements ----------
    {
      key: "ctSchedule", space: "dept", author: "admin", type: "ANNOUNCEMENT", at: [3, 4], pinned: true,
      title: "Class test schedule for Level 3 Term 2 is out",
      body: "The CT schedule for L3-T2 is on the department notice board and attached here.\n\n| Course | CT-3 | CT-4 |\n|---|---|---|\n| CSE 313 | Sunday, week 9 | Week 12 |\n| CSE 315 | Tuesday, week 9 | Week 13 |\n| CSE 321 | Thursday, week 10 | Week 13 |\n\nMake-up CTs need an application to the course teacher within three days.",
      tags: ["ct", "schedule", "l3t2"], doc: { title: "L3-T2 CT schedule", blocks: ["# CSE 313 Operating Systems", "- CT-3: Sunday of week 9, 10:00 am, room 305", "- CT-4: week 12", "# CSE 315 Database Systems", "- CT-3: Tuesday of week 9, 11:00 am", "- CT-4: week 13", "# CSE 321 Computer Networks", "- CT-3: Thursday of week 10, 9:00 am", "- CT-4: week 13", "# Notes", "Bring your ID card. Calculators are allowed unless the teacher says otherwise."] },
      upvoters: 14, replies: [["student", "Thanks. Is CSE 313 CT-3 open book?"], ["admin", "Closed book, one handwritten formula sheet allowed.", "student"]],
    },
    {
      key: "ctMoved", space: "section", author: "tasnim", type: "ANNOUNCEMENT", at: [0, 5], pinned: true,
      title: "OS CT-3 moved to Sunday 10 am",
      body: "Sir confirmed in class: **CSE 313 CT-3 is now on Sunday at 10:00 am** in room 305, not Thursday. Syllabus stays the same (chapters 8 to 10: paging, virtual memory, page replacement).\n\nI've added it as an event below so you can put it in your plan.",
      tags: ["ct-3", "os"], upvoters: 8, replies: [["fahim", "Finally some breathing room. Thanks Tasnim."], ["anika", "Does it include thrashing and working sets?"], ["tasnim", "Yes, all of chapter 10.", "anika"]],
    },
    // ---------- events ----------
    {
      key: "ct3Event", space: "section", author: "tasnim", type: "EVENT", at: [0, 5],
      title: "CSE 313 CT-3 (Section A)",
      body: "Chapters 8 to 10. Closed book, one handwritten formula sheet allowed. Bring a calculator.",
      tags: ["ct-3", "os"], event: { kind: "CLASS", start: [3, 10, 0], minutes: 40, location: "Room 305, ECE building", host: "Section A" },
      going: ["student", "arif", "mehjabin", "rakib", "anika", "fahim", "nusrat", "tanvir"], upvoters: 5, studentPlan: true,
    },
    {
      key: "seminar", space: "dept", author: "tasnim", type: "EVENT", at: [2, 3], banner: "violet",
      title: "Seminar: Building reliable distributed systems at scale",
      body: "An alumnus working on storage infrastructure talks about what breaks when a system grows from one server to thousands: replication, consensus, and how real outages happen.\n\n**Who can attend:** everyone, no registration needed. Level 3 and 4 students especially.\n\nThere'll be a Q&A for internship questions at the end.",
      tags: ["seminar", "distributed-systems", "career"], event: { kind: "SEMINAR", start: [2, 15, 0], minutes: 90, location: "Seminar room, ECE building, 4th floor", host: "Department of CSE" },
      going: ["student", "arif", "anika", "mehjabin", "tanzim"], interested: ["rakib", "nusrat", "fahim", "samiha"], upvoters: 11, studentPlan: true,
      replies: [["arif", "Will the slides be shared after?"], ["tasnim", "Yes, I'll post them here.", "arif"]],
    },
    {
      key: "workshop", space: "robotics", author: "tanvir", type: "EVENT", at: [4, 2], banner: "amber",
      title: "Hands-on workshop: Arduino to ROS in one day",
      body: "Build a line-following robot in the morning, then drive it from ROS in the afternoon.\n\n- Kits provided for 30 people, bring a laptop with Arduino IDE installed\n- Lunch and snacks included\n- No experience needed\n\nRegister at the link so we know how many kits to prepare.",
      tags: ["robotics", "arduino", "ros", "workshop"], event: { kind: "WORKSHOP", start: [6, 10, 0], minutes: 360, location: "EEE building, Lab 2", host: "Robotics Circle", url: "https://example.org/robotics-circle/workshop" },
      going: ["rakib", "proma", "nabila", "adnan", "sadia"], interested: ["student", "samiha", "arif"], upvoters: 9,
    },
    {
      key: "mockRound", space: "cp", author: "arif", type: "EVENT", at: [1, 6], banner: "indigo",
      title: "Inter-university mock round on Cognitia",
      body: "A 3-hour ICPC-style mock round to warm up for the regional. Problems range from Div 2 A to hard graph problems. Teams of one, rated.\n\nRegister on the contest page linked below.",
      tags: ["icpc", "contest", "practice"], event: { kind: "COMPETITION", start: [5, 19, 0], minutes: 180, location: "Online", host: "Competitive Programming" },
      going: ["zarif", "mahir", "shafin", "rafid", "raisa", "student"], interested: ["rakib", "sabbir"], upvoters: 12,
    },
    {
      key: "scholarship", space: "higher", author: "mahir", type: "EVENT", at: [5, 1], banner: "teal",
      title: "Deadline: Commonwealth Master's Scholarship applications",
      body: "Applications for next year's Commonwealth Master's Scholarships close soon. You need:\n\n1. Two references (ask your teachers this week, not the night before)\n2. Transcripts\n3. Four short essays on development impact\n\nThe portal is slow near the deadline, so submit a few days early.",
      tags: ["scholarship", "uk", "masters"], event: { kind: "DEADLINE", start: [12, 23, 0], minutes: 60, location: "Online application", host: "Higher Studies and Scholarships", url: "https://example.org/scholarships/commonwealth" },
      going: ["mahir", "farzana"], interested: ["student", "mehjabin", "anika", "adnan", "ishrat"], upvoters: 16,
    },
    {
      key: "careerFair", space: "jobs", author: "rafid", type: "EVENT", at: [3, 8], banner: "rose",
      title: "Tech career fair: 20 companies hiring interns and fresh grads",
      body: "Bring printed CVs. Companies do on-the-spot screening interviews for internships. Dress code: smart casual.\n\nTip: check which teams are hiring before you go and prepare two questions for each.",
      tags: ["career-fair", "internship", "jobs"], event: { kind: "CAREER", start: [9, 10, 0], minutes: 420, location: "BUET auditorium", host: "Internships and Jobs" },
      going: ["rafid", "nusrat", "arif", "raisa"], interested: ["student", "tasnim", "shafin", "zarif", "lamia"], upvoters: 13,
    },
    {
      key: "hackathon", space: "dept", author: "nusrat", type: "EVENT", at: [12, 3], banner: "fuchsia",
      title: "Hackathon kickoff and team matching",
      body: "Kickoff for the department hackathon: themes announced, team matching for people without a team, and mentors from industry.",
      tags: ["hackathon", "teams"], event: { kind: "CLUB", start: [-9, 16, 0], minutes: 120, location: "Old academic building, room 101", host: "BUET CSE" },
      going: ["nusrat", "student", "arif", "tanvir"], upvoters: 6,
    },
    // ---------- contests shared from Cognitia ----------
    {
      key: "challengeLive", space: "cp", author: "arif", type: "DISCUSSION", at: [0, 1],
      title: "Weekly Challenge #12 is live now",
      body: "Hard set this week: two graph problems and a nasty DP. Rated. Join from the card below and discuss the problems here after it ends. No spoilers until then.",
      tags: ["contest", "weekly-challenge"], embed: { kind: "CONTEST", contest: "algo12" }, upvoters: 8,
    },
    {
      key: "mockCtShare", space: "os", author: "admin", type: "ANNOUNCEMENT", at: [0, 7],
      title: "Mock CT-3 is open on Cognitia",
      body: "A 30-minute mock with the same syllabus as CT-3, including one written question graded with AI help. Take it any time before it closes; your timer starts when you begin.",
      tags: ["ct-3", "mock", "os"], embed: { kind: "CONTEST", contest: "mockCt" }, upvoters: 10,
    },
    // ---------- questions ----------
    {
      key: "aiQuestion", space: "os", author: "fahim", type: "QUESTION", at: [0, 9],
      title: "What's the difference between a virtual address space and a page table?",
      body: "The slides use both terms and I keep mixing them up. Are they the same thing? And why does a one-level page table take so much memory?",
      tags: ["os", "paging", "virtual-memory"], upvoters: 4, ai: { answer: AI_TLB_ANSWER, helpful: 5, unhelpful: 0 },
      replies: [["anika", "The AI draft is right. One addition: each process has its own page table, but the kernel part of the address space is usually shared across all of them."]],
    },
    {
      key: "unanswered", space: "net", author: "sadia", type: "QUESTION", at: [0, 2],
      title: "Why does TCP need both slow start and congestion avoidance?",
      body: "If slow start already grows the window, why switch to linear growth after `ssthresh`? Wouldn't it be faster to keep doubling?",
      tags: ["networks", "tcp", "congestion-control"], upvoters: 2,
    },
    {
      key: "newton", space: "dept", author: "fahim", type: "QUESTION", at: [2, 7],
      title: "When does Newton-Raphson fail to converge?",
      body: "For $f(x) = x^3 - 2x + 2$ starting at $x_0 = 0$, I get $x_1 = 1$, then $x_2 = 0$ again and it loops forever. Is this a known failure case? How do we pick a safe starting point in the exam?",
      tags: ["numerical-methods", "newton-raphson", "math"], upvoters: 7,
      replies: [
        ["arif", "Yes, it's the textbook 2-cycle. Newton's method only converges from points close enough to a root where $f'(x) \\neq 0$. Here the iteration jumps between 0 and 1 forever.\n\nIn the exam, start near a sign change: $f(-2) = -2$ and $f(-1) = 3$, so try $x_0 = -1.5$. It converges to $x \\approx -1.7693$ in a few steps.", null, { accepted: true, upvoters: 6 }],
        ["student", "Also worth checking $f'(x_0) \\neq 0$ first, otherwise the very first step divides by zero.", null, { upvoters: 2 }],
      ],
    },
    {
      key: "anonymous", space: "os", author: "nusrat", type: "DISCUSSION", at: [1, 3], anonymous: true,
      title: "Is it normal to feel completely lost in OS after CT-2?",
      body: "I scored badly in CT-2 and now paging feels impossible. Everyone else seems fine. Did anyone else feel like this and recover?",
      tags: ["os", "study-tips"], upvoters: 9,
      replies: [
        ["anika", "Very normal. I failed CT-1 in second year. What helped: doing the numericals by hand every day for a week. Paging clicks once you've done 20 address translations."],
        ["admin", "Come to office hours on Wednesday, 3 to 5 pm. Bring the CT-2 paper and we'll go through where the marks went. Many students improve a lot in CT-3."],
        ["tasnim", "The OS CT-3 study group is open for requests too. Nafis runs it."],
      ],
    },
    // ---------- discussions ----------
    {
      key: "dpProblems", space: "cp", author: "arif", type: "DISCUSSION", at: [4, 2],
      title: "Share your favorite DP problem for beginners",
      body: "I'm putting together a list for juniors. What was the first DP problem that made it click for you? Link and one line on why.",
      tags: ["dynamic-programming", "beginners"], upvoters: 15,
      replies: [
        ["zarif", "Frog 1 on AtCoder DP contest. Tiny state, and you see why memoization beats recursion immediately.", null, { upvoters: 5 }],
        ["mahir", "Coin change (number of ways). The difference between counting combinations and permutations taught me what the loop order means.", null, { upvoters: 4 }],
        ["student", "Longest common subsequence. Drawing the table by hand once made it stick.", null, { upvoters: 2 }],
        ["arif", "Great picks. Adding all three to the list.", "zarif"],
      ],
    },
    {
      key: "gre", space: "higher", author: "farzana", type: "DISCUSSION", at: [6, 5],
      title: "Is the GRE still worth taking now that many US programs made it optional?",
      body: "Most of my target programs say GRE optional. Does a good score still help for funding, or is the time better spent on research?",
      tags: ["gre", "usa", "masters"], upvoters: 10,
      replies: [
        ["mahir", "For funded MS it still helps when your CGPA is on the lower side, because it gives committees another number to compare. With a strong CGPA and a paper, research time is worth more."],
        ["admin", "From the committees I've talked to: a strong statement of purpose and specific research fit matter more than a GRE score. Contact potential supervisors early."],
      ],
    },
    {
      key: "interview", space: "jobs", author: "rafid", type: "DISCUSSION", at: [7, 4],
      title: "My backend internship interview: what they actually asked",
      body: "Three rounds at a Dhaka product company:\n\n1. **Online test:** two medium problems (a graph BFS and a sliding window) in 90 minutes\n2. **Technical:** design a URL shortener, then SQL questions about indexes\n3. **Team fit:** past projects, one conflict story\n\nWhat mattered most: explaining trade-offs out loud. Happy to answer questions.",
      tags: ["internship", "interview", "backend"], upvoters: 21,
      replies: [
        ["student", "How deep did the system design go for an intern role?", null, { upvoters: 3 }],
        ["rafid", "Not deep. Database schema, how to generate short codes, and what happens with 10x traffic. They wanted reasoning, not buzzwords.", "student", { upvoters: 5 }],
        ["nusrat", "This is really useful, thanks for writing it up."],
      ],
    },
    // ---------- polls ----------
    {
      key: "makeupPoll", space: "section", author: "tasnim", type: "POLL", at: [1, 1],
      title: "Which day works for the make-up OS lab?",
      body: "Sir offered two slots for the missed lab. Vote by tonight.",
      tags: ["lab", "os"], poll: { options: ["Saturday 9 am", "Saturday 2 pm", "Tuesday 4 pm"], votes: { "Saturday 9 am": ["arif", "fahim"], "Saturday 2 pm": ["student", "anika", "mehjabin", "nusrat", "rakib"], "Tuesday 4 pm": ["tanvir"] }, closesIn: 1 },
    },
    {
      key: "electivePoll", space: "dept", author: "nusrat", type: "POLL", at: [3, 2],
      title: "Which L4 elective are you leaning towards?",
      body: "Trying to gauge interest before course registration.",
      tags: ["electives", "l4"], poll: { multiple: true, options: ["Machine Learning", "Distributed Systems", "Computer Graphics", "Bioinformatics"], votes: { "Machine Learning": ["student", "anika", "mehjabin", "fahim", "samiha"], "Distributed Systems": ["student", "arif", "rakib", "tanzim"], "Computer Graphics": ["nusrat", "tanvir"], Bioinformatics: ["sadia"] }, closesIn: 6 },
      upvoters: 6,
    },
    // ---------- resources ----------
    {
      key: "formulaSheet", space: "os", author: "anika", type: "RESOURCE", at: [1, 6],
      title: "CT-3 formula sheet: EAT, page tables, page faults",
      body: "One page with every formula for CT-3 and a worked example for each. Print it and add your own notes in the margins.",
      tags: ["os", "ct-3", "formula-sheet", "paging"], upvoters: 18, saves: ["student", "fahim", "tanvir", "nusrat"],
      doc: {
        title: "CSE 313 CT-3 formula sheet",
        blocks: [
          "# Effective access time (EAT)",
          "- With a TLB: EAT = h(t + m) + (1 - h)(t + 2m), where h is the hit ratio, t the TLB time and m the memory time.",
          "- Example: h = 0.9, t = 20 ns, m = 100 ns gives EAT = 0.9(120) + 0.1(220) = 130 ns.",
          "# Page table size",
          "- Entries = 2^(address bits) / page size. Size = entries x entry size.",
          "- 32-bit, 4 KB pages, 4-byte entries: 2^20 x 4 B = 4 MB.",
          "# Page faults",
          "- FIFO, LRU and OPT on the same reference string: count faults frame by frame.",
          "- Effective access time with faults: EAT = (1 - p) x m + p x (fault service time).",
          "# Thrashing",
          "- Happens when the sum of working sets exceeds the frames available.",
        ],
      },
    },
    {
      key: "dbPast", space: "db", author: "mehjabin", type: "RESOURCE", at: [5, 3],
      title: "Last year's CSE 315 term final questions (typed)",
      body: "Typed up from the photo that went around last year, with the marks for each part. No solutions yet; let's solve them in the replies.",
      tags: ["database", "term-final", "past-papers"], upvoters: 22, saves: ["student", "nusrat", "tasnim"],
      doc: {
        title: "CSE 315 term final (previous year)",
        blocks: [
          "# Section A",
          "- 1(a) Define a candidate key and a superkey with an example. [4]",
          "- 1(b) Convert the given ER diagram to relations and mark the keys. [10]",
          "- 2 Normalize Enrollment(StudentID, CourseID, StudentName, CourseTitle, Grade) to 3NF. [12]",
          "# Section B",
          "- 5 Is the schedule r1(A) r2(A) w1(A) w2(A) conflict serializable? Draw the precedence graph. [10]",
          "- 6 Explain strict two-phase locking and why it prevents cascading aborts. [8]",
          "- 7 A B+ tree has order 4. Insert 10, 20, 5, 6, 12, 30, 7, 17 and show the tree after each split. [12]",
        ],
      },
      replies: [["nusrat", "Question 5: T1 -> T2 from w1(A) before w2(A), and T2 -> T1 from r2(A) before w1(A). Cycle, so not conflict serializable."], ["mehjabin", "Correct. That's the lost update pattern.", "nusrat"]],
    },
    {
      key: "noteShare", space: "os", author: "student", type: "RESOURCE", at: [2, 1],
      title: "My paging and virtual memory summary for CT-3",
      body: "Sharing my note from the Notes section. It has the address translation steps and all the page replacement algorithms.",
      tags: ["os", "paging", "notes"], embed: { kind: "NOTE", note: "Paging and Virtual Memory: CT-3 Summary" }, upvoters: 7,
    },
    {
      key: "paperShare", space: "net", author: "tasnim", type: "RESOURCE", at: [4, 6],
      title: "Practice set for Networks CT-2 (12 questions, 20 minutes)",
      body: "I made this practice paper on Cognitia with negative marking like the real CT. Take it and compare scores.",
      tags: ["networks", "ct-2", "practice"], embed: { kind: "PAPER", paper: "Section A practice set: Networks CT-2" }, upvoters: 9,
    },
    // ---------- profile posts ----------
    {
      key: "arifExpert", space: null, author: "arif", type: "DISCUSSION", at: [0, 20], banner: "indigo",
      title: "",
      body: "Finally reached **Expert** on Codeforces after 14 months. What helped most: solving 3 problems a day just above my rating and reading editorials only after an hour of trying.\n\nThanks to everyone in the Competitive Programming space who answered my late-night questions.",
      tags: ["competitive-programming", "codeforces"], upvoters: 19,
      replies: [["student", "Congratulations, well earned."], ["zarif", "Next stop Candidate Master."]],
    },
    {
      key: "mehjabinThread", space: null, author: "mehjabin", type: "DISCUSSION", at: [2, 11],
      title: "Indexes I wish I'd known about before the term project",
      body: "A thread of small things that made our queries 10x faster:\n\n1. A composite index on `(user_id, created_at)` for \"latest items for a user\"\n2. `EXPLAIN ANALYZE` before guessing\n3. Partial indexes for status columns where 95% of rows are \"done\"",
      tags: ["database", "postgresql", "indexes"], upvoters: 12,
      replies: [["rakib", "Partial indexes were new to me. Adding one to our lab project."]],
    },
    // ---------- study group (private) ----------
    {
      key: "groupPlan", space: "studyGroup", author: "student", type: "DISCUSSION", at: [0, 4],
      title: "Tonight: page replacement numericals",
      body: "Each of us brings two reference strings. We solve FIFO, LRU and OPT for 3 and 4 frames and check each other. 10 pm on Meet.",
      tags: ["os", "page-replacement"], replies: [["anika", "I'll bring one with Belady's anomaly."], ["fahim", "Count me in."]],
    },
    // ---------- spam (reported) ----------
    {
      key: "spam", space: "cp", author: "sabbir", type: "DISCUSSION", at: [0, 3],
      title: "Assignment and lab report help, fast delivery, cheap",
      body: "DM me for any assignment, lab report or project. Guaranteed marks.",
      tags: ["help"], reports: [["zarif", "SPAM", "Selling assignments."], ["rafid", "SPAM", ""]],
    },
  ];
}

// ---------------------------------------------------------------------------

/**
 * Create spaces, members, posts, replies, votes, media, follows and profiles.
 * Helpers come from seed.js so everything shares its deterministic random generator.
 */
export async function seedCommunity({ prisma, people, contests, h }) {
  const { ago, later, atDay, random, randomInt, shuffle, MINUTE, HOUR, DAY } = h;
  const counts = { spaces: 0, members: 0, posts: 0, replies: 0, votes: 0, media: 0, follows: 0 };
  const id = (key) => people[key].id;

  // Profiles
  for (const [key, p] of Object.entries(profiles)) {
    let coverId;
    if (p.cover) coverId = await storeImage(prisma, { ownerId: id(key), purpose: "COVER", palette: p.cover, width: 1500, height: 420, seed: counts.media + 11 });
    if (coverId) counts.media++;
    await prisma.user.update({ where: { id: id(key) }, data: { username: p.username, headline: p.headline, skills: p.skills ?? [], links: p.links ?? undefined, ...(coverId && { coverId }) } });
  }

  // Spaces and members
  const spaceIds = {};
  const spaceBy = {};
  for (const [index, def] of spaces.entries()) {
    const createdAt = ago((200 - index * 12) * DAY);
    const coverId = await storeImage(prisma, { ownerId: id(def.owner), purpose: "SPACE_COVER", palette: def.color, width: 1500, height: 360, seed: 100 + index });
    counts.media++;
    const members = [
      { key: def.owner, role: "OWNER" },
      ...(def.moderators ?? []).map((key) => ({ key, role: "MODERATOR" })),
      ...(def.members ?? []).map((key) => ({ key, role: "MEMBER" })),
    ];
    const space = await prisma.space.create({
      data: {
        slug: def.slug,
        name: def.name,
        tagline: def.tagline ?? "",
        description: def.description ?? "",
        rules: def.rules ?? "",
        kind: def.kind,
        visibility: def.visibility,
        joinPolicy: def.joinPolicy ?? "OPEN",
        institution: BUET,
        courseCode: def.courseCode ?? null,
        postPolicy: { ...DEFAULT_POST_POLICY, ...(def.postPolicy ?? {}) },
        isOfficial: def.isOfficial ?? false,
        color: def.color,
        coverId,
        memberCount: members.length,
        createdById: id(def.owner),
        createdAt,
        members: {
          create: [
            ...members.map((m, i) => ({ userId: id(m.key), role: m.role, status: "ACTIVE", notify: m.role === "OWNER" ? "ALL" : "HIGHLIGHTS", joinedAt: later(createdAt, i * 6 * HOUR) })),
            ...(def.pending ?? []).map((key) => ({ userId: id(key), status: "PENDING", joinedAt: ago(randomInt(2, 20) * HOUR) })),
          ],
        },
      },
    });
    spaceIds[def.key] = space.id;
    spaceBy[def.key] = { ...space, members: members.map((m) => m.key) };
    counts.spaces++;
    counts.members += members.length;
  }

  const memberKeys = (spaceKey) => (spaceKey ? spaceBy[spaceKey].members : Object.keys(people));
  const voters = (spaceKey, exclude, n) => shuffle(memberKeys(spaceKey).filter((k) => !exclude.includes(k) && people[k])).slice(0, n);

  async function addVotes(target, { spaceKey, authorKey, upvoters = 0, downvoters = 0, createdAt }) {
    const ups = voters(spaceKey, [authorKey], upvoters);
    const downs = voters(spaceKey, [authorKey, ...ups], downvoters);
    const rows = [...ups.map((k) => [k, 1]), ...downs.map((k) => [k, -1])];
    const at = () => later(createdAt, randomInt(10, 600) * MINUTE);
    if (target.postId) await prisma.postVote.createMany({ data: rows.map(([k, value]) => ({ postId: target.postId, userId: id(k), value, createdAt: at() })) });
    else await prisma.replyVote.createMany({ data: rows.map(([k, value]) => ({ replyId: target.replyId, userId: id(k), value, createdAt: at() })) });
    counts.votes += rows.length;
    return { upvotes: ups.length, downvotes: downs.length };
  }

  const now = () => h.now;
  async function addReplies(post, replies, { spaceKey, createdAt }) {
    const made = [];
    let last = createdAt;
    for (const [authorKey, body, parentKey, opts = {}] of replies) {
      last = new Date(Math.min(later(last, randomInt(20, 240) * MINUTE).getTime(), now().getTime() - MINUTE));
      const parent = parentKey ? made.find((m) => m.authorKey === parentKey && !m.parentId) : null;
      const reply = await prisma.reply.create({
        data: { postId: post.id, parentId: parent?.id ?? null, authorId: id(authorKey), body, isAnswer: post.type === "QUESTION" && !parent, createdAt: last, updatedAt: last, acceptedAt: opts.accepted ? new Date(Math.min(later(last, 2 * HOUR).getTime(), now().getTime())) : null },
      });
      counts.replies++;
      const votes = await addVotes({ replyId: reply.id }, { spaceKey, authorKey, upvoters: opts.upvoters ?? randomInt(0, 3), createdAt: last });
      await prisma.reply.update({ where: { id: reply.id }, data: { upvotes: votes.upvotes, downvotes: votes.downvotes, score: votes.upvotes - votes.downvotes } });
      if (parent) await prisma.reply.update({ where: { id: parent.id }, data: { childCount: { increment: 1 } } });
      made.push({ ...reply, authorKey });
      if (opts.accepted) await prisma.post.update({ where: { id: post.id }, data: { acceptedReplyId: reply.id } });
    }
    const answers = made.filter((m) => m.isAnswer).length;
    await prisma.post.update({ where: { id: post.id }, data: { replyCount: made.length, answerCount: answers, lastActivityAt: made.length ? last : createdAt } });
    return made;
  }

  // Migrated Q&A threads, now in their course spaces
  for (const thread of qaThreads) {
    const spaceKey = threadSpace[thread.subject] ?? "dept";
    const createdAt = ago(thread.daysAgo * DAY + 6 * HOUR);
    const post = await prisma.post.create({
      data: {
        type: "QUESTION", spaceId: spaceIds[spaceKey], authorId: id(thread.author), title: thread.title, body: thread.body,
        tags: normalizeTags([...thread.tags]), viewCount: thread.views, createdAt, lastActivityAt: createdAt,
      },
    });
    counts.posts++;
    const votes = await addVotes({ postId: post.id }, { spaceKey, authorKey: thread.author, upvoters: Math.min(9, Math.round(thread.views / 16)), downvoters: thread.views > 100 ? 1 : 0, createdAt });
    await prisma.post.update({ where: { id: post.id }, data: { upvotes: votes.upvotes, downvotes: votes.downvotes, score: votes.upvotes - votes.downvotes } });
    const acceptedIndex = accepted[thread.title];
    await addReplies(
      post,
      thread.answers.map((a, i) => [a.author, a.content, null, { accepted: i === acceptedIndex, upvoters: Math.max(0, randomInt(2, 6) - i) }]),
      { spaceKey, createdAt }
    );
  }

  // New posts
  const note = (title) => prisma.note.findFirst({ where: { title }, select: { id: true } });
  const paper = (title) => prisma.modelTest.findFirst({ where: { title }, select: { id: true } });
  const postIds = {};
  for (const def of communityPosts()) {
    const [daysAgo, hoursAgo] = def.at;
    const createdAt = ago(daysAgo * DAY + hoursAgo * HOUR);
    const spaceKey = def.space;
    let embed = null;
    if (def.embed?.kind === "CONTEST") embed = { kind: "CONTEST", id: contests[def.embed.contest].id };
    if (def.embed?.kind === "NOTE") embed = { kind: "NOTE", id: (await note(def.embed.note)).id };
    if (def.embed?.kind === "PAPER") embed = { kind: "PAPER", id: (await paper(def.embed.paper)).id };
    let eventData = {};
    if (def.event) {
      const [day, hour, minute] = def.event.start;
      const start = atDay(day, hour, minute);
      eventData = {
        eventKind: def.event.kind, eventStartsAt: start, eventEndsAt: later(start, def.event.minutes * MINUTE),
        eventLocation: def.event.location ?? null, eventUrl: def.event.url ?? null, eventHost: def.event.host ?? null,
        goingCount: def.going?.length ?? 0, interestedCount: def.interested?.length ?? 0,
      };
    }
    const post = await prisma.post.create({
      data: {
        type: def.type, spaceId: spaceKey ? spaceIds[spaceKey] : null, authorId: id(def.author), isAnonymous: def.anonymous ?? false,
        title: def.title, body: def.body, tags: normalizeTags(def.tags ?? []), embed: embed ?? undefined, createdAt, lastActivityAt: createdAt,
        pinnedAt: def.pinned ? later(createdAt, 10 * MINUTE) : null, viewCount: randomInt(15, 180), saveCount: def.saves?.length ?? 0,
        ...eventData,
        ...(def.poll && {
          pollMultiple: def.poll.multiple ?? false,
          pollClosesAt: later(h.now, def.poll.closesIn * DAY),
          pollOptions: { create: def.poll.options.map((text, order) => ({ text, order, voteCount: def.poll.votes[text]?.length ?? 0 })) },
          pollVoterCount: new Set(Object.values(def.poll.votes).flat()).size,
        }),
        ...(def.ai && { aiAnswerStatus: "READY", aiAnswer: def.ai.answer, aiAnswerModel: "deepseek-flash", aiAnswerAt: later(createdAt, 3 * MINUTE), aiHelpful: def.ai.helpful, aiUnhelpful: def.ai.unhelpful, aiRequestedById: id(def.author) }),
      },
    });
    postIds[def.key] = post.id;
    counts.posts++;
    const votes = await addVotes({ postId: post.id }, { spaceKey, authorKey: def.author, upvoters: def.upvoters ?? randomInt(0, 3), createdAt });
    await prisma.post.update({ where: { id: post.id }, data: { upvotes: votes.upvotes, downvotes: votes.downvotes, score: votes.upvotes - votes.downvotes } });

    // Media: event banners and profile post images, documents for resources
    if (def.banner) {
      await storeImage(prisma, { ownerId: id(def.author), purpose: "POST", palette: def.banner, width: 1200, height: 630, seed: 300 + counts.posts, postId: post.id });
      counts.media++;
    }
    if (def.doc) {
      await storeFile(prisma, {
        ownerId: id(def.author), postId: post.id, kind: "DOCUMENT", mimeType: "application/pdf", ext: "pdf",
        fileName: `${def.doc.title}.pdf`, data: createPdf({ title: def.doc.title, subtitle: `Shared by ${people[def.author].name}`, blocks: def.doc.blocks }),
      });
      counts.media++;
    }
    if (def.poll) {
      const options = await prisma.pollOption.findMany({ where: { postId: post.id } });
      await prisma.pollVote.createMany({ data: options.flatMap((o) => (def.poll.votes[o.text] ?? []).map((k) => ({ optionId: o.id, postId: post.id, userId: id(k) }))) });
    }
    if (def.going || def.interested) {
      await prisma.eventRsvp.createMany({
        data: [...(def.going ?? []).map((k) => ({ postId: post.id, userId: id(k), status: "GOING" })), ...(def.interested ?? []).map((k) => ({ postId: post.id, userId: id(k), status: "INTERESTED" }))],
      });
    }
    if (def.studentPlan) {
      await prisma.task.create({
        data: {
          userId: id("student"), title: def.title, description: `From the Cognitia community: /community/post/${post.id}`, dueDate: eventData.eventStartsAt,
          priority: "MEDIUM", subjectArea: spaceBy[spaceKey]?.courseCode ?? spaceBy[spaceKey]?.name ?? "Event", estimatedTime: def.event.minutes, tags: ["event", def.event.kind.toLowerCase()], sourcePostId: post.id,
        },
      });
    }
    if (def.saves) await prisma.savedPost.createMany({ data: def.saves.map((k) => ({ userId: id(k), postId: post.id })) });
    if (def.replies) await addReplies(post, def.replies, { spaceKey, createdAt });
    if (def.reports) {
      await prisma.contentReport.createMany({
        data: def.reports.map(([k, reason, details]) => ({ targetKey: `post:${post.id}`, postId: post.id, spaceId: spaceIds[spaceKey], reporterId: id(k), reason, details, createdAt: later(createdAt, randomInt(5, 60) * MINUTE) })),
      });
    }
    if (spaceKey) await prisma.space.update({ where: { id: spaceIds[spaceKey] }, data: { postCount: { increment: 1 } } });
  }
  for (const key of Object.keys(spaceIds)) {
    const postCount = await prisma.post.count({ where: { spaceId: spaceIds[key] } });
    await prisma.space.update({ where: { id: spaceIds[key] }, data: { postCount } });
  }

  // Follows: the student's circle, and a well-followed competitive programmer
  const follows = [
    ["student", ["arif", "anika", "tasnim", "admin", "mehjabin", "rafid"]],
    ["arif", ["student", "zarif", "mahir", "anika"]],
    ["anika", ["student", "arif", "admin"]],
    ["tasnim", ["student", "arif", "anika", "mehjabin", "rakib"]],
    ["fahim", ["student", "arif", "anika"]],
    ["rakib", ["arif", "student", "tanvir"]],
    ["mehjabin", ["student", "nusrat", "admin"]],
    ...["zarif", "mahir", "shafin", "rafid", "raisa", "sabbir", "ishrat", "lamia", "nusrat", "tanvir"].map((k) => [k, ["arif"]]),
  ];
  for (const [from, list] of follows) {
    await prisma.follow.createMany({ data: list.map((to) => ({ followerId: id(from), followingId: id(to), createdAt: ago(randomInt(3, 90) * DAY) })), skipDuplicates: true });
    counts.follows += list.length;
  }

  // What the student has shown interest in, so "For you" has something to go on
  const interest = { "tag:os": 7, "tag:paging": 5, "tag:page-replacement": 3, "tag:networks": 3, "tag:dynamic-programming": 2, "tag:internship": 2, [`space:${spaceIds.os}`]: 5, [`space:${spaceIds.cp}`]: 2 };
  await prisma.userInterest.createMany({ data: Object.entries(interest).map(([key, weight]) => ({ userId: id("student"), key, weight, updatedAt: ago(randomInt(1, 5) * DAY) })) });

  await recomputeReputation();
  return { counts, spaceIds, postIds };
}

async function storeFile(prisma, { ownerId, postId = null, kind, mimeType, ext, fileName, data, purpose = "POST", width = null, height = null, order = 0 }) {
  const id = newMediaId();
  const storageKey = storageKeyFor(id, ext);
  await storeBuffer(data, storageKey);
  await prisma.mediaFile.create({ data: { id, ownerId, kind, purpose, mimeType, size: data.length, storageKey, fileName, width, height, postId, order } });
  return id;
}

async function storeImage(prisma, { ownerId, purpose, palette, width, height, seed, postId = null }) {
  const data = gradientArt({ width, height, palette, seed });
  return storeFile(prisma, { ownerId, postId, kind: "IMAGE", mimeType: "image/png", ext: "png", fileName: `${palette}.png`, data, purpose, width, height });
}
