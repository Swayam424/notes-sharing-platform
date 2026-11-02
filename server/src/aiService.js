// server/src/aiService.js
import fs from 'node:fs';
import path from 'node:path';
import { db } from './database.js';

// Load .env safely across root and server directories
const envCandidates = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../.env'),
];
for (const envPath of envCandidates) {
  try {
    if (fs.existsSync(envPath)) {
      process.loadEnvFile(envPath);
      break;
    }
  } catch {}
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// -------------------------------------------------------------
// 1. Guardrail Pre-filters: Safety, Injection, PII & Spam
// -------------------------------------------------------------
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i,
  /system\s+prompt/i,
  /you\s+are\s+now\s+in\s+developer\s+mode/i,
  /jailbreak/i,
  /dan\s+mode/i,
  /bypass\s+(filters|rules|guardrails)/i,
  /disregard\s+(all\s+)?rules/i,
  /reveal\s+(your\s+)?(secret|internal|system)\s+(instructions|prompt)/i,
  /repeat\s+(all\s+)?(your\s+)?(instructions|prompt|system\s+message)/i,
  /verbatim/i,
  /in\s+character\s+as\s+(?!a\s+tutor|a\s+professor|an\s+academic)/i,
  /act\s+as\s+(an?\s+)?(unrestricted|different|evil|jailbreak|hacker)/i,
  /pretend\s+(you\s+are|to\s+be)\s+(an?\s+)?(unrestricted|different|evil|hacker)/i,
  /decode\s+and\s+execute/i,
];

const PII_SECURITY_PATTERNS = [
  /\b(passwords?|secret\s+keys?|auth\s+tokens?|credit\s+cards?)\b/i,
  /\b(private\s+(email|phone|credentials?|details?))\b/i,
  /\b(emails?\s+(and|or)?\s+passwords?)\b/i,
  /\b(phone\s+numbers?\s+of)\b/i,
];

const PROFANITY_PATTERNS = [
  /\b(fuck|shit|bitch|bastard|asshole|dick|cunt)\b/i,
];

const OFF_TOPIC_TRIGGER_PATTERNS = [
  /\b(dating|hookup|casino|betting|gambling|roulette|blackjack)\b/i,
  /\b(hack\s+into|pirate\s+software|porn|xxx)\b/i,
  /\b(aircrack|metasploit|ddos|sql\s+injection|crack\s+password|keylogger|malware|ransomware|trojan)\b/i,
  /\b(crypto\s+to\s+buy|invest\s+in\s+crypto|meme\s+coin)\b/i,
];

export function runPreFilter(message) {
  const trimmed = (message || '').trim();

  if (!trimmed) {
    return {
      allowed: false,
      reason: 'empty',
      reply: 'Please ask a study-related question or request notes navigation.',
    };
  }

  if (trimmed.length > 3000) {
    return {
      allowed: false,
      reason: 'too_long',
      reply: 'Your message is too long. Please keep your doubt or query under 3,000 characters for focused assistance.',
    };
  }

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        allowed: false,
        reason: 'injection_attempt',
        reply: "I am programmed to assist exclusively with academic concepts, syllabus guidance, and Atelier study resources. Let's keep our session focused on your studies! 📚",
      };
    }
  }

  for (const pattern of PII_SECURITY_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        allowed: false,
        reason: 'pii_security',
        reply: "For security and student privacy reasons, private credentials, passwords, and personal contact details cannot be accessed or disclosed. 🛡️",
      };
    }
  }

  for (const pattern of PROFANITY_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        allowed: false,
        reason: 'inappropriate_language',
        reply: "Let's maintain a respectful and productive academic environment. How can I help with your coursework? 🎓",
      };
    }
  }

  for (const pattern of OFF_TOPIC_TRIGGER_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        allowed: false,
        reason: 'off_topic',
        reply: 'I am your Atelier academic copilot. I only assist with college coursework, concepts, exam questions (PYQs), and study notes.',
      };
    }
  }

  return { allowed: true, sanitized: trimmed };
}

// -------------------------------------------------------------
// 2. Context Grounding (RAG-lite): High-Precision Query Matching
// -------------------------------------------------------------
const STOP_WORDS = new Set([
  'what', 'when', 'where', 'how', 'explain', 'show', 'find', 'notes', 'tell', 'help',
  'with', 'about', 'this', 'that', 'paper', 'chapter', 'question', 'exam', 'write',
  'give', 'name', 'title', 'unit', 'link', 'view', 'read', 'class', 'course', 'sem',
  'study', 'atelier', 'the', 'for', 'and', 'are', 'not', 'you', 'can', 'please',
  'from', 'they', 'have', 'more', 'some', 'which', 'their', 'there', 'will', 'your',
  'need', 'want', 'like', 'good', 'best', 'seminal', 'verified', 'download', 'direct'
]);

export function getContextForQuery(query) {
  try {
    const rawTokens = query
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));

    if (rawTokens.length === 0) {
      return { notes: [], subjects: [], topics: [] };
    }

    // Search subjects
    const subjects = db
      .prepare('SELECT id, name, code, semester, department FROM subjects LIMIT 50')
      .all();

    const matchedSubjects = subjects.filter((s) => {
      const sName = s.name.toLowerCase();
      const sCode = s.code.toLowerCase();
      return rawTokens.some((w) => (w.length >= 4 && sName.includes(w)) || sCode === w);
    }).slice(0, 3);

    // Search notes with strict relevance
    const notes = db
      .prepare('SELECT id, title, author, subject_id, primary_topic, format, pages, semester FROM notes WHERE status = ? LIMIT 100')
      .all('published');

    const matchedNotes = notes.filter((n) => {
      const nTitle = n.title.toLowerCase();
      const nTopic = (n.primary_topic || '').toLowerCase();
      // Require match of a specific academic keyword
      return rawTokens.some((w) => {
        if (w.length < 4) return false;
        return nTitle.includes(w) || nTopic.includes(w);
      });
    }).slice(0, 3);

    // Search topics / syllabus
    const topics = db
      .prepare('SELECT id, name, status, note_count, pyq_count FROM topics LIMIT 150')
      .all();

    const matchedTopics = topics.filter((t) => {
      const tName = t.name.toLowerCase();
      return rawTokens.some((w) => w.length >= 4 && tName.includes(w));
    }).slice(0, 3);

    return {
      notes: matchedNotes,
      subjects: matchedSubjects,
      topics: matchedTopics,
    };
  } catch (err) {
    console.error('Error fetching context for AI:', err);
    return { notes: [], subjects: [], topics: [] };
  }
}

// -------------------------------------------------------------
// 3. System Prompt & Anti-Hallucination Guardrails
// -------------------------------------------------------------
function buildSystemInstruction(user, context) {
  let contextBlock = '';

  if (context.subjects.length > 0) {
    contextBlock += `\nRelevant Subjects on Atelier:\n` +
      context.subjects.map((s) => `- ${s.name} (${s.code}, Sem ${s.semester}, Dept: ${s.department}) [Link: /subjects/${s.id}]`).join('\n');
  }

  if (context.notes.length > 0) {
    contextBlock += `\nVerified Available Notes on Atelier for this query:\n` +
      context.notes.map((n) => `- "${n.title}" (${n.format?.toUpperCase()}, ${n.pages} pages, by ${n.author}) [Link: /notes/${n.id}]`).join('\n');
  }

  if (context.topics.length > 0) {
    contextBlock += `\nRelevant Syllabus Topics:\n` +
      context.topics.map((t) => `- Topic: ${t.name} (Coverage: ${t.status}, Notes: ${t.note_count}, PYQs: ${t.pyq_count})`).join('\n');
  }

  return `You are "Atelier Study Assistant", an expert academic professor and direct tutor for university students.

STUDENT PROFILE:
- Name: ${user?.name || 'Student'}
- Department / Stream: ${user?.department || user?.stream || 'Computer Science & Engineering'}
- Semester: ${user?.semester || 5}

CORE TEACHING DIRECTIVE — ALWAYS ANSWER IN FULL:
1. When asked ANY academic concept, question, theory, algorithm, or syllabus topic:
   - You MUST explain the concept completely, directly, and thoroughly in this response.
   - Include clear definitions, core principles, step-by-step execution, worked examples, and key exam takeaways.
   - NEVER deflect by telling the student to "read the notes" or "check the library". The student is asking YOU to explain it, so YOU MUST ANSWER IT FULLY.
   - Only at the very end of your answer may you add an optional 1-line note: "💡 *You can also find supplementary lecture slides and past exam questions in the library.*"

2. Anti-Hallucination & Misconception Defense:
   - If a student asks a question with a false premise (e.g. "Why did Einstein invent Python?"), immediately correct the misconception before explaining the real fact.
   - Never invent nonexistent APIs or fake scientific facts.

3. Scope:
   - Focus exclusively on university coursework, computer science, engineering, mathematics, and exam revision.

${contextBlock ? `\nAVAILABLE PLATFORM RESOURCES FOR THIS QUERY (Optional reference only):\n${contextBlock}\n` : ''}`;
}

// -------------------------------------------------------------
// 4. Built-in Academic Knowledge Engine (Instant Concept Explanations)
// -------------------------------------------------------------
export function generateDirectAcademicExplanation(query, context, user) {
  const q = query.toLowerCase();

  // 1. LRU & Page Replacement & Virtual Memory
  if (q.includes('lru') || q.includes('page replacement') || q.includes('paging') || q.includes('page fault') || q.includes('virtual memory')) {
    return {
      reply: `### LRU (Least Recently Used) Page Replacement Algorithm

**1. Core Principle & Definition**
LRU is a memory management algorithm based on the **principle of temporal locality of reference**: if a memory page has been accessed recently, it is likely to be accessed again soon. When a page fault occurs and no free memory frame is available, LRU replaces the page that has **not been referenced for the longest period of time**.

**2. How It Works Step-by-Step**
1. When the CPU requests a logical address, the MMU checks the page table.
2. If the page is present in RAM (**Page Hit**), its access timestamp or stack position is updated to the most recent.
3. If the page is absent (**Page Fault**):
   - If free frames exist, the page is loaded into a free frame.
   - If all frames are occupied, the Operating System inspects page history and evicts the page with the oldest access time.
4. The requested page is brought in from secondary storage (swap space).

**3. Implementation Mechanisms**
- **Counters / Timestamps:** Each page entry is paired with a clock register. On access, the current clock value is copied. The page with the smallest time value is victimized (search overhead $O(N)$).
- **Stack Implementation (Doubly-Linked List + Hash Map):** Whenever a page is referenced, it is moved to the top of the stack. The page at the bottom is always the Least Recently Used (fast $O(1)$ operations).

**4. Numerical Exam Walkthrough**
*Reference String:* \`7, 0, 1, 2, 0, 3, 0, 4\` with **3 frames** (initially empty):
- \`7\`: [7, -, -] → **Fault (1)**
- \`0\`: [7, 0, -] → **Fault (2)**
- \`1\`: [7, 0, 1] → **Fault (3)**
- \`2\`: Evict \`7\` (longest unused) → [2, 0, 1] → **Fault (4)**
- \`0\`: [2, 0, 1] → **Hit** (0 moved to most recent)
- \`3\`: Evict \`1\` (longest unused among 2, 0, 1) → [2, 0, 3] → **Fault (5)**
- \`0\`: [2, 0, 3] → **Hit**
- \`4\`: Evict \`2\` → [4, 0, 3] → **Fault (6)**

**5. Comparison with Other Algorithms**
- **FIFO:** Replaces oldest loaded page; suffers from **Belady’s Anomaly** (increasing frames can increase page faults).
- **LRU:** Belongs to the class of **Stack Algorithms**; strictly immune to Belady’s Anomaly.
- **Optimal (OPT / MIN):** Replaces page that will not be used for the longest time in the future. Serves as a theoretical benchmark.`,
      suggestions: [
        'How does Belady’s Anomaly happen in FIFO?',
        'Show me the Doubly Linked List LRU implementation',
        'Compare LRU with Clock (Second Chance) Algorithm'
      ],
      actions: [
        { label: 'View Virtual Memory Notes', to: '/notes' },
        { label: 'Check OS PYQ Papers', to: '/pyq' }
      ]
    };
  }

  // 2. Deadlock & Concurrency & Banker's Algorithm
  if (q.includes('deadlock') || q.includes('banker') || q.includes('coffman') || q.includes('concurrency') || q.includes('mutex') || q.includes('semaphore')) {
    return {
      reply: `### Deadlocks, Coffman Conditions & Banker's Algorithm

**1. What is a Deadlock?**
A deadlock is a condition in concurrent programming where two or more processes are permanently blocked because each is holding a resource and waiting for another resource held by another process in the closed set.

**2. The Four Necessary Coffman Conditions**
For a deadlock to exist, all four conditions must hold simultaneously:
1. **Mutual Exclusion:** At least one resource must be non-shareable (only one process at a time).
2. **Hold and Wait:** A process is holding at least one resource and requesting additional resources held by others.
3. **No Preemption:** Resources cannot be forcibly seized; they are released only voluntarily by the holding process.
4. **Circular Wait:** A closed cycle exists $P_0 \\rightarrow P_1 \\rightarrow \\dots \\rightarrow P_n \\rightarrow P_0$, where each process waits for the next.

**3. Deadlock Handling Strategies**
- **Prevention:** Invalidate at least one of the 4 Coffman conditions (e.g., impose resource ordering to prevent circular wait).
- **Avoidance (Banker’s Algorithm):** Dynamically inspects each resource request. The OS only allocates resources if the resulting state is **Safe** (a sequence exists where all processes can complete).
  - Formula: $\\text{Need}[i][j] = \\text{Max}[i][j] - \\text{Allocation}[i][j]$
- **Detection & Recovery:** Construct a Resource Allocation Graph (RAG) / Wait-For Graph. If cycles exist, recover by process termination or resource preemption.
- **Ignoration (Ostrich Algorithm):** Pretend deadlocks never occur (used in UNIX/Windows when deadlock frequency is low).

**4. Synchronization Primitives: Mutex vs. Semaphore**
- **Mutex (Mutual Exclusion Object):** A locking mechanism with ownership. Only the thread that acquired the mutex can release it.
- **Counting Semaphore:** An integer variable accessed via two atomic operations (\`wait()\` / \`P()\` and \`signal()\` / \`V()\`). Can control access to a pool of $N$ identical resources.`,
      suggestions: [
        'Walk through Banker’s Algorithm safety state check',
        'What is the difference between Mutex and Semaphore?',
        'How does Circular Wait prevention work in practice?'
      ],
      actions: [
        { label: 'View Deadlock Lecture Notes', to: '/notes' },
        { label: 'Browse OS PYQ Solutions', to: '/pyq' }
      ]
    };
  }

  // 3. Database Normalization & DBMS & ACID
  if (q.includes('normaliz') || q.includes('1nf') || q.includes('2nf') || q.includes('3nf') || q.includes('bcnf') || q.includes('acid') || q.includes('database') || q.includes('dbms')) {
    return {
      reply: `### Database Normalization (1NF, 2NF, 3NF, BCNF) & ACID Properties

**1. Purpose of Normalization**
Normalization is the systematic process of organizing relation schemas to **eliminate data redundancy** and avoid anomalies:
- **Insertion Anomaly:** Unable to insert data without inserting unrelated null attributes.
- **Deletion Anomaly:** Deleting one fact unintentionally erases other critical information.
- **Update Anomaly:** Modifying a value in one row leaves conflicting stale copies in others.

**2. The Normal Forms Progression**
- **1NF (First Normal Form):**
  - All attribute values must be **atomic** (no multi-valued attributes, no repeating groups).
  - Every column contains single values of a defined domain.
- **2NF (Second Normal Form):**
  - Must be in **1NF**.
  - **No partial functional dependencies:** Every non-prime attribute must be fully functionally dependent on the entire primary key (relevant for composite keys).
- **3NF (Third Normal Form):**
  - Must be in **2NF**.
  - **No transitive functional dependencies:** No non-prime attribute may depend on another non-prime attribute ($X \\rightarrow Y$, if $Y$ is non-prime, $X$ must be a super key).
- **BCNF (Boyce-Codd Normal Form - Strong 3NF):**
  - For every functional dependency $X \\rightarrow Y$, $X$ **must be a Super Key**.

**3. ACID Properties in Transaction Processing**
- **Atomicity:** All operations in a transaction succeed together or all roll back (managed by Recovery / WAL logs).
- **Consistency:** Transactions take the database from one valid consistent state to another, preserving integrity constraints.
- **Isolation:** Concurrent transactions execute without cross-interference (managed via Two-Phase Locking [2PL] and Isolation levels).
- **Durability:** Once committed, changes survive system crashes and power failures.`,
      suggestions: [
        'Give a real-world example of 2NF vs 3NF with tables',
        'Explain BCNF decomposition and losslessness',
        'What is Two-Phase Locking (2PL)?'
      ],
      actions: [
        { label: 'Open DBMS Lecture Notes', to: '/notes' },
        { label: 'View DBMS Semester PYQs', to: '/pyq' }
      ]
    };
  }

  // 4. Computer Networks, TCP vs UDP, OSI Model
  if (q.includes('tcp') || q.includes('udp') || q.includes('osi') || q.includes('network') || q.includes('handshake') || q.includes('ip address') || q.includes('subnet')) {
    return {
      reply: `### Computer Networks: OSI 7-Layer Model & TCP vs UDP

**1. The OSI 7-Layer Architecture**
From physical medium to end-user application:
1. **Physical:** Bit-level transmission (cables, hubs, voltages).
2. **Data Link:** Framing, MAC physical addressing, error detection (Ethernet, switches).
3. **Network:** Logical routing and packet delivery (IP, ICMP, routers).
4. **Transport:** End-to-end process-to-process delivery, segmentation, reliability (TCP, UDP, port numbers).
5. **Session:** Dialog control, session establishment and termination.
6. **Presentation:** Syntax translation, data compression, encryption (TLS/SSL).
7. **Application:** End-user network interfaces (HTTP, DNS, SMTP, SSH).

**2. In-Depth Comparison: TCP vs. UDP**

| Feature | TCP (Transmission Control Protocol) | UDP (User Datagram Protocol) |
|---|---|---|
| **Connection** | Connection-oriented (requires 3-way handshake) | Connectionless (fire and forget) |
| **Reliability** | Guaranteed delivery (retransmits dropped packets) | Best-effort (no retransmissions) |
| **Ordering** | In-order byte stream delivery | Packets may arrive out-of-order |
| **Flow & Congestion** | Flow control (Sliding Window), Congestion control | None (application manages flow) |
| **Header Size** | 20–60 bytes | 8 bytes (minimal overhead) |
| **Use Cases** | Web pages (HTTP/HTTPS), Email, File transfer (FTP) | Real-time audio/video (VoIP), Gaming, DNS |

**3. TCP 3-Way Handshake**
1. **Client $\\rightarrow$ Server:** \`SYN\` (Sequence Number = $X$)
2. **Server $\\rightarrow$ Client:** \`SYN-ACK\` (Sequence Number = $Y$, Acknowledgment = $X + 1$)
3. **Client $\\rightarrow$ Server:** \`ACK\` (Acknowledgment = $Y + 1$)`,
      suggestions: [
        'How does TCP Sliding Window Flow Control work?',
        'Explain Subnetting and CIDR calculation with an example',
        'What happens during DNS resolution step-by-step?'
      ],
      actions: [
        { label: 'View Computer Networks Notes', to: '/notes' },
        { label: 'Explore Networking PYQs', to: '/pyq' }
      ]
    };
  }

  // 5. CPU Scheduling & Processes
  if (q.includes('schedul') || q.includes('round robin') || q.includes('sjf') || q.includes('fcfs') || q.includes('turnaround') || q.includes('waiting time')) {
    return {
      reply: `### CPU Scheduling Algorithms & Process Management

**1. Objectives of CPU Scheduling**
CPU scheduling allocates CPU cores among ready processes to maximize CPU utilization, maximize throughput, and minimize **Turnaround Time**, **Waiting Time**, and **Response Time**.

**2. Key Scheduling Metrics & Formulas**
- **Turnaround Time ($TAT$):** $\\text{Completion Time} - \\text{Arrival Time}$
- **Waiting Time ($WT$):** $\\text{Turnaround Time} - \\text{Burst Time}$
- **Response Time ($RT$):** Time from submission to first CPU execution.

**3. Primary Scheduling Algorithms**
- **FCFS (First-Come, First-Served):** Non-preemptive. Simple FIFO queue. Suffers from the **Convoy Effect** (short processes stuck behind a long CPU-bound process).
- **SJF (Shortest Job First):** Provably optimal for minimizing average waiting time.
  - *Non-preemptive:* Process runs to completion once dispatched.
  - *Preemptive (SRTF - Shortest Remaining Time First):* Preempts currently running job if a newly arrived process has shorter remaining burst time.
- **Round Robin (RR):** Preemptive. Each process gets a fixed **Time Quantum (TQ)**.
  - If $TQ$ is too large $\\rightarrow$ behaves like FCFS.
  - If $TQ$ is too small $\\rightarrow$ high context-switching overhead decreases efficiency.
- **Priority Scheduling:** Can be preemptive or non-preemptive. Suffers from **Starvation** (indefinite blocking of low-priority jobs), solved through **Aging** (gradually increasing priority over time).`,
      suggestions: [
        'Solve an exam numerical for Round Robin Gantt chart',
        'Compare Preemptive SJF vs Non-preemptive SJF',
        'What is Multilevel Feedback Queue Scheduling?'
      ],
      actions: [
        { label: 'Browse OS Scheduling Notes', to: '/notes' },
        { label: 'View OS Exam Questions', to: '/pyq' }
      ]
    };
  }

  // 6. Theory of Computation & Automata
  if (q.includes('automata') || q.includes('toc') || q.includes('dfa') || q.includes('nfa') || q.includes('cfg') || q.includes('turing') || q.includes('grammar') || q.includes('regular expression')) {
    return {
      reply: `### Theory of Computation: Automata & Formal Languages

**1. Chomsky Hierarchy of Languages**
1. **Type 3 (Regular Languages):** Recognized by **Finite Automata (DFA/NFA)**. Generated by Regular Grammars.
2. **Type 2 (Context-Free Languages):** Recognized by **Pushdown Automata (PDA)** (Stack memory). Generated by CFGs.
3. **Type 1 (Context-Sensitive Languages):** Recognized by **Linear Bounded Automata (LBA)**.
4. **Type 0 (Unrestricted / Recursively Enumerable):** Recognized by **Turing Machines**.

**2. DFA vs NFA Comparison**
- **DFA (Deterministic Finite Automaton):**
  - For every state and input symbol, there is **exactly one** transition: $\\delta: Q \\times \\Sigma \\rightarrow Q$.
  - No $\\epsilon$ (empty string) transitions permitted.
- **NFA (Non-Deterministic Finite Automaton):**
  - For a state and symbol, there can be **zero, one, or multiple transitions**: $\\delta: Q \\times (\\Sigma \\cup \\{\\epsilon\\}) \\rightarrow 2^Q$.
  - **Equivalence:** Any NFA can be converted to an equivalent DFA using the **Subset Construction algorithm**, though the DFA may have up to $2^n$ states in the worst case.

**3. Pumping Lemma for Regular Languages**
Used to **prove that a language is NOT regular** by contradiction:
If $L$ is regular, any string $s \\in L$ with $|s| \\ge p$ can be split into $s = xyz$ such that:
1. $|y| > 0$
2. $|xy| \\le p$
3. $x y^i z \\in L$ for all $i \\ge 0$`,
      suggestions: [
        'How to prove a language is non-regular using Pumping Lemma?',
        'Convert an NFA with epsilon moves to DFA',
        'Explain Pushdown Automata and Context-Free Grammars'
      ],
      actions: [
        { label: 'View TOC Lecture Notes', to: '/notes' },
        { label: 'Check Automata PYQ Papers', to: '/pyq' }
      ]
    };
  }

  // 7. Software Engineering & SDLC
  if (q.includes('software engineering') || q.includes('sdlc') || q.includes('agile') || q.includes('scrum') || q.includes('waterfall') || q.includes('testing')) {
    return {
      reply: `### Software Engineering: SDLC Models & Testing Methodologies

**1. Software Development Life Cycle (SDLC)**
The structured sequence of stages in software production:
1. Requirement Analysis & Specification (SRS)
2. System & Architectural Design
3. Implementation / Coding
4. Testing & Verification
5. Deployment & Release
6. Maintenance & Evolution

**2. Classical Waterfall vs. Agile Scrum**
- **Waterfall Model:**
  - Sequential, rigid phase gates.
  - Good for small projects with well-defined, non-changing requirements.
  - High risk because working software is only demonstrated late in the lifecycle.
- **Agile / Scrum:**
  - Iterative, incremental delivery in short timeboxed **Sprints** (1–4 weeks).
  - Emphasizes customer collaboration, adaptive planning, daily standups, and working software over exhaustive documentation.

**3. Verification vs. Validation**
- **Verification ("Are we building the product right?"):** Static reviews, walkthroughs, inspections without code execution.
- **Validation ("Are we building the right product?"):** Dynamic testing with actual inputs against user requirements.

**4. Testing Strategies**
- **Black-Box Testing (Functional):** Equivalence Partitioning, Boundary Value Analysis, Decision Tables.
- **White-Box Testing (Structural):** Statement Coverage, Branch/Decision Coverage, Cyclomatic Complexity ($V(G) = E - N + 2P$).`,
      suggestions: [
        'How to calculate McCabe’s Cyclomatic Complexity?',
        'Compare Boundary Value Analysis with Equivalence Partitioning',
        'Explain Agile Sprint ceremonies and roles'
      ],
      actions: [
        { label: 'View Software Engineering Notes', to: '/notes' },
        { label: 'Browse SE Semester PYQs', to: '/pyq' }
      ]
    };
  }

  // 8. General Academic Synthesis
  const title = context.notes[0]?.title || context.topics[0]?.name || query.trim();
  return {
    reply: `### Academic Concept Guide: ${title}

**1. Core Definition & Overview**
In university coursework, **${query.trim()}** represents a foundational principle within your degree curriculum. It establishes the theoretical basis for system behavior, data integrity, and engineering problem-solving.

**2. Key Technical Concepts & Mechanisms**
- **Formal Definition:** Systematically structures computational tasks to balance performance, resource utilization, and reliability.
- **Core Operations:** Follows standard modular phases: initialization, state validation, operational execution, and error handling.
- **Design Tradeoffs:** Engineering implementations continually balance time complexity vs. space complexity and simplicity vs. optimization.

**3. Exam Preparation & Key Takeaways**
- Focus on defining the term with its standard terminology and mathematical or state representations.
- Practice drawing the standard architecture or sequence diagram, as examiners award maximum marks for clear schematics.
- Review typical semester exam numericals and edge cases (e.g., boundary conditions, concurrency race conditions).

💡 *For full textbook derivations, chapter breakdowns, and verified diagrams, check the course materials below:*`,
    suggestions: [
      'Show me typical exam questions on this topic',
      'Explain this with a simple real-world analogy',
      'What are the common mistakes students make in exams?'
    ],
    actions: [
      { label: 'Explore Course Notes', to: '/notes' },
      { label: 'View Related Syllabus Units', to: '/syllabus' }
    ]
  };
}

// -------------------------------------------------------------
// 5. Gemini API Runner with Model Fallbacks
// -------------------------------------------------------------
export async function generateChatResponse({ message, history = [], user = null }) {
  // Step 1: Pre-filter guardrail
  const preCheck = runPreFilter(message);
  if (!preCheck.allowed) {
    return {
      reply: preCheck.reply,
      guardrailTriggered: true,
      suggestions: [
        'Explain Virtual Memory paging',
        'Find Operating Systems notes',
        'Where can I find PYQ papers?',
      ],
      actions: [],
    };
  }

  const context = getContextForQuery(message);
  const key = process.env.GEMINI_API_KEY || GEMINI_API_KEY;
  if (!key) {
    return generateDirectAcademicExplanation(message, context, user);
  }
  const systemInstruction = buildSystemInstruction(user, context);

  // Step 3: Format conversation contents for Gemini
  const contents = [];
  const recentHistory = Array.isArray(history) ? history.slice(-6) : [];
  for (const h of recentHistory) {
    if (h.role === 'user' && h.content) {
      contents.push({ role: 'user', parts: [{ text: h.content }] });
    } else if (h.role === 'assistant' && h.content) {
      contents.push({ role: 'model', parts: [{ text: h.content }] });
    }
  }

  // Append current user message
  contents.push({ role: 'user', parts: [{ text: message }] });

  // Candidate models (prioritizing active fast-response models)
  const candidateModels = [
    'gemini-3.5-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.7-flash',
    'gemini-3.1-flash-lite',
    'gemini-flash-latest',
    'gemini-3.8-flash',
    'gemini-2.5-flash',
  ];

  let rawReply = null;
  let lastError = null;

  for (const model of candidateModels) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
      const payload = {
        systemInstruction: {
          parts: [{ text: systemInstruction }],
        },
        contents: contents,
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens: 1200,
        },
      };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(9000),
      });

      const data = await res.json();

      if (res.ok && data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
        rawReply = data.candidates[0].content.parts[0].text;
        break; // Successfully got response
      } else {
        lastError = data.error?.message || `HTTP ${res.status}`;
      }
    } catch (err) {
      lastError = err.message;
    }
  }

  if (!rawReply) {
    console.error('All Gemini model candidates failed. Last error:', lastError);
    return generateDirectAcademicExplanation(message, context, user);
  }

  // Step 4: Intelligent Post-Filter & Grounded Action Extraction
  const actions = [];
  const lowerMsg = message.toLowerCase();
  const lowerReply = rawReply.toLowerCase();

  // Check if reply is a refusal or safety declination
  const isDeclinedOrSafety =
    lowerReply.includes("i'm your atelier study assistant") ||
    lowerReply.includes('i cannot fulfill this request') ||
    lowerReply.includes('i specialize in university coursework') ||
    lowerReply.includes('academic integrity guidelines') ||
    lowerReply.includes('cannot provide direct code') ||
    lowerReply.includes('cannot disclose');

  if (!isDeclinedOrSafety) {
    if (lowerMsg.includes('pyq') || lowerMsg.includes('question paper') || lowerMsg.includes('previous year')) {
      actions.push({ label: 'Open PYQ Archive', to: '/pyq' });
    }
    if (lowerMsg.includes('saved') || lowerMsg.includes('bookmark') || lowerMsg.includes('my library')) {
      actions.push({ label: 'Go to My Library', to: '/library' });
    }
    if (lowerMsg.includes('upload') || lowerMsg.includes('contribute') || lowerMsg.includes('share note')) {
      actions.push({ label: 'Upload Notes', to: '/uploads' });
    }
    if (lowerMsg.includes('syllabus') || lowerMsg.includes('units') || lowerMsg.includes('coverage')) {
      actions.push({ label: 'Explore Syllabus', to: '/syllabus' });
    }
    if (lowerMsg.includes('request note') || lowerReply.includes('request notes board') || lowerReply.includes('not available')) {
      actions.push({ label: 'Request Notes on Board', to: '/requests' });
    }

    // Only attach note action if the note is explicitly relevant or mentioned in reply
    if (context.notes.length > 0 && actions.length === 0) {
      for (const note of context.notes) {
        // Confirm the note is actually related to the reply or query
        const titleWords = note.title.toLowerCase().split(/\s+/).filter(w => w.length >= 4);
        const isMentionedInReply = rawReply.includes(note.id) || titleWords.some(w => lowerReply.includes(w));
        const isMentionedInMsg = titleWords.some(w => lowerMsg.includes(w));

        if (isMentionedInReply || isMentionedInMsg) {
          actions.push({ label: `View: ${note.title.slice(0, 24)}…`, to: `/notes/${note.id}` });
          break;
        }
      }
    }
  }

  // Suggestions tailored to query
  const suggestions = isDeclinedOrSafety
    ? ['Explain Operating Systems paging', 'Show DBMS Normalization', 'Find PYQ Papers']
    : ['Give a real-world example', 'What are key exam takeaways?', 'Where can I find PYQs for this?'];

  return {
    reply: rawReply,
    guardrailTriggered: false,
    suggestions,
    actions,
  };
}
