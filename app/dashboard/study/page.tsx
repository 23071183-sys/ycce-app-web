'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useCurrentUser } from '@/lib/auth';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/shared/PageHeader';
import { ErrorBanner } from '@/components/shared/ErrorBanner';
import { EmptyState } from '@/components/shared/EmptyState';
import { BookOpen } from 'lucide-react';
import { PapersTab } from './_components/PapersTab';
import { ExamsTab } from './_components/ExamsTab';
import { errorText, type Subject } from './_components/types';

export default function StudyPage() {
  const { ready, isAdmin, isProfessor } = useCurrentUser();
  const allowed = isAdmin || isProfessor;
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectsError, setSubjectsError] = useState('');
  const [tab, setTab] = useState('papers');

  // Professors upload papers for their own subjects; admins for any.
  useEffect(() => {
    if (!ready || !allowed) return;
    api.get(isAdmin ? '/admin/subjects' : '/subjects/my-subjects')
      .then(r => setSubjects(r.data))
      .catch(e => setSubjectsError(errorText(e, 'Failed to load subjects')));
  }, [ready, allowed, isAdmin]);

  if (!ready) return <Skeleton className="h-64 w-full" />;
  if (!allowed) return <EmptyState icon={<BookOpen size={28} strokeWidth={1.5} />} title="Study tools are for teaching staff" />;

  return (
    <div>
      <PageHeader title="Study" description="Past papers for the question bank, and the exam schedule students see" />
      {subjectsError && <ErrorBanner title="Couldn't load subjects" message={subjectsError} />}
      <Tabs value={tab} onValueChange={v => setTab(String(v))}>
        <TabsList className="mb-4">
          <TabsTrigger value="papers" className="px-3">Past papers</TabsTrigger>
          <TabsTrigger value="exams" className="px-3">Exam schedule</TabsTrigger>
        </TabsList>
        <TabsContent value="papers"><PapersTab subjects={subjects} /></TabsContent>
        <TabsContent value="exams"><ExamsTab subjects={subjects} canEdit={isAdmin} /></TabsContent>
      </Tabs>
    </div>
  );
}
