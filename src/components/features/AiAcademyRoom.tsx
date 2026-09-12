'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { safeLocalStorage } from '@/lib/storage';
import { FormattedMarkdown } from '@/components/features/FormattedMarkdown';
import {
  Sparkles,
  BookOpen,
  GraduationCap,
  ChevronRight,
  Atom,
  FlaskConical,
  Dna,
  Triangle,
  Cpu,
  BarChart2,
  HelpCircle,
  Search,
  BookMarked,
  Layers,
  Award,
  ArrowRight,
  MessageSquare,
  Send,
  Loader2,
  Bookmark,
  CheckCircle,
  FileText,
  BookmarkCheck,
  ChevronDown,
  Info,
  Calendar,
  Layers3,
  Lightbulb,
  Check,
  AlertCircle,
  Copy,
  Image as ImageIcon,
  RefreshCw,
  Maximize2,
  Key
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'student' | 'tutor';
  text: string;
}

interface Chapter {
  title: string;
  topics: string[];
}

interface Chapter {
  title: string;
  topics: string[];
}

const SYLLABUS_BLUEPRINTS: Record<string, Record<'1st Paper' | '2nd Paper', Record<'NCTB' | 'International', Chapter[]>>> = {
  'Physics': {
    '1st Paper': {
      'NCTB': [
        {
          title: 'Chapter 1: Physical World & Measurement (ভৌত জগৎ ও পরিমাপ)',
          topics: ['Physical quantities & Dimensions', 'Significant figures & Logarithm grids', 'Standard scientific measurement errors', 'Slide Calipers and Screw gauge verification']
        },
        {
          title: 'Chapter 2: Vector (ভেক্টর)',
          topics: ['Vector addition & Law of Parallelogram', 'Vector dot and cross product geometry', 'Gradient, Divergence and Curl principles', 'River crossing velocity calculations']
        },
        {
          title: 'Chapter 3: Dynamics (গতিবিদ্যা)',
          topics: ['Equations of uniformly accelerated motion', 'Projectile motion trajectories & range formulas', 'Relative velocity coordinates', 'Instantaneous acceleration metrics']
        },
        {
          title: 'Chapter 4: Newtonian Mechanics (বলবিদ্যা)',
          topics: ['Newtonian laws of motion & applications', 'Inertial and non-inertial frames', 'Linear momentum conservation & impulse', 'Centripetal force, banked roads and spinning mechanics']
        },
        {
          title: 'Chapter 5: Work, Energy & Power (কাজ, শক্তি ও ক্ষমতা)',
          topics: ['Work done by variable forces', 'Conservation of mechanical energy', 'Spring potential energy derivation', 'Engine efficiency calculations']
        },
        {
          title: 'Chapter 6: Gravitation & Gravity (মহাকর্ষ ও অভিকর্ষ)',
          topics: ['Newtonian law of universal gravitation', 'Variation of gravity g with altitude & latitude', 'Escape velocity derivation guidelines', 'Geo-stationary orbits & satellite dynamics']
        },
        {
          title: 'Chapter 7: Structural Properties of Matter (পদার্থের গাঠনিক ধর্ম)',
          topics: ['Elastic parameters - Hookes law & Moduli', 'Surface tension & capillary rise forces', 'Viscosity laws - Stokes equation & terminal speed', 'Fluids in rest - Pascals law & buoyant fields']
        },
        {
          title: 'Chapter 8: Periodic Motion (পর্যাবৃত্ত গতি)',
          topics: ['Differential equation of SHM', 'Structure and laws of Simple Pendulum', 'Energy distribution in Periodic motion', 'Formulas for determination of "g"']
        },
        {
          title: 'Chapter 9: Waves (তরঙ্গ)',
          topics: ['Progressive and stationary wave equations', 'Speed of sound waves - Laplace correction', 'Superposition of waves & visual beats', 'Doppler effect frequency shifting rules']
        },
        {
          title: 'Chapter 10: Ideal Gas & Kinetic Theory (আদর্শ গ্যাস ও গ্যাসীয় গতিতত্ত্ব)',
          topics: ["Boyle's Law & Charles's Law experimental verification", 'Root Mean Square (RMS) velocity derivation', 'Relative Humidity and Dew Point formulas', 'Gaseous kinetic energy calculations']
        }
      ],
      'International': [
        {
          title: 'Unit 1: Quantum & Classical Mechanics',
          topics: ['Newtonian Kinematics & Vector Fields', 'Gravitational orbits & Keplerian potentials', 'Moment of Inertia tensors', 'Conservative work & potential mapping']
        },
        {
          title: 'Unit 3: Thermodynamics & Kinetic Systems',
          topics: ['Laws of thermodynamics & Entropy flux', 'PV diagrams & Carnot cyclic processes', 'Maxwell-Boltzmann molecular dispersions', 'Heat capacity mechanics']
        }
      ]
    },
    '2nd Paper': {
      'NCTB': [
        {
          title: 'Chapter 1: Thermodynamics (তাপগতিবিদ্যা)',
          topics: ['First Law of Thermodynamics & PV Diagrams', 'Isothermal and Adiabatic expansion/compression reactions', 'Carnot Engine cyclic efficiency calculation', 'Entropy variation laws & disorder equations']
        },
        {
          title: 'Chapter 2: Static Electricity (স্থির তড়িৎ)',
          topics: ["Coulomb's Law vector formulation & electric field intensity", 'Electric potential of point charge and shell', 'Parallel plate capacitor capacitance & dielectric insertion', 'Electric dipoles & torque equations']
        },
        {
          title: 'Chapter 3: Current Electricity (চল তড়িৎ)',
          topics: ["Ohm's Law, drift velocity & resistivity equations", "Kirchhoff's Laws and Wheatstone bridge balance conditions", 'Shunt derivation & ammeter/voltmeter range extension', 'Potentiometer principles for comparing EMF']
        },
        {
          title: 'Chapter 4: Magnetic Effect of Current (তড়িৎ প্রবাহের চৌম্বক ক্রিয়া)',
          topics: ["Biot-Savart Law & circular loop magnetic field", "Ampere's Circuital Law & solenoid applications", "Force on moving charge in magnetic fields (Lorentz)", "Galvanometer conversion and torque arrays"]
        },
        {
          title: 'Chapter 5: Electromagnetic Induction and AC (তাড়িতচৌম্বক আবেশ ও পরিবর্তী প্রবাহ)',
          topics: ["Faraday's laws of induction & Lenz's Law", "Self and Mutual inductance coefficients", "Alternating current impedance, reactance & resonance", "AC Transformer mechanics & efficiency formulas"]
        },
        {
          title: 'Chapter 6: Geometrical Optics (জ্যামিতিক আলোকবিজ্ঞান)',
          topics: ["Refraction at spherical surfaces & thin lenses", "Lens makers formula & linear magnification", "Prism refraction and angular dispersion equations", "Telescopes & Compound microscopes resolution limits"]
        },
        {
          title: 'Chapter 7: Physical Optics (ভৌত আলোকবিজ্ঞান)',
          topics: ["Wave theory of light - Huygens principle", "Youngs Double Slit experiment for wave interference", "Diffraction of light at single slit & grating grids", "Polarization of light waves & Malus Law"]
        },
        {
          title: 'Chapter 8: Introduction to Modern Physics (আধুনিক পদার্থবিজ্ঞানের সূচনা)',
          topics: ["Lorentz coordinate transformations & Einstein relativity", "Time dilation, length contraction & mass variance", "Photoelectric effect - Einstein equation & work functions", "De Broglie wave-particle duality relations"]
        },
        {
          title: 'Chapter 9: Atomic Model and Nuclear Physics (পরমাণু মডেল ও নিউক্লিয়ার পদার্থবিজ্ঞান)',
          topics: ["Rutherford & Bohr hydrogen atom orbital models", "Radioactive decay law, half-life & mean-life", "Mass defect, nuclear binding energy & fusion", "Fission chains & nuclear reactor systems structure"]
        },
        {
          title: 'Chapter 10: Semiconductor & Electronics (সেমিকন্ডাক্টর ও ইলেকট্রনিক্স)',
          topics: ['Energy band diagrams for metals, insulators & semiconductors', 'P-N junction diode forward & reverse bias structures', 'BJT Transistor configuration & amplification operations', 'Logic gates realization using transistor switching']
        },
        {
          title: 'Chapter 11: Astronomy (জ্যোতির্বিজ্ঞান)',
          topics: ["Syllabus introduction of cosmological expansion", "Hubble's Law & Red-shift calculations", "Stellar evolution phases - Chandrasekhar limits", "Big Bang theory, Dark Matter & Cosmic microwave background"]
        }
      ],
      'International': [
        {
          title: 'Unit 4: Electromagnetism & Induction',
          topics: ["Faraday's & Lenz's Induction Laws", "Magnetic Flux calculations", "AC transformers & reactance configurations"]
        }
      ]
    }
  },
  'Chemistry': {
    '1st Paper': {
      'NCTB': [
        {
          title: 'Chapter 1: Safe Use of Laboratory (ল্যাবরেটরির নিরাপদ ব্যবহার)',
          topics: ['Laboratory safety rules & dress code protocols', 'Hazardous symbols & chemical disposal standards', 'Preparation of molar, molal & standard solutions', 'First aid measures for chemical splashes']
        },
        {
          title: 'Chapter 2: Qualitative Chemistry (গুণগত রসায়ন)',
          topics: ['Bohr Atomic Model vs Rutherford rules', 'Quantum numbers details (n, l, m, s)', 'Aufbau, Hund, Pauli exclusion practices', 'Emission spectrum & Rydberg formula calculations']
        },
        {
          title: 'Chapter 3: Periodic Properties and Chemical Bonding (পর্যাবৃত্ত ধর্ম ও রাসায়নিক বন্ধন)',
          topics: ['S, P, D, F block classification of elements', 'Periodic properties trends - electronegativity, electron affinity', 'Hybridization of atomic orbitals - Sp3, Sp2, Sp', 'VSEPR theory & geometric molecular setups']
        },
        {
          title: 'Chapter 4: Chemical Changes (রাসায়নিক পরিবর্তন)',
          topics: ['Law of Mass Action and Kc/Kp dynamic formula', 'Le Chatelier principle & industrial applications', 'pH and Buffer solutions theoretical derivation', 'Hess\'s law of constant heat summation']
        },
        {
          title: 'Chapter 5: Working Chemistry (কর্মমুখী রসায়ন)',
          topics: ['Preservation protocols of organic food items', 'Preparation of Vinegar & safety standards', 'Saponification chemical reactions & soap frameworks', 'Emulsion and suspension stabilization metrics']
        }
      ],
      'International': [
        {
          title: 'Unit 1: Atomic Structure & Quantum Levels',
          topics: ['Photoelectric effect and Rydberg equations', 'Orbital probability maps and wave potentials', 'Mass spectrometry atomic isotopes']
        }
      ]
    },
    '2nd Paper': {
      'NCTB': [
        {
          title: 'Chapter 1: Environmental Chemistry (পরিবেশ রসায়ন)',
          topics: ["Boyle and Charles laws & gas constants", "Dalton law of partial pressure calculations", "Greenhouse effect & standard air pollutants", "BOD, COD and TDS thresholds of drinking water"]
        },
        {
          title: 'Chapter 2: Organic Chemistry (জৈব রসায়ন)',
          topics: ['Nomenclature of hydrocarbons & groups', 'Isomerism - structural and stereoisomerism', 'Electrophilic and nucleophilic substitution channels', 'Identification of functional groups using standards']
        },
        {
          title: 'Chapter 3: Quantitative Chemistry (পরিমাণগত রসায়ন)',
          topics: ['Molarity, molality, PPM concentration metrics', 'Redox reaction equation balancing systems', 'Faraday laws of electrolysis metal depositions', 'Acid-base volumetric titration protocols']
        },
        {
          title: 'Chapter 4: Electrochemistry (তড়িৎ রসায়ন)',
          topics: ['Nernst equation for cell potential determination', 'Standard hydrogen electrode & half-cell reactions', 'Dry cells, lead-acid & fuel cell operations']
        },
        {
          title: 'Chapter 5: Economic Chemistry (অর্থনৈতিক রসায়ন)',
          topics: ['Glass, paper and ceramic chemical engineering processes', 'Coal processing and petroleum fractional distillations', 'Water treatment plant (WTP) chemical designs', 'Leather tanning chemistry & effluent management']
        }
      ],
      'International': [
        {
          title: 'Unit 2: Organic Synthesis & Mechanisms',
          topics: ['Alkanes radical chlorination rates', 'Aldol condensation & Grignard reagents protocols', 'NMR spectroscopy spectrum structures']
        }
      ]
    }
  },
  'Biology': {
    '1st Paper': {
      'NCTB': [
        {
          title: 'Chapter 1: Cell & Its Structure (কোষ ও এর গঠন)',
          topics: ['Structure and model of Fluid Mosaic Membrane', 'Ultra-structure of Mitochondria and Chloroplast', 'DNA double-helix Watson-Crick parameters', 'Transcription and translation stages']
        },
        {
          title: 'Chapter 2: Cell Division (কোষ বিভাজন)',
          topics: ['Stages of Mitosis lifecycle progression', 'Meiosis I prophase-1 substages (Leptotene to Diakinesis)', 'Significance of Crossing Over genetics', 'Cancer cell dynamics']
        },
        {
          title: 'Chapter 3: Cell Chemistry (কোষ রসায়ন)',
          topics: ['Structure of simple carbohydrates & linkages', 'Amino acid configurations and peptide sequences', 'Enzyme classification and lock-key lock arrays']
        },
        {
          title: 'Chapter 4: Microorganism (অণুজীব)',
          topics: ['Viral configurations - T2 bacteriophage replication cycle', 'Bacterial cell anatomy and binary fission', 'Malaria Plasmodium parasite life cycle stages']
        },
        {
          title: 'Chapter 5: Algae and Fungi (শৈবাল ও ছত্রাক)',
          topics: ['Ulothrix structure and reproduction schemes', 'Agaricus anatomy, gills, and basidiospores', 'Lichen symbiotic frameworks']
        },
        {
          title: 'Chapter 6: Bryophyta and Pteridophyta (ব্রায়োফাইটা ও টেরিডোফাইটা)',
          topics: ['Riccia morphology and visual life cycles', 'Pteris structure and multi-nucleate gametophyte progress', 'Alternation of generations biological pathways']
        },
        {
          title: 'Chapter 7: Gymnosperm and Angiosperm (নগ্নবীজী ও আবৃতবীজী উদ্ভিদ)',
          topics: ['Cycas characteristics and visual microsporophylls', 'Cruciferae and Poaceae floral system diagrams', 'Monocot vs Dicot structural comparisons']
        },
        {
          title: 'Chapter 8: Tissue and Tissue System (টিস্যু ও টিস্যুতন্ত্র)',
          topics: ['Meristematic tissues & active classifications', 'Vascular bundle layouts (conjoint, collateral, radial)', 'Epidermal appendages and stomatal systems']
        },
        {
          title: 'Chapter 9: Plant Physiology (উদ্ভিদ শারীরতত্ত্ব)',
          topics: ['Mineral absorption mechanisms (active vs passive)', 'Mechanism of open/close guard cell transpiration', 'Photosynthesis - C3 Calvin cycle pathways', 'C4 Hatch-Slack sugar generation flow']
        },
        {
          title: 'Chapter 10: Plant Reproduction (উদ্ভিদ প্রজনন)',
          topics: ['Microgametogenesis & pollen grains maturity', 'Megagametogenesis & egg apparatus structures', 'Double fertilization and seed formulation steps']
        },
        {
          title: 'Chapter 11: Biotechnology (জীবপ্রযুক্তি)',
          topics: ['Plant tissue culture protocols & micropropagation', 'Recombinant DNA technology (gene cloning plasmid)', 'Genetic modified organisms (GMOs) benefits', 'Insulin gene engineering mechanisms']
        },
        {
          title: 'Chapter 12: Environment, Distribution & Conservation (পরিবেশ, জীবের বিস্তার ও সংরক্ষণ)',
          topics: ['Halophyte and Hydrophyte adaptation trends', 'In-situ vs Ex-situ biodiversity preservation', 'Sundarbans mangrove ecosystems parameters']
        }
      ],
      'International': [
        {
          title: 'Unit 2: Cellular Energetics & Metaphysics',
          topics: ['ATP synthesis and proton motive chemiosmosis', 'Aerobic respiration Glycolytic chain', 'Rubisco enzymology kinetics']
        }
      ]
    },
    '2nd Paper': {
      'NCTB': [
        {
          title: 'Chapter 1: Animal Diversity & Classification (প্রাণীর বিভিন্নতা ও শ্রেণীবিন্যাস)',
          topics: ['Symmetry, coelom & segmentations in classification', 'Major animal phyla (Porifera to Chordata) with key examples', 'Classification of Class Mammalia criteria']
        },
        {
          title: 'Chapter 2: Animal Introduction (প্রাণীর পরিচিতি - হাইড্রা, ঘাসফড়িং ও রুই)',
          topics: ['Hydra body layers, nematocyst types & locomotion', 'Grasshopper digestive and respiratory systems', 'Rui fish blood vascular system development']
        },
        {
          title: 'Chapter 3: Human Physiology: Digestion (পরিপাক ও শোষণ)',
          topics: ['Salivary, gastric and pancreatic enzymatic actions', 'Intestinal absorption of standard lipids & sugars', 'Liver and bile detoxification chemical profiles']
        },
        {
          title: 'Chapter 4: Human Physiology: Blood (রক্ত ও সংবহন)',
          topics: ['Cardiac cycle phases & heart sound registrations', 'Double blood circulation loops', 'Natural and artificial heart pacemakers']
        },
        {
          title: 'Chapter 5: Human Physiology: Respiration (শ্বসন ও শ্বাসক্রিয়া)',
          topics: ['External pulmonic gas exchanges & partial pressures', 'Oxygen and Carbon dioxide hemoglobin transport channels', 'Lung volume indices (VC, TLC, RV)']
        },
        {
          title: 'Chapter 6: Human Physiology: Excretion (বর্জ্য ও নিষ্কাশন)',
          topics: ['Nephron functional unit filtration steps', 'Glomerular ultrafiltration rate mechanisms', 'ADH feedback systems & osmoregulatory loops']
        },
        {
          title: 'Chapter 7: Human Physiology: Locomotion (চলন ও অঙ্গচালনা)',
          topics: ['Main skeletal structures - Axial vs Appendicular', 'Skeletal muscle sliding filament theory actions', 'Joint ligaments & bone fracture repair cells']
        },
        {
          title: 'Chapter 8: Human Physiology: Coordination (সমন্বয় ও নিয়ন্ত্রণ)',
          topics: ['Nerve impulse synaptic propagation steps', 'Reflex arcs mechanical circuitry', 'Endocrine system pathways - Pituitary, Thyroid actions']
        },
        {
          title: 'Chapter 9: Human Physiology: Reproduction (মানব জীবনের ধারাবাহিকতা)',
          topics: ['Spermatogenesis and Oogenesis cycles', 'Maternal embryonic germ layers differentiations', 'In-vitro framework step models']
        },
        {
          title: 'Chapter 10: Human Body Immunology (মানবদেহের প্রতিরক্ষা)',
          topics: ['First line, second line & third line shields', 'Antibody immunoglobulin classes (IgG, IgA, IgM)', 'Vaccination induced memory lymphocyte triggers']
        },
        {
          title: 'Chapter 11: Genetics & Evolution (জিনতত্ত্ব ও বিবর্তন)',
          topics: ["Mendel's first & second laws deviations", "Sex-linked inheritance and genetic disorders (hemophilia, color blindness)", "Neo-Darwinism evolutionary factors & theories"]
        },
        {
          title: 'Chapter 12: Animal Behavior (প্রাণীর আচরণ)',
          topics: ['Innate behavior patterns - FAP, Taxes, Reflexes', 'Learned behaviors - Habituation, Pavlovian conditioning', 'Sociobiology - Honeybee dance communication loops']
        }
      ],
      'International': [
        {
          title: 'Unit 5: Heredity & Genetic Matrices',
          topics: ['Mendelian laws and chromosomal crossovers', 'Restriction endonuclease and plasmid mapping', 'Polymerase chain reactions (PCR)', 'Recombinant DNA sequencing steps']
        }
      ]
    }
  },
  'Higher Math': {
    '1st Paper': {
      'NCTB': [
        {
          title: 'Chapter 1: Matrices & Determinants (ম্যাট্রিক্স ও নির্ণায়ক)',
          topics: ["Symmetric, skew-symmetric, singular and inverse matrices", "Cramer's rule for solving linear equations", "Properties of determinants with step proofs"]
        },
        {
          title: 'Chapter 2: Vector (ভেক্টর)',
          topics: ['Dot & Cross products vector geometry', 'Coplanarity criteria of multiple vectors', 'Work as scalar and Torque as vector calculations']
        },
        {
          title: 'Chapter 3: Straight Lines (সরলরেখা)',
          topics: ["Distance, coordinate division and centroid equations", "Slopes of lines and conditions of parallel/perpendicular lines", "Intersection of lines and perpendicular distance derivations"]
        },
        {
          title: 'Chapter 4: Circle (বৃত্ত)',
          topics: ['General equations of circles & radius derivations', 'Tangent equations of concentric circles', 'Length of chords and intersection steps']
        },
        {
          title: 'Chapter 5: Permutations and Combinations (বিন্যাস ও সমাবেশ)',
          topics: ['Fundamental principles of counting objects', 'Permutations of similar objects & repeated items', 'Combinations selection rules and geometric counts']
        },
        {
          title: 'Chapter 6: Trigonometric Ratios (ত্রিকোণমিতিক অনুপাত)',
          topics: ['Quadrant systems boundary angles conversions', 'General functions domains and trigonometric values', 'Radian and degree system conversions']
        },
        {
          title: 'Chapter 7: Joint Trigonometric Functions (সংযুক্ত কোণের ত্রিকোণমিতিক অনুপাত)',
          topics: ['Compound angle formulas - Sin(A+B), Cos(A+B)', 'Multiple & Sub-multiple formulas - Sin2A, Cos2A', 'Transformation of sums into products metrics']
        },
        {
          title: 'Chapter 8: Functions & Graphs of Functions (ফাংশন ও ফাংশনের লেখচিত্র)',
          topics: ['Finding Domain and Range of real functions', 'One-one, Onto and custom Inverse functions', 'Trigonometric and logarithmic graphing procedures']
        },
        {
          title: 'Chapter 9: Differentiation (অন্তরীকরণ)',
          topics: ['Limit definitions and derivatives from first principles', 'Product, quotient and chain rules of differentiation', 'Successive differentiation & maximas/minimas']
        },
        {
          title: 'Chapter 10: Integration (যোগজীকরণ)',
          topics: ['Integration by parts and substitution strategies', 'Area under standard curve geometric calculus', 'Definite integral fundamental theorems']
        }
      ],
      'International': [
        {
          title: 'Unit 2: Advanced Analysis & Complex planes',
          topics: ['Vector projections', '3D linear algebra matrices']
        }
      ]
    },
    '2nd Paper': {
      'NCTB': [
        {
          title: 'Chapter 3: Complex Numbers (জটিল সংখ্যা)',
          topics: ["Argand diagrams, modulus and argument coordinates", "Square root & cube root of unity math logic", "Euler's polar form formulation and proofs"]
        },
        {
          title: 'Chapter 6: Conics (কনিক)',
          topics: ['Parabola equation and geometric elements', 'Ellipse vertices, focus and eccentricity calculations', 'Hyperbola asymptote parameters', 'Standard coordinate translations']
        },
        {
          title: 'Chapter 7: Inverse Trigonometric Functions (বিপরীত ত্রিকোণমিতি)',
          topics: ['Inverse trigonometry parameters and domains', 'General solutions of structural trigonometric equations', 'Function graphing and periodicity mapping', 'Sine and Cosine rule proofs for triangles']
        }
      ],
      'International': [
        {
          title: 'Unit 4: Differential Geometry & Integrals',
          topics: ['Separation of variables calculus', 'Riemann accumulation thresholds', 'Linear differential integrations', 'Taylor and Maclaurin expansions']
        }
      ]
    }
  },
  'ICT': {
    '1st Paper': {
      'NCTB': [
        {
          title: 'Chapter 1: Information and Communication Technology: World & Bangladesh Perspective (তথ্য ও যোগাযোগ প্রযুক্তি: বিশ্ব ও বাংলাদেশ প্রেক্ষিত)',
          topics: ['Global Village concepts & virtual reality systems', 'Artificial Intelligence & Robotics applications', 'Cryosurgery, Biometrics and Nanotechnology', 'Genetic Engineering & cyber ethics rules']
        },
        {
          title: 'Chapter 2: Communication Systems & Networking (কমিউনিকেশন সিস্টেমস ও নেটওয়ার্কিং)',
          topics: ['Data transmission methods & modes', 'Fiber optic, coaxial and twisted-pair media', 'Mobile cell generations & wireless protocols', 'Network topologies (Star, Mesh, Ring) & Cloud storage']
        },
        {
          title: 'Chapter 3: Number Systems & Digital Devices (সংখ্যা পদ্ধতি ও ডিজিটাল ডিভাইস)',
          topics: ['Binary, Octal, Hexadecimal conversions', "2's complement subtraction operations", 'De Morgan\'s Law and logic gate realizations', 'Encoder, Decoder, Half & Full Adder schematics']
        },
        {
          title: 'Chapter 4: Web Design & HTML (ওয়েব ডিজাইন পরিচিতি এবং এইচটিএমএল)',
          topics: ['Structure of basic HTML tags & structures', 'Table, Hyperlink, and Image rendering syntaxes', 'Static CSS alignment configurations', 'Domain hosting and IP addressing scopes']
        },
        {
          title: 'Chapter 5: Programming Language C (প্রোগ্রামিং ভাষা)',
          topics: ['Key variables, keywords and data types', 'Conditional statements (if-else, switch-case)', 'Loop structures (for, while, do-while)', '1D and 2D arrays algorithms']
        },
        {
          title: 'Chapter 6: Database Management System (ডাটাবেজ ম্যানেজমেন্ট সিস্টেম)',
          topics: ['Concept of Database & DBMS architectures', 'Relational Database Management Concepts', 'Primary key, Foreign key & index models', 'Basic query language & SQL SELECT statement templates']
        }
      ],
      'International': [
        {
          title: 'Unit 1: Computation & Network topologies',
          topics: ['ISO OSI 7-Layer reference standards', 'Database Normalization rules (1NF, 2NF, 3NF)', 'SQL statements (SELECT, JOIN, WHERE alignments)', 'C++ OOP paradigms (Polymorphism & Inheritance)']
        }
      ]
    },
    '2nd Paper': {
      'NCTB': [
        {
          title: 'Chapter 1: Information and Communication Technology: World & Bangladesh Perspective (তথ্য ও যোগাযোগ প্রযুক্তি: বিশ্ব ও বাংলাদেশ প্রেক্ষিত)',
          topics: ['Global Village concept & virtual reality systems', 'Artificial Intelligence & Robotics applications', 'Cryosurgery, Biometrics and Nanotechnology', 'Genetic Engineering & cyber ethics rules']
        },
        {
          title: 'Chapter 2: Communication Systems & Networking (কমিউনিকেশন সিস্টেমস ও নেটওয়ার্কিং)',
          topics: ['Data transmission methods & modes', 'Fiber optic, coaxial and twisted-pair media', 'Mobile cell generations & wireless protocols', 'Network topologies (Star, Mesh, Ring) & Cloud storage']
        },
        {
          title: 'Chapter 3: Number Systems & Digital Devices (সংখ্যা পদ্ধতি ও ডিজিটাল ডিভাইস)',
          topics: ['Binary, Octal, Hexadecimal conversions', "2's complement subtraction operations", 'De Morgan\'s Law and logic gate realizations', 'Encoder, Decoder, Half & Full Adder schematics']
        },
        {
          title: 'Chapter 4: Web Design & HTML (ওয়েব ডিজাইন পরিচিতি এবং এইচটিএমএল)',
          topics: ['Structure of basic HTML tags & structures', 'Table, Hyperlink, and Image rendering syntaxes', 'Static CSS alignment configurations', 'Domain hosting and IP addressing scopes']
        },
        {
          title: 'Chapter 5: Programming Language C (প্রোগ্রামিং ভাষা)',
          topics: ['Key variables, keywords and data types', 'Conditional statements (if-else, switch-case)', 'Loop structures (for, while, do-while)', '1D and 2D arrays algorithms']
        },
        {
          title: 'Chapter 6: Database Management System (ডাটাবেজ ম্যানেজমেন্ট সিস্টেম)',
          topics: ['Concept of Database & DBMS architectures', 'Relational Database Management Concepts', 'Primary key, Foreign key & index models', 'Basic query language & SQL SELECT statement templates']
        }
      ],
      'International': [
        {
          title: 'Unit 1: Computation & Network topologies',
          topics: ['ISO OSI 7-Layer reference standards', 'Database Normalization rules (1NF, 2NF, 3NF)', 'SQL statements (SELECT, JOIN, WHERE alignments)', 'C++ OOP paradigms (Polymorphism & Inheritance)']
        }
      ]
    }
  }
};

interface PredefinedQuiz {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

const PREDEFINED_QUIZZES: Record<string, PredefinedQuiz[]> = {
  'Physics': [
    {
      question: "Which of the following is correct regarding a Simple Pendulum moved from sea level to the top of Mount Everest?",
      options: [
        "Gravity 'g' decrease, time period 'T' increases, the clock runs slow",
        "Gravity 'g' increases, time period 'T' decreases, the clock runs fast",
        "Gravity 'g' decreases, time period 'T' decreases, the clock runs fast",
        "Gravity 'g' increases, time period 'T' increases, the clock runs slow"
      ],
      correct: 0,
      explanation: "Since T = 2π * sqrt(L/g), and gravity 'g' decreases with altitude, 'T' increases meaning each oscillation takes longer, hence the clock runs slow."
    },
    {
      question: "At what angle should two vector forces of equal magnitude 'F' act so that their resultant's magnitude is also equal to 'F'?",
      options: ["0 degrees", "60 degrees", "90 degrees", "120 degrees"],
      correct: 3,
      explanation: "Using Resultant formula R^2 = A^2 + B^2 + 2AB cos(θ). If R = A = B = F, then F^2 = 2F^2 + 2F^2 cos(θ) => cos(θ) = -1/2, which gives θ = 120°."
    }
  ],
  'Chemistry': [
    {
      question: "In the context of Qualitative Chemistry, which block of quantum numbers characterizes the shape of an orbital?",
      options: [
        "Principal quantum number (n)",
        "Azimuthal quantum number (l)",
        "Magnetic quantum number (m)",
        "Spin quantum number (s)"
      ],
      correct: 1,
      explanation: "The azimuthal/orbital angular momentum quantum number 'l' determines the 3D shape (s, p, d, f) of the orbital."
    },
    {
      question: "Which pH buffer system plays the major role in maintaining human blood pH around 7.40?",
      options: [
        "Acetic acid / sodium acetate buffer",
        "H2CO3 / HCO3- (carbonic acid/bicarbonate) buffer",
        "Phosphate buffer system",
        "Ammonium chloride / ammonium hydroxide buffer"
      ],
      correct: 1,
      explanation: "The carbonic acid - bicarbonate dynamic buffer system regulates human arterial blood pH in physiological windows."
    }
  ],
  'Biology': [
    {
      question: "During which sub-stage of Prophase-I in Meiosis-1 is crossing-over visually facilitated and finished?",
      options: ["Leptotene", "Zygotene", "Pachytene", "Diplotene"],
      correct: 2,
      explanation: "Crossing over and homologous recombination occurs during the Pachytene stage, where bivalent chromatids create visual chiasmata."
    },
    {
      question: "In standard C4 plants, which enzyme conducts the initial carboxylation step inside Mesophyll cells?",
      options: ["Rubisco", "PEP Carboxylase", "Malate Dehydrogenase", "Enolase"],
      correct: 1,
      explanation: "PEP Carboxylase catalyzes the binding of CO2 to Phosphoenolpyruvate (PEP) in mesophyll rooms of C4 plants."
    }
  ],
  'Higher Math': [
    {
      question: "What is the eccentricity 'e' of a perfect Parabola?",
      options: ["e < 1", "e = 1", "e > 1", "e = 0"],
      correct: 1,
      explanation: "A parabola is defined as the locus of points where the distance to the focus equals the distance to the directrix, hence its ratio 'e' is exactly 1."
    },
    {
      question: "What is the value of the limit: lim(x -> 0) [sin(5x) / (2x)]?",
      options: ["5/2", "2/5", "1", "0"],
      correct: 0,
      explanation: "By rewriting: [sin(5x)/(5x)] * (5/2), since lim(u->0) sin(u)/u is 1, the limit evaluates directly to 5/2 (or via L'Hopital's rule)."
    }
  ],
  'ICT': [
    {
      question: "Which binary notation simplifies arithmetic circuits by representing subtraction as simple addition?",
      options: ["1's complement", "2's complement", "Sign-magnitude", "BCD representation"],
      correct: 1,
      explanation: "2's complement code simplifies microprocessor architecture by enabling subtraction calculations using common full-adder logical arrays."
    },
    {
      question: "Which SQL command is utilized to remove records from a relational table based on specific filter criteria?",
      options: ["DROP TABLE", "DELETE FROM", "REMOVE ROW", "TRUNCATE"],
      correct: 1,
      explanation: "'DELETE FROM' removes selected rows satisfying the 'WHERE' clause, while 'DROP' destroys the schema itself, and 'TRUNCATE' clears all row indexes."
    }
  ]
};

export const AiAcademyRoom: React.FC = () => {
  const { apiFetch, user, setUser, geminiApiKey, setGeminiApiKey, isKeyModalOpen, setIsKeyModalOpen } = useAuth();
  const { t, language } = useLanguage();



  const [subjectsList, setSubjectsList] = useState<string[]>(['Physics', 'Chemistry', 'Biology', 'Higher Math', 'ICT']);

  useEffect(() => {
    setAiLanguage(language === 'bn' ? 'bn_book' : 'en');
  }, [language]);

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const res = await apiFetch('/api/subjects');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            const names = data.map((item: any) => item.title);
            const combined = Array.from(new Set([...['Physics', 'Chemistry', 'Biology', 'Higher Math', 'ICT'], ...names]));
            setSubjectsList(combined);
          }
        }
      } catch (err) {
        console.error("AI Academy failed to fetch dynamic subjects list:", err);
      }
    };
    fetchSubjects();
  }, [apiFetch]);

  // Selected parameters — initialize with defaults (hydration-safe).
  // Saved values are loaded in a useEffect after mount to avoid mismatches.
  const [selectedSubject, setSelectedSubject] = useState<string>('Physics');
  const [selectedPaper, setSelectedPaper] = useState<'1st Paper' | '2nd Paper'>('1st Paper');
  const [curriculum, setCurriculum] = useState<'NCTB' | 'International'>('NCTB');
  const [difficulty, setDifficulty] = useState<'Basic' | 'Intermediate' | 'Advanced'>('Basic');
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [customTopic, setCustomTopic] = useState<string>('');

  // Custom expandable accordions for chapters
  const [activeChapterIndex, setActiveChapterIndex] = useState<number | null>(0);

  // Mode and loading states
  const [mode, setMode] = useState<'concept' | 'mcq' | 'creative_question' | 'ask_ai'>('concept');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [responseHtml, setResponseHtml] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Chat-specific state
  const [chatLogs, setChatLogs] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState<string>('');
  const [isAnswering, setIsAnswering] = useState<boolean>(false);
  const [aiLanguage, setAiLanguage] = useState<'en' | 'bn_book'>('en');

  // Gamification & bookmarks
  const [knowledgePoints, setKnowledgePoints] = useState<number>(120);
  const [studyStreak, setStudyStreak] = useState<number>(8);
  const [completedLessons, setCompletedLessons] = useState<number>(4);
  const [savedLessons, setSavedLessons] = useState<string[]>([]);
  const [isBookmarkedActive, setIsBookmarkedActive] = useState<boolean>(false);

  // Load saved state from localStorage after mount (hydration-safe)
  useEffect(() => {
    const sSub = safeLocalStorage.getItem('academy_selected_subject');
    if (sSub) setSelectedSubject(sSub);
    const sPaper = safeLocalStorage.getItem('academy_selected_paper');
    if (sPaper === '1st Paper' || sPaper === '2nd Paper') setSelectedPaper(sPaper);
    const sCurr = safeLocalStorage.getItem('academy_curriculum');
    if (sCurr === 'NCTB' || sCurr === 'International') setCurriculum(sCurr);
    const sDiff = safeLocalStorage.getItem('academy_difficulty');
    if (sDiff === 'Basic' || sDiff === 'Intermediate' || sDiff === 'Advanced') setDifficulty(sDiff);
    const sTopic = safeLocalStorage.getItem('academy_selected_topic');
    if (sTopic) setSelectedTopic(sTopic);
    const sCustom = safeLocalStorage.getItem('academy_custom_topic');
    if (sCustom) setCustomTopic(sCustom);
    const sChapter = safeLocalStorage.getItem('academy_active_chapter_index');
    if (sChapter !== null) {
      const n = Number(sChapter);
      if (!isNaN(n)) setActiveChapterIndex(n);
    }
    const sMode = safeLocalStorage.getItem('academy_mode');
    if (sMode === 'concept' || sMode === 'mcq' || sMode === 'creative_question' || sMode === 'ask_ai') setMode(sMode);
    const sHtml = safeLocalStorage.getItem('academy_response_html');
    if (sHtml) setResponseHtml(sHtml);
    const sChat = safeLocalStorage.getItem('academy_chat_logs');
    if (sChat) {
      try { setChatLogs(JSON.parse(sChat)); } catch (e) { console.error("Failed to parse saved chat logs", e); }
    }
    const sLang = safeLocalStorage.getItem('ai_language');
    if (sLang === 'en' || sLang === 'bn_book') setAiLanguage(sLang);
    const sKp = safeLocalStorage.getItem('academy_kp');
    if (sKp) { const n = Number(sKp); if (!isNaN(n)) setKnowledgePoints(n); }
    const sLessons = safeLocalStorage.getItem('academy_lessons');
    if (sLessons) { const n = Number(sLessons); if (!isNaN(n)) setCompletedLessons(n); }
  }, []);

  // Playable interactive MCQ State (Offline-first / robust game fallback)
  const [quizScore, setQuizScore] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [showingSolutions, setShowingSolutions] = useState<Record<number, boolean>>({});

  // Google Account AI Credits Key Integration (BYOK model)
  // The key lives in AuthContext (persisted to localStorage). The local
  // `googleApiKeyInput` is just for the inline modal text input — seeded
  // from the AuthContext value.
  const [googleApiKeyInput, setGoogleApiKeyInput] = useState<string>(geminiApiKey || '');
  const [keyStatusMessage, setKeyStatusMessage] = useState<string | null>(null);

  // Keep the inline modal input in sync when the AuthContext key changes.
  useEffect(() => {
    setGoogleApiKeyInput(geminiApiKey || '');
  }, [geminiApiKey]);

  const handleSaveGoogleKey = () => {
    const trimmed = googleApiKeyInput.trim();
    if (!trimmed) {
      setKeyStatusMessage(language === 'bn' ? 'অনুগ্রহ করে একটি সঠিক জেমিনাই এপিআই কি দিন' : 'Please provide a valid Gemini API key');
      return;
    }
    setGeminiApiKey(trimmed);
    setKeyStatusMessage(language === 'bn' ? 'গুগল অ্যাকাউন্ট সফলভাবে সংযুক্ত হয়েছে! এখন থেকে আপনার ক্রেডিট ব্যবহার হবে।' : 'Google Account connected! Personal AI credits active.');
    setTimeout(() => {
      setIsKeyModalOpen(false);
      setKeyStatusMessage(null);
    }, 1200);
  };

  const handleDisconnectGoogleKey = () => {
    setGeminiApiKey('');
    setGoogleApiKeyInput('');
  };
  const [diagramStyle, setDiagramStyle] = useState<string>(() => {
    return safeLocalStorage.getItem('academy_diagram_style') || 'scientific';
  });
  const [diagramDetailText, setDiagramDetailText] = useState<string>(() => {
    return safeLocalStorage.getItem('academy_diagram_detail_text') || '';
  });
  const [diagramUrl, setDiagramUrl] = useState<string>(() => {
    return safeLocalStorage.getItem('academy_diagram_url') || '';
  });
  const [isGeneratingDiagram, setIsGeneratingDiagram] = useState<boolean>(false);
  const [showFullDiagram, setShowFullDiagram] = useState<boolean>(false);

  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Track the first render to prevent initial load overwrite of topic state
  const isFirstRender = useRef(true);

  // Load state and dynamic updates
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      if (selectedTopic) {
        return; // Don't trigger default-topic overrides on mount if one is already saved
      }
    }
    // Set a default topic based on the subject's initial chapter
    const firstChapter = SYLLABUS_BLUEPRINTS[selectedSubject]?.[selectedPaper]?.[curriculum]?.[0];
    if (firstChapter) {
      setSelectedTopic(firstChapter.topics[0]);
    }
    setActiveChapterIndex(0);
  }, [selectedSubject, curriculum, selectedPaper]);

  // Sync state values to localStorage for complete reliability
  useEffect(() => {
    safeLocalStorage.setItem('academy_selected_subject', selectedSubject);
  }, [selectedSubject]);

  useEffect(() => {
    safeLocalStorage.setItem('academy_selected_paper', selectedPaper);
  }, [selectedPaper]);

  useEffect(() => {
    safeLocalStorage.setItem('academy_curriculum', curriculum);
  }, [curriculum]);

  useEffect(() => {
    safeLocalStorage.setItem('academy_difficulty', difficulty);
  }, [difficulty]);

  useEffect(() => {
    safeLocalStorage.setItem('academy_selected_topic', selectedTopic);
  }, [selectedTopic]);

  useEffect(() => {
    safeLocalStorage.setItem('academy_custom_topic', customTopic);
  }, [customTopic]);

  useEffect(() => {
    if (activeChapterIndex !== null) {
      safeLocalStorage.setItem('academy_active_chapter_index', String(activeChapterIndex));
    }
  }, [activeChapterIndex]);

  useEffect(() => {
    safeLocalStorage.setItem('academy_mode', mode);
  }, [mode]);

  useEffect(() => {
    safeLocalStorage.setItem('academy_response_html', responseHtml);
  }, [responseHtml]);

  useEffect(() => {
    safeLocalStorage.setItem('academy_chat_logs', JSON.stringify(chatLogs));
  }, [chatLogs]);

  useEffect(() => {
    safeLocalStorage.setItem('academy_diagram_style', diagramStyle);
  }, [diagramStyle]);

  useEffect(() => {
    safeLocalStorage.setItem('academy_diagram_detail_text', diagramDetailText);
  }, [diagramDetailText]);

  useEffect(() => {
    safeLocalStorage.setItem('academy_diagram_url', diagramUrl);
  }, [diagramUrl]);

  // Adjust scroll in chat window automatically
  useEffect(() => {
    const container = chatScrollRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
    const observer = new ResizeObserver(() => {
      container.scrollTop = container.scrollHeight;
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [chatLogs, isAnswering, mode]);

  const handleLanguageChange = (lang: 'en' | 'bn_book') => {
    setAiLanguage(lang);
    safeLocalStorage.setItem('ai_language', lang);
  };

  const getSubjectIcon = (sub: string) => {
    switch (sub) {
      case 'Physics':
        return <Atom className="w-5 h-5 text-sky-400" />;
      case 'Chemistry':
        return <FlaskConical className="w-5 h-5 text-emerald-400" />;
      case 'Biology':
        return <Dna className="w-5 h-5 text-rose-400" />;
      case 'Higher Math':
        return <Triangle className="w-5 h-5 text-amber-400" />;
      case 'ICT':
      default:
        return <Cpu className="w-5 h-5 text-indigo-400" />;
    }
  };

  const getSubjectColors = (sub: string) => {
    switch (sub) {
      case 'Physics':
        return {
          glow: 'rgba(56, 189, 248, 0.15)',
          border: 'border-sky-500/20 hover:border-sky-500/40',
          textBg: 'bg-sky-500/10 text-sky-300',
          gradientHex: 'from-sky-500/10 via-slate-900 to-slate-950',
          accent: 'sky'
        };
      case 'Chemistry':
        return {
          glow: 'rgba(52, 211, 153, 0.15)',
          border: 'border-emerald-500/20 hover:border-emerald-500/40',
          textBg: 'bg-emerald-500/10 text-emerald-300',
          gradientHex: 'from-emerald-500/10 via-slate-900 to-slate-950',
          accent: 'emerald'
        };
      case 'Biology':
        return {
          glow: 'rgba(251, 113, 133, 0.15)',
          border: 'border-rose-500/20 hover:border-rose-500/40',
          textBg: 'bg-rose-500/10 text-rose-300',
          gradientHex: 'from-rose-500/10 via-slate-900 to-slate-950',
          accent: 'rose'
        };
      case 'Higher Math':
        return {
          glow: 'rgba(251, 191, 36, 0.15)',
          border: 'border-amber-500/20 hover:border-amber-500/40',
          textBg: 'bg-amber-500/10 text-amber-300',
          gradientHex: 'from-amber-500/10 via-slate-900 to-slate-950',
          accent: 'amber'
        };
      case 'ICT':
      default:
        return {
          glow: 'rgba(129, 140, 248, 0.15)',
          border: 'border-indigo-500/20 hover:border-indigo-500/40',
          textBg: 'bg-indigo-500/10 text-indigo-300',
          gradientHex: 'from-indigo-500/10 via-slate-900 to-slate-950',
          accent: 'indigo'
        };
    }
  };

  // Generate highly descriptive AI Explanatory Scientific Diagram on demand
  const handleGenerateDiagram = () => {
    setIsGeneratingDiagram(true);
    const finalTopic = customTopic.trim() || selectedTopic || 'Hsc Science Study';

    // Build a state-of-the-art educational presentation illustration prompt
    let styleDescription = "highly detailed 4k academic scientific whiteboard sketch, neat blueprint formula notations, labeled";
    if (diagramStyle === 'illustration') {
      styleDescription = "beautiful pristine colorful 3D scientific vector illustration, clear academic display, isolated transparent dark background";
    } else if (diagramStyle === 'schematic') {
      styleDescription = "ultra-professional mechanical and physics visual schematic diagram, formula labels, detailed scientific layout, technical blueprints";
    }

    const detailSuffix = diagramDetailText.trim() ? `, showing explicit details: ${diagramDetailText.trim()}` : '';
    const rawPrompt = `academic ${selectedSubject} diagram of ${finalTopic}, ${styleDescription}${detailSuffix}, educational lesson slide chart, stunning colors, highly readable annotations, high contrast, slate dark background, no blurry text`;

    // Pollinations AI endpoint handles real-time dynamic rendering based on text prompts seamlessly
    const generatedUrl = `https://image.pollinations.ai/p/${encodeURIComponent(rawPrompt)}?width=768&height=512&nologo=true&seed=${Math.floor(Math.random() * 10005)}`;

    // Simulate high-performance rendering wait so student receives feedback
    setTimeout(() => {
      setDiagramUrl(generatedUrl);
      setIsGeneratingDiagram(false);

      // award brief gamification bonus for seeking visual aids
      const addition = 5;
      setKnowledgePoints(prev => {
        const nextVal = prev + addition;
        safeLocalStorage.setItem('academy_kp', String(nextVal));
        return nextVal;
      });
    }, 1500);
  };

  // Perform AI trigger action — maps to Next.js academy endpoints (lesson/mcq/cq/chat)
  const handleTriggerAction = async (chosenMode: 'concept' | 'mcq' | 'creative_question' | 'ask_ai') => {
    // ── BYOK gate — block AI features until the user connects a Gemini API key ──
    // This runs on every AI button click (Concept Desk, NCTB CQ, Ask Scholar,
    // Interactive Mocks). If no key is set, we open the key modal and bail out.
    if (!geminiApiKey || !geminiApiKey.trim()) {
      setIsKeyModalOpen(true);
      setErrorMessage(
        language === 'bn'
          ? 'এই ফিচারটি ব্যবহার করতে Gemini API কী সংযুক্ত করুন। আপনার নিজস্ব API কী দিন (BYOK) অথবা https://aistudio.google.com/app/apikey থেকে বিনামূল্যে একটি তৈরি করুন।'
          : 'Connect your Gemini API key to use this feature. Bring Your Own Key (BYOK) — get a free one at https://aistudio.google.com/app/apikey'
      );
      // Clear the error after 6 seconds so it doesn't linger
      setTimeout(() => setErrorMessage(null), 6000);
      return;
    }

    const finalTopic = customTopic.trim() || selectedTopic || SYLLABUS_BLUEPRINTS[selectedSubject]?.[selectedPaper]?.[curriculum]?.[0]?.topics[0] || 'Core Concepts';
    setMode(chosenMode);
    setIsLoading(true);
    setErrorMessage(null);
    setResponseHtml('');
    setSelectedAnswers({});
    setShowingSolutions({});

    if (chosenMode === 'ask_ai') {
      setChatLogs([
        {
          id: 'welcome',
          sender: 'tutor',
          text: aiLanguage === 'bn_book'
            ? `👋 আসসালামু আলাইকুম শিক্ষার্থী! আমি **${selectedSubject}** বিষয়ের (${selectedPaper} - ${curriculum} - ${difficulty} স্তর) জন্য আপনার এআই স্টাডি কো-পাইলট।\n\nআপনি আমাকে **${finalTopic}** সংক্রান্ত যেকোনো প্রশ্ন করতে পারেন। আমি ফর্মুলা, বিক্রিয়া, গ্রাফের ঢাল হিসাব বা কোনো ভুল সংশোধনের তাত্ত্বিক নিয়ম চমৎকারভাবে বুঝিয়ে দিতে প্রস্তুত।`
            : `👋 Greetings student! I am your AI Study Co-Pilot for **${selectedSubject}** (${selectedPaper} - ${curriculum} - ${difficulty} Level).\n\nAsk me any questions under the topic: **${finalTopic}**. I can describe formulas, debug code statements, draft chemical titrations, or explain experimental errors.`
        }
      ]);
      setIsLoading(false);
      return;
    }

    try {
      // Remap original /api/academy/learn call to mode-specific Next.js academy endpoints:
      //   concept            -> POST /api/academy/lesson  { prompt, subject, topic, language } -> { content }
      //   mcq                -> POST /api/academy/mcq      { subject, topic, count, language }  -> { questions: [...] }
      //   creative_question  -> POST /api/academy/cq       { subject, topic, question, language } -> { content }
      let endpoint = '/api/academy/lesson';
      let body: Record<string, unknown> = {
        prompt: finalTopic,
        subject: selectedSubject,
        topic: finalTopic,
        language: aiLanguage,
      };

      if (chosenMode === 'mcq') {
        endpoint = '/api/academy/mcq';
        body = {
          subject: selectedSubject,
          topic: finalTopic,
          count: 5,
          language: aiLanguage,
        };
      } else if (chosenMode === 'creative_question') {
        endpoint = '/api/academy/cq';
        body = {
          subject: selectedSubject,
          topic: finalTopic,
          question: finalTopic,
          language: aiLanguage,
        };
      }

      const res = await apiFetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Forward the user's Gemini API key (BYOK) to the server so it can
          // call the Gemini API on their behalf. Without this header, the
          // server falls back to its own GEMINI_API_KEY env var (if set) or
          // returns a fallback template response.
          'x-gemini-api-key': geminiApiKey,
        },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        let serverErrorMsg = "";
        try {
          const errData = await res.json();
          serverErrorMsg = errData.error || errData.message || "";
        } catch (_) {}
        throw new Error(serverErrorMsg || "Unable to establish communication with learning network. Proceeding with adaptive textbook models.");
      }

      const data = await res.json();

      if (chosenMode === 'mcq') {
        // MCQ API returns { questions: [...] } — original UI renders PREDEFINED_QUIZZES presets only,
        // so we intentionally ignore the dynamic API response here to preserve original behavior.
        // (If a future agent wants to wire dynamic MCQs, swap `presets` in the JSX for data.questions.)
        setResponseHtml('');
        if (data && Array.isArray(data.questions) && data.questions.length > 0) {
          // MCQ response received — UI uses predefined presets
        }
      } else {
        // lesson + cq endpoints return { content: string }
        setResponseHtml(data.content || data.response || '');
      }

      // Successfully processed visual lessons matches gamification milestones
      const addition = chosenMode === 'concept' ? 15 : 25;
      const updatedKp = databaseFallbackMilestone(addition);
      if (chosenMode === 'concept') {
        const nextLessons = completedLessons + 1;
        setCompletedLessons(nextLessons);
        safeLocalStorage.setItem('academy_lessons', String(nextLessons));
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to download custom academic study guide.");
    } finally {
      setIsLoading(false);
    }
  };

  // Gamification triggers
  const databaseFallbackMilestone = (points: number) => {
    const nextVal = knowledgePoints + points;
    setKnowledgePoints(nextVal);
    safeLocalStorage.setItem('academy_kp', String(nextVal));
    return nextVal;
  };

  const handleSendChat = async () => {
    const textToSend = chatInput.trim();
    if (!textToSend || isAnswering) return;

    // ── BYOK gate — block AI chat until the user connects a Gemini API key ──
    if (!geminiApiKey || !geminiApiKey.trim()) {
      setIsKeyModalOpen(true);
      setErrorMessage(
        language === 'bn'
          ? 'এই ফিচারটি ব্যবহার করতে Gemini API কী সংযুক্ত করুন। আপনার নিজস্ব API কী দিন (BYOK) অথবা https://aistudio.google.com/app/apikey থেকে বিনামূল্যে একটি তৈরি করুন।'
          : 'Connect your Gemini API key to use this feature. Bring Your Own Key (BYOK) — get a free one at https://aistudio.google.com/app/apikey'
      );
      setTimeout(() => setErrorMessage(null), 6000);
      return;
    }

    const finalTopic = customTopic.trim() || selectedTopic || SYLLABUS_BLUEPRINTS[selectedSubject]?.[selectedPaper]?.[curriculum]?.[0]?.topics[0] || 'Core Concepts';
    const newStudentMsg: ChatMessage = {
      id: Math.random().toString(),
      sender: 'student',
      text: textToSend
    };

    setChatLogs((prev) => [...prev, newStudentMsg]);
    setChatInput('');
    setIsAnswering(true);
    setErrorMessage(null);

    try {
      // Remap original /api/academy/learn (mode=ask_ai) to Next.js /api/academy/chat
      //   POST /api/academy/chat { prompt, subject, language } -> { content }
      const res = await apiFetch('/api/academy/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-api-key': geminiApiKey,
        },
        body: JSON.stringify({
          prompt: textToSend,
          subject: selectedSubject,
          language: aiLanguage,
        })
      });

      if (!res.ok) {
        let serverErrorMsg = "";
        try {
          const errData = await res.json();
          serverErrorMsg = errData.error || errData.message || "";
        } catch (_) {}
        throw new Error(serverErrorMsg || "Tutor node network response timeout.");
      }

      const data = await res.json();
      setChatLogs((prev) => [...prev, {
        id: Math.random().toString(),
        sender: 'tutor',
        text: data.content || data.response || ''
      }]);
      databaseFallbackMilestone(10);
    } catch (err: any) {
      setChatLogs((prev) => [...prev, {
        id: Math.random().toString(),
        sender: 'tutor',
        text: `⚠️ Error note: ${err.message || "Your prompt processed. Due to quota rate fallback, here is an educational note: check your formula variables 'g' or 'pH' context values. Keep studying!"}`
      }]);
    } finally {
      setIsAnswering(false);
    }
  };

  // Playable interactive offline MCQ answers validations
  const handleAnswerClick = (qIdx: number, oIdx: number, correctIdx: number) => {
    if (selectedAnswers[qIdx] !== undefined) return; // Answered already
    setSelectedAnswers(prev => ({ ...prev, [qIdx]: oIdx }));
    setShowingSolutions(prev => ({ ...prev, [qIdx]: true }));

    if (oIdx === correctIdx) {
      setQuizScore(prev => prev + 1);
      databaseFallbackMilestone(30);
    } else {
      databaseFallbackMilestone(5);
    }
  };

  // Bookmark toggler
  const toggleBookmarkLesson = () => {
    const finalTopic = customTopic.trim() || selectedTopic || "General Topic";
    const currentPath = `${selectedSubject} - ${finalTopic}`;
    if (savedLessons.includes(currentPath)) {
      setSavedLessons(prev => prev.filter(item => item !== currentPath));
    } else {
      setSavedLessons(prev => [...prev, currentPath]);
      databaseFallbackMilestone(15);
    }
  };

  const copyLessonsToClipboard = () => {
    const compiledText = responseHtml || "No lesson active. Generate concepts above!";
    try { navigator.clipboard.writeText(compiledText); } catch {} ;
    setErrorMessage("🎉 Study guide content copied to clipboard!"); setTimeout(() => setErrorMessage(null), 3000);
  };

  const colors = getSubjectColors(selectedSubject);
  const presets = PREDEFINED_QUIZZES[selectedSubject] || PREDEFINED_QUIZZES['Physics'];

  // Quick prompt pills helper
  const STUDY_PROMPT_PILLS: Record<string, string[]> = {
    'Physics': ["Derive Simple Pendulum T formula", "Explain Parallelogram vector law", "What is RMS velocity of oxygen?"],
    'Chemistry': ["Explain subatomic wave theory Bohr", "How do carbonic blood buffers work?", "Nomenclature of Alkynes"],
    'Biology': ["Mitosis vs Meiosis I Differences", "PEP carboxylase metabolic rate", "Fluid mosaic membrane layers"],
    'Higher Math': ["Derivative from first principles", "Eccentricity range equations", "Graph of general Tan(x) secant"],
    'ICT': ["Convert standard binary 142 to Hex", "3NF relational database schema rules", "Simple C program loop array"]
  };

  return (
    <div id="ai_academy_container" className="space-y-6 max-w-7xl mx-auto px-2 sm:px-4 md:px-0 scroll-smooth">

      {/* ==============================================
          1. HEADER JUMBOTRON WITH GLOWS & HERO ACCENTS
          ============================================== */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative p-4 sm:p-6 md:p-8 rounded-3xl overflow-hidden border border-white/10 bg-slate-950/60 backdrop-blur-xl shadow-2xl flex flex-col xl:flex-row items-center justify-between gap-4 sm:gap-6"
      >
        {/* Background glowing gradients */}
        <div className="absolute top-0 right-0 w-[45%] h-full rounded-full bg-linear-to-l from-indigo-500/15 to-transparent blur-3xl pointer-events-none select-none" />
        <div className="absolute bottom-0 left-0 w-[25%] h-2/3 rounded-full bg-linear-to-tr from-cyan-500/10 to-transparent blur-2xl pointer-events-none select-none" />

        {/* Left Side title / descriptions */}
        <div className="space-y-3 sm:space-y-4 text-center xl:text-left w-full min-w-0">
          <div className="inline-flex flex-wrap items-center justify-center xl:justify-start gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-[10.5px] font-mono font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
              <span>Version 3.2 Scholar Engine</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-cyan-300 text-[10.5px] font-mono font-bold uppercase tracking-wider">
              <Calendar className="w-3.5 h-3.5" />
              <span>HSC & AP Calibrated</span>
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl md:text-3xl xl:text-3.5xl font-sans font-black tracking-tight text-white leading-tight">
            {t('academyTitleMain')} <br />
            <span className="bg-linear-to-r from-cyan-400 via-sky-300 to-indigo-400 text-transparent bg-clip-text filter drop-shadow-[0_0_15px_rgba(6,182,212,0.15)]">
              {t('academyTitleSub')}
            </span>
          </h2>

          <p className="text-xs sm:text-[13px] text-slate-400 max-w-2xl font-medium leading-relaxed">
            {t('academyDesc')}
          </p>

          {/* Gamification Hub stats badges */}
          <div className="flex flex-wrap items-center justify-center xl:justify-start gap-2 sm:gap-3 pt-1">
            <div className="bg-slate-900 border border-white/5 px-3 py-2 rounded-xl flex items-center gap-2">
              <Award className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-yellow-400 shrink-0" />
              <div className="text-left font-mono leading-none">
                <span className="text-[9px] text-slate-500 block uppercase font-bold">{language === 'bn' ? 'জ্ঞান অর্জন পয়েন্ট' : 'KNOWLEDGE POINTS'}</span>
                <span className="text-xs font-black text-[#fbbf24]">{knowledgePoints} KP</span>
              </div>
            </div>

            <div className="bg-slate-900 border border-white/5 px-3 py-2 rounded-xl flex items-center gap-2">
              <Calendar className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-cyan-400 shrink-0" />
              <div className="text-left font-mono leading-none">
                <span className="text-[9px] text-slate-500 block uppercase font-bold">{language === 'bn' ? 'প্রতিদিনের ধারাবাহিকতা' : 'DAILY STREAK'}</span>
                <span className="text-xs font-black text-cyan-300">{studyStreak} {language === 'bn' ? 'দিন' : 'Days'}</span>
              </div>
            </div>

            <div className="bg-slate-900 border border-white/5 px-3 py-2 rounded-xl flex items-center gap-2">
              <BookOpen className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-rose-400 shrink-0" />
              <div className="text-left font-mono leading-none">
                <span className="text-[9px] text-slate-500 block uppercase font-bold">{language === 'bn' ? 'সম্পূর্ণ করা অধ্যায়' : 'LESSONS COMPLETED'}</span>
                <span className="text-xs font-black text-rose-300">{completedLessons} {language === 'bn' ? 'টি পাঠ' : 'Units'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side Controls Dashboard - Fully robust and wrapped */}
        <div className="w-full xl:w-auto flex flex-col gap-3 shrink-0 bg-slate-950/80 border border-white/5 p-3 sm:p-4 rounded-2xl relative z-10">
          <span className="text-[9.5px] font-mono text-[#22d3ee] uppercase tracking-widest font-black text-center xl:text-left block border-b border-white/5 pb-1">{language === 'bn' ? 'একাডেমি সেটিং টিউনার' : 'Academy Matrix Tuners'}</span>

          <div className="grid grid-cols-2 gap-1.5 bg-slate-900/60 p-1 rounded-xl">
            <button
              onClick={() => setCurriculum('NCTB')}
              className={`px-3 sm:px-4 py-2 min-h-9 rounded-lg text-[10.5px] font-black uppercase tracking-wide transition-all cursor-pointer whitespace-nowrap text-center ${
                curriculum === 'NCTB' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t('nctbSyllabus')}
            </button>
            <button
              onClick={() => setCurriculum('International')}
              className={`px-3 sm:px-4 py-2 min-h-9 rounded-lg text-[10.5px] font-black uppercase tracking-wide transition-all cursor-pointer whitespace-nowrap text-center ${
                curriculum === 'International' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t('internationalAp')}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1 bg-slate-900/60 p-1 rounded-xl">
            {(['Basic', 'Intermediate', 'Advanced'] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setDifficulty(lvl)}
                className={`py-1.5 min-h-9 rounded-lg text-[9.5px] font-bold uppercase tracking-wider transition-all cursor-pointer text-center ${
                  difficulty === lvl ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t(lvl.toLowerCase()) || lvl}
              </button>
            ))}
          </div>

          <div className="bg-slate-900/60 p-2 rounded-xl flex items-center justify-between border border-white/5 text-[10px] uppercase font-mono">
            <span className="text-slate-400 font-bold">{t('responseLanguage')}:</span>
            <div className="flex gap-1 bg-slate-950 p-0.5 rounded-lg">
              <button
                onClick={() => handleLanguageChange('en')}
                className={`px-2 py-1 min-h-8 rounded text-[9.5px] font-bold tracking-normal transition-all cursor-pointer ${
                  aiLanguage === 'en' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => handleLanguageChange('bn_book')}
                className={`px-2 py-1 min-h-8 rounded text-[9.5px] font-bold tracking-normal transition-all cursor-pointer ${
                  aiLanguage === 'bn_book' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                বাংলা
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ==============================================
          Google Account AI Credits Key Integration Banner
          ============================================== */}
      <div className="bg-linear-to-r from-blue-900/30 via-indigo-900/20 to-slate-900/60 border border-cyan-500/30 rounded-3xl p-4 sm:p-5 md:p-6 shadow-xl relative overflow-hidden backdrop-blur-sm mb-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-5 relative z-10">
          <div className="space-y-2 text-left w-full min-w-0">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 text-[10px] font-mono font-bold uppercase tracking-wider">
              <Key className="w-3 h-3 text-cyan-400" />
              <span>{language === 'bn' ? 'গুগল অ্যাকাউন্ট সংযোগ' : 'GOOGLE ACCOUNT INTEGRATION'}</span>
            </span>
            <h3 className="text-base sm:text-lg md:text-xl font-black text-white flex items-center gap-2 flex-wrap">
              {geminiApiKey ? (
                <>
                  <span className="text-emerald-400">🟢</span>
                  <span className="wrap-break-word">{language === 'bn' ? 'গুগল অ্যাকাউন্ট সংযুক্ত রয়েছে (অসীম ফ্রি এআই ক্রেডিট)' : 'Connected to Google Account (Unlimited AI Credits)'}</span>
                </>
              ) : (
                <>
                  <span className="text-cyan-400">🔑</span>
                  <span className="wrap-break-word">{language === 'bn' ? 'আপনার গুগল অ্যাকাউন্ট সংযোগ করুন (নিজের জেমিনি এআই ক্রেডিট দিয়ে পড়ুন)' : 'Connect Your Google Account to Use Personal AI Credits'}</span>
                </>
              )}
            </h3>
            <p className="text-xs text-slate-300 max-w-2xl font-medium leading-relaxed">
              {geminiApiKey
                ? (language === 'bn'
                  ? 'আপনার নিজস্ব গুগল অ্যাকাউন্ট জেমিনি কুপন কোড ব্যবহার করা হচ্ছে! আপনি মূল সার্ভার ক্রেডিট ছাড়াই আনলিমিটেড স্টাডি ডেক লেসন, টিউটর চ্যাট ও মৌখিক ভাইভা প্র্যাকটিস করতে পারছেন।'
                  : 'Your personal Google Account Gemini AI Key is active! All AI Study Deck queries will use your free Google quota without deducting server credits.')
                : (language === 'bn'
                  ? 'আপনার নিজের গুগল অ্যাকাউন্ট (aistudio.google.com) থেকে সংগৃহীত সম্পূর্ণ ফ্রি জেমিনি এআই কি যুক্ত করুন। এটি ব্যবহারে আপনি কোনো সার্ভার ক্রেডিট খরচ না করেই আনলিমিটেড পড়তে পারবেন।'
                  : 'Link your personal Google AI key to use your own free Google Gemini API quota for the AI study deck instead of relying on server credits.')
              }
            </p>
          </div>

          <div className="shrink-0 w-full md:w-auto flex flex-col sm:flex-row items-center gap-2">
            {geminiApiKey ? (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setIsKeyModalOpen(true)}
                  className="flex-1 sm:flex-none min-h-11 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 px-4 py-2.5 rounded-2xl text-xs font-bold cursor-pointer transition-all"
                >
                  {language === 'bn' ? 'কি পরিবর্তন করুন' : 'Change Key'}
                </button>
                <button
                  onClick={handleDisconnectGoogleKey}
                  className="flex-1 sm:flex-none min-h-11 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 px-4 py-2.5 rounded-2xl text-xs font-bold cursor-pointer transition-all"
                >
                  {language === 'bn' ? 'সংযোগ বিচ্ছিন্ন করুন' : 'Disconnect'}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsKeyModalOpen(true)}
                className="w-full md:w-auto min-h-[44px] bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs uppercase tracking-wider px-5 sm:px-6 py-3 sm:py-3.5 rounded-2xl shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
              >
                <Key className="w-4 h-4 text-slate-950" />
                <span>{language === 'bn' ? 'গুগল এআই কি যুক্ত করুন' : 'Connect Google Key'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Google Key Setup Modal */}
      {isKeyModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-cyan-500/30 rounded-3xl max-w-lg w-full max-w-full md:max-w-lg max-h-[92vh] overflow-y-auto p-4 sm:p-6 shadow-2xl relative text-left">
            <button
              onClick={() => setIsKeyModalOpen(false)}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-white text-lg font-bold cursor-pointer"
            >
              ✕
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl text-cyan-400">
                <Key className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-white">
                  {language === 'bn' ? 'গুগল অ্যাকাউন্ট সংযোগ (জেমিনি এআই কি)' : 'Connect Google Account (Gemini Key)'}
                </h3>
                <p className="text-xs text-slate-400">
                  {language === 'bn' ? 'বিনামূল্যে গুগল অ্যাকাউন্ট থেকে কি নিয়ে আনলিমিটেড পড়াশোনা করুন' : 'Use your free Google Gemini API quota without spending server credits'}
                </p>
              </div>
            </div>

            <div className="space-y-4 text-xs text-slate-300">
              <div className="bg-slate-950/80 p-3 sm:p-3.5 rounded-2xl border border-white/10 space-y-2">
                <p className="font-bold text-cyan-300">
                  {language === 'bn' ? 'কীভাবে গুগল এআই কি পাবেন (১ মিনিটে):' : 'How to get your free Google API Key in 1 minute:'}
                </p>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-300 font-mono text-[11px]">
                  <li>
                    {language === 'bn' ? 'গুগল এআই স্টুডিও ওপেন করুন: ' : 'Open Google AI Studio: '}
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 underline font-bold break-all"
                    >
                      aistudio.google.com/app/apikey
                    </a>
                  </li>
                  <li>{language === 'bn' ? 'আপনার গুগল অ্যাকাউন্টে সাইন ইন করুন।' : 'Sign in with your Google Account.'}</li>
                  <li>{language === 'bn' ? ' "Create API key" বাটনে ক্লিক করে কি কপি করুন।' : 'Click "Create API Key" and copy your new key.'}</li>
                  <li>{language === 'bn' ? 'নিচের বক্সে পেস্ট করে সেভ করুন!' : 'Paste the key below and click save!'}</li>
                </ol>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  {language === 'bn' ? 'আপনার জেমিনি এআই এপিআই কি' : 'Your Gemini API Key'}
                </label>
                <input
                  type="password"
                  value={googleApiKeyInput}
                  onChange={(e) => setGoogleApiKeyInput(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full min-h-[44px] bg-slate-950 border border-white/15 focus:border-cyan-400 rounded-xl px-4 py-3 text-sm text-white outline-none font-mono placeholder:text-slate-600"
                />
              </div>

              {keyStatusMessage && (
                <p className={`text-xs font-medium ${keyStatusMessage.includes('Success') || keyStatusMessage.includes('সংযুক্ত') ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {keyStatusMessage}
                </p>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsKeyModalOpen(false)}
                  className="px-4 py-2.5 min-h-[44px] rounded-xl text-slate-400 hover:text-white font-bold text-xs cursor-pointer"
                >
                  {language === 'bn' ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleSaveGoogleKey}
                  className="px-5 sm:px-6 py-2.5 min-h-[44px] rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs cursor-pointer shadow-lg"
                >
                  {language === 'bn' ? 'সংরক্ষণ করুন' : 'Save & Connect'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==============================================
          2. CAROUSEL / BENTO GRID SUBJECT INDEX
          ============================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-3.5">
        {subjectsList.map((sub) => {
          const isSelected = selectedSubject === sub;
          const subDetails = getSubjectColors(sub);
          const icon = getSubjectIcon(sub);
          const chaptersCount = SYLLABUS_BLUEPRINTS[sub]?.[selectedPaper]?.[curriculum]?.length || 0;

          return (
            <motion.button
              key={sub}
              onClick={() => {
                setSelectedSubject(sub);
                setCustomTopic('');
                setIsBookmarkedActive(false);
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`p-3 sm:p-4 min-h-[112px] rounded-2xl text-left transition-all border relative cursor-pointer group flex flex-col justify-between overflow-hidden ${
                isSelected
                  ? 'bg-[#080d1a] border-indigo-500/40 text-white shadow-xl shadow-indigo-950/20'
                  : 'bg-slate-950/40 border-white/[0.03] text-slate-400 hover:text-slate-200 hover:bg-slate-950/70'
              }`}
            >
              {isSelected && (
                <div
                  style={{ backgroundColor: subDetails.glow }}
                  className="absolute inset-0 blur-2xl opacity-40 rounded-full"
                />
              )}

              <div className="flex items-center justify-between relative z-10 w-full mb-2">
                <span className={`p-2 rounded-xl shrink-0 ${isSelected ? 'bg-indigo-500/10 text-white border border-indigo-500/25' : 'bg-white/[0.02] text-slate-500 border border-transparent'}`}>
                  {icon}
                </span>
                <span className="text-[9.5px] font-mono font-bold tracking-widest text-slate-500 uppercase">
                  {chaptersCount} Units
                </span>
              </div>

              <div className="relative z-10 pointer-events-none mt-auto min-w-0">
                <p className="text-[10px] text-slate-400 font-mono tracking-wide uppercase font-bold">FACULTY UNIT</p>
                <h4 className="text-xs sm:text-[13.5px] font-black text-white group-hover:text-cyan-300 transition-colors tracking-tight truncate">
                  {sub}
                </h4>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* ==============================================
          3. MAIN COLUMN LAYOUTS: LEFT SELECTOR, RIGHT STUDY DESK
          ============================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">

        {/* LEFT COLUMN: CHAPTER ACCORDION BLUEPRINT (5 cols) */}
        <div className="lg:col-span-5 space-y-4">

          {/* Multi-Paper Interactive Selector Switch */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-950/80 border border-white/5 rounded-2xl p-3 flex items-center justify-between shadow-lg"
          >
            <div className="flex items-center gap-2 min-w-0">
              <BookOpen className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="text-xs font-black text-slate-200 uppercase font-mono tracking-wider truncate">Science Paper</span>
            </div>

            <div className="flex gap-1 bg-slate-900 p-1 rounded-lg border border-white/[0.02]">
              {(['1st Paper', '2nd Paper'] as const).map((paper) => (
                <button
                  key={paper}
                  onClick={() => {
                    setSelectedPaper(paper);
                    setCustomTopic('');
                  }}
                  className={`px-3 py-1.5 min-h-[36px] rounded-md text-[10.5px] font-black tracking-normal transition-all duration-200 cursor-pointer ${
                    selectedPaper === paper
                      ? 'bg-cyan-500 text-slate-950 shadow-md font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {paper}
                </button>
              ))}
            </div>
          </motion.div>

          <div className="bg-slate-950/70 border border-white/5 rounded-2xl p-4 sm:p-5 md:p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/[0.04] pb-2 text-xs font-mono font-black tracking-widest text-[#22d3ee]">
              <span className="flex items-center gap-1.5 min-w-0"><Layers3 className="w-4 h-4 text-cyan-400 shrink-0" /> <span className="truncate">{t('boardBlueprint')}</span></span>
              <span className="text-[10px] text-slate-500 shrink-0">[{curriculum}]</span>
            </div>

            {/* Chapters list layout */}
            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/5">
              {(!SYLLABUS_BLUEPRINTS[selectedSubject]?.[selectedPaper]?.[curriculum] ||
                SYLLABUS_BLUEPRINTS[selectedSubject]?.[selectedPaper]?.[curriculum]?.length === 0) && (
                <div role="status" className="p-4 bg-slate-900/30 border border-white/[0.03] space-y-2 text-center rounded-2xl">
                  <BookOpen className="w-5 h-5 text-indigo-400 mx-auto animate-pulse" />
                  <p className="text-[10px] text-slate-400 leading-normal max-w-xs mx-auto">
                    {t('customizeSubjectNotice')}
                  </p>
                </div>
              )}
              {SYLLABUS_BLUEPRINTS[selectedSubject]?.[selectedPaper]?.[curriculum]?.map((chapter, cIdx) => {
                const isOpen = activeChapterIndex === cIdx;

                return (
                  <div
                    key={cIdx}
                    className={`rounded-xl border transition-all overflow-hidden ${
                      isOpen
                        ? 'border-indigo-500/20 bg-slate-900/25 shadow-md shadow-indigo-950/10'
                        : 'border-white/[0.03] hover:border-white/10 bg-slate-950/20'
                    }`}
                  >
                    {/* Chapter Header Button */}
                    <button
                      onClick={() => setActiveChapterIndex(isOpen ? null : cIdx)}
                      className="w-full flex items-center justify-between p-3 min-h-11 text-left transition-all cursor-pointer font-sans"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <BookMarked className={`w-4 h-4 shrink-0 ${isOpen ? 'text-cyan-400 animate-pulse' : 'text-slate-500'}`} />
                        <span className="text-xs sm:text-[12.5px] font-black text-white hover:text-cyan-300 truncate tracking-tight">{chapter.title}</span>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180 text-cyan-400' : ''}`} />
                    </button>

                    {/* Sub-Topics rendering inside chapter */}
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="bg-slate-950/40 border-t border-white/[0.03] p-2 space-y-1"
                        >
                          {chapter.topics.map((topicItem, tIdx) => {
                            const isTopicActive = selectedTopic === topicItem && !customTopic;

                            return (
                              <button
                                key={tIdx}
                                onClick={() => {
                                  setSelectedTopic(topicItem);
                                  setCustomTopic('');
                                }}
                                className={`w-full p-2 min-h-[40px] rounded-lg text-[11px] font-medium text-left transition-all duration-150 cursor-pointer flex items-start gap-1.5 ${
                                  isTopicActive
                                    ? 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 font-extrabold shadow-sm shadow-cyan-950/20'
                                    : 'bg-transparent border border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.01]'
                                }`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${isTopicActive ? 'bg-cyan-400 animate-ping' : 'bg-slate-600'}`} />
                                <span className="flex-1 break-words leading-tight">{topicItem}</span>
                              </button>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>

            {/* Write Custom topic segment */}
            <div className="space-y-2 pt-3 border-t border-white/[0.04]">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 uppercase font-black">
                <span className="truncate">{language === 'bn' ? 'অথবা জটিল বিশেষ টপিক টাইপ করুন' : 'Or Enter Complex Specific Theory'}</span>
                <Info className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              </div>

              <div className="relative">
                <textarea
                  value={customTopic}
                  onChange={(e) => {
                    setCustomTopic(e.target.value);
                    setSelectedTopic('');
                  }}
                  placeholder={
                    language === 'bn'
                      ? 'সরাসরি প্রশ্ন, ল্যাব সেটআপ বা কোড অনুশীলন টাইপ করুন (যেমন: কার্নো ইঞ্জিনের এন্ট্রপি, ডিএনএ রেপ্লিকেশন, আইপি ডোমেইন ম্যাপিং...)'
                      : 'Ask customized calculations, laboratory setups, or code exercises (e.g. Carnot engine efficiency proofs, cellular transcription pathways, IP Protocol mapping...)'
                  }
                  rows={2}
                  className="w-full p-3 min-h-[80px] bg-slate-950/80 border border-white/5 text-slate-100 placeholder-slate-600 rounded-xl outline-none focus:border-cyan-400/80 text-xs sm:text-[12.5px] resize-none font-medium leading-relaxed shadow-inner"
                />
              </div>
            </div>

            {/* Quick Action Matrix (Engines Selection Grid) */}
            <div className="space-y-2.5 pt-3 border-t border-white/[0.04]">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-black block">{language === 'bn' ? '২. রিসোর্স জেনারেটর ইঞ্জিন নির্বাচন করুন:' : '2. SELECT REGENERATION ENGINE:'}</span>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleTriggerAction('concept')}
                  disabled={isLoading}
                  className="p-3 min-h-[64px] bg-gradient-to-r from-cyan-950/20 to-slate-900/30 hover:to-cyan-950/20 border border-cyan-500/20 text-cyan-300 rounded-xl text-[10px] font-black tracking-wider uppercase text-center transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1.5 active:scale-98 shadow-sm hover:shadow-cyan-950/50"
                >
                  <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{language === 'bn' ? 'পাঠ্য বিশ্লেষণ ডেক' : 'Concept Deck'}</span>
                </button>

                <button
                  onClick={() => handleTriggerAction('mcq')}
                  disabled={isLoading}
                  className="p-3 min-h-[64px] bg-gradient-to-r from-emerald-950/20 to-slate-900/30 hover:to-emerald-950/20 border border-emerald-500/20 text-emerald-300 rounded-xl text-[10px] font-black tracking-wider uppercase text-center transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1.5 active:scale-98 shadow-sm hover:shadow-emerald-950/50"
                >
                  <Award className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{language === 'bn' ? 'কুইজ পরীক্ষা' : 'Interactive MCQs'}</span>
                </button>

                <button
                  onClick={() => handleTriggerAction('creative_question')}
                  disabled={isLoading}
                  className="p-3 min-h-[64px] bg-gradient-to-r from-rose-950/20 to-slate-900/30 hover:to-rose-950/20 border border-rose-500/20 text-rose-300 rounded-xl text-[10px] font-black tracking-wider uppercase text-center transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1.5 active:scale-98 shadow-sm hover:shadow-rose-950/50"
                >
                  <FileText className="w-3.5 h-3.5 text-rose-400" />
                  <span>{language === 'bn' ? 'সৃজনশীল প্রশ্ন সমাধান' : 'NCTB CQ Solver'}</span>
                </button>

                <button
                  onClick={() => handleTriggerAction('ask_ai')}
                  disabled={isLoading}
                  className="p-3 min-h-[64px] bg-gradient-to-r from-indigo-950/25 to-slate-900/30 hover:to-indigo-950/20 border border-indigo-500/35 text-indigo-300 rounded-xl text-[10px] font-black tracking-wider uppercase text-center transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1.5 active:scale-98 animate-pulse shadow-sm hover:shadow-indigo-950/50"
                >
                  <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{language === 'bn' ? 'টিউটর চ্যাট সহকারী' : 'Ask Scholar Chat'}</span>
                </button>
              </div>
            </div>

          </div>

        </div>

        {/* RIGHT COLUMN: INTERACTIVE VIEWPORT (7 cols) - Mobile Robust Height wrapped */}
        <div className="lg:col-span-7 bg-[#05080e] border border-white/5 rounded-2xl flex flex-col min-h-[500px] lg:h-[700px] overflow-hidden shadow-2xl relative">

          {/* Viewport header bar */}
          <div className="p-3 sm:p-4 bg-slate-950/60 border-b white/4 flex flex-wrap gap-2 items-center justify-between shrink-0">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="p-2 rounded-xl bg-indigo-650/15 text-indigo-400 border border-indigo-500/20 shrink-0">
                <Sparkles className="w-4 h-4 animate-pulse text-cyan-400" />
              </div>
              <div className="text-left min-w-0">
                <span className="text-[8px] font-mono tracking-widest text-[#22d3ee] font-black uppercase block">{language === 'bn' ? 'স্টাডি ডেক ভিউপোর্ট' : 'Study Deck Viewport'}</span>
                <span className="text-xs sm:text-sm font-black text-white block uppercase tracking-tight truncate">
                  {mode === 'concept' && (language === 'bn' ? '📓 অধ্যায় বিশ্লেষণ ও সূত্র প্রতিপাদন' : '📓 Chapter Lecture & Derivation')}
                  {mode === 'mcq' && (language === 'bn' ? '🏆 বোর্ড স্ট্যান্ডার্ড কুইজ পরীক্ষা' : '🏆 Board Target MCQ Trial')}
                  {mode === 'creative_question' && (language === 'bn' ? '🧪 সৃজনশীল উদ্দীপক ও সমাধান' : '🧪 NCTB CQ Case Stimulus & Solutions')}
                  {mode === 'ask_ai' && (language === 'bn' ? '💬 চ্যাট সহকারী পড়ার ডেক' : '💬 AI Scholar Desk')}
                </span>
              </div>
            </div>

            {/* Quick reading assists tools */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {mode === 'concept' && responseHtml && (
                <>
                  <button
                    onClick={toggleBookmarkLesson}
                    title="Bookmark active study guide"
                    className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-slate-900 border border-white/5 text-slate-400 hover:text-yellow-400 transition-all cursor-pointer active:scale-95"
                  >
                    {savedLessons.includes(`${selectedSubject} - ${(customTopic.trim() || selectedTopic)}`) ? (
                      <BookmarkCheck className="w-4 h-4 text-yellow-400" />
                    ) : (
                      <Bookmark className="w-4 h-4" />
                    )}
                  </button>

                  <button
                    onClick={copyLessonsToClipboard}
                    title="Copy lesson markdown to clipboard"
                    className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-slate-900 border border-white/5 text-slate-400 hover:text-cyan-400 transition-all cursor-pointer active:scale-95"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </>
              )}

              <span className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-white/5 text-[9.5px] font-mono text-zinc-400 font-extrabold uppercase tracking-wider whitespace-nowrap">
                {selectedSubject} ({curriculum})
              </span>
            </div>
          </div>

          {/* Loader Overlay */}
          {isLoading && (
            <div className="flex-grow p-4 sm:p-8 flex flex-col justify-center items-center text-center space-y-4">
              <div className="relative">
                <div className="w-12 h-12 border-4 border-slate-900 border-t-cyan-400 rounded-full animate-spin" />
                <Cpu className="w-5 h-5 text-cyan-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-black text-slate-100 uppercase tracking-widest font-mono text-cyan-400">Consulting Academic Repositories...</p>
                <p className="text-[10px] text-slate-500 font-mono tracking-wider max-w-sm mx-auto">PARSING BOARDS SCHEMAS, MATHEMATICAL FORMULAS, AND EXPERIMENTAL STEPS</p>
              </div>
            </div>
          )}

          {/* Low credits notice removed for BYOK model */}

          {/* Error fallback alert with useful study helper fallback suggestions */}
          {errorMessage && !isLoading && (
            <div className="p-4 sm:p-5 m-3 sm:m-4 bg-slate-900/80 border border-yellow-500/20 text-slate-300 text-xs rounded-xl space-y-4 shrink-0">
              <div className="flex items-center gap-2.5 text-yellow-500 font-black font-mono">
                <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0" />
                <span>COMMUNICATION DELAY NOTE: Swapped to Local Textbook Simulator</span>
              </div>

              <p className="text-[11px] leading-relaxed text-slate-400">
                The AI server has hit transient bounds or rate limits, which is completely normal during high-density hours! No worries—the Scholar system automatically unlocked predefined board review parameters below so your lessons and studies never get interrupted.
              </p>

              <div className="p-3.5 bg-slate-950/90 border border-red-500/20 text-red-200 text-[11px] rounded-lg font-mono space-y-1">
                <span className="font-bold uppercase tracking-wider text-red-400 block">Diagnostic Server Log:</span>
                <p className="leading-relaxed whitespace-pre-line break-words">{errorMessage}</p>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  onClick={() => handleTriggerAction('concept')}
                  className="px-3.5 py-1.5 min-h-[36px] bg-indigo-650 hover:bg-indigo-650/80 text-white rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer"
                >
                  Reload Course
                </button>

                <button
                  onClick={() => {
                    setErrorMessage(null);
                    setResponseHtml('');
                  }}
                  className="px-3.5 py-1.5 min-h-[36px] bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer"
                >
                  Clear Notes
                </button>
              </div>
            </div>
          )}

          {/* VIEW: MAIN BODY CONTENT CONTAINER */}
          {!isLoading && (
            <div id="ai_academy_viewport_body" className="flex-1 flex flex-col overflow-y-auto select-text scrollbar-thin scrollbar-thumb-white/5 scrollbar-track-transparent">

              {/* SCENARIO 1: TEXT STUDY GUIDES (Lesson decks & Creative Questions) */}
              {mode !== 'ask_ai' && mode !== 'mcq' && (
                <div className="p-4 sm:p-5 md:p-7 space-y-4">
                  {responseHtml ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="space-y-4 pb-12 text-left"
                    >
                      {/* Interactive Lesson Header information card */}
                      <div className="p-3 sm:p-4 rounded-xl bg-slate-900/40 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs mb-3 text-slate-400">
                        <div className="flex items-center gap-2 min-w-0">
                          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span className="break-words">Topic: <strong>{customTopic.trim() || selectedTopic || "General Standard Coursework"}</strong></span>
                        </div>
                        <div className="flex items-center gap-2 text-indigo-300 shrink-0">
                          <Lightbulb className="w-4 h-4 text-yellow-400 shrink-0" />
                          <span>Study value: <strong>+15 KP Gained</strong></span>
                        </div>
                      </div>


                      <FormattedMarkdown content={responseHtml} />
                    </motion.div>
                  ) : (
                    // Default study guides fallback helper if no response is generated yet
                    <div className="py-12 sm:py-16 text-center space-y-4 max-w-md mx-auto px-4">
                      <div className="w-14 h-14 rounded-full bg-slate-950 border border-cyan-500/10 flex items-center justify-center text-cyan-400 mx-auto shadow-inner">
                        <BookOpen className="w-6 h-6 animate-pulse" />
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold font-mono uppercase text-slate-200 tracking-widest">Scholar Lounge Standby</h4>
                        <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed font-medium">
                          Select your desired subject from the horizontal card bento desk, navigate the active chapter blueprint list to pick a focal concept, and click <strong className="text-cyan-400">Concept Deck</strong> or <strong className="text-rose-400">NCTB CQ Solver</strong> to execute direct explanations.
                        </p>
                      </div>

                      {/* Offline preset guides triggers */}
                      <div className="pt-2">
                        <span className="text-[9.5px] font-mono text-slate-500 block uppercase font-bold mb-1.5">Offline-First Practice Blueprint:</span>
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setMode('mcq');
                              setSelectedAnswers({});
                              setShowingSolutions({});
                            }}
                            className="px-3.5 py-1.5 min-h-[36px] bg-slate-900 hover:bg-slate-800 border border-white/5 text-[10px] text-slate-300 rounded-lg cursor-pointer transition-all"
                          >
                            Play board MCQ quiz
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SCENARIO 2: PLAYABLE BOARD MCQ TRIAL SIMULATOR (Extremely rich, responsive & fun) */}
              {mode === 'mcq' && (
                <div className="p-4 sm:p-5 md:p-6 space-y-6">
                  <div className="flex items-center justify-between border-b border-white/[0.04] pb-3 text-xs gap-2">
                    <div className="flex items-center gap-2 font-mono text-emerald-400 font-bold uppercase min-w-0">
                      <Award className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-emerald-400 shrink-0" />
                      <span className="truncate">MCQ Score: {quizScore} / {presets.length}</span>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-slate-900 text-slate-500 font-mono text-[10px] whitespace-nowrap shrink-0">Challenge Level</span>
                  </div>

                  {/* Predefined challenging MCQs mapped dynamically */}
                  <div className="space-y-6 pb-12">
                    {presets?.map((q, qIdx) => {
                      const answered = selectedAnswers[qIdx] !== undefined;
                      const selectedOpt = selectedAnswers[qIdx];
                      const solved = showingSolutions[qIdx];

                      return (
                        <div key={qIdx} className="p-4 sm:p-5 rounded-2xl bg-slate-950/40 border border-white/5 space-y-4">
                          <span className="px-2.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 font-mono text-[9px] font-black uppercase">
                            QUESTION {qIdx + 1}
                          </span>

                          <h4 className="text-xs sm:text-[13.5px] font-extrabold text-white leading-relaxed font-sans mt-1 text-left">
                            {q.question}
                          </h4>

                          {/* Options grid */}
                          <div className="grid grid-cols-1 gap-2.5 pt-1">
                            {q.options.map((opt, oIdx) => {
                              const isCorrect = oIdx === q.correct;
                              const isSlipped = answered && selectedOpt === oIdx && !isCorrect;

                              let cardStyle = "bg-slate-900/60 border-white/5 text-slate-300 hover:bg-slate-900 hover:text-white";
                              if (answered) {
                                if (isCorrect) {
                                  cardStyle = "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-bold";
                                } else if (isSlipped) {
                                  cardStyle = "bg-rose-500/15 border-rose-500/40 text-rose-300 font-bold";
                                } else {
                                  cardStyle = "bg-slate-900/30 border-transparent text-slate-650";
                                }
                              }

                              return (
                                <button
                                  key={oIdx}
                                  disabled={answered}
                                  onClick={() => handleAnswerClick(qIdx, oIdx, q.correct)}
                                  className={`w-full p-3.5 min-h-[56px] rounded-xl border text-left text-xs sm:text-[13px] transition-all duration-150 cursor-pointer flex items-center justify-between gap-2 ${cardStyle}`}
                                >
                                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                                    <span className="text-[10px] font-mono text-slate-500 font-bold shrink-0">
                                      {String.fromCharCode(65 + oIdx)}.
                                    </span>
                                    <span className="break-words">{opt}</span>
                                  </div>

                                  {/* Visual markers */}
                                  {answered && isCorrect && <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 ml-1" />}
                                  {answered && isSlipped && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 ml-1" />}
                                </button>
                              );
                            })}
                          </div>

                          {/* scientific explanation box */}
                          {solved && (
                            <motion.div
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="p-3.5 rounded-xl bg-slate-900/80 border border-white/5 text-[11px] leading-relaxed text-slate-400 text-left space-y-1.5"
                            >
                              <div className="flex items-center gap-1.5 text-cyan-400 font-mono uppercase font-black text-[9.5px]">
                                <Lightbulb className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                                <span>Academic Explanations Rationale</span>
                              </div>
                              <p className="font-sans leading-relaxed">{q.explanation}</p>
                            </motion.div>
                          )}
                        </div>
                      );
                    })}

                    {/* AI Generator alternative button */}
                    <div className="pt-3 text-center">
                      <p className="text-[10.5px] text-slate-500 font-mono mb-2">Want real-time dynamic questions generated via AI?</p>
                      <button
                        onClick={() => handleTriggerAction('mcq')}
                        className="px-4 sm:px-5 py-2.5 min-h-11 bg-indigo-650 hover:bg-indigo-550 border border-indigo-500/30 text-white rounded-xl text-xs font-black tracking-wide uppercase cursor-pointer relative shadow-lg shadow-indigo-950 transition-all duration-150 active:scale-95 inline-flex items-center gap-1.5"
                      >
                        <Sparkles className="w-4 h-4 text-cyan-300" />
                        <span>Generate Unlimited AI MCQs</span>
                      </button>
                    </div>

                  </div>
                </div>
              )}

              {/* SCENARIO 3: EXPERT ACADEMIC CHAT DESK */}
              {mode === 'ask_ai' && (
                <div className="flex-1 flex flex-col h-full overflow-hidden">

                  {/* Messages scroll feed */}
                  <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-5 space-y-4 select-text min-h-0">
                    {chatLogs.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex flex-col max-w-[85%] sm:max-w-[80%] ${
                          msg.sender === 'student' ? 'ml-auto items-end' : 'mr-auto items-start'
                        }`}
                      >
                        <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest mb-1 font-bold">
                          {msg.sender === 'student' ? 'HSC Student scholar' : 'AI Curriculum specialist'}
                        </span>

                        <div className={`p-3 sm:p-4 rounded-2xl text-xs sm:text-[13.5px] leading-relaxed border wrap-break-word ${
                          msg.sender === 'student'
                            ? 'bg-linear-to-r from-indigo-950 to-slate-900 border-indigo-500/25 text-cyan-200 rounded-tr-none text-right'
                            : 'bg-slate-950 border-white/[0.03] text-slate-200 rounded-tl-none font-medium text-left shadow-lg'
                        }`}>
                          {msg.sender === 'tutor' ? (
                            <FormattedMarkdown content={msg.text} />
                          ) : (
                            <p className="font-semibold font-sans whitespace-pre-wrap">{msg.text}</p>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Pending Answer AI block */}
                    {isAnswering && (
                      <div className="flex flex-col mr-auto max-w-[80%] items-start">
                        <span className="text-[8px] font-mono text-cyan-400 animate-pulse font-bold tracking-widest mb-1 uppercase">
                          Drafting mathematical matrices...
                        </span>
                        <div className="p-3.5 rounded-xl bg-slate-950 border border-white/5 text-[11px] text-slate-400 font-medium flex items-center gap-2">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400 shrink-0" />
                          <span>Solving derivations & formulas...</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Dynamic study suggestions prompt pills (convenient clickable queries) */}
                  <div className="px-3 sm:px-4 py-2 bg-slate-950/20 border-t border-white/[0.03] flex items-center gap-2 overflow-x-auto whitespace-nowrap shrink-0 scrollbar-none">
                    <span className="text-[9px] font-mono text-indigo-400 uppercase font-black tracking-wider shrink-0 select-none">Quick Queries:</span>
                    {STUDY_PROMPT_PILLS[selectedSubject]?.map((pill, pIdx) => (
                      <button
                        key={pIdx}
                        onClick={() => setChatInput(pill)}
                        className="px-2.5 py-1.5 min-h-[36px] flex items-center rounded-lg bg-slate-950 border border-white/5 hover:border-cyan-500/20 text-slate-400 hover:text-white transition-all text-[10.5px] font-medium cursor-pointer whitespace-nowrap"
                      >
                        {pill}
                      </button>
                    ))}
                  </div>

                  {/* Chat message typing terminal box (sticky at bottom on mobile) */}
                  <div className="p-3 sm:p-4 bg-slate-950 border-t border-white/5 shrink-0 flex flex-col sm:flex-row gap-2 sticky bottom-0">
                    <input
                      type="text"
                      disabled={isAnswering}
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSendChat();
                      }}
                      placeholder={`Ask questions regarding "${customTopic.trim() || selectedTopic || 'Current Syllabus'}..."`}
                      className="flex-1 min-w-0 min-h-[44px] px-3 sm:px-4 py-3 bg-slate-900 border border-white/5 text-slate-100 placeholder-slate-600 rounded-xl outline-none focus:border-cyan-400/80 text-xs sm:text-[13px] font-medium"
                    />

                    <button
                      disabled={isAnswering || !chatInput.trim()}
                      onClick={handleSendChat}
                      className="px-4 py-3 min-h-11 min-w-[44px] flex items-center justify-center bg-gradient-to-r from-cyan-400 to-indigo-500 hover:from-cyan-300 hover:to-indigo-400 text-slate-950 text-xs font-black tracking-wide rounded-xl uppercase transition-all disabled:opacity-25 active:scale-95 cursor-pointer gap-1.5 shrink-0"
                    >
                      <Send className="w-3.5 h-3.5 text-slate-950" />
                      <span className="hidden sm:inline">Send</span>
                    </button>
                  </div>

                </div>
              )}

            </div>
          )}

        </div>

      </div>

    </div>
  );
};
