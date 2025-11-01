// import React from 'react';
// import ChecklistExecutor from '@/components/checklist/ChecklistExecutor';
// import type { TemplateDefinition } from '@/types/checklist';

// const demoTemplate: TemplateDefinition = {
//   id: 'demo-opening-001',
//   name: 'Restaurant Opening SOP (Demo)',
//   description: 'Quick example to validate the checklist executor UI',
//   category: 'Opening',
//   steps: [
//     {
//       id: 's1',
//       title: 'Handwash station stocked',
//       instruction: 'Verify soap, paper towels, and warm water are available.',
//       requiresPhoto: true,
//       estimatedSeconds: 45,
//     },
//     {
//       id: 's2',
//       title: 'Fridge temperature check',
//       instruction: 'Record temperature for walk-in fridge.',
//       measurements: [
//         { label: 'Fridge °C', unit: '°C', thresholdType: 'max', max: 5 },
//       ],
//       estimatedSeconds: 60,
//     },
//     {
//       id: 's3',
//       title: 'Food safety signage visible',
//       instruction: 'Confirm signage is placed and clearly visible to staff.',
//       conditional: [{ when: 'NO', goToStepId: 's4' }],
//       estimatedSeconds: 30,
//     },
//     {
//       id: 's4',
//       title: 'Create corrective action',
//       instruction: 'If signage missing, create a follow-up action and attach photo.',
//       requiresPhoto: true,
//       estimatedSeconds: 90,
//     },
//   ],
// };

// const ChecklistRunDemo: React.FC = () => {
//   return (
//     <div className="p-4 sm:p-6">
//       <ChecklistExecutor template={demoTemplate} onSubmit={() => {}} />
//     </div>
//   );
// };

// export default ChecklistRunDemo;