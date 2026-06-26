import { Suspense } from 'react';
import { ProposalWizard } from './components/proposal-wizard';

export default function CreateProposalPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProposalWizard />
    </Suspense>
  );
}
