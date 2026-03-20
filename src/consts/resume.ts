// ============================================================
// Resume Page Data
// Edit this file to customize your Resume page.
// ============================================================

export const RESUME_DATA = {
  // Header
  nameKo: '윤상덕',
  nameEn: 'Sang-Deok Yoon',
  title: 'Software Engineer',
  github: 'https://github.com/hawk90',
  // Email is split to deter spam bot harvesting. Joined at render time.
  emailUser: 'hawking90a',
  emailDomain: 'gmail.com',

  // Core Competency
  coreCompetency: [
    'Research Large Scale Resource Virtualization Platform',
    'Parallelizing and Optimizing AI Applications',
    'Parallelizing and Optimizing with CUDA or MPI',
    'Experience in Software Design, Development and Maintenance',
    'Experience to Collaborate with Front-end',
    'Team Leader Experience',
    'Developed embedded firmware for performance-critical system using FPGA',
  ],

  // Skills
  skills: {
    'Programming Languages': ['C/C++', 'Python'],
    'Framework': ['TensorFlow', 'CUDA', 'MPI'],
    'Infra': ['Docker'],
    'OS': ['Linux (Ubuntu, CentOS)'],
    'Cloud': ['OpenStack', 'Eucalyptus'],
    'Data/DB': ['MySQL', 'MongoDB'],
    'Tools': ['Git', 'SVN', 'VIM'],
  } as Record<string, string[]>,

  // Experience
  experience: [
    {
      company: 'MetisX',
      position: 'Software Engineer / Firmware',
      period: '2023.08 ~ 2024.11',
      projects: [
        {
          name: 'Firmware Development (SDK)',
          period: '2023.08 ~ 2024.03',
          role: 'SDK refactoring',
          skills: ['C++'],
          highlights: [
            'Refactored SDK to enhance code maintainability and modularity',
            'Documented SDK structure and usage for seamless onboarding',
            'Developed NVMe Driver',
            'Improve MU print function performance without using MBOX',
            'Add Test Cases for MU Kernel',
          ],
        },
        {
          name: 'Low-Level Driver Verifier',
          period: '2024.03 ~ 2024.11',
          role: 'Hardware IP Driver Development',
          skills: ['C++', 'Arm M0+', 'Arm A53', 'Zebu', 'HAPS'],
          highlights: [
            'Developed and verified third-party IP drivers for I2C(SMBUS), UART, and SPI',
            'Developed and verified MetisX IP drivers for GMON, RAU, GDMA, CMDS, MBOX, and MU',
            'Established driver verification framework leveraging Zebu and HAPS platform',
            'Collaborated with the SoC team for IP verification',
          ],
        },
        {
          name: 'Arm M0+, Arm A53 Bring-up',
          period: '2024.03 ~ 2024.09',
          role: 'ROM/RAM code develop and porting SDK',
          skills: ['C++', 'Python', 'Arm M0+', 'Arm A53', 'Zebu', 'HAPS'],
          highlights: [
            'Developed an automated deployment script for Zebu and HAPS platform',
            'Developed ROM/RAM code on ARM',
            'Porting SDK on ARM',
          ],
        },
      ],
    },
    {
      company: 'ICT COG Academy',
      position: 'Lecturer',
      period: '2022.07 ~ 2022.09',
      projects: [
        {
          name: 'ICT-COG Lecturer',
          period: '2022.07 ~ 2022.09',
          role: 'Lecturer',
          skills: ['Python', 'TensorFlow', 'Docker', 'Git'],
          highlights: [
            'Teach How to Co-Work using Coding Style and Git',
            'Implemented and Teach State of The Art Architecture',
          ],
        },
      ],
    },
    {
      company: 'Marine Information Technology',
      position: 'Software Engineer / Alternative Military Service',
      period: '2021.01 ~ 2022.05',
      projects: [
        {
          name: 'Automatically Observe Tsunami using Intelligent CCTV',
          period: '2021.06 ~ 2022.05',
          role: 'Team Leader and Develop Deep Learning',
          skills: ['Python', 'TensorFlow', 'Flask'],
          highlights: [
            'Wrote an R&D proposal',
            'Developed to Observe Sea Level using Deep Learning',
            'Researched Video Enhancement using Deep Learning',
            'Developed Tsunami Detection Algorithm with Anomaly Detection',
          ],
        },
        {
          name: 'Hydrodynamics Simulator Feature Improvements',
          period: '2021.03 ~ 2021.05',
          role: 'Feature Improvement and Build Cluster with MPI',
          skills: ['Fortran', 'MPI'],
          highlights: [
            'Developed Water Gate, Wheel Module for Hydrodynamics Simulator using MPI with Fortran',
            'Built a Cluster with MPI',
          ],
        },
        {
          name: 'Deep Learning Application Deployment',
          period: '2021.01 ~ 2021.05',
          role: 'System Engineer',
          skills: ['Python', 'TensorFlow', 'Docker'],
          highlights: [
            'Performance Improvement with Refactoring Legacy Code',
            'Built and Deployed Deep Learning Application with Docker',
          ],
        },
      ],
    },
    {
      company: 'Future Systems',
      position: 'Software Engineer / Alternative Military Service',
      period: '2019.01 ~ 2021.01',
      projects: [
        {
          name: 'Next-generation VPN Development',
          period: '2019.01 ~ 2020.06',
          role: 'Develop VPN Modules',
          skills: ['C/C++', 'SVN', 'Redis', 'Docker'],
          highlights: [
            'Developed Thread-safe Runtime for VPN with C/C++',
            'Developed Microservice Controller for Security Apps (FW, VPN, IDS, Anti-Virus) with Docker',
            'Researched and Developed Network Anomaly Detect using New Features with TensorFlow',
            'Developed Kernel Module of Firewall',
          ],
        },
        {
          name: 'Web UI Maintenance',
          period: '2020.06 ~ 2021.01',
          role: 'Maintain Web UI',
          skills: ['JavaScript', 'Python'],
          highlights: [
            'Maintenance Web UI of VPN',
            'Developed New Features',
          ],
        },
        {
          name: 'Visualization Threat Intelligence',
          period: '2020.06 ~ 2020.07',
          role: 'Develop Web UI',
          skills: ['JavaScript'],
          highlights: [
            'Visualized Cyber Security',
          ],
        },
      ],
    },
    {
      company: 'Korea University',
      position: 'Integrated Ph.D. Course',
      period: '2013.03 ~ 2018.12',
      projects: [
        {
          name: 'PaaS based on Heterogeneous Cloud Environment',
          period: '2013.03 ~ 2015.12',
          role: 'Research Assistant',
          skills: ['Ubuntu', 'Java', 'JSP', 'RESTful', 'OpenStack', 'Eucalyptus'],
          highlights: [
            'Developed a Cloud Resource Management System on OpenStack and Eucalyptus',
            'Developed a Web UI with JSP',
            'Developed Cloud Resource Schedule',
          ],
        },
        {
          name: 'Active Contents Collaboration Platform',
          period: '2013.03 ~ 2015.07',
          role: 'Research Assistant',
          skills: ['Ubuntu', 'Java', 'RESTful', 'OpenStack'],
          highlights: [
            'Developed a Cloud Resource Management System',
            'Developed to Deploy Distributed Framework MPI, Map-Reduce on Virtual Environment',
            'Developed Volume Rendering with CUDA',
          ],
        },
        {
          name: 'Development Deep Learning Inference Framework',
          period: '2017.06 ~ 2018.12',
          role: 'Framework Design and Develop',
          skills: ['Ubuntu', 'Python', 'Docker', 'GPU', 'Xeon Phi'],
          highlights: [
            'Wrote an R&D proposal',
            'Developed Runtime System for Deep Learning Inference based on GPU, Xeon Phi using Docker',
          ],
        },
        {
          name: 'System for Searching Similar Weather Map based on AI',
          period: '2017.06 ~ 2017.12',
          role: 'Team Leader',
          skills: ['Ubuntu', 'Python', 'GPU'],
          highlights: [
            'Wrote an R&D proposal',
            'Optimized Deep Learning Training with GPU Profiling',
            'Reduced GPU IDLE',
            'Accelerated GPU with Memory format',
          ],
        },
      ],
    },
  ],

  // Education
  education: [
    {
      institution: 'Korea University',
      degree: 'Integrated Ph.D. Candidate',
      field: 'School of Electrical Engineering',
      period: '2013.03 ~ 2018.12',
      gpa: '3.96/4.5',
      description: 'Research Area: Parallel/Distributed System, Deep Learning Optimization (Advisor: Prof. Chang-Sung Jeong)',
    },
    {
      institution: 'Sangmyung University',
      degree: 'B.S.',
      field: 'Department of Computer System Engineering',
      period: '2009.03 ~ 2013.02',
      gpa: '4.22/4.5',
    },
  ],

  // Publications
  publications: [
    {
      type: 'paper' as const,
      title: 'Improving HDFS performance using local caching system',
      authors: 'Sang-Deok Yoon, In-Yong Jung, Ki-Hyun Kim, Chang-Sung Jeong',
      venue: 'Second International Conference on Future Generation Communication Technologies (FGCT 2013)',
      year: '2013',
    },
    {
      type: 'paper' as const,
      title: 'Cloud based Distributed Active Content Repository',
      authors: 'Ki-Hyun Kim, In-Yong Jung, Sang-Deok Yoon, Yoon-Ki Kim, Chang-Sung Jeong',
      venue: '대한전자공학회 학술대회',
      year: '2014',
    },
    {
      type: 'paper' as const,
      title: 'Active Content Repository based Distribution Local Cache System',
      authors: 'Sang-Deok Yoon, Chang-Sung Jeong',
      venue: '대한전자공학회 학술대회',
      year: '2015',
    },
    {
      type: 'patent' as const,
      title: 'Method for volume rendering using parallel shear-warp factorization',
      authors: 'Chang-Sung Jeong, Ki-Hyun Kim, Su-Hyun Kim, Yoon-Ki Kim, In-Kyu Son, Sang-Deok Yoon, et al.',
      venue: 'KR Patent 10-2013-0147491',
      year: '2013',
    },
    {
      type: 'patent' as const,
      title: 'Data comparing processing method and system in cloud computing environment',
      authors: 'Chang-Sung Jeong, Ki-Hyun Kim, Su-Hyun Kim, Yoon-Ki Kim, In-Kyu Son, Sang-Deok Yoon, et al.',
      venue: 'KR Patent 10-2013-0147492',
      year: '2013',
    },
    {
      type: 'patent' as const,
      title: 'Face Recognition Method and System for Intelligent Surveillance',
      authors: 'Chang-Sung Jeong, Ki-Hyun Kim, Su-Hyun Kim, Yoon-Ki Kim, In-Kyu Son, Sang-Deok Yoon, et al.',
      venue: 'KR Patent 10-2013-0147498',
      year: '2013',
    },
  ],

  // Additional Experience
  additionalExperience: [
    { role: 'Teaching Assistant', course: 'KECE208: Data Structure and Algorithm', period: '2015 Semester 2' },
    { role: 'Teaching Assistant', course: 'KECE317: Parallel Computing', period: '2016 Semester 1' },
    { role: 'Teaching Assistant', course: 'KECE208: Data Structure and Algorithm', period: '2016 Semester 2' },
    { role: 'Teaching Assistant', course: 'KECE317: Parallel Computing', period: '2017 Semester 1' },
    { role: 'Teaching Assistant', course: 'KECE208: Data Structure and Algorithm', period: '2017 Semester 2' },
    { role: 'Presenter', course: 'How to Train Deep Learning Model on Distributed and/or Multi-GPU Environment', period: '2017 Feb.', link: 'https://www.youtube.com/watch?v=DEfWtVJjtws' },
  ],
};
