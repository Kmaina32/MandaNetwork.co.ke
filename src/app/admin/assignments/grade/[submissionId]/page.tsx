

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, notFound } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { getSubmissionById, getCourseById, updateSubmission, updateUserCourseProgress, awardLeaderboardPoints } from '@/lib/firebase-service';
import type { Submission, Course, ExamQuestion, ShortAnswerQuestion } from '@/lib/types';
import { gradeShortAnswerExam } from '@/app/actions';
import type { GradeShortAnswerExamOutput } from '@/ai/flows/grade-short-answer-exam';
import { checkTopPerformerAchievement } from '@/lib/achievements';
import { useToast } from '@/hooks/use-toast';

import { Footer } from "@/components/shared/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, ArrowLeft, Sparkles, CheckCircle, MessageSquare, Star, XCircle, Check } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';
import { LoadingAnimation } from '@/components/LoadingAnimation';

const CERTIFICATE_THRESHOLD_PERCENTAGE = 80;

type GradeResult = {
    questionId: string;
    pointsAwarded: number;
    feedback?: string;
};

export default function GradeSubmissionPage() {
  const params = useParams<{ submissionId: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGrading, setIsGrading] = useState<string | null>(null); // questionId being graded
  const [isSaving, setIsSaving] = useState(false);
  const [gradeResults, setGradeResults] = useState<Map<string, GradeResult>>(new Map());

  useEffect(() => {
    const fetchSubmissionData = async () => {
      if (!params.submissionId) return;
      setLoading(true);
      const sub = await getSubmissionById(params.submissionId as string);
      if (!sub) {
        notFound();
        return;
      }
      const courseData = await getCourseById(sub.courseId);
      if (!courseData) {
        notFound();
        return;
      }
      
      setSubmission(sub);
      setCourse(courseData);
      
      // Pre-calculate grades for MCQs and pre-fill existing grades for SAQs
      const initialGrades = new Map<string, GradeResult>();
      if (courseData.exam && sub.answers) {
          courseData.exam.forEach(q => {
             const studentAnswer = sub.answers.find(a => a.questionId === q.id);
             if(studentAnswer) {
                 if (q.type === 'multiple-choice') {
                    const isCorrect = q.correctAnswer === studentAnswer.answer;
                    initialGrades.set(q.id, {
                        questionId: q.id,
                        pointsAwarded: isCorrect ? q.maxPoints : 0,
                    });
                 }
             }
          });
      }
      if(sub.graded && sub.pointsAwarded !== undefined && sub.feedback) {
          const storedGrades: GradeResult[] = JSON.parse(sub.feedback);
          storedGrades.forEach(g => initialGrades.set(g.questionId, g));
      }
      setGradeResults(initialGrades);
      
      setLoading(false);
    };
    fetchSubmissionData();
  }, [params.submissionId]);

  const handleGradeSAQ = async (question: ShortAnswerQuestion, studentAnswer: string) => {
    if (!submission) return;

    setIsGrading(question.id);
    try {
      const result: GradeShortAnswerExamOutput = await gradeShortAnswerExam({
        question: question.question,
        answer: studentAnswer,
        referenceAnswer: question.referenceAnswer,
        maxPoints: question.maxPoints,
      });
      setGradeResults(prev => new Map(prev).set(question.id, { questionId: question.id, ...result }));
    } catch (error) {
      console.error("AI grading failed", error);
      toast({ title: 'Error', description: 'The AI grader failed to process the request.', variant: 'destructive' });
    } finally {
      setIsGrading(null);
    }
  };
  
  const totalMaxPoints = course?.exam.reduce((acc, q) => acc + q.maxPoints, 0) || 0;
  const totalPointsAwarded = Array.from(gradeResults.values()).reduce((acc, r) => acc + r.pointsAwarded, 0);
  const finalPercentage = totalMaxPoints > 0 ? (totalPointsAwarded / totalMaxPoints) * 100 : 0;


  const handleApproveGrade = async () => {
      if (!submission || !course) return;
      
      setIsSaving(true);
      try {
        const feedbackString = JSON.stringify(Array.from(gradeResults.values()));
        const submissionUpdate = {
            graded: true,
            pointsAwarded: totalPointsAwarded,
            feedback: feedbackString, // Store detailed breakdown
        };
        await updateSubmission(submission.id, submissionUpdate);

        // Check for Top Performer achievement
        const achievement = await checkTopPerformerAchievement(submission.userId, { ...submission, ...submissionUpdate }, totalMaxPoints);
        if (achievement) {
            toast({
                title: 'Achievement Unlocked!',
                description: `${'achievement.name'}: ${'achievement.description'}`
            });
        }
        
        // Award points for passing
        if (finalPercentage >= 80) {
            await awardLeaderboardPoints(submission.userId, 25);
        } else {
            await awardLeaderboardPoints(submission.userId, 5); // 5 points for attempting
        }

        if (finalPercentage >= CERTIFICATE_THRESHOLD_PERCENTAGE) {
            const certificateId = `${submission.userId.slice(0, 5)}-${course.id.slice(0, 5)}-${uuidv4().slice(0, 8)}`;
            await updateUserCourseProgress(submission.userId, submission.courseId, {
                certificateAvailable: true,
                certificateId: certificateId,
            });
            toast({ title: 'Grade Saved! Certificate Awarded.', description: `Final score: ${totalPointsAwarded}/${totalMaxPoints} (${Math.round(finalPercentage)}%)` });
        } else {
             toast({ title: 'Grade Saved!', description: `Final score: ${totalPointsAwarded}/${totalMaxPoints} (${Math.round(finalPercentage)}%)` });
        }

        router.push('/admin/assignments');
      } catch(error) {
        console.error("Failed to save grade", error);
        toast({ title: 'Error', description: 'Could not save the grade.', variant: 'destructive' });
      } finally {
          setIsSaving(false);
      }
  }

  if (loading || authLoading) {
    return <div className="flex justify-center items-center h-screen"><LoadingAnimation /></div>;
  }
  
  if (!user) {
    router.push('/login');
    return null;
  }

  if (!submission || !course) {
    notFound();
    return null;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-grow container mx-auto px-4 md:px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <Link href="/admin/assignments" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="h-4 w-4" />
            Back to Submissions
          </Link>
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-headline">Grade Submission</CardTitle>
              <CardDescription>
                Reviewing final exam for <strong>{course.title}</strong> submitted by <strong>{submission.userName}</strong>.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {course.exam.map((question, index) => {
                    const studentAnswer = submission.answers.find(a => a.questionId === question.id);
                    const grade = gradeResults.get(question.id);

                    return (
                        <div key={question.id} className="p-4 border rounded-lg space-y-3">
                            <p className="font-semibold text-lg">{index + 1}. {question.question}</p>
                            
                            {question.type === 'short-answer' ? (
                                <>
                                    <p className="p-3 bg-secondary rounded-md whitespace-pre-wrap">{String(studentAnswer?.answer || 'Not answered')}</p>
                                    <Separator />
                                    {grade ? (
                                         <div className="space-y-2">
                                            <Alert>
                                                <Star className="h-4 w-4" />
                                                <AlertTitle>Score</AlertTitle>
                                                <AlertDescription className="font-bold">
                                                    {grade.pointsAwarded} / {question.maxPoints}
                                                </AlertDescription>
                                            </Alert>
                                             <Alert>
                                                <MessageSquare className="h-4 w-4" />
                                                <AlertTitle>AI Feedback</AlertTitle>
                                                <AlertDescription>
                                                    {grade.feedback}
                                                </AlertDescription>
                                            </Alert>
                                         </div>
                                    ) : (
                                        <Button size="sm" onClick={() => handleGradeSAQ(question as ShortAnswerQuestion, String(studentAnswer?.answer || ''))} disabled={isGrading === question.id}>
                                            {isGrading === question.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                            Grade with AI
                                        </Button>
                                    )}
                                </>
                            ) : (
                                <div className='space-y-2'>
                                   {question.options.map((option, i) => {
                                        const isSelected = i === studentAnswer?.answer;
                                        const isCorrect = i === question.correctAnswer;
                                        return (
                                             <div key={i} className={`flex items-center gap-3 p-2 rounded-md ${
                                                 isSelected && isCorrect ? 'bg-green-100 dark:bg-green-900 border border-green-500' : 
                                                 isSelected && !isCorrect ? 'bg-red-100 dark:bg-red-900 border border-red-500' :
                                                 isCorrect ? 'bg-green-100/50 dark:bg-green-900/50' :
                                                 'bg-secondary'
                                             }`}>
                                                {isSelected && isCorrect && <CheckCircle className="h-5 w-5 text-green-600" />}
                                                {isSelected && !isCorrect && <XCircle className="h-5 w-5 text-red-600" />}
                                                {!isSelected && isCorrect && <Check className="h-5 w-5 text-green-600" />}
                                                <p className={cn(isSelected && "font-bold")}>{option}</p>
                                             </div>
                                        )
                                   })}
                                </div>
                            )}
                        </div>
                    )
                })}
                
                <Separator />
                
                <div className="space-y-4">
                     <h2 className="text-xl font-bold font-headline text-center">Final Score</h2>
                     <div className="text-center">
                        <p className="text-4xl font-bold">{totalPointsAwarded} / {totalMaxPoints}</p>
                        <p className="text-lg text-muted-foreground">({Math.round(finalPercentage)}%)</p>
                     </div>
                     <div className="flex justify-end">
                        {!submission.graded && (
                            <Button onClick={handleApproveGrade} disabled={isSaving || gradeResults.size < course.exam.length}>
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                                Approve & Save Grade
                            </Button>
                        )}
                    </div>
                    {!submission.graded && gradeResults.size < course.exam.length && (
                        <p className='text-xs text-muted-foreground text-right'>Grade all short-answer questions to enable saving.</p>
                    )}
                </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
