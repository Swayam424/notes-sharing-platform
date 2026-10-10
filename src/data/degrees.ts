export interface DegreeOption {
  id: string;
  name: string;
  shortName: string;
  durationLabel: string;
  years: number;
  totalSemesters: number;
}

export const DEGREE_OPTIONS: DegreeOption[] = [
  { id: 'btech', name: 'B.Tech / B.E.', shortName: 'B.Tech', durationLabel: '4 Years • 8 Sems', years: 4, totalSemesters: 8 },
  { id: 'bca', name: 'BCA', shortName: 'BCA', durationLabel: '3 Years • 6 Sems', years: 3, totalSemesters: 6 },
  { id: 'mca', name: 'MCA', shortName: 'MCA', durationLabel: '2 Years • 4 Sems', years: 2, totalSemesters: 4 },
  { id: 'bsc', name: 'B.Sc Computer Science / IT', shortName: 'B.Sc', durationLabel: '3 Years • 6 Sems', years: 3, totalSemesters: 6 },
  { id: 'mtech', name: 'M.Tech / M.E.', shortName: 'M.Tech', durationLabel: '2 Years • 4 Sems', years: 2, totalSemesters: 4 },
  { id: 'diploma', name: 'Diploma (Polytechnic)', shortName: 'Diploma', durationLabel: '3 Years • 6 Sems', years: 3, totalSemesters: 6 },
  { id: 'dual', name: 'Integrated Dual Degree (B.Tech + M.Tech)', shortName: 'Dual Degree', durationLabel: '5 Years • 10 Sems', years: 5, totalSemesters: 10 }
];

export interface StreamPreset {
  id: string;
  name: string;
  shortCode: string;
  icon: string;
  desc: string;
}

export const STREAM_PRESETS: StreamPreset[] = [
  { id: 'cse', name: 'Computer Science & Engineering', shortCode: 'CSE', icon: '💻', desc: 'Algorithms, OS, DBMS, Networks, Architecture' },
  { id: 'it', name: 'Information Technology', shortCode: 'IT', icon: '🌐', desc: 'Software engineering, Web, Cloud, Databases' },
  { id: 'ai_ds', name: 'AI & Data Science', shortCode: 'AI/DS', icon: '🤖', desc: 'Machine Learning, Neural Networks, Big Data' },
  { id: 'ece', name: 'Electronics & Communication', shortCode: 'ECE', icon: '⚡', desc: 'Signals, Microprocessors, VLSI, Embedded' },
  { id: 'ee', name: 'Electrical Engineering', shortCode: 'EE', icon: '🔋', desc: 'Power Systems, Control Theory, Machines' },
  { id: 'mech', name: 'Mechanical Engineering', shortCode: 'MECH', icon: '⚙️', desc: 'Thermodynamics, Mechanics, CAD/CAM' },
];

export function getStreamShortCode(streamName?: string): string {
  if (!streamName) return 'ENG';
  const found = STREAM_PRESETS.find(p => p.name.toLowerCase() === streamName.toLowerCase() || p.id === streamName.toLowerCase());
  if (found) return found.shortCode;
  // If custom stream, return first 4 uppercase letters
  const words = streamName.trim().split(/\s+/);
  if (words.length > 1) {
    return words.map(w => w[0]).join('').slice(0, 4).toUpperCase();
  }
  return streamName.slice(0, 4).toUpperCase();
}
