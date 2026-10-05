import { db, initDatabase, uploadsDir } from './database.js';
import fs from 'node:fs';
import path from 'node:path';
import { hashPassword } from './auth.js';

export function seedDatabase() {
  initDatabase();

  const countRow = db.prepare('SELECT COUNT(*) as count FROM subjects').get();
  if (countRow && countRow.count > 0) {
    seedDemoUsers();
    return;
  }

  console.log('Seeding initial academic records...');

  // Create sample PDF in uploadsDir if not exists
  const samplePdfPath = path.join(uploadsDir, 'sample_lecture_notes.pdf');
  if (!fs.existsSync(samplePdfPath)) {
    const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 130 >>
stream
BT
/F1 20 Tf
50 720 Td
(Academic Notes Archive) Tj
/F1 12 Tf
0 -30 Td
(Verified syllabus coverage resource - Notes Sharing Platform) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000418 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
504
%%EOF`;
    fs.writeFileSync(samplePdfPath, pdfContent);
  }

  // 1. Seed Subjects, Units, Topics
  const subjectsData = [
    {
      id: 'os', name: 'Operating Systems', code: 'CS501', semester: 5, scheme: '2022–2026 Scheme', coverage: 78,
      units: [
        {
          id: 'os-u1', name: 'Unit 1: Introduction to OS',
          topics: [
            { id: 'os-t1', name: 'OS Structure & Components', status: 'covered', noteCount: 5, pyqCount: 3, pyqYears: [2023, 2024, 2025], pyqQuestions: ['Explain the layered architecture of an OS.', 'Compare monolithic vs microkernel.', 'List the functions of an operating system.'] },
            { id: 'os-t2', name: 'System Calls & Interrupts', status: 'covered', noteCount: 3, pyqCount: 2, pyqYears: [2024, 2025], pyqQuestions: ['Differentiate between system calls and interrupts.', 'Explain the system call mechanism with a diagram.'] },
            { id: 'os-t3', name: 'Process Concept & States', status: 'partial', noteCount: 2, pyqCount: 4, pyqYears: [2022, 2023, 2024, 2025], pyqQuestions: ['Draw and explain the process state diagram.', 'What is a PCB? List its contents.', 'Explain context switching.', 'Differentiate between process and program.'] },
            { id: 'os-t4', name: 'Threads & Multithreading', status: 'covered', noteCount: 4, pyqCount: 2, pyqYears: [2023, 2025], pyqQuestions: ['Compare user-level vs kernel-level threads.', 'Explain multithreading models.'] },
          ]
        },
        {
          id: 'os-u2', name: 'Unit 2: Process Scheduling',
          topics: [
            { id: 'os-t5', name: 'Scheduling Algorithms (FCFS, SJF, RR)', status: 'covered', noteCount: 6, pyqCount: 5, pyqYears: [2021, 2022, 2023, 2024, 2025], pyqQuestions: ['Solve FCFS scheduling for the given arrival times.', 'Compare SJF and Round Robin.', 'Calculate average waiting time for RR with quantum 3.'] },
            { id: 'os-t6', name: 'Priority & Multilevel Queue', status: 'partial', noteCount: 1, pyqCount: 2, pyqYears: [2023, 2024], pyqQuestions: ['Explain multilevel feedback queue scheduling.', 'Discuss priority scheduling with aging.'] },
            { id: 'os-t7', name: 'Real-Time Scheduling', status: 'missing', noteCount: 0, pyqCount: 1, pyqYears: [2025], pyqQuestions: ['Differentiate between hard and soft real-time systems.'] },
          ]
        },
        {
          id: 'os-u3', name: 'Unit 3: Concurrency & Synchronization',
          topics: [
            { id: 'os-t8', name: 'Critical Section Problem', status: 'covered', noteCount: 4, pyqCount: 3, pyqYears: [2023, 2024, 2025], pyqQuestions: ['State and explain the conditions for the critical section problem.', 'Explain Peterson\'s solution.'] },
            { id: 'os-t9', name: 'Semaphores & Monitors', status: 'covered', noteCount: 3, pyqCount: 4, pyqYears: [2022, 2023, 2024, 2025], pyqQuestions: ['Explain binary and counting semaphores.', 'Solve the Producer-Consumer problem using semaphores.', 'What are monitors? Compare with semaphores.'] },
            { id: 'os-t10', name: 'Deadlock Detection & Prevention', status: 'partial', noteCount: 2, pyqCount: 4, pyqYears: [2022, 2023, 2024, 2025], pyqQuestions: ['Explain the Banker\'s Algorithm with an example.', 'List necessary conditions for deadlock.', 'Differentiate deadlock prevention and avoidance.', 'Draw a resource allocation graph and detect deadlock.'] },
          ]
        },
        {
          id: 'os-u4', name: 'Unit 4: Memory Management',
          topics: [
            { id: 'os-t11', name: 'Paging & Segmentation', status: 'covered', noteCount: 5, pyqCount: 3, pyqYears: [2023, 2024, 2025], pyqQuestions: ['Explain paging with a diagram.', 'Compare paging and segmentation.', 'Solve: Given page size 4KB and logical address space 64KB, find page table entries.'] },
            { id: 'os-t12', name: 'Virtual Memory & Demand Paging', status: 'missing', noteCount: 0, pyqCount: 3, pyqYears: [2023, 2024, 2025], pyqQuestions: ['Explain demand paging with page fault handling.', 'What is thrashing? How to prevent it?', 'Compare FIFO and LRU page replacement.'] },
            { id: 'os-t13', name: 'Page Replacement Algorithms', status: 'missing', noteCount: 0, pyqCount: 2, pyqYears: [2024, 2025], pyqQuestions: ['Solve LRU page replacement for the given reference string.', 'Explain Belady\'s Anomaly.'] },
          ]
        },
        {
          id: 'os-u5', name: 'Unit 5: File Systems & I/O',
          topics: [
            { id: 'os-t14', name: 'File System Implementation', status: 'covered', noteCount: 3, pyqCount: 2, pyqYears: [2024, 2025], pyqQuestions: ['Explain inode-based file system.', 'Compare contiguous, linked, and indexed allocation.'] },
            { id: 'os-t15', name: 'Disk Scheduling Algorithms', status: 'partial', noteCount: 1, pyqCount: 3, pyqYears: [2023, 2024, 2025], pyqQuestions: ['Solve SSTF disk scheduling for the given queue.', 'Compare SCAN and C-SCAN.', 'What is LOOK scheduling?'] },
            { id: 'os-t16', name: 'I/O Management & DMA', status: 'covered', noteCount: 2, pyqCount: 1, pyqYears: [2024], pyqQuestions: ['Explain DMA and its advantages.'] },
          ]
        }
      ]
    },
    {
      id: 'dbms', name: 'Database Management Systems', code: 'CS502', semester: 5, scheme: '2022–2026 Scheme', coverage: 54,
      units: [
        {
          id: 'dbms-u1', name: 'Unit 1: Introduction & ER Model',
          topics: [
            { id: 'dbms-t1', name: 'Database Architecture (3-Schema)', status: 'covered', noteCount: 3, pyqCount: 2, pyqYears: [2024, 2025], pyqQuestions: ['Explain the three-schema architecture.', 'Compare logical and physical data independence.'] },
            { id: 'dbms-t2', name: 'ER Model & EER', status: 'covered', noteCount: 4, pyqCount: 3, pyqYears: [2023, 2024, 2025], pyqQuestions: ['Draw an ER diagram for a Hospital Management system.', 'Explain Generalization and Specialization in EER.'] },
            { id: 'dbms-t3', name: 'Relational Model Basics', status: 'partial', noteCount: 2, pyqCount: 2, pyqYears: [2024, 2025], pyqQuestions: ['Define keys in relational model.', 'Explain referential integrity constraints.'] },
          ]
        },
        {
          id: 'dbms-u2', name: 'Unit 2: SQL & Relational Algebra',
          topics: [
            { id: 'dbms-t4', name: 'SQL: DDL, DML, DCL', status: 'covered', noteCount: 5, pyqCount: 4, pyqYears: [2022, 2023, 2024, 2025], pyqQuestions: ['Write SQL queries using GROUP BY and HAVING.', 'Explain nested subqueries with correlated execution.'] },
            { id: 'dbms-t5', name: 'Joins & Subqueries', status: 'covered', noteCount: 3, pyqCount: 3, pyqYears: [2023, 2024, 2025], pyqQuestions: ['Differentiate INNER, LEFT, RIGHT, and FULL OUTER joins.', 'Demonstrate self join on employee table.'] },
            { id: 'dbms-t6', name: 'Relational Algebra Operations', status: 'missing', noteCount: 0, pyqCount: 2, pyqYears: [2024, 2025], pyqQuestions: ['Explain fundamental relational algebra operations with examples.'] },
          ]
        },
        {
          id: 'dbms-u3', name: 'Unit 3: Normalization',
          topics: [
            { id: 'dbms-t7', name: 'Functional Dependencies', status: 'partial', noteCount: 1, pyqCount: 3, pyqYears: [2023, 2024, 2025], pyqQuestions: ['Find candidate keys using Armstrong\'s axioms.'] },
            { id: 'dbms-t8', name: 'Normal Forms (1NF–BCNF)', status: 'covered', noteCount: 4, pyqCount: 4, pyqYears: [2022, 2023, 2024, 2025], pyqQuestions: ['Normalize the given relation up to BCNF.', 'Compare 3NF and BCNF.'] },
            { id: 'dbms-t9', name: 'Lossless Decomposition', status: 'missing', noteCount: 0, pyqCount: 2, pyqYears: [2024, 2025], pyqQuestions: ['Test whether the given decomposition is lossless join and dependency preserving.'] },
          ]
        },
        {
          id: 'dbms-u4', name: 'Unit 4: Transactions & Concurrency',
          topics: [
            { id: 'dbms-t10', name: 'ACID Properties', status: 'missing', noteCount: 0, pyqCount: 3, pyqYears: [2023, 2024, 2025], pyqQuestions: ['Explain ACID properties and transaction states.'] },
            { id: 'dbms-t11', name: 'Concurrency Control Protocols', status: 'missing', noteCount: 0, pyqCount: 2, pyqYears: [2024, 2025], pyqQuestions: ['Explain Two-Phase Locking (2PL) protocol.'] },
            { id: 'dbms-t12', name: 'Recovery Techniques', status: 'missing', noteCount: 0, pyqCount: 1, pyqYears: [2025], pyqQuestions: ['Explain log-based recovery with check-pointing.'] },
          ]
        }
      ]
    },
    {
      id: 'cn', name: 'Computer Networks', code: 'CS503', semester: 5, scheme: '2022–2026 Scheme', coverage: 65,
      units: [
        {
          id: 'cn-u1', name: 'Unit 1: Network Fundamentals',
          topics: [
            { id: 'cn-t1', name: 'OSI & TCP/IP Models', status: 'covered', noteCount: 6, pyqCount: 4, pyqYears: [2022, 2023, 2024, 2025], pyqQuestions: ['Compare OSI and TCP/IP reference models in detail.'] },
            { id: 'cn-t2', name: 'Transmission Media', status: 'covered', noteCount: 3, pyqCount: 1, pyqYears: [2024], pyqQuestions: ['Differentiate guided vs unguided transmission media.'] },
            { id: 'cn-t3', name: 'Network Topologies', status: 'covered', noteCount: 4, pyqCount: 2, pyqYears: [2023, 2025], pyqQuestions: ['Analyze Mesh, Star, and Ring topologies.'] },
          ]
        },
        {
          id: 'cn-u2', name: 'Unit 2: Data Link Layer',
          topics: [
            { id: 'cn-t4', name: 'Error Detection & Correction', status: 'covered', noteCount: 3, pyqCount: 3, pyqYears: [2023, 2024, 2025], pyqQuestions: ['Compute CRC checksum for the given polynomial.'] },
            { id: 'cn-t5', name: 'Sliding Window Protocols', status: 'partial', noteCount: 2, pyqCount: 2, pyqYears: [2024, 2025], pyqQuestions: ['Compare Go-Back-N and Selective Repeat ARQ.'] },
            { id: 'cn-t6', name: 'MAC Protocols', status: 'missing', noteCount: 0, pyqCount: 2, pyqYears: [2024, 2025], pyqQuestions: ['Explain CSMA/CD and CSMA/CA mechanisms.'] },
          ]
        },
        {
          id: 'cn-u3', name: 'Unit 3: Network Layer',
          topics: [
            { id: 'cn-t7', name: 'IP Addressing & Subnetting', status: 'covered', noteCount: 5, pyqCount: 4, pyqYears: [2022, 2023, 2024, 2025], pyqQuestions: ['Solve subnetting: Given 192.168.1.0/24 create 4 subnets.'] },
            { id: 'cn-t8', name: 'Routing Algorithms', status: 'partial', noteCount: 1, pyqCount: 3, pyqYears: [2023, 2024, 2025], pyqQuestions: ['Solve Dijkstra\'s shortest path algorithm.'] },
            { id: 'cn-t9', name: 'Congestion Control', status: 'missing', noteCount: 0, pyqCount: 2, pyqYears: [2024, 2025], pyqQuestions: ['Explain Leaky Bucket and Token Bucket algorithms.'] },
          ]
        }
      ]
    },
    {
      id: 'se', name: 'Software Engineering', code: 'CS504', semester: 5, scheme: '2022–2026 Scheme', coverage: 42,
      units: [
        {
          id: 'se-u1', name: 'Unit 1: Software Process Models',
          topics: [
            { id: 'se-t1', name: 'Waterfall & Agile Models', status: 'covered', noteCount: 4, pyqCount: 3, pyqYears: [2023, 2024, 2025], pyqQuestions: ['Compare Scrum framework with traditional Waterfall.'] },
            { id: 'se-t2', name: 'Spiral & Iterative Models', status: 'partial', noteCount: 1, pyqCount: 2, pyqYears: [2024, 2025], pyqQuestions: ['Explain Boehm\'s Spiral model with risk analysis.'] },
          ]
        },
        {
          id: 'se-u2', name: 'Unit 2: Requirements Engineering',
          topics: [
            { id: 'se-t3', name: 'SRS & Use Case Diagrams', status: 'covered', noteCount: 3, pyqCount: 2, pyqYears: [2024, 2025], pyqQuestions: ['Write an IEEE format SRS for an E-commerce system.'] },
            { id: 'se-t4', name: 'Feasibility Study', status: 'missing', noteCount: 0, pyqCount: 1, pyqYears: [2025], pyqQuestions: ['Explain technical, operational, and economic feasibility.'] },
          ]
        },
        {
          id: 'se-u3', name: 'Unit 3: Design Patterns',
          topics: [
            { id: 'se-t5', name: 'UML Diagrams', status: 'partial', noteCount: 2, pyqCount: 3, pyqYears: [2023, 2024, 2025], pyqQuestions: ['Draw Class and Sequence diagrams for an ATM system.'] },
            { id: 'se-t6', name: 'Architectural Styles', status: 'missing', noteCount: 0, pyqCount: 2, pyqYears: [2024, 2025], pyqQuestions: ['Differentiate Microservices vs Monolithic architecture.'] },
          ]
        }
      ]
    },
    {
      id: 'toc', name: 'Theory of Computation', code: 'CS505', semester: 5, scheme: '2022–2026 Scheme', coverage: 88,
      units: [
        {
          id: 'toc-u1', name: 'Unit 1: Automata Theory',
          topics: [
            { id: 'toc-t1', name: 'DFA & NFA', status: 'covered', noteCount: 7, pyqCount: 4, pyqYears: [2022, 2023, 2024, 2025], pyqQuestions: ['Convert the given NFA to equivalent DFA.', 'Minimize the given DFA.'] },
            { id: 'toc-t2', name: 'Regular Expressions', status: 'covered', noteCount: 5, pyqCount: 3, pyqYears: [2023, 2024, 2025], pyqQuestions: ['State and prove Arden\'s theorem with application.'] },
            { id: 'toc-t3', name: 'Pumping Lemma', status: 'covered', noteCount: 4, pyqCount: 3, pyqYears: [2023, 2024, 2025], pyqQuestions: ['Prove that L = {0^n 1^n | n >= 0} is not regular using Pumping Lemma.'] },
          ]
        },
        {
          id: 'toc-u2', name: 'Unit 2: Context-Free Languages',
          topics: [
            { id: 'toc-t4', name: 'CFG & PDA', status: 'covered', noteCount: 6, pyqCount: 3, pyqYears: [2023, 2024, 2025], pyqQuestions: ['Design PDA for palindrome recognition.'] },
            { id: 'toc-t5', name: 'Chomsky Normal Form', status: 'covered', noteCount: 3, pyqCount: 2, pyqYears: [2024, 2025], pyqQuestions: ['Convert the given grammar to CNF.'] },
          ]
        },
        {
          id: 'toc-u3', name: 'Unit 3: Turing Machines',
          topics: [
            { id: 'toc-t6', name: 'Turing Machine Design', status: 'covered', noteCount: 5, pyqCount: 3, pyqYears: [2023, 2024, 2025], pyqQuestions: ['Design a Turing Machine for unary addition.'] },
            { id: 'toc-t7', name: 'Decidability & Halting Problem', status: 'partial', noteCount: 2, pyqCount: 2, pyqYears: [2024, 2025], pyqQuestions: ['State and prove the Undecidability of the Halting Problem.'] },
          ]
        }
      ]
    }
  ];

  const insertSubject = db.prepare('INSERT INTO subjects (id, name, code, semester, scheme, coverage) VALUES (?, ?, ?, ?, ?, ?)');
  const insertUnit = db.prepare('INSERT INTO units (id, subject_id, name, order_index) VALUES (?, ?, ?, ?)');
  const insertTopic = db.prepare('INSERT INTO topics (id, unit_id, name, status, note_count, pyq_count, pyq_years, pyq_questions) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');

  for (const sub of subjectsData) {
    insertSubject.run(sub.id, sub.name, sub.code, sub.semester, sub.scheme, sub.coverage);
    for (let uIdx = 0; uIdx < sub.units.length; uIdx++) {
      const u = sub.units[uIdx];
      insertUnit.run(u.id, sub.id, u.name, uIdx);
      for (const t of u.topics) {
        insertTopic.run(
          t.id, u.id, t.name, t.status, t.noteCount, t.pyqCount,
          JSON.stringify(t.pyqYears || []),
          JSON.stringify(t.pyqQuestions || [])
        );
      }
    }
  }

  // 2. Seed Notes
  const notesData = [
    {
      id: 'n1', title: 'Complete OS Unit 1–3 Handwritten Notes', author: 'Priya Sharma', authorInitials: 'PS',
      subjectId: 'os', unitId: 'os-u1', topicIds: ['os-t1', 'os-t2', 'os-t3', 'os-t4'],
      format: 'Handwritten PDF', pages: 34, uploadDate: '2025-09-15', downloads: 128,
      topicMatchCount: 4, totalTopics: 4, syllabusMatch: 'Matches 4/4 topics in Unit 1',
      filePath: 'sample_lecture_notes.pdf', fileSize: 2450000, mimeType: 'application/pdf'
    },
    {
      id: 'n2', title: 'Process Scheduling — Typed Summary Slides', author: 'Arjun Mehta', authorInitials: 'AM',
      subjectId: 'os', unitId: 'os-u2', topicIds: ['os-t5', 'os-t6'],
      format: 'Typed Slides', pages: 22, uploadDate: '2025-09-12', downloads: 89,
      topicMatchCount: 2, totalTopics: 3, syllabusMatch: 'Matches 2/3 topics in Unit 2',
      filePath: 'sample_lecture_notes.pdf', fileSize: 1820000, mimeType: 'application/pdf'
    },
    {
      id: 'n3', title: 'Concurrency & Deadlocks — Comprehensive Notes', author: 'Kavya Nair', authorInitials: 'KN',
      subjectId: 'os', unitId: 'os-u3', topicIds: ['os-t8', 'os-t9', 'os-t10'],
      format: 'Typed Notes', pages: 28, uploadDate: '2025-09-18', downloads: 156,
      topicMatchCount: 3, totalTopics: 3, syllabusMatch: 'Matches 3/3 topics in Unit 3',
      filePath: 'sample_lecture_notes.pdf', fileSize: 2100000, mimeType: 'application/pdf'
    },
    {
      id: 'n4', title: 'Memory Management — Paging & Segmentation', author: 'Rohan Das', authorInitials: 'RD',
      subjectId: 'os', unitId: 'os-u4', topicIds: ['os-t11'],
      format: 'Handwritten PDF', pages: 18, uploadDate: '2025-09-10', downloads: 67,
      topicMatchCount: 1, totalTopics: 3, syllabusMatch: 'Matches 1/3 topics in Unit 4',
      filePath: 'sample_lecture_notes.pdf', fileSize: 1400000, mimeType: 'application/pdf'
    },
    {
      id: 'n5', title: 'File Systems & Disk Scheduling Cheatsheet', author: 'Sneha Iyer', authorInitials: 'SI',
      subjectId: 'os', unitId: 'os-u5', topicIds: ['os-t14', 'os-t15', 'os-t16'],
      format: 'Cheatsheet', pages: 8, uploadDate: '2025-09-20', downloads: 201,
      topicMatchCount: 3, totalTopics: 3, syllabusMatch: 'Matches 3/3 topics in Unit 5',
      filePath: 'sample_lecture_notes.pdf', fileSize: 850000, mimeType: 'application/pdf'
    },
    {
      id: 'n6', title: 'DBMS ER Model & Normalization Notes', author: 'Aditya Kumar', authorInitials: 'AK',
      subjectId: 'dbms', unitId: 'dbms-u1', topicIds: ['dbms-t1', 'dbms-t2'],
      format: 'Typed Notes', pages: 42, uploadDate: '2025-09-14', downloads: 93,
      topicMatchCount: 2, totalTopics: 3, syllabusMatch: 'Matches 2/3 topics in Unit 1',
      filePath: 'sample_lecture_notes.pdf', fileSize: 3200000, mimeType: 'application/pdf'
    },
    {
      id: 'n7', title: 'SQL Complete Reference — DDL to Joins', author: 'Meera Patel', authorInitials: 'MP',
      subjectId: 'dbms', unitId: 'dbms-u2', topicIds: ['dbms-t4', 'dbms-t5'],
      format: 'Typed Slides', pages: 35, uploadDate: '2025-09-16', downloads: 174,
      topicMatchCount: 2, totalTopics: 3, syllabusMatch: 'Matches 2/3 topics in Unit 2',
      filePath: 'sample_lecture_notes.pdf', fileSize: 2800000, mimeType: 'application/pdf'
    },
    {
      id: 'n8', title: 'Normalization Forms — 1NF to BCNF Walkthrough', author: 'Vikram Singh', authorInitials: 'VS',
      subjectId: 'dbms', unitId: 'dbms-u3', topicIds: ['dbms-t7', 'dbms-t8'],
      format: 'Handwritten PDF', pages: 26, uploadDate: '2025-09-11', downloads: 112,
      topicMatchCount: 2, totalTopics: 3, syllabusMatch: 'Matches 2/3 topics in Unit 3',
      filePath: 'sample_lecture_notes.pdf', fileSize: 1950000, mimeType: 'application/pdf'
    },
    {
      id: 'n9', title: 'OSI Model & TCP/IP — Illustrated Guide', author: 'Ananya Roy', authorInitials: 'AR',
      subjectId: 'cn', unitId: 'cn-u1', topicIds: ['cn-t1', 'cn-t2', 'cn-t3'],
      format: 'Typed Notes', pages: 30, uploadDate: '2025-09-13', downloads: 145,
      topicMatchCount: 3, totalTopics: 3, syllabusMatch: 'Matches 3/3 topics in Unit 1',
      filePath: 'sample_lecture_notes.pdf', fileSize: 2400000, mimeType: 'application/pdf'
    },
    {
      id: 'n10', title: 'IP Addressing & Subnetting — Solved Problems', author: 'Raj Malhotra', authorInitials: 'RM',
      subjectId: 'cn', unitId: 'cn-u3', topicIds: ['cn-t7'],
      format: 'Handwritten PDF', pages: 20, uploadDate: '2025-09-17', downloads: 198,
      topicMatchCount: 1, totalTopics: 3, syllabusMatch: 'Matches 1/3 topics in Unit 3',
      filePath: 'sample_lecture_notes.pdf', fileSize: 1650000, mimeType: 'application/pdf'
    },
    {
      id: 'n11', title: 'DFA, NFA & Regular Expressions — Full Unit Notes', author: 'Priya Sharma', authorInitials: 'PS',
      subjectId: 'toc', unitId: 'toc-u1', topicIds: ['toc-t1', 'toc-t2', 'toc-t3'],
      format: 'Typed Notes', pages: 45, uploadDate: '2025-09-09', downloads: 234,
      topicMatchCount: 3, totalTopics: 3, syllabusMatch: 'Matches 3/3 topics in Unit 1',
      filePath: 'sample_lecture_notes.pdf', fileSize: 3600000, mimeType: 'application/pdf'
    },
    {
      id: 'n12', title: 'Agile & Waterfall Process Models — Quick Review', author: 'Kavya Nair', authorInitials: 'KN',
      subjectId: 'se', unitId: 'se-u1', topicIds: ['se-t1'],
      format: 'Cheatsheet', pages: 6, uploadDate: '2025-09-19', downloads: 78,
      topicMatchCount: 1, totalTopics: 2, syllabusMatch: 'Matches 1/2 topics in Unit 1',
      filePath: 'sample_lecture_notes.pdf', fileSize: 720000, mimeType: 'application/pdf'
    },
  ];

  const insertNote = db.prepare(`
    INSERT INTO notes (
      id, title, author, author_initials, subject_id, unit_id, topic_ids,
      format, pages, file_path, file_size, mime_type, upload_date, downloads,
      topic_match_count, total_topics, syllabus_match
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const n of notesData) {
    insertNote.run(
      n.id, n.title, n.author, n.authorInitials, n.subjectId, n.unitId,
      JSON.stringify(n.topicIds), n.format, n.pages, n.filePath, n.fileSize,
      n.mimeType, n.uploadDate, n.downloads, n.topicMatchCount, n.totalTopics, n.syllabusMatch
    );
  }

  // 3. Seed PYQs
  const pyqData = [
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

  const insertPyq = db.prepare(`
    INSERT INTO pyqs (id, subject_id, year, month, question_count, topic_mapping)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  for (const p of pyqData) {
    insertPyq.run(p.id, p.subjectId, p.year, p.month, p.questionCount, JSON.stringify(p.topicMapping));
  }

  // 4. Seed Moderation Items
  const modData = [
    { id: 'm1', resourceName: 'OS Unit 3 Notes — Unknown Author', reporter: 'Arjun Mehta', reason: 'Duplicate', timestamp: '2025-09-21 14:23', status: 'pending' },
    { id: 'm2', resourceName: 'Random Chemistry Notes.pdf', reporter: 'Sneha Iyer', reason: 'Out of Syllabus', timestamp: '2025-09-21 12:05', status: 'pending' },
    { id: 'm3', resourceName: 'DBMS Textbook Scan — Full Chapter', reporter: 'Kavya Nair', reason: 'Copyright', timestamp: '2025-09-20 18:30', status: 'pending' },
    { id: 'm4', resourceName: 'Blurry Handwritten OS Notes', reporter: 'Rohan Das', reason: 'Corrupt Scan', timestamp: '2025-09-20 09:15', status: 'pending' },
    { id: 'm5', resourceName: 'CN Unit 4 Notes (Actually Unit 2)', reporter: 'Meera Patel', reason: 'Incorrect Syllabus', timestamp: '2025-09-19 22:47', status: 'pending' },
    { id: 'm6', resourceName: 'Old Scheme PYQ Solutions', reporter: 'Vikram Singh', reason: 'Out of Syllabus', timestamp: '2025-09-19 16:00', status: 'dismissed' },
  ];

  const insertMod = db.prepare(`
    INSERT INTO moderation (id, resource_name, reporter, reason, timestamp, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  for (const m of modData) {
    insertMod.run(m.id, m.resourceName, m.reporter, m.reason, m.timestamp, m.status);
  }

  // 5. Seed Users (Demo Accounts)
  seedDemoUsers();

  console.log('Database seeded successfully!');
}

export function seedDemoUsers() {
  const existingStudent = db.prepare('SELECT id FROM users WHERE email = ?').get('student@atelier.edu');
  if (!existingStudent) {
    const studentPass = hashPassword('password123');
    const modPass = hashPassword('password123');
    const now = new Date().toISOString();

    const insertUser = db.prepare(`
      INSERT OR REPLACE INTO users (id, email, password_hash, salt, name, initials, role, college, department, semester, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertUser.run(
      'user-student', 'student@atelier.edu', studentPass.hash, studentPass.salt,
      'Nishant Verma', 'NV', 'Student', 'Apex Institute of Technology', 'Computer Science', 5, now
    );

    insertUser.run(
      'user-moderator', 'moderator@atelier.edu', modPass.hash, modPass.salt,
      'Priya Sharma', 'PS', 'Moderator', 'Apex Institute of Technology', 'Computer Science', 5, now
    );
  }
}

