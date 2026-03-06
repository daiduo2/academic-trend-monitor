// arXiv Taxonomy - Full names for display
export const TAXONOMY = {
  // Layer 1 - Major categories
  categories: {
    'cs': {
      name: 'Computer Science',
      description: 'Computing and information technology'
    },
    'math': {
      name: 'Mathematics',
      description: 'Pure and applied mathematics'
    },
    'physics': {
      name: 'Physics',
      description: 'General physics disciplines'
    },
    'astro-ph': {
      name: 'Astrophysics',
      description: 'Astronomy and astrophysics'
    },
    'cond-mat': {
      name: 'Condensed Matter',
      description: 'Condensed matter physics'
    },
    'hep': {
      name: 'High Energy Physics',
      description: 'Particle physics and field theory'
    },
    'nucl': {
      name: 'Nuclear Physics',
      description: 'Nuclear structure and reactions'
    },
    'quant-ph': {
      name: 'Quantum Physics',
      description: 'Quantum mechanics and quantum information'
    },
    'gr-qc': {
      name: 'General Relativity and Quantum Cosmology',
      description: 'Gravitation and cosmology'
    },
    'math-ph': {
      name: 'Mathematical Physics',
      description: 'Mathematical methods in physics'
    },
    'nlin': {
      name: 'Nonlinear Sciences',
      description: 'Nonlinear dynamics and chaos'
    },
    'stat': {
      name: 'Statistics',
      description: 'Statistics and data analysis'
    },
    'q-bio': {
      name: 'Quantitative Biology',
      description: 'Biological modeling and computation'
    },
    'q-fin': {
      name: 'Quantitative Finance',
      description: 'Financial mathematics and modeling'
    },
    'eess': {
      name: 'Electrical Engineering and Systems Science',
      description: 'Engineering and signal processing'
    },
    'econ': {
      name: 'Economics',
      description: 'Economic theory and applications'
    },
    'math-ph': {
      name: 'Mathematical Physics',
      description: 'Mathematical methods in physics'
    },
    'nlin': {
      name: 'Nonlinear Sciences',
      description: 'Nonlinear dynamics and chaos'
    }
  },

  // Layer 2 - Subcategories
  subcategories: {
    // Computer Science
    'cs.AI': 'Artificial Intelligence',
    'cs.AR': 'Hardware Architecture',
    'cs.CC': 'Computational Complexity',
    'cs.CE': 'Computational Engineering',
    'cs.CG': 'Computational Geometry',
    'cs.CL': 'Computation and Language (NLP)',
    'cs.CR': 'Cryptography and Security',
    'cs.CV': 'Computer Vision',
    'cs.CY': 'Computers and Society',
    'cs.DB': 'Databases',
    'cs.DC': 'Distributed Computing',
    'cs.DL': 'Digital Libraries',
    'cs.DM': 'Discrete Mathematics',
    'cs.DS': 'Data Structures',
    'cs.ET': 'Emerging Technologies',
    'cs.FL': 'Formal Languages',
    'cs.GR': 'Graphics',
    'cs.GT': 'Game Theory',
    'cs.HC': 'Human-Computer Interaction',
    'cs.IR': 'Information Retrieval',
    'cs.IT': 'Information Theory',
    'cs.LG': 'Machine Learning',
    'cs.LO': 'Logic in Computer Science',
    'cs.MA': 'Multiagent Systems',
    'cs.MM': 'Multimedia',
    'cs.NE': 'Neural and Evolutionary Computing',
    'cs.NI': 'Networking and Internet Architecture',
    'cs.OS': 'Operating Systems',
    'cs.PF': 'Performance',
    'cs.PL': 'Programming Languages',
    'cs.RO': 'Robotics',
    'cs.SC': 'Symbolic Computation',
    'cs.SD': 'Sound',
    'cs.SE': 'Software Engineering',
    'cs.SI': 'Social and Information Networks',
    'cs.SY': 'Systems and Control',

    // Mathematics
    'math.AC': 'Commutative Algebra',
    'math.AG': 'Algebraic Geometry',
    'math.AP': 'Analysis of PDEs',
    'math.AT': 'Algebraic Topology',
    'math.CA': 'Classical Analysis',
    'math.CO': 'Combinatorics',
    'math.CT': 'Category Theory',
    'math.CV': 'Complex Variables',
    'math.DG': 'Differential Geometry',
    'math.DS': 'Dynamical Systems',
    'math.FA': 'Functional Analysis',
    'math.GM': 'General Mathematics',
    'math.GN': 'General Topology',
    'math.GR': 'Group Theory',
    'math.GT': 'Geometric Topology',
    'math.HO': 'History and Overview',
    'math.IT': 'Information Theory',
    'math.KT': 'K-Theory',
    'math.LO': 'Logic',
    'math.MG': 'Metric Geometry',
    'math.MP': 'Mathematical Physics',
    'math.NA': 'Numerical Analysis',
    'math.NT': 'Number Theory',
    'math.OA': 'Operator Algebras',
    'math.OC': 'Optimization and Control',
    'math.PR': 'Probability',
    'math.QA': 'Quantum Algebra',
    'math.RA': 'Rings and Algebras',
    'math.RT': 'Representation Theory',
    'math.SG': 'Symplectic Geometry',
    'math.SP': 'Spectral Theory',
    'math.ST': 'Statistics Theory',

    // Astrophysics
    'astro-ph.CO': 'Cosmology and Nongalactic Astrophysics',
    'astro-ph.EP': 'Earth and Planetary Astrophysics',
    'astro-ph.GA': 'Galaxy Astrophysics',
    'astro-ph.HE': 'High Energy Astrophysics',
    'astro-ph.IM': 'Instrumentation and Methods',
    'astro-ph.SR': 'Solar and Stellar Astrophysics',

    // Condensed Matter
    'cond-mat.dis-nn': 'Disordered Systems and Neural Networks',
    'cond-mat.mes-hall': 'Mesoscale and Nanoscale Physics',
    'cond-mat.mtrl-sci': 'Materials Science',
    'cond-mat.other': 'Other Condensed Matter',
    'cond-mat.quant-gas': 'Quantum Gases',
    'cond-mat.soft': 'Soft Condensed Matter',
    'cond-mat.stat-mech': 'Statistical Mechanics',
    'cond-mat.str-el': 'Strongly Correlated Electrons',
    'cond-mat.supr-con': 'Superconductivity',

    // Physics
    'physics.acc-ph': 'Accelerator Physics',
    'physics.ao-ph': 'Atmospheric and Oceanic Physics',
    'physics.app-ph': 'Applied Physics',
    'physics.atom-ph': 'Atomic Physics',
    'physics.bio-ph': 'Biological Physics',
    'physics.chem-ph': 'Chemical Physics',
    'physics.class-ph': 'Classical Physics',
    'physics.comp-ph': 'Computational Physics',
    'physics.data-an': 'Data Analysis',
    'physics.ed-ph': 'Physics Education',
    'physics.flu-dyn': 'Fluid Dynamics',
    'physics.geo-ph': 'Geophysics',
    'physics.hist-ph': 'History of Physics',
    'physics.ins-det': 'Instrumentation and Detectors',
    'physics.med-ph': 'Medical Physics',
    'physics.optics': 'Optics',
    'physics.plasm-ph': 'Plasma Physics',
    'physics.pop-ph': 'Popular Physics',
    'physics.soc-ph': 'Physics and Society',
    'physics.space-ph': 'Space Physics',

    // Statistics
    'stat.AP': 'Applications',
    'stat.CO': 'Computation',
    'stat.ME': 'Methodology',
    'stat.ML': 'Machine Learning',
    'stat.OT': 'Other Statistics',
    'stat.TH': 'Statistics Theory',

    // Quantitative Biology
    'q-bio.BM': 'Biomolecules',
    'q-bio.CB': 'Cell Behavior',
    'q-bio.GN': 'Genomics',
    'q-bio.MN': 'Molecular Networks',
    'q-bio.NC': 'Neurons and Cognition',
    'q-bio.OT': 'Other Quantitative Biology',
    'q-bio.PE': 'Populations and Evolution',
    'q-bio.QM': 'Quantitative Methods',
    'q-bio.SC': 'Subcellular Processes',
    'q-bio.TO': 'Tissues and Organs',

    // Quantitative Finance
    'q-fin.CP': 'Computational Finance',
    'q-fin.EC': 'Economics',
    'q-fin.GN': 'General Finance',
    'q-fin.MF': 'Mathematical Finance',
    'q-fin.PM': 'Portfolio Management',
    'q-fin.PR': 'Pricing of Securities',
    'q-fin.RM': 'Risk Management',
    'q-fin.ST': 'Statistical Finance',
    'q-fin.TR': 'Trading and Market Microstructure',

    // Electrical Engineering
    'eess.AS': 'Audio and Speech Processing',
    'eess.IV': 'Image and Video Processing',
    'eess.SP': 'Signal Processing',
    'eess.SY': 'Systems and Control',

    // Economics
    'econ.EM': 'Econometrics',
    'econ.GN': 'General Economics',
    'econ.TH': 'Theoretical Economics',

    // Nonlinear Sciences
    'nlin.AO': 'Adaptation and Self-Organizing Systems',
    'nlin.CD': 'Chaotic Dynamics',
    'nlin.CG': 'Cellular Automata',
    'nlin.PS': 'Pattern Formation',
    'nlin.SI': 'Exactly Solvable and Integrable Systems',

    // High Energy Physics (under hep layer1)
    'hep.th': 'Theory',
    'hep.ph': 'Phenomenology',
    'hep.ex': 'Experiment',
    'hep.lat': 'Lattice',

    // Nuclear Physics (under nucl layer1)
    'nucl.th': 'Theory',
    'nucl.ex': 'Experiment'
  },

  // Helper functions
  getCategoryName(code) {
    return this.categories[code]?.name || code.toUpperCase();
  },

  getCategoryDescription(code) {
    return this.categories[code]?.description || '';
  },

  getSubcategoryName(fullCode) {
    return this.subcategories[fullCode] || fullCode;
  },

  getLayer1Display(code) {
    const name = this.getCategoryName(code);
    return `${code.toUpperCase()} - ${name}`;
  },

  getLayer2Display(layer1, layer2) {
    if (layer2 === '_direct') {
      return `${layer1.toUpperCase()} (Direct)`;
    }
    // Handle special cases like hep.th, nucl.th
    const fullCode = `${layer1}.${layer2}`;
    const name = this.getSubcategoryName(fullCode);
    // For hep.th style, display as "hep.th - Theory"
    return `${fullCode} - ${name}`;
  }
};
