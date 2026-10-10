// ================================================================
// Mock Data for the Notes Sharing Platform
// ================================================================

export interface Topic {
  id: string;
  name: string;
  status: 'covered' | 'partial' | 'missing';
  noteCount: number;
  pyqCount: number;
  pyqYears: number[];
  pyqQuestions?: string[];
}

export interface Unit {
  id: string;
  name: string;
  topics: Topic[];
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  semester: number;
  scheme: string;
  department?: string;
  units: Unit[];
  coverage: number;
}

export interface NoteResource {
  id: string;
  title: string;
  author: string;
  authorInitials: string;
  subjectId: string;
  unitId: string;
  topicIds: string[];
  primaryTopic?: string;
  topicNames?: string[];
  description?: string;
  department?: string;
  semester?: number;
  subjectName?: string;
  subjectCode?: string;
  unitName?: string;
  format: 'Handwritten PDF' | 'Typed Slides' | 'Typed Notes' | 'Lab Manual' | 'Cheatsheet' | string;
  pages: number;
  filePath?: string;
  fileSize?: number;
  fileSizeFormatted?: string;
  mimeType?: string;
  uploadDate: string;
  downloads: number;
  upvotes?: number;
  isUpvoted?: boolean;
  commentCount?: number;
  topicMatchCount: number;
  totalTopics: number;
  syllabusMatch: string;
  tags?: string[];
  userId?: string;
  status?: 'published' | 'processing' | 'flagged' | string;
  isSaved?: boolean;
}

export interface NoteComment {
  id: string;
  noteId: string;
  userId: string;
  userName: string;
  userInitials: string;
  userRole?: string;
  category?: 'Exam Tip' | 'Errata / Correction' | 'Question' | 'Key Takeaway' | 'General' | string;
  content: string;
  createdAt: string;
  upvotes: number;
  isUpvoted?: boolean;
}

export interface LeaderboardContributor {
  rank: number;
  userId: string;
  name: string;
  initials: string;
  role: string;
  college: string;
  department: string;
  totalUploads: number;
  totalDownloads: number;
  totalUpvotes: number;
  reputationScore: number;
  badge: string;
  tier: 'Diamond' | 'Platinum' | 'Gold' | 'Silver' | 'Bronze' | string;
}

export interface PYQQuestionItem {
  id: string;
  qNumber: string;
  question: string;
  marks: number;
  unitName?: string;
  topicId?: string;
  topicName?: string;
}

export interface PYQEntry {
  id: string;
  title?: string;
  subjectId: string;
  subjectName?: string;
  subjectCode?: string;
  year: number;
  month: string;
  examType?: string;
  semester?: number;
  department?: string;
  totalMarks?: number;
  primaryTopic?: string;
  questionCount: number;
  topicMapping: { topicId: string; topicName: string; count?: number; questionCount?: number }[];
  questions?: PYQQuestionItem[];
  format?: string;
  pages?: number;
  fileSize?: string;
  author?: string;
  uploadDate?: string;
  downloads?: number;
  status?: string;
  isSaved?: boolean;
}

export interface ModerationItem {
  id: string;
  noteId?: string;
  userId?: string;
  resourceName: string;
  primaryTopic?: string;
  subjectId?: string;
  subjectName?: string;
  subjectCode?: string;
  reporter: string;
  reporterEmail?: string;
  reporterDepartment?: string;
  category?: string;
  reason: string;
  details?: string;
  timestamp: string;
  status: 'pending' | 'under_review' | 'resolved' | 'dismissed' | 'quarantined';
  adminNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  actionTaken?: string;
  // Attached note context
  noteTitle?: string;
  uploaderName?: string;
  uploaderId?: string;
  uploaderEmail?: string;
  uploadDate?: string;
  pages?: number;
  format?: string;
  fileSize?: string;
  noteStatus?: string;
}

// --- Subjects & Syllabus ---
export const subjects: Subject[] = [
  {
    id: 'os',
    name: 'Operating Systems',
    code: 'CS501',
    semester: 5,
    scheme: '2022–2026 Scheme',
    coverage: 78,
    units: [
      {
        id: 'os-u1',
        name: 'Unit 1: Introduction to OS',
        topics: [
          { id: 'os-t1', name: 'OS Structure & Components', status: 'covered', noteCount: 5, pyqCount: 3, pyqYears: [2023, 2024, 2025], pyqQuestions: ['Explain the layered architecture of an OS.', 'Compare monolithic vs microkernel.', 'List the functions of an operating system.'] },
          { id: 'os-t2', name: 'System Calls & Interrupts', status: 'covered', noteCount: 3, pyqCount: 2, pyqYears: [2024, 2025], pyqQuestions: ['Differentiate between system calls and interrupts.', 'Explain the system call mechanism with a diagram.'] },
          { id: 'os-t3', name: 'Process Concept & States', status: 'partial', noteCount: 2, pyqCount: 4, pyqYears: [2022, 2023, 2024, 2025], pyqQuestions: ['Draw and explain the process state diagram.', 'What is a PCB? List its contents.', 'Explain context switching.', 'Differentiate between process and program.'] },
          { id: 'os-t4', name: 'Threads & Multithreading', status: 'covered', noteCount: 4, pyqCount: 2, pyqYears: [2023, 2025], pyqQuestions: ['Compare user-level vs kernel-level threads.', 'Explain multithreading models.'] },
        ]
      },
      {
        id: 'os-u2',
        name: 'Unit 2: Process Scheduling',
        topics: [
          { id: 'os-t5', name: 'Scheduling Algorithms (FCFS, SJF, RR)', status: 'covered', noteCount: 6, pyqCount: 5, pyqYears: [2021, 2022, 2023, 2024, 2025], pyqQuestions: ['Solve FCFS scheduling for the given arrival times.', 'Compare SJF and Round Robin.', 'Calculate average waiting time for RR with quantum 3.'] },
          { id: 'os-t6', name: 'Priority & Multilevel Queue', status: 'partial', noteCount: 1, pyqCount: 2, pyqYears: [2023, 2024], pyqQuestions: ['Explain multilevel feedback queue scheduling.', 'Discuss priority scheduling with aging.'] },
          { id: 'os-t7', name: 'Real-Time Scheduling', status: 'missing', noteCount: 0, pyqCount: 1, pyqYears: [2025], pyqQuestions: ['Differentiate between hard and soft real-time systems.'] },
        ]
      },
      {
        id: 'os-u3',
        name: 'Unit 3: Concurrency & Synchronization',
        topics: [
          { id: 'os-t8', name: 'Critical Section Problem', status: 'covered', noteCount: 4, pyqCount: 3, pyqYears: [2023, 2024, 2025], pyqQuestions: ['State and explain the conditions for the critical section problem.', 'Explain Peterson\'s solution.'] },
          { id: 'os-t9', name: 'Semaphores & Monitors', status: 'covered', noteCount: 3, pyqCount: 4, pyqYears: [2022, 2023, 2024, 2025], pyqQuestions: ['Explain binary and counting semaphores.', 'Solve the Producer-Consumer problem using semaphores.', 'What are monitors? Compare with semaphores.'] },
          { id: 'os-t10', name: 'Deadlock Detection & Prevention', status: 'partial', noteCount: 2, pyqCount: 4, pyqYears: [2022, 2023, 2024, 2025], pyqQuestions: ['Explain the Banker\'s Algorithm with an example.', 'List necessary conditions for deadlock.', 'Differentiate deadlock prevention and avoidance.', 'Draw a resource allocation graph and detect deadlock.'] },
        ]
      },
      {
        id: 'os-u4',
        name: 'Unit 4: Memory Management',
        topics: [
          { id: 'os-t11', name: 'Paging & Segmentation', status: 'covered', noteCount: 5, pyqCount: 3, pyqYears: [2023, 2024, 2025], pyqQuestions: ['Explain paging with a diagram.', 'Compare paging and segmentation.', 'Solve: Given page size 4KB and logical address space 64KB, find page table entries.'] },
          { id: 'os-t12', name: 'Virtual Memory & Demand Paging', status: 'missing', noteCount: 0, pyqCount: 3, pyqYears: [2023, 2024, 2025], pyqQuestions: ['Explain demand paging with page fault handling.', 'What is thrashing? How to prevent it?', 'Compare FIFO and LRU page replacement.'] },
          { id: 'os-t13', name: 'Page Replacement Algorithms', status: 'missing', noteCount: 0, pyqCount: 2, pyqYears: [2024, 2025], pyqQuestions: ['Solve LRU page replacement for the given reference string.', 'Explain Belady\'s Anomaly.'] },
        ]
      },
      {
        id: 'os-u5',
        name: 'Unit 5: File Systems & I/O',
        topics: [
          { id: 'os-t14', name: 'File System Implementation', status: 'covered', noteCount: 3, pyqCount: 2, pyqYears: [2024, 2025], pyqQuestions: ['Explain inode-based file system.', 'Compare contiguous, linked, and indexed allocation.'] },
          { id: 'os-t15', name: 'Disk Scheduling Algorithms', status: 'partial', noteCount: 1, pyqCount: 3, pyqYears: [2023, 2024, 2025], pyqQuestions: ['Solve SSTF disk scheduling for the given queue.', 'Compare SCAN and C-SCAN.', 'What is LOOK scheduling?'] },
          { id: 'os-t16', name: 'I/O Management & DMA', status: 'covered', noteCount: 2, pyqCount: 1, pyqYears: [2024], pyqQuestions: ['Explain DMA and its advantages.'] },
        ]
      }
    ]
  },
  {
    id: 'dbms',
    name: 'Database Management Systems',
    code: 'CS502',
    semester: 5,
    scheme: '2022–2026 Scheme',
    coverage: 54,
    units: [
      {
        id: 'dbms-u1',
        name: 'Unit 1: Introduction & ER Model',
        topics: [
          { id: 'dbms-t1', name: 'Database Architecture (3-Schema)', status: 'covered', noteCount: 3, pyqCount: 2, pyqYears: [2024, 2025] },
          { id: 'dbms-t2', name: 'ER Model & EER', status: 'covered', noteCount: 4, pyqCount: 3, pyqYears: [2023, 2024, 2025] },
          { id: 'dbms-t3', name: 'Relational Model Basics', status: 'partial', noteCount: 2, pyqCount: 2, pyqYears: [2024, 2025] },
        ]
      },
      {
        id: 'dbms-u2',
        name: 'Unit 2: SQL & Relational Algebra',
        topics: [
          { id: 'dbms-t4', name: 'SQL: DDL, DML, DCL', status: 'covered', noteCount: 5, pyqCount: 4, pyqYears: [2022, 2023, 2024, 2025] },
          { id: 'dbms-t5', name: 'Joins & Subqueries', status: 'covered', noteCount: 3, pyqCount: 3, pyqYears: [2023, 2024, 2025] },
          { id: 'dbms-t6', name: 'Relational Algebra Operations', status: 'missing', noteCount: 0, pyqCount: 2, pyqYears: [2024, 2025] },
        ]
      },
      {
        id: 'dbms-u3',
        name: 'Unit 3: Normalization',
        topics: [
          { id: 'dbms-t7', name: 'Functional Dependencies', status: 'partial', noteCount: 1, pyqCount: 3, pyqYears: [2023, 2024, 2025] },
          { id: 'dbms-t8', name: 'Normal Forms (1NF–BCNF)', status: 'covered', noteCount: 4, pyqCount: 4, pyqYears: [2022, 2023, 2024, 2025] },
          { id: 'dbms-t9', name: 'Lossless Decomposition', status: 'missing', noteCount: 0, pyqCount: 2, pyqYears: [2024, 2025] },
        ]
      },
      {
        id: 'dbms-u4',
        name: 'Unit 4: Transactions & Concurrency',
        topics: [
          { id: 'dbms-t10', name: 'ACID Properties', status: 'missing', noteCount: 0, pyqCount: 3, pyqYears: [2023, 2024, 2025] },
          { id: 'dbms-t11', name: 'Concurrency Control Protocols', status: 'missing', noteCount: 0, pyqCount: 2, pyqYears: [2024, 2025] },
          { id: 'dbms-t12', name: 'Recovery Techniques', status: 'missing', noteCount: 0, pyqCount: 1, pyqYears: [2025] },
        ]
      }
    ]
  },
  {
    id: 'cn',
    name: 'Computer Networks',
    code: 'CS503',
    semester: 5,
    scheme: '2022–2026 Scheme',
    coverage: 65,
    units: [
      {
        id: 'cn-u1',
        name: 'Unit 1: Network Fundamentals',
        topics: [
          { id: 'cn-t1', name: 'OSI & TCP/IP Models', status: 'covered', noteCount: 6, pyqCount: 4, pyqYears: [2022, 2023, 2024, 2025] },
          { id: 'cn-t2', name: 'Transmission Media', status: 'covered', noteCount: 3, pyqCount: 1, pyqYears: [2024] },
          { id: 'cn-t3', name: 'Network Topologies', status: 'covered', noteCount: 4, pyqCount: 2, pyqYears: [2023, 2025] },
        ]
      },
      {
        id: 'cn-u2',
        name: 'Unit 2: Data Link Layer',
        topics: [
          { id: 'cn-t4', name: 'Error Detection & Correction', status: 'covered', noteCount: 3, pyqCount: 3, pyqYears: [2023, 2024, 2025] },
          { id: 'cn-t5', name: 'Sliding Window Protocols', status: 'partial', noteCount: 2, pyqCount: 2, pyqYears: [2024, 2025] },
          { id: 'cn-t6', name: 'MAC Protocols', status: 'missing', noteCount: 0, pyqCount: 2, pyqYears: [2024, 2025] },
        ]
      },
      {
        id: 'cn-u3',
        name: 'Unit 3: Network Layer',
        topics: [
          { id: 'cn-t7', name: 'IP Addressing & Subnetting', status: 'covered', noteCount: 5, pyqCount: 4, pyqYears: [2022, 2023, 2024, 2025] },
          { id: 'cn-t8', name: 'Routing Algorithms', status: 'partial', noteCount: 1, pyqCount: 3, pyqYears: [2023, 2024, 2025] },
          { id: 'cn-t9', name: 'Congestion Control', status: 'missing', noteCount: 0, pyqCount: 2, pyqYears: [2024, 2025] },
        ]
      }
    ]
  },
  {
    id: 'se',
    name: 'Software Engineering',
    code: 'CS504',
    semester: 5,
    scheme: '2022–2026 Scheme',
    coverage: 42,
    units: [
      {
        id: 'se-u1',
        name: 'Unit 1: Software Process Models',
        topics: [
          { id: 'se-t1', name: 'Waterfall & Agile Models', status: 'covered', noteCount: 4, pyqCount: 3, pyqYears: [2023, 2024, 2025] },
          { id: 'se-t2', name: 'Spiral & Iterative Models', status: 'partial', noteCount: 1, pyqCount: 2, pyqYears: [2024, 2025] },
        ]
      },
      {
        id: 'se-u2',
        name: 'Unit 2: Requirements Engineering',
        topics: [
          { id: 'se-t3', name: 'SRS & Use Case Diagrams', status: 'covered', noteCount: 3, pyqCount: 2, pyqYears: [2024, 2025] },
          { id: 'se-t4', name: 'Feasibility Study', status: 'missing', noteCount: 0, pyqCount: 1, pyqYears: [2025] },
        ]
      },
      {
        id: 'se-u3',
        name: 'Unit 3: Design Patterns',
        topics: [
          { id: 'se-t5', name: 'UML Diagrams', status: 'partial', noteCount: 2, pyqCount: 3, pyqYears: [2023, 2024, 2025] },
          { id: 'se-t6', name: 'Architectural Styles', status: 'missing', noteCount: 0, pyqCount: 2, pyqYears: [2024, 2025] },
        ]
      }
    ]
  },
  {
    id: 'toc',
    name: 'Theory of Computation',
    code: 'CS505',
    semester: 5,
    scheme: '2022–2026 Scheme',
    coverage: 88,
    units: [
      {
        id: 'toc-u1',
        name: 'Unit 1: Automata Theory',
        topics: [
          { id: 'toc-t1', name: 'DFA & NFA', status: 'covered', noteCount: 7, pyqCount: 4, pyqYears: [2022, 2023, 2024, 2025] },
          { id: 'toc-t2', name: 'Regular Expressions', status: 'covered', noteCount: 5, pyqCount: 3, pyqYears: [2023, 2024, 2025] },
          { id: 'toc-t3', name: 'Pumping Lemma', status: 'covered', noteCount: 4, pyqCount: 3, pyqYears: [2023, 2024, 2025] },
        ]
      },
      {
        id: 'toc-u2',
        name: 'Unit 2: Context-Free Languages',
        topics: [
          { id: 'toc-t4', name: 'CFG & PDA', status: 'covered', noteCount: 6, pyqCount: 3, pyqYears: [2023, 2024, 2025] },
          { id: 'toc-t5', name: 'Chomsky Normal Form', status: 'covered', noteCount: 3, pyqCount: 2, pyqYears: [2024, 2025] },
        ]
      },
      {
        id: 'toc-u3',
        name: 'Unit 3: Turing Machines',
        topics: [
          { id: 'toc-t6', name: 'Turing Machine Design', status: 'covered', noteCount: 5, pyqCount: 3, pyqYears: [2023, 2024, 2025] },
          { id: 'toc-t7', name: 'Decidability & Halting Problem', status: 'partial', noteCount: 2, pyqCount: 2, pyqYears: [2024, 2025] },
        ]
      }
    ]
  }
];

// --- Notes ---
export const notes: NoteResource[] = [
  {
    id: 'n1', title: 'Complete OS Unit 1–3 Handwritten Notes', author: 'Priya Sharma', authorInitials: 'PS',
    subjectId: 'os', unitId: 'os-u1', topicIds: ['os-t1', 'os-t2', 'os-t3', 'os-t4'],
    primaryTopic: 'Process Concept & States',
    topicNames: ['OS Structure & Components', 'System Calls & Interrupts', 'Process Concept & States', 'Threads & Multithreading'],
    description: 'Clean handwritten class notes covering OS architecture, system call handling, process lifecycle transitions, and multithreading models with diagrams.',
    department: 'Computer Science', semester: 5, subjectName: 'Operating Systems', subjectCode: 'CS501', unitName: 'Unit 1: Introduction to OS',
    format: 'Handwritten PDF', pages: 34, fileSizeFormatted: '4.8 MB', uploadDate: '2025-09-15', downloads: 128,
    upvotes: 42, commentCount: 3,
    topicMatchCount: 4, totalTopics: 4, syllabusMatch: 'Matches 4/4 topics in Unit 1'
  },
  {
    id: 'n2', title: 'Process Scheduling — Typed Summary Slides', author: 'Arjun Mehta', authorInitials: 'AM',
    subjectId: 'os', unitId: 'os-u2', topicIds: ['os-t5', 'os-t6'],
    primaryTopic: 'Scheduling Algorithms (FCFS, SJF, RR)',
    topicNames: ['Scheduling Algorithms (FCFS, SJF, RR)', 'Priority & Multilevel Queue'],
    description: 'Visual lecture summary comparing CPU burst algorithms, Gantt charts, average turnaround time calculations, and multi-level feedback queues.',
    department: 'Computer Science', semester: 5, subjectName: 'Operating Systems', subjectCode: 'CS501', unitName: 'Unit 2: Process Scheduling',
    format: 'Typed Slides', pages: 22, fileSizeFormatted: '2.4 MB', uploadDate: '2025-09-12', downloads: 89,
    upvotes: 28, commentCount: 1,
    topicMatchCount: 2, totalTopics: 3, syllabusMatch: 'Matches 2/3 topics in Unit 2'
  },
  {
    id: 'n3', title: 'Concurrency & Deadlocks — Comprehensive Notes', author: 'Kavya Nair', authorInitials: 'KN',
    subjectId: 'os', unitId: 'os-u3', topicIds: ['os-t8', 'os-t9', 'os-t10'],
    primaryTopic: 'Deadlock Detection & Prevention',
    topicNames: ['Deadlock Detection & Prevention', 'Critical Section Problem', 'Semaphores & Monitors'],
    description: 'Rigorous breakdown of Coffman deadlock conditions, Banker’s avoidance algorithm, wait-for graphs, and semaphore synchronization patterns.',
    department: 'Computer Science', semester: 5, subjectName: 'Operating Systems', subjectCode: 'CS501', unitName: 'Unit 3: Concurrency & Synchronization',
    format: 'Typed Notes', pages: 28, fileSizeFormatted: '3.6 MB', uploadDate: '2025-09-18', downloads: 156,
    upvotes: 64, commentCount: 2,
    topicMatchCount: 3, totalTopics: 3, syllabusMatch: 'Matches 3/3 topics in Unit 3'
  },
  {
    id: 'n4', title: 'Memory Management — Paging & Segmentation', author: 'Rohan Das', authorInitials: 'RD',
    subjectId: 'os', unitId: 'os-u4', topicIds: ['os-t11'],
    primaryTopic: 'Paging & Segmentation',
    topicNames: ['Paging & Segmentation', 'Virtual Memory & Demand Paging'],
    description: 'Handwritten architectural breakdown of MMU address translation, multi-level page tables, TLB hit ratios, and inverted page tables.',
    department: 'Computer Science', semester: 5, subjectName: 'Operating Systems', subjectCode: 'CS501', unitName: 'Unit 4: Memory Management',
    format: 'Handwritten PDF', pages: 18, fileSizeFormatted: '2.1 MB', uploadDate: '2025-09-10', downloads: 67,
    upvotes: 15, commentCount: 0,
    topicMatchCount: 1, totalTopics: 3, syllabusMatch: 'Matches 1/3 topics in Unit 4'
  },
  {
    id: 'n5', title: 'File Systems & Disk Scheduling Cheatsheet', author: 'Sneha Iyer', authorInitials: 'SI',
    subjectId: 'os', unitId: 'os-u5', topicIds: ['os-t14', 'os-t15', 'os-t16'],
    primaryTopic: 'Disk Scheduling Algorithms',
    topicNames: ['Disk Scheduling Algorithms', 'File System Implementation', 'I/O Management & DMA'],
    description: 'Quick exam cheatsheet summarizing FCFS, SSTF, SCAN, C-SCAN head movement formulas and Unix inode block structures.',
    department: 'Computer Science', semester: 5, subjectName: 'Operating Systems', subjectCode: 'CS501', unitName: 'Unit 5: File Systems & I/O',
    format: 'Cheatsheet', pages: 8, fileSizeFormatted: '920 KB', uploadDate: '2025-09-20', downloads: 201,
    upvotes: 53, commentCount: 1,
    topicMatchCount: 3, totalTopics: 3, syllabusMatch: 'Matches 3/3 topics in Unit 5'
  },
  {
    id: 'n6', title: 'DBMS ER Model & Normalization Notes', author: 'Aditya Kumar', authorInitials: 'AK',
    subjectId: 'dbms', unitId: 'dbms-u1', topicIds: ['dbms-t1', 'dbms-t2'],
    primaryTopic: 'ER Model & EER',
    topicNames: ['Database Architecture (3-Schema)', 'ER Model & EER', 'Relational Model Basics'],
    description: 'Complete study material covering strong/weak entity sets, cardinality ratios, generalization, specialization, and relational schema mapping.',
    department: 'Computer Science', semester: 5, subjectName: 'Database Management Systems', subjectCode: 'CS502', unitName: 'Unit 1: Introduction & ER Model',
    format: 'Typed Notes', pages: 42, fileSizeFormatted: '5.1 MB', uploadDate: '2025-09-14', downloads: 93,
    upvotes: 38, commentCount: 1,
    topicMatchCount: 2, totalTopics: 3, syllabusMatch: 'Matches 2/3 topics in Unit 1'
  },
  {
    id: 'n7', title: 'SQL Complete Reference — DDL to Joins', author: 'Meera Patel', authorInitials: 'MP',
    subjectId: 'dbms', unitId: 'dbms-u2', topicIds: ['dbms-t4', 'dbms-t5'],
    primaryTopic: 'SQL: DDL, DML, DCL',
    topicNames: ['SQL: DDL, DML, DCL', 'Joins & Subqueries'],
    description: 'All-in-one SQL reference guide covering inner/outer joins, correlated subqueries, aggregate grouping, and integrity constraints with exam query samples.',
    department: 'Computer Science', semester: 5, subjectName: 'Database Management Systems', subjectCode: 'CS502', unitName: 'Unit 2: SQL & Relational Algebra',
    format: 'Typed Slides', pages: 35, fileSizeFormatted: '3.9 MB', uploadDate: '2025-09-16', downloads: 174,
    upvotes: 47, commentCount: 2,
    topicMatchCount: 2, totalTopics: 3, syllabusMatch: 'Matches 2/3 topics in Unit 2'
  },
  {
    id: 'n8', title: 'Normalization Forms — 1NF to BCNF Walkthrough', author: 'Vikram Singh', authorInitials: 'VS',
    subjectId: 'dbms', unitId: 'dbms-u3', topicIds: ['dbms-t7', 'dbms-t8'],
    primaryTopic: 'Normalization',
    topicNames: ['Normal Forms (1NF–BCNF)', 'Functional Dependencies', 'Lossless Decomposition', 'Normalization'],
    description: 'Step-by-step canonical closure algorithm, Armstrong axioms, 1NF, 2NF, 3NF, BCNF decomposition checks, and dependency preservation test proofs.',
    department: 'Computer Science', semester: 5, subjectName: 'Database Management Systems', subjectCode: 'CS502', unitName: 'Unit 3: Normalization',
    format: 'Handwritten PDF', pages: 26, fileSizeFormatted: '3.2 MB', uploadDate: '2025-09-11', downloads: 112,
    topicMatchCount: 2, totalTopics: 3, syllabusMatch: 'Matches 2/3 topics in Unit 3'
  },
  {
    id: 'n9', title: 'OSI Model & TCP/IP — Illustrated Guide', author: 'Ananya Roy', authorInitials: 'AR',
    subjectId: 'cn', unitId: 'cn-u1', topicIds: ['cn-t1', 'cn-t2', 'cn-t3'],
    primaryTopic: 'OSI & TCP/IP Models',
    topicNames: ['OSI & TCP/IP Models', 'Transmission Media', 'Network Topologies'],
    description: 'Detailed protocol layer comparisons, PDU encapsulation/decapsulation diagrams, and transport vs network layer responsibilities.',
    department: 'Computer Science', semester: 5, subjectName: 'Computer Networks', subjectCode: 'CS503', unitName: 'Unit 1: Network Fundamentals',
    format: 'Typed Notes', pages: 30, fileSizeFormatted: '4.0 MB', uploadDate: '2025-09-13', downloads: 145,
    topicMatchCount: 3, totalTopics: 3, syllabusMatch: 'Matches 3/3 topics in Unit 1'
  },
  {
    id: 'n10', title: 'IP Addressing & Subnetting — Solved Problems', author: 'Raj Malhotra', authorInitials: 'RM',
    subjectId: 'cn', unitId: 'cn-u3', topicIds: ['cn-t7'],
    primaryTopic: 'IP Addressing & Subnetting',
    topicNames: ['IP Addressing & Subnetting', 'Routing Algorithms'],
    description: 'Worked numerical exercises for Classless Inter-Domain Routing (CIDR), variable-length subnet masking (VLSM), and routing table lookups.',
    department: 'Computer Science', semester: 5, subjectName: 'Computer Networks', subjectCode: 'CS503', unitName: 'Unit 3: Network Layer',
    format: 'Handwritten PDF', pages: 20, fileSizeFormatted: '2.7 MB', uploadDate: '2025-09-17', downloads: 198,
    topicMatchCount: 1, totalTopics: 3, syllabusMatch: 'Matches 1/3 topics in Unit 3'
  },
  {
    id: 'n11', title: 'DFA, NFA & Regular Expressions — Full Unit Notes', author: 'Priya Sharma', authorInitials: 'PS',
    subjectId: 'toc', unitId: 'toc-u1', topicIds: ['toc-t1', 'toc-t2', 'toc-t3'],
    primaryTopic: 'DFA & NFA',
    topicNames: ['DFA & NFA', 'Regular Expressions', 'Pumping Lemma'],
    description: 'Automata construction proofs, subset construction algorithm (NFA to DFA conversion), minimization of DFA, and Pumping Lemma proofs.',
    department: 'Computer Science', semester: 5, subjectName: 'Theory of Computation', subjectCode: 'CS505', unitName: 'Unit 1: Automata Theory',
    format: 'Typed Notes', pages: 45, fileSizeFormatted: '6.2 MB', uploadDate: '2025-09-09', downloads: 234,
    topicMatchCount: 3, totalTopics: 3, syllabusMatch: 'Matches 3/3 topics in Unit 1'
  },
  {
    id: 'n12', title: 'Agile & Waterfall Process Models — Quick Review', author: 'Kavya Nair', authorInitials: 'KN',
    subjectId: 'se', unitId: 'se-u1', topicIds: ['se-t1'],
    primaryTopic: 'Waterfall & Agile Models',
    topicNames: ['Waterfall & Agile Models', 'Spiral & Iterative Models'],
    description: 'Comparison tables of SDLC life cycles, Scrum sprint ceremonies, user story estimations, and Spiral risk assessment phases.',
    department: 'Computer Science', semester: 5, subjectName: 'Software Engineering', subjectCode: 'CS504', unitName: 'Unit 1: Software Process Models',
    format: 'Cheatsheet', pages: 6, fileSizeFormatted: '850 KB', uploadDate: '2025-09-19', downloads: 78,
    topicMatchCount: 1, totalTopics: 2, syllabusMatch: 'Matches 1/2 topics in Unit 1'
  },
  {
    id: 'n13', title: 'Deadlock Handling: Banker’s Algorithm & RAG Numerical Solved', author: 'Priya Sharma', authorInitials: 'PS',
    subjectId: 'os', unitId: 'os-u3', topicIds: ['os-t10'],
    primaryTopic: 'Deadlock Detection & Prevention',
    topicNames: ['Deadlock Detection & Prevention', 'Critical Section Problem', 'Resource Allocation', 'Deadlock'],
    description: 'University exam-focused notes with 10 worked numericals on Banker’s safety algorithm, deadlock prevention strategies, and knot detection in wait-for graphs.',
    department: 'Computer Science', semester: 5, subjectName: 'Operating Systems', subjectCode: 'CS501', unitName: 'Unit 3: Concurrency & Synchronization',
    format: 'Handwritten PDF', pages: 18, fileSizeFormatted: '2.5 MB', uploadDate: '2025-09-22', downloads: 245,
    topicMatchCount: 1, totalTopics: 3, syllabusMatch: 'Matches 1/3 topics in Unit 3 (Exam Priority)'
  },
  {
    id: 'n14', title: 'Relational Schema Normalization & Lossless Join Cheatsheet', author: 'Sneha Iyer', authorInitials: 'SI',
    subjectId: 'dbms', unitId: 'dbms-u3', topicIds: ['dbms-t7', 'dbms-t8', 'dbms-t9'],
    primaryTopic: 'Normalization',
    topicNames: ['Normal Forms (1NF–BCNF)', 'Lossless Decomposition', 'Functional Dependencies', 'Normalization'],
    description: 'Exam-ready cheat tables for detecting functional dependencies, finding minimal keys, checking losslessness with Chase method, and decomposing to BCNF.',
    department: 'Computer Science', semester: 5, subjectName: 'Database Management Systems', subjectCode: 'CS502', unitName: 'Unit 3: Normalization',
    format: 'Cheatsheet', pages: 5, fileSizeFormatted: '780 KB', uploadDate: '2025-09-23', downloads: 310,
    topicMatchCount: 3, totalTopics: 3, syllabusMatch: 'Matches 3/3 topics in Unit 3'
  },
  {
    id: 'n15', title: 'TCP Congestion Control — Tahoe, Reno & AIMD Mechanisms', author: 'Ananya Roy', authorInitials: 'AR',
    subjectId: 'cn', unitId: 'cn-u3', topicIds: ['cn-t9'],
    primaryTopic: 'TCP Congestion Control',
    topicNames: ['TCP Congestion Control', 'Congestion Control', 'Sliding Window Protocols'],
    description: 'In-depth conceptual guide to Slow Start threshold, Additive Increase Multiplicative Decrease (AIMD), Fast Retransmit, and Fast Recovery cwnd curves.',
    department: 'Computer Science', semester: 5, subjectName: 'Computer Networks', subjectCode: 'CS503', unitName: 'Unit 3: Network Layer',
    format: 'Typed Notes', pages: 22, fileSizeFormatted: '3.1 MB', uploadDate: '2025-09-24', downloads: 189,
    topicMatchCount: 1, totalTopics: 3, syllabusMatch: 'Matches 1/3 topics in Unit 3'
  },
  {
    id: 'n16', title: 'TCP Congestion & Flow Control Lecture Slides', author: 'Raj Malhotra', authorInitials: 'RM',
    subjectId: 'cn', unitId: 'cn-u3', topicIds: ['cn-t9'],
    primaryTopic: 'TCP Congestion Control',
    topicNames: ['TCP Congestion Control', 'Sliding Window Protocols', 'Traffic Shaping'],
    description: 'Department lecture slides covering congestion window management, token bucket vs leaky bucket traffic shaping, and TCP Cubic vs Reno comparisons.',
    department: 'Computer Science', semester: 5, subjectName: 'Computer Networks', subjectCode: 'CS503', unitName: 'Unit 3: Network Layer',
    format: 'Typed Slides', pages: 36, fileSizeFormatted: '4.7 MB', uploadDate: '2025-09-22', downloads: 142,
    topicMatchCount: 1, totalTopics: 3, syllabusMatch: 'Matches 1/3 topics in Unit 3'
  },
  {
    id: 'n17', title: 'Transactions, ACID & Concurrency Control Protocols', author: 'Aditya Kumar', authorInitials: 'AK',
    subjectId: 'dbms', unitId: 'dbms-u4', topicIds: ['dbms-t10', 'dbms-t11', 'dbms-t12'],
    primaryTopic: 'ACID Properties',
    topicNames: ['ACID Properties', 'Concurrency Control Protocols', 'Recovery Techniques'],
    description: 'Comprehensive notes covering serializability, 2-Phase Locking (Strict vs Rigorous), timestamp ordering protocol, and WAL (Write-Ahead Logging) recovery.',
    department: 'Computer Science', semester: 5, subjectName: 'Database Management Systems', subjectCode: 'CS502', unitName: 'Unit 4: Transactions & Concurrency',
    format: 'Typed Notes', pages: 32, fileSizeFormatted: '3.5 MB', uploadDate: '2025-09-21', downloads: 167,
    topicMatchCount: 3, totalTopics: 3, syllabusMatch: 'Matches 3/3 topics in Unit 4'
  },
  {
    id: 'n18', title: 'Computer Networks Lab Manual & Wireshark Packet Analysis', author: 'Vikram Singh', authorInitials: 'VS',
    subjectId: 'cn', unitId: 'cn-u1', topicIds: ['cn-t1', 'cn-t7'],
    primaryTopic: 'Network Fundamentals',
    topicNames: ['OSI & TCP/IP Models', 'IP Addressing & Subnetting', 'Wireshark Analysis'],
    description: 'Step-by-step practical lab experiments covering socket programming, Wireshark packet capture analysis for TCP 3-way handshake, and Cisco Packet Tracer routing configs.',
    department: 'Computer Science', semester: 5, subjectName: 'Computer Networks', subjectCode: 'CS503', unitName: 'Unit 1: Network Fundamentals',
    format: 'Lab Manual', pages: 48, fileSizeFormatted: '7.8 MB', uploadDate: '2025-09-18', downloads: 275,
    topicMatchCount: 2, totalTopics: 3, syllabusMatch: 'Practical Lab Syllabus'
  }
];

// --- PYQ Entries ---
export const pyqEntries: PYQEntry[] = [
  {
    id: 'pyq-os-2025', subjectId: 'os', year: 2025, month: 'May', questionCount: 18,
    topicMapping: [
      { topicId: 'os-t3', topicName: 'Process Concept & States', count: 3 },
      { topicId: 'os-t5', topicName: 'Scheduling Algorithms', count: 3 },
      { topicId: 'os-t9', topicName: 'Semaphores & Monitors', count: 2 },
      { topicId: 'os-t10', topicName: 'Deadlock Detection & Prevention', count: 2 },
      { topicId: 'os-t11', topicName: 'Paging & Segmentation', count: 2 },
      { topicId: 'os-t12', topicName: 'Virtual Memory', count: 2 },
    ]
  },
  {
    id: 'pyq-os-2024', subjectId: 'os', year: 2024, month: 'May', questionCount: 16,
    topicMapping: [
      { topicId: 'os-t5', topicName: 'Scheduling Algorithms', count: 3 },
      { topicId: 'os-t10', topicName: 'Deadlock Detection & Prevention', count: 3 },
      { topicId: 'os-t3', topicName: 'Process Concept & States', count: 2 },
      { topicId: 'os-t9', topicName: 'Semaphores & Monitors', count: 2 },
    ]
  },
  {
    id: 'pyq-os-2023', subjectId: 'os', year: 2023, month: 'May', questionCount: 15,
    topicMapping: [
      { topicId: 'os-t5', topicName: 'Scheduling Algorithms', count: 2 },
      { topicId: 'os-t8', topicName: 'Critical Section Problem', count: 2 },
      { topicId: 'os-t10', topicName: 'Deadlock Detection & Prevention', count: 2 },
    ]
  },
  {
    id: 'pyq-dbms-2025', subjectId: 'dbms', year: 2025, month: 'May', questionCount: 16,
    topicMapping: [
      { topicId: 'dbms-t4', topicName: 'SQL: DDL, DML, DCL', count: 3 },
      { topicId: 'dbms-t8', topicName: 'Normal Forms (1NF–BCNF)', count: 3 },
      { topicId: 'dbms-t10', topicName: 'ACID Properties', count: 2 },
    ]
  },
  {
    id: 'pyq-dbms-2024', subjectId: 'dbms', year: 2024, month: 'May', questionCount: 15,
    topicMapping: [
      { topicId: 'dbms-t4', topicName: 'SQL: DDL, DML, DCL', count: 3 },
      { topicId: 'dbms-t8', topicName: 'Normal Forms (1NF–BCNF)', count: 2 },
      { topicId: 'dbms-t2', topicName: 'ER Model & EER', count: 2 },
    ]
  },
  {
    id: 'pyq-cn-2025', subjectId: 'cn', year: 2025, month: 'May', questionCount: 14,
    topicMapping: [
      { topicId: 'cn-t1', topicName: 'OSI & TCP/IP Models', count: 3 },
      { topicId: 'cn-t7', topicName: 'IP Addressing & Subnetting', count: 3 },
      { topicId: 'cn-t4', topicName: 'Error Detection & Correction', count: 2 },
    ]
  }
];

// --- Moderation Queue ---
export const moderationItems: ModerationItem[] = [
  { id: 'm1', resourceName: 'OS Unit 3 Notes — Unknown Author', reporter: 'Arjun Mehta', reason: 'Duplicate', timestamp: '2025-09-21 14:23', status: 'pending' },
  { id: 'm2', resourceName: 'Random Chemistry Notes.pdf', reporter: 'Sneha Iyer', reason: 'Out of Syllabus', timestamp: '2025-09-21 12:05', status: 'pending' },
  { id: 'm3', resourceName: 'DBMS Textbook Scan — Full Chapter', reporter: 'Kavya Nair', reason: 'Copyright', timestamp: '2025-09-20 18:30', status: 'pending' },
  { id: 'm4', resourceName: 'Blurry Handwritten OS Notes', reporter: 'Rohan Das', reason: 'Corrupt Scan', timestamp: '2025-09-20 09:15', status: 'pending' },
  { id: 'm5', resourceName: 'CN Unit 4 Notes (Actually Unit 2)', reporter: 'Meera Patel', reason: 'Incorrect Syllabus', timestamp: '2025-09-19 22:47', status: 'pending' },
  { id: 'm6', resourceName: 'Old Scheme PYQ Solutions', reporter: 'Vikram Singh', reason: 'Out of Syllabus', timestamp: '2025-09-19 16:00', status: 'dismissed' },
];

// --- Frequent Exam Topics (aggregated) ---
export const frequentExamTopics = [
  { topicName: 'Scheduling Algorithms (FCFS, SJF, RR)', subjectName: 'Operating Systems', appearances: 5, streak: 'Appeared 5 yrs running' },
  { topicName: 'Deadlock Detection & Prevention', subjectName: 'Operating Systems', appearances: 4, streak: 'Appeared 4 yrs running' },
  { topicName: 'Process Concept & States', subjectName: 'Operating Systems', appearances: 4, streak: 'Appeared 4 yrs running' },
  { topicName: 'SQL: DDL, DML, DCL', subjectName: 'Database Management Systems', appearances: 4, streak: 'Appeared 4 yrs running' },
  { topicName: 'Normal Forms (1NF–BCNF)', subjectName: 'Database Management Systems', appearances: 4, streak: 'Appeared 4 yrs running' },
  { topicName: 'OSI & TCP/IP Models', subjectName: 'Computer Networks', appearances: 4, streak: 'Appeared 4 yrs running' },
  { topicName: 'IP Addressing & Subnetting', subjectName: 'Computer Networks', appearances: 4, streak: 'Appeared 4 yrs running' },
  { topicName: 'Semaphores & Monitors', subjectName: 'Operating Systems', appearances: 4, streak: 'Appeared 4 yrs running' },
];

// --- Recent Peer Uploads ---
export const recentUploads = [
  { title: 'Virtual Memory & Demand Paging Notes', author: 'Raj Malhotra', subject: 'Operating Systems', unit: 'Unit 4', timeAgo: '2 hours ago' },
  { title: 'Concurrency Control — 2PL & Timestamp', author: 'Ananya Roy', subject: 'DBMS', unit: 'Unit 4', timeAgo: '5 hours ago' },
  { title: 'MAC Protocols Summary', author: 'Aditya Kumar', subject: 'Computer Networks', unit: 'Unit 2', timeAgo: '1 day ago' },
  { title: 'Architectural Styles & Design Patterns', author: 'Meera Patel', subject: 'Software Engineering', unit: 'Unit 3', timeAgo: '2 days ago' },
];

// --- User Info ---
export const currentUser = {
  name: 'Nishant Verma',
  initials: 'NV',
  role: 'Moderator',
  college: 'Apex Institute of Technology',
  department: 'Computer Science',
  stream: 'Computer Science & Engineering',
  degree: 'B.Tech / B.E.',
  semester: 5,
  enrolledSubjects: ['os', 'dbms', 'cn', 'toc', 'se'],
};
