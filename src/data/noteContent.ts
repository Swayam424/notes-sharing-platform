// ================================================================
// Rich Academic Document Page Content for Focused Note Reading
// ================================================================

export interface NotePageData {
  pageNumber: number;
  title: string;
  subtitle?: string;
  sections: {
    heading?: string;
    type: 'text' | 'formula' | 'diagram' | 'table' | 'bullet_list' | 'callout' | 'code';
    content?: string;
    items?: string[];
    tableData?: { headers: string[]; rows: string[][] };
    calloutType?: 'info' | 'exam_tip' | 'warning' | 'formula';
  }[];
}

// Generate realistic academic pages tailored to the note's primary topic, subject, and format
export function getDocumentPages(
  _noteId: string,
  topic: string,
  subjectName: string,
  subjectCode: string,
  unitName: string,
  author: string,
  totalPages: number,
  _format: string
): NotePageData[] {
  const normTopic = topic.toLowerCase();
  const pages: NotePageData[] = [];
  const count = Math.min(Math.max(totalPages, 3), 12); // provide rich content up to realistic page count

  // Tailored content based on prominent topics
  if (normTopic.includes('deadlock') || normTopic.includes('concurrency') || normTopic.includes('banker')) {
    pages.push({
      pageNumber: 1,
      title: 'Deadlock Detection, Prevention & Avoidance',
      subtitle: `${subjectCode} ${subjectName} — ${unitName}`,
      sections: [
        {
          type: 'callout',
          calloutType: 'exam_tip',
          content: 'EXAM PRIORITY TOPIC: Appears in 4 of the last 5 university semester exams (10–14 marks). Master Banker’s Algorithm safety checks and Coffman conditions proof.'
        },
        {
          heading: '1. What is a Deadlock?',
          type: 'text',
          content: 'A deadlock occurs in a multiprogramming environment when a set of concurrent processes are permanently blocked because each process holds a resource and waits for another resource held by another process in the same set.'
        },
        {
          heading: '2. The Four Necessary & Sufficient Coffman Conditions',
          type: 'bullet_list',
          items: [
            'Mutual Exclusion: At least one non-shareable resource held by a process.',
            'Hold and Wait: A process holds at least one resource and is waiting to acquire additional resources held by other processes.',
            'No Preemption: Resources cannot be forcibly preempted; they can only be released voluntarily by the holding process.',
            'Circular Wait: A closed chain of processes exists {P0, P1, ..., Pn} such that P0 waits for a resource held by P1, and Pn waits for P0.'
          ]
        },
        {
          heading: '3. Deadlock Handling Strategies Comparison',
          type: 'table',
          tableData: {
            headers: ['Strategy', 'Approach', 'Overhead', 'Resource Utilization'],
            rows: [
              ['Ignoration (Ostrich)', 'Ignore the problem completely (used by Linux/Windows)', 'Zero', 'Maximum (until crash)'],
              ['Prevention', 'Disallow at least one of the 4 Coffman conditions', 'Moderate to High', 'Low (conservative)'],
              ['Avoidance', 'Dynamically inspect resource state (Banker’s Algorithm)', 'High per request', 'Medium to High'],
              ['Detection & Recovery', 'Allow deadlocks to occur, run cycle detection, preempt/kill', 'High recovery cost', 'High']
            ]
          }
        }
      ]
    });

    pages.push({
      pageNumber: 2,
      title: 'Banker’s Algorithm for Deadlock Avoidance',
      subtitle: 'Safety Algorithm & Resource-Request Algorithm',
      sections: [
        {
          heading: '1. Theoretical Framework & Data Structures',
          type: 'text',
          content: 'Let n = number of processes and m = number of resource types in the system.'
        },
        {
          type: 'formula',
          content: `Available[m]: Available[j] = k means k instances of resource Rj are currently available.\nMax[n][m]: Max[i][j] = k defines maximum demand of process Pi for resource Rj.\nAllocation[n][m]: Allocation[i][j] = k indicates instances of Rj currently allocated to Pi.\nNeed[n][m] Matrix: Need[i][j] = Max[i][j] - Allocation[i][j]`
        },
        {
          heading: '2. Safety Algorithm Steps (O(m × n²))',
          type: 'bullet_list',
          items: [
            'Step 1: Initialize Work = Available (vector of length m) and Finish[i] = false for i = 0, 1, ..., n-1.',
            'Step 2: Find an index i such that: Finish[i] == false AND Need[i] <= Work. If no such i exists, proceed to Step 4.',
            'Step 3: Work = Work + Allocation[i]; Finish[i] = true. Go back to Step 2.',
            'Step 4: If Finish[i] == true for all i, then the system is in a SAFE STATE. The sequence of processes found is a SAFE SEQUENCE.'
          ]
        },
        {
          heading: '3. Resource-Request Algorithm',
          type: 'text',
          content: 'When process Pi requests Request[i]: If Request[i] <= Need[i] and Request[i] <= Available, pretend to allocate resources by setting: Available = Available - Request[i]; Allocation[i] = Allocation[i] + Request[i]; Need[i] = Need[i] - Request[i]. Run Safety Algorithm. If safe, grant resources; else Pi must wait.'
        }
      ]
    });

    pages.push({
      pageNumber: 3,
      title: 'Worked University Exam Numerical (10 Marks)',
      subtitle: 'Complete Step-by-Step Verification with Safe Sequence',
      sections: [
        {
          heading: 'Exam Problem Statement (Dec 2024 / May 2023)',
          type: 'text',
          content: 'Consider 5 processes P0 through P4 and 3 resource types A (10 instances), B (5 instances), C (7 instances). Current snapshot at time T0:'
        },
        {
          type: 'table',
          tableData: {
            headers: ['Process', 'Allocation (A B C)', 'Max (A B C)', 'Need = Max - Alloc', 'Available'],
            rows: [
              ['P0', '0 1 0', '7 5 3', '7 4 3', '3 3 2 (Initial)'],
              ['P1', '2 0 0', '3 2 2', '1 2 2', '—'],
              ['P2', '3 0 2', '9 0 2', '6 0 0', '—'],
              ['P3', '2 1 1', '2 2 2', '0 1 1', '—'],
              ['P4', '0 0 2', '4 3 3', '4 3 1', '—']
            ]
          }
        },
        {
          heading: 'Step-by-Step Execution of Safety Algorithm:',
          type: 'bullet_list',
          items: [
            'Initial Work = [3, 3, 2]. Check P0: Need [7,4,3] <= Work [3,3,2]? False.',
            'Check P1: Need [1,2,2] <= Work [3,3,2]? TRUE! Work = [3,3,2] + [2,0,0] = [5,3,2]. Finish[P1] = true.',
            'Check P3: Need [0,1,1] <= Work [5,3,2]? TRUE! Work = [5,3,2] + [2,1,1] = [7,4,3]. Finish[P3] = true.',
            'Check P4: Need [4,3,1] <= Work [7,4,3]? TRUE! Work = [7,4,3] + [0,0,2] = [7,4,5]. Finish[P4] = true.',
            'Check P0: Need [7,4,3] <= Work [7,4,5]? TRUE! Work = [7,4,5] + [0,1,0] = [7,5,5]. Finish[P0] = true.',
            'Check P2: Need [6,0,0] <= Work [7,5,5]? TRUE! Work = [7,5,5] + [3,0,2] = [10,5,7]. Finish[P2] = true.'
          ]
        },
        {
          type: 'callout',
          calloutType: 'info',
          content: 'RESULT: Safe State confirmed! Safe Sequence: < P1 → P3 → P4 → P0 → P2 >. All instances returned to pool (10, 5, 7).'
        }
      ]
    });
  } else if (normTopic.includes('normal') || normTopic.includes('functional') || normTopic.includes('bcnf')) {
    pages.push({
      pageNumber: 1,
      title: 'Database Normalization & Functional Dependencies',
      subtitle: `${subjectCode} ${subjectName} — ${unitName}`,
      sections: [
        {
          type: 'callout',
          calloutType: 'exam_tip',
          content: 'EXAM PRIORITY: Testing for Lossless Join (Chase Method) and BCNF Decomposition carries 10–12 marks guaranteed.'
        },
        {
          heading: '1. What is Normalization & Why is it Required?',
          type: 'text',
          content: 'Normalization is the systematic process of decomposing relational tables to eliminate data redundancy and anomalies (Insertion, Deletion, and Update anomalies) while preserving dependencies and ensuring lossless joins.'
        },
        {
          heading: '2. Functional Dependency (FD) Definition',
          type: 'text',
          content: 'Given relation schema R, an FD X → Y holds if for any two legal tuples t1 and t2, t1[X] = t2[X] implies t1[Y] = t2[Y]. X is the determinant, and Y is the dependent.'
        },
        {
          heading: '3. Armstrong’s Axioms (Sound & Complete)',
          type: 'bullet_list',
          items: [
            'Axiom of Reflexivity: If Y ⊆ X, then X → Y.',
            'Axiom of Augmentation: If X → Y, then XZ → YZ for any attribute set Z.',
            'Axiom of Transitivity: If X → Y and Y → Z, then X → Z.',
            'Secondary Rules: Union (X→Y, X→Z ⇒ X→YZ), Decomposition (X→YZ ⇒ X→Y, X→Z), Pseudo-transitivity (X→Y, WY→Z ⇒ WX→Z).'
          ]
        }
      ]
    });

    pages.push({
      pageNumber: 2,
      title: 'Hierarchy of Normal Forms (1NF through BCNF)',
      subtitle: 'Rigorous Formal Definitions & Tests',
      sections: [
        {
          heading: 'Summary Comparison Matrix',
          type: 'table',
          tableData: {
            headers: ['Normal Form', 'Core Requirement / Condition', 'Anomaly Eliminated', 'Guaranteed Properties'],
            rows: [
              ['1NF', 'All attribute values must be atomic (no repeating groups/multivalued)', 'Composite attribute clutter', 'Basic relation structure'],
              ['2NF', '1NF + No partial dependency (non-prime attributes fully dependent on candidate keys)', 'Partial key update anomalies', 'Preserves dependencies'],
              ['3NF', '2NF + For every non-trivial X → A, either X is superkey OR A is prime attribute', 'Transitive dependencies', 'Lossless + Dependency Preserving'],
              ['BCNF', 'Strict: For every non-trivial X → A, X MUST be a superkey (no exceptions)', 'All redundancy from FDs', 'Lossless Join ALWAYS (May lose FDs)']
            ]
          }
        },
        {
          heading: 'Algorithm: Testing for Candidate Keys using Attribute Closure X+',
          type: 'bullet_list',
          items: [
            '1. Initialize X+ = X.',
            '2. Repeat: for each FD Y → Z in F, if Y ⊆ X+, then X+ = X+ ∪ Z.',
            '3. Terminate when X+ does not grow. If X+ includes all attributes of R, then X is a Superkey.',
            '4. A Superkey with no proper subset being a superkey is a Candidate Key.'
          ]
        }
      ]
    });

    pages.push({
      pageNumber: 3,
      title: 'Solved Exam Problem: BCNF Decomposition',
      subtitle: 'Worked Decomposition with Lossless Join Verification',
      sections: [
        {
          heading: 'Problem Statement:',
          type: 'text',
          content: 'Given Relation R(A, B, C, D, E) with FDs: { A → BC, CD → E, B → D, E → A }. Find Candidate Keys and decompose R into BCNF.'
        },
        {
          heading: 'Step 1: Finding Candidate Keys',
          type: 'text',
          content: 'A+ = {A, B, C, D, E}. Since A generates all attributes, A is a candidate key. (BC)+ includes {B, C, D, E, A}, so BC is another candidate key. Candidate keys are: {A}, {BC}, {CD}, {E}.'
        },
        {
          heading: 'Step 2: Checking BCNF Violations',
          type: 'text',
          content: 'In B → D: determinant B is NOT a superkey! Hence R violates BCNF. We decompose R into R1(B, D) with B as key, and R2(A, B, C, E).'
        },
        {
          type: 'callout',
          calloutType: 'info',
          content: 'Resulting Schemas: R1(B, D) [BCNF ✓] and R2(A, B, C, E) [BCNF ✓]. R1 ∩ R2 = {B}, which is a superkey of R1. Thus, the decomposition is guaranteed LOSSLESS JOIN.'
        }
      ]
    });
  } else if (normTopic.includes('tcp') || normTopic.includes('congestion') || normTopic.includes('aimd') || normTopic.includes('tahoe')) {
    pages.push({
      pageNumber: 1,
      title: 'TCP Congestion Control Architecture',
      subtitle: `${subjectCode} ${subjectName} — ${unitName}`,
      sections: [
        {
          type: 'callout',
          calloutType: 'exam_tip',
          content: 'EXAM HIGHLIGHT: Explain Slow Start, Congestion Avoidance (AIMD), Fast Retransmit, and compare Tahoe vs Reno with cwnd timeline graph (8–10 marks).'
        },
        {
          heading: '1. The Congestion Problem in Packet Networks',
          type: 'text',
          content: 'Network congestion occurs when aggregate traffic injected into a subnet exceeds router queue buffers and link capacities, causing packet drops, queuing delays, and collapse of throughput.'
        },
        {
          heading: '2. The Four Intertwined Mechanisms of TCP Reno',
          type: 'bullet_list',
          items: [
            'Slow Start: Exponential increase of congestion window (cwnd) per RTT until ssthresh (slow start threshold) is reached.',
            'Congestion Avoidance: Linear growth of cwnd (1 MSS per RTT) to probe bandwidth cautiously (AIMD: Additive Increase).',
            'Fast Retransmit: On receiving 3 duplicate ACKs, retransmit missing segment immediately without waiting for retransmission timer (RTO).',
            'Fast Recovery: Avoid dropping cwnd to 1 MSS on 3 dup ACKs; set ssthresh = cwnd / 2, set cwnd = ssthresh + 3 MSS, and continue linearly.'
          ]
        }
      ]
    });

    pages.push({
      pageNumber: 2,
      title: 'Tahoe vs. Reno cwnd Evolution Curves',
      subtitle: 'Mathematical Equations & Threshold Adaptations',
      sections: [
        {
          heading: 'Comparison on Packet Loss Events',
          type: 'table',
          tableData: {
            headers: ['Event / Scenario', 'TCP Tahoe Action', 'TCP Reno Action', 'Rationale'],
            rows: [
              ['Timeout (RTO Expiry)', 'ssthresh = cwnd/2; cwnd = 1 MSS; enters Slow Start', 'ssthresh = cwnd/2; cwnd = 1 MSS; enters Slow Start', 'Severe network freeze detected'],
              ['3 Duplicate ACKs', 'ssthresh = cwnd/2; cwnd = 1 MSS; enters Slow Start', 'ssthresh = cwnd/2; cwnd = ssthresh + 3 MSS; Fast Recovery', 'Network is still clocking packets, only 1 drop'],
              ['Slow Start Phase', 'cwnd = cwnd + 1 MSS per ACK (doubles per RTT)', 'cwnd = cwnd + 1 MSS per ACK (doubles per RTT)', 'Rapidly finds pipe capacity'],
              ['Avoidance Phase', 'cwnd = cwnd + (1/cwnd) per ACK (adds 1 MSS per RTT)', 'cwnd = cwnd + (1/cwnd) per ACK (adds 1 MSS per RTT)', 'Conservative probing']
            ]
          }
        },
        {
          heading: 'AIMD Stability Theorem',
          type: 'text',
          content: 'Additive Increase Multiplicative Decrease (AIMD) is provably the only linear control algorithm that converges to both maximum network efficiency and fair resource allocation among competing TCP flows (Chiu & Jain vector diagram).'
        }
      ]
    });

    pages.push({
      pageNumber: 3,
      title: 'Worked Exam Numerical: cwnd Tracking over 15 RTTs',
      subtitle: 'Step-by-step cwnd Values and Phase Transitions',
      sections: [
        {
          heading: 'Numerical Scenario:',
          type: 'text',
          content: 'Initial cwnd = 1 MSS, ssthresh = 16 MSS. A triple duplicate ACK arrives at RTT = 8. A timeout occurs at RTT = 12. Plot the values for TCP Reno:'
        },
        {
          type: 'table',
          tableData: {
            headers: ['RTT Cycle', 'cwnd (MSS)', 'Phase / State', 'Reason / Trigger'],
            rows: [
              ['RTT 1–4', '1 → 2 → 4 → 8 → 16', 'Slow Start', 'Doubling each RTT until ssthresh (16)'],
              ['RTT 5–7', '17 → 18 → 19 → 20', 'Congestion Avoidance', 'Linear growth +1 MSS per RTT'],
              ['RTT 8', 'Drops to 10 (20/2)', 'Fast Retransmit & Recovery', '3 Duplicate ACKs received'],
              ['RTT 9–11', '11 → 12 → 13', 'Congestion Avoidance', 'Probing linearly from new ssthresh'],
              ['RTT 12', 'Drops to 1 MSS', 'Slow Start (Timeout)', 'RTO expired, ssthresh set to 6']
            ]
          }
        },
        {
          type: 'callout',
          calloutType: 'info',
          content: 'Key Formula for Exam: On loss, ssthresh = max(2, cwnd / 2). Timeout always resets cwnd to 1, while 3 dup ACKs in Reno skips slow start entirely.'
        }
      ]
    });
  } else {
    // High quality dynamic academic content for any other notes
    pages.push({
      pageNumber: 1,
      title: topic || 'Comprehensive Course Notes',
      subtitle: `${subjectCode} ${subjectName} — ${unitName}`,
      sections: [
        {
          type: 'callout',
          calloutType: 'exam_tip',
          content: `CURATED STUDY NOTE: Prepared by ${author} for ${subjectName}. Structured to match University Examination Guidelines and syllabus unit outcomes.`
        },
        {
          heading: '1. Unit Learning Objectives',
          type: 'bullet_list',
          items: [
            `Understand foundational principles of ${topic} in modern computational architectures.`,
            `Master key definitions, protocol layers, and core mathematical representations.`,
            `Solve standard semester examination numericals and proof-based questions.`,
            `Evaluate trade-offs between performance, scalability, and implementation complexity.`
          ]
        },
        {
          heading: '2. Foundational Concepts & Definitions',
          type: 'text',
          content: `This document contains the complete study material for ${topic}, covering all syllabus-required definitions, theorems, block diagrams, and past year question references.`
        }
      ]
    });

    pages.push({
      pageNumber: 2,
      title: 'Detailed Theoretical Framework & Architecture',
      subtitle: `Deep dive into ${topic}`,
      sections: [
        {
          heading: 'Core Architecture Overview',
          type: 'text',
          content: `The internal mechanism relies on modular separation of concerns. In contemporary engineering implementations, systems isolate interface definitions from runtime execution to ensure high fault tolerance and deterministic throughput.`
        },
        {
          heading: 'Key Characteristics & Design Constraints',
          type: 'table',
          tableData: {
            headers: ['Attribute / Metric', 'Theoretical Model', 'Real-world Constraint', 'University Exam Weightage'],
            rows: [
              ['Time Complexity', 'O(n log n)', 'Bounded by bus latency', 'High (frequent question)'],
              ['Space Overhead', 'O(1) auxiliary', 'Cache line alignment', 'Medium'],
              ['Reliability Guarantee', 'Provably safe', 'Hardware timeout recovery', 'High (case study)'],
              ['Standard RFC / Spec', 'IEEE / ACM Curriculum', 'Industry standard POSIX/ISO', 'Direct reference']
            ]
          }
        },
        {
          heading: 'Step-by-Step Execution Sequence',
          type: 'bullet_list',
          items: [
            'Initialization & Handshake: System registers handlers and verifies configuration vectors.',
            'State Validation: Invariants checked before transitioning to execution mode.',
            'Payload Processing: Atomic transactions committed with rollback journal.',
            'Post-condition Audit: Buffer released back to shared pool.'
          ]
        }
      ]
    });

    pages.push({
      pageNumber: 3,
      title: 'Exam Solutions & High-Yield Summary',
      subtitle: 'Key Formulas, Common Pitfalls & Quick Review',
      sections: [
        {
          heading: 'Important Formulas & Definitions to Memorize',
          type: 'formula',
          content: `Efficiency η = (Useful Work) / (Total Time Elapsed)\nThroughput = (Total Packets Processed) / (Window Duration)\nConstraint Check: ∀ i ∈ [1, n], ResourceAllocated[i] ≤ ResourceMax[i]`
        },
        {
          heading: 'Common Examination Pitfalls',
          type: 'bullet_list',
          items: [
            'Do not confuse worst-case time bounds with average operational performance.',
            'Always state assumptions clearly (e.g. preemptive vs non-preemptive environment).',
            'Draw neat block diagrams with labeled inputs, outputs, and intermediate queues.'
          ]
        },
        {
          type: 'callout',
          calloutType: 'info',
          content: 'Revision Check: Review past year question papers (2022–2025) in the PYQ Archive for repetitive variations of this topic.'
        }
      ]
    });
  }

  // If the note has more pages requested, pad with structured pages
  for (let i = 4; i <= count; i++) {
    pages.push({
      pageNumber: i,
      title: `${topic} — Extended Analysis (Part ${i - 3})`,
      subtitle: `${subjectCode} ${subjectName} — Page ${i} of ${count}`,
      sections: [
        {
          heading: `Section ${i}.1: In-depth Technical Nuances`,
          type: 'text',
          content: `Continued analytical breakdown of ${topic} including edge-case scenarios, algorithmic optimizations, and hardware-software architectural interactions.`
        },
        {
          heading: `Section ${i}.2: Comprehensive Study Reference`,
          type: 'bullet_list',
          items: [
            `Detailed walkthrough of numerical scenario variant #${i - 3}.`,
            'Cross-layer interaction with underlying memory and communication controllers.',
            'Standard textbook reference: Silberschatz, Galvin & Gagne / Tanenbaum.'
          ]
        }
      ]
    });
  }

  return pages;
}
