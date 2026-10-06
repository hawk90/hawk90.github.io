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
    'Embedded Firmware / SDK Development for Custom Silicon (ARM)',
    'Board Bring-up and Low-Level Device Driver Development',
    'HW/SW Co-design and Hardware IP Verification (Zebu, HAPS, QEMU)',
    'Large-Scale Resource Virtualization Platform Research',
    'Parallelizing and Optimizing with CUDA / MPI',
    'Software Design, Development, Maintenance and QA',
    'Technical Leadership & R&D Ownership',
  ],

  // Skills
  skills: {
    'Programming Languages': ['C/C++', 'Python'],
    'CPU / Architecture': ['ARM Cortex-M0+', 'Cortex-A53'],
    'Interconnect / I/O': ['PCIe', 'NVMe', 'IOMMU', 'DMA', 'I2C', 'UART', 'SPI'],
    'HW Platform / Verification': ['Zebu', 'HAPS', 'QEMU'],
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
      company: 'Bluedot',
      position: 'Software Engineer / Firmware',
      period: '2025.11 ~ Present',
      projects: [
        {
          name: 'VQM (Video Quality Measurement) Host Application Development',
          period: '2025.11 ~ 2025.12',
          role: 'Host Application Development',
          skills: ['C++'],
          highlights: [
            'Developed and released the VQM host application in C++',
            'Implemented PSNR, SSIM, and VMAF comparison between bitstreams',
          ],
        },
        {
          name: 'AV1 Encoder Feature Development (Reference C Encoder)',
          period: '2026.01 ~ 2026.02',
          role: 'Encoder Feature Development',
          skills: ['C', 'AV1'],
          highlights: [
            'Implemented keyframe insertion in the reference C encoder',
            'Implemented long-term reference (LTR) frame support',
            'Modified core encoder control logic to support the above features',
          ],
        },
        {
          name: 'AV1 Encoder Host Application Development & Hardware Bring-up',
          period: '2026.03 ~ 2026.05',
          role: 'Host Application Development / HW-SW Co-design / HW Bring-up',
          skills: ['C', 'AV1', 'NVMe', 'FPGA (Xilinx U250, S2C)', 'QEMU'],
          highlights: [
            "Designed an NVMe-style command/completion queue architecture that defined the HW interface requirements that led the HW team's RTL changes (HW/SW co-design), and separated a dedicated queue manager module, replacing the legacy blocking (synchronous) flow with an asynchronous design",
            'Designed and implemented multi-channel operation on top of the asynchronous queue architecture',
            'Designed and implemented a Hardware Abstraction Layer (HAL) to decouple encoder control logic from hardware',
            'Introduced QEMU device-model-based verification, enabling driver and e2e tests without FPGA hardware',
          ],
        },
        {
          name: 'Hardware V2 Architecture Proposal & Documentation',
          period: '2026.04 ~ 2026.05',
          role: 'Architecture Design',
          skills: ['AV1', 'SR-IOV', 'NVMe', 'IOMMU', 'DMA'],
          highlights: [
            'Analyzed V1 limitations (single shared queue with head-of-line blocking, excessive per-frame MMIO writes, SW-mutex-based multi-instance ownership) and proposed a V2 architecture to address each',
            'Proposed a control/data plane split (NVMe-style admin/data queues) to isolate slow session/control commands from the fast encode path',
            'Proposed a Batch List submit primitive to reduce per-frame MMIO writes',
            'Proposed SR-IOV HW-enforced queue ownership to replace SW-mutex-based multi-instance management',
          ],
        },
        {
          name: 'Step Up Engineering (Company-wide Study Crew)',
          period: '2026.04 ~ Present',
          role: 'Founder / Lead',
          skills: [],
          highlights: [
            'Founded and currently lead a company-wide engineering study crew as a long-term program',
            'Strengthened practical engineering skills across the org through study of essential programming references and core concepts',
          ],
        },
        {
          name: 'Claude Code Seminar',
          period: '2026.05',
          role: 'Lecturer',
          skills: ['Claude Code'],
          highlights: [
            "Delivered the company's first seminar on Claude Code",
            'Led the adoption of AI / productivity tooling beyond personal use, educating and spreading practices across the organization',
          ],
        },
      ],
    },
    {
      company: 'XCENA (formerly MetisX)',
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
            'Ported NVMe driver on RTOS',
            'Implemented MU print via direct memory access (bypassing MBOX)',
            'Built a GoogleTest-style test framework and MU kernel test cases',
          ],
        },
        {
          name: 'Low-Level Driver Verifier',
          period: '2024.03 ~ 2024.11',
          role: 'Hardware IP Driver Development',
          skills: ['C++', 'Arm M0+', 'Arm A53', 'Zebu', 'HAPS'],
          highlights: [
            'Developed and verified third-party IP drivers for I2C(SMBUS), UART, and SPI',
            'Developed and verified XCENA IP drivers for GMON, RAU, GDMA, CMDS, MBOX, and MU',
            'Established driver verification framework leveraging Zebu and HAPS platform',
            'Collaborated with the SoC team for IP verification',
          ],
        },
        {
          name: 'Arm M0+, Arm A53 Bring-up',
          period: '2024.03 ~ 2024.09',
          role: 'ROM/RAM code develop and SDK porting',
          skills: ['C++', 'Python', 'Arm M0+', 'Arm A53', 'Zebu', 'HAPS'],
          highlights: [
            'Developed an automated deployment script for Zebu and HAPS platform',
            'Developed ROM/RAM code on ARM',
            'Ported SDK on ARM',
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
            'Taught How to Co-Work using Coding Style and Git',
            'Implemented and taught state-of-the-art architecture',
          ],
        },
      ],
    },
    {
      company: 'Marine Information Technology',
      position: 'Software Engineer / Alternative Military Service (전문연구요원)',
      period: '2021.01 ~ 2022.05',
      projects: [
        {
          name: 'Automatic Tsunami Observation using Intelligent CCTV',
          period: '2021.06 ~ 2022.05',
          role: 'AI Part Lead / Deep Learning Development',
          skills: ['Python', 'TensorFlow', 'Flask'],
          highlights: [
            'Wrote an R&D proposal',
            'Developed a deep-learning model for sea-level observation',
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
            'Developed Water Gate and Wheel Module for Hydrodynamics Simulator using MPI with Fortran',
            'Built a Cluster with MPI',
          ],
        },
        {
          name: 'Deep Learning Application Deployment',
          period: '2021.01 ~ 2021.05',
          role: 'System Engineer',
          skills: ['Python', 'TensorFlow', 'Docker'],
          highlights: [
            'Improved performance by refactoring legacy code',
            'Built and Deployed Deep Learning Application with Docker',
          ],
        },
      ],
    },
    {
      company: 'Future Systems',
      position: 'Software Engineer / Alternative Military Service (전문연구요원)',
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
            'Researched and Developed Network Anomaly Detection using New Features with TensorFlow',
            'Developed Kernel Module of Firewall',
          ],
        },
        {
          name: 'Web UI Maintenance',
          period: '2020.06 ~ 2021.01',
          role: 'Maintain Web UI',
          skills: ['JavaScript', 'Python'],
          highlights: [
            'Maintained Web UI of the VPN',
            'Developed New Features',
          ],
        },
        {
          name: 'Threat Intelligence Visualization',
          period: '2020.06 ~ 2020.07',
          role: 'Develop Web UI',
          skills: ['JavaScript'],
          highlights: [
            'Visualized cyber threat intelligence',
          ],
        },
      ],
    },
    {
      company: 'Korea University',
      position: 'Integrated Ph.D. course',
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
            'Developed a Cloud Resource Schedule',
          ],
        },
        {
          name: 'Active Contents Collaboration Platform',
          period: '2013.03 ~ 2015.07',
          role: 'Research Assistant',
          skills: ['Ubuntu', 'Java', 'RESTful', 'OpenStack'],
          highlights: [
            'Developed a Cloud Resource Management System',
            'Deployed distributed frameworks (MPI, MapReduce) on virtualized environments',
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
            'Reduced GPU idle time through profiling',
            'Tuned GPU memory layout for compute',
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
      url: 'https://doi.org/10.1109/FGCT.2013.6767200',
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
