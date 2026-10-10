// ============================================================================
// Multi-Stream & Multi-Semester Academic Curriculum Catalog
// Tailored for CSE, IT, AI & Data Science, ECE, Mechanical, EE, BCA, and MCA
// ============================================================================

export const extendedCurricula = [
  // --------------------------------------------------------------------------
  // 1. CSE Semester 3
  // --------------------------------------------------------------------------
  {
    id: 'dsa',
    name: 'Data Structures & Algorithms',
    code: 'CS301',
    semester: 3,
    department: 'Computer Science & Engineering',
    scheme: '2022–2026 Scheme',
    coverage: 78,
    units: [
      {
        id: 'dsa-u1',
        name: 'Unit 1: Linear Data Structures',
        topics: [
          { id: 'dsa-t1', name: 'Arrays & Dynamic Memory Allocation', status: 'covered', noteCount: 5, pyqCount: 3, pyqYears: [2023, 2024, 2025], pyqQuestions: ['Explain row-major vs column-major array address calculation.'] },
          { id: 'dsa-t2', name: 'Singly, Doubly & Circular Linked Lists', status: 'covered', noteCount: 6, pyqCount: 4, pyqYears: [2022, 2023, 2024], pyqQuestions: ['Write algorithm to reverse a singly linked list in-place.', 'Compare linked lists with arrays.'] },
          { id: 'dsa-t3', name: 'Stacks, Infix-to-Postfix & Evaluation', status: 'covered', noteCount: 4, pyqCount: 3, pyqYears: [2023, 2025], pyqQuestions: ['Convert infix (A+B)*(C-D) to postfix using stack trace.'] },
          { id: 'dsa-t4', name: 'Queues, Deque & Circular Buffers', status: 'partial', noteCount: 2, pyqCount: 2, pyqYears: [2024], pyqQuestions: ['Demonstrate circular queue enqueue and dequeue condition checks.'] },
        ]
      },
      {
        id: 'dsa-u2',
        name: 'Unit 2: Trees & Hierarchical Structures',
        topics: [
          { id: 'dsa-t5', name: 'Binary Trees & Traversals (In, Pre, Post)', status: 'covered', noteCount: 6, pyqCount: 5, pyqYears: [2022, 2023, 2024, 2025], pyqQuestions: ['Construct a binary tree given Inorder and Preorder traversals.'] },
          { id: 'dsa-t6', name: 'Binary Search Trees (BST) & Operations', status: 'covered', noteCount: 4, pyqCount: 3, pyqYears: [2023, 2024], pyqQuestions: ['Write code to delete a node with two children from BST.'] },
          { id: 'dsa-t7', name: 'AVL Trees & Self-Balancing Rotations', status: 'partial', noteCount: 3, pyqCount: 3, pyqYears: [2024, 2025], pyqQuestions: ['Explain LL, RR, LR, RL rotations on AVL tree with numerical.'] },
        ]
      },
      {
        id: 'dsa-u3',
        name: 'Unit 3: Graphs & Shortest Paths',
        topics: [
          { id: 'dsa-t8', name: 'Graph Representations (Adj Matrix & List)', status: 'covered', noteCount: 3, pyqCount: 2, pyqYears: [2023, 2024], pyqQuestions: ['Compare space complexity of adjacency matrix vs adjacency list.'] },
          { id: 'dsa-t9', name: 'BFS & DFS Graph Traversals', status: 'covered', noteCount: 5, pyqCount: 4, pyqYears: [2022, 2024, 2025], pyqQuestions: ['Trace BFS and DFS on the given directed graph starting from vertex S.'] },
          { id: 'dsa-t10', name: 'Dijkstra & Minimum Spanning Trees (Prim/Kruskal)', status: 'covered', noteCount: 4, pyqCount: 4, pyqYears: [2023, 2024, 2025], pyqQuestions: ['Find MST using Kruskal’s greedy algorithm with cycle detection.'] },
        ]
      }
    ]
  },
  {
    id: 'coa',
    name: 'Computer Organization & Architecture',
    code: 'CS304',
    semester: 3,
    department: 'Computer Science & Engineering',
    scheme: '2022–2026 Scheme',
    coverage: 70,
    units: [
      {
        id: 'coa-u1',
        name: 'Unit 1: Register Transfer & Instruction Cycle',
        topics: [
          { id: 'coa-t1', name: 'Bus Architecture & Tri-State Buffers', status: 'covered', noteCount: 3, pyqCount: 2, pyqYears: [2024], pyqQuestions: ['Explain common bus system construction using multiplexers.'] },
          { id: 'coa-t2', name: 'Instruction Cycle & Microoperations', status: 'covered', noteCount: 4, pyqCount: 3, pyqYears: [2023, 2025], pyqQuestions: ['Draw flowchart for fetch, decode, and execute instruction cycle.'] },
        ]
      },
      {
        id: 'coa-u2',
        name: 'Unit 2: Central Processing Unit & Pipelining',
        topics: [
          { id: 'coa-t3', name: 'RISC vs CISC Architecture', status: 'covered', noteCount: 4, pyqCount: 3, pyqYears: [2023, 2024], pyqQuestions: ['Differentiate RISC and CISC design philosophies.'] },
          { id: 'coa-t4', name: 'Arithmetic & Instruction Pipelining', status: 'partial', noteCount: 2, pyqCount: 3, pyqYears: [2024, 2025], pyqQuestions: ['Calculate speedup ratio of a 4-stage pipeline for 100 instructions.'] },
        ]
      },
      {
        id: 'coa-u3',
        name: 'Unit 3: Memory Organization',
        topics: [
          { id: 'coa-t5', name: 'Cache Memory Mapping (Direct, Associative, Set)', status: 'covered', noteCount: 5, pyqCount: 4, pyqYears: [2022, 2023, 2025], pyqQuestions: ['Solve: Given 32-bit address, 64KB cache, 64B block, find tag, index, and offset.'] },
        ]
      }
    ]
  },
  {
    id: 'discrete',
    name: 'Discrete Mathematics & Graph Theory',
    code: 'CS303',
    semester: 3,
    department: 'Computer Science & Engineering',
    scheme: '2022–2026 Scheme',
    coverage: 62,
    units: [
      {
        id: 'dm-u1',
        name: 'Unit 1: Propositional Logic & Sets',
        topics: [
          { id: 'dm-t1', name: 'Truth Tables, Tautology & Equivalences', status: 'covered', noteCount: 4, pyqCount: 3, pyqYears: [2023, 2024], pyqQuestions: ['Prove (p -> q) ∧ (q -> r) => (p -> r) using laws of logic.'] },
          { id: 'dm-t2', name: 'Predicate Logic & Quantifiers', status: 'partial', noteCount: 2, pyqCount: 2, pyqYears: [2024], pyqQuestions: ['Negate the statement: For all x, there exists y such that P(x, y).'] },
        ]
      },
      {
        id: 'dm-u2',
        name: 'Unit 2: Relations, Functions & Lattices',
        topics: [
          { id: 'dm-t3', name: 'Equivalence Relations & Partial Orders (Poset)', status: 'covered', noteCount: 3, pyqCount: 3, pyqYears: [2023, 2025], pyqQuestions: ['Draw Hasse diagram for divisibility relation on D(36).'] },
          { id: 'dm-t4', name: 'Lattices & Boolean Algebras', status: 'missing', noteCount: 0, pyqCount: 2, pyqYears: [2024, 2025], pyqQuestions: ['Define complemented distributive lattice and verify properties.'] },
        ]
      }
    ]
  },

  // --------------------------------------------------------------------------
  // 2. CSE Semester 4
  // --------------------------------------------------------------------------
  {
    id: 'daa',
    name: 'Design & Analysis of Algorithms',
    code: 'CS401',
    semester: 4,
    department: 'Computer Science & Engineering',
    scheme: '2022–2026 Scheme',
    coverage: 74,
    units: [
      {
        id: 'daa-u1',
        name: 'Unit 1: Asymptotic Analysis & Divide-and-Conquer',
        topics: [
          { id: 'daa-t1', name: 'Big-O, Omega, Theta Notations', status: 'covered', noteCount: 4, pyqCount: 3, pyqYears: [2023, 2024], pyqQuestions: ['Prove that 3n^2 + 5n = O(n^2) using definition.'] },
          { id: 'daa-t2', name: 'Master Theorem for Recurrences', status: 'covered', noteCount: 5, pyqCount: 4, pyqYears: [2022, 2023, 2024, 2025], pyqQuestions: ['Solve T(n) = 2T(n/2) + n*log(n) using Master Theorem.'] },
          { id: 'daa-t3', name: 'Merge Sort & Quick Sort Worst-Case Analysis', status: 'covered', noteCount: 4, pyqCount: 3, pyqYears: [2023, 2025], pyqQuestions: ['Analyze average and worst case time complexity of Randomized Quick Sort.'] },
        ]
      },
      {
        id: 'daa-u2',
        name: 'Unit 2: Dynamic Programming & Greedy',
        topics: [
          { id: 'daa-t4', name: '0/1 Knapsack Problem (DP vs Greedy)', status: 'covered', noteCount: 5, pyqCount: 4, pyqYears: [2023, 2024, 2025], pyqQuestions: ['Solve 0/1 Knapsack with capacity W=7 using dynamic programming table.'] },
          { id: 'daa-t5', name: 'Longest Common Subsequence (LCS)', status: 'covered', noteCount: 4, pyqCount: 3, pyqYears: [2024, 2025], pyqQuestions: ['Find LCS of X="AGGTAB" and Y="GXTXAYB" with direction arrows.'] },
          { id: 'daa-t6', name: 'Floyd-Warshall All-Pairs Shortest Path', status: 'partial', noteCount: 2, pyqCount: 2, pyqYears: [2023, 2024], pyqQuestions: ['Compute D(0), D(1), D(2) matrices for 4-node directed graph.'] },
        ]
      }
    ]
  },
  {
    id: 'oops-java',
    name: 'Object Oriented Programming with Java',
    code: 'CS402',
    semester: 4,
    department: 'Computer Science & Engineering',
    scheme: '2022–2026 Scheme',
    coverage: 82,
    units: [
      {
        id: 'java-u1',
        name: 'Unit 1: Classes, Objects & Inheritance',
        topics: [
          { id: 'java-t1', name: 'Encapsulation, Polymorphism & Abstraction', status: 'covered', noteCount: 5, pyqCount: 3, pyqYears: [2023, 2024], pyqQuestions: ['Explain dynamic method dispatch with Java code example.'] },
          { id: 'java-t2', name: 'Interfaces & Abstract Classes', status: 'covered', noteCount: 4, pyqCount: 3, pyqYears: [2023, 2025], pyqQuestions: ['Differentiate interfaces and abstract classes in Java 8+.'] },
        ]
      },
      {
        id: 'java-u2',
        name: 'Unit 2: Exception Handling & Multithreading',
        topics: [
          { id: 'java-t3', name: 'Try-Catch-Finally & Custom Exceptions', status: 'covered', noteCount: 4, pyqCount: 2, pyqYears: [2024], pyqQuestions: ['Create user-defined InsufficientFundsException in Java.'] },
          { id: 'java-t4', name: 'Thread Lifecycle & Synchronization', status: 'partial', noteCount: 3, pyqCount: 3, pyqYears: [2023, 2024, 2025], pyqQuestions: ['Implement Producer-Consumer problem using wait() and notify().'] },
        ]
      }
    ]
  },

  // --------------------------------------------------------------------------
  // 3. CSE Semester 6
  // --------------------------------------------------------------------------
  {
    id: 'compiler-design',
    name: 'Compiler Design',
    code: 'CS601',
    semester: 6,
    department: 'Computer Science & Engineering',
    scheme: '2022–2026 Scheme',
    coverage: 68,
    units: [
      {
        id: 'cd-u1',
        name: 'Unit 1: Lexical Analysis & Symbol Tables',
        topics: [
          { id: 'cd-t1', name: 'Phases of Compiler & Passes', status: 'covered', noteCount: 4, pyqCount: 3, pyqYears: [2023, 2024], pyqQuestions: ['Illustrate all 6 phases of compiler with example expression.'] },
          { id: 'cd-t2', name: 'Lexical Analyzer Generator (LEX)', status: 'partial', noteCount: 2, pyqCount: 2, pyqYears: [2024], pyqQuestions: ['Explain role of LEX and token recognition using transition diagrams.'] },
        ]
      },
      {
        id: 'cd-u2',
        name: 'Unit 2: Syntax Analysis & Parsing',
        topics: [
          { id: 'cd-t3', name: 'Top-Down Parsing: LL(1) Parsing Table', status: 'covered', noteCount: 5, pyqCount: 4, pyqYears: [2022, 2023, 2024, 2025], pyqQuestions: ['Compute FIRST and FOLLOW sets and construct LL(1) parse table.'] },
          { id: 'cd-t4', name: 'Bottom-Up Parsing: Shift-Reduce & LR(0)/SLR(1)', status: 'partial', noteCount: 3, pyqCount: 3, pyqYears: [2023, 2025], pyqQuestions: ['Construct canonical collection of LR(0) items for the grammar.'] },
        ]
      }
    ]
  },
  {
    id: 'ai-core',
    name: 'Artificial Intelligence & Expert Systems',
    code: 'CS603',
    semester: 6,
    department: 'Computer Science & Engineering',
    scheme: '2022–2026 Scheme',
    coverage: 72,
    units: [
      {
        id: 'ai-u1',
        name: 'Unit 1: Search Strategies & Problem Solving',
        topics: [
          { id: 'ai-t1', name: 'State Space Search & Heuristics', status: 'covered', noteCount: 4, pyqCount: 3, pyqYears: [2023, 2024], pyqQuestions: ['Formulate 8-puzzle problem as state space search.'] },
          { id: 'ai-t2', name: 'A* Algorithm & Admissibility', status: 'covered', noteCount: 5, pyqCount: 4, pyqYears: [2022, 2023, 2025], pyqQuestions: ['State and prove condition for A* heuristic admissibility.'] },
          { id: 'ai-t3', name: 'Minimax & Alpha-Beta Pruning', status: 'partial', noteCount: 3, pyqCount: 3, pyqYears: [2024, 2025], pyqQuestions: ['Apply Alpha-Beta pruning on the given game tree and show pruned branches.'] },
        ]
      }
    ]
  },

  // --------------------------------------------------------------------------
  // 4. AI & Data Science (Semesters 3 & 5)
  // --------------------------------------------------------------------------
  {
    id: 'ml-core',
    name: 'Machine Learning Foundations',
    code: 'AI501',
    semester: 5,
    department: 'AI & Data Science',
    scheme: '2022–2026 Scheme',
    coverage: 84,
    units: [
      {
        id: 'ml-u1',
        name: 'Unit 1: Supervised Learning & Regression',
        topics: [
          { id: 'ml-t1', name: 'Linear Regression & Cost Function Gradient Descent', status: 'covered', noteCount: 6, pyqCount: 4, pyqYears: [2023, 2024, 2025], pyqQuestions: ['Derive gradient descent weight update equation for MSE loss.'] },
          { id: 'ml-t2', name: 'Logistic Regression & Sigmoid Function', status: 'covered', noteCount: 5, pyqCount: 3, pyqYears: [2023, 2025], pyqQuestions: ['Explain cross-entropy loss and decision boundary in logistic regression.'] },
        ]
      },
      {
        id: 'ml-u2',
        name: 'Unit 2: Decision Trees & Ensemble Methods',
        topics: [
          { id: 'ml-t3', name: 'Entropy, Information Gain & ID3/C4.5', status: 'covered', noteCount: 5, pyqCount: 4, pyqYears: [2022, 2023, 2024], pyqQuestions: ['Calculate Information Gain for root split on the training dataset.'] },
          { id: 'ml-t4', name: 'Random Forests & Boosting (AdaBoost, XGBoost)', status: 'covered', noteCount: 4, pyqCount: 3, pyqYears: [2024, 2025], pyqQuestions: ['Explain Bagging vs Boosting with bias-variance trade-off diagram.'] },
        ]
      },
      {
        id: 'ml-u3',
        name: 'Unit 3: Support Vector Machines & Clustering',
        topics: [
          { id: 'ml-t5', name: 'SVM Maximum Margin & Kernel Trick', status: 'partial', noteCount: 3, pyqCount: 3, pyqYears: [2023, 2025], pyqQuestions: ['Explain soft margin SVM with slack variables and RBF kernel.'] },
          { id: 'ml-t6', name: 'K-Means Clustering & Elbow Method', status: 'covered', noteCount: 4, pyqCount: 2, pyqYears: [2024], pyqQuestions: ['Step through K-Means algorithm for 8 data points with K=2.'] },
        ]
      }
    ]
  },
  {
    id: 'dl-core',
    name: 'Deep Learning & Neural Architectures',
    code: 'AI503',
    semester: 5,
    department: 'AI & Data Science',
    scheme: '2022–2026 Scheme',
    coverage: 76,
    units: [
      {
        id: 'dl-u1',
        name: 'Unit 1: Neural Networks & Backpropagation',
        topics: [
          { id: 'dl-t1', name: 'Multilayer Perceptron & Activation Functions', status: 'covered', noteCount: 5, pyqCount: 3, pyqYears: [2023, 2024], pyqQuestions: ['Compare ReLU, Leaky ReLU, Sigmoid, and Tanh activation functions.'] },
          { id: 'dl-t2', name: 'Backpropagation & Vanishing Gradient Problem', status: 'covered', noteCount: 4, pyqCount: 4, pyqYears: [2023, 2024, 2025], pyqQuestions: ['Derive chain rule partial derivatives for 2-layer neural network.'] },
        ]
      },
      {
        id: 'dl-u2',
        name: 'Unit 2: Convolutional Neural Networks (CNN)',
        topics: [
          { id: 'dl-t3', name: 'Convolution, Stride, Padding & Pooling', status: 'covered', noteCount: 5, pyqCount: 3, pyqYears: [2024, 2025], pyqQuestions: ['Calculate output volume dimensions given 32x32x3 image, 5x5 filter, stride 1, padding 2.'] },
          { id: 'dl-t4', name: 'VGG, ResNet & Residual Connections', status: 'partial', noteCount: 3, pyqCount: 2, pyqYears: [2025], pyqQuestions: ['Why do skip connections in ResNet resolve vanishing gradients in very deep networks?'] },
        ]
      }
    ]
  },
  {
    id: 'pds-core',
    name: 'Python for Data Science & ML',
    code: 'AI303',
    semester: 3,
    department: 'AI & Data Science',
    scheme: '2022–2026 Scheme',
    coverage: 85,
    units: [
      {
        id: 'pds-u1',
        name: 'Unit 1: NumPy & Vectorized Computations',
        topics: [
          { id: 'pds-t1', name: 'N-Dimensional Arrays & Broadcasting Rules', status: 'covered', noteCount: 6, pyqCount: 3, pyqYears: [2023, 2024], pyqQuestions: ['Explain NumPy array broadcasting with dimensional compatibility rules.'] },
        ]
      },
      {
        id: 'pds-u2',
        name: 'Unit 2: Pandas Data Wrangling & Visualization',
        topics: [
          { id: 'pds-t2', name: 'DataFrames, GroupBy, Merging & Imputation', status: 'covered', noteCount: 5, pyqCount: 3, pyqYears: [2024, 2025], pyqQuestions: ['Demonstrate handling missing data using Pandas forward-fill and median imputation.'] },
        ]
      }
    ]
  },

  // --------------------------------------------------------------------------
  // 5. Electronics & Communication (ECE) (Semesters 3 & 5)
  // --------------------------------------------------------------------------
  {
    id: 'signals-systems',
    name: 'Signals & Systems',
    code: 'EC302',
    semester: 3,
    department: 'Electronics & Communication',
    scheme: '2022–2026 Scheme',
    coverage: 65,
    units: [
      {
        id: 'ss-u1',
        name: 'Unit 1: Continuous & Discrete Signals',
        topics: [
          { id: 'ss-t1', name: 'Classification of Signals (Energy vs Power, Periodic)', status: 'covered', noteCount: 4, pyqCount: 3, pyqYears: [2023, 2024], pyqQuestions: ['Determine whether x(t) = e^(-2t) u(t) is energy or power signal.'] },
          { id: 'ss-t2', name: 'LTI Systems & Convolution Integral/Sum', status: 'covered', noteCount: 5, pyqCount: 4, pyqYears: [2022, 2023, 2024, 2025], pyqQuestions: ['Evaluate convolution of x(t) = u(t) with h(t) = e^(-at) u(t).'] },
        ]
      },
      {
        id: 'ss-u2',
        name: 'Unit 2: Fourier Transform & Laplace Transform',
        topics: [
          { id: 'ss-t3', name: 'Continuous-Time Fourier Transform (CTFT) Properties', status: 'partial', noteCount: 2, pyqCount: 3, pyqYears: [2023, 2025], pyqQuestions: ['State and prove duality and frequency shifting properties of CTFT.'] },
          { id: 'ss-t4', name: 'Laplace Transform & Region of Convergence (ROC)', status: 'covered', noteCount: 4, pyqCount: 3, pyqYears: [2024, 2025], pyqQuestions: ['Find Laplace transform and ROC for x(t) = -e^(-3t) u(-t).'] },
        ]
      }
    ]
  },
  {
    id: 'communication-sys',
    name: 'Analog & Digital Communication',
    code: 'EC501',
    semester: 5,
    department: 'Electronics & Communication',
    scheme: '2022–2026 Scheme',
    coverage: 72,
    units: [
      {
        id: 'comm-u1',
        name: 'Unit 1: Amplitude & Angle Modulation',
        topics: [
          { id: 'comm-t1', name: 'AM, DSB-SC, SSB-SC Generation & Demodulation', status: 'covered', noteCount: 5, pyqCount: 4, pyqYears: [2022, 2023, 2024, 2025], pyqQuestions: ['Derive power efficiency for standard AM with modulation index mu=0.5.'] },
          { id: 'comm-t2', name: 'Frequency Modulation (FM) & Carson\'s Rule', status: 'covered', noteCount: 4, pyqCount: 3, pyqYears: [2023, 2024], pyqQuestions: ['Calculate transmission bandwidth of wideband FM using Carson\'s rule.'] },
        ]
      },
      {
        id: 'comm-u2',
        name: 'Unit 2: Digital Modulation Techniques',
        topics: [
          { id: 'comm-t3', name: 'Pulse Code Modulation (PCM) & Quantization Noise', status: 'covered', noteCount: 4, pyqCount: 3, pyqYears: [2023, 2025], pyqQuestions: ['Derive signal-to-quantization noise ratio (SQNR) for n-bit uniform PCM.'] },
          { id: 'comm-t4', name: 'BPSK, QPSK & Constellation Diagrams', status: 'partial', noteCount: 3, pyqCount: 3, pyqYears: [2024, 2025], pyqQuestions: ['Draw constellation diagram and state bit error probability of QPSK.'] },
        ]
      }
    ]
  },

  // --------------------------------------------------------------------------
  // 6. Mechanical Engineering (Semesters 3 & 5)
  // --------------------------------------------------------------------------
  {
    id: 'thermodynamics',
    name: 'Engineering Thermodynamics',
    code: 'ME302',
    semester: 3,
    department: 'Mechanical Engineering',
    scheme: '2022–2026 Scheme',
    coverage: 75,
    units: [
      {
        id: 'th-u1',
        name: 'Unit 1: First Law & Closed/Open Systems',
        topics: [
          { id: 'th-t1', name: 'Steady Flow Energy Equation (SFEE)', status: 'covered', noteCount: 5, pyqCount: 4, pyqYears: [2022, 2023, 2024, 2025], pyqQuestions: ['Apply SFEE for steam nozzle and turbine to calculate work and exit velocity.'] },
        ]
      },
      {
        id: 'th-u2',
        name: 'Unit 2: Second Law & Entropy',
        topics: [
          { id: 'th-t2', name: 'Kelvin-Planck & Clausius Statements, Carnot Engine', status: 'covered', noteCount: 4, pyqCount: 3, pyqYears: [2023, 2024], pyqQuestions: ['Prove equivalence of Kelvin-Planck and Clausius statements of Second Law.'] },
          { id: 'th-t3', name: 'Clausius Inequality & Principle of Entropy Increase', status: 'covered', noteCount: 3, pyqCount: 3, pyqYears: [2024, 2025], pyqQuestions: ['State Clausius inequality and evaluate entropy generation in irreversible processes.'] },
        ]
      }
    ]
  },
  {
    id: 'heat-transfer',
    name: 'Heat & Mass Transfer',
    code: 'ME501',
    semester: 5,
    department: 'Mechanical Engineering',
    scheme: '2022–2026 Scheme',
    coverage: 70,
    units: [
      {
        id: 'ht-u1',
        name: 'Unit 1: Conduction Heat Transfer',
        topics: [
          { id: 'ht-t1', name: 'Fourier\'s Law & Critical Thickness of Insulation', status: 'covered', noteCount: 5, pyqCount: 4, pyqYears: [2022, 2023, 2024, 2025], pyqQuestions: ['Derive critical radius of insulation for cylindrical pipe and electrical cable.'] },
        ]
      },
      {
        id: 'ht-u2',
        name: 'Unit 2: Convection & Heat Exchangers',
        topics: [
          { id: 'ht-t2', name: 'LMTD & NTU Method for Heat Exchangers', status: 'covered', noteCount: 4, pyqCount: 3, pyqYears: [2023, 2024, 2025], pyqQuestions: ['Derive LMTD expression for parallel flow and counter flow heat exchangers.'] },
        ]
      }
    ]
  },

  // --------------------------------------------------------------------------
  // 7. BCA Semester 3
  // --------------------------------------------------------------------------
  {
    id: 'bca-java',
    name: 'Core Java Programming',
    code: 'BCA301',
    semester: 3,
    department: 'BCA',
    scheme: '2023 Scheme',
    coverage: 80,
    units: [
      {
        id: 'bcaj-u1',
        name: 'Unit 1: Java Basics & OOP Concepts',
        topics: [
          { id: 'bcaj-t1', name: 'Java Virtual Machine (JVM) & Bytecode Architecture', status: 'covered', noteCount: 4, pyqCount: 3, pyqYears: [2023, 2024], pyqQuestions: ['Explain JVM, JRE, and JDK architecture with block diagrams.'] },
          { id: 'bcaj-t2', name: 'Inheritance, Packages & Access Specifiers', status: 'covered', noteCount: 5, pyqCount: 3, pyqYears: [2024, 2025], pyqQuestions: ['Write Java program illustrating multilevel inheritance and super keyword.'] },
        ]
      }
    ]
  },
  {
    id: 'bca-web',
    name: 'Web Technologies & JavaScript',
    code: 'BCA304',
    semester: 3,
    department: 'BCA',
    scheme: '2023 Scheme',
    coverage: 86,
    units: [
      {
        id: 'bcaw-u1',
        name: 'Unit 1: HTML5, CSS3 & Responsive Design',
        topics: [
          { id: 'bcaw-t1', name: 'CSS Flexbox & Grid Systems', status: 'covered', noteCount: 5, pyqCount: 3, pyqYears: [2023, 2024], pyqQuestions: ['Design a responsive 3-column layout using CSS Flexbox.'] },
          { id: 'bcaw-t2', name: 'DOM Manipulation & Event Handling in JS', status: 'covered', noteCount: 6, pyqCount: 4, pyqYears: [2024, 2025], pyqQuestions: ['Write JavaScript code to validate student registration form.'] },
        ]
      }
    ]
  }
];
